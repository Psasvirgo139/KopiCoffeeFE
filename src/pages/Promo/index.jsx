import React, { useEffect, useMemo, useState } from "react";
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
  const [filter, setFilter] = useState("available"); // all|available|current|upcoming
  const [page, setPage] = useState(1);

  // Admin access is enforced by router guard; avoid local redirect to prevent initial aborts

  const controller = useMemo(() => new AbortController(), [filter, page]);

    useEffect(() => {
        setIsLoading(true);
        const base = { page, limit: 8, searchByName: "" };
        const params = { ...base };

        switch (filter) {
            case "available":
                params.available = "true";
                break;
            case "all":
                params.status = "all";
                delete params.available;
                break;
            case "current":
            case "upcoming":
                params.status = filter;
                delete params.available;
                break;
        }

        getPromos(params, controller)
            .then((res) => res.data)
            .then((data) => {
                setItems(data.data || []);
                setMeta(data.meta || {});
                setIsLoading(false);
            })
            .catch((err) => {
                if (err?.name === "CanceledError") return;
                setIsLoading(false);
                setItems([]);
                setMeta({});
            });
        return () => controller.abort();
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
    if (!active) return <span className="badge badge-ghost">Inactive</span>;
    if (start && start.isAfter(now)) return <span className="badge badge-info">Upcoming</span>;
    if (end && end.isBefore(now)) return <span className="badge badge-ghost">Ended</span>;
    return <span className="badge badge-success">Ongoing</span>;
  };

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Discounts</h1>
          <div className="flex items-center gap-2">
            <select
              className="select select-bordered select-sm"
              value={filter}
              onChange={(e) => {
                setPage(1);
                setFilter(e.target.value);
              }}
            >
              <option value="all">All</option>
              <option value="available">Available (current or upcoming)</option>
              <option value="current">Current</option>
              <option value="upcoming">Upcoming</option>
            </select>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => navigate("/promo/new")}
            >
              New Discount
            </button>
          </div>
        </div>

        {isLoading ? (
          <section className="w-full h-64 flex justify-center items-center">
            <img src={loadingImage} alt="loading" />
          </section>
        ) : items.length < 1 ? (
          <section className="w-full flex flex-col justify-center items-center py-8 text-center font-medium gap-5">
            <div>
              <img src={emptyBox} alt="empty" className="w-52" />
            </div>
            <p>No discounts found</p>
          </section>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => (
              <div key={`${it.kind}-${it.id}`} className="card bg-white shadow p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-secondary">{it.kind}</span>
                    <h2 className="font-bold">{it.title}</h2>
                  </div>
                  {renderBadge(it)}
                </div>
                {it.description ? (
                  <p className="text-sm text-gray-600 mt-2">{it.description}</p>
                ) : null}
                <div className="text-sm mt-2">
                  <p>
                    Type: <b>{it.discountType}</b> | Value: <b>{it.discountValue}</b>
                  </p>
                  <p>
                    Start: {it.startsAt ? dayjs(it.startsAt).format("YYYY-MM-DD HH:mm") : "-"}
                  </p>
                  <p>
                    End: {it.endsAt ? dayjs(it.endsAt).format("YYYY-MM-DD HH:mm") : "-"}
                  </p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    className="btn btn-sm"
                    onClick={() => navigate(`/promo/edit/${it.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-error"
                    onClick={() => handleDelete(it.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
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
            <span className="text-sm px-2 py-1">Page {meta.currentPage} / {meta.totalPage}</span>
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
