import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  getCustomers,
  getCustomerDetail,
  updateCustomer,
} from "../../utils/dataProvider/admin";
import toast from "react-hot-toast";

const BannedAccounts = () => {
  const userInfo = useSelector((s) => s.userInfo);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const controllerRef = useRef(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const detailControllerRef = useRef(null);
  const [unbanning, setUnbanning] = useState(false);

  // confirm modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmProps, setConfirmProps] = useState({
    title: "Confirm Action",
    message: "Are you sure?",
    onConfirm: () => {},
    confirmText: "Confirm",
    confirmClass: "btn-primary",
  });

  const openConfirmModal = ({
    title,
    message,
    onConfirm,
    confirmText = "Confirm",
    confirmClass = "btn-primary",
  }) => {
    setConfirmProps({ title, message, onConfirm, confirmText, confirmClass });
    setIsConfirmOpen(true);
  };

  const fetchCustomers = useCallback(
    async (p = 0, s = size, filtersArg = { status: "BANNED" }) => {
      controllerRef.current?.abort();
      const c = new AbortController();
      controllerRef.current = c;
      setLoading(true);
      setError(null);
      try {
        const res = await getCustomers(userInfo.token, p, s, c, filtersArg);
        const d = res.data;
        const list = Array.isArray(d)
          ? d
          : Array.isArray(d?.content)
          ? d.content
          : d?.data || [];
        // Ensure we only display users whose status is 'BANNED' (case-insensitive)
        const onlyBanned = (it) => {
          const s = (it?.status ?? it?.statusName ?? "")
            .toString()
            .toLowerCase();
          return s === "banned";
        };
        setItems((list || []).filter(onlyBanned));
        const tp = d?.totalPages ?? d?.meta?.totalPage ?? 1;
        setTotalPages(tp);
        if (d?.number !== undefined) setPage(d.number);
        else setPage(p);
        if (d?.size !== undefined) setSize(d.size);
        else setSize(s);
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED")
          return;
        console.error("Failed to load banned customers:", err);
        const status = err?.response?.status;
        const serverMsg =
          err?.response?.data?.message || err?.response?.data || err?.message;
        setError({
          status,
          message:
            typeof serverMsg === "string"
              ? serverMsg
              : JSON.stringify(serverMsg),
        });
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [userInfo.token, size]
  );

  useEffect(() => {
    fetchCustomers(0, size, { status: "BANNED" });
    return () => controllerRef.current?.abort();
  }, [fetchCustomers, size]);

  const openDetail = async (userId) => {
    detailControllerRef.current?.abort();
    const c = new AbortController();
    detailControllerRef.current = c;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const detailRes = await getCustomerDetail(userInfo.token, userId, c);
      const det = detailRes.data;
      setDetail(det);
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
      console.error("Customer detail fetch error:", err);
      const status = err?.response?.status;
      const serverMsg =
        err?.response?.data?.message || err?.response?.data || err?.message;
      setDetailError({
        status,
        message:
          typeof serverMsg === "string" ? serverMsg : JSON.stringify(serverMsg),
      });
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
  };

  const doUnban = async () => {
    if (!detail) return;
    const id = detail.userId ?? detail.id ?? detail.user_id;
    setUnbanning(true);
    try {
      // Use the shared update method to change status to ACTIVE
      await updateCustomer(userInfo.token, id, { status: "ACTIVE" });
      toast.success("User unbanned");
      fetchCustomers(page, size, { status: "BANNED" });
      closeDetail();
    } catch (err) {
      console.error("Failed to unban user:", err);
      toast.error(
        "Failed to unban: " + (err?.response?.data?.message || err.message)
      );
    } finally {
      setUnbanning(false);
    }
  };

  return (
    <>
      <Header />
      <main className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Banned Accounts</h1>
          <div>
            <button
              className="btn btn-sm"
              onClick={() => navigate("/customers")}
            >
              Back
            </button>
          </div>
        </div>

        {/* Simple search could be added later; keep page focused on banned accounts */}

        {loading ? (
          <p className="text-sm text-gray-600">Loading...</p>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="font-semibold text-red-700">
              Failed to load customers
            </p>
            <p className="text-sm text-red-600">
              Status: {error.status || "?"}
            </p>
            <pre className="text-xs text-red-600 whitespace-pre-wrap">
              {error.message}
            </pre>
          </div>
        ) : items.length < 1 ? (
          <p className="text-sm text-gray-600">No banned customers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>User ID</th>
                  <th>Full Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr
                    key={it.userId ?? it.user_id}
                    className="hover:bg-gray-100"
                  >
                    <td>{page * size + idx + 1}</td>
                    <td>
                      <button
                        className="text-primary font-medium hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(it.userId ?? it.user_id);
                        }}
                      >
                        {it.userId ?? it.user_id}
                      </button>
                    </td>
                    <td>
                      <button
                        className="text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(it.userId ?? it.user_id);
                        }}
                      >
                        {it.fullName ?? it.full_name ?? "-"}
                      </button>
                    </td>
                    <td>{it.status ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {detail && (
              <div
                className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
                onClick={closeDetail}
              >
                <div
                  className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="text-2xl font-bold mb-4 text-center">
                    User detail
                  </h2>
                  <div className="text-base grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Username</p>
                        <p className="font-medium text-gray-800">
                          {detail.username ?? detail.userName ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium text-gray-800">
                          {detail.email ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium text-gray-800">
                          {detail.phone ?? "-"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Street</p>
                        <p className="font-medium text-gray-800">
                          {detail.street ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">City</p>
                        <p className="font-medium text-gray-800">
                          {detail.city ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">District</p>
                        <p className="font-medium text-gray-800">
                          {detail.district ?? "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <div>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() =>
                          openConfirmModal({
                            title: "Unban User?",
                            message: `Are you sure you want to unban this account ?`,
                            onConfirm: doUnban,
                            confirmText: "Yes, Unban",
                            confirmClass: "btn-success",
                          })
                        }
                        disabled={unbanning}
                      >
                        {unbanning ? "Unbanning..." : "Unban user"}
                      </button>
                    </div>

                    <div>
                      <button className="btn btn-sm" onClick={closeDetail}>
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {detailLoading && (
              <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                <div className="bg-white p-4 rounded">Loading detail...</div>
              </div>
            )}

            {detailError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-700 font-semibold">
                  Failed to load detail (Status {detailError.status || "?"})
                </p>
                <pre className="text-xs text-red-600 whitespace-pre-wrap">
                  {detailError.message}
                </pre>
              </div>
            )}

            <div className="flex justify-between items-center mt-4">
              <div className="text-sm">
                Page {page + 1} / {Math.max(1, totalPages)}
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-sm"
                  disabled={page <= 0}
                  onClick={() =>
                    fetchCustomers(Math.max(0, page - 1), size, {
                      status: "BANNED",
                    })
                  }
                >
                  Prev
                </button>
                <button
                  className="btn btn-sm"
                  disabled={page >= totalPages - 1}
                  onClick={() =>
                    fetchCustomers(Math.min(totalPages - 1, page + 1), size, {
                      status: "BANNED",
                    })
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {isConfirmOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3
              className={`font-bold text-lg ${
                confirmProps.confirmClass === "btn-error" ? "text-error" : ""
              }`}
            >
              {confirmProps.title}
            </h3>
            <p className="py-4">{confirmProps.message}</p>
            <div className="modal-action">
              <button className="btn" onClick={() => setIsConfirmOpen(false)}>
                Cancel
              </button>
              <button
                className={`btn ${confirmProps.confirmClass}`}
                onClick={() => {
                  confirmProps.onConfirm();
                  setIsConfirmOpen(false);
                }}
              >
                {confirmProps.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default BannedAccounts;
