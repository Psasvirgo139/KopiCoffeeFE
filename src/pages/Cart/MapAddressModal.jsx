import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Modal from "../../components/Modal";
import "mapbox-gl/dist/mapbox-gl.css";
import { saveDefaultAddress } from "../../utils/dataProvider/profile";

let mapboxgl;
try {
  // eslint-disable-next-line global-require
  mapboxgl = require("mapbox-gl");
} catch {}

function MapAddressModal({ isOpen, onClose, onPick }) {
  const userInfo = useSelector((s) => s.userInfo);
  const controller = useMemo(() => new AbortController(), []);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markerRef = useRef(null);
  const [picked, setPicked] = useState({ lat: null, lng: null, address: "", ward: "", district: "", city: "" });

  const accessToken = "pk.eyJ1Ijoiam9obmJpZGF0IiwiYSI6ImNtZDJocDE2cTBheWYybHBxNDZxeDZ5YmkifQ.8HhkYUtlOo5UrZpguhMPrw";
  const mapStyle = "mapbox://styles/johnbidat/cmhd7enbl003n01r465hv4xux";

  const reverseGeocode = useCallback(async (lng, lat) => {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${accessToken}`;
    const resp = await fetch(url);
    const data = await resp.json();
    const feat = data?.features?.[0];
    const placeName = feat?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    let ward = ""; let district = ""; let city = "";
    const ctx = feat?.context || [];
    // Heuristics: district -> id startsWith 'district'; city -> 'place' or 'locality' or 'region'
    for (const c of ctx) {
      if (!district && typeof c.id === "string" && c.id.startsWith("district")) district = c.text;
      if (!city && typeof c.id === "string" && (c.id.startsWith("place") || c.id.startsWith("locality") || c.id.startsWith("region"))) city = c.text;
    }
    // street name approximation
    const street = feat?.text || "";
    return { placeName, ward, district, city, street };
  }, [accessToken]);

  useEffect(() => {
    if (!isOpen) return;
    if (!mapboxgl || mapRef.current) return;
    mapboxgl.accessToken = accessToken;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [108.2237436, 16.0648953],
      zoom: 13,
      attributionControl: false,
    });
    const nav = new mapboxgl.NavigationControl();
    mapRef.current.addControl(nav, "top-right");
    // ensure proper sizing similar to ShippingTrack
    mapRef.current.once("load", () => {
      try { mapRef.current.resize(); } catch {}
    });
    mapRef.current.on("click", async (e) => {
      const { lng, lat } = e.lngLat;
      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker().setLngLat([lng, lat]).addTo(mapRef.current);
      } else {
        markerRef.current.setLngLat([lng, lat]);
      }
      const info = await reverseGeocode(lng, lat);
      const address = info.placeName;
      setPicked({ lng, lat, address, ward: info.ward || "", district: info.district || "", city: info.city || "" });
      try { mapRef.current.flyTo({ center: [lng, lat], zoom: 16 }); } catch {}
    });
    mapRef.current.on("error", () => {
      try {
        if (mapRef.current?.getStyle()?.sprite == null) {
          mapRef.current.setStyle("mapbox://styles/mapbox/streets-v11");
        }
      } catch {}
    });
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      setPicked({ lat: null, lng: null, address: "" });
    };
  }, [isOpen, accessToken, mapStyle, reverseGeocode]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="flex flex-col gap-4 w-[90vw] max-w-[90vw]">
      <div className="text-lg font-semibold">Pick address from map</div>
      <div ref={mapContainerRef} style={{ width: "100%", height: "70vh", borderRadius: 12, overflow: "hidden" }} />
      <input
        className="bg-gray-100 border border-gray-300 text-black text-sm rounded-lg block w-full p-2.5"
        value={picked.address}
        onChange={() => {}}
        placeholder="Click on the map to choose address"
        readOnly
      />
      <div className="flex gap-3 justify-end">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary text-white"
          disabled={!picked.address}
          onClick={() => {
            if (!picked.address) return;
            // persist default address with coordinates
            try {
              saveDefaultAddress(
                userInfo.token,
                {
                  address_line: picked.address || "",
                  ward: picked.ward || "",
                  district: picked.district || "",
                  city: picked.city || "",
                  latitude: picked.lat,
                  longitude: picked.lng,
                },
                controller
              );
            } catch {}
            onPick?.(picked);
            onClose?.();
          }}
        >Use this address</button>
      </div>
    </Modal>
  );
}

export default MapAddressModal;


