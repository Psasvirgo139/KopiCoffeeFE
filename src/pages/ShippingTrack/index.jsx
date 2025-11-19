import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getShipperLocation, updateShipperLocation, getShippingInfo } from "../../utils/dataProvider/shipping";
import { getTransactionDetail } from "../../utils/dataProvider/transaction";
import "mapbox-gl/dist/mapbox-gl.css";
import productPlaceholder from "../../assets/images/placeholder-image.webp";
import { n_f, formatDateTime } from "../../utils/helpers";

// Lazy import mapbox-gl to avoid SSR issues if any
let mapboxgl;
try {
  // eslint-disable-next-line global-require
  mapboxgl = require("mapbox-gl");
} catch {}

function ShippingTrack() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const userInfo = useSelector((s) => s.userInfo);
  const controller = useMemo(() => new AbortController(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Order detail state (for Delivery Information + Order Information blocks)
  const initialValue = {
    id: 0,
    receiver_email: "",
    receiver_name: "",
    delivery_address: "",
    notes: "",
    status_id: 0,
    status_name: "",
    transaction_time: "",
    payment_id: 0,
    payment_name: "",
    payment_fee: 0,
    delivery_name: "",
    delivery_fee: 0,
    grand_total: 0,
    subtotal: 0,
    discount: 0,
    phone_number: "",
    products: [],
  };
  const [dataDetail, setDataDetail] = useState({ ...initialValue });
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const routeLayerId = useRef("route-line");
  const routeSourceId = useRef("route-src");
  const shipperMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const kopiMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const pollingRef = useRef(null);

  const getStatusBadgeClass = (status) => {
    const statusUpper = String(status || "").toUpperCase();
    if (["CANCELLED", "REJECTED"].includes(statusUpper)) {
      return "bg-red-100 text-red-800 border-red-300";
    } else if (["COMPLETED"].includes(statusUpper)) {
      return "bg-green-100 text-green-800 border-green-300";
    } else if (["SHIPPING", "ON_THE_WAY", "DELIVERED"].includes(statusUpper)) {
      return "bg-blue-100 text-blue-800 border-blue-300";
    } else if (["PENDING", "PROCESSING", "PREPARING", "ACCEPTED", "READY", "PAID"].includes(statusUpper)) {
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    }
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  // Read Mapbox config from env (supports CRA and non-CRA prefixes)
  const accessToken =
    process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ||
    process.env.MAPBOX_ACCESS_TOKEN ||
    "";
  const mapStyle =
    process.env.REACT_APP_MAPBOX_STYLE ||
    process.env.MAPBOX_STYLE ||
    "mapbox://styles/mapbox/streets-v11";
  const kopiAddress =
    process.env.REACT_APP_KOPI_LOCATION || process.env.KOPI_LOCATION || "";
  const envKopiLat = parseFloat(
    process.env.REACT_APP_KOPI_LAT || process.env.KOPI_LAT || "NaN"
  );
  const envKopiLng = parseFloat(
    process.env.REACT_APP_KOPI_LNG || process.env.KOPI_LNG || "NaN"
  );
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

  // Load order transaction details for info sections
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    setDetailLoading(true);
    setDetailError(false);
    getTransactionDetail(orderId, userInfo.token, ctrl)
      .then((result) => {
        if (cancelled) return;
        const orderData = result.data?.data?.[0] || result.data?.data;
        if (orderData) {
          setDataDetail({
            ...initialValue,
            ...orderData,
          });
        } else {
          setDetailError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setDetailError(true);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [orderId, userInfo.token]);

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
          upsertMarker(kopiMarkerRef, kopi, "#10b981"); // green for Kopi
          upsertMarker(destMarkerRef, dest, "#f59e0b"); // amber for destination
          fitBoundsToPoints([kopi, dest]);

          if (isStaff) {
            // start geolocation watch and report to backend, draw route shipper -> destination
            if (navigator.geolocation) {
              watchIdRef.current = navigator.geolocation.watchPosition(
                async (pos) => {
                  const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                  upsertMarker(shipperMarkerRef, coord, "#3b82f6"); // blue for shipper
                  try { await updateShipperLocation(orderId, coord, userInfo.token, controller); } catch {}
                  try {
                    const line = await fetchDirections({ lng: coord.lng, lat: coord.lat }, dest);
                    if (line) drawRoute(line);
                  } catch {}
                },
                () => {},
                { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
              );
            }
          } else if (isCustomer) {
            // customer: poll shipper location, draw route shipper -> destination
            pollingRef.current = setInterval(async () => {
              try {
                const resp = await getShipperLocation(orderId, userInfo.token, controller);
                const coord = resp?.data?.data;
                if (coord && typeof coord.lng === "number" && typeof coord.lat === "number") {
                  upsertMarker(shipperMarkerRef, { lng: coord.lng, lat: coord.lat }, "#3b82f6");
                  try {
                    const line = await fetchDirections({ lng: coord.lng, lat: coord.lat }, dest);
                    if (line) drawRoute(line);
                  } catch {}
                }
              } catch {}
            }, 1000);
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

  // If any error occurs, redirect customer to /products
  useEffect(() => {
    if ((error || detailError) && isCustomer) {
      try { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); } catch {}
      if (pollingRef.current) clearInterval(pollingRef.current);
      navigate("/products");
    }
  }, [error, detailError, isCustomer, navigate]);

  return (
    <>
      <Header />
      <main className="global-px py-6">
        <h1 className="text-2xl font-bold mb-4">Shipping Tracking #{orderId}</h1>
        {loading && <div>Loading map...</div>}
         {isStaff && (error || detailError) && (
           <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700 flex items-start gap-3">
             <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             <div>
               <p className="font-semibold">Không thể tải dữ liệu theo dõi giao hàng.</p>
               <p className="text-sm text-red-600 mt-1">Vui lòng thử lại sau hoặc kiểm tra trạng thái đơn hàng.</p>
             </div>
           </div>
         )}
        <div ref={mapContainerRef} style={{ width: "100%", height: "70vh", borderRadius: 12, overflow: "hidden" }} />
        <div className="mt-3 text-sm text-gray-600">
          {isStaff ? "Staff view: route shown, your location is being tracked." : null}
          {isCustomer ? "Customer view: shipper, destination, and Kopi locations are shown." : null}
        </div>

        {/* Delivery Information Section - from HistoryDetail, with phone */}
        {dataDetail.delivery_address && (
          <div className="mt-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border-2 border-gray-100 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Delivery Information
            </h3>
            <div className="space-y-4">
              {/* Take from - Shop location */}
              <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-tertiary/5 to-tertiary/10 rounded-xl border-l-4 border-tertiary hover:shadow-md transition-shadow">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-4 h-4 rounded-full bg-tertiary shadow-md"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-tertiary mb-2 uppercase tracking-wide">Take from</p>
                  <p className="text-gray-900 font-semibold text-lg mb-1">Kopi Coffee & Workspace</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {process.env.REACT_APP_KOPI_LOCATION || "38 Pham Van Dong, An Hai Bac, Son Tra, Da Nang"}
                  </p>
                </div>
              </div>

              {/* Deliver to - Customer address */}
              <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500 hover:shadow-md transition-shadow">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-4 h-4 rounded-full bg-green-500 shadow-md"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-600 mb-2 uppercase tracking-wide">Deliver to</p>
                  <p className="text-gray-900 font-semibold text-lg mb-1 break-words">{dataDetail.delivery_address}</p>
                  {(dataDetail.receiver_name || dataDetail.receiver_email || dataDetail.phone_number || dataDetail.receiver_phone) && (
                    <p className="text-sm text-gray-600 mt-1">
                      {dataDetail.receiver_name ? <span className="font-medium">{dataDetail.receiver_name}</span> : null}
                      {dataDetail.phone_number || dataDetail.receiver_phone ? (
                        <span className="text-gray-500"> • {dataDetail.phone_number || dataDetail.receiver_phone}</span>
                      ) : null}
                      {dataDetail.receiver_email ? (
                        <span className="text-gray-500"> • {dataDetail.receiver_email}</span>
                      ) : null}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Information Section - from HistoryDetail */}
        {dataDetail.id > 0 && (
          <div className="mt-8 bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Order Information</h2>

            {/* Order Items */}
            {Array.isArray(dataDetail.products) && dataDetail.products.length > 0 && (
              <div className="mb-6 pb-6 border-b-2 border-gray-300">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Order Items</h3>
                <div className="space-y-3">
                  {dataDetail.products.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 bg-white rounded-xl hover:bg-gray-50 transition-colors border border-gray-200">
                      <div className="flex-shrink-0">
                        <img
                          src={item.product_img || productPlaceholder}
                          alt={item.product_name}
                          className="w-20 h-20 rounded-lg object-cover shadow-md"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base text-gray-900 mb-1 line-clamp-2 leading-tight">
                          {item.product_name}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          Size: <span className="font-medium">{item.size}</span> × <span className="font-medium">{item.qty}</span>
                        </p>
                        {Array.isArray(item.add_ons) && item.add_ons.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Add-ons:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {item.add_ons.map((ao, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></span>
                                  <span className="break-words">{ao.name} <span className="text-gray-500">(+{n_f(Number(ao.price || 0))} VND)</span></span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex flex-col justify-center">
                        <p className="font-bold text-base text-gray-900 whitespace-nowrap">
                          {n_f(item.subtotal)} VND
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Summary */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-3 border-b-2 border-gray-300">
                <p className="font-semibold text-gray-700 text-lg">Grand Total</p>
                <p className="font-bold text-2xl text-gray-900">{n_f(dataDetail.grand_total)} VND</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1">
                  <p className="font-medium text-gray-600">Subtotal</p>
                  <p className="text-gray-800">{n_f(dataDetail.subtotal || 0)} VND</p>
                </div>
                <div className="flex justify-between py-1">
                  <p className="font-medium text-gray-600">Shipping Fee</p>
                  <p className="text-gray-800">{n_f(dataDetail.delivery_fee || 0)} VND</p>
                </div>
                <div className="flex justify-between py-1">
                  <p className="font-medium text-gray-600">Discount</p>
                  <p className="text-green-600 font-semibold">-{n_f(dataDetail.discount || 0)} VND</p>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="space-y-3 pt-4 border-t border-gray-300">
              <div className="flex flex-col py-1">
                <p className="font-medium text-gray-600 mb-2">Status</p>
                <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold border w-fit ${getStatusBadgeClass(dataDetail.status_name)}`}>
                  {dataDetail.status_name}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <p className="font-medium text-gray-600">Payment Method</p>
                <p className="text-gray-800 font-semibold">{dataDetail.payment_name || "N/A"}</p>
              </div>
              <div className="flex justify-between py-1">
                <p className="font-medium text-gray-600">Delivery Type</p>
                <p className="text-gray-800 font-semibold">{dataDetail.delivery_name || "N/A"}</p>
              </div>
              <div className="flex flex-col py-1">
                <p className="font-medium text-gray-600 mb-1">Transaction Date</p>
                <p className="text-gray-800">{formatDateTime(dataDetail.transaction_time)}</p>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default ShippingTrack;


