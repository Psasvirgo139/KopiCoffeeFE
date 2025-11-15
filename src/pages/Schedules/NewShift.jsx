import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { createShift } from "../../utils/dataProvider/schedule";
import { getPositions } from "../../utils/dataProvider/admin";
import toast from "react-hot-toast";
import SpinnerInput from "../../components/SpinnerInput";

function NewShift() {
  const navigate = useNavigate();
  const userInfo = useSelector((state) => state.userInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState(null);
  const [formData, setFormData] = useState({
    shiftName: "",
    startTime: "",
    endTime: "",
    description: "",
  });
  const [positions, setPositions] = useState([]);
  const [requiredCounts, setRequiredCounts] = useState({});
  const location = useLocation();

  useEffect(() => {
    // If a date was passed as a query parameter (from Schedules page), pre-fill
    // the workScheduleStartDate so backend will create a single-day WorkSchedule
    // and associate the shift to that date.
    const params = new URLSearchParams(location.search);
    const date = params.get("date");
    if (date) {
      setFormData((prev) => ({ ...prev, workScheduleStartDate: date }));
    }
    // load positions for requirements
    (async () => {
      try {
        const res = await getPositions(userInfo.token);
        setPositions(res.data || []);
      } catch {}
    })();
  }, [location.search]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.shiftName || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.startTime >= formData.endTime) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      setIsLoading(true);
      // validate at least one employee required
      const totalRequired = Object.values(requiredCounts || {}).reduce(
        (a, b) => a + (Number(b) || 0),
        0
      );
      if (totalRequired < 1) {
        toast.error("Shift must have at least one employee");
        setIsLoading(false);
        return;
      }
      // Build payload including positionRules (single request)
      const payload = {
        ...formData,
        positionRules: Object.entries(requiredCounts || {}).map(
          ([positionId, count]) => ({
            positionId: Number(positionId),
            requiredCount: Number(count || 0),
          })
        ),
        // explicitly mark as active on create to be explicit (server defaults to true if omitted)
        active: true,
      };
      const res = await createShift(payload, userInfo.token);
      toast.success("Shift created successfully");
      navigate("/admin/shifts");
    } catch (err) {
      // Show more detailed error when available to help debugging
      console.error("Create shift error:", err);
      setLastErrorMessage(err);
      // Prefer server-provided message, but ensure we pass a string to toast
      let serverMessage =
        err?.response?.data?.message ?? err?.response?.data ?? err?.message;
      if (typeof serverMessage === "object") {
        try {
          serverMessage = JSON.stringify(serverMessage);
        } catch (e) {
          serverMessage = String(serverMessage);
        }
      }
      toast.error(serverMessage || "Failed to create shift");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />

      <div className="min-h-screen bg-base-200">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h1 className="card-title text-2xl mb-6">Create New Shift</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Shift Name *</span>
                    </label>
                    <input
                      type="text"
                      name="shiftName"
                      value={formData.shiftName}
                      onChange={handleInputChange}
                      className="input input-bordered"
                      placeholder="e.g., Morning Shift, Evening Shift"
                      required
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h2 className="font-semibold mb-2">
                      Required counts by position
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {positions.map((p) => (
                        <div key={p.positionId} className="form-control">
                          <label className="label">
                            <span className="label-text">{p.positionName}</span>
                          </label>
                          <SpinnerInput
                            value={requiredCounts[p.positionId] || 0}
                            min={0}
                            max={9}
                            widthClass="w-20"
                            onChange={(v) =>
                              setRequiredCounts((rc) => ({
                                ...rc,
                                [p.positionId]: v,
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Positions with required count = 0 will be blocked
                      (is_allowed = 0).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Start Time *</span>
                      </label>
                      <input
                        type="time"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleInputChange}
                        className="input input-bordered"
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">End Time *</span>
                      </label>
                      <input
                        type="time"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleInputChange}
                        className="input input-bordered"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Description</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="textarea textarea-bordered"
                      placeholder="Optional description for this shift"
                      rows={3}
                    />
                  </div>

                  <div className="card-actions justify-end">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => navigate("/admin/shifts")}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating..." : "Create Shift"}
                    </button>
                  </div>
                  {lastErrorMessage && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700">
                      <div className="font-semibold mb-1">
                        Error details (for debugging):
                      </div>
                      <pre className="whitespace-pre-wrap break-words text-xs">
                        {JSON.stringify(
                          lastErrorMessage?.response?.data ||
                            lastErrorMessage?.message ||
                            lastErrorMessage
                        )}
                      </pre>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default NewShift;
