import React, { useEffect, useMemo, useRef, useState } from "react";

import axios from "axios";
// import { toast } from "react-hot-toast";
// import _ from "lodash";
import { connect } from "react-redux";

import loadingImage from "../../assets/images/loading.svg";
import productPlaceholder from "../../assets/images/placeholder-image.webp";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import Datepicker from "react-tailwindcss-datepicker";
import Modal from "../../components/Modal";
import { getTransactions, getTransactionDetail } from "../../utils/dataProvider/transaction";
import useDocumentTitle from "../../utils/documentTitle";
import { n_f, formatDateTime } from "../../utils/helpers";

const ManageOrder = (props) => {
  const controller = useMemo(() => new AbortController(), []);
  const [dateRange, setDateRange] = useState({ startDate: new Date(), endDate: new Date() });
  const [statusTab, setStatusTab] = useState("ALL"); // ALL | PENDING | COMPLETED | CANCELLED
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState({ isLoading: false, products: [] });
  useDocumentTitle("Manage Order");

  const fetch = () => {
    setLoading(true);
    const statuses = statusTab === "ALL" ? ["PENDING", "COMPLETED", "CANCELLED"] : [statusTab];
    Promise.all(statuses.map((s) => getTransactions({ status: s, page: 1, limit: 200 }, props.userInfo.token, controller)))
      .then((results) => {
        const merged = results.flatMap((r) => r.data?.data || []);
        const from = new Date(dateRange.startDate);
        const to = new Date(dateRange.endDate);
        to.setHours(23, 59, 59, 999);
        const filtered = merged
          .filter((o) => {
            const t = new Date(o.created_at);
            return t >= from && t <= to;
          })
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setOrders(filtered);
      })
      .catch((err) => {
        if (!axios.isCancel(err)) console.log(err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
    // eslint-disable-next-line
  }, [dateRange, statusTab]);

  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetailData({ isLoading: true, products: [] });
    try {
      const res = await getTransactionDetail(id, props.userInfo.token, controller);
      setDetailData({ isLoading: false, ...res.data.data[0] });
    } catch (e) {
      setDetailData({ isLoading: false, isError: true, products: [] });
    }
  };

  const statusBadgeClass = (s) => {
    if (s === "COMPLETED") return "bg-green-100 text-green-800 border border-green-200";
    if (s === "CANCELLED") return "bg-red-100 text-red-800 border border-red-200";
    return "bg-yellow-100 text-yellow-800 border border-yellow-200"; // PENDING / default
  };

  return (
    <>
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} className={"w-max max-w-md  md:max-w-none"}>
        {detailData.isLoading ? (
          <img src={loadingImage} alt="loading..." className="m-2 w-8 h-8" />
        ) : (
          <section className="flex flex-col-reverse md:flex-row gap-5 md:w-[80vw] duration-200">
            <aside className="flex-[2_2_0%] space-y-3">
              <p className="font-semibold">Products</p>
              <div className="flex flex-col h-72 overflow-y-scroll pr-2">
                {detailData.products?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm md:text-base gap-2">
                    <div>
                      <div className="avatar">
                        <div className="w-16 rounded-xl">
                          <img src={item.product_img ? item.product_img : productPlaceholder} />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name} x{item.qty}</p>
                      <p>{item.size}</p>
                    </div>
                    <div className="">
                      <p className="">{n_f(item.subtotal)} VND</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
            <aside className="flex-1 flex flex-col gap-1 text-sm">
              <p className="font-bold mb-2">Detail Information</p>
              <div className="flex justify-between">
                <p className="font-semibold">Grand Total</p>
                <p>{n_f(detailData.grand_total)} VND</p>
              </div>
              <div className="flex justify-between">
                <p className="font-semibold">Payment Method</p>
                <p>{detailData.payment_name}</p>
              </div>
              <div className="flex justify-between">
                <p className="font-semibold">Status</p>
                <p>{detailData.status_name}</p>
              </div>
              <div className="flex justify-between">
                <p className="font-semibold">Transaction at</p>
                <p>{formatDateTime(detailData.transaction_time)}</p>
              </div>
              <div className="flex flex-col mt-1">
                <p className="font-semibold">Delivery address</p>
                <p className="break-words">{detailData.delivery_address || "no address"}</p>
              </div>
              <div className="flex flex-col mt-1">
                <p className="font-semibold">Notes</p>
                <p className="break-words">{detailData.notes || "no notes"}</p>
              </div>
            </aside>
          </section>
        )}
      </Modal>
      <Header />
      {loading ? (
        <>
          <main className="py-7 flex flex-col gap-5 items-center justify-center bg-[#ddd]">
            <img src={loadingImage} alt="Loading..." />
            <p className="text-center">Please wait, fetching data...</p>
          </main>
        </>
      ) : (
        <main className="bg-cart bg-cover bg-center">
          <div className="global-px space-y-4 py-10">
            <section className="text-white lg:text-3xl text-2xl font-extrabold drop-shadow-lg text-center md:text-left">
              Orders history of the store
              <p className="text-white/90 text-base font-normal mt-1">
                Showing {orders.length} order{orders.length !== 1 ? "s" : ""} in selected range
              </p>
            </section>
            <div className="bg-white/95 backdrop-blur sticky top-16 z-10 inline-flex flex-wrap items-center gap-3 rounded-md p-3 shadow">
              <label className="text-sm font-medium mr-2">Day range:</label>
              <Datepicker
                inputClassName="bg-white border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none min-w-[260px]"
                value={dateRange}
                popoverDirection="down"
                separator="until"
                onChange={(e) => setDateRange({ startDate: e.startDate ? new Date(e.startDate) : new Date(), endDate: e.endDate ? new Date(e.endDate) : new Date() })}
              />
              <div className="w-px h-8 bg-gray-200 mx-1" />
              <div className="join">
                {(["ALL", "PENDING", "COMPLETED", "CANCELLED"]).map((s) => (
                  <button key={s} onClick={() => setStatusTab(s)} className={`join-item btn ${statusTab === s ? "btn-primary text-white" : ""}`}>{s}</button>
                ))}
              </div>
            </div>
            <section className="flex flex-col md:flex-row lg:gap-16 gap-10">
              <aside className="flex-1 flex">
                <section className="flex bg-white rounded-lg p-2 lg:p-7 flex-col w-full">
                  {orders.length < 1 ? (
                    <section className="flex flex-col items-center justify-center text-center text-gray-600 py-12">
                      <img src={loadingImage} alt="Empty" className="w-10 h-10 invert mb-3" />
                      <p>No orders found for the selected range/status.</p>
                    </section>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-black py-2">
                      {orders.map((item, key) => (
                        <div
                          className="flex flex-col gap-3 px-4 py-4 bg-white hover:bg-gray-50 cursor-pointer duration-200 rounded-2xl border border-gray-100 shadow-sm"
                          onClick={() => openDetail(item.id)}
                          key={key}
                        >
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{formatDateTime(item.created_at)}</span>
                            <span className={`px-2 py-0.5 rounded-full ${statusBadgeClass(item.status)}`}>{item.status}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <img src={item.products?.[0]?.product_img ? item.products[0].product_img : productPlaceholder} alt="" width="64" height="64" className="rounded-full  aspect-square object-cover" />
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-base truncate">
                                {item.products?.[0]?.product_name}
                              </div>
                              {item.products?.length > 1 && (
                                <p className="text-xs text-gray-500">+ {item.products.length - 1} more</p>
                              )}
                              <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                                <span>Total:</span>
                                <span className="font-semibold text-tertiary">{n_f(item.total)} VND</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                              {item.table_number ? (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Table {item.table_number}</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200">Shipping</span>
                              )}
                            </div>
                            <span className="text-primary hover:underline">View details »</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </aside>
            </section>
          </div>
        </main>
      )}
      <Footer />
    </>
  );
};

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
});

const mapDispatchToProps = {};

export default connect(mapStateToProps, mapDispatchToProps)(ManageOrder);
