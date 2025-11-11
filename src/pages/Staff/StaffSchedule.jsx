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

const SLOTS = [
  { id: "morning", label: "Morning", from: 6, to: 12 },
  { id: "afternoon", label: "Afternoon", from: 12, to: 18 },
  { id: "evening", label: "Evening", from: 18, to: 24 },
];

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

  const dates = getWeekDates();

  const computeEntryStatus = (it, dateStr) => {
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
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEntry, setModalEntry] = useState(null);
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionPending, setActionPending] = useState(false);

  const openEntryModal = (it, dateStr) => {
    setModalEntry({ ...it, __date: dateStr });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalEntry(null);
  };

  const requestCancel = (entry) => {
    // Open cancel input in modal
    setModalEntry((m) =>
      m ? m : { ...entry, __date: entry.__date || entry.shiftDate }
    );
    setCancelMode(true);
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
      setCancelMode(false);
      setCancelReason("");
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
      <main className="flex-1 global-px py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">My Weekly Schedule</h2>
          <div className="flex gap-2">
            <button className="btn btn-sm" onClick={prevWeek}>
              Previous
            </button>
            <button className="btn btn-sm" onClick={nextWeek}>
              Next
            </button>
          </div>
        </div>

        <div
          className="border rounded"
          style={{ height: 440, overflowY: "auto", overflowX: "hidden" }}
        >
          {/* Fixed-size timetable: table-layout fixed with a min width so columns keep
              stable sizes. Container will scroll horizontally on small viewports. */}
          <table className="table w-full table-fixed" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th className="w-40 p-2 text-left">Slot / Day</th>
                {dates.map((d) => (
                  <th key={d.format("YYYY-MM-DD")} className="p-2 text-center">
                    <div className="text-sm font-medium">{d.format("ddd")}</div>
                    <div className="text-xs text-gray-500">
                      {d.format("MM/DD")}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot) => (
                <tr key={slot.id}>
                  <td className="font-medium p-2 align-top">{slot.label}</td>
                  {dates.map((d) => {
                    const dateStr = d.format("YYYY-MM-DD");
                    const items =
                      (grid[dateStr] && grid[dateStr][slot.id]) || [];
                    return (
                      <td key={dateStr} className="align-top p-2">
                        {/* fixed-height cell container to keep row heights consistent */}
                        <div className="h-28 flex flex-col justify-center">
                          {isLoading ? (
                            <div className="text-sm text-gray-400 h-full flex items-center justify-center">
                              Loading...
                            </div>
                          ) : items.length === 0 ? (
                            <div className="text-sm text-gray-400 h-full flex items-center justify-center">
                              -
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 items-stretch h-full">
                              {items.map((it) => {
                                const st = computeEntryStatus(it, dateStr);
                                const baseClasses =
                                  "border rounded px-2 py-1 overflow-hidden flex flex-col justify-between w-full";
                                const statusClasses =
                                  st === "past"
                                    ? "bg-gray-100 text-gray-600"
                                    : st === "active"
                                    ? "bg-amber-100 border-amber-300"
                                    : st === "future"
                                    ? "bg-green-100 text-green-800"
                                    : st === "missed"
                                    ? "bg-red-100 text-red-800 border-red-300"
                                    : "bg-orange-100 border-orange-300"; // canceled/other

                                return (
                                  <div
                                    key={it.employeeShiftId || it.shiftId}
                                    className={`${baseClasses} ${statusClasses} h-20 flex-shrink-0`}
                                    onClick={() => openEntryModal(it, dateStr)}
                                  >
                                    <div>
                                      <div className="text-sm font-medium whitespace-normal break-words">
                                        {it.shift
                                          ? it.shift.name
                                          : `Shift ${it.shiftId}`}
                                      </div>
                                      <div className="text-xs">
                                        {it.shift?.startTime || ""} -{" "}
                                        {it.shift?.endTime || ""}
                                      </div>
                                    </div>
                                    <div className="text-xs mt-1">
                                      Status: {it.status || "assigned"}
                                    </div>
                                  </div>
                                );
                              })}
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
      {modalOpen && modalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-40"
            onClick={closeModal}
          ></div>
          <div className="relative bg-white rounded shadow-lg w-96 p-4 z-60">
            <h3 className="text-lg font-semibold mb-2">Shift details</h3>
            <div className="text-sm mb-1">Date: {modalEntry.__date}</div>
            <div className="text-sm mb-1">
              Start: {modalEntry.shift?.startTime || "-"}
            </div>
            <div className="text-sm mb-1">
              End: {modalEntry.shift?.endTime || "-"}
            </div>
            <div className="text-sm mb-1">Notes: {modalEntry.notes || "-"}</div>
            <div className="text-sm mb-3">
              Status: {modalEntry.status || "assigned"}
            </div>
            <div className="flex flex-col gap-2">
              {/* Action area: restore / cancel / check-in / check-out */}
              <div className="flex flex-col gap-2">
                {/* Restore (when canceled) */}
                {(modalEntry.status || "")
                  .toString()
                  .toLowerCase()
                  .includes("cancel") && (
                  <div className="flex justify-end gap-2">
                    <button
                      className="btn btn-sm btn-success"
                      disabled={actionPending}
                      onClick={requestRestore}
                    >
                      {actionPending ? "Restoring..." : "Restore shift"}
                    </button>
                  </div>
                )}

                {/* Check-in when active and not yet checked in */}
                {computeEntryStatus(modalEntry, modalEntry.__date) ===
                  "active" &&
                  !modalEntry.actualCheckIn && (
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={actionPending}
                        onClick={doCheckin}
                      >
                        {actionPending ? "Checking in..." : "Check in"}
                      </button>
                    </div>
                  )}

                {/* Check-out when checked in and not yet checked out — only after shift end for non-admins */}
                {modalEntry.actualCheckIn &&
                  !modalEntry.actualCheckOut &&
                  (() => {
                    try {
                      const endStr =
                        modalEntry.overrideEndTime || modalEntry.shift?.endTime;
                      if (!endStr) return null;
                      const end = dayjs(`${modalEntry.__date}T${endStr}`);
                      if (dayjs().isAfter(end)) {
                        return (
                          <div className="flex justify-end gap-2">
                            <button
                              className="btn btn-sm btn-accent"
                              disabled={actionPending}
                              onClick={doCheckout}
                            >
                              {actionPending ? "Checking out..." : "Check out"}
                            </button>
                          </div>
                        );
                      }
                    } catch (e) {
                      // ignore parsing errors and hide the button
                    }
                    return null;
                  })()}

                {/* If future and not canceled, show cancel flow */}
                {computeEntryStatus(modalEntry, modalEntry.__date) ===
                  "future" &&
                  !(modalEntry.status || "")
                    .toString()
                    .toLowerCase()
                    .includes("cancel") && (
                    <div className="flex flex-col gap-2">
                      {!cancelMode ? (
                        <div className="flex justify-end gap-2">
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => setCancelMode(true)}
                          >
                            Cancel shift
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-xs">Reason (required)</label>
                          <textarea
                            className="textarea textarea-bordered w-full"
                            rows={3}
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              className="btn btn-sm"
                              onClick={() => {
                                setCancelMode(false);
                                setCancelReason("");
                              }}
                              disabled={actionPending}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={confirmCancel}
                              disabled={actionPending}
                            >
                              {actionPending
                                ? "Cancelling..."
                                : "Confirm cancel"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                <div className="flex justify-end">
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      setCancelMode(false);
                      setCancelReason("");
                      closeModal();
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}

export default StaffSchedule;
