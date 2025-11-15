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
  // NEW: State for address search input
  const [searchAddress, setSearchAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

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

  // NEW: Forward geocoding - convert address text to coordinates
  const geocodeAddress = useCallback(async (addressText) => {
    if (!addressText || !addressText.trim()) {
      throw new Error("Address cannot be empty");
    }
    
    // Get current map center for proximity bias (improves accuracy)
    let proximityParam = "";
    if (mapRef.current) {
      try {
        const center = mapRef.current.getCenter();
        if (center && typeof center.lng === "number" && typeof center.lat === "number") {
          // Proximity bias: prioritize results near current map center
          proximityParam = `&proximity=${center.lng},${center.lat}`;
        }
      } catch (e) {
        console.warn("Could not get map center for proximity:", e);
      }
    }
    
    const addressTrimmed = addressText.trim();
    
    // Try to extract house number from address (e.g., "21 Nguyễn Văn Linh" -> "21" and "Nguyễn Văn Linh")
    const houseNumberMatch = addressTrimmed.match(/^(\d+)\s+(.+)$/);
    let hasHouseNumber = false;
    let addressWithoutNumber = addressTrimmed;
    
    if (houseNumberMatch) {
      hasHouseNumber = true;
      addressWithoutNumber = houseNumberMatch[2]; // Remove house number
    }
    
    // Helper function to geocode
    const performGeocode = async (query) => {
      const encodedAddress = encodeURIComponent(query);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${accessToken}&limit=5&country=VN&types=address,poi,place${proximityParam}`;
      
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error("Failed to geocode address");
      }
      const data = await resp.json();
      
      if (!data?.features || data.features.length === 0) {
        return null;
      }
      
      // Select best result: prefer address type, then highest relevance score
      let bestFeature = data.features[0];
      const isAddressType = (feat) => {
        if (!feat.place_type) return false;
        if (Array.isArray(feat.place_type)) {
          return feat.place_type.includes("address");
        }
        return String(feat.place_type).includes("address");
      };
      
      for (const feat of data.features) {
        const isAddress = isAddressType(feat);
        const currentIsAddress = isAddressType(bestFeature);
        
        if (isAddress && !currentIsAddress) {
          bestFeature = feat;
        } else if (isAddress === currentIsAddress) {
          if (feat.relevance > bestFeature.relevance) {
            bestFeature = feat;
          }
        }
      }
      
      return bestFeature;
    };
    
    // Strategy: Try with house number first, then fallback to street name only
    let bestFeature = null;
    let usedHouseNumber = false;
    
    if (hasHouseNumber) {
      // Try with full address including house number
      bestFeature = await performGeocode(addressTrimmed);
      if (bestFeature && bestFeature.relevance >= 0.7) {
        usedHouseNumber = true;
        console.log("Geocoding with house number - success:", {
          query: addressTrimmed,
          result: bestFeature.place_name,
          relevance: bestFeature.relevance
        });
      } else {
        console.log("Geocoding with house number - low relevance, trying without house number");
      }
    }
    
    // If not found or low relevance, try without house number
    if (!bestFeature || bestFeature.relevance < 0.7) {
      const featureWithoutNumber = await performGeocode(addressWithoutNumber);
      if (featureWithoutNumber) {
        bestFeature = featureWithoutNumber;
        usedHouseNumber = false;
        console.log("Geocoding without house number:", {
          query: addressWithoutNumber,
          result: bestFeature.place_name,
          relevance: bestFeature.relevance
        });
      }
    }
    
    if (!bestFeature?.center) {
      throw new Error("Address not found");
    }
    
    const [lng, lat] = bestFeature.center;
    
    return { 
      lng, 
      lat, 
      feature: bestFeature,
      hasHouseNumber: hasHouseNumber && usedHouseNumber, // Whether house number was successfully used
      houseNumberFound: usedHouseNumber
    };
  }, [accessToken]);

  // NEW: Helper function to update map and marker (reused by both click and geocode)
  const updateMapLocation = useCallback(async (lng, lat, showHouseNumberWarning = false) => {
    if (!mapRef.current) return;
    
    try {
      // Update or create marker (make it draggable so user can adjust position)
      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ draggable: true })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);
        
        // Handle marker drag end - update location when user drags marker
        markerRef.current.on("dragend", async () => {
          const newLngLat = markerRef.current.getLngLat();
          try {
            const info = await reverseGeocode(newLngLat.lng, newLngLat.lat);
            setPicked({ 
              lng: newLngLat.lng, 
              lat: newLngLat.lat, 
              address: info.placeName, 
              ward: info.ward || "", 
              district: info.district || "", 
              city: info.city || "" 
            });
          } catch (error) {
            console.error("Error reverse geocoding after drag:", error);
          }
        });
      } else {
        markerRef.current.setLngLat([lng, lat]);
      }
      
      // Reverse geocode to get full address details
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
      
      // Fly to location
      mapRef.current.flyTo({ center: [lng, lat], zoom: 16 });
      
      // Show warning if house number was not found
      if (showHouseNumberWarning) {
        setTimeout(() => {
          alert("⚠️ Lưu ý: Không tìm thấy số nhà chính xác. Chỉ tìm được tên đường.\n\nBạn có thể kéo marker (pin) trên bản đồ để điều chỉnh vị trí chính xác hơn.");
        }, 500);
      }
    } catch (error) {
      console.error("Error updating map location:", error);
      throw error;
    }
  }, [reverseGeocode]);

  // NEW: Handle address search
  const handleSearchAddress = useCallback(async () => {
    const addressText = searchAddress.trim();
    if (!addressText) {
      return;
    }
    
    if (!mapRef.current) {
      console.error("Map not initialized yet");
      return;
    }

    setIsGeocoding(true);
    try {
      const { lng, lat, hasHouseNumber, houseNumberFound } = await geocodeAddress(addressText);
      // Show warning if user entered house number but it wasn't found
      const showWarning = hasHouseNumber && !houseNumberFound;
      await updateMapLocation(lng, lat, showWarning);
      // Clear search input after successful geocode
      setSearchAddress("");
    } catch (error) {
      console.error("Geocoding error:", error);
      alert(error.message || "Không tìm thấy địa chỉ. Vui lòng thử lại hoặc click trực tiếp trên bản đồ.");
    } finally {
      setIsGeocoding(false);
    }
  }, [searchAddress, geocodeAddress, updateMapLocation]);

  // NEW: Get current location using browser Geolocation API
  const handleGetCurrentLocation = useCallback(async () => {
    if (!mapRef.current) {
      console.error("Map not initialized yet");
      return;
    }

    if (!navigator.geolocation) {
      alert("Trình duyệt của bạn không hỗ trợ định vị vị trí.");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          await updateMapLocation(longitude, latitude, false);
        } catch (error) {
          console.error("Error updating location:", error);
          alert("Không thể cập nhật vị trí trên bản đồ.");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Không thể lấy vị trí hiện tại.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật lại trong cài đặt trình duyệt.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Thông tin vị trí không khả dụng.";
            break;
          case error.TIMEOUT:
            errorMessage = "Yêu cầu lấy vị trí đã hết thời gian chờ.";
            break;
        }
        alert(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [updateMapLocation]);

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
      // NEW: Reset search input when modal closes
      setSearchAddress("");
      setIsGeocoding(false);
      setIsGettingLocation(false);
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
        // NEW: Reset search input when reopening
        setSearchAddress("");
        setIsGeocoding(false);
        setIsGettingLocation(false);
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
          await updateMapLocation(lng, lat);
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
      // NEW: Reset search input on cleanup
      setSearchAddress("");
      setIsGeocoding(false);
      setIsGettingLocation(false);
    };
  }, [isOpen, accessToken, mapStyle, reverseGeocode, updateMapLocation]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="flex flex-col gap-4 w-[95vw] max-w-[840px]">
      <div className="text-lg font-semibold">Pick address from map</div>
      {/* NEW: Address search input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            className="bg-white border border-gray-300 text-black text-sm rounded-lg block flex-1 p-2.5"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isGeocoding) {
                e.preventDefault();
                handleSearchAddress();
              }
            }}
            placeholder="VD: 123 Nguyễn Văn Linh, Hải Châu, Đà Nẵng"
            disabled={isGeocoding}
          />
          <button
            type="button"
            className="btn btn-primary text-white px-4"
            onClick={handleSearchAddress}
            disabled={isGeocoding || !searchAddress.trim()}
          >
            {isGeocoding ? "Đang tìm..." : "Tìm"}
          </button>
          <button
            type="button"
            className="btn btn-outline px-4"
            onClick={handleGetCurrentLocation}
            disabled={isGettingLocation || isGeocoding}
            title="Định vị vị trí hiện tại"
          >
            {isGettingLocation ? "Đang định vị..." : "Vị trí hiện tại"}
          </button>
        </div>
        <div className="text-xs text-gray-500 px-1">
          <strong>Mẹo:</strong> Nhập địa chỉ càng chi tiết càng chính xác. Ví dụ: &quot;Số nhà + Tên đường + Phường/Xã + Quận/Huyện + Thành phố&quot;
          <br />
          <strong>Lưu ý:</strong> Nếu số nhà không tìm thấy, bạn có thể <strong>kéo marker (pin)</strong> trên bản đồ để điều chỉnh vị trí chính xác hơn.
        </div>
      </div>
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



