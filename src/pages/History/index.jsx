import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import Datepicker from "react-tailwindcss-datepicker";

import axios from 'axios';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

import loadingImage from '../../assets/images/loading.svg';
import productPlaceholder from '../../assets/images/placeholder-image.webp';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Modal from '../../components/Modal';
import {
  getTransactionDetail,
  getTransactionHistory,
} from '../../utils/dataProvider/transaction';
import useDocumentTitle from '../../utils/documentTitle';
import {
  formatDateTime,
  n_f,
} from '../../utils/helpers';

function History() {
  const authInfo = useSelector((state) => state.userInfo);
  const controller = useMemo(() => new AbortController(), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = searchParams.get("page");
  const [isLoading, setIsLoading] = useState(true);
  const [listMeta, setListMeta] = useState({
    totalData: "0",
    perPage: 6,
    currentPage: 1,
    totalPage: 1,
    prev: null,
    next: null,
  });
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("ALL"); // ALL | PENDING | COMPLETED
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [detail, setDetail] = useState("");
  const initialValue = {
    isLoading: true,
    isError: false,
    id: 0,
    receiver_email: "",
    receiver_name: "",
    delivery_address: "",
    notes: "",
    status_id: 0,
    status_name: "",
    transaction_time: "",
    payment_id: 0,
    payment_name: "",
    payment_fee: 0,
    delivery_name: "",
    delivery_fee: 0,
    grand_total: 0,
    products: [],
  };
  const [dataDetail, setDataDetail] = useState({
    ...initialValue,
  });
  useDocumentTitle("History");
  const detailController = useMemo(() => new AbortController(), [detail]);

  const fetchDetail = async () => {
    if (detail === "") return;
    try {
      const result = await getTransactionDetail(
        detail,
        authInfo.token,
        detailController
      );
      setDataDetail({ isLoading: false, ...result.data.data[0] });
    } catch (error) {
      if (axios.isCancel(error)) return;
      setDataDetail({ ...initialValue, isLoading: false, isError: true });
      console.log(error);
    }
  };

  useEffect(() => {
    if (detail === "") return;
    fetchDetail();
    return () => {
      detailController.abort();
      setDataDetail({ ...initialValue });
    };
  }, [detail]);

  useEffect(() => {
    if (page && (page < 1 || isNaN(page))) {
      setSearchParams({ page: 1 });
      return;
    }
    window.scrollTo(0, 0);

    setIsLoading(true);
    getTransactionHistory({ page: page || 1 }, authInfo.token, controller)
      .then((result) => {
        setList(result.data.data);
        setIsLoading(false);
        setListMeta(result.data.meta);
      })
      .catch(() => {
        setIsLoading(false);
        setList([]);
      });
  }, [page]);

  const getStatusBadgeClass = (status) => {
    const statusUpper = String(status || "").toUpperCase();
    if (["COMPLETED"].includes(statusUpper)) {
      return "bg-green-100 text-green-800 border-green-300";
    } else if (["CANCELLED", "REJECTED"].includes(statusUpper)) {
      return "bg-red-100 text-red-800 border-red-300";
    } else if (["PENDING", "PROCESSING", "PREPARING"].includes(statusUpper)) {
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    } else if (["SHIPPING", "ON_THE_WAY"].includes(statusUpper)) {
      return "bg-blue-100 text-blue-800 border-blue-300";
    }
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  const filteredSorted = useMemo(() => {
    let items = Array.isArray(list) ? [...list] : [];
    // status filter
    if (filter === "PENDING") {
      items = items.filter((it) => !["CANCELLED", "REJECTED", "COMPLETED"].includes(String(it.status_name || it.status || "").toUpperCase()));
    } else if (filter === "COMPLETED") {
      items = items.filter((it) => ["CANCELLED", "REJECTED", "COMPLETED"].includes(String(it.status_name || it.status || "").toUpperCase()));
    }
    // date range filter
    if (dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      const startDay = new Date(start);
      startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(end);
      endDay.setHours(23, 59, 59, 999);
      items = items.filter((it) => {
        const d = it.created_at ? new Date(it.created_at) : (it.transaction_time ? new Date(it.transaction_time) : null);
        if (!d || isNaN(d.getTime())) return false;
        return d >= startDay && d <= endDay;
      });
    }
    // sort desc by created_at then fallback transaction_time
    items.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : (a.transaction_time ? new Date(a.transaction_time).getTime() : 0);
      const db = b.created_at ? new Date(b.created_at).getTime() : (b.transaction_time ? new Date(b.transaction_time).getTime() : 0);
      return db - da;
    });
    return items;
  }, [list, filter, dateRange]);

  return (
    <>
      <Header />
      <Modal
        isOpen={detail !== ""}
        onClose={() => setDetail("")}
        className={"w-max max-w-md md:max-w-5xl"}
      >
        {dataDetail.isLoading ? (
          <div className="flex justify-center items-center py-12">
            <img src={loadingImage} alt="loading..." className="w-12 h-12" />
          </div>
        ) : dataDetail.isError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-red-500 font-semibold text-lg mb-2">Error loading details</p>
            <p className="text-gray-600">Please try again later</p>
          </div>
        ) : (
          <section className="flex flex-col md:flex-row gap-6 duration-200 p-2">
            <aside className="flex-[2_2_0%] space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Order Items</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(dataDetail.status_name)}`}>
                  {dataDetail.status_name}
                </span>
              </div>
              <div className="flex flex-col max-h-96 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
                {dataDetail.products && dataDetail.products.length > 0 ? (
                  dataDetail.products.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
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
                          <ul className="text-xs text-gray-600 list-disc ml-4 mt-1">
                            {item.add_ons.map((ao, idx) => (
                              <li key={idx} className="mb-0.5">
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
                  <p className="font-bold text-lg text-gray-900">{n_f(dataDetail.grand_total)} VND</p>
                </div>
                <div className="flex justify-between py-1">
                  <p className="font-medium text-gray-600">Subtotal</p>
                  <p className="text-gray-800">{n_f(dataDetail.subtotal || 0)} VND</p>
                </div>
                <div className="flex justify-between py-1">
                  <p className="font-medium text-gray-600">Shipping Fee</p>
                  <p className="text-gray-800">{n_f(dataDetail.delivery_fee || 0)} VND</p>
                </div>
                <div className="flex justify-between py-1">
                  <p className="font-medium text-gray-600">Discount</p>
                  <p className="text-gray-800">{n_f(dataDetail.discount || 0)} VND</p>
                </div>
                <div className="flex justify-between py-1">
                  <p className="font-medium text-gray-600">Payment Method</p>
                  <p className="text-gray-800">{dataDetail.payment_name || "N/A"}</p>
                </div>
                <div className="flex justify-between py-1">
                  <p className="font-medium text-gray-600">Delivery Type</p>
                  <p className="text-gray-800">{dataDetail.delivery_name || "N/A"}</p>
                </div>
                <div className="flex justify-between py-1">
                  <p className="font-medium text-gray-600">Transaction Date</p>
                  <p className="text-gray-800">{formatDateTime(dataDetail.transaction_time)}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-300 space-y-3">
                <div className="flex flex-col">
                  <p className="font-semibold text-gray-700 mb-1">Delivery Address</p>
                  <p className="text-sm text-gray-600 break-words bg-white p-2 rounded border border-gray-200">
                    {dataDetail.delivery_address || "No address provided"}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="font-semibold text-gray-700 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 break-words bg-white p-2 rounded border border-gray-200">
                    {dataDetail.notes || "No notes"}
                  </p>
                </div>
              </div>
            </aside>
          </section>
        )}
      </Modal>
      <main className="bg-history bg-cover bg-center py-6 md:py-12 lg:py-20 text-white">
        <section className="global-px">
          <div className="flex flex-col items-center p-3">
            <h2 className="text-3xl drop-shadow-[0px_10px_10px_rgba(0,0,0,0.6)] font-extrabold mb-5 text-center">
              Let&#8242;s see what you have bought!
            </h2>
            <p>Select items to see detail</p>
          </div>
          {/* <nav className="flex flex-row justify-end gap-4">
            <li className="list-none cursor-pointer select-none" id="selectAll">
              <p className="underline font-bold">Select All</p>
            </li>
            <li
              className="list-none cursor-pointer select-none"
              id="deleteSelected"
            >
              <p className="underline font-bold">Delete</p>
            </li>
          </nav> */}
          {!isLoading ? (
            <>
              <section className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 md:p-5 mb-6 text-black shadow-lg">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex flex-wrap gap-2 items-center">
                    <button 
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        filter === "ALL" 
                          ? "bg-primary text-white shadow-md" 
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                      }`} 
                      onClick={() => setFilter("ALL")}
                    >
                      All Orders
                    </button>
                    <button 
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        filter === "PENDING" 
                          ? "bg-primary text-white shadow-md" 
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                      }`} 
                      onClick={() => setFilter("PENDING")}
                    >
                      Pending
                    </button>
                    <button 
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        filter === "COMPLETED" 
                          ? "bg-primary text-white shadow-md" 
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                      }`} 
                      onClick={() => setFilter("COMPLETED")}
                    >
                      Completed
                    </button>
                  </div>
                  <div className="flex-1" />
                  <div className="min-w-[260px] w-full md:w-auto">
                    <Datepicker
                      value={dateRange}
                      popoverDirection="down"
                      separator="to"
                      placeholder="Select date range"
                      inputClassName="bg-white border-2 py-2.5 px-3 rounded-lg border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none w-full transition-all"
                      onChange={(val) => setDateRange({ startDate: val?.startDate, endDate: val?.endDate })}
                    />
                  </div>
                </div>
              </section>
              {filteredSorted.length > 0 ? (
                <>
                  <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-black py-4">
                    {filteredSorted.map((item, key) => (
                      <div
                        className="bg-white rounded-2xl shadow-md hover:shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden group h-full"
                        onClick={() => setDetail(item.id)}
                        key={key}
                      >
                       <div className="flex flex-row p-5 gap-4 h-full">
                        <div className="flex-shrink-0">
                        <img
                         src={
                          item.products && item.products[0] && item.products[0].product_img
                          ? item.products[0].product_img
                          : productPlaceholder
                              }
                            alt={item.products && item.products[0] ? item.products[0].product_name : "Product"}
                            className="w-20 h-20 rounded-xl object-cover shadow-md group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-1 flex flex-col min-w-0">
                          <div className="flex-1">
                            <div className="font-bold text-lg text-gray-900 mb-1 line-clamp-1 overflow-hidden">
                              {item.products && item.products[0] ? item.products[0].product_name : "Unknown Product"}
                              {item.products && item.products.length > 1 && (
                                <span className="ml-2 text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  +{item.products.length - 1}
                                </span>
                              )}
                            </div>
                            <p className="text-primary font-bold text-lg">
                              {n_f(item.grand_total)} VND
                            </p>
                                                </div>
                          <div className="mt-auto pt-2">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(item.status_name)}`}>
                              {item.status_name}
                            </span>
                            {item.transaction_time && (
                              <p className="text-xs text-gray-500 mt-2">
                                {formatDateTime(item.transaction_time)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      </div>
                    ))}
                  </section>
                  {listMeta.totalPage > 1 && (
                    <section className="flex justify-center mt-8">
                      <div className="join bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-1">
                        {listMeta.prev && (
                          <button
                            onClick={() => {
                              setSearchParams({
                                page: Number(listMeta.currentPage) - 1,
                              });
                            }}
                            className="join-item btn btn-sm btn-primary text-white hover:bg-primary/90"
                          >
                            «
                          </button>
                        )}
                        <button className="join-item btn btn-sm btn-primary text-white pointer-events-none">
                          Page {listMeta.currentPage} of {listMeta.totalPage}
                        </button>
                        {listMeta.next && (
                          <button
                            onClick={() => {
                              setSearchParams({
                                page: Number(listMeta.currentPage) + 1,
                              });
                            }}
                            className="join-item btn btn-sm btn-primary text-white hover:bg-primary/90"
                          >
                            »
                          </button>
                        )}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <section className="flex flex-col justify-center items-center py-16 text-center">
                  <div className="mb-4">
                    <svg className="w-24 h-24 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No orders found</h3>
                  <p className="text-white/80">Try adjusting your filters or date range</p>
                </section>
              )}
            </>
          ) : (
            <section className="flex justify-center items-center py-16">
              <img src={loadingImage} className="invert w-16 h-16" alt="Loading..." />
            </section>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

export default History;
