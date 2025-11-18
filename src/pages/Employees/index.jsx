import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getEmployees } from "../../utils/dataProvider/admin";
import toast from "react-hot-toast"; // <--- THÊM IMPORT NÀY

const Employees = () => {
  const userInfo = useSelector((s) => s.userInfo);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null); // { status, message }
  const controllerRef = useRef(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const detailControllerRef = useRef(null);
  const [positions, setPositions] = useState([]);
  const [selectedPositionId, setSelectedPositionId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // filter/search states
  const [filterUsername, setFilterUsername] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterPositionId, setFilterPositionId] = useState("");

  // --- THÊM STATE CHO MODAL XÁC NHẬN ---
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmProps, setConfirmProps] = useState({
    title: "Confirm Action",
    message: "Are you sure?",
    onConfirm: () => {},
    confirmText: "Confirm",
    confirmClass: "btn-primary",
  });
  // --- KẾT THÚC STATE MODAL ---

  // --- THÊM HÀM MỞ MODAL ---
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
  // --- KẾT THÚC HÀM MỞ MODAL ---

  const doSearch = (overrides = {}) => {
    fetchEmployees({
      fullName:
        (overrides.fullName !== undefined
          ? overrides.fullName
          : filterUsername) || undefined,
      positionName:
        (overrides.positionName !== undefined
          ? overrides.positionName
          : filterPositionId) || undefined,
      phone:
        (overrides.phone !== undefined ? overrides.phone : filterPhone) ||
        undefined,
      email:
        (overrides.email !== undefined ? overrides.email : filterEmail) ||
        undefined,
    });
  };

  const fetchEmployees = useCallback(
    async (filters = {}) => {
      // abort previous
      controllerRef.current?.abort();
      const c = new AbortController();
      controllerRef.current = c;

      setLoading(true);
      setError(null);
      try {
        const params = filters || {};
        // map our filter keys to backend query param names
        const q = {};
        // send fullName (camelCase) to match backend controller param name
        if (params.fullName || filterUsername)
          q.fullName =
            (params.fullName !== undefined
              ? params.fullName
              : filterUsername) || undefined;
        if (params.phone || filterPhone) q.phone = params.phone ?? filterPhone;
        if (params.email || filterEmail) q.email = params.email ?? filterEmail;
        if (params.positionName || filterPositionId)
          q.positionName = params.positionName ?? filterPositionId;

        const res = await getEmployees(userInfo.token, c, q);
        console.debug("GET /apiv1/admin/employees response:", res);
        const data = res.data;
        const normalized = Array.isArray(data) ? data : data?.data || [];
        setItems(normalized);
      } catch (err) {
        if (err?.name === "CanceledError") return;
        console.error("Employees fetch error:", err);
        const status = err?.response?.status;
        // try to stringify common shapes
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
    [userInfo.token, filterEmail, filterPhone, filterPositionId, filterUsername] // Thêm dependencies
  );

  const openDetail = async (userId) => {
    detailControllerRef.current?.abort();
    const c = new AbortController();
    detailControllerRef.current = c;
    setDetailLoading(true);
    setDetailError(null);
    try {
      // we already have employees list; optionally fetch detail from endpoint
      // but per backend, endpoint is /apiv1/admin/employees/{id}
      // call dedicated helper
      const detailRes = await (
        await import("../../utils/dataProvider/admin")
      ).getEmployeeDetail(userInfo.token, userId, c);
      console.debug("GET /apiv1/admin/employees/{id} response:", detailRes);
      const det = detailRes.data;
      setDetail(det);

      // fetch positions for the dropdown
      try {
        const posRes = await (
          await import("../../utils/dataProvider/admin")
        ).getPositions(userInfo.token, c);
        const posData = posRes.data;
        // normalize array of objects or wrapper
        const posList = Array.isArray(posData) ? posData : posData?.data || [];
        setPositions(posList);
        // set selected position by matching id or name
        const matched = posList.find((p) => {
          if (p.positionId !== undefined)
            return p.positionId === det.positionId;
          if (p.id !== undefined)
            return p.id === det.positionId || p.id === det.positionId;
          // fallback: match by name
          return (p.positionName || p.name) === det.positionName;
        });
        setSelectedPositionId(
          matched ? matched.positionId ?? matched.id ?? null : null
        );
      } catch (pe) {
        console.debug("Failed to load positions for dropdown:", pe);
        setPositions([]);
        setSelectedPositionId(null);
      }

      // set status editable field
      setSelectedStatus(det.status ?? null);
    } catch (err) {
      if (err?.name === "CanceledError") return;
      console.error("Employee detail fetch error:", err);
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

  // --- HÀM ĐÃ CẬP NHẬT: saveChanges ---
  const saveChanges = async () => {
    if (!detail) return;

    // Tách logic ra hàm riêng
    const doSave = async () => {
      setSaving(true);
      const c = new AbortController();
      try {
        const { updateEmployee } = await import("../../utils/dataProvider/admin");
        const payload = {};
        if (selectedPositionId !== null) payload.positionId = selectedPositionId;
        if (selectedStatus !== null) payload.status = selectedStatus;
        await updateEmployee(userInfo.token, detail.userId, payload, c);
        
        // SỬA: Dùng toast
        toast.success("Employee updated successfully.");
        
        // refresh list and detail
        fetchEmployees();
        openDetail(detail.userId);
      } catch (err) {
        console.error("Failed to save employee:", err);
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          JSON.stringify(err?.response?.data || err);
        
        // SỬA: Dùng toast
        toast.error("Failed to save: " + msg);
      } finally {
        setSaving(false);
      }
    };
    
    // SỬA: Mở modal
    openConfirmModal({
      title: "Save Changes?",
      message: "Save changes to this employee? This will update position and status.",
      onConfirm: doSave,
      confirmText: "Yes, Save",
      confirmClass: "btn-primary"
    });
  };

  // --- HÀM ĐÃ CẬP NHẬT: deleteEmployee ---
  const deleteEmployee = async () => {
    if (!detail) return;

    // Tách logic ra hàm riêng
    const doDelete = async () => {
      setDeleting(true);
      const c = new AbortController();
      try {
        const { demoteEmployeeToCustomer } = await import(
          "../../utils/dataProvider/admin"
        );
        await demoteEmployeeToCustomer(userInfo.token, detail.userId, c);
        
        // SỬA: Dùng toast
        toast.success("Employee deleted (demoted to customer).");
        fetchEmployees();
        closeDetail();
      } catch (err) {
        console.error("Failed to delete/demote employee:", err);
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          JSON.stringify(err?.response?.data || err);
        
        // SỬA: Dùng toast
        toast.error("Failed to delete: " + msg);
      } finally {
        setDeleting(false);
      }
    };

    // SỬA: Mở modal
    openConfirmModal({
      title: "Delete Employee?",
      message: "Are you sure you want to delete this employee? This will change their role to customer.",
      onConfirm: doDelete,
      confirmText: "Yes, Delete",
      confirmClass: "btn-error"
    });
  };

  const closeDetail = () => {
    detailControllerRef.current?.abort();
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
    return () => controllerRef.current?.abort();
  }, [fetchEmployees]);

  // load positions on mount for the filter dropdown
  useEffect(() => {
    let mounted = true;
    const c = new AbortController();
    (async () => {
      try {
        const { getPositions } = await import("../../utils/dataProvider/admin");
        const res = await getPositions(userInfo.token, c);
        const d = res.data;
        const list = Array.isArray(d) ? d : d?.data || [];
        if (mounted) setPositions(list);
      } catch (e) {
        console.debug("Could not load positions for filter:", e);
      }
    })();
    return () => {
      mounted = false;
      c.abort();
    };
  }, [userInfo.token]);

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Manage Staffs</h1>

        {/* Filters */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-100 rounded">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-600">Full Name</label>
              <input
                type="text"
                value={filterUsername}
                onChange={(e) => setFilterUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSearch();
                }}
                className="input input-sm w-full mt-1"
                placeholder="full name"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Position</label>
              <select
                value={filterPositionId}
                onChange={(e) => setFilterPositionId(e.target.value)}
                className="select select-sm w-full mt-1"
              >
                <option value="">- any -</option>
                {positions.map((p, idx) => {
                  const id = p.positionId ?? p.id ?? p.value ?? p.position_id;
                  const label =
                    p.positionName ?? p.name ?? p.position_name ?? String(p);
                  return (
                    <option
                      key={idx}
                      value={label /* backend expects positionName */}
                    >
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600">Phone</label>
              <input
                type="text"
                value={filterPhone}
                onChange={(e) => setFilterPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSearch();
                }}
                className="input input-sm w-full mt-1"
                placeholder="phone"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Email</label>
              <input
                type="text"
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSearch();
                }}
                className="input input-sm w-full mt-1"
                placeholder="email"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center space-x-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => doSearch()}
            >
              Search
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                setFilterUsername("");
                setFilterPositionId("");
                setFilterPhone("");
                setFilterEmail("");
                doSearch({
                  fullName: "",
                  positionName: "",
                  phone: "",
                  email: "",
                });
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Loading...</p>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="font-semibold text-red-700">
              Failed to load employees
            </p>
            <p className="text-sm text-red-600">
              Status: {error.status || "?"}
            </p>
            <pre className="text-xs text-red-600 whitespace-pre-wrap">
              {error.message}
            </pre>
            <div className="mt-3">
              <button
                className="btn btn-sm btn-primary mr-2"
                onClick={() => fetchEmployees()} // Sửa: gọi fetchEmployees
              >
                Retry
              </button>
            </div>
          </div>
        ) : items.length < 1 ? (
          <p className="text-sm text-gray-600">No employees found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Position</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.userId ?? idx} className="hover:bg-gray-100">
                    <td>{idx + 1}</td>
                    <td>
                      <button
                        className="text-primary font-medium hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(it.userId);
                        }}
                      >
                        {it.userId}
                      </button>
                    </td>
                    <td>
                      <button
                        className="text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(it.userId);
                        }}
                      >
                        {it.fullName}
                      </button>
                    </td>
                    <td>{it.positionName || "-"}</td>
                    <td>{it.status ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Detail modal */}
        {detail && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={closeDetail}
          >
            <div
              className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4 text-center">
                Employee detail
              </h2>
              <div className="text-base grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Username</p>
                  <p className="font-medium text-gray-800">{detail.username}</p>

                  <p className="text-sm text-gray-600 mt-3">Email</p>
                  <p className="font-medium text-gray-800">{detail.email}</p>

                  <p className="text-sm text-gray-600 mt-3">Phone</p>
                  <p className="font-medium text-gray-800">
                    {detail.phone ?? "-"}
                  </p>
                  <div>
                    <p className="text-sm text-gray-600">Street</p>
                    <p className="font-medium text-gray-800">
                      {detail.street ?? "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mt-3">City</p>
                    <p className="font-medium text-gray-800">
                      {detail.city ?? "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mt-3">District</p>
                    <p className="font-medium text-gray-800">
                      {detail.district ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">
                      Position
                    </label>
                    <select
                      value={selectedPositionId ?? ""}
                      onChange={(e) =>
                        setSelectedPositionId(
                          e.target.value === ""
                            ? null
                            : isNaN(Number(e.target.value))
                            ? e.target.value
                            : Number(e.target.value)
                        )
                      }
                      className="border rounded px-3 py-2 w-full"
                    >
                      <option value="">- select position -</option>
                      {positions.map((p, idx) => {
                        const id =
                          p.positionId ?? p.id ?? p.value ?? p.position_id;
                        const label =
                          p.positionName ??
                          p.name ??
                          p.position_name ??
                          String(p);
                        return (
                          <option key={idx} value={id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 block mb-1">
                      Status
                    </label>
                    <select
                      value={selectedStatus ?? ""}
                      onChange={(e) =>
                        setSelectedStatus(
                          e.target.value === "" ? null : e.target.value
                        )
                      }
                      className="border rounded px-3 py-2 w-full"
                    >
                      <option value="">- select status -</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div>
                  <button
                    className="btn btn-sm btn-error"
                    onClick={deleteEmployee}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>

                <div className="space-x-2">
                  <button
                    className="btn btn-sm"
                    onClick={closeDetail}
                    disabled={saving || deleting}
                  >
                    Close
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={saveChanges}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
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
      </main>

      {/* --- THÊM MODAL XÁC NHẬN CHUNG --- */}
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
              <button
                className="btn"
                onClick={() => setIsConfirmOpen(false)}
              >
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
      {/* --- KẾT THÚC MODAL --- */}

      <Footer />
    </>
  );
};

export default Employees;