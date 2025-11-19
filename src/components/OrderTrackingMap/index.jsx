import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import "mapbox-gl/dist/mapbox-gl.css";
import { getShipperLocation, getShippingInfo } from "../../utils/dataProvider/shipping";

// Lazy import mapbox-gl to avoid SSR issues if any
let mapboxgl;
try {
  // eslint-disable-next-line global-require
  mapboxgl = require("mapbox-gl");
} catch {}

function OrderTrackingMap({ orderId, deliveryAddress, orderStatus }) {
  console.log("OrderTrackingMap: Component mounted", { orderId, deliveryAddress, orderStatus });
  
  // Skip all API calls if order is cancelled, rejected, or completed
  const statusUpper = String(orderStatus || "").toUpperCase();
  const isFinalStatus = ["COMPLETED", "CANCELLED", "REJECTED"].includes(statusUpper);
  
  const userInfo = useSelector((s) => s.userInfo);
  const controller = useMemo(() => new AbortController(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [containerReady, setContainerReady] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const routeLayerId = useRef("route-line");
  const routeSourceId = useRef("route-src");
  const shipperMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const kopiMarkerRef = useRef(null);
  const pollingRef = useRef(null);

  // Use callback ref to set containerReady immediately when element is mounted
  const containerRefCallback = useCallback((node) => {
    if (node) {
      console.log("OrderTrackingMap: Container ref callback - element mounted");
      mapContainerRef.current = node;
      
      // Check dimensions after a short delay to ensure layout is complete
      const checkDimensions = () => {
        if (mapContainerRef.current && mapContainerRef.current instanceof HTMLElement) {
          const rect = mapContainerRef.current.getBoundingClientRect();
          console.log("OrderTrackingMap: Container dimensions:", rect.width, "x", rect.height);
          if (rect.width > 0 && rect.height > 0) {
            console.log("OrderTrackingMap: Container ready!");
            setContainerReady(true);
          } else {
            // Retry after layout completes
            requestAnimationFrame(() => {
              setTimeout(checkDimensions, 100);
            });
          }
        }
      };
      
      // Use requestAnimationFrame to wait for layout
      requestAnimationFrame(() => {
        setTimeout(checkDimensions, 50);
      });
    } else {
      console.log("OrderTrackingMap: Container ref callback - element unmounted");
      mapContainerRef.current = null;
      setContainerReady(false);
    }
  }, []);

  // Read Mapbox config from env
  const accessToken =
    process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ||
    process.env.MAPBOX_ACCESS_TOKEN ||
    "";
  const mapStyle =
    process.env.REACT_APP_MAPBOX_STYLE ||
    process.env.MAPBOX_STYLE ||
    "mapbox://styles/mapbox/streets-v11";
  const kopiAddress =
    process.env.REACT_APP_KOPI_LOCATION || process.env.KOPI_LOCATION || "38 đường Phạm Văn Đồng, An Hải, Sơn Trà, Đà Nẵng 550000, Việt Nam";
  // Default coordinates for Kopi Coffee & Workspace: 38 Phạm Văn Đồng, An Hải, Sơn Trà, Đà Nẵng
  // Coordinates from Google Maps: 16.07018, 108.23775
  const defaultKopiLat = 16.07018;
  const defaultKopiLng = 108.23775;
  const envKopiLat = parseFloat(
    process.env.REACT_APP_KOPI_LAT || process.env.KOPI_LAT || "NaN"
  );
  const envKopiLng = parseFloat(
    process.env.REACT_APP_KOPI_LNG || process.env.KOPI_LNG || "NaN"
  );

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
    if (!mapContainerRef.current || !(mapContainerRef.current instanceof HTMLElement)) {
      console.error("Map container is not a valid HTMLElement");
      return;
    }
    mapboxgl.accessToken = accessToken;
    try {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: [center.lng, center.lat],
        zoom: 13,
        attributionControl: false,
      });
    } catch (err) {
      console.error("Error initializing map:", err);
      throw err;
    }
    const nav = new mapboxgl.NavigationControl();
    mapRef.current.addControl(nav, "top-right");
    
    // Track user interaction to prevent auto-zoom during manual zoom/pan
    let interactionTimeout = null;
    const setInteracting = () => {
      userInteractingRef.current = true;
      if (interactionTimeout) clearTimeout(interactionTimeout);
      // Reset after 2 seconds of no interaction
      interactionTimeout = setTimeout(() => {
        userInteractingRef.current = false;
      }, 2000);
    };
    
    mapRef.current.on("movestart", setInteracting);
    mapRef.current.on("zoomstart", setInteracting);
    mapRef.current.on("dragstart", setInteracting);
    
    // Fallback if custom style fails
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

  const upsertMarker = useCallback((ref, coord, color = "#e11d48", label = "") => {
    if (!mapRef.current || !mapboxgl) return;
    if (!ref.current) {
      const el = document.createElement("div");
      el.style.width = "24px";
      el.style.height = "24px";
      el.style.borderRadius = "50%";
      el.style.background = color;
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";
      
      // Add label if provided
      if (label) {
        const labelEl = document.createElement("div");
        labelEl.textContent = label;
        labelEl.style.position = "absolute";
        labelEl.style.top = "-30px";
        labelEl.style.left = "50%";
        labelEl.style.transform = "translateX(-50%)";
        labelEl.style.background = "white";
        labelEl.style.padding = "4px 8px";
        labelEl.style.borderRadius = "4px";
        labelEl.style.fontSize = "12px";
        labelEl.style.fontWeight = "bold";
        labelEl.style.color = "#333";
        labelEl.style.whiteSpace = "nowrap";
        labelEl.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
        labelEl.style.pointerEvents = "none";
        el.style.position = "relative";
        el.appendChild(labelEl);
      }
      
      ref.current = new mapboxgl.Marker(el)
        .setLngLat([coord.lng, coord.lat])
        .addTo(mapRef.current);
      
      console.log(`OrderTrackingMap: Added marker at [${coord.lng}, ${coord.lat}] with color ${color}${label ? ` and label "${label}"` : ""}`);
    } else {
      ref.current.setLngLat([coord.lng, coord.lat]);
      console.log(`OrderTrackingMap: Updated marker position to [${coord.lng}, ${coord.lat}]`);
    }
  }, []);

  const userInteractingRef = useRef(false);
  
  const fitBoundsToPoints = useCallback((points, force = false) => {
    if (!mapRef.current || !points?.length || !mapboxgl) return;
    // Only fit bounds if forced (initial load)
    // This prevents auto-zoom when user is manually zooming/panning
    if (!force) {
      // Skip fitBounds if user is interacting
      if (userInteractingRef.current) {
        console.log("OrderTrackingMap: User is interacting with map, skipping fitBounds");
        return;
      }
    }
    const b = new mapboxgl.LngLatBounds();
    points.forEach((p) => b.extend([p.lng, p.lat]));
    mapRef.current.fitBounds(b, { padding: 60, duration: force ? 1000 : 0 }); // Only animate on initial load
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
    if (!containerReady) return; // Wait for container to be ready
    if (isFinalStatus) {
      // Skip API calls for cancelled/completed/rejected orders
      console.log("OrderTrackingMap: Skipping API calls for final status:", statusUpper);
      setLoading(false);
      return;
    }
    
    let cancelled = false;
    let mapLoadTimeout = null;
    
    async function run() {
      try {
        if (!accessToken) throw new Error("Missing Mapbox token");
        setLoading(true);
        
        // Final check before proceeding
        if (!mapContainerRef.current || !(mapContainerRef.current instanceof HTMLElement)) {
          throw new Error("Map container element not found");
        }
        
        const rect = mapContainerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          throw new Error(`Map container has invalid dimensions: ${rect.width}x${rect.height}`);
        }
        
        console.log("OrderTrackingMap: Starting map initialization...");
        
        // Load shipping info with timeout
        const shippingInfoPromise = getShippingInfo(orderId, userInfo.token, controller);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Shipping info request timeout")), 10000)
        );
        const infoResp = await Promise.race([shippingInfoPromise, timeoutPromise]);
        
        const destAddress = infoResp?.data?.data?.address || deliveryAddress;
        if (!destAddress) throw new Error("Order has no address");

        // Compute Kopi coord - Always use default coordinates for accurate shop location
        // Default coordinates are from Google Maps for "38 đường Phạm Văn Đồng, An Hải, Sơn Trà, Đà Nẵng"
        let kopi = { lat: defaultKopiLat, lng: defaultKopiLng };
        console.log("OrderTrackingMap: Using Kopi coordinates:", kopi);

        // Destination
        const destLat = infoResp?.data?.data?.lat;
        const destLng = infoResp?.data?.data?.lng;
        let dest;
        if (Number.isFinite(destLat) && Number.isFinite(destLng)) {
          dest = { lat: destLat, lng: destLng };
          console.log("OrderTrackingMap: Using API destination coordinates:", dest);
        } else {
          console.log("OrderTrackingMap: Geocoding destination address:", destAddress);
          dest = await geocodeAddress(destAddress);
        }
        if (cancelled) return;

        // Init map and markers
        console.log("OrderTrackingMap: Initializing map...");
        initMapIfNeeded({ center: kopi });
        if (!mapRef.current) {
          throw new Error("Map initialization failed");
        }
        
        // Set timeout for map load event (10 seconds)
        mapLoadTimeout = setTimeout(() => {
          if (!cancelled) {
            console.warn("OrderTrackingMap: Map load event timeout, proceeding anyway");
            // Proceed with markers even if load event didn't fire
            try {
              upsertMarker(kopiMarkerRef, kopi, "#10b981", "Shop");
              upsertMarker(destMarkerRef, dest, "#f59e0b", "Delivery");
              fitBoundsToPoints([kopi, dest], true); // Force fit bounds on initial load
              setLoading(false);
            } catch (e) {
              console.error("OrderTrackingMap: Error adding markers:", e);
              setError("Failed to add markers to map");
            }
          }
        }, 10000);
        
        // Wait for map load event
        mapRef.current.once("load", async () => {
          if (mapLoadTimeout) clearTimeout(mapLoadTimeout);
          if (cancelled) return;
          
          console.log("OrderTrackingMap: Map loaded, adding markers...");
          try {
            upsertMarker(kopiMarkerRef, kopi, "#10b981", "Shop"); // green for Kopi
            upsertMarker(destMarkerRef, dest, "#f59e0b", "Delivery"); // amber for destination
            console.log("OrderTrackingMap: Markers added, fitting bounds...");
            fitBoundsToPoints([kopi, dest], true); // Force fit bounds on initial load
            console.log("OrderTrackingMap: Bounds fitted");
            setLoading(false);

            // Poll shipper location (only if order is not in final status)
            if (!isFinalStatus) {
              pollingRef.current = setInterval(async () => {
                if (cancelled || isFinalStatus) {
                  if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                  }
                  return;
                }
                try {
                  const resp = await getShipperLocation(orderId, userInfo.token, controller);
                  const coord = resp?.data?.data;
                  if (coord && typeof coord.lng === "number" && typeof coord.lat === "number") {
                    console.log("OrderTrackingMap: Shipper location received:", coord);
                    upsertMarker(shipperMarkerRef, { lng: coord.lng, lat: coord.lat }, "#3b82f6", "Shipper");
                    try {
                      const line = await fetchDirections({ lng: coord.lng, lat: coord.lat }, dest);
                      if (line) {
                        console.log("OrderTrackingMap: Route drawn");
                        drawRoute(line);
                      }
                      // Don't auto-fit bounds when updating shipper location (user might be zooming)
                      // fitBoundsToPoints([kopi, dest, { lng: coord.lng, lat: coord.lat }]);
                    } catch (e) {
                      console.error("OrderTrackingMap: Error drawing route:", e);
                    }
                  } else {
                    console.log("OrderTrackingMap: Shipper location not available yet");
                  }
                } catch (e) {
                  // Silently ignore errors for cancelled/completed orders
                  if (!isFinalStatus) {
                    console.warn("OrderTrackingMap: Error fetching shipper location:", e?.message || e);
                  }
                }
            }, 1000);
          }
          } catch (e) {
            console.error("OrderTrackingMap: Error in load handler:", e);
            if (!cancelled) setError(e?.message || "Failed to initialize map markers");
          }
        });
      } catch (e) {
        console.error("OrderTrackingMap: Error:", e);
        if (!cancelled) {
          setError(e?.message || "Error loading map");
          setLoading(false); // Set loading to false on error
        }
      } finally {
        if (!cancelled && mapLoadTimeout) clearTimeout(mapLoadTimeout);
      }
    }
    run();
    return () => {
      cancelled = true;
      if (mapLoadTimeout) clearTimeout(mapLoadTimeout);
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [containerReady, orderId, orderStatus, isFinalStatus, statusUpper, userInfo.token, accessToken, geocodeAddress, initMapIfNeeded, upsertMarker, fitBoundsToPoints, fetchDirections, drawRoute, controller, kopiAddress, envKopiLat, envKopiLng, deliveryAddress]);

  // Always render container div so ref can be set, even when loading
  const containerDiv = (
    <div
      ref={containerRefCallback}
      style={{
        width: "100%",
        height: "450px",
        borderRadius: "16px",
        overflow: "hidden",
        border: "3px solid #e5e7eb",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        position: "relative",
      }}
    >
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center z-10 rounded-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-tertiary border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-700 font-medium">Loading map...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait</p>
          </div>
        </div>
      )}
    </div>
  );

  if (error) {
    return (
      <div className="w-full h-96 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl flex items-center justify-center border-2 border-red-200">
        <div className="text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-bold text-red-600 text-lg">Error loading map</p>
          <p className="text-sm text-red-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {containerDiv}
      <div className="mt-6 flex flex-wrap gap-6 justify-center">
        <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <div className="w-5 h-5 rounded-full bg-green-500 shadow-md border-2 border-white"></div>
          <span className="text-sm font-semibold text-gray-700">Shop Location</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
          <div className="w-5 h-5 rounded-full bg-amber-500 shadow-md border-2 border-white"></div>
          <span className="text-sm font-semibold text-gray-700">Delivery Address</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
          <div className="w-5 h-5 rounded-full bg-blue-500 shadow-md border-2 border-white animate-pulse"></div>
          <span className="text-sm font-semibold text-gray-700">Shipper Location</span>
        </div>
      </div>
    </div>
  );
}

export default OrderTrackingMap;

