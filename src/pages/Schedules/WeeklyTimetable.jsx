import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  getShifts,
  getEmployeeShiftsByDate,
  getEmployees,
  getPositionRules,
} from "../../utils/dataProvider/schedule";
import toast from "react-hot-toast";

// Simple weekly timetable showing Morning/Afternoon/Evening slots per day
const SLOTS = [
  { id: "morning", label: "Morning", from: 6, to: 12 },
  { id: "afternoon", label: "Afternoon", from: 12, to: 18 },
  { id: "evening", label: "Evening", from: 18, to: 24 },
];

function WeeklyTimetable() {
  const userInfo = useSelector((s) => s.userInfo);
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => dayjs().startOf("week"));
  const controller = useMemo(() => new AbortController(), [weekStart]);

  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [grid, setGrid] = useState({}); // dateStr -> slotId -> [entries]
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(null);
  const [modalEmployeeShifts, setModalEmployeeShifts] = useState([]);
  const [modalRules, setModalRules] = useState([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [weekStart]);

  const getWeekDates = () => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      arr.push(weekStart.add(i, "day"));
    }
    return arr;
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [shiftRes, empRes] = await Promise.all([
        getShifts({}, controller),
        getEmployees(userInfo?.token, controller),
      ]);
      const shiftsArr = shiftRes?.data || [];
      const empArr = empRes?.data || [];
      setShifts(shiftsArr);
      setEmployees(empArr);

      // for each date in the week, fetch employee shifts and bucket into slots
      const dates = getWeekDates();
      const results = await Promise.all(
        dates.map((d) =>
          getEmployeeShiftsByDate(d.format("YYYY-MM-DD"), controller)
        )
      );

      const newGrid = {};
      for (let i = 0; i < dates.length; i++) {
        const dateStr = dates[i].format("YYYY-MM-DD");
        const list = results[i]?.data || [];
        // enrich with names/positions
        const enriched = list.map((es) => {
          const emp = empArr.find(
            (e) => String(e.userId) === String(es.employeeId)
          );
          const employeeName =
            es.employeeName || (emp && (emp.fullName || emp.username)) || null;
          const employeePositionName =
            es.employeePositionName ||
            (emp &&
              (emp.position?.positionName ||
                emp.position ||
                emp.positionName)) ||
            null;
          return { ...es, employeeName, employeePositionName };
        });

        // bucket into slots by shift start time (we need shift metadata)
        const slotMap = {};
        SLOTS.forEach((s) => (slotMap[s.id] = []));
        enriched.forEach((es) => {
          const sh = shiftsArr.find((s) => s.shiftId === es.shiftId) || null;
          let hour = null;
          if (sh && sh.startTime) {
            // assume startTime like HH:mm
            const parts = (sh.startTime || "").split(":");
            hour = parseInt(parts[0], 10);
            if (Number.isNaN(hour)) hour = null;
          }
          let target = "evening";
          if (hour != null) {
            if (hour >= 6 && hour < 12) target = "morning";
            else if (hour >= 12 && hour < 18) target = "afternoon";
            else target = "evening";
          }
          slotMap[target].push({ ...es, shift: sh });
        });

        newGrid[dateStr] = slotMap;
      }
      setGrid(newGrid);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load timetable data");
    } finally {
      setIsLoading(false);
    }
  };

  const nextWeek = () => setWeekStart((w) => w.add(7, "day"));
  const prevWeek = () => {
    const candidate = weekStart.subtract(7, "day");
    // don't allow navigating to past weeks before current week
    if (candidate.isBefore(dayjs().startOf("week"))) return;
    setWeekStart(candidate);
  };

  const dates = getWeekDates();

  const computeStatusForDateShift = (dateStr, shift) => {
    const today = dayjs().format("YYYY-MM-DD");
    if (dateStr < today) return "past";
    if (dateStr > today) return "future";
    // same day -> compare time
    const now = dayjs();
    if (!shift || !shift.startTime || !shift.endTime) return "future";
    const start = dayjs(`${dateStr}T${shift.startTime}`);
    const end = dayjs(`${dateStr}T${shift.endTime}`);
    if (now.isBefore(start)) return "future";
    if (now.isAfter(end)) return "past";
    return "active";
  };

  const computeDelayMinutes = (es, dateStr) => {
    const actual =
      es.actualCheckIn || es.actual_check_in || es.actualCheckin || null;
    const overrideT =
      es.overrideStartTime ||
      es.override_start_time ||
      es.overrideStart ||
      null;
    const dStr = dateStr || es.shiftDate || selectedShift?.__date || null;
    if (!actual || !overrideT || !dStr) return null;
    try {
      const a = dayjs(actual);
      const overrideDT = dayjs(`${dStr}T${overrideT}`);
      if (!a.isValid() || !overrideDT.isValid()) return null;
      return a.diff(overrideDT, "minute");
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

  const [reasonViewerText, setReasonViewerText] = useState(null);
  const [isReasonViewerOpen, setIsReasonViewerOpen] = useState(false);
  const openReasonViewer = (text) => {
    setReasonViewerText(text || "");
    setIsReasonViewerOpen(true);
  };

  const openShiftDetails = async (dateStr, shift) => {
    if (!shift) return;
    setSelectedShift({ ...shift, __date: dateStr });
    setIsModalLoading(true);
    try {
      const res = await getEmployeeShiftsByDate(dateStr, controller);
      const list = res?.data || [];
      // filter for the shift and enrich with employee names/positions
      const filtered = list.filter((es) => es.shiftId === shift.shiftId);
      const enriched = filtered.map((es) => {
        const emp = employees.find(
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
      setModalEmployeeShifts(enriched);

      // load position rules for this shift
      try {
        const rr = await getPositionRules(shift.shiftId, controller);
        setModalRules(rr?.data || []);
      } catch (err) {
        setModalRules([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load shift details");
      setModalEmployeeShifts([]);
      setModalRules([]);
    } finally {
      setIsModalLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-base-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Weekly Timetable</h1>
              <p className="text-sm text-gray-500">Current & future weeks</p>
            </div>
            <div className="flex gap-2 items-center">
              <button className="btn" onClick={() => navigate(-1)}>
                Back
              </button>
              <button className="btn" onClick={prevWeek}>
                Previous
              </button>
              <button className="btn btn-primary" onClick={nextWeek}>
                Next
              </button>
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="table table-compact w-full">
              <thead>
                <tr>
                  <th className="w-36">Slot / Day</th>
                  {dates.map((d) => (
                    <th key={d.format("YYYY-MM-DD")}>
                      {d.format("ddd DD/MM")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot) => (
                  <tr key={slot.id} className="align-top">
                    <td className="font-medium">{slot.label}</td>
                    {dates.map((d) => {
                      const ds = d.format("YYYY-MM-DD");
                      const cell = grid[ds] ? grid[ds][slot.id] || [] : [];
                      return (
                        <td key={`${ds}-${slot.id}`}>
                          {isLoading ? (
                            <div className="text-sm text-gray-400">
                              Loading...
                            </div>
                          ) : cell.length === 0 ? (
                            <div className="text-sm text-gray-400">-</div>
                          ) : (
                            <div className="space-y-2">
                              {
                                // Group entries by shiftId so each shift is shown once per cell
                                (function () {
                                  const map = {};
                                  cell.forEach((e) => {
                                    const id =
                                      (e.shift && e.shift.shiftId) ||
                                      e.shiftId ||
                                      "unknown";
                                    if (!map[id])
                                      map[id] = { shift: e.shift, entries: [] };
                                    map[id].entries.push(e);
                                  });
                                  const groups = Object.values(map);
                                  return groups.map((g, gi) => {
                                    const sh =
                                      g.shift ||
                                      shifts.find(
                                        (s) =>
                                          s.shiftId ===
                                          (g.entries[0] && g.entries[0].shiftId)
                                      ) ||
                                      {};
                                    // if any entry for this shift group is canceled, mark canceled
                                    const hasCanceled = (g.entries || []).some(
                                      (ent) =>
                                        (ent.status || "").toLowerCase() ===
                                          "canceled" ||
                                        (ent.status || "").toLowerCase() ===
                                          "cancelled"
                                    );
                                    const status = hasCanceled
                                      ? "canceled"
                                      : computeStatusForDateShift(ds, sh);
                                    const statusClass =
                                      status === "past"
                                        ? "bg-gray-50 border border-gray-200 text-gray-600"
                                        : status === "canceled"
                                        ? "bg-red-100 border border-red-300 text-red-800"
                                        : status === "active"
                                        ? "bg-amber-200 border-l-4 border-amber-500 text-amber-900"
                                        : "bg-green-100 border border-green-200 text-green-800";

                                    // attempt to compute required count from shift.positionRules if available
                                    let required = null;
                                    if (
                                      sh &&
                                      sh.positionRules &&
                                      Array.isArray(sh.positionRules)
                                    ) {
                                      try {
                                        required = sh.positionRules.reduce(
                                          (sum, r) =>
                                            sum + (r.requiredQuantity || 0),
                                          0
                                        );
                                      } catch (err) {
                                        required = null;
                                      }
                                    }

                                    return (
                                      <div
                                        key={sh.shiftId || `group-${gi}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => {
                                          if (sh && sh.shiftId) {
                                            openShiftDetails(ds, sh);
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" &&
                                            sh &&
                                            sh.shiftId
                                          ) {
                                            openShiftDetails(ds, sh);
                                          }
                                        }}
                                        className={`${statusClass} p-3 rounded-lg shadow-sm flex items-center justify-between cursor-pointer`}
                                      >
                                        <div>
                                          <div className="text-sm font-semibold">
                                            {sh.shiftName ||
                                              `Shift #${
                                                g.entries[0]?.shiftId || "?"
                                              }`}
                                          </div>
                                          <div className="text-xs">
                                            {sh.startTime || "--"} -{" "}
                                            {sh.endTime || "--"}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="flex items-center gap-2">
                                            <span className="badge badge-sm">
                                              Assigned: {g.entries.length}
                                            </span>
                                            {required != null ? (
                                              <span className="text-xs text-gray-700">
                                                / {required} req
                                              </span>
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  });
                                })()
                              }
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />
      {selectedShift && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
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
                  <div>Date: {selectedShift.__date || ""}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-1">
                  Assigned Employees
                </div>
                <div className="max-h-48 overflow-auto border rounded">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th className="text-left">Name</th>
                        <th className="text-left">Position</th>
                        <th className="text-left">Status</th>
                        <th className="text-left">Delay</th>
                        <th className="text-left">Overtime</th>
                        <th className="text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(modalEmployeeShifts || []).map((es) => {
                        const emp = employees.find(
                          (e) => String(e.userId) === String(es.employeeId)
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
                          selectedShift?.__date
                        );
                        const overtime =
                          es.overtimeMinutes || es.overtime_minutes || null;
                        return (
                          <tr
                            key={
                              es.employeeShiftId ||
                              `${es.shiftId}-${es.employeeId}`
                            }
                          >
                            <td className="py-2">{name}</td>
                            <td className="py-2">{pos}</td>
                            <td className="py-2">{es.status || "assigned"}</td>
                            <td className="py-2">{formatMinutes(delayMins)}</td>
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
                                  onClick={() => openReasonViewer(es.reason)}
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

              {Array.isArray(modalRules) && modalRules.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-1">Positions</div>
                  <div className="flex flex-wrap gap-2">
                    {modalRules
                      .filter((r) => r.isAllowed && (r.requiredCount || 0) > 0)
                      .map((r) => {
                        const cur = (modalEmployeeShifts || []).filter(
                          (es) => es.employeePositionName === r.positionName
                        ).length;
                        return (
                          <span
                            key={`modal-rule-${r.positionId}`}
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
            </div>
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => {
                  setSelectedShift(null);
                  setModalEmployeeShifts([]);
                  setModalRules([]);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
    </>
  );
}

export default WeeklyTimetable;
