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
    const initialDetailData = {
      isLoading: false,
      isError: false,
      id: 0,
      grand_total: 0,
      subtotal: 0,
      delivery_fee: 0,
      discount: 0,
      payment_name: "",
      payment_id: 0,
      delivery_name: "",
      delivery_address: "",
      notes: "",
      status_name: "",
      transaction_time: "",
      table_number: "",
      products: [],
    };
    const [detailData, setDetailData] = useState(initialDetailData);
    useDocumentTitle("Manage Order");

    const fetch = () => {
      setLoading(true);
      const statuses = statusTab === "ALL" ? ["PENDING", "COMPLETED", "CANCELLED"] : [statusTab];
      Promise.all(statuses.map((s) => getTransactions({ status: s, page: 1, limit: 200 }, props.userInfo.token, controller)))
        .then((results) => {
          const merged = results.flatMap((r) => r.data?.data || []);
          const from = new Date(dateRange.startDate || Date.now());
          const to = new Date(dateRange.endDate || dateRange.startDate || Date.now());
          // normalize to full-day inclusive range in local time
          const fromStart = new Date(from);
          fromStart.setHours(0, 0, 0, 0);
          const toEnd = new Date(to);
          toEnd.setHours(23, 59, 59, 999);

          const isSameDay = fromStart.toDateString() === new Date(toEnd).toDateString();
          const filtered = merged
            .filter((o) => {
              const t = new Date(o.created_at);
              if (isNaN(t.getTime())) return false;
              if (isSameDay) {
                return t >= fromStart && t <= toEnd;
              }
              return t >= fromStart && t <= toEnd;
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
      setDetailData({ ...initialDetailData, isLoading: true });
      try {
        const res = await getTransactionDetail(id, props.userInfo.token, controller);
        setDetailData({ ...initialDetailData, isLoading: false, ...res.data.data[0], isError: false });
      } catch (e) {
        setDetailData({ ...initialDetailData, isLoading: false, isError: true });
      }
    };

    const statusBadgeClass = (s) => {
      const statusUpper = String(s || "").toUpperCase();
      if (["COMPLETED"].includes(statusUpper)) return "bg-green-100 text-green-800 border border-green-300";
      if (["CANCELLED", "REJECTED"].includes(statusUpper)) return "bg-red-100 text-red-800 border border-red-300";
      if (["PENDING", "PROCESSING", "PREPARING"].includes(statusUpper)) return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      if (["SHIPPING", "ON_THE_WAY"].includes(statusUpper)) return "bg-blue-100 text-blue-800 border border-blue-300";
      return "bg-gray-100 text-gray-800 border border-gray-300";
    };

    return (
      <>
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} className={"w-max max-w-md md:max-w-5xl"}>
          {detailData.isLoading ? (
            <div className="flex justify-center items-center py-12">
              <img src={loadingImage} alt="loading..." className="w-12 h-12" />
            </div>
          ) : detailData.isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-red-500 font-semibold text-lg mb-2">Error loading details</p>
              <p className="text-gray-600">Please try again later</p>
            </div>
          ) : (
            <section className="flex flex-col md:flex-row gap-6 duration-200 p-2">
              <aside className="flex-[2_2_0%] space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Order Items</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass(detailData.status_name)}`}>
                    {detailData.status_name}
                  </span>
                </div>
                <div className="flex flex-col max-h-96 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
                  {detailData.products && detailData.products.length > 0 ? (
                    detailData.products.map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-shrink-0">
                          <img
                            src={item.product_img || productPlaceholder}
                            alt={item.product_name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base text-gray-900 mb-1">
                            {item.product_name} <span className="text-gray-500">x{item.qty}</span>
                          </p>
                          <p className="text-sm text-gray-600 mb-1">{item.size}</p>
                          {Array.isArray(item.add_ons) && item.add_ons.length > 0 && (
                            <ul className="text-xs text-gray-600 list-disc ml-4 mt-1 space-y-0.5">
                              {item.add_ons.map((ao, i2) => (
                                <li key={i2}>
                                  {ao.name} <span className="text-gray-500">(+{n_f(Number(ao.price || 0))} VND)</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <p className="font-bold text-base text-gray-900 whitespace-nowrap">
                            {n_f(item.subtotal)} VND
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No products found</p>
                    </div>
                  )}
                </div>
              </aside>
              <aside className="flex-1 flex flex-col gap-4 bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Order Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <p className="font-semibold text-gray-700">Grand Total</p>
                    <p className="font-bold text-lg text-gray-900">{n_f(detailData.grand_total)} VND</p>
                  </div>
                  <div className="flex justify-between py-1">
                    <p className="font-medium text-gray-600">Subtotal</p>
                    <p className="text-gray-800">{n_f(detailData.subtotal || 0)} VND</p>
                  </div>
                  <div className="flex justify-between py-1">
                    <p className="font-medium text-gray-600">Shipping Fee</p>
                    <p className="text-gray-800">{n_f(detailData.delivery_fee || 0)} VND</p>
                  </div>
                  <div className="flex justify-between py-1">
                    <p className="font-medium text-gray-600">Discount</p>
                    <p className="text-gray-800">{n_f(detailData.discount || 0)} VND</p>
                  </div>
                  <div className="flex justify-between py-1">
                    <p className="font-medium text-gray-600">Payment Method</p>
                    <p className="text-gray-800">{detailData.payment_name || "N/A"}</p>
                  </div>
                  <div className="flex justify-between py-1">
                    <p className="font-medium text-gray-600">Delivery Type</p>
                    <p className="text-gray-800">{detailData.delivery_name || (detailData.table_number ? "Dine-in" : "N/A")}</p>
                  </div>
                  <div className="flex justify-between py-1">
                    <p className="font-medium text-gray-600">Transaction Date</p>
                    <p className="text-gray-800">{formatDateTime(detailData.transaction_time)}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-300 space-y-3">
                  <div className="flex flex-col">
                    <p className="font-semibold text-gray-700 mb-1">Delivery Address</p>
                    <p className="text-sm text-gray-600 break-words bg-white p-2 rounded border border-gray-200">
                      {detailData.delivery_address || "No address provided"}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <p className="font-semibold text-gray-700 mb-1">Notes</p>
                    <p className="text-sm text-gray-600 break-words bg-white p-2 rounded border border-gray-200">
                      {detailData.notes || "No notes"}
                    </p>
                  </div>
                </div>
              </aside>
            </section>
          )}
        </Modal>
        <Header />
        {loading ? (
          <main className="py-12 flex flex-col gap-4 items-center justify-center bg-[#f3f4f6]">
            <img src={loadingImage} alt="Loading..." className="w-12 h-12" />
            <p className="text-center text-gray-600">Please wait, fetching data...</p>
          </main>
        ) : (
          <main className="bg-history bg-cover bg-center py-6 md:py-12 lg:py-20 text-white">
            <section className="global-px">
              <div className="flex flex-col items-center p-3">
                <h2 className="text-3xl drop-shadow-[0px_10px_10px_rgba(0,0,0,0.6)] font-extrabold mb-3 text-center">
                  Store order history overview
                </h2>
                <p className="text-white/80 text-sm md:text-base">
                  Showing {orders.length} order{orders.length !== 1 ? "s" : ""} in selected range
                </p>
              </div>
              <section className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 md:p-5 mb-6 text-black shadow-lg">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex flex-wrap gap-2 items-center">
                    {["ALL", "PENDING", "COMPLETED", "CANCELLED"].map((s) => (
                      <button
                        key={s}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          statusTab === s
                            ? "bg-primary text-white shadow-md"
                            : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                        }`}
                        onClick={() => setStatusTab(s)}
                      >
                        {s === "ALL" ? "All Orders" : s.charAt(0) + s.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  <div className="min-w-[260px] w-full md:w-auto">
                    <Datepicker
                      value={dateRange}
                      popoverDirection="down"
                      separator="to"
                      inputClassName="bg-white border-2 py-2.5 px-3 rounded-lg border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none w-full transition-all"
                      onChange={(e) => {
                        const start = e?.startDate ? new Date(e.startDate) : new Date();
                        const end = e?.endDate ? new Date(e.endDate) : start;
                        setDateRange({ startDate: start, endDate: end });
                      }}
                    />
                  </div>
                </div>
              </section>
              {orders.length > 0 ? (
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-black py-4">
                  {orders.map((item, key) => (
                    <div
                      className="bg-white rounded-2xl shadow-md hover:shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden group"
                      onClick={() => openDetail(item.id)}
                      key={key}
                    >
                      <div className="flex flex-row p-5 gap-4 h-full">
                        <div className="flex-shrink-0">
                          <img
                            src={item.products?.[0]?.product_img ? item.products[0].product_img : productPlaceholder}
                            alt={item.products?.[0]?.product_name || "Product"}
                            className="w-20 h-20 rounded-xl object-cover shadow-md group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        {/* Phần nội dung bên phải, đã sửa lại cấu trúc */}
    <div className="flex-1 flex flex-col justify-between min-w-0">
      
      {/* KHỐI 1: Tên + Giá */}
      <div>
        <div className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">
          {item.products?.[0]?.product_name || "Unknown Product"}
          {item.products?.length > 1 && (
            <span className="ml-2 text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              +{item.products.length - 1}
            </span>
          )}
        </div>
        <p className="text-primary font-bold text-lg mb-2">
          {n_f(item.total || item.grand_total)} VND
        </p>
      </div>

      {/* KHỐI 2: Status + Ngày + Loại (Đã gộp chung) */}
      <div>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass(item.status || item.status_name)}`}>
          {item.status || item.status_name}
        </span>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500"> {/* Đổi mt-3 thành mt-2 */}
          <span>{formatDateTime(item.created_at || item.transaction_time)}</span>
          {item.table_number ? (
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Table {item.table_number}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200">
              Shipping
            </span>
          )}
        </div>
      </div>
      
    </div>
    {/* Hết phần nội dung bên phải */}

  </div>
</div>
                  ))}
                </section>
              ) : (
                <section className="flex flex-col justify-center items-center py-16 text-center">
                  <div className="mb-4">
                    <svg className="w-24 h-24 mx-auto text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No orders found</h3>
                  <p className="text-white/80">Try adjusting your filters or date range</p>
                </section>
              )}
            </section>
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
