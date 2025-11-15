import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Modal from "../../components/Modal";
import "mapbox-gl/dist/mapbox-gl.css";

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

  const accessToken =
    process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ||
    process.env.MAPBOX_ACCESS_TOKEN ||
    "";
  const mapStyle =
    process.env.REACT_APP_MAPBOX_STYLE ||
    process.env.MAPBOX_STYLE ||
    "mapbox://styles/mapbox/streets-v11";

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
    if (!isOpen) {
      // Cleanup khi modal đóng
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error("Error removing map:", e);
        }
        mapRef.current = null;
      }
      markerRef.current = null;
      setPicked({ lat: null, lng: null, address: "", ward: "", district: "", city: "" });
      return;
    }
    
    if (!mapboxgl) {
      console.error("Mapbox GL is not available");
      return;
    }
    
    mapboxgl.accessToken = accessToken;
    
    // Đảm bảo container có kích thước trước khi tạo map
    if (!mapContainerRef.current) {
      console.error("Map container ref is not available");
      return;
    }
    
    // Nếu map đã tồn tại, chỉ cần resize và reset
    if (mapRef.current) {
      try {
        mapRef.current.resize();
        // Reset picked state khi mở lại
        setPicked({ lat: null, lng: null, address: "", ward: "", district: "", city: "" });
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
      } catch (e) {
        console.error("Error resizing existing map:", e);
      }
      return;
    }
    
    try {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: [108.2237436, 16.0648953],
        zoom: 13,
        attributionControl: false,
        interactive: true,
      });
      
      const nav = new mapboxgl.NavigationControl();
      mapRef.current.addControl(nav, "top-right");
      
      // Đảm bảo map resize đúng sau khi load
      mapRef.current.once("load", () => {
        try { 
          mapRef.current.resize(); 
        } catch (e) {
          console.error("Error resizing map:", e);
        }
      });
      
      // Xử lý click trên map - đảm bảo event listener luôn hoạt động
      const clickHandler = async (e) => {
        try {
          const { lng, lat } = e.lngLat;
          
          // Tạo hoặc cập nhật marker
          if (!markerRef.current) {
            markerRef.current = new mapboxgl.Marker({ draggable: false })
              .setLngLat([lng, lat])
              .addTo(mapRef.current);
          } else {
            markerRef.current.setLngLat([lng, lat]);
          }
          
          // Reverse geocode để lấy địa chỉ
          const info = await reverseGeocode(lng, lat);
          const address = info.placeName;
          setPicked({ 
            lng, 
            lat, 
            address, 
            ward: info.ward || "", 
            district: info.district || "", 
            city: info.city || "" 
          });
          
          // Zoom vào vị trí đã chọn
          try { 
            mapRef.current.flyTo({ center: [lng, lat], zoom: 16 }); 
          } catch (e) {
            console.error("Error flying to location:", e);
          }
        } catch (error) {
          console.error("Error handling map click:", error);
        }
      };
      
      mapRef.current.on("click", clickHandler);
      
      // Xử lý lỗi map
      mapRef.current.on("error", (e) => {
        console.error("Map error:", e);
        try {
          if (mapRef.current?.getStyle()?.sprite == null) {
            mapRef.current.setStyle("mapbox://styles/mapbox/streets-v11");
          }
        } catch (err) {
          console.error("Error setting fallback style:", err);
        }
      });
      
    } catch (error) {
      console.error("Error initializing map:", error);
    }
    
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error("Error removing map:", e);
        }
        mapRef.current = null;
      }
      markerRef.current = null;
      setPicked({ lat: null, lng: null, address: "", ward: "", district: "", city: "" });
    };
  }, [isOpen, accessToken, mapStyle, reverseGeocode]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="flex flex-col gap-4 w-[95vw] max-w-[840px]">
      <div className="text-lg font-semibold">Pick address from map</div>
      <div 
        ref={mapContainerRef} 
        style={{ 
          width: "100%", 
          height: "min(60vh, 520px)", 
          borderRadius: 12, 
          overflow: "hidden",
          position: "relative",
          cursor: "crosshair" // Hiển thị cursor để người dùng biết có thể click
        }} 
      />
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
            onPick?.(picked);
            onClose?.();
          }}
        >Use this address</button>
      </div>
    </Modal>
  );
}

export default MapAddressModal;



