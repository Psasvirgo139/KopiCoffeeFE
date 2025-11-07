import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import toast from "react-hot-toast";
import {
  generateFromPattern,
  getRecurrencePatterns,
  getGenerations,
  getWorkSchedulesWithRecurrence,
  getWorkScheduleDetails,
  deleteWorkSchedule,
  removeDateFromWorkSchedule,
} from "../../utils/dataProvider/schedule";

const WEEKDAYS = [
  { key: "MON", label: "Mon" },
  { key: "TUE", label: "Tue" },
  { key: "WED", label: "Wed" },
  { key: "THU", label: "Thu" },
  { key: "FRI", label: "Fri" },
  { key: "SAT", label: "Sat" },
  { key: "SUN", label: "Sun" },
];

function GenerateFromPattern() {
  const userInfo = useSelector((s) => s.userInfo);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    anchorDate: "",
    startDate: "",
    endDate: "",
    type: "WEEKLY",
    // interval stored as string to avoid unwanted formatting/padding in the input
    interval: "1",
    // only a single weekday is allowed for WEEKLY
    dayOfWeek: "MON",
    name: "",
    description: "",
    overwrite: false,
  });

  const [patterns, setPatterns] = useState([]);
  const [selectedPatternId, setSelectedPatternId] = useState("");

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getRecurrencePatterns();
        if (!mounted) return;
        const payload = res?.data ?? res;
        setPatterns(Array.isArray(payload) ? payload : []);
      } catch (e) {
        // non-fatal, just leave patterns empty
        console.debug("Failed to load recurrence patterns", e?.message || e);
      }
    })();
    return () => (mounted = false);
  }, []);
  const [history, setHistory] = useState([]);
  const [schedulesWithRecurrence, setSchedulesWithRecurrence] = useState([]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userInfo?.token) return;
      try {
        const res = await getGenerations(userInfo.token);
        if (!mounted) return;
        setHistory(res?.data || res || []);
      } catch (e) {
        console.debug("Failed to load generation history", e?.message || e);
      }

      try {
        const wr = await (
          await import("../../utils/dataProvider/schedule")
        ).getWorkSchedulesWithRecurrence(userInfo.token);
        if (!mounted) return;
        const arr = wr?.data || wr || [];
        // sort by createdAt (newest first) when available, fall back to startDate
        arr.sort((a, b) => {
          const da = new Date(a.createdAt || a.created_at || a.startDate || 0);
          const db = new Date(b.createdAt || b.created_at || b.startDate || 0);
          return db - da;
        });
        setSchedulesWithRecurrence(arr);
      } catch (e) {
        console.debug(
          "Failed to load work schedules with recurrence",
          e?.message || e
        );
      }
    })();
    return () => (mounted = false);
  }, [userInfo]);

  const [previewResults, setPreviewResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedScheduleDetails, setSelectedScheduleDetails] = useState(null);
  // unique dates derived from selectedScheduleDetails.shiftDates (show each date once)
  const uniqueShiftDates = useMemo(() => {
    if (!selectedScheduleDetails || !selectedScheduleDetails.shiftDates)
      return [];
    // Use a Set to deduplicate and sort lexicographically (ISO date strings sort correctly)
    return Array.from(new Set(selectedScheduleDetails.shiftDates)).sort();
  }, [selectedScheduleDetails]);

  const validateForm = () => {
    if (!form.name || form.name.trim().length === 0) return "Name is required";
    // Prevent duplicate names (case-insensitive) among existing schedules and generation history
    try {
      const nameKey = form.name.trim().toLowerCase();
      if (
        schedulesWithRecurrence.some(
          (s) => (s.name || "").trim().toLowerCase() === nameKey
        ) ||
        history.some((h) => (h.name || "").trim().toLowerCase() === nameKey)
      ) {
        return "Name already exists";
      }
    } catch (ex) {
      // defensive: if schedules not ready yet, ignore duplicate check
    }
    if (!form.anchorDate) return "Anchor date is required";
    if (!form.startDate) return "Start date is required";
    if (!form.endDate) return "End date is required";
    const sd = new Date(form.startDate);
    const ed = new Date(form.endDate);
    if (sd > ed) return "startDate must be before or equal to endDate";
    const diff = Math.ceil((ed - sd) / (1000 * 60 * 60 * 24));
    if (diff > 60) return "Date range cannot exceed 60 days";
    // For DAILY/WEEKLY require selecting an existing recurrence pattern
    if (form.type === "DAILY" || form.type === "WEEKLY") {
      if (!selectedPatternId)
        return "Please select an existing repeat pattern for the selected type";
      // also ensure the applied pattern provided required data
      if (form.type === "DAILY") {
        const iv = Number(form.interval);
        if (!Number.isInteger(iv) || iv < 1 || iv > 7)
          return "Interval must be an integer between 1 and 7";
      }
      if (form.type === "WEEKLY") {
        if (!form.dayOfWeek) return "Selected pattern must contain a weekday";
      }
    }
    return null;
  };

  const handlePreview = async () => {
    const err = validateForm();
    if (err) return toast.error(err);
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        anchorDate: form.anchorDate,
        startDate: form.startDate,
        endDate: form.endDate,
        type: form.type,
        interval: form.type === "DAILY" ? Number(form.interval) : undefined,
        daysOfWeek: form.type === "WEEKLY" ? [form.dayOfWeek] : undefined,
        recurrenceId: selectedPatternId ? Number(selectedPatternId) : undefined,
        preview: true,
      };
      const res = await generateFromPattern(payload, userInfo.token);
      setPreviewResults(res.data || res);
      toast.success("Preview loaded");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Preview failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    const err = validateForm();
    if (err) return toast.error(err);
    // confirm action with English popup
    const ok = window.confirm(
      "Are you sure you want to generate schedules? This will overwrite existing schedules for selected dates when 'Overwrite' is enabled."
    );
    if (!ok) return;
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        anchorDate: form.anchorDate,
        startDate: form.startDate,
        endDate: form.endDate,
        type: form.type,
        interval: form.type === "DAILY" ? Number(form.interval) : undefined,
        daysOfWeek: form.type === "WEEKLY" ? [form.dayOfWeek] : undefined,
        recurrenceId: selectedPatternId ? Number(selectedPatternId) : undefined,
        overwrite: form.overwrite,
      };
      const res = await generateFromPattern(payload, userInfo.token);
      toast.success("Generate completed");
      setPreviewResults(res.data || res);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Generate failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // keep single day picker for weekly

  return (
    <>
      <Header />
      <div className="min-h-screen bg-base-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
              Generate Schedules from Pattern
            </h1>
            <div>
              <button className="btn" onClick={() => navigate(-1)}>
                Back
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title">Settings</h2>
                <div className="space-y-3">
                  {/* Name & description moved to top as requested */}
                  <div>
                    <label className="label">
                      <span className="label-text">Name</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text">Description</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">Anchor date</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={form.anchorDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, anchorDate: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text">Start date</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text">End date</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={form.endDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, endDate: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text">Type</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
                      value={form.type}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => ({ ...f, type: v }));
                        // clear any selected pattern when type changes
                        setSelectedPatternId("");
                      }}
                    >
                      <option value="DAILY">DAILY</option>
                      <option value="WEEKLY">WEEKLY</option>
                    </select>
                  </div>

                  {/* show existing recurrence patterns when type is DAILY or WEEKLY */}
                  {(form.type === "DAILY" || form.type === "WEEKLY") && (
                    <div>
                      <label className="label">
                        <span className="label-text">
                          Choose existing pattern
                        </span>
                      </label>
                      <select
                        className="select select-bordered w-full"
                        value={selectedPatternId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedPatternId(id);
                          if (!id) return;
                          const p = patterns.find(
                            (x) =>
                              String(
                                x.recurrenceId || x.recurrence_id || x.id
                              ) === id
                          );
                          if (!p) return;
                          // apply pattern values to form where applicable
                          const type = (
                            p.recurrenceType ||
                            p.recurrence_type ||
                            p.type ||
                            ""
                          ).toUpperCase();
                          if (type === "DAILY" && p.intervalDays != null) {
                            setForm((f) => ({
                              ...f,
                              interval: String(p.intervalDays),
                            }));
                          }
                          if (
                            type === "WEEKLY" &&
                            (p.dayOfWeek || p.day_of_week)
                          ) {
                            // dayOfWeek may be CSV or single token; pick first token
                            const token = (
                              p.dayOfWeek ||
                              p.day_of_week ||
                              ""
                            ).split(/,|\s+/)[0];
                            if (token)
                              setForm((f) => ({ ...f, dayOfWeek: token }));
                          }
                        }}
                      >
                        <option value="">-- none --</option>
                        {patterns
                          .filter(
                            (p) =>
                              (
                                p.recurrenceType ||
                                p.recurrence_type ||
                                ""
                              ).toUpperCase() === form.type
                          )
                          .map((p) => {
                            const id = String(
                              p.recurrenceId || p.recurrence_id || p.id || ""
                            );
                            const label =
                              (
                                p.recurrenceType ||
                                p.recurrence_type ||
                                ""
                              ).toUpperCase() === "DAILY"
                                ? `Daily — every ${
                                    p.intervalDays ?? p.interval_days ?? "?"
                                  } day(s)`
                                : `Weekly — ${
                                    p.dayOfWeek || p.day_of_week || p.day || ""
                                  }`;
                            return (
                              <option key={id} value={id}>
                                {label}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  )}
                  {/* Instead of manual interval / days controls, require choosing an existing pattern for DAILY/WEEKLY */}
                  {(form.type === "DAILY" || form.type === "WEEKLY") && (
                    <div className="mt-2">
                      {selectedPatternId ? (
                        (() => {
                          const p = patterns.find(
                            (x) =>
                              String(
                                x.recurrenceId || x.recurrence_id || x.id
                              ) === selectedPatternId
                          );
                          if (!p)
                            return (
                              <div className="text-sm text-gray-500">
                                Selected pattern not found
                              </div>
                            );
                          const type = (
                            p.recurrenceType ||
                            p.recurrence_type ||
                            ""
                          ).toUpperCase();
                          return (
                            <div className="p-2 bg-base-200 border rounded text-sm">
                              <div className="font-medium">Using pattern:</div>
                              {type === "DAILY" ? (
                                <div>
                                  Daily — every{" "}
                                  {p.intervalDays ?? p.interval_days ?? "?"}{" "}
                                  day(s)
                                </div>
                              ) : (
                                <div>
                                  Weekly —{" "}
                                  {p.dayOfWeek || p.day_of_week || p.day || ""}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-sm text-yellow-600">
                          Please select an existing repeat pattern.
                        </div>
                      )}
                    </div>
                  )}
                  {/* name & description moved earlier to top of the form */}
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">Overwrite existing</span>
                      <input
                        type="checkbox"
                        className="toggle"
                        checked={form.overwrite}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            overwrite: e.target.checked,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="form-control">
                    {/* skipConflicts removed — behavior controlled by Overwrite toggle */}
                    <div className="text-sm text-gray-500">
                      Note: conflicts handling is determined by the Overwrite
                      option.
                    </div>
                  </div>

                  <div className="card-actions justify-end">
                    <button
                      className="btn"
                      onClick={handlePreview}
                      disabled={loading}
                    >
                      Preview
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleGenerate}
                      disabled={loading}
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Detail modal for a selected work schedule */}
            {detailModalOpen && selectedScheduleDetails && (
              <div className="modal modal-open">
                <div className="modal-box max-w-3xl">
                  <h3 className="font-bold text-lg mb-2">
                    {selectedScheduleDetails.name || "Work Schedule"}
                  </h3>
                  <div className="text-sm text-gray-600 mb-4">
                    {selectedScheduleDetails.description}
                  </div>
                  <div className="mb-3">
                    <strong>Range:</strong> {selectedScheduleDetails.startDate}{" "}
                    — {selectedScheduleDetails.endDate}
                  </div>
                  <div className="overflow-auto max-h-64 mb-4">
                    <table className="table table-compact w-full">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueShiftDates.map((d, idx) => (
                          <tr
                            key={`${selectedScheduleDetails.workScheduleId}-${d}`}
                          >
                            <td>{idx + 1}</td>
                            <td>{d}</td>
                            <td>
                              <button
                                className="btn btn-xs btn-warning"
                                onClick={async () => {
                                  const ok = window.confirm(
                                    `Delete date ${d} from this work schedule? Future shifts will be removed; past shifts will be unlinked.`
                                  );
                                  if (!ok) return;
                                  try {
                                    const res =
                                      await removeDateFromWorkSchedule(
                                        selectedScheduleDetails.workScheduleId,
                                        d,
                                        userInfo.token
                                      );
                                    const data = res.data || res;
                                    toast.success(
                                      `Deleted ${data.deleted || 0}, unlinked ${
                                        data.unlinked || 0
                                      }`
                                    );
                                    // refresh details and schedules list
                                    const rd = await getWorkScheduleDetails(
                                      selectedScheduleDetails.workScheduleId,
                                      userInfo.token
                                    );
                                    const sd = rd.data || rd;
                                    setSelectedScheduleDetails(sd);
                                    const wr =
                                      await getWorkSchedulesWithRecurrence(
                                        userInfo.token
                                      );
                                    const arr = wr?.data || wr || [];
                                    arr.sort((a, b) => {
                                      const da = new Date(
                                        a.createdAt ||
                                          a.created_at ||
                                          a.startDate ||
                                          0
                                      );
                                      const db = new Date(
                                        b.createdAt ||
                                          b.created_at ||
                                          b.startDate ||
                                          0
                                      );
                                      return db - da;
                                    });
                                    setSchedulesWithRecurrence(arr);
                                  } catch (e) {
                                    const msg =
                                      e?.response?.data?.message ||
                                      e?.message ||
                                      "Delete failed";
                                    toast.error(msg);
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="modal-action">
                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-error"
                        onClick={async () => {
                          const ok = window.confirm(
                            "Delete this work schedule? Future shifts will be removed; past shifts will be kept and unlinked. This cannot be undone."
                          );
                          if (!ok) return;
                          try {
                            const res = await deleteWorkSchedule(
                              selectedScheduleDetails.workScheduleId,
                              userInfo.token
                            );
                            const data = res.data || res;
                            toast.success(
                              `Deleted: ${
                                data.deletedFutureShifts || 0
                              } future shifts; unlinked ${
                                data.unlinkedPastShifts || 0
                              } past shifts.`
                            );
                            setDetailModalOpen(false);
                            setSelectedScheduleDetails(null);
                            // refresh list
                            const wr = await getWorkSchedulesWithRecurrence(
                              userInfo.token
                            );
                            const arr = wr?.data || wr || [];
                            arr.sort((a, b) => {
                              const da = new Date(
                                a.createdAt || a.created_at || a.startDate || 0
                              );
                              const db = new Date(
                                b.createdAt || b.created_at || b.startDate || 0
                              );
                              return db - da;
                            });
                            setSchedulesWithRecurrence(arr);
                          } catch (e) {
                            const msg =
                              e?.response?.data?.message ||
                              e?.message ||
                              "Delete failed";
                            toast.error(msg);
                          }
                        }}
                      >
                        Delete
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          setDetailModalOpen(false);
                          setSelectedScheduleDetails(null);
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <div className="card bg-base-100 shadow mb-4">
                <div className="card-body">
                  <h2 className="card-title">Preview / Results</h2>
                  {!previewResults ? (
                    <div className="text-sm text-gray-500">No preview yet</div>
                  ) : (
                    <div>
                      {/* Summary: show name, description and date range/anchor */}
                      <div className="mb-3 p-3 bg-base-200 border rounded text-sm">
                        <div className="font-medium mb-1">
                          Generation summary
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <strong>Name:</strong> {form.name || "-"}
                          </div>
                          <div>
                            <strong>Anchor:</strong> {form.anchorDate || "-"}
                          </div>
                          <div className="md:col-span-2">
                            <strong>Description:</strong>{" "}
                            {form.description || "-"}
                          </div>
                          <div>
                            <strong>Start date:</strong> {form.startDate || "-"}
                          </div>
                          <div>
                            <strong>End date:</strong> {form.endDate || "-"}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm">
                        Total candidates:{" "}
                        {previewResults.totalCount ??
                          (previewResults.candidates
                            ? previewResults.candidates.length
                            : "-")}
                      </div>
                      <div className="overflow-x-auto mt-3">
                        <table className="table table-compact w-full">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(previewResults.candidates || []).map((c, idx) => {
                              const date = typeof c === "string" ? c : c.date;
                              // normalize date-only comparison
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              let isPast = false;
                              try {
                                const d = new Date(date);
                                d.setHours(0, 0, 0, 0);
                                isPast = d <= today;
                              } catch (ex) {
                                isPast = false;
                              }
                              const hasConflict =
                                typeof c === "string" ? false : !!c.hasConflict;
                              const status = isPast
                                ? "past"
                                : hasConflict
                                ? "conflict"
                                : "success";
                              return (
                                <tr key={date || idx}>
                                  <td>{date}</td>
                                  <td>{status}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h2 className="card-title">History</h2>
                  {/* Show generation runs and work schedules linked to recurrence patterns */}
                  <div className="mb-3">
                    <div className="text-sm font-medium mb-2">
                      Work schedules linked to patterns
                    </div>
                    {schedulesWithRecurrence.length === 0 ? (
                      <div className="text-sm text-gray-500">
                        No linked work schedules
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="table table-compact w-full">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Description</th>
                              <th>Start</th>
                              <th>End</th>
                            </tr>
                          </thead>
                          <tbody>
                            {schedulesWithRecurrence.map((s) => (
                              <tr
                                key={s.workScheduleId}
                                className="cursor-pointer hover:bg-base-200"
                                onClick={async () => {
                                  try {
                                    const res = await getWorkScheduleDetails(
                                      s.workScheduleId,
                                      userInfo.token
                                    );
                                    const data = res.data || res;
                                    setSelectedScheduleDetails(data);
                                    setDetailModalOpen(true);
                                  } catch (e) {
                                    const msg =
                                      e?.response?.data?.message ||
                                      e?.message ||
                                      "Failed to load details";
                                    toast.error(msg);
                                  }
                                }}
                              >
                                <td>{s.name}</td>
                                <td className="truncate max-w-xs">
                                  {s.description}
                                </td>
                                <td>{s.startDate}</td>
                                <td>{s.endDate}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default GenerateFromPattern;
