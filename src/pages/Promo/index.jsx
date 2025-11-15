import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { deletePromoEntry, getPromos } from "../../utils/dataProvider/promo";
import emptyBox from "../../assets/images/empty.svg";
import loadingImage from "../../assets/images/loading.svg";
import toast from "react-hot-toast";

function PromoList() {
  const navigate = useNavigate();
  const userInfo = useSelector((state) => state.userInfo);
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [filter, setFilter] = useState("all"); // all|ongoing|upcoming|ended
  const [page, setPage] = useState(1);

  // Admin access is enforced by router guard; avoid local redirect to prevent initial aborts

  useEffect(() => {
    setIsLoading(true);
    const controller = new AbortController();
    const base = { page, limit: 8, searchByName: "" };
    const params = { ...base };

    switch (filter) {
      case "all":
        params.status = "all";
        break;
      case "ongoing":
        params.status = "current";
        break;
      case "upcoming":
        params.status = "upcoming";
        break;
      case "ended":
        params.status = "ended";
        break;
    }

    getPromos(params, controller)
      .then((res) => {
        const data = res.data;
        setItems(data.data || []);
        setMeta(data.meta || {});
        setIsLoading(false);
      })
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
          return;
        }
        console.error("Error fetching promos:", err);
        setIsLoading(false);
        setItems([]);
        setMeta({});
      });

    return () => {
      controller.abort();
    };
  }, [filter, page]);


  const handleDelete = (id) => {
    const token = userInfo.token;
    const c = new AbortController();
    deletePromoEntry(id, token, c)
      .then(() => {
        toast.success("Discount deactivated");
        // refresh
        setPage(1);
        setFilter(filter);
      })
      .catch(() => toast.error("Failed to delete"));
  };

  const renderBadge = (it) => {
    const now = dayjs();
    const start = it.startsAt ? dayjs(it.startsAt) : null;
    const end = it.endsAt ? dayjs(it.endsAt) : null;
    const active = it.active;
    if (!active) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300">
          Inactive
        </span>
      );
    }
    if (start && start.isAfter(now)) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          Upcoming
        </span>
      );
    }
    if (end && end.isBefore(now)) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300">
          Ended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
        Ongoing
      </span>
    );
  };

  const filterOptions = [
    { key: "all", label: "All Discounts" },
    { key: "ongoing", label: "Ongoing" },
    { key: "upcoming", label: "Upcoming" },
    { key: "ended", label: "Ended" },
  ];

  return (
    <>
      <Header />
      <main className="global-px py-6 min-h-screen">
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-quartenary mb-2">Discounts</h1>
              <p className="text-gray-600">Manage and monitor promotional discounts</p>
            </div>
            <button
              className="btn btn-primary text-white hover:bg-[#8B5A3C] transition-colors"
              onClick={() => navigate("/promo/new")}
            >
              <span className="flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Discount
              </span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <section className="w-full h-80 flex justify-center items-center">
            <img src={loadingImage} alt="Loading..." />
          </section>
        ) : items.length < 1 ? (
          <section className="w-full flex flex-col justify-center items-center py-16 text-center">
            <div className="mb-6">
              <img src={emptyBox} alt="No discounts" className="w-52 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No discounts found</h3>
            <p className="text-gray-500">There are no discounts available right now.</p>
          </section>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {filterOptions.map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setPage(1);
                    setFilter(f.key);
                  }}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                    filter === f.key
                      ? "bg-tertiary text-white border-tertiary"
                      : "bg-white text-tertiary border-tertiary/40 hover:border-tertiary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((it) => (
                <div
                  key={`${it.kind}-${it.id}`}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 overflow-hidden flex flex-col h-full"
                >
                  <div className="bg-gradient-to-r from-tertiary to-[#8B5A3C] px-4 py-3 text-white">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30">
                          {it.kind}
                        </span>
                        <h3 className="text-lg font-bold truncate">{it.title}</h3>
                      </div>
                      {renderBadge(it)}
                    </div>
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    {it.description ? (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{it.description}</p>
                    ) : null}
                    
                    <div className="space-y-2 flex-1">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-tertiary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 mb-0.5">Discount</p>
                          <p className="text-sm text-gray-700">
                            <b>{it.discountType}</b> - <b>{it.discountValue}</b>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-tertiary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 mb-0.5">Period</p>
                          <p className="text-xs text-gray-700">
                            Start: {it.startsAt ? dayjs(it.startsAt).format("YYYY-MM-DD HH:mm") : "-"}
                          </p>
                          <p className="text-xs text-gray-700">
                            End: {it.endsAt ? dayjs(it.endsAt).format("YYYY-MM-DD HH:mm") : "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 mt-4 border-t border-gray-200">
                      <button
                        className="flex-1 btn btn-sm btn-primary text-white hover:bg-[#8B5A3C] transition-colors"
                        onClick={() => navigate(`/promo/edit/${String(it.kind || it.type || "code").toLowerCase() === "event" ? "event" : "code"}/${it.id}`)}
                      >
                        <span className="flex items-center justify-center gap-1.5 text-xs">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </span>
                      </button>
                      <button
                        className="flex-1 btn btn-sm btn-error text-white hover:bg-red-600 transition-colors"
                        onClick={() => handleDelete(it.id)}
                      >
                        <span className="flex items-center justify-center gap-1.5 text-xs">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {meta?.totalPage > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            <button
              className="btn btn-sm"
              disabled={!meta.prev}
              onClick={() => setPage((p) => Math.max(1, Number(p) - 1))}
            >
              Prev
            </button>
            <span className="text-sm px-2 py-1 flex items-center">Page {meta.currentPage} / {meta.totalPage}</span>
            <button
              className="btn btn-sm"
              disabled={!meta.next}
              onClick={() => setPage((p) => Number(p) + 1)}
            >
              Next
            </button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default PromoList;
