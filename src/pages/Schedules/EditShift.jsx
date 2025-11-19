import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  getShiftById,
  updateShift,
  getPositionRules,
} from "../../utils/dataProvider/schedule";
import { getPositions } from "../../utils/dataProvider/admin";
import SpinnerInput from "../../components/SpinnerInput";
import toast from "react-hot-toast";

function EditShift() {
  const navigate = useNavigate();
  const { shiftId } = useParams();
  const userInfo = useSelector((state) => state.userInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    shiftName: "",
    startTime: "",
    endTime: "",
    description: "",
  });
  const [positions, setPositions] = useState([]);
  const [requiredCounts, setRequiredCounts] = useState({});
  const [isConfirmUpdateOpen, setIsConfirmUpdateOpen] = useState(false);

  useEffect(() => {
    loadShiftData();
  }, [shiftId]);

  const loadShiftData = async () => {
    try {
      setIsLoadingData(true);
      const response = await getShiftById(shiftId);
      const shift = response.data;

      setFormData({
        shiftName: shift.shiftName || "",
        startTime: shift.startTime || "",
        endTime: shift.endTime || "",
        description: shift.description || "",
      });
      try {
        const [allPosRes, rr] = await Promise.all([
          getPositions(userInfo.token),
          getPositionRules(shiftId),
        ]);
        const allPositions = allPosRes?.data || [];
        const rules = rr?.data || [];
        const ruleMap = new Map(rules.map((r) => [r.positionId, r]));
        setPositions(
          allPositions.map((p) => ({
            positionId: p.positionId,
            positionName: p.positionName,
          }))
        );
        const counts = {};
        allPositions.forEach((p) => {
          const r = ruleMap.get(p.positionId);
          counts[p.positionId] = r ? r.requiredCount || 0 : 0;
        });
        setRequiredCounts(counts);
      } catch {}
    } catch (err) {
      toast.error("Failed to load shift data");
      navigate("/admin/schedules");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // THAY THẾ HÀM handleSubmit CŨ BẰNG HÀM NÀY
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Giữ lại toàn bộ phần kiểm tra (validation)
    if (!formData.shiftName || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.startTime >= formData.endTime) {
      toast.error("End time must be after start time");
      return;
    }

    const totalRequired = Object.values(requiredCounts || {}).reduce(
      (a, b) => a + (Number(b) || 0),
      0
    );
    if (totalRequired < 1) {
      toast.error("Shift must have at least one employee");
      return;
    }

    // 2. Xóa bỏ window.confirm và logic 'try...catch'
    // Thay vào đó, chỉ cần mở modal
    setIsConfirmUpdateOpen(true);
  };

  if (isLoadingData) {
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

  const handleConfirmUpdate = async () => {
    // Đóng modal và bật loading
    setIsConfirmUpdateOpen(false);
    setIsLoading(true);

    try {
      // --- Logic này được copy từ handleSubmit ---
      const payload = {
        ...formData,
        positionRules: Object.entries(requiredCounts || {}).map(
          ([positionId, count]) => ({
            positionId: Number(positionId),
            requiredCount: Number(count || 0),
          })
        ),
      };
      await updateShift(shiftId, payload, userInfo.token);
      toast.success("Shift updated successfully");
      navigate("/admin/shifts");
      // --- Kết thúc logic copy ---
    } catch (err) {
      console.error("Update shift error:", err);
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      toast.error(serverMsg || "Failed to update shift");
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
                <h1 className="card-title text-2xl mb-6">Edit Shift</h1>

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
                      {isLoading ? "Updating..." : "Update Shift"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* --- THÊM MODAL XÁC NHẬN TẠI ĐÂY --- */}
      {isConfirmUpdateOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Confirm Update</h3>
            <p className="py-4">Are you sure you want to update this shift?</p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setIsConfirmUpdateOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmUpdate} // Gọi hàm update
              >
                Yes, Update
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

export default EditShift;
