import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getShipperLocation, updateShipperLocation, getShippingInfo } from "../../utils/dataProvider/shipping";
import "mapbox-gl/dist/mapbox-gl.css";

// Lazy import mapbox-gl to avoid SSR issues if any
let mapboxgl;
try {
  // eslint-disable-next-line global-require
  mapboxgl = require("mapbox-gl");
} catch {}

function ShippingTrack() {
  const { orderId } = useParams();
  const userInfo = useSelector((s) => s.userInfo);
  const controller = useMemo(() => new AbortController(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const routeLayerId = useRef("route-line");
  const routeSourceId = useRef("route-src");
  const shipperMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const kopiMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const pollingRef = useRef(null);

  // Hardcode token/style to ensure it works (dev): mirrors testmap.html
  const accessToken = "pk.eyJ1Ijoiam9obmJpZGF0IiwiYSI6ImNtZDJocDE2cTBheWYybHBxNDZxeDZ5YmkifQ.8HhkYUtlOo5UrZpguhMPrw";
  const mapStyle = "mapbox://styles/johnbidat/cmhd7enbl003n01r465hv4xux";
  // Keep env for Kopi address; support both CRA and non-CRA prefixes
  const kopiAddress = process.env.KOPI_LOCATION;
  //Hardcode Kopi coordinates
  const envKopiLat = parseFloat(16.069960);
  const envKopiLng = parseFloat(108.237757);
  const isStaff = Number(userInfo?.role) === 2;
  const isCustomer = Number(userInfo?.role) === 3;

  const geocodeAddress = useCallback(async (addr) => {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addr)}.json?access_token=${accessToken}`;
    const resp = await fetch(url);
    const data = await resp.json();
    const feat = data?.features?.[0];
    if (!feat?.center) throw new Error("Address not found");
    return { lng: feat.center[0], lat: feat.center[1] };
  }, [accessToken]);

  const fetchDirections = useCallback(async (from, to) => {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&access_token=${accessToken}`;
    const resp = await fetch(url);
    const data = await resp.json();
    const route = data?.routes?.[0]?.geometry;
    if (!route) return null;
    return route;
  }, [accessToken]);

  const initMapIfNeeded = useCallback(({ center }) => {
    if (!mapboxgl || mapRef.current) return;
    mapboxgl.accessToken = accessToken;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [center.lng, center.lat],
      zoom: 13,
      attributionControl: false,
    });
    const nav = new mapboxgl.NavigationControl();
    mapRef.current.addControl(nav, "top-right");
    // Fallback if custom style fails (401/403 or load error)
    mapRef.current.on("error", (e) => {
      try {
        const msg = String(e?.error?.message || "").toLowerCase();
        if (msg.includes("unauthorized") || msg.includes("forbidden") || msg.includes("failed to load") || msg.includes("style")) {
          if (mapRef.current?.getStyle()?.sprite == null) {
            mapRef.current.setStyle("mapbox://styles/mapbox/streets-v11");
          }
        }
      } catch {}
    });
  }, [accessToken, mapStyle]);

  const upsertMarker = useCallback((ref, coord, color = "#e11d48") => {
    if (!mapRef.current || !mapboxgl) return;
    if (!ref.current) {
      const el = document.createElement("div");
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.background = color;
      ref.current = new mapboxgl.Marker(el).setLngLat([coord.lng, coord.lat]).addTo(mapRef.current);
    } else {
      ref.current.setLngLat([coord.lng, coord.lat]);
    }
  }, []);

  const fitBoundsToPoints = useCallback((points) => {
    if (!mapRef.current || !points?.length || !mapboxgl) return;
    const b = new mapboxgl.LngLatBounds();
    points.forEach((p) => b.extend([p.lng, p.lat]));
    mapRef.current.fitBounds(b, { padding: 60 });
  }, []);

  const drawRoute = useCallback((geojsonLine) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const srcId = routeSourceId.current;
    const layerId = routeLayerId.current;
    const data = { type: "Feature", geometry: geojsonLine };
    if (map.getSource(srcId)) {
      map.getSource(srcId).setData(data);
      return;
    }
    map.addSource(srcId, { type: "geojson", data });
    map.addLayer({
      id: layerId,
      type: "line",
      source: srcId,
      paint: { "line-color": "#2563eb", "line-width": 5, "line-opacity": 0.7 },
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        if (!accessToken) throw new Error("Missing Mapbox token");
        setLoading(true);
        // 1) Load shipping info (address) with role-aware endpoint
        const infoResp = await getShippingInfo(orderId, userInfo.token, controller);
        const destAddress = infoResp?.data?.data?.address;
        if (!destAddress) throw new Error("Order has no address");

        // 2) Compute Kopi coord: prefer env lat/lng if valid, else geocode address
        let kopi;
        if (Number.isFinite(envKopiLat) && Number.isFinite(envKopiLng)) {
          kopi = { lat: envKopiLat, lng: envKopiLng };
        } else {
          kopi = await geocodeAddress(kopiAddress);
        }

        // Destination: prefer coords from API if present
        const destLat = infoResp?.data?.data?.lat;
        const destLng = infoResp?.data?.data?.lng;
        let dest;
        if (Number.isFinite(destLat) && Number.isFinite(destLng)) {
          dest = { lat: destLat, lng: destLng };
        } else {
          dest = await geocodeAddress(destAddress);
        }
        if (cancelled) return;

        // 3) Init map and markers
        initMapIfNeeded({ center: kopi });
        if (!mapRef.current) return;
        mapRef.current.once("load", async () => {
          upsertMarker(kopiMarkerRef, kopi, "#10b981"); // green
          upsertMarker(destMarkerRef, dest, "#f59e0b"); // amber
          fitBoundsToPoints([kopi, dest]);

          if (isStaff) {
            const line = await fetchDirections(kopi, dest);
            if (line) drawRoute(line);
            // start geolocation watch and report to backend
            if (navigator.geolocation) {
              watchIdRef.current = navigator.geolocation.watchPosition(
                async (pos) => {
                  const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                  upsertMarker(shipperMarkerRef, coord, "#ef4444");
                  try { await updateShipperLocation(orderId, coord, userInfo.token, controller); } catch {}
                },
                () => {},
                { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
              );
            }
          } else if (isCustomer) {
            // customer: poll shipper location
            pollingRef.current = setInterval(async () => {
              try {
                const resp = await getShipperLocation(orderId, userInfo.token, controller);
                const coord = resp?.data?.data;
                if (coord && typeof coord.lng === "number" && typeof coord.lat === "number") {
                  upsertMarker(shipperMarkerRef, coord, "#ef4444");
                }
              } catch {}
            }, 5000);
          }
        });
      } catch (e) {
        if (!cancelled) setError(e?.message || "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
      try { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); } catch {}
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [orderId, userInfo.token, isStaff, isCustomer, accessToken, geocodeAddress, initMapIfNeeded, upsertMarker, fitBoundsToPoints, fetchDirections, drawRoute, controller, kopiAddress]);

  return (
    <>
      <Header />
      <main className="global-px py-6">
        <h1 className="text-2xl font-bold mb-4">Shipping Tracking #{orderId}</h1>
        {loading && <div>Loading map...</div>}
        {error && <div className="text-red-600">{error}</div>}
        <div ref={mapContainerRef} style={{ width: "100%", height: "70vh", borderRadius: 12, overflow: "hidden" }} />
        <div className="mt-3 text-sm text-gray-600">
          {isStaff ? "Staff view: route shown, your location is being tracked." : null}
          {isCustomer ? "Customer view: shipper, destination, and Kopi locations are shown." : null}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default ShippingTrack;


