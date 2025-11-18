import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Modal from "../../components/Modal";
import { toast } from "react-hot-toast";
import { getTables, updateTable, rotateTableQr } from "../../utils/dataProvider/tables";

const statusOptions = ["AVAILABLE", "OCCUPIED", "DISABLED"];

export default function Tables() {
  const userInfo = useSelector((s) => s.userInfo);
  const controller = useMemo(() => new AbortController(), []);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, tableId: null });
  const [saving, setSaving] = useState({});

  const fetchList = () => {
    setLoading(true);
    getTables({ page: 1, limit: 200 }, userInfo.token, controller)
      .then((res) => {
        const list = res.data?.data || res.data?.data?.data || res.data?.data?.content || res.data?.data || [];
        setItems(Array.isArray(list) ? list : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, []);

  const saveStatus = async (t) => {
    setSaving((s) => ({ ...s, [t.tableId || t.id]: true }));
    try {
      await updateTable(t.tableId || t.id, { status: t.status }, userInfo.token, controller);
      toast.success("Status updated");
      fetchList();
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving((s) => ({ ...s, [t.tableId || t.id]: false }));
    }
  };

  const rotateQr = async (tableId) => {
    try {
      await rotateTableQr(tableId, userInfo.token, controller);
      toast.success("QR token rotated");
      fetchList();
    } catch {
      toast.error("Failed to rotate QR");
    } finally {
      setConfirm({ open: false, tableId: null });
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("QR token copied");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast.success("QR token copied");
      } catch {
        toast.error("Failed to copy");
      }
    }
  };

  return (
    <>
      <Header />
      <main className="global-px py-6 min-h-screen">
        <section className="mb-6">
          <h1 className="text-3xl font-bold text-quartenary">Manage Tables</h1>
          <p className="text-gray-600">View and update table statuses, rotate QR tokens.</p>
        </section>

        {loading ? (
          <section className="w-full h-64 flex items-center justify-center text-gray-500">Loading...</section>
        ) : items.length < 1 ? (
          <section className="w-full h-64 flex items-center justify-center text-gray-500">No tables found</section>
        ) : (
          <section className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Number</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">QR Token</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Created At</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Updated At</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => {
                    const id = t.tableId ?? t.id;
                    return (
                      <tr key={id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-800">{id}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{t.number}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{t.name || "-"}</td>
                        <td className="px-4 py-3">
                          <select
                            className="select select-bordered select-sm"
                            value={t.status}
                            onChange={(e) => {
                              const v = e.target.value;
                              setItems((prev) =>
                                prev.map((x) => ( (x.tableId ?? x.id) === id ? { ...x, status: v } : x ))
                              );
                            }}
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {(() => {
                            const full = String(t.qrToken || t.qr_token || "");
                            const short = full ? `${full.slice(0, 12)}...` : "-";
                            return (
                              <div className="flex items-center gap-2">
                                <span className="font-mono truncate max-w-[160px]" title={full}>{short}</span>
                                {full && (
                                  <button
                                    className="btn btn-xs btn-outline"
                                    onClick={() => copyToClipboard(full)}
                                    title="Copy full QR token"
                                  >
                                    Copy
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {t.createdAt ? new Date(t.createdAt).toLocaleString() : "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button
                              className={`btn btn-xs ${saving[id] ? "btn-disabled" : "btn-primary text-white"}`}
                              disabled={!!saving[id]}
                              onClick={() => saveStatus(t)}
                            >
                              {saving[id] ? "Saving..." : "Save"}
                            </button>
                            <button
                              className="btn btn-xs btn-secondary text-white"
                              onClick={() => setConfirm({ open: true, tableId: id })}
                            >
                              Rotate QR
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
      <Footer />

      <Modal isOpen={confirm.open} onClose={() => setConfirm({ open: false, tableId: null })}>
        <div className="space-y-3">
          <div className="text-lg font-semibold">Rotate QR Token</div>
          <p className="text-sm text-gray-700">
            Are you sure you want to generate a new QR token for this table? The old QR will no longer work.
          </p>
          <div className="flex gap-2 justify-end">
            <button className="btn" onClick={() => setConfirm({ open: false, tableId: null })}>Cancel</button>
            <button
              className="btn btn-primary text-white"
              onClick={() => confirm.tableId && rotateQr(confirm.tableId)}
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}


