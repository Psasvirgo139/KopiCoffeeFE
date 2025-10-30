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
      alert("Request failed: " + (err.response?.data?.message || err.message));
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
                    <div key={idx} className="p-4 rounded-xl border bg-white shadow-sm">
                      <button
                        className="w-full flex items-center justify-between"
                        onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                      >
                        <h3 className="text-lg font-semibold text-left">{it.name}</h3>
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
                        <p className="text-xs text-gray-500 mb-2">
                          Trending drink with {it.totalVideos} videos
                        </p>
                        <p className="text-xs text-gray-500 mb-2">Source video (theo độ viral):</p>
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
