import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getTransactions, updateTransactionStatus } from "../../utils/dataProvider/transaction";
import { claimOrder } from "../../utils/dataProvider/shipping";
import { toast } from "react-hot-toast";
import { profileAction } from "../../redux/slices/profile.slice";

function ShippingOrder() {
  const dispatch = useDispatch();
  const userInfo = useSelector((s) => s.userInfo);
  const profile = useSelector((s) => s.profile);
  const controller = useMemo(() => new AbortController(), []);
  const [items, setItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
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
        // avoid unnecessary re-renders (and button flicker) by deep compare snapshot
        const snapshot = JSON.stringify(data.map((d) => ({ id: d.id, status: d.status, total: d.total, address: d.address, created_at: d.created_at, shipper_id: d.shipper_id })));
        if (snapshot !== lastSnapshotRef.current) {
          lastSnapshotRef.current = snapshot;
          setItems(data);
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

  return (
    <>
      <Header />
      <main className="global-px py-6">
        <h1 className="text-2xl font-bold mb-4">Shipping Orders</h1>
        {initialLoading ? (
          <div>Loading...</div>
        ) : items.length < 1 ? (
          <div>No pending shipping orders.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((o) => (
              <div key={o.id} className="border rounded p-3">
                <div className="font-semibold">Order #{o.id}</div>
                <div className="text-sm text-gray-600">{o.address}</div>
                <div className="text-sm flex flex-col md:flex-row md:items-center gap-2">
                  <span>Total: {o.total}</span>
                  <span className="text-gray-500">|</span>
                  <span>Subtotal: {o.subtotal}</span>
                  <span className="text-gray-500">|</span>
                  <span>Shipping: {o.shipping_fee}</span>
                  <span className="text-gray-500">|</span>
                  <span>Discount: {o.discount}</span>
                </div>
                <div className="text-xs text-gray-500">Status: {o.status}</div>
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
                    hasActiveClaim={items.some((it) => it.shipper_id === profile?.data?.user_id && ["ACCEPTED","READY","SHIPPING"].includes(it.status))}
                  />
                )}
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
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const createdAtMs = o.created_at ? new Date(o.created_at).getTime() : Date.now();
  const diffMs = now - createdAtMs;
  const waitMs = Math.max(0, 5 * 60 * 1000 - diffMs);
  const mm = String(Math.floor(waitMs / 60000)).padStart(2, "0");
  const ss = String(Math.floor((waitMs % 60000) / 1000)).padStart(2, "0");

  const disabledAccept = waitMs > 0 || o.status !== "PENDING";

  return (
    <div className="mt-2 flex flex-wrap gap-2 items-center">
      {o.status === "PENDING" && (
        <>
          <button
            className={`btn ${disabledAccept ? "btn-disabled" : "btn-primary text-white"}`}
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
            {disabledAccept ? `Accept in ${mm}:${ss}` : "Accept order"}
          </button>
          <button
            className="btn btn-error text-white"
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
            Reject order
          </button>
        </>
      )}

      {o.status === "ACCEPTED" && (
        <>
          <button className="btn btn-ghost" disabled>Accepted</button>
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
        </>
      )}

      {o.status === "READY" && (
        <button className="btn btn-ghost" disabled>Ready for shipping</button>
      )}

      {o.status === "PAID" && (
        <button
          className="btn btn-success text-white"
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
          Confirm Completed
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
    <div className="mt-2 flex flex-wrap gap-2 items-center">
      {canClaimThis && (
        <button
          className="btn btn-primary text-white"
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
          Claim order
        </button>
      )}

      {claimedByMe && o.status === "ACCEPTED" && (
        <>
          <button className="btn btn-ghost" disabled>Claimed</button>
          <button className="btn btn-disabled" disabled>waiting for ready</button>
        </>
      )}

      {claimedByMe && o.status === "READY" && (
        <button
          className="btn btn-primary text-white"
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
          Shipping
        </button>
      )}

      {claimedByMe && o.status === "SHIPPING" && (
        <>
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
          <Link to={`/shipping/${o.id}`} className="btn btn-secondary text-white">
            Track order
          </Link>
        </>
      )}

      {o.shipper_id && !claimedByMe && (
        <button className="btn btn-ghost" disabled>Claimed by another</button>
      )}
    </div>
  );
}


