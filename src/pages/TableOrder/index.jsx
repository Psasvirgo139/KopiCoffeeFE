import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getTransactions, updateTransactionStatus } from "../../utils/dataProvider/transaction";
import { toast } from "react-hot-toast";
import loadingImage from "../../assets/images/loading.svg";
import emptyBox from "../../assets/images/empty-box.svg";

function TableOrder() {
  const userInfo = useSelector((s) => s.userInfo);
  const controller = useMemo(() => new AbortController(), []);
  const [items, setItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const pollStartedRef = useRef(false);
  const lastSnapshotRef = useRef("");

  const fetchList = (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    // type=TABLE makes backend return orders with address IS NULL and status NOT IN (CANCELLED, REJECTED, COMPLETED)
    getTransactions({ status: "PENDING", page: 1, limit: 50, type: "TABLE" }, userInfo.token, controller)
      .then((res) => {
        const data = res.data?.data || [];
        const sortedData = [...data].sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        });
        const snapshot = JSON.stringify(sortedData.map((d) => ({
          id: d.id,
          status: d.status,
          total: d.total,
          table_number: d.table_number,
          created_at: d.created_at,
        })));
        if (snapshot !== lastSnapshotRef.current) {
          lastSnapshotRef.current = snapshot;
          setItems(sortedData);
        }
      })
      .finally(() => { if (isInitial) setInitialLoading(false); });
  };

  useEffect(() => {
    if (pollStartedRef.current) return;
    pollStartedRef.current = true;
    fetchList(true);
    const t = setInterval(() => fetchList(false), 5000);
    return () => clearInterval(t);
  }, []);

  if (Number(userInfo.role) !== 2) return <Navigate to="/products" replace={true} />;

  const visibleItems = useMemo(() => {
    if (filterStatus === "READY") return items.filter((item) => item.status === "READY");
    if (filterStatus === "PENDING") return items.filter((item) => item.status === "PENDING");
    if (filterStatus === "PAID") return items.filter((item) => item.status === "PAID");
    return items;
  }, [items, filterStatus]);

  const filterOptions = [
    { key: "ALL", label: "All Orders" },
    { key: "READY", label: "Ready" },
    { key: "PENDING", label: "Pending" },
    { key: "PAID", label: "Paid" },
  ];

  return (
    <>
      <Header />
      <main className="global-px py-6 min-h-screen">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-quartenary mb-2">Table Orders</h1>
          <p className="text-gray-600">Manage and monitor dine-in orders</p>
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
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No table orders available</h3>
            <p className="text-gray-500">All dine-in orders have been processed or there are no new ones right now.</p>
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
                <div className="bg-gradient-to-r from-tertiary to-[#8B5A3C] px-4 py-3 text-white">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold">Order #{o.id}</h3>
                      {getStatusBadge(o.status)}
                    </div>
                    <p className="text-xs text-white/90">
                      {o.created_at
                        ? new Date(o.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-tertiary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 mb-0.5">Table</p>
                          <p className="text-sm text-gray-700">
                            {o.table_number ? `Table ${o.table_number}` : "No table assigned"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">
                          Items ({o.products?.length || 0})
                        </p>
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
                              +{o.products.length - 3} more item{(o.products.length - 3) > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium text-gray-800">{o.subtotal}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Service:</span>
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

                      <div className="pt-2">
                        <TableActions o={o} userInfo={userInfo} controller={controller} onUpdated={fetchList} />
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

export default TableOrder;

function TableActions({ o, userInfo, controller, onUpdated }) {
  return (
    <div className="flex flex-col gap-2">
      {o.status === "PENDING" && (
        <>
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
          <button
            className="w-full btn btn-sm btn-error text-white hover:bg-red-600 transition-colors"
            onClick={async () => {
              try {
                await updateTransactionStatus(o.id, "CANCELLED", userInfo.token, controller);
                onUpdated?.();
                toast.success("Order cancelled");
              } catch {
                toast.error("Error");
              }
            }}
          >
            <span className="flex items-center justify-center gap-1.5 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel order
            </span>
          </button>
        </>
      )}

      {o.status === "READY" && (
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Confirm paid
          </span>
        </button>
      )}

      {o.status === "PAID" && (
        <button
          className="w-full btn btn-sm btn-primary text-white hover:bg-[#8B5A3C] transition-colors"
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
            Complete order
          </span>
        </button>
      )}
    </div>
  );
}

function getStatusBadge(status) {
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
}


