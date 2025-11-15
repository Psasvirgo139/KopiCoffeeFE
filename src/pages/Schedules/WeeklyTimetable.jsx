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

// Visual styles for shift cards, inspired by StaffSchedule.js
const defaultStatusVisual = {
  label: "Scheduled",
  cardClass: "bg-slate-100 text-slate-600 border border-slate-200",
  chipClass: "bg-slate-100 text-slate-600 border border-slate-200",
};
const statusVisuals = {
  future: {
    label: "Upcoming",
    cardClass: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    chipClass: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
  active: {
    label: "In progress",
    cardClass: "bg-amber-100 text-amber-700 border border-amber-200",
    chipClass: "bg-amber-100 text-amber-700 border border-amber-200",
  },
  past: {
    label: "Completed",
    cardClass: "bg-slate-100 text-slate-600 border border-slate-200",
    chipClass: "bg-slate-200 text-slate-700 border border-slate-300",
  },
  canceled: {
    label: "Canceled",
    cardClass: "bg-orange-100 text-orange-700 border border-orange-200",
    chipClass: "bg-orange-100 text-orange-700 border border-orange-200",
  },
};

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
  const goToCurrentWeek = () => setWeekStart(dayjs().startOf("week"));
  const isCurrentWeek = weekStart.isSame(dayjs().startOf("week"), "day");

  const dates = getWeekDates();
  const todayStr = dayjs().format("YYYY-MM-DD");
  const weekRangeLabel = `${dates[0].format("MMM D")} - ${dates[6].format(
    "MMM D, YYYY"
  )}`;

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

  // --- NEW: Summary Stats ---
  const summaryStats = useMemo(() => {
    const acc = {
      total: 0,
      upcoming: 0,
      active: 0,
      completed: 0, // 'past'
      canceled: 0,
    };

    if (isLoading || Object.keys(grid).length === 0) return acc;

    const currentDates = getWeekDates();
    const uniqueShifts = new Set(); // To avoid double counting shifts

    currentDates.forEach((d) => {
      const ds = d.format("YYYY-MM-DD");
      const daySlots = grid[ds] || {};

      SLOTS.forEach((slot) => {
        const cell = daySlots[slot.id] || [];
        if (cell.length === 0) return;

        // Group entries by shiftId (reuse render logic)
        const map = {};
        cell.forEach((e) => {
          const id =
            (e.shift && e.shift.shiftId) || e.shiftId || "unknown";
          if (id === "unknown") return;
          if (!map[id])
            map[id] = { shift: e.shift, entries: [] };
          map[id].entries.push(e);
        });
        const groups = Object.values(map);

        // Count based on groups
        groups.forEach((g) => {
          const sh = g.shift || shifts.find((s) => s.shiftId === g.entries[0]?.shiftId) || {};
          const shiftKey = `${ds}-${sh.shiftId}`;

          // Only count each unique shift (date+id) once
          if (uniqueShifts.has(shiftKey)) return;
          uniqueShifts.add(shiftKey);

          acc.total += 1;
          const hasCanceled = (g.entries || []).some(
            (ent) =>
              (ent.status || "").toLowerCase() === "canceled" ||
              (ent.status || "").toLowerCase() === "cancelled"
          );

          if (hasCanceled) {
            acc.canceled += 1;
          } else {
            const status = computeStatusForDateShift(ds, sh);
            switch (status) {
              case "future":
                acc.upcoming += 1;
                break;
              case "active":
                acc.active += 1;
                break;
              case "past":
                acc.completed += 1;
                break;
              default:
                break;
            }
          }
        });
      });
    });

    return acc;
  }, [grid, weekStart, isLoading, shifts]);
  // --- END: Summary Stats ---


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

  const formatTime = (timeStr) => {
    if (!timeStr || timeStr === "--") return "--";
    // Đảm bảo chỉ lấy 5 ký tự đầu (HH:mm)
    return timeStr.substring(0, 5);
  };

  return (
    <>
      <Header />
      {/* Changed to <main> and new bg/padding */}
      <main className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          {/* Updated Header section */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">
                Weekly Timetable
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Overview of all scheduled shifts for the week.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-white shadow-sm border border-slate-200 text-slate-700">
                {weekRangeLabel}
              </span>
              <button
                className="btn btn-sm btn-outline"
                onClick={goToCurrentWeek}
                disabled={isCurrentWeek}
              >
                This week
              </button>
              <div className="flex items-center gap-2">
                <button className="btn btn-sm" onClick={prevWeek}>
                  Previous
                </button>
                <button className="btn btn-sm btn-primary" onClick={nextWeek}>
                  Next
                </button>
                <button className="btn btn-sm" onClick={() => navigate(-1)}>
                  Back
                </button>
              </div>
            </div>
          </div>

          {/* --- NEW: Summary Stats Grid --- */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 mb-8">
            {[
              {
                label: "Total shifts",
                value: summaryStats.total,
                className: "bg-white border-slate-200",
              },
              {
                label: "Upcoming",
                value: summaryStats.upcoming,
                className: "bg-emerald-50 border-emerald-100 text-emerald-700",
              },
              {
                label: "In progress",
                value: summaryStats.active,
                className: "bg-amber-50 border-amber-100 text-amber-700",
              },
              {
                label: "Completed",
                value: summaryStats.completed,
                className: "bg-blue-50 border-blue-100 text-blue-700",
              },
              {
                label: "Canceled",
                value: summaryStats.canceled,
                className: "bg-orange-50 border-orange-100 text-orange-700",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-xl border shadow-sm px-4 py-3 flex flex-col gap-1 ${stat.className}`}
              >
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {stat.label}
                </span>
                <span className="text-2xl font-semibold">{stat.value}</span>
              </div>
            ))}
          </div>
          {/* --- END: Summary Stats Grid --- */}


          {/* Updated Table Container */}
          <div className="border border-slate-200 rounded-xl shadow-sm bg-white overflow-x-auto">
            <table
              className="table w-full table-fixed text-sm text-slate-700"
              style={{ width: "100%", minWidth: '1200px' }} // Ensure min-width for overflow
            >
              {/* Updated Table Head */}
              <thead>
                <tr>
                  <th className="w-40 p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50">
                    Slot / Day
                  </th>
                  {dates.map((d) => {
                    const dateStr = d.format("YYYY-MM-DD");
                    const isToday = dateStr === todayStr;
                    const isWeekend = d.day() === 0 || d.day() === 6;
                    return (
                      <th
                        key={dateStr}
                        className={`p-3 text-center text-xs font-semibold uppercase tracking-wide ${
                          isToday
                            ? "bg-amber-100 text-amber-800"
                            : isWeekend
                            ? "bg-slate-50 text-slate-500"
                            : "bg-white text-slate-500"
                        }`}
                      >
                        <div className="text-sm font-semibold text-slate-700">
                          {d.format("ddd")}
                        </div>
                        <div className="text-xs text-slate-500">
                          {d.format("DD/MM")}
                        </div>
                        {isToday && (
                          <span className="mt-1 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-amber-600 shadow-sm border border-amber-200">
                            Today
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                  {SLOTS.map((slot) => (
                    <tr key={slot.id} className="align-top">
                      {/* Updated Slot Label TD */}
                      <td className="font-medium p-3 align-top text-slate-700 bg-slate-50 border-t border-slate-200">
                        <div>
                          <div className="text-base font-semibold text-slate-800">
                            {slot.label}
                          </div>
                          <div className="text-xs text-slate-500">
                            {`${String(slot.from).padStart(2, "0")}:00 - ${String(
                              slot.to
                            ).padStart(2, "0")}:00`}
                          </div>
                        </div>
                      </td>
                      {dates.map((d) => {
                        const ds = d.format("YYYY-MM-DD");
                        const cell = grid[ds] ? grid[ds][slot.id] || [] : [];
                        const isToday = ds === todayStr;
                        const isWeekend = d.day() === 0 || d.day() === 6;
                        return (
                          // Updated Cell TD
                          <td
                            key={`${ds}-${slot.id}`}
                            className={`align-top p-3 transition-colors break-words border-t border-slate-200 ${
                              isToday
                                ? "bg-amber-50"
                                : isWeekend
                                ? "bg-slate-50"
                                : "bg-white"
                            }`}
                          >
                            <div className="min-h-32">
                              {isLoading ? (
                                <div className="text-sm text-slate-400">
                                  Loading...
                                </div>
                              ) : (
                                (function () {
                                  if (cell.length === 0) {
                                    return (
                                      <div className="text-sm text-slate-400 italic">
                                        -
                                      </div>
                                    );
                                  }

                                  const map = {};
                                  cell.forEach((e) => {
                                    const id =
                                      (e.shift && e.shift.shiftId) ||
                                      e.shiftId ||
                                      "unknown";
                                    if (id === "unknown") return; 
                                    if (!map[id])
                                      map[id] = {
                                        shift: e.shift,
                                        entries: [],
                                      };
                                    map[id].entries.push(e);
                                  });
                                  const groups = Object.values(map);

                                  if (groups.length === 0) {
                                    return (
                                      <div className="text-sm text-slate-400 italic">
                                        -
                                      </div>
                                    );
                                  }

                                  // Layout ngang cho CÁC card
                                  return (
                                    <div className="flex flex-row flex-wrap gap-2 items-start">
                                      {groups.map((g, gi) => {
                                        const sh =
                                          g.shift ||
                                          shifts.find(
                                            (s) =>
                                              s.shiftId ===
                                              (g.entries[0] &&
                                                g.entries[0].shiftId)
                                          ) ||
                                          {};
                                        const hasCanceled = (
                                          g.entries || []
                                        ).some(
                                          (ent) =>
                                            (ent.status || "").toLowerCase() ===
                                              "canceled" ||
                                            (ent.status || "").toLowerCase() ===
                                              "cancelled"
                                        );

                                        const statusKey = hasCanceled
                                          ? "canceled"
                                          : computeStatusForDateShift(ds, sh);
                                        const visual =
                                          statusVisuals[statusKey] ||
                                          defaultStatusVisual;
                                        const cardClasses =
                                          visual.cardClass ||
                                          defaultStatusVisual.cardClass;

                                        let required = null;
                                        if (
                                          sh &&
                                          sh.positionRules &&
                                          Array.isArray(sh.positionRules)
                                        ) {
                                          try {
                                            required = sh.positionRules.reduce(
                                              (sum, r) =>
                                                sum +
                                                (r.requiredQuantity || 0),
                                              0
                                            );
                                          } catch (err) {
                                            required = null;
                                          }
                                        }

                                        return (
                                          // --- START: CARD LAYOUT MỚI (DỌC) ---
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
                                            // Thay đổi: flex-col, w-full, min-w-[120px]
                                            className={`${cardClasses} relative rounded-xl p-3 shadow-sm flex flex-col cursor-pointer hover:shadow-md transition-shadow w-full min-w-[120px]`}
                                            style={{
                                              zIndex: gi, 
                                            }}
                                          >
                                            {/* Tên Ca */}
                                            <div className="text-sm font-semibold">
                                              {sh.shiftName ||
                                                `Shift #${
                                                  g.entries[0]?.shiftId || "?"
                                                }`}
                                            </div>

                                            {/* Badge (và số lượng 'req') */}
                                            <div className="mt-1">
                                              <span className="badge badge-sm">
                                                Assigned: {g.entries.length}
                                              </span>
                                              {required != null ? (
                                                <span className="text-xs text-slate-700 ml-2">
                                                  / {required} req
                                                </span>
                                              ) : null}
                                            </div>

                                            {/* Thời gian */}
                                            <div className="text-xs mt-1">
                                              {formatTime(sh.startTime)} -{" "}
                                              {formatTime(sh.endTime)}
                                            </div>
                                          </div>
                                          // --- END: CARD LAYOUT MỚI (DỌC) ---
                                        );
                                      })}
                                    </div>
                                  );
                                })()
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
      
     {/* --- MODAL (Đã cập nhật UI) --- */}
      {selectedShift && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            {/* --- Cần hàm closeModal --- */}
            
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => {
                setSelectedShift(null);
                setModalEmployeeShifts([]);
                setModalRules([]);
              }}
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-4">
              Shift Details - {selectedShift.shiftName}
            </h3>

            {/* --- KHỐI THÔNG TIN MỚI (LAYOUT 2 CỘT) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              {/* Cột 1: Ngày & Giờ */}
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase">
                  Date
                </div>
                <div className="text-base font-semibold text-slate-800">
                  {dayjs(selectedShift.__date).format("dddd, MMMM D, YYYY")}
                </div>

                <div className="text-xs font-medium text-slate-500 uppercase mt-2">
                  Time
                </div>
                <div className="text-base font-semibold text-slate-800">
                  {formatTime(selectedShift.startTime)} -{" "}
                  {formatTime(selectedShift.endTime)}
                </div>
              </div>

              {/* Cột 2: Mô tả & ID */}
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase">
                  Description
                </div>
                <p className="text-sm text-slate-700">
                  {selectedShift.description || "(No description)"}
                </p>

                <div className="text-xs font-medium text-slate-500 uppercase mt-2">
                  Shift ID
                </div>
                <p className="text-sm text-slate-700 font-mono">
                  {selectedShift.shiftId}
                </p>
              </div>
            </div>
            {/* --- KẾT THÚC KHỐI THÔNG TIN MỚI --- */}


            <div className="space-y-4">
              {/* --- BẢNG NHÂN VIÊN ĐƯỢC CẬP NHẬT --- */}
              <div>
                <div className="text-base font-semibold mb-2 text-slate-800">
                  Assigned Employees
                </div>
                
                {/* Container với scroll và sticky header */}
                <div className="max-h-60 overflow-auto border border-slate-200 rounded-lg relative">
                  <table className="table w-full">
                    {/* Header (sticky) */}
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr>
                        <th className="text-left text-xs font-semibold text-slate-600 uppercase">
                          Name
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-600 uppercase">
                          Position
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-600 uppercase">
                          Status
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-600 uppercase">
                          Delay
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-600 uppercase">
                          Overtime
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-600 uppercase">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Trạng thái rỗng */}
                      {(modalEmployeeShifts || []).length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center text-slate-500 py-4 italic"
                          >
                            No employees assigned to this shift.
                          </td>
                        </tr>
                      )}
                      
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
                          // Thêm hover effect
                          <tr
                            key={
                              es.employeeShiftId ||
                              `${es.shiftId}-${es.employeeId}`
                            }
                            className="hover:bg-slate-50"
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

              {/* --- KHỐI CHỨC VỤ ĐƯỢC CẬP NHẬT --- */}
              {Array.isArray(modalRules) && modalRules.length > 0 && (
                <div className="mt-4">
                  <div className="text-base font-semibold mb-2 text-slate-800">
                    Positions Required
                  </div>
                  {/* Bọc trong box có style */}
                  <div className="flex flex-wrap gap-2 p-4 border border-slate-200 rounded-lg bg-slate-50">
                    {modalRules
                      .filter((r) => r.isAllowed && (r.requiredCount || 0) > 0)
                      .map((r) => {
                        const cur = (modalEmployeeShifts || []).filter(
                          (es) => es.employeePositionName === r.positionName
                        ).length;
                        const req = r.requiredCount || 0;
                        return (
                          <span
                            key={`modal-rule-${r.positionId}`}
                            // Cập nhật badge-lg và badge-warning
                            className={`badge badge-lg ${
                              cur >= req ? "badge-success" : "badge-warning"
                            }`}
                          >
                            {r.positionName}: {cur}/{req}
                          </span>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* --- NÚT ĐÓNG --- */}
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

      {/* --- Modal xem lý do (Giữ nguyên) --- */}
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