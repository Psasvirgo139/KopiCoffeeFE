import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import api from "../../utils/dataProvider/base";
import {
  getCustomers,
  getPositions,
  getRoles,
  getCustomerDetail,
  deleteCustomer,
  updateCustomer,
  createEmployee,
} from "../../utils/dataProvider/admin";
// Import toast (đã có sẵn)
import toast from "react-hot-toast";

const Customers = () => {
  const userInfo = useSelector((s) => s.userInfo);
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
  const [deleting, setDeleting] = useState(false);
  const [positions, setPositions] = useState([]);
  const [selectedPositionId, setSelectedPositionId] = useState(null);
  const promoteSelectRef = useRef(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [promoting, setPromoting] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  // filter states
  const [filterFullName, setFilterFullName] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterRoleName, setFilterRoleName] = useState("");
  const [filters, setFilters] = useState({});
  const [roles, setRoles] = useState([]);

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


  const fetchCustomers = useCallback(
    async (p, s, filtersArg = undefined) => {
      // ... (code fetchCustomers giữ nguyên, không thay đổi)
      const pageParam = p ?? 0;
      const sizeParam = s ?? size;
      const filtersToUse = filtersArg !== undefined ? filtersArg : filters;
      if (filtersArg !== undefined) setFilters(filtersArg || {});
      controllerRef.current?.abort();
      const c = new AbortController();
      controllerRef.current = c;
      setLoading(true);
      setError(null);
      try {
        const res = await getCustomers(
          userInfo.token,
          pageParam,
          sizeParam,
          c,
          filtersToUse
        );
        const d = res.data;
        const list = Array.isArray(d)
          ? d
          : Array.isArray(d?.content)
          ? d.content
          : d?.data || [];
        setItems(list || []);
        const tp = d?.totalPages ?? d?.meta?.totalPage ?? 1;
        setTotalPages(tp);
        if (d?.number !== undefined) setPage(d.number);
        else setPage(pageParam);
        if (d?.size !== undefined) setSize(d.size);
        else setSize(sizeParam);
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
          console.debug("Customers fetch canceled");
          return;
        }
        console.error("Failed to load customers:", err);
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
    [userInfo.token, size, filters]
  );

  useEffect(() => {
    fetchCustomers(0, size, filters);
    return () => controllerRef.current?.abort();
  }, [fetchCustomers, size]);

  const doSearch = () => {
    const f = {
      fullName: filterFullName || undefined,
      phone: filterPhone || undefined,
      email: filterEmail || undefined,
      roleName: filterRoleName || undefined,
    };
    fetchCustomers(0, size, f);
  };

  // load positions and roles (giữ nguyên)
  useEffect(() => {
    let mounted = true;
    const c = new AbortController();
    (async () => {
      try {
        const [posRes, rolesRes] = await Promise.all([
          getPositions(userInfo.token, c),
          getRoles(userInfo.token, c),
        ]);
        const pd = posRes.data;
        const list = Array.isArray(pd) ? pd : pd?.data || [];
        if (mounted) {
          setPositions(list || []);
          console.debug("Loaded positions:", list || []);
        }
        try {
          const rd = rolesRes.data;
          const rlist = Array.isArray(rd) ? rd : rd?.data || [];
          if (mounted) {
            setRoles(rlist || []);
            console.debug("Loaded roles:", rlist || []);
          }
        } catch (e) {
          console.debug("Could not load roles:", e);
          if (mounted) setRoles([]);
        }
      } catch (e) {
        console.debug("Could not load positions/roles:", e);
      }
    })();
    return () => {
      mounted = false;
      c.abort();
    };
  }, [userInfo.token]);

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

  const openDetail = async (userId) => {
    // ... (code openDetail giữ nguyên, không thay đổi)
    detailControllerRef.current?.abort();
    const c = new AbortController();
    detailControllerRef.current = c;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const detailRes = await getCustomerDetail(userInfo.token, userId, c);
      const det = detailRes.data;
      setDetail(det);
      setSelectedStatus(det?.status ?? null);
      setSelectedPositionId(det?.positionId ?? det?.position_id ?? null);
      setShowPromote(false);
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
    setShowPromote(false);
    setSelectedPositionId(null);
    setSelectedStatus(null);
  };

  // --- CẬP NHẬT: deleteCustomerHandler ---
  const deleteCustomerHandler = async () => {
    if (!detail) return;

    // Logic xóa sẽ được gọi bởi modal
    const doDelete = async () => {
      setDeleting(true);
      try {
        await deleteCustomer(
          userInfo.token,
          detail.userId ?? detail.id ?? detail.user_id
        );
        // SỬA: Dùng toast thay vì alert
        toast.success("User banned successfully");
        fetchCustomers(page, size, filters);
        closeDetail();
      } catch (err) {
        console.error("Failed to delete customer:", err);
        // SỬA: Dùng toast thay vì alert
        toast.error(
          "Failed to ban user: " + (err?.response?.data?.message || err.message)
        );
      } finally {
        setDeleting(false);
      }
    };

    // SỬA: Mở modal thay vì confirm
    openConfirmModal({
      title: "Ban User?",
      message: `Are you sure you want to ban user ${
        detail.fullName ?? detail.userId
      }? This action cannot be undone.`,
      onConfirm: doDelete,
      confirmText: "Yes, Ban User",
      confirmClass: "btn-error",
    });
  };

  // --- CẬP NHẬT: saveStatusHandler ---
  const saveStatusHandler = async () => {
    if (!detail || !selectedStatus) return;

    // Logic lưu sẽ được gọi bởi modal
    const doSave = async () => {
      try {
        await updateCustomer(
          userInfo.token,
          detail.userId ?? detail.id ?? detail.user_id,
          { status: selectedStatus }
        );
        fetchCustomers(page, size, filters);
        setDetail({ ...detail, status: selectedStatus });
        // SỬA: Dùng toast thay vì alert
        toast.success("Status updated");
      } catch (err) {
        console.error("Failed to update status:", err);
        const status = err?.response?.status;
        const body = err?.response?.data;
        let bodyStr = "";
        try {
          bodyStr = typeof body === "string" ? body : JSON.stringify(body);
        } catch (e) {
          bodyStr = String(body);
        }

        if (status && status >= 500) {
          console.debug("Attempting PATCH fallback...");
          try {
            const id = detail.userId ?? detail.id ?? detail.user_id;
            const cfg = {};
            if (userInfo?.token)
              cfg.headers = { Authorization: `Bearer ${userInfo.token}` };
            await api.patch(
              `/apiv1/admin/customers/${id}`,
              { status: selectedStatus },
              cfg
            );
            
            fetchCustomers(page, size, filters);
            setDetail({ ...detail, status: selectedStatus });
            // SỬA: Dùng toast thay vì alert
            toast.success("Status updated (via PATCH fallback)");
            return;
          } catch (patchErr) {
            console.error("PATCH fallback also failed:", patchErr);
            const pStatus = patchErr?.response?.status;
            const pBody = patchErr?.response?.data;
            let pBodyStr = "";
            try {
              pBodyStr =
                typeof pBody === "string" ? pBody : JSON.stringify(pBody);
            } catch (e) {
              pBodyStr = String(pBody);
            }
            // SỬA: Dùng toast thay vì alert
            toast.error(
              `Failed to update status (PUT and PATCH): ${status || "?"} - ${
                bodyStr || err.message
              }; PATCH: ${pStatus || "?"} - ${pBodyStr || patchErr.message}`,
              { duration: 6000 } // Tăng thời gian hiển thị cho lỗi dài
            );
            return;
          }
        }

        // SỬA: Dùng toast thay vì alert
        toast.error(
          `Failed to update status: ${status || "?"} - ${bodyStr || err.message}`
        );
      }
    };

    // SỬA: Mở modal thay vì confirm
    openConfirmModal({
      title: "Change Status?",
      message: `Are you sure you want to change status of ${
        detail.fullName ?? detail.userId
      } to ${selectedStatus}?`,
      onConfirm: doSave,
      confirmText: "Yes, Save",
      confirmClass: "btn-primary",
    });
  };

  // --- CẬP NHẬT: promoteToEmployeeHandler ---
  const promoteToEmployeeHandler = async () => {
    if (!detail || !selectedPositionId) {
      // SỬA: Dùng toast thay vì alert
      toast.error("Select a position to promote");
      return;
    }

    const chosenPos = positions.find(
      (p) =>
        (p.id ?? p.positionId) === selectedPositionId ||
        (p.id ?? p.positionId) === Number(selectedPositionId)
    );
    const posName =
      chosenPos?.positionName ??
      chosenPos?.position_name ??
      chosenPos?.name ??
      String(selectedPositionId);

    // Logic thăng chức sẽ được gọi bởi modal
    const doPromote = async () => {
      setPromoting(true);
      try {
        const id = detail.userId ?? detail.id ?? detail.user_id;
        const payload = {
          roleId: 2,
          positionId: selectedPositionId,
        };
        await updateCustomer(userInfo.token, id, payload);
        
        fetchCustomers(page, size, filters);
        setDetail({ ...detail, roleId: 2, positionId: selectedPositionId });
        setShowPromote(false);
        // SỬA: Dùng toast thay vì alert
        toast.success("Promoted to employee successfully");
      } catch (err) {
        console.error("Promote failed:", err);
        const status = err?.response?.status;
        const body = err?.response?.data;
        let bodyStr = "";
        try {
          bodyStr = typeof body === "string" ? body : JSON.stringify(body);
        } catch (e) {
          bodyStr = String(body);
        }
        // SỬA: Dùng toast thay vì alert
        toast.error(`Promote failed: ${status || "?"} - ${bodyStr || err.message}`);
      } finally {
        setPromoting(false);
      }
    };

    // SỬA: Mở modal thay vì confirm
    openConfirmModal({
      title: "Promote to Employee?",
      message: `Are you sure you want to promote ${
        detail.fullName ?? detail.userId
      } to position '${posName}'?`,
      onConfirm: doPromote,
      confirmText: "Yes, Promote",
      confirmClass: "btn-success",
    });
  };

  // focus the promote select (giữ nguyên)
  useEffect(() => {
    if (showPromote) {
      try {
        promoteSelectRef?.current?.focus?.();
      } catch (e) {}
    }
  }, [showPromote]);

  return (
    <>
      <Header />
      <main className="container mx-auto p-4">
        {/* ... (Toàn bộ JSX của Filters, Table, v.v. giữ nguyên) ... */}
        <h1 className="text-2xl font-semibold mb-4">Manage Users</h1>

        {/* Filters - always visible */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-100 rounded">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-600">Full Name</label>
              <input
                type="text"
                value={filterFullName}
                onChange={(e) => setFilterFullName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSearch();
                }}
                className="input input-sm w-full mt-1"
                placeholder="full name"
              />
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

            <div>
              <label className="text-xs text-gray-600">Role</label>
              <select
                className="select select-sm w-full mt-1"
                value={filterRoleName}
                onChange={(e) => setFilterRoleName(e.target.value)}
              >
                <option value="">- any -</option>
                {roles.map((r) => {
                  // Backend RoleDto: { roleId, name }
                  const roleName = r?.name ?? r?.roleName ?? r?.role_name ?? "";
                  const key = (r?.roleId ?? r?.id ?? roleName) || Math.random();
                  return (
                    <option key={String(key)} value={roleName}>
                      {roleName || String(key)}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center space-x-2">
            <button className="btn btn-sm btn-primary" onClick={doSearch}>
              Search
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                setFilterFullName("");
                setFilterPhone("");
                setFilterEmail("");
                setFilterRoleName("");
                fetchCustomers(0, size, {});
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Content area (loading / error / no-results / table) */}
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
          <p className="text-sm text-gray-600">No customers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>User ID</th>
                  <th>Full Name</th>
                  <th>Status</th>
                  <th>Role</th>
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
                    <td>
                      {it.role?.name ??
                        it.roleName ??
                        it.role_name ??
                        (it.role && (it.role.name || it.role)) ??
                        "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Customer detail modal */}
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
                    Users detail
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
                        className="btn btn-sm btn-error"
                        onClick={deleteCustomerHandler}
                        disabled={deleting}
                      >
                        {deleting ? "Banning..." : "Ban user"}{" "}
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 mr-2">
                          Status
                        </label>
                        <select
                          className="select select-sm"
                          value={selectedStatus ?? ""}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                          <option value="">-</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                        <button
                          className="btn btn-sm"
                          onClick={saveStatusHandler}
                          disabled={!selectedStatus}
                        >
                          Save Status
                        </button>
                      </div>

                      {!(
                        detail?.positionId ||
                        detail?.position_id ||
                        (detail?.role &&
                          (detail.role.name === "EMPLOYEE" ||
                            detail.roleName === "EMPLOYEE"))
                      ) && (
                        <div className="flex items-center gap-2">
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => setShowPromote((s) => !s)}
                          >
                            {showPromote ? "Cancel" : "Add Employee"}
                          </button>
                          {showPromote && (
                            <div className="flex items-center gap-2">
                              <select
                                ref={promoteSelectRef}
                                className="select select-sm"
                                value={selectedPositionId ?? ""}
                                onChange={(e) =>
                                  setSelectedPositionId(
                                    Number(e.target.value) || null
                                  )
                                }
                              >
                                <option value="">Select position</option>
                                {positions.map((p, idx) => {
                                  const idVal = p.positionId ?? p.id ?? idx;
                                  const label =
                                    p.positionName ??
                                    p.position_name ??
                                    p.name ??
                                    String(idVal);
                                  const val = String(idVal);
                                  return (
                                    <option key={val} value={val}>
                                      {label}
                                    </option>
                                  );
                                })}
                              </select>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={promoteToEmployeeHandler}
                                disabled={promoting || !selectedPositionId}
                              >
                                {promoting ? "Promoting..." : "Promote"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <button className="btn btn-sm" onClick={closeDetail}>
                          Close
                        </button>
                      </div>
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
                    fetchCustomers(Math.max(0, page - 1), size, filters)
                  }
                >
                  Prev
                </button>
                <button
                  className="btn btn-sm"
                  disabled={page >= totalPages - 1}
                  onClick={() =>
                    fetchCustomers(
                      Math.min(totalPages - 1, page + 1),
                      size,
                      filters
                    )
                  }
                >
                  Next
                </button>
              </div>
            </div>
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

export default Customers;