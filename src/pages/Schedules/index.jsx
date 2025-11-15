import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  getShifts,
  getEmployeeShiftsByDate,
  deleteShift,
  validateShiftConstraints,
  setShiftActive,
  removeShiftSlotForDate,
  addOpenShiftSlot,
  getPositionRules,
  getEmployees,
} from "../../utils/dataProvider/schedule";
import emptyBox from "../../assets/images/empty.svg";
import loadingImage from "../../assets/images/loading.svg";
import toast from "react-hot-toast";

function Schedules() {
  const navigate = useNavigate();
  const userInfo = useSelector((state) => state.userInfo);
  const [isLoading, setIsLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [employeeShifts, setEmployeeShifts] = useState([]);
  const [isLoadingEmployeeShifts, setIsLoadingEmployeeShifts] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [rulesByShift, setRulesByShift] = useState({});
  const location = useLocation();
  const qs = new URLSearchParams(location.search);
  const initialDateParam = qs.get("date");
  // Default to no date selected when arriving at the page (do not persist
  // previous selection). If a `date` query param is present, use it.
  const [selectedDate, setSelectedDate] = useState(initialDateParam || "");
  const [selectedShift, setSelectedShift] = useState(null);
  const [pendingShiftId, setPendingShiftId] = useState(null);
  const [highlightShiftId, setHighlightShiftId] = useState(null);
  const [constraints, setConstraints] = useState({});
  const [lastError, setLastError] = useState(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [reasonViewerText, setReasonViewerText] = useState(null);
  const [isReasonViewerOpen, setIsReasonViewerOpen] = useState(false);

  const controller = useMemo(() => new AbortController(), [selectedDate]);

  useEffect(() => {
    loadShifts();
  }, []);

  // react to query params when user navigates back from employee assignment
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const dateParam = qs.get("date");
    const sid = qs.get("shiftId");
    // If a date query param is present, use it. If not present, clear the
    // selected date so the page defaults to no selection when navigated to.
    if (dateParam) {
      if (dateParam !== selectedDate) setSelectedDate(dateParam);
    } else {
      if (selectedDate) setSelectedDate("");
    }
    if (sid) {
      const n = parseInt(sid, 10);
      if (!Number.isNaN(n)) setPendingShiftId(n);
    }
  }, [location.search]);

  useEffect(() => {
    // when date changes, clear any selected shift and constraints so we don't show stale data
    setSelectedShift(null);
    setConstraints({});
    if (selectedDate) {
      loadEmployeeShifts();
    }
  }, [selectedDate]);

  // when shifts list becomes available and we have a pendingShiftId (from query param), select it
  useEffect(() => {
    if (pendingShiftId && shifts && shifts.length > 0) {
      const s = shifts.find((x) => x.shiftId === pendingShiftId);
      if (s) {
        // Instead of opening the detail modal, scroll the shift card into view
        // and apply a temporary highlight so the user sees the correct shift.
        const el = document.getElementById(`shift-${s.shiftId}`);
        if (el && typeof el.scrollIntoView === "function") {
          try {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          } catch (err) {
            // ignore scroll errors
          }
        }
        setHighlightShiftId(s.shiftId);
        // Ensure we have the latest employee assignments when returning via link
        // (e.g. from Employee Assignment 'Back' navigation that includes shiftId)
        try {
          loadEmployeeShifts();
        } catch (err) {
          // non-fatal; loadEmployeeShifts logs errors
        }
        // If the query requested the modal to open (e.g. from timetable click), open details
        try {
          const qs2 = new URLSearchParams(location.search);
          const openFlag =
            qs2.get("open") || qs2.get("modal") || qs2.get("openShift");
          if (openFlag) {
            setSelectedShift(s);
            handleValidateConstraints(s.shiftId);
          }
        } catch (err) {
          // ignore parse errors
        }
        // clear highlight after a short delay
        setTimeout(() => setHighlightShiftId(null), 3000);
        setPendingShiftId(null);
      }
    }
  }, [pendingShiftId, shifts]);

  const loadShifts = async () => {
    try {
      setIsLoading(true);
      const response = await getShifts({}, controller);
      const list = response.data || [];
      setShifts(list);
      // by default, show only shifts that have assignments for the selected date
      if (employeeShifts && employeeShifts.length > 0) {
        const filtered = list.filter((s) =>
          employeeShifts.some((es) => es.shiftId === s.shiftId)
        );
        setAvailableShifts(filtered);
      } else {
        // no assignments yet for the selected date -> show nothing
        setAvailableShifts([]);
      }
      setLastError(null);
    } catch (err) {
      console.error("loadShifts error:", err);
      if (err?.name === "CanceledError") return;
      const msg =
        err?.response?.data?.message || err?.message || "Failed to load shifts";
      // avoid spamming toasts when polling/automatic retries happen; show one toast
      toast.error(String(msg));
      setLastError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployeeShifts = async () => {
    try {
      // clear previous data to avoid showing assignments from previous date
      setEmployeeShifts([]);
      setIsLoadingEmployeeShifts(true);
      const response = await getEmployeeShiftsByDate(selectedDate, controller);
      const empList = response.data || [];
      // load all employees so we can map employeeId -> position for counting
      let empArray = [];
      try {
        const empRes = await getEmployees(userInfo?.token, controller);
        empArray = empRes.data || [];
        setEmployees(empArray);
      } catch (e) {
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
      // load position rules for known shifts so we can show per-position counts
      try {
        const pairs = await Promise.all(
          (shifts || []).map(async (s) => {
            try {
              const rr = await getPositionRules(s.shiftId, controller);
              return [s.shiftId, rr?.data || []];
            } catch (e) {
              return [s.shiftId, []];
            }
          })
        );
        const map = {};
        pairs.forEach(([k, v]) => (map[k] = v));
        setRulesByShift(map);
      } catch (e) {
        setRulesByShift({});
      }
      // filter available shifts to only those that have assignments on this date
      if (shifts && shifts.length > 0) {
        const filtered = shifts.filter((s) =>
          empList.some((es) => es.shiftId === s.shiftId)
        );
        setAvailableShifts(filtered);
      } else {
        setAvailableShifts([]);
      }
      setLastError(null);
    } catch (err) {
      console.error("loadEmployeeShifts error:", err);
      if (err?.name === "CanceledError") return;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load employee shifts";
      toast.error(String(msg));
      setLastError(err);
    } finally {
      setIsLoadingEmployeeShifts(false);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm("Are you sure you want to delete this shift?")) return;

    try {
      await deleteShift(shiftId, userInfo.token, controller);
      toast.success("Shift deleted successfully");
      loadShifts();
    } catch (err) {
      toast.error("Failed to delete shift");
    }
  };

  const handleValidateConstraints = async (shiftId) => {
    try {
      const response = await validateShiftConstraints(
        selectedDate,
        shiftId,
        controller
      );
      setConstraints(response.data);
    } catch (err) {
      toast.error("Failed to validate constraints");
    }
  };

  const getEmployeeCountByPosition = (shiftId, positionName) => {
    // Count how many assigned employees for shiftId have the given position.
    const list = employeeShifts.filter((es) => es.shiftId === shiftId);
    if (!list.length) return 0;
    // map employeeId -> employee object (from employees state)
    let count = 0;
    list.forEach((es) => {
      const emp = employees.find((e) => e.userId === es.employeeId);
      const pos = emp ? emp.position || emp.positionName : null;
      if (pos && pos === positionName) count++;
    });
    return count;
  };

  const computeStatusForDate = (dateStr, shift) => {
    const today = dayjs().format("YYYY-MM-DD");
    // If there is an employeeShift for this shift on the selected date and it is canceled,
    // surface canceled state so UI can mark it and disable actions.
    const hasCanceled = (employeeShifts || []).some(
      (e) =>
        String(e.shiftId) === String(shift.shiftId) &&
        ((e.status || "").toLowerCase() === "canceled" ||
          (e.status || "").toLowerCase() === "cancelled")
    );
    if (hasCanceled) return "canceled";

    if (dateStr < today) return "past";
    if (dateStr > today) return "future";
    // same day -> compare time
    const now = dayjs();
    const start = dayjs(`${today}T${shift.startTime}`);
    const end = dayjs(`${today}T${shift.endTime}`);
    if (now.isBefore(start)) return "future";
    if (now.isAfter(end)) return "past";
    return "active";
  };

  const computeDelayMinutes = (es, fallbackStartTime) => {
    // Support multiple possible field names returned by backend
    const actual =
      es.actualCheckIn || es.actual_check_in || es.actual_checkin || null;
    let overrideT =
      es.overrideStartTime ||
      es.override_start_time ||
      es.overrideStart ||
      null;
    // If no override provided on the assignment, fall back to the shift's scheduled start time
    if (!overrideT && fallbackStartTime) overrideT = fallbackStartTime;
    const dateStr = es.shiftDate || selectedDate || null;
    if (!actual || !overrideT) return null;
    try {
      // We only compare time-of-day. Extract minutes since midnight for actual check-in and for override/start.
      const a = dayjs(actual);
      if (!a.isValid()) return null;
      const actualMins = a.hour() * 60 + a.minute();

      // parse override/start time like "HH:mm[:ss]"
      const parts = (overrideT || "").split(":");
      const sh = parseInt(parts[0] || "0", 10) || 0;
      const sm = parseInt(parts[1] || "0", 10) || 0;
      const startMins = sh * 60 + sm;

      // We want late check-in to show negative value per your request: return (start - actual)
      const diff = startMins - actualMins;
      return diff;
    } catch (e) {
      return null;
    }
  };

  const formatMinutes = (mins) => {
    if (mins == null) return "-";
    const sign = mins >= 0 ? "" : "-";
    const m = Math.abs(mins);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    if (h > 0) return `${sign}${h}h ${mm}m`;
    return `${sign}${mm}m`;
  };

  const openReasonViewer = (text) => {
    setReasonViewerText(text || "");
    setIsReasonViewerOpen(true);
  };

  const renderShiftCard = (shift) => {
    const totalAssigned = employeeShifts.filter(
      (es) => es.shiftId === shift.shiftId
    ).length;
    const status = computeStatusForDate(selectedDate, shift);

    // stronger visual styles per status: past (muted gray), active (amber strong),
    // canceled (amber with left accent), future (green gentle)
    // add a left-accent and hover transform for clearer visual affordance
    const cardBase =
      "card shadow-lg transition-transform duration-150 ease-in-out hover:scale-102";
    const cardStyle =
      status === "past"
        ? `${cardBase} bg-gray-100 border-l-4 border-gray-300`
        : status === "canceled"
        ? `${cardBase} bg-red-100 border-l-4 border-red-600`
        : status === "active"
        ? `${cardBase} bg-amber-200 border-l-4 border-amber-400`
        : `${cardBase} bg-green-100 border-l-4 border-green-300`;

    const isHighlighted = highlightShiftId === shift.shiftId;

    return (
      <div
        id={`shift-${shift.shiftId}`}
        key={shift.shiftId}
        className={cardStyle + (isHighlighted ? " ring-4 ring-indigo-300" : "")}
      >
        <div className="card-body">
          <h2 className="card-title">{shift.shiftName}</h2>
          <p className="text-sm text-gray-600">
            {shift.startTime} - {shift.endTime}
          </p>
          <div className="text-xs">
            {status === "past" && (
              <span className="badge badge-ghost">Past — read-only</span>
            )}
            {status === "active" && (
              <span className="badge badge-warning">Active</span>
            )}
            {status === "future" && (
              <span className="badge badge-success">Future</span>
            )}
            {status === "canceled" && (
              <span className="badge badge-error badge-outline">Canceled</span>
            )}
          </div>
          {shift.description && <p className="text-sm">{shift.description}</p>}

          {status === "canceled" && (
            <div className="mt-2 p-2 bg-red-100 border-l-4 border-red-600 text-sm text-red-800">
              <strong className="mr-2">Notice:</strong>
              There is an employee requesting to cancel the shift.
            </div>
          )}

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Staff Assignment:</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Total Assigned:</span>
                <span className="badge badge-outline">{totalAssigned}</span>
              </div>
              {/* show per-position required and current counts if rules are available */}
              {Array.isArray(rulesByShift[shift.shiftId]) &&
                rulesByShift[shift.shiftId].length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm font-medium mb-1">Positions</div>
                    <div className="flex flex-wrap gap-2">
                      {rulesByShift[shift.shiftId]
                        .filter(
                          (r) => r.isAllowed && (r.requiredCount || 0) > 0
                        )
                        .map((r) => {
                          const cur = getEmployeeCountByPosition(
                            shift.shiftId,
                            r.positionName
                          );
                          return (
                            <span
                              key={`${shift.shiftId}-${r.positionId}`}
                              className={`badge badge-lg ${
                                cur >= (r.requiredCount || 0)
                                  ? "badge-success"
                                  : "badge-outline"
                              }`}
                            >
                              {r.positionName}: {cur}/{r.requiredCount || 0}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                )}
            </div>
          </div>

          <div className="card-actions justify-between mt-4">
            <div className="flex gap-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setSelectedShift(shift);
                  handleValidateConstraints(shift.shiftId);
                }}
              >
                View Details
              </button>
              <button
                className="btn btn-secondary btn-sm"
                // allow adding employees for future, active or canceled occurrences; only forbid for past
                disabled={status === "past"}
                title={status === "past" ? "Shift ended, cannot edit" : ""}
                onClick={() =>
                  navigate(
                    `/admin/schedules/${
                      shift.shiftId
                    }/employees?date=${encodeURIComponent(selectedDate)}`
                  )
                }
              >
                Add Employees
              </button>
              <button
                className="btn btn-error btn-sm"
                disabled={status === "past"}
                title={
                  status === "past"
                    ? "Cannot remove past shift"
                    : "Remove shift for this date (does not affect other dates)"
                }
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Remove shift for this date? All assignments will be cancelled."
                    )
                  )
                    return;
                  try {
                    const res = await removeShiftSlotForDate(
                      selectedDate,
                      shift.shiftId,
                      userInfo.token,
                      controller
                    );
                    // backend returns { canceled: true } when current active occurrence is canceled
                    if (res?.data?.canceled) {
                      toast.success("Shift occurrence canceled (in-progress)");
                    } else if (res?.data?.removed) {
                      toast.success("Shift removed for this date");
                    } else {
                      toast.success("Operation completed");
                    }
                    await loadEmployeeShifts();
                  } catch (e) {
                    const msg =
                      e?.response?.data?.error ||
                      e?.response?.data?.message ||
                      e?.message ||
                      "Failed to remove shift for this date";
                    toast.error(msg);
                  }
                }}
              >
                REMOVE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Header />

      <div className="min-h-screen bg-base-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1
              role="button"
              tabIndex={0}
              title="Open Weekly Timetable"
              onClick={() => navigate(`/admin/timetable`)}
              onKeyDown={(e) =>
                e.key === "Enter" && navigate(`/admin/timetable`)
              }
              className="text-3xl font-bold cursor-pointer"
            >
              Schedule Management
            </h1>
            <div className="flex gap-4">
              <input
                type="date"
                className="input input-bordered"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/admin/schedules/new`)}
              >
                Create New Shift
              </button>
              <button className="btn" onClick={() => setIsAddModalOpen(true)}>
                Add Shift to this day
              </button>
              {/* Weekly Timetable navigation moved to clickable page title */}
              <button
                className="btn"
                onClick={() => navigate(`/admin/recurrence-patterns`)}
              >
                Recurrence Patterns
              </button>
              <button
                className="btn"
                onClick={() => navigate(`/admin/schedules/generate`)}
              >
                Generation schedules
              </button>
              {/* Generate From Pattern button removed per request */}
              <button className="btn" onClick={() => navigate(`/admin/shifts`)}>
                All Shifts
              </button>
              {/* Copy assignments button removed for cleanup */}
            </div>
          </div>

          {isLoading || isLoadingEmployeeShifts ? (
            <div className="flex justify-center items-center h-64">
              <img src={loadingImage} alt="Loading" className="w-16 h-16" />
            </div>
          ) : availableShifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <img src={emptyBox} alt="No shifts" className="w-24 h-24 mb-4" />
              <p className="text-lg text-gray-600">
                No shifts for the selected date
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableShifts.map(renderShiftCard)}
            </div>
          )}

          {lastError && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 text-sm text-red-700">
              <div className="font-semibold mb-1">
                Error details (for debugging):
              </div>
              <pre className="whitespace-pre-wrap break-words text-xs">
                {JSON.stringify(
                  lastError?.response?.data || lastError?.message || lastError
                )}
              </pre>
            </div>
          )}

          {selectedShift && (
            <div className="modal modal-open">
              <div className="modal-box">
                <h3 className="font-bold text-lg mb-4">
                  Shift Details - {selectedShift.shiftName}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="label">
                      <span className="label-text">Time</span>
                    </label>
                    <p>
                      {selectedShift.startTime} - {selectedShift.endTime}
                    </p>
                    {/* show shift description and metadata */}
                    {selectedShift.description && (
                      <div className="mt-2">
                        <div className="text-sm font-medium">Description</div>
                        <p className="text-sm text-gray-700">
                          {selectedShift.description}
                        </p>
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                      <div>ID: {selectedShift.shiftId}</div>
                      <div>
                        Status:{" "}
                        {selectedShift.isActive ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge">Inactive</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Assigned employees list: show names + positions */}
                  <div>
                    <div className="text-sm font-medium mb-1">
                      Assigned Employees
                    </div>
                    <div className="max-h-48 overflow-auto border rounded">
                      <table className="table w-full">
                        <thead>
                          <tr>
                            <th className="text-left sticky top-0 bg-white z-10">
                              Name
                            </th>
                            <th className="text-left sticky top-0 bg-white z-10">
                              Position
                            </th>
                            <th className="text-left sticky top-0 bg-white z-10">
                              Status
                            </th>
                            <th className="text-left sticky top-0 bg-white z-10">
                              Delay
                            </th>
                            <th className="text-left sticky top-0 bg-white z-10">
                              Overtime
                            </th>
                            <th className="text-left sticky top-0 bg-white z-10">
                              Reason
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(employeeShifts || [])
                            .filter(
                              (es) => es.shiftId === selectedShift.shiftId
                            )
                            .map((es) => {
                              const emp = employees.find(
                                (e) =>
                                  String(e.userId) === String(es.employeeId)
                              );
                              const name =
                                es.employeeName ||
                                (emp && (emp.fullName || emp.username)) ||
                                `#${es.employeeId}`;
                              const pos =
                                es.employeePositionName ||
                                (emp &&
                                  (emp.position?.positionName ||
                                    emp.position ||
                                    emp.positionName)) ||
                                "No Position";
                              const delayMins = computeDelayMinutes(
                                es,
                                selectedShift.startTime
                              );
                              const overtime =
                                es.overtimeMinutes ||
                                es.overtime_minutes ||
                                null;
                              return (
                                <tr
                                  key={
                                    es.employeeShiftId ||
                                    `${selectedShift.shiftId}-${es.employeeId}`
                                  }
                                >
                                  <td className="py-2">{name}</td>
                                  <td className="py-2">{pos}</td>
                                  <td className="py-2">
                                    {es.status || "assigned"}
                                  </td>
                                  <td className="py-2">
                                    {formatMinutes(delayMins)}
                                  </td>
                                  <td className="py-2">
                                    {overtime != null
                                      ? overtime > 0
                                        ? `+${formatMinutes(overtime)}`
                                        : formatMinutes(overtime)
                                      : "-"}
                                  </td>
                                  <td className="py-2">
                                    {es.reason ? (
                                      <button
                                        className="btn btn-ghost btn-xs"
                                        onClick={() =>
                                          openReasonViewer(es.reason)
                                        }
                                      >
                                        View
                                      </button>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* show per-position required/current counts in the modal too */}
                  {Array.isArray(rulesByShift[selectedShift.shiftId]) &&
                    rulesByShift[selectedShift.shiftId].length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-1">
                          Positions
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {rulesByShift[selectedShift.shiftId]
                            .filter(
                              (r) => r.isAllowed && (r.requiredCount || 0) > 0
                            )
                            .map((r) => {
                              const cur = getEmployeeCountByPosition(
                                selectedShift.shiftId,
                                r.positionName
                              );
                              return (
                                <span
                                  key={`modal-${selectedShift.shiftId}-${r.positionId}`}
                                  className={`badge badge-md ${
                                    cur >= (r.requiredCount || 0)
                                      ? "badge-success"
                                      : "badge-outline"
                                  }`}
                                >
                                  {r.positionName}: {cur}/{r.requiredCount || 0}
                                </span>
                              );
                            })}
                        </div>
                      </div>
                    )}

                  {constraints.message && (
                    <div className="alert alert-info">
                      <span>{constraints.message}</span>
                    </div>
                  )}
                </div>
                <div className="modal-action">
                  <button
                    className="btn"
                    onClick={() => setSelectedShift(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
      {/* CopyAssignmentsModal removed as part of cleanup */}

      {isReasonViewerOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-2">Reason</h3>
            <div className="prose max-h-64 overflow-auto mb-4">
              <p>{reasonViewerText || "(no reason provided)"}</p>
            </div>
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => {
                  setIsReasonViewerOpen(false);
                  setReasonViewerText(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              Add Shift to {selectedDate}
            </h3>
            <div className="max-h-72 overflow-auto space-y-2">
              {shifts.map((s) => {
                const alreadyOnDate = employeeShifts.some(
                  (es) => es.shiftId === s.shiftId
                );
                const sStatus = computeStatusForDate(selectedDate, s);
                return (
                  <div
                    key={s.shiftId}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <div className="font-medium">{s.shiftName}</div>
                      <div className="text-xs text-gray-600">
                        {s.startTime} - {s.endTime}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {alreadyOnDate ? (
                        // Allow remove for future shifts and active (will cancel current occurrence)
                        sStatus === "future" || sStatus === "active" ? (
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={async () => {
                              try {
                                const res = await removeShiftSlotForDate(
                                  selectedDate,
                                  s.shiftId,
                                  userInfo.token,
                                  controller
                                );
                                if (res?.data?.canceled) {
                                  toast.success(
                                    "Shift occurrence canceled (in-progress)"
                                  );
                                } else if (res?.data?.removed) {
                                  toast.success("Removed shift from this day");
                                } else {
                                  toast.success("Operation completed");
                                }
                                loadEmployeeShifts();
                              } catch (e) {
                                const msg =
                                  e?.response?.data?.error ||
                                  e?.response?.data?.message ||
                                  e?.message ||
                                  "Failed to remove shift";
                                toast.error(msg);
                              }
                            }}
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-ghost"
                            disabled
                            title={
                              sStatus === "past"
                                ? "Cannot remove past shift"
                                : "Cannot remove running shift"
                            }
                          >
                            Remove
                          </button>
                        )
                      ) : (
                        <button
                          className="btn btn-sm"
                          onClick={async () => {
                            try {
                              await addOpenShiftSlot(
                                selectedDate,
                                s.shiftId,
                                userInfo.token,
                                controller
                              );
                              toast.success("Shift added to this day");
                              loadEmployeeShifts();
                            } catch (e) {
                              toast.error(
                                e?.response?.data?.message ||
                                  "Failed to add shift"
                              );
                            }
                          }}
                          disabled={sStatus !== "future"}
                          title={
                            sStatus !== "future"
                              ? sStatus === "past"
                                ? "Cannot add shift to past date"
                                : "Cannot add shift during active time"
                              : ""
                          }
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setIsAddModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Schedules;
