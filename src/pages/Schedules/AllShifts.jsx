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

  return (
    <>
      <Header />
      <div className="min-h-screen bg-base-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">All Shifts</h1>
              <p className="text-sm text-gray-500">
                {shifts.length} total shifts
              </p>
            </div>
            <div className="flex gap-2 items-center">
              {/* date picker removed: All Shifts are templates (no date selection here) */}
              <input
                className="input input-bordered"
                placeholder="Search shifts"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select
                className="select select-bordered"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Sort: Name</option>
                <option value="start">Sort: Start time</option>
              </select>
              <button
                className="btn"
                onClick={() => navigate("/admin/schedules")}
              >
                Back to Schedules
              </button>
              <button
                className="btn btn-primary"
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
            <div className="flex flex-col items-center justify-center h-64">
              <img src={emptyBox} alt="No shifts" className="w-24 h-24 mb-4" />
              <p className="text-lg text-gray-600">No shifts found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sorted.map((s) => {
                const hasOccurrence = occurrencesMap[s.shiftId] === true;
                // show green background for shifts that have been added to any date
                // (override canceled styling so used templates are obvious)
                // stronger green treatment for used templates: left accent + stronger background
                const cardClass = hasOccurrence
                  ? "card bg-green-100 border-l-4 border-green-600 shadow hover:shadow-lg transition-shadow duration-200"
                  : !s.isActive
                  ? "card bg-red-50 shadow hover:shadow-lg transition-shadow duration-200"
                  : "card bg-base-100 shadow hover:shadow-lg transition-shadow duration-200";
                return (
                  <div key={s.shiftId} className={cardClass}>
                    <div className="card-body flex flex-col min-h-[240px]">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="card-title text-lg font-semibold">
                            {s.shiftName}
                          </h2>
                          <div className="text-xs text-gray-500">
                            ID: {s.shiftId}
                          </div>
                        </div>
                        <div>
                          {!s.isActive ? (
                            <span className="badge badge-error">Canceled</span>
                          ) : hasOccurrence ? (
                            <span className="badge badge-primary">Added</span>
                          ) : (
                            <span className="badge badge-success">Active</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-sm flex items-center gap-2">
                        <span className="px-2 py-1 rounded-md bg-white border border-gray-200 text-sm text-gray-700">
                          {s.startTime}
                        </span>
                        <span className="px-2 py-1 rounded-md bg-white border border-gray-200 text-sm text-gray-700">
                          {s.endTime}
                        </span>
                      </div>
                      {s.description && (
                        <p className="mt-2 text-sm line-clamp-2">
                          {s.description}
                        </p>
                      )}

                      <div className="mt-3">
                        <div className="text-sm font-semibold mb-1">
                          Required
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[48px] items-start content-start">
                          {Array.isArray(rulesByShift[s.shiftId]) &&
                          rulesByShift[s.shiftId].length > 0 ? (
                            rulesByShift[s.shiftId]
                              .filter(
                                (r) => r.isAllowed && (r.requiredCount || 0) > 0
                              )
                              .map((r) => (
                                <span
                                  key={`${s.shiftId}-${r.positionId}`}
                                  className="badge badge-md bg-gray-200 text-gray-800 px-3 py-2"
                                >
                                  {r.positionName}: {r.requiredCount}
                                </span>
                              ))
                          ) : (
                            <span className="text-sm text-gray-600">-</span>
                          )}
                        </div>
                      </div>

                      <div className="card-actions justify-end items-center mt-auto pt-4 border-t">
                        <div className="flex gap-2">
                          {/* hide Edit when shift has occurrences; allow Delete in all cases */}
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
                            onClick={async () => {
                              if (!window.confirm("Delete this shift?")) return;
                              try {
                                await deleteShift(s.shiftId, userInfo.token);
                                toast.success("Deleted");
                                load();
                              } catch {
                                toast.error("Delete failed");
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default AllShifts;
