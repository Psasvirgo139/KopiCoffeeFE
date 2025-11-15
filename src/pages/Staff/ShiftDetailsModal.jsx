import React from "react";
import dayjs from "dayjs";

function ShiftDetailsModal({
  open,
  entry,
  statusVisuals,
  defaultStatusVisual,
  computeEntryStatus,
  actionPending,
  cancelMode,
  cancelReason,
  onCancelReasonChange,
  onToggleCancelMode,
  onConfirmCancel,
  onRestore,
  onCheckin,
  onCheckout,
  onClose,
}) {
  if (!open || !entry) return null;

  const dateLabel = dayjs(entry.__date).format("dddd, MMM D, YYYY");
  const statusKey = computeEntryStatus(entry, entry.__date);
  const fallbackStatus =
    defaultStatusVisual || {
      label: "Scheduled",
      cardClass: "bg-slate-100 text-slate-600 border border-slate-200",
      chipClass: "bg-slate-100 text-slate-600 border border-slate-200",
    };
  const statusInfo = statusVisuals[statusKey] || fallbackStatus;

  const shiftName = entry.shift?.name || `Shift ${entry.shiftId}`;
  const startTime = entry.shift?.startTime || "-";
  const endTime = entry.shift?.endTime || "-";
  const overrideEnd = entry.overrideEndTime || null;
  const checkInAt = entry.actualCheckIn
    ? dayjs(entry.actualCheckIn).format("MMM D, HH:mm")
    : "-";
  const checkOutAt = entry.actualCheckOut
    ? dayjs(entry.actualCheckOut).format("MMM D, HH:mm")
    : "-";

  const showRestore =
    (entry.status || "").toString().toLowerCase().includes("cancel");
  const showCheckIn =
    computeEntryStatus(entry, entry.__date) === "active" &&
    !entry.actualCheckIn;
  const showCheckOut =
    entry.actualCheckIn &&
    !entry.actualCheckOut &&
    (() => {
      try {
        const endStr = overrideEnd || entry.shift?.endTime;
        if (!endStr) return false;
        const end = dayjs(`${entry.__date}T${endStr}`);
        return dayjs().isAfter(end);
      } catch (err) {
        return false;
      }
    })();
  const showCancel =
    computeEntryStatus(entry, entry.__date) === "future" &&
    !(entry.status || "").toString().toLowerCase().includes("cancel");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                Shift Overview
              </p>
              <h3 className="text-2xl font-semibold mt-1">{shiftName}</h3>
              <p className="text-sm text-slate-300 mt-2">{dateLabel}</p>
            </div>
            <button
              onClick={onClose}
              className="text-xs font-medium uppercase tracking-wide bg-white/10 hover:bg-white/20 transition-colors rounded-full px-3 py-1 text-white"
            >
              Close
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${statusInfo.chipClass}`}
            >
              {statusInfo.label}
            </span>
            {entry.reason && (
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
                Reason: {entry.reason}
              </span>
            )}
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <DetailCard label="Start" value={startTime} />
            <DetailCard label="End" value={endTime} />
            <DetailCard label="Override End" value={overrideEnd || "—"} />
            <DetailCard label="Notes" value={entry.notes || "No notes"} />
            <DetailCard label="Checked In" value={checkInAt} />
            <DetailCard label="Checked Out" value={checkOutAt} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
            <p className="text-sm font-semibold text-slate-700">
              Quick actions
            </p>
            <div className="flex flex-wrap gap-2">
              {showRestore && (
                <button
                  className="btn btn-sm btn-success"
                  disabled={actionPending}
                  onClick={onRestore}
                >
                  {actionPending ? "Restoring..." : "Restore shift"}
                </button>
              )}

              {showCheckIn && (
                <button
                  className="btn btn-sm btn-primary"
                  disabled={actionPending}
                  onClick={onCheckin}
                >
                  {actionPending ? "Checking in..." : "Check in"}
                </button>
              )}

              {showCheckOut && (
                <button
                  className="btn btn-sm btn-accent"
                  disabled={actionPending}
                  onClick={onCheckout}
                >
                  {actionPending ? "Checking out..." : "Check out"}
                </button>
              )}

              {showCancel && !cancelMode && (
                <button
                  className="btn btn-sm btn-warning"
                  onClick={() => onToggleCancelMode(true)}
                >
                  Cancel shift
                </button>
              )}
            </div>

            {showCancel && cancelMode && (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                <label className="text-xs font-semibold text-amber-800">
                  Cancellation reason (required)
                </label>
                <textarea
                  className="textarea textarea-bordered w-full text-sm"
                  rows={3}
                  placeholder="Share why you cannot work this shift..."
                  value={cancelReason}
                  onChange={(e) => onCancelReasonChange(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="btn btn-sm"
                    onClick={() => onToggleCancelMode(false)}
                    disabled={actionPending}
                  >
                    Keep shift
                  </button>
                  <button
                    className="btn btn-sm btn-warning"
                    onClick={onConfirmCancel}
                    disabled={actionPending}
                  >
                    {actionPending ? "Cancelling..." : "Confirm cancel"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-700 break-words">
        {value}
      </p>
    </div>
  );
}

export default ShiftDetailsModal;

