import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  getRecurrencePatterns,
  createRecurrencePattern,
  updateRecurrencePattern,
  deleteRecurrencePattern,
} from "../../utils/dataProvider/schedule";
import toast from "react-hot-toast";

function RecurrencePatterns() {
  const userInfo = useSelector((s) => s.userInfo);
  const [patterns, setPatterns] = useState([]);
  const [form, setForm] = useState({
    recurrenceType: "WEEKLY",
    // for WEEKLY allow selecting a single day token
    dayOfWeek: "MON",
    intervalDays: "1",
  });
  const WEEKDAYS = [
    { key: "MON", label: "Mon" },
    { key: "TUE", label: "Tue" },
    { key: "WED", label: "Wed" },
    { key: "THU", label: "Thu" },
    { key: "FRI", label: "Fri" },
    { key: "SAT", label: "Sat" },
    { key: "SUN", label: "Sun" },
  ];

  // Single-day selection for WEEKLY: store a single token like 'MON'
  const controller = useMemo(() => new AbortController(), []);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await getRecurrencePatterns(controller, userInfo?.token);
      setPatterns(res.data || []);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.detail ||
        "Failed to load patterns";
      toast.error(msg);
      console.error("getRecurrencePatterns failed:", e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Build payload with correct types
      const payload = {
        recurrenceType: form.recurrenceType,
      };
      // Prevent duplicate weekly day(s) on the client by checking loaded patterns
      if (form.recurrenceType === "WEEKLY") {
        // Single day selection for weekly patterns
        const exists = (patterns || []).some(
          (p) =>
            (p.recurrenceType || "").toLowerCase() === "weekly" &&
            String(p.dayOfWeek || "").toLowerCase() ===
              String(form.dayOfWeek || "").toLowerCase()
        );
        if (exists) {
          toast.error("sample already exists");
          return;
        }
        payload.dayOfWeek = form.dayOfWeek || "";
      } else {
        payload.intervalDays = Number(form.intervalDays || 1);
      }

      if (form.recurrenceId) {
        await updateRecurrencePattern(
          form.recurrenceId,
          payload,
          userInfo.token
        );
        toast.success("Updated");
      } else {
        await createRecurrencePattern(payload, userInfo.token);
        toast.success("Created");
      }
      setForm({
        recurrenceType: "WEEKLY",
        dayOfWeek: "MON",
        intervalDays: "1",
      });
      load();
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Create failed";
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this recurrence pattern?")) return;
    try {
      await deleteRecurrencePattern(id, userInfo.token);
      toast.success("Deleted");
      load();
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Delete failed";
      toast.error(msg);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-base-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
              Recurrence Pattern Management
            </h1>
            <div>
              <button
                className="btn"
                onClick={() => navigate("/admin/schedules")}
              >
                Back to Schedules
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title">Create recurrence pattern</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">
                      <span className="label-text">Recurrence type</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
                      value={form.recurrenceType}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          recurrenceType: e.target.value,
                        }))
                      }
                    >
                      <option value="DAILY">DAILY</option>
                      <option value="WEEKLY">WEEKLY</option>
                    </select>
                  </div>
                  {form.recurrenceType === "WEEKLY" ? (
                    <div>
                      <label className="label">
                        <span className="label-text">Days of week</span>
                      </label>
                      <div>
                        <select
                          className="select select-bordered w-full"
                          value={form.dayOfWeek}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              dayOfWeek: e.target.value,
                            }))
                          }
                        >
                          {WEEKDAYS.map((d) => (
                            <option key={d.key} value={d.key}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-gray-500 mt-2">
                          Selected: {form.dayOfWeek || "-"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="label">
                        <span className="label-text">Interval days</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        className="input input-bordered w-full"
                        value={form.intervalDays || ""}
                        onChange={(e) => {
                          const digits = (e.target.value || "").replace(
                            /\D/g,
                            ""
                          );
                          setForm((f) => ({ ...f, intervalDays: digits }));
                        }}
                      />
                    </div>
                  )}
                  <div className="card-actions justify-end">
                    <button className="btn btn-primary" type="submit">
                      Create pattern
                    </button>
                  </div>
                </form>
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title">Existing patterns</h2>
                {/* Compact grid with max height and scroll to avoid long vertical page */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-auto">
                  {patterns
                    .slice()
                    .sort((a, b) => {
                      const ta = (a.recurrenceType || "").toUpperCase();
                      const tb = (b.recurrenceType || "").toUpperCase();
                      if (ta < tb) return -1;
                      if (ta > tb) return 1;
                      return 0;
                    })
                    .map((p) => (
                      <div
                        key={p.recurrenceId}
                        className="flex items-center justify-between p-2 border rounded text-sm"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {(p.recurrenceType || "").toUpperCase()}
                          </div>
                          <div className="text-xs text-gray-600">
                            {(p.recurrenceType || "").toUpperCase() === "WEEKLY"
                              ? p.dayOfWeek || ""
                              : `Every ${p.intervalDays || 1} day(s)`}
                          </div>
                        </div>
                        <button
                          className="btn btn-xs btn-error"
                          onClick={() => handleDelete(p.recurrenceId)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
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

export default RecurrencePatterns;
