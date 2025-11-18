import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getTransactions, updateTransactionStatus } from "../../utils/dataProvider/transaction";
import { claimOrder } from "../../utils/dataProvider/shipping";
import { toast } from "react-hot-toast";
import { profileAction } from "../../redux/slices/profile.slice";
import loadingImage from "../../assets/images/loading.svg";
import emptyBox from "../../assets/images/empty-box.svg";

function ShippingOrder() {
  const dispatch = useDispatch();
  const userInfo = useSelector((s) => s.userInfo);
  const profile = useSelector((s) => s.profile);
  const controller = useMemo(() => new AbortController(), []);
  const [items, setItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const pollStartedRef = useRef(false);
  const lastSnapshotRef = useRef("");
  const isShipperRef = useRef(false);

  // Ensure profile loaded to know position
  useEffect(() => {
    if (!profile.isFulfilled && !profile.isLoading) {
      dispatch(profileAction.getProfileThunk({ controller, token: userInfo.token }));
    }
  }, [profile.isFulfilled, profile.isLoading, dispatch, controller, userInfo.token]);

  const fetchList = (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    // type=SHIPPING makes backend return address!=null and status NOT IN (CANCELLED, REJECTED, COMPLETED)
    getTransactions({ status: "PENDING", page: 1, limit: 50, type: "SHIPPING" }, userInfo.token, controller)
      .then((res) => {
        let data = res.data?.data || [];
        if (isShipperRef.current) data = data.filter((d) => d.status !== "PENDING");
        const sortedData = [...data].sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        });
        // avoid unnecessary re-renders (and button flicker) by deep compare snapshot
        const snapshot = JSON.stringify(sortedData.map((d) => ({ id: d.id, status: d.status, total: d.total, address: d.address, created_at: d.created_at, shipper_id: d.shipper_id })));
        if (snapshot !== lastSnapshotRef.current) {
          lastSnapshotRef.current = snapshot;
          setItems(sortedData);
        }
      })
      .finally(() => { if (isInitial) setInitialLoading(false); });
  };

  useEffect(() => {
    if (pollStartedRef.current) return; // guard StrictMode double-invoke
    pollStartedRef.current = true;
    fetchList(true);
    const t = setInterval(() => fetchList(false), 5000); // poll for status changes (e.g., PAID)
    return () => clearInterval(t);
  }, []);

  if (Number(userInfo.role) !== 2) return <Navigate to="/products" replace={true} />;
  const isStaff = Number(userInfo.role) === 2;
  const positionId = isStaff ? Number(profile?.data?.position_id ?? profile?.data?.positionId) : NaN;
  const isCashier = isStaff && positionId === 1;
  const isShipper = isStaff && positionId === 4;
  useEffect(() => { isShipperRef.current = !!isShipper; }, [isShipper]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
      ACCEPTED: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
      READY: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
      SHIPPING: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" },
      PAID: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
      COMPLETED: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
      REJECTED: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
    };
    const config = statusConfig[status] || { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${config.border} border`}>
        {status}
      </span>
    );
  };

  const visibleItems = useMemo(() => {
    if (filterStatus === "READY") return items.filter((item) => item.status === "READY");
    if (filterStatus === "PENDING") return items.filter((item) => item.status === "PENDING");
    return items;
  }, [items, filterStatus]);

  const filterOptions = [
    { key: "ALL", label: "All Orders" },
    { key: "READY", label: "Ready" },
    { key: "PENDING", label: "Pending" },
  ];

  return (
    <>
      <Header />
      <main className="global-px py-6 min-h-screen">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-quartenary mb-2">Shipping Orders</h1>
          <p className="text-gray-600">Manage and track shipping orders</p>
        </div>

        {initialLoading ? (
          <section className="w-full h-80 flex justify-center items-center">
            <img src={loadingImage} alt="Loading..." />
          </section>
        ) : visibleItems.length < 1 ? (
          <section className="w-full flex flex-col justify-center items-center py-16 text-center">
            <div className="mb-6">
              <img src={emptyBox} alt="No orders" className="w-52 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No pending shipping orders</h3>
            <p className="text-gray-500">All orders have been processed or there are no new orders at the moment.</p>
          </section>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {filterOptions.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterStatus(f.key)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                    filterStatus === f.key
                      ? "bg-tertiary text-white border-tertiary"
                      : "bg-white text-tertiary border-tertiary/40 hover:border-tertiary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {visibleItems.map((o) => (
              <div
                key={o.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 overflow-hidden"
              >
                {/* Header Section - Compact */}
                <div className="bg-gradient-to-r from-tertiary to-[#8B5A3C] px-4 py-3 text-white">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold">Order #{o.id}</h3>
                      {getStatusBadge(o.status)}
                    </div>
                    <p className="text-xs text-white/90">
                      {o.created_at ? new Date(o.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Content Section - Horizontal Layout */}
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Left Column - Address & Items */}
                    <div className="md:col-span-2 space-y-3">
                      {/* Address */}
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-tertiary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 mb-0.5">Address</p>
                          <p className="text-sm text-gray-700 line-clamp-2">{o.address || "No address provided"}</p>
                        </div>
                      </div>

                      {/* Products List - Compact */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Items ({o.products?.length || 0})</p>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                          {o.products?.slice(0, 3).map((p, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-2 text-xs bg-gray-50 rounded px-2 py-1.5">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 truncate">
                                  {p.qty}x {p.product_name} {p.size ? `(${p.size})` : ""}
                                </p>
                                {Array.isArray(p.add_ons) && p.add_ons.length > 0 && (
                                  <div className="mt-0.5 space-y-0.5 text-[11px] text-gray-500">
                                    {p.add_ons.map((ao, addOnIdx) => (
                                      <div key={addOnIdx} className="flex items-center justify-between gap-2">
                                        <span className="truncate">
                                          + {ao?.name || ao?.add_on_name || "Add-on"}
                                        </span>
                                        {(ao?.price || ao?.add_on_price) && (
                                          <span className="whitespace-nowrap text-gray-600">
                                            +{ao?.price || ao?.add_on_price}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-tertiary whitespace-nowrap">{p.subtotal}</p>
                            </div>
                          ))}
                          {o.products?.length > 3 && (
                            <p className="text-xs text-gray-500 italic text-center pt-1">
                              +{o.products.length - 3} more item{(o.products.length - 3) > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Price Summary & Actions */}
                    <div className="space-y-3">
                      {/* Price Summary - Compact */}
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium text-gray-800">{o.subtotal}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Shipping:</span>
                            <span className="font-medium text-gray-800">{o.shipping_fee}</span>
                          </div>
                          {o.discount && Number(o.discount) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Discount:</span>
                              <span className="font-medium text-green-600">-{o.discount}</span>
                            </div>
                          )}
                          <div className="border-t border-gray-300 pt-1.5 mt-1.5">
                            <div className="flex justify-between">
                              <span className="font-bold text-gray-800">Total:</span>
                              <span className="font-bold text-base text-tertiary">{o.total}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2">
                        {isCashier && (
                          <CashierActions o={o} userInfo={userInfo} controller={controller} onUpdated={fetchList} />
                        )}
                        {isShipper && (
                          <ShipperActions
                            o={o}
                            userInfo={userInfo}
                            controller={controller}
                            onUpdated={fetchList}
                            profile={profile}
                            hasActiveClaim={items.some((it) => it.shipper_id === profile?.data?.user_id && ["ACCEPTED", "READY", "SHIPPING"].includes(it.status))}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default ShippingOrder;

function CashierActions({ o, userInfo, controller, onUpdated }) {
  const disabledAccept = o.status !== "PENDING";

  return (
    <div className="flex flex-col gap-2">
      {o.status === "PENDING" && (
        <>
          <button
            className={`w-full btn btn-sm ${disabledAccept ? "btn-disabled opacity-50 cursor-not-allowed" : "btn-primary text-white hover:bg-[#8B5A3C] transition-colors"}`}
            disabled={disabledAccept}
            onClick={async () => {
              try {
                await updateTransactionStatus(o.id, "ACCEPTED", userInfo.token, controller);
                onUpdated?.();
                toast.success("Order accepted");
              } catch {
                toast.error("Error");
              }
            }}
          >
            <span className="flex items-center justify-center gap-1.5 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Accept order
            </span>
          </button>
          <button
            className="w-full btn btn-sm btn-error text-white hover:bg-red-600 transition-colors"
            onClick={async () => {
              try {
                await updateTransactionStatus(o.id, "REJECTED", userInfo.token, controller);
                onUpdated?.();
                toast.success("Order rejected");
              } catch {
                toast.error("Error");
              }
            }}
          >
            <span className="flex items-center justify-center gap-1.5 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </span>
          </button>
        </>
      )}

      {o.status === "ACCEPTED" && (
        <>
          <button className="w-full btn btn-sm btn-ghost" disabled>
            <span className="flex items-center justify-center gap-1.5 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Accepted
            </span>
          </button>
          <button
            className="w-full btn btn-sm btn-primary text-white hover:bg-[#8B5A3C] transition-colors"
            onClick={async () => {
              try {
                await updateTransactionStatus(o.id, "READY", userInfo.token, controller);
                onUpdated?.();
                toast.success("Marked ready");
              } catch {
                toast.error("Error");
              }
            }}
          >
            <span className="flex items-center justify-center gap-1.5 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mark as ready
            </span>
          </button>
        </>
      )}

      {o.status === "READY" && (
        <button className="w-full btn btn-sm btn-ghost" disabled>
          <span className="flex items-center justify-center gap-1.5 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Ready for shipping
          </span>
        </button>
      )}

      {o.status === "PAID" && (
        <button
          className="w-full btn btn-sm btn-success text-white hover:bg-green-600 transition-colors"
          onClick={async () => {
            try {
              await updateTransactionStatus(o.id, "COMPLETED", userInfo.token, controller);
              onUpdated?.();
              toast.success("Order completed");
            } catch {
              toast.error("Error");
            }
          }}
        >
          <span className="flex items-center justify-center gap-1.5 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Confirm Completed
          </span>
        </button>
      )}
    </div>
  );
}

function ShipperActions({ o, userInfo, controller, onUpdated, profile, hasActiveClaim }) {
  const userId = profile?.data?.user_id;
  const claimedByMe = o.shipper_id && userId && Number(o.shipper_id) === Number(userId);
  // Claim button visible when not claimed and status in ACCEPTED/READY
  const canClaimThis = !o.shipper_id && ["ACCEPTED", "READY"].includes(o.status) && !hasActiveClaim;

  return (
    <div className="flex flex-col gap-2">
      {canClaimThis && (
        <button
          className="w-full btn btn-sm btn-primary text-white hover:bg-[#8B5A3C] transition-colors"
          onClick={async () => {
            try {
              await claimOrder(o.id, userInfo.token, controller);
              onUpdated?.();
              toast.success("Order claimed");
            } catch (e) {
              toast.error(e?.response?.data?.message || "Claim failed");
            }
          }}
        >
          <span className="flex items-center justify-center gap-1.5 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Claim order
          </span>
        </button>
      )}

      {claimedByMe && o.status === "ACCEPTED" && (
        <>
          <button className="w-full btn btn-sm btn-ghost" disabled>
            <span className="flex items-center justify-center gap-1.5 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Claimed
            </span>
          </button>
          <button className="w-full btn btn-sm btn-disabled" disabled>
            <span className="flex items-center justify-center gap-1.5 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Waiting for ready
            </span>
          </button>
        </>
      )}

      {claimedByMe && o.status === "READY" && (
        <button
          className="w-full btn btn-sm btn-primary text-white hover:bg-[#8B5A3C] transition-colors"
          onClick={async () => {
            try {
              await updateTransactionStatus(o.id, "SHIPPING", userInfo.token, controller);
              onUpdated?.();
              toast.success("Shipping started");
            } catch {
              toast.error("Error");
            }
          }}
        >
          <span className="flex items-center justify-center gap-1.5 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Start Shipping
          </span>
        </button>
      )}

      {claimedByMe && o.status === "SHIPPING" && (
        <>
          <button
            className="w-full btn btn-sm btn-success text-white hover:bg-green-600 transition-colors"
            onClick={async () => {
              try {
                await updateTransactionStatus(o.id, "PAID", userInfo.token, controller);
                onUpdated?.();
                toast.success("Marked paid");
              } catch {
                toast.error("Error");
              }
            }}
          >
            <span className="flex items-center justify-center gap-1.5 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Confirm paid
            </span>
          </button>
          <Link to={`/shipping/${o.id}`} className="w-full btn btn-sm btn-secondary text-white hover:bg-secondary-200 transition-colors">
            <span className="flex items-center justify-center gap-1.5 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Track order
            </span>
          </Link>
        </>
      )}

      {o.shipper_id && !claimedByMe && (
        <button className="w-full btn btn-sm btn-ghost" disabled>
          <span className="flex items-center justify-center gap-1.5 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Claimed by another
          </span>
        </button>
      )}
    </div>
  );
}


