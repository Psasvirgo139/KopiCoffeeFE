import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  getShifts,
  deleteShift,
  setShiftActive,
  getPositionRules,
  getShiftHasOccurrence,
} from "../../utils/dataProvider/schedule";
import emptyBox from "../../assets/images/empty.svg";
import toast from "react-hot-toast";

function AllShifts() {
  const navigate = useNavigate();
  const userInfo = useSelector((s) => s.userInfo);
  const [isLoading, setIsLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const controller = useMemo(() => new AbortController(), []);
  const [rulesByShift, setRulesByShift] = useState({});
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState(null);
  // map shiftId -> boolean (exists on any date)
  const [occurrencesMap, setOccurrencesMap] = useState({});
  const controller2 = useMemo(() => new AbortController(), []);

  const loadOccurrences = async (shiftList) => {
    try {
      const pairs = await Promise.all(
        shiftList.map(async (s) => {
          try {
            const rr = await getShiftHasOccurrence(s.shiftId, controller2);
            return [s.shiftId, rr?.data?.hasOccurrence === true];
          } catch (e) {
            return [s.shiftId, false];
          }
        })
      );
      const map = {};
      pairs.forEach(([k, v]) => (map[k] = v));
      setOccurrencesMap(map);
    } catch (e) {
      setOccurrencesMap({});
    }
  };

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await getShifts({}, controller);
      const list = res.data || [];
      setShifts(list);
      try {
        const pairs = await Promise.all(
          list.map(async (s) => {
            try {
              const rr = await getPositionRules(s.shiftId, controller);
              return [s.shiftId, rr?.data || []];
            } catch {
              return [s.shiftId, []];
            }
          })
        );
        const map = {};
        pairs.forEach(([k, v]) => {
          map[k] = v;
        });
        setRulesByShift(map);
      } catch {}
      // load occurrence flags for all shifts
      loadOccurrences(list);
    } catch (e) {
      toast.error("Failed to load shifts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = shifts.filter((s) => {
    if (!q) return true;
    const t = (q || "").toLowerCase();
    return (
      (s.shiftName || "").toLowerCase().includes(t) ||
      (s.description || "").toLowerCase().includes(t)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name")
      return (a.shiftName || "").localeCompare(b.shiftName || "");
    if (sortBy === "start")
      return (a.startTime || "").localeCompare(b.startTime || "");
    return 0;
  });

  // Hàm này để định dạng thời gian (HH:mm)
  const formatTime = (timeStr) => {
    if (!timeStr || timeStr === "--") return "--";
    return timeStr.substring(0, 5);
  };

  // Hàm này xử lý logic xóa (copy từ nút "Delete" cũ)
  const handleConfirmDelete = async () => {
    if (!shiftToDelete) return;
    try {
      await deleteShift(shiftToDelete.shiftId, userInfo.token);
      toast.success("Deleted");
      load(); // Tải lại danh sách
    } catch {
      toast.error("Delete failed");
    } finally {
      setIsConfirmDeleteOpen(false);
      setShiftToDelete(null);
    }
  };

  return (
    <>
      <Header />
      {/* Cập nhật: Layout & Theme */}
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          {/* Cập nhật: Header của trang */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">
                All Shifts
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {shifts.length} total shift templates
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                className="input input-bordered input-sm w-full md:w-auto"
                placeholder="Search shifts..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select
                className="select select-bordered select-sm w-full md:w-auto"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Sort: Name</option>
                <option value="start">Sort: Start time</option>
              </select>
              <button
                className="btn btn-sm"
                onClick={() => navigate("/admin/schedules")}
              >
                Back to Schedules
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => navigate("/admin/schedules/new")}
              >
                Create New Shift
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <img src={emptyBox} alt="No shifts" className="w-24 h-24 mb-4" />
              <p className="text-lg font-semibold text-slate-700">
                No shifts found
              </p>
              <p className="text-sm text-slate-500">
                {q
                  ? "Try adjusting your search."
                  : "Get started by creating a new shift."}
              </p>
            </div>
          ) : (
            // --- THAY ĐỔI: TỪ GRID SANG LIST ---
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {sorted.map((s) => {
                const hasOccurrence = occurrencesMap[s.shiftId] === true;
                // Tô màu nền hàng (row) dựa trên trạng thái
                const rowClass = !s.isActive // ƯU TIÊN 1: Nếu bị hủy
                  ? "bg-rose-50" // Luôn là màu đỏ
                  : hasOccurrence // ƯU TIÊN 2: Nếu đã được thêm
                  ? "bg-emerald-50" // Thì màu xanh
                  : "bg-slate-100"; // CÒN LẠI: Màu xám (mới, chưa dùng)

                return (
                  // --- Đây là một hàng (list item) ---
                  <div
                    key={s.shiftId}
                    className={`${rowClass} flex flex-col md:flex-row gap-4 p-4 border-b border-slate-200 last:border-b-0`}
                  >
                    {/* --- Cột 1: Thông tin Ca --- */}
                    <div className="flex-grow">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-slate-800">
                          {s.shiftName}
                        </h2> 
                      </div>

                      <div className="text-sm font-medium text-slate-600 mt-1">
                        {formatTime(s.startTime)} - {formatTime(s.endTime)}
                      </div>

                      {s.description && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                          {s.description}
                        </p>
                      )}

                      <div className="text-xs font-mono text-slate-400 mt-1">
                        ID: {s.shiftId}
                      </div>
                    </div>

                    {/* --- Cột 2: Chức vụ yêu cầu --- */}
                    <div className="flex-shrink-0 w-full md:w-auto md:max-w-xs">
                      <div className="text-xs font-semibold text-slate-600 mb-2">
                        REQUIRED POSITIONS
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(rulesByShift[s.shiftId]) &&
                        rulesByShift[s.shiftId].length > 0 &&
                        rulesByShift[s.shiftId].some(r => r.isAllowed && (r.requiredCount || 0) > 0) ? (
                          rulesByShift[s.shiftId]
                            .filter(
                              (r) => r.isAllowed && (r.requiredCount || 0) > 0
                            )
                            .map((r) => (
                              <span
                                key={`${s.shiftId}-${r.positionId}`}
                                className="badge badge-sm badge-info badge-outline"
                              >
                                {r.positionName}: {r.requiredCount}
                              </span>
                            ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            None
                          </span>
                        )}
                      </div>
                    </div>

                    {/* --- Cột 3: Nút bấm --- */}
                    <div className="flex-shrink-0 flex flex-row md:flex-col gap-2 items-start md:items-end justify-start pt-2 md:pt-0">
                      {!hasOccurrence && (
                        <button
                          className="btn btn-xs btn-outline"
                          onClick={() =>
                            navigate(`/admin/shifts/${s.shiftId}/edit`)
                          }
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="btn btn-xs btn-error"
                        // Cập nhật: Mở modal thay vì window.confirm
                        onClick={() => {
                          setShiftToDelete(s);
                          setIsConfirmDeleteOpen(true);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  // --- Hết một hàng ---
                );
              })}
            </div>
            // --- KẾT THÚC LIST ---
          )}
        </div>
      </div>
      <Footer />

      {/* --- THÊM MODAL XÁC NHẬN XÓA --- */}
      {isConfirmDeleteOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">
              Confirm Shift Deletion
            </h3>
            <p className="py-4">
              Are you sure you want to delete this shift template? This action
              cannot be undone.
            </p>
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => {
                  setIsConfirmDeleteOpen(false);
                  setShiftToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleConfirmDelete} // Gọi hàm xử lý xóa
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AllShifts;
