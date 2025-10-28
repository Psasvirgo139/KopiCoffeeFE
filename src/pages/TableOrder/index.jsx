import React, { useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getTransactions({ status: "PENDING", page: 1, limit: 50, type: "TABLE" }, userInfo.token, controller)
      .then((res) => {
        const data = res.data?.data || [];
        setItems(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (Number(userInfo.role) !== 2) return <Navigate to="/products" replace={true} />;

  return (
    <>
      <Header />
      <main className="global-px py-6">
        <h1 className="text-2xl font-bold mb-4">Table Orders (Pending)</h1>
        {loading ? (
          <div>Loading...</div>
        ) : items.length < 1 ? (
          <div>No pending table orders.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((o) => (
              <div key={o.id} className="border rounded p-3">
                <div className="font-semibold">Order #{o.id} {o.table_number ? `(Table ${o.table_number})` : ""}</div>
                <div className="text-sm">Total: {o.total}</div>
                <ul className="list-disc ml-5">
                  {o.products?.map((p, idx) => (
                    <li key={idx}>{p.product_name} x{p.qty} - {p.subtotal}</li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <button
                    className="btn btn-primary text-white"
                    onClick={async () => {
                      try {
                        await updateTransactionStatus(o.id, "COMPLETED", userInfo.token, controller);
                        setItems((prev) => prev.filter((x) => x.id !== o.id));
                        toast.success("Order updated");
                      } catch (e) {
                        toast.error("Error");
                      }
                    }}
                  >
                    Mark as done
                  </button>
                  <button
                    className="btn btn-error text-white"
                    onClick={async () => {
                      try {
                        await updateTransactionStatus(o.id, "CANCELLED", userInfo.token, controller);
                        setItems((prev) => prev.filter((x) => x.id !== o.id));
                        toast.success("Order updated");
                      } catch (e) {
                        toast.error("Error");
                      }
                    }}
                  >
                    Cancel order
                  </button>
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


