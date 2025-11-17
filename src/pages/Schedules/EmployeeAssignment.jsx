import React, { useEffect, useState, useMemo } from "react"; // Thêm useMemo
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  getEmployeeShiftsByShiftAndDate,
  addEmployeeToShift,
  removeEmployeeFromShift,
  validateShiftConstraints,
  getPositionRules,
  getEmployees,
} from "../../utils/dataProvider/schedule";
import toast from "react-hot-toast";
import dayjs from "dayjs";

function EmployeeAssignment() {
  const navigate = useNavigate();
  const { shiftId } = useParams();
  const userInfo = useSelector((state) => state.userInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const location = useLocation();
  // read ?date=YYYY-MM-DD from query string; fallback to today
  const qs = new URLSearchParams(location.search);
  const initialDate = qs.get("date") || dayjs().format("YYYY-MM-DD");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [employeeShifts, setEmployeeShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [positionRules, setPositionRules] = useState([]);
  const [constraints, setConstraints] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [notes, setNotes] = useState("");

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

  // Thêm controller (dù không dùng nhiều, nhưng là good practice)
  const controller = useMemo(() => new AbortController(), [shiftId, selectedDate]);

  useEffect(() => {
    loadData();
    // Thêm cleanup
    return () => {
      controller.abort();
    }
  }, [shiftId, selectedDate, controller]); // Thêm controller vào dependencies

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

  const loadData = async () => {
    try {
      setIsLoadingData(true);

      // Load employee shifts for the selected date and shift
      const shiftsResponse = await getEmployeeShiftsByShiftAndDate(
        selectedDate,
        shiftId,
        controller.signal // Pass signal
      );
      const empList = shiftsResponse.data || [];

      // Load all employees (admin endpoint requires token)
      let empArray = [];
      try {
        const employeesResponse = await getEmployees(userInfo?.token, controller.signal);
        empArray = employeesResponse.data || [];
        setEmployees(empArray);
      } catch (e) {
        if (e.name === 'CanceledError') return;
        empArray = [];
        setEmployees([]);
      }

      // Enrich employeeShift entries with employeeName and employeePositionName when possible
      const enriched = (empList || []).map((es) => {
        const emp = empArray.find(
          (e) => String(e.userId) === String(es.employeeId)
        );
        const employeeName =
          es.employeeName || (emp && (emp.fullName || emp.username)) || null;
        const employeePositionName =
          es.employeePositionName ||
          (emp &&
            (emp.position?.positionName || emp.position || emp.positionName)) ||
          null;
        return { ...es, employeeName, employeePositionName };
      });
      setEmployeeShifts(enriched);

      // Load position rules for this shift so we can show required counts
      try {
        const pr = await getPositionRules(shiftId, controller.signal);
        setPositionRules(pr?.data || []);
      } catch (e) {
        if (e.name === 'CanceledError') return;
        setPositionRules([]);
      }

      // Validate constraints
      const constraintsResponse = await validateShiftConstraints(
        selectedDate,
        shiftId,
        controller.signal
      );
      setConstraints(constraintsResponse.data);
    } catch (err) {
      if (err.name === 'CanceledError') return; // Bỏ qua lỗi do hủy request
      console.error("loadData error:", err);
      let msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Failed to load data";
      try {
        if (typeof msg === "object") msg = JSON.stringify(msg);
      } catch (e) {}
      toast.error(String(msg));
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        employeeId: parseInt(selectedEmployee),
        shiftId: parseInt(shiftId),
        shiftDate: selectedDate,
        notes: notes,
      };
      console.debug("Adding employee to shift", {
        payload,
        token: userInfo.token,
      });

      const res = await addEmployeeToShift(payload, userInfo.token);
      // Use server-provided info when available to update UI immediately
      if (
        res?.data &&
        (res.data.created === true || res.data.employeeShiftId)
      ) {
        const newId = res.data.employeeShiftId || null;
        const empName = res.data.employeeName || null;
        const empPosName = res.data.employeePositionName || null;
        // fallback to local employees list if server didn't provide fields
        const empObj = employees.find(
          (e) => String(e.userId) === String(payload.employeeId)
        );
        const newEntry = {
          employeeShiftId: newId,
          employeeId: payload.employeeId,
          employeeName:
            empName || (empObj ? empObj.fullName || empObj.username || "" : ""),
          employeePositionName:
            empPosName ||
            (empObj &&
              (empObj.position?.positionName ||
                empObj.position ||
                empObj.positionName)) ||
            null,
          status: "assigned",
        };
        setEmployeeShifts((prev) => {
          const idx = prev.findIndex(
            (es) => String(es.employeeShiftId) === String(newId)
          );
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...newEntry };
            return copy;
          }
          return [...prev, newEntry];
        });
      }

      toast.success("Employee added to shift successfully");
      setSelectedEmployee("");
      setNotes("");
    } catch (err) {
      console.error("Failed to add employee to shift:", err);
      let serverMessage =
        err?.response?.data?.message ?? err?.response?.data ?? err?.message;
      if (typeof serverMessage === "object") {
        try {
          serverMessage = JSON.stringify(serverMessage);
        } catch (e) {
          serverMessage = String(serverMessage);
        }
      }
      toast.error(serverMessage || "Failed to add employee to shift");
    } finally {
      setIsLoading(false);
    }
  };

  // --- HÀM ĐÃ CẬP NHẬT: handleRemoveEmployee ---
  const handleRemoveEmployee = async (employeeShiftId) => {
    // 1. Tách logic xóa ra
    const doRemove = async () => {
      try {
        await removeEmployeeFromShift(employeeShiftId, userInfo.token);
        toast.success("Employee removed from shift successfully");
        loadData();
      } catch (err) {
        toast.error("Failed to remove employee from shift");
      }
    };

    // 2. Mở modal để xác nhận
    openConfirmModal({
      title: "Remove Employee?",
      message: "Are you sure you want to remove this employee from the shift?",
      onConfirm: doRemove,
      confirmText: "Yes, Remove",
      confirmClass: "btn-error",
    });
  };

  const getPositionCounts = () => {
    // ... (code giữ nguyên)
    const counts = {};
    const normalize = (s) => (s || "").toString().trim().toLowerCase();
    employeeShifts.forEach((es) => {
      let pos = es.employeePositionName || null;
      if (!pos) {
        const employee = employees.find(
          (emp) => String(emp.userId) === String(es.employeeId)
        );
        if (!employee) return;
        if (typeof employee.position === "string") pos = employee.position;
        else if (employee.position && employee.position.positionName)
          pos = employee.position.positionName;
      }
      if (!pos) return;
      const key = normalize(pos);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  };

  const getAvailableEmployees = () => {
    // ... (code giữ nguyên)
    const assignedEmployeeIds = employeeShifts.map((es) =>
      String(es.employeeId)
    );
    return employees.filter(
      (emp) => !assignedEmployeeIds.includes(String(emp.userId))
    );
  };

  const positionCounts = getPositionCounts();
  const availableEmployees = getAvailableEmployees();
  const normalizePos = (s) => (s || "").toString().trim().toLowerCase();

  const requiredByPosition = (positionRules || []).reduce((acc, r) => {
    // ... (code giữ nguyên)
    if (r && r.positionName)
      acc[normalizePos(r.positionName)] = r.requiredCount || 0;
    return acc;
  }, {});

  const isSelectedAtCapacity = () => {
    // ... (code giữ nguyên)
    if (!selectedEmployee) return false;
    const emp = employees.find(
      (e) => String(e.userId) === String(selectedEmployee)
    );
    if (!emp || !emp.position) return false;
    const posName =
      emp.position.positionName || emp.position || emp.positionName;
    const norm = normalizePos(posName);
    if (requiredByPosition && requiredByPosition[norm] != null) {
      const req = requiredByPosition[norm] || 0;
      const curLocal = positionCounts[norm] || 0;
      return curLocal >= req;
    }
    if (constraints && Array.isArray(constraints.positions)) {
      const rule = constraints.positions.find(
        (p) => p.positionName === posName
      );
      if (rule) {
        const cur = rule.currentCount || 0;
        const req = rule.requiredCount || 0;
        return cur >= req;
      }
    }
    return false;
  };

  if (isLoadingData) {
    // ... (code giữ nguyên)
    return (
      <>
        <Header />
        <div className="min-h-screen bg-base-200 flex items-center justify-center">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <div className="min-h-screen bg-base-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Employee Assignment</h1>
            <button
              className="btn btn-ghost"
              onClick={() =>
                navigate(
                  `/admin/schedules?date=${encodeURIComponent(
                    selectedDate
                  )}&shiftId=${encodeURIComponent(shiftId)}`
                )
              }
            >
              Back to Schedules
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Current Assignment */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">Current Assignment</h2>

                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Date</span>
                  </label>
                  <div className="bg-base-100">
                    <span className="text-lg font-medium">{selectedDate}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Position Requirements:</h3>
                  <div className="space-y-2">
                    {positionRules && positionRules.length > 0 ? (
                      positionRules
                        .filter(
                          (r) => r.isAllowed && (r.requiredCount || 0) > 0
                        )
                        .map((r) => {
                          const key = normalizePos(r.positionName);
                          const cur = positionCounts[key] || 0;
                          const req = r.requiredCount || 0;
                          const met = cur >= req;
                          const need = Math.max(0, req - cur);
                          const badgeClass = met
                            ? "badge-success"
                            : cur === 0
                            ? "badge-error"
                            : "badge-warning";
                          return (
                            <div
                              className="flex justify-between items-center"
                              key={r.positionId}
                            >
                              <div>
                                <span className="font-medium">
                                  {r.positionName}
                                </span>
                                <div className="text-xs text-gray-500">
                                  {need > 0
                                    ? `Need ${need} more to fill this position`
                                    : met
                                    ? "Requirement met"
                                    : ""}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`badge ${badgeClass}`}>
                                  {cur}/{req}
                                </span>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="text-sm text-gray-500">
                        No position rules configured for this shift
                      </div>
                    )}
                  </div>
                </div>

                {constraints.message && (
                  <div className="alert alert-info mb-4">
                    <span>{constraints.message}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-semibold">Assigned Employees:</h3>
                  {employeeShifts.length === 0 ? (
                    <p className="text-gray-500">No employees assigned</p>
                  ) : (
                    employeeShifts.map((es) => {
                      const employee = employees.find(
                        (emp) => emp.userId === es.employeeId
                      );
                      return (
                        <div
                          key={es.employeeShiftId}
                          className="flex justify-between items-center p-2 bg-base-200 rounded"
                        >
                          <div>
                            <span className="font-medium">
                              {es.employeeName}
                            </span>
                            <span className="text-sm text-gray-600 ml-2">
                              (
                              {es.employeePositionName ||
                                (employee &&
                                  (employee.position?.positionName ||
                                    employee.position ||
                                    employee.positionName)) ||
                                "No Position"}
                              )
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="badge badge-outline">
                              {es.status}
                            </span>
                            <button
                              className="btn btn-error btn-xs"
                              onClick={() =>
                                handleRemoveEmployee(es.employeeShiftId)
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Add Employee */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">Add Employee to Shift</h2>

                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Select Employee</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                  >
                    <option value="">Choose an employee</option>
                    {availableEmployees.map((emp) => {
                      const posLabel =
                        emp?.position?.positionName ||
                        emp.position ||
                        emp.positionName ||
                        "No Position";
                      const normLabel = normalizePos(posLabel);
                      const cur = positionCounts[normLabel] || 0;
                      const req =
                        requiredByPosition[normLabel] != null
                          ? requiredByPosition[normLabel]
                          : constraints?.requiredByPosition?.[normLabel] ??
                            null;
                      const wouldExceed =
                        req != null && req !== undefined ? cur >= req : false;
                      return (
                        <option
                          key={emp.userId}
                          value={emp.userId}
                          disabled={wouldExceed}
                          title={
                            wouldExceed
                              ? `${posLabel} is full (${cur}/${req})`
                              : ""
                          }
                        >
                          {emp.fullName} - {posLabel}
                          {wouldExceed ? " (full)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Notes (Optional)</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this assignment"
                    rows={3}
                  />
                </div>

                <div className="card-actions justify-end">
                  <button
                    className="btn btn-primary"
                    onClick={handleAddEmployee}
                    disabled={
                      isLoading || !selectedEmployee || isSelectedAtCapacity()
                    }
                    title={
                      isSelectedAtCapacity()
                        ? "Position capacity reached for selected employee"
                        : ""
                    }
                  >
                    {isLoading ? "Adding..." : "Add Employee"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
}

export default EmployeeAssignment;