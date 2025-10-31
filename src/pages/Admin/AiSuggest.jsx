import React, { useState, useRef } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useSelector } from "react-redux";
import { getTrendingDishes } from "../../utils/dataProvider/ai";
import useDocumentTitle from "../../utils/documentTitle";

const Pill = ({ children }) => (
  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs mr-2">{children}</span>
);

export default function AiSuggest() {
  useDocumentTitle("AI Product Suggestions");
  const userInfo = useSelector((s) => s.userInfo);
  const [days, setDays] = useState(30);
  const [maxResults, setMaxResults] = useState(30);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const abortRef = useRef(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const params = {
        days: Number(days),
        maxResults: Number(maxResults),
        shortsOnly: true, // chỉ lấy YouTube Shorts
      };
      const res = await getTrendingDishes(params, userInfo.token, abortRef.current);
      setData(res);
      setExpandedIndex(null);
    } catch (err) {
      console.error(err);
      
      // Xử lý lỗi quota exceeded đặc biệt
      if (err.response?.status === 429 && err.response?.data?.error === 'QUOTA_EXCEEDED') {
        const { message, resetTime } = err.response.data;
        alert(`⚠️ ${message}\n\nQuota sẽ được reset sau: ${resetTime}\n\nGợi ý: Tạo API key mới hoặc chờ đến khi quota reset.`);
      } else {
        alert("Request failed: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-4">Gợi ý về các đồ uống hot trend hiện nay</h1>

        <form onSubmit={onSubmit} className="flex gap-3 items-end bg-gray-50 p-4 rounded-xl border">
          <div>
            <label className="block text-sm font-medium mb-1">Days</label>
            <input type="number" className="input input-bordered w-full" value={days} onChange={e=>setDays(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Results</label>
            <input type="number" className="input input-bordered w-full" value={maxResults} onChange={e=>setMaxResults(e.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Đang tìm..." : "Tìm kiếm"}
          </button>
        </form>

        <div className="mt-6">
          {!data && <p className="text-gray-500">Bấm &quot;Tìm kiếm&quot; để nhận được những gợi ý về các món nước hot trend hiện nay</p>}
          {data && (
            <>
              <div className="space-y-4">
                {(data.data || []).sort((a,b)=>b.topScore - a.topScore).map((it, idx) => {
                  // Videos đã được sort theo viralScore từ backend
                  const videos = it.videos || [];
                  
                  return (
                    <div key={idx} className="p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow">
                      <button
                        className="w-full flex items-center justify-between"
                        onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                      >
                        <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-left">{it.name}</h3>
                          {/* Rating (1-5 sao) */}
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${i < Math.floor(it.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="text-xs text-gray-600 ml-1">{(it.rating || 0).toFixed(1)}</span>
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 transition-transform ${expandedIndex === idx ? "rotate-180" : "rotate-0"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </button>

                      {expandedIndex === idx && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium text-gray-700 mb-2">Công thức cơ bản:</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {it.basicRecipe || "Chưa có công thức"}
                          </p>
                        </div>
                      )}

                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-500">
                            {it.totalVideos} videos
                          </span>
                          {/* Badge trending nếu rating >= 4.0 */}
                          {it.rating >= 4.0 && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-600">
                              🔥 HOT
                            </span>
                          )}
                          {/* Badge mới nếu có nhiều video */}
                          {it.totalVideos >= 5 && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-600">
                              ⭐ TRENDING
                            </span>
                          )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">Source video (theo độ viral):</p>
                      {videos.length === 0 ? (
                        <div className="px-4 py-3 rounded-lg bg-gray-50 border border-dashed border-gray-300">
                          <p className="text-sm text-gray-500 italic text-center">
                            📹 Không có video cụ thể
                          </p>
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {videos.slice(0, 5).map((v, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-xs text-gray-400 font-mono">#{i + 1}</span>
                              <div className="flex-1">
                              <a 
                                  className="text-sm link link-primary break-all block" 
                                  href={v.videoUrl} 
                                target="_blank" 
                                rel="noreferrer"
                              >
                                  {v.title || v.videoUrl}
                              </a>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {v.viewCount?.toLocaleString()} views • {v.likeCount?.toLocaleString()} likes
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
