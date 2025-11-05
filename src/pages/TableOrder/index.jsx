import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getTransactions, updateTransactionStatus } from "../../utils/dataProvider/transaction";
import { toast } from "react-hot-toast";

function TableOrder() {
  const userInfo = useSelector((s) => s.userInfo);
  const controller = useMemo(() => new AbortController(), []);
  const [items, setItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const pollStartedRef = useRef(false);

  const fetchList = (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    // type=TABLE makes backend return orders with address IS NULL and status NOT IN (CANCELLED, REJECTED, COMPLETED)
    getTransactions({ status: "PENDING", page: 1, limit: 50, type: "TABLE" }, userInfo.token, controller)
      .then((res) => {
        const data = res.data?.data || [];
        setItems(data);
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

  return (
    <>
      <Header />
      <main className="global-px py-6">
        <h1 className="text-2xl font-bold mb-4">Table Orders</h1>
        {initialLoading ? (
          <div>Loading...</div>
        ) : items.length < 1 ? (
          <div>No pending table orders.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((o) => (
              <div key={o.id} className="border rounded p-3">
                <div className="font-semibold">Order #{o.id} {o.table_number ? `(Table ${o.table_number})` : ""}</div>
                <div className="text-xs text-gray-500">Status: {o.status}</div>
                <div className="text-sm flex flex-col md:flex-row md:items-center gap-2">
                  <span>Total: {o.total}</span>
                  <span className="text-gray-500">|</span>
                  <span>Subtotal: {o.subtotal}</span>
                  <span className="text-gray-500">|</span>
                  <span>Shipping: {o.shipping_fee}</span>
                  <span className="text-gray-500">|</span>
                  <span>Discount: {o.discount}</span>
                </div>
                <ul className="list-disc ml-5">
                  {o.products?.map((p, idx) => (
                    <li key={idx}>
                      {p.product_name} x{p.qty} {p.size ? `(${p.size})` : ""} - {p.subtotal}
                      {Array.isArray(p.add_ons) && p.add_ons.length > 0 && (
                        <ul className="list-disc ml-5 text-xs text-gray-600">
                          {p.add_ons.map((ao, i2) => (
                            <li key={i2}>{ao.name} (+{ao.price})</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
                <TableActions o={o} userInfo={userInfo} controller={controller} onUpdated={fetchList} />
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
    <div className="mt-2 flex flex-wrap gap-2 items-center">
      {o.status === "PENDING" && (
        <>
          <button
            className="btn btn-primary text-white"
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
            Mark as ready
          </button>
          <button
            className="btn btn-error text-white"
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
            Cancel order
          </button>
        </>
      )}

      {o.status === "READY" && (
        <button
          className="btn btn-success text-white"
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
          Confirm paid
        </button>
      )}

      {o.status === "PAID" && (
        <button
          className="btn btn-primary text-white"
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
          Complete order
        </button>
      )}
    </div>
  );
}


