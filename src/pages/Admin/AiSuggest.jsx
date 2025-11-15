import React, { useState, useRef, useMemo } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useSelector } from "react-redux";
import { getTrendingDishes } from "../../utils/dataProvider/ai";
import useDocumentTitle from "../../utils/documentTitle";

const Pill = ({ children }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
    {children}
  </span>
);

const StatCard = ({ label, value, suffix, highlight }) => (
  <div
    className={`rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md ${
      highlight ? "ring-1 ring-[#F97316]" : ""
    }`}
  >
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <div className="mt-2 flex items-baseline gap-1">
      <span className="text-2xl font-semibold text-slate-900">{value}</span>
      {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
    </div>
  </div>
);

const EmptyState = () => (
  <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 px-8 py-10 text-center shadow-inner">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl">
      🤖
    </div>
    <h2 className="mt-6 text-xl font-semibold text-slate-900">
      Beverage inspiration is waiting
    </h2>
    <p className="mt-2 text-sm text-slate-500">
      Choose a time range and number of results to let the AI surface the most
      buzzworthy drinks on social media.
    </p>
  </div>
);

const LoadingState = () => (
  <div className="grid gap-4 sm:grid-cols-2">
    {[...Array(4)].map((_, idx) => (
      <div
        key={idx}
        className="animate-pulse rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm"
      >
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="mt-3 flex gap-2">
          <div className="h-3 w-16 rounded bg-slate-100" />
          <div className="h-3 w-12 rounded bg-slate-100" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-2.5 w-full rounded bg-slate-100" />
          <div className="h-2.5 w-3/4 rounded bg-slate-100" />
          <div className="h-2.5 w-2/3 rounded bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
);

const RatingStars = ({ rating = 0 }) => (
  <div className="flex items-center gap-1">
    {[...Array(5)].map((_, i) => (
      <svg
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? "text-amber-400" : "text-slate-200"
        }`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
    <span className="text-xs font-medium text-slate-600">
      {rating.toFixed(1)}
    </span>
  </div>
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

  const sortedDishes = useMemo(() => {
    if (!data?.data) return [];
    return [...data.data].sort((a, b) => (b?.topScore || 0) - (a?.topScore || 0));
  }, [data]);

  const summary = useMemo(() => {
    if (!sortedDishes.length) {
      return {
        totalDishes: 0,
        totalVideos: 0,
        topRating: 0,
        avgEngagement: 0,
      };
    }

    const totalVideos = sortedDishes.reduce(
      (acc, item) => acc + (item.totalVideos || 0),
      0
    );
    const topRating = sortedDishes[0]?.rating || 0;
    const avgEngagement = sortedDishes.reduce((acc, item) => {
      const videos = item.videos || [];
      const views = videos.reduce((vAcc, v) => vAcc + (v.viewCount || 0), 0);
      return acc + views;
    }, 0);

    return {
      totalDishes: sortedDishes.length,
      totalVideos,
      topRating,
      avgEngagement: Math.round(
        avgEngagement / Math.max(sortedDishes.length, 1)
      ),
    };
  }, [sortedDishes]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setExpandedIndex(null);
    try {
      const params = {
        days: Number(days),
        maxResults: Number(maxResults),
        shortsOnly: true,
      };
      const res = await getTrendingDishes(
        params,
        userInfo.token,
        abortRef.current
      );
      setData(res);
    } catch (err) {
      console.error(err);

      if (
        err.response?.status === 429 &&
        err.response?.data?.error === "QUOTA_EXCEEDED"
      ) {
        const { message, resetTime } = err.response.data;
        alert(
          `⚠️ ${message}\n\nQuota will reset at: ${resetTime}\n\nTip: Create a new API key or wait until the quota refreshes.`
        );
      } else {
        alert("Request failed: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-amber-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 md:px-6 lg:px-10">
          <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="rounded-3xl bg-white/90 p-8 shadow-lg shadow-amber-100/40 ring-1 ring-slate-200 backdrop-blur">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100">
                  <span className="text-xl">✨</span>
                </div>
                <span className="text-sm font-semibold uppercase tracking-wide">
                  KopiCafe Insight Lab
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900 md:text-4xl">
                AI Suggestion Hub
              </h1>
              <p className="mt-3 text-base text-slate-500 md:max-w-xl">
                Discover fresh beverage ideas powered by continuously updated
                YouTube Shorts data. Select a time window and result count—our AI
                will spotlight the drinks that are blowing up right now.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Pill>#coffee-trends</Pill>
                <Pill>#signature-drinks</Pill>
                <Pill>#ai-curated</Pill>
                <Pill>#shorts-intelligence</Pill>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/60 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Search filters
                </h2>
                <span className="text-xs font-medium uppercase tracking-wide text-amber-500">
                  Real-time AI
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Adjust the parameters to fine-tune both the accuracy and diversity
                of the recommendations.
              </p>

              <form
                onSubmit={onSubmit}
                className="mt-6 grid gap-4 sm:grid-cols-2"
              >
                <label className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/80 p-4 transition hover:border-amber-300 hover:shadow-md">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Monitoring window (days)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    className="input input-bordered w-full border-slate-200 bg-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                  />
                  <span className="text-[11px] text-slate-400">
                    Number of days the AI reviews viral performance
                  </span>
                </label>

                <label className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/80 p-4 transition hover:border-amber-300 hover:shadow-md">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Maximum suggestions
                  </span>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    className="input input-bordered w-full border-slate-200 bg-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    value={maxResults}
                    onChange={(e) => setMaxResults(e.target.value)}
                  />
                  <span className="text-[11px] text-slate-400">
                    Limit the total number of ideas returned
                  </span>
                </label>

                <button
                  type="submit"
                  className="btn btn-primary h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 sm:col-span-2"
                  disabled={loading}
                >
                  {loading ? "Analyzing..." : "Explore trends"}
                </button>
              </form>
            </div>
          </section>

          {!!sortedDishes.length && (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Suggested drinks" value={summary.totalDishes} />
              <StatCard
                label="Total videos"
                value={summary.totalVideos.toLocaleString()}
              />
              <StatCard
                label="Highest rating"
                value={summary.topRating.toFixed(1)}
                suffix="/5.0"
                highlight
              />
              <StatCard
                label="Average views"
                value={
                  summary.avgEngagement
                    ? summary.avgEngagement.toLocaleString()
                    : "0"
                }
                suffix="views"
              />
            </section>
          )}

          <section className="space-y-6">
            {loading && <LoadingState />}
            {!loading && !sortedDishes.length && <EmptyState />}

            {!loading && sortedDishes.length > 0 && (
              <div className="space-y-5">
                {sortedDishes.map((item, idx) => {
                  const videos = item.videos || [];
                  const isExpanded = expandedIndex === idx;
                  const highRating = (item.rating || 0) >= 4.2;
                  const highVideos = (item.totalVideos || 0) >= 8;

                  return (
                    <article
                      key={idx}
                      className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-slate-200/50 transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-xl"
                    >
                      <header
                        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                        onClick={() =>
                          setExpandedIndex(isExpanded ? null : idx)
                        }
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold text-slate-900">
                              {item.name}
                            </h3>
                            {highRating && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                                🔥 Hot Pick
                              </span>
                            )}
                            {highVideos && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                                📈 High reach
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span>
                              {item.totalVideos || 0} tracked videos •{" "}
                              {item.topScore?.toFixed(1) || "0.0"} top score
                            </span>
                            <RatingStars rating={item.rating || 0} />
                          </div>
                        </div>

                        <button
                          type="button"
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-amber-200 hover:text-amber-500"
                        >
                          <svg
                            className={`h-5 w-5 transition-transform ${
                              isExpanded ? "rotate-180" : "rotate-0"
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </header>

                      {isExpanded && (
                        <div className="mt-6 grid gap-6 lg:grid-cols-[0.7fr_1fr]">
                          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 text-sm text-slate-700">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                              Suggested recipe
                            </p>
                            <p className="mt-3 whitespace-pre-wrap">
                              {item.basicRecipe || "No recipe available"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Highlight videos
                              </p>
                              <span className="text-xs text-slate-400">
                                Showing up to 5 clips
                              </span>
                            </div>

                            {videos.length === 0 ? (
                              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center text-sm text-slate-500">
                                📹 No specific videos yet
                              </div>
                            ) : (
                              <ul className="mt-4 space-y-3">
                                {videos.slice(0, 5).map((video, i) => (
                                  <li
                                    key={i}
                                    className="flex gap-3 rounded-xl border border-transparent p-3 transition hover:border-amber-100 hover:bg-amber-50/40"
                                  >
                                    <span className="text-xs font-semibold text-slate-400">
                                      #{i + 1}
                                    </span>
                                    <div className="flex-1">
                                      <a
                                        className="text-sm font-medium text-amber-600 transition hover:text-amber-700"
                                        href={video.videoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {video.title || video.videoUrl}
                                      </a>
                                      <p className="mt-1 text-xs text-slate-400">
                                        {video.viewCount?.toLocaleString() ||
                                          0}{" "}
                                        views •{" "}
                                        {video.likeCount?.toLocaleString() ||
                                          0}{" "}
                                        likes
                                      </p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
