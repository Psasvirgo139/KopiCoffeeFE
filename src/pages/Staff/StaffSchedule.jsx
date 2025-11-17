import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  getShifts,
  getEmployeeShiftsByRange,
  cancelEmployeeShift,
  restoreEmployeeShift,
  checkinEmployeeShift,
  checkoutEmployeeShift,
} from "../../utils/dataProvider/schedule";
import { getUserData } from "../../utils/authUtils";
import toast from "react-hot-toast";
import ShiftDetailsModal from "./ShiftDetailsModal";

const SLOTS = [
  { id: "morning", label: "Morning", from: 6, to: 12 },
  { id: "afternoon", label: "Afternoon", from: 12, to: 18 },
  { id: "evening", label: "Evening", from: 18, to: 24 },
];

// Sub-time buckets per main slot
const SUB_BUCKETS = {
  morning: [
    { from: 6, to: 9, label: "06:00 - 09:00" },
    { from: 9, to: 12, label: "09:00 - 12:00" },
  ],
  afternoon: [
    { from: 12, to: 15, label: "12:00 - 15:00" },
    { from: 15, to: 18, label: "15:00 - 18:00" },
  ],
  evening: [
    { from: 18, to: 21, label: "18:00 - 21:00" },
    { from: 21, to: 24, label: "21:00 - 24:00" },
  ],
};

function StaffSchedule() {
  const userInfo = useSelector((s) => s.userInfo);
  const [weekStart, setWeekStart] = useState(() => dayjs().startOf("week"));
  const controller = useMemo(() => new AbortController(), [weekStart]);

  const [shifts, setShifts] = useState([]);
  const [grid, setGrid] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [weekStart]);

  const getWeekDates = () => {
    const arr = [];
    for (let i = 0; i < 7; i++) arr.push(weekStart.add(i, "day"));
    return arr;
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const shiftRes = await getShifts({}, controller);
      const shiftArr = shiftRes?.data || [];
      setShifts(shiftArr);

      const dates = getWeekDates();
      const start = dates[0].format("YYYY-MM-DD");
      const end = dates[6].format("YYYY-MM-DD");

      const rangeRes = await getEmployeeShiftsByRange(start, end, controller);
      const list = rangeRes?.data || [];

      // determine current user id from token payload (try common fields)
      const u = getUserData();
      const userId = u?.userId || u?.id || u?.sub || null;

      // Filter to only assignments for this user
      const myAssignments = list.filter((es) => {
        if (userId == null) return false;
        // es.employeeId may be number or string
        return String(es.employeeId) === String(userId);
      });

      // Bucket into day -> slot
      const newGrid = {};
      for (let i = 0; i < dates.length; i++) {
        const dateStr = dates[i].format("YYYY-MM-DD");
        const slotMap = {};
        SLOTS.forEach((s) => (slotMap[s.id] = []));
        const dayItems = myAssignments.filter((es) => es.shiftDate === dateStr);
        dayItems.forEach((es) => {
          const sh = shiftArr.find((s) => s.shiftId === es.shiftId) || null;
          let hour = null;
          if (sh && sh.startTime) {
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
    } catch (err) {
      console.error(err);
      toast.error("Failed to load your schedule");
    } finally {
      setIsLoading(false);
    }
  };

  const nextWeek = () => setWeekStart((w) => w.add(7, "day"));
  const prevWeek = () => {
    const candidate = weekStart.subtract(7, "day");
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

  function computeEntryStatus(it, dateStr) {
    // canceled detection
    const s = (it.status || "").toLowerCase();
    if (s === "canceled" || s === "cancelled" || s === "cancel-requested")
      return "canceled";
    // missed detection (preserve red state)
    if (s.includes("miss")) return "missed";
    // if someone has checked out -> treat as past/completed
    if (it.actualCheckOut) return "past";
    // if someone has checked in but not checked out, keep it active regardless of clock
    if (it.actualCheckIn && !it.actualCheckOut) return "active";
    const today = dayjs().format("YYYY-MM-DD");
    if (dateStr < today) return "past";
    if (dateStr > today) return "future";
    // same day -> compare now to shift start/end
    if (!it.shift || !it.shift.startTime || !it.shift.endTime) return "future";
    const now = dayjs();
    const start = dayjs(`${dateStr}T${it.shift.startTime}`);
    const end = dayjs(`${dateStr}T${it.shift.endTime}`);
    if (now.isBefore(start)) return "future";
    if (now.isAfter(end)) return "past";
    return "active";
  }

  const summaryStats = useMemo(() => {
    const acc = {
      total: 0,
      upcoming: 0,
      active: 0,
      completed: 0,
      canceled: 0,
      missed: 0,
    };

    const currentDates = getWeekDates();
    currentDates.forEach((d) => {
      const dateStr = d.format("YYYY-MM-DD");
      const slots = grid[dateStr] || {};
      Object.values(slots).forEach((items = []) => {
        items.forEach((it) => {
          acc.total += 1;
          const status = computeEntryStatus(it, dateStr);
          switch (status) {
            case "future":
              acc.upcoming += 1;
              break;
            case "active":
              acc.active += 1;
              break;
            case "missed":
              acc.missed += 1;
              break;
            case "canceled":
              acc.canceled += 1;
              break;
            default:
              acc.completed += 1;
              break;
          }
        });
      });
    });

    return acc;
  }, [grid, weekStart]);
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
    missed: {
      label: "Missed",
      cardClass: "bg-rose-100 text-rose-700 border border-rose-200",
      chipClass: "bg-rose-100 text-rose-700 border border-rose-200",
    },
    canceled: {
      label: "Canceled",
      cardClass: "bg-orange-100 text-orange-700 border border-orange-200",
      chipClass: "bg-orange-100 text-orange-700 border border-orange-200",
    },
  };

 

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEntry, setModalEntry] = useState(null);
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionPending, setActionPending] = useState(false);

  const toggleCancelMode = (flag) => {
    setCancelMode(flag);
    if (!flag) setCancelReason("");
  };

  const openEntryModal = (it, dateStr) => {
    toggleCancelMode(false);
    setModalEntry({ ...it, __date: dateStr });
    setModalOpen(true);
  };

  const closeModal = () => {
    toggleCancelMode(false);
    setModalOpen(false);
    setModalEntry(null);
  };

  const confirmCancel = async () => {
    if (!modalEntry) return;
    if (!cancelReason || cancelReason.trim().length === 0) {
      toast.error("Reason is required");
      return;
    }
    setActionPending(true);
    try {
      await cancelEmployeeShift(
        modalEntry.employeeShiftId,
        { reason: cancelReason.trim() },
        userInfo.token,
        controller
      );
      const dateStr = modalEntry.__date || modalEntry.shiftDate;
      const newGrid = { ...grid };
      if (newGrid[dateStr]) {
        const slotKeys = Object.keys(newGrid[dateStr]);
        for (const sk of slotKeys) {
          newGrid[dateStr][sk] = newGrid[dateStr][sk].map((e) => {
            if (
              (e.employeeShiftId || e.shiftId) ===
              (modalEntry.employeeShiftId || modalEntry.shiftId)
            ) {
              return { ...e, status: "CANCELLED", reason: cancelReason.trim() };
            }
            return e;
          });
        }
      }
      setGrid(newGrid);
      setModalEntry((m) =>
        m ? { ...m, status: "CANCELLED", reason: cancelReason.trim() } : m
      );
      toggleCancelMode(false);
      toast.success("Shift canceled");
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel shift");
    } finally {
      setActionPending(false);
    }
  };

  const requestRestore = async () => {
    if (!modalEntry) return;
    setActionPending(true);
    try {
      await restoreEmployeeShift(
        modalEntry.employeeShiftId,
        userInfo.token,
        controller
      );
      const dateStr = modalEntry.__date || modalEntry.shiftDate;
      const newGrid = { ...grid };
      if (newGrid[dateStr]) {
        const slotKeys = Object.keys(newGrid[dateStr]);
        for (const sk of slotKeys) {
          newGrid[dateStr][sk] = newGrid[dateStr][sk].map((e) => {
            if (
              (e.employeeShiftId || e.shiftId) ===
              (modalEntry.employeeShiftId || modalEntry.shiftId)
            ) {
              return { ...e, status: "assigned", reason: null };
            }
            return e;
          });
        }
      }
      setGrid(newGrid);
      setModalEntry((m) =>
        m ? { ...m, status: "assigned", reason: null } : m
      );
      toast.success("Shift restored");
    } catch (err) {
      console.error(err);
      toast.error("Failed to restore shift");
    } finally {
      setActionPending(false);
    }
  };

  const doCheckin = async () => {
    if (!modalEntry) return;
    setActionPending(true);
    try {
      const checkinRes = await checkinEmployeeShift(
        modalEntry.employeeShiftId,
        userInfo.token,
        controller
      );
      // update UI with returned actualCheckIn
      const actual =
        checkinRes?.data?.actualCheckIn || new Date().toISOString();
      const dateStr = modalEntry.__date || modalEntry.shiftDate;
      const newGrid = { ...grid };
      if (newGrid[dateStr]) {
        const slotKeys = Object.keys(newGrid[dateStr]);
        for (const sk of slotKeys) {
          newGrid[dateStr][sk] = newGrid[dateStr][sk].map((e) => {
            if (
              (e.employeeShiftId || e.shiftId) ===
              (modalEntry.employeeShiftId || modalEntry.shiftId)
            ) {
              return { ...e, actualCheckIn: actual };
            }
            return e;
          });
        }
      }
      setGrid(newGrid);
      setModalEntry((m) => (m ? { ...m, actualCheckIn: actual } : m));
      toast.success("Checked in");
    } catch (err) {
      console.error(err);
      toast.error("Failed to check in");
    } finally {
      setActionPending(false);
    }
  };

  const doCheckout = async () => {
    if (!modalEntry) return;
    setActionPending(true);
    try {
      const checkoutRes = await checkoutEmployeeShift(
        modalEntry.employeeShiftId,
        userInfo.token,
        controller
      );
      const actualOut =
        checkoutRes?.data?.actualCheckOut || new Date().toISOString();
      const dateStr = modalEntry.__date || modalEntry.shiftDate;
      const newGrid = { ...grid };
      if (newGrid[dateStr]) {
        const slotKeys = Object.keys(newGrid[dateStr]);
        for (const sk of slotKeys) {
          newGrid[dateStr][sk] = newGrid[dateStr][sk].map((e) => {
            if (
              (e.employeeShiftId || e.shiftId) ===
              (modalEntry.employeeShiftId || modalEntry.shiftId)
            ) {
              return { ...e, actualCheckOut: actualOut, status: "COMPLETED" };
            }
            return e;
          });
        }
      }
      setGrid(newGrid);
      setModalEntry((m) =>
        m ? { ...m, actualCheckOut: actualOut, status: "COMPLETED" } : m
      );
      toast.success("Checked out");
    } catch (err) {
      console.error(err);
      toast.error("Failed to check out");
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 global-px py-8 bg-slate-50">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">
              My Weekly Schedule
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Review your assignments, track your progress, and check in when
              you start a shift.
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
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6 mb-8">
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
            {
              label: "Missed",
              value: summaryStats.missed,
              className: "bg-rose-50 border-rose-100 text-rose-700",
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

        <div
          className="border border-slate-200 rounded-xl shadow-sm bg-white"
          style={{ height: 460, overflowY: "auto", overflowX: "hidden" }}
        >
          {/* Fixed-size timetable: table-layout fixed with a min width so columns keep
              stable sizes. Container will scroll horizontally on small viewports. */}
          <table
            className="table w-full table-fixed text-sm text-slate-700"
            style={{ width: "100%" }}
          >
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
                        {d.format("MM/DD")}
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
                <tr key={slot.id}>
                  <td className="font-medium p-3 align-top text-slate-700 bg-slate-50">
                    <div>
                      <div className="text-base font-semibold text-slate-800">
                        {slot.label}
                      </div>
                      <div className="text-xs text-slate-500">
                        {`${slot.from}:00 - ${slot.to}:00`}
                      </div>
                    </div>
                  </td>
                  {dates.map((d) => {
                    const dateStr = d.format("YYYY-MM-DD");
                    // Hide canceled entries
                    const items = ((grid[dateStr] && grid[dateStr][slot.id]) || []).filter(
                      (it) => {
                        const s = (it.status || "").toLowerCase();
                        return !(s === "canceled" || s === "cancelled" || s === "cancel-requested");
                      }
                    );
                    const isToday = dateStr === todayStr;
                    const isWeekend = d.day() === 0 || d.day() === 6;
                    return (
                      <td
                        key={dateStr}
                        className={`align-top p-3 transition-colors break-words ${
                          isToday
                            ? "bg-amber-50"
                            : isWeekend
                            ? "bg-slate-50"
                            : "bg-white"
                        }`}
                        style={{ minWidth: '120px' }}
                      >
                        {/* fixed-height cell container to keep row heights consistent */}
                        <div className="min-h-32 flex flex-col justify-center">
                          {isLoading ? (
                            <div className="text-sm text-slate-400 h-full flex items-center justify-center">
                              Loading...
                            </div>
                          ) : items.length === 0 ? (
                            <div className="text-sm text-slate-300 h-full flex items-center justify-center italic">
                              No shift
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 items-stretch">
                              {
                                // Group items into sub-buckets within the main slot
                                (function () {
                                  const ranges = SUB_BUCKETS[slot.id] || [];
                                  // Prepare groups
                                  const groups = ranges.map((r) => ({
                                    key: `${r.from}-${r.to}`,
                                    label: r.label,
                                    items: [],
                                  }));
                                  // Helper to parse hour from item.shift.startTime
                                  const getHour = (it) => {
                                    const t = it?.shift?.startTime || "";
                                    const hh = parseInt((t.split(":")[0] || "0"), 10);
                                    return Number.isNaN(hh) ? null : hh;
                                  };
                                  items.forEach((it) => {
                                    const hh = getHour(it);
                                    const g =
                                      groups.find((gr) => hh != null && hh >= gr.key.split("-")[0] && hh < gr.key.split("-")[1]) ||
                                      null;
                                    if (g) g.items.push(it);
                                  });
                                  // Render only non-empty groups
                                  return groups
                                    .filter((g) => g.items.length > 0)
                                    .map((g) => (
                                      <div key={g.key} className="flex flex-col gap-2">
                                        <div className="flex flex-col gap-2">
                                          {g.items.map((it) => {
                                            const st = computeEntryStatus(it, dateStr);
                                            const visual = statusVisuals[st] || defaultStatusVisual;
                                            const baseClasses =
                                              "rounded-xl px-3 py-2 flex flex-col gap-2 w-full shadow-sm hover:shadow-md transition-shadow cursor-pointer";
                                            const statusClasses =
                                              visual.cardClass || defaultStatusVisual.cardClass;
                                            // Best-effort workplace/position label
                                            const place =
                                              it.workplaceName ||
                                              it.branchName ||
                                              it.storeName ||
                                              it.siteName ||
                                              it.location ||
                                              it.employeePositionName ||
                                              it.positionName ||
                                              it.shift?.location ||
                                              null;
                                            // Format time to HH:mm format
                                            const formatTime = (timeStr) => {
  if (!timeStr) return "";
  return timeStr.substring(0, 5); // lấy HH:mm
};
                                            
                                            return (
                                              <div
                                                key={it.employeeShiftId || it.shiftId}
                                                className={`${baseClasses} ${statusClasses} min-h-24 flex-shrink-0`}
                                                onClick={() => openEntryModal(it, dateStr)}
                                              >
                                                <div className="flex flex-col gap-2 w-full">
                                                  <div className="text-sm font-medium break-words">
                                                    {formatTime(it.shift?.startTime || "")} - {formatTime(it.shift?.endTime || "")}
                                                  </div>
                                                  <div className="text-xs break-words whitespace-normal word-wrap">
                                                    {place ? `Role/Place: ${place}` : ""}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ));
                                })()
                              }
                            </div>
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
      </main>
      <ShiftDetailsModal
        open={modalOpen}
        entry={modalEntry}
        statusVisuals={statusVisuals}
        defaultStatusVisual={defaultStatusVisual}
        computeEntryStatus={computeEntryStatus}
        actionPending={actionPending}
        cancelMode={cancelMode}
        cancelReason={cancelReason}
        onCancelReasonChange={setCancelReason}
        onToggleCancelMode={toggleCancelMode}
        onConfirmCancel={confirmCancel}
        onRestore={requestRestore}
        onCheckin={doCheckin}
        onCheckout={doCheckout}
        onClose={closeModal}
      />
      <Footer />
    </div>
  );
}

export default StaffSchedule;
