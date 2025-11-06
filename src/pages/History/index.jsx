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
        className={"w-max max-w-md  md:max-w-none"}
      >
        {dataDetail.isLoading ? (
          <img src={loadingImage} alt="loading..." className="m-2 w-8 h-8" />
        ) : (
          <section className="flex flex-col-reverse md:flex-row gap-5 md:w-[80vw] duration-200">
            <aside className="flex-[2_2_0%] space-y-3">
              <p className="font-semibold">Products</p>
              <div className="flex flex-col h-72 overflow-y-scroll pr-2">
                {dataDetail.products.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm md:text-base gap-2"
                  >
                    <div>
                      <div className="avatar">
                        <div className="w-16 rounded-xl">
                          <img
                            src={
                              item.product_img
                                ? item.product_img
                                : productPlaceholder
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {item.product_name} x{item.qty}
                      </p>
                      <p>{item.size}</p>
                      {Array.isArray(item.add_ons) && item.add_ons.length > 0 && (
                        <ul className="text-xs text-gray-700 list-disc ml-4">
                          {item.add_ons.map((ao, idx) => (
                            <li key={idx}>{ao.name} (+{n_f(Number(ao.price || 0))} VND)</li>
                          ))}
                        </ul>
                      )}
                      {/* <p>IDR {n_f(item.subtotal)}</p> */}
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
                <p>{n_f(dataDetail.grand_total)} VND</p>
              </div>
              <div className="flex justify-between">
                <p className="font-semibold">Subtotal</p>
                <p>{n_f(dataDetail.subtotal || 0)} VND</p>
              </div>
              <div className="flex justify-between">
                <p className="font-semibold">Shipping</p>
                <p>{n_f(dataDetail.delivery_fee || 0)} VND</p>
              </div>
              <div className="flex justify-between">
                <p className="font-semibold">Discount</p>
                <p>{n_f(dataDetail.discount || 0)} VND</p>
              </div>
              <div className="flex justify-between">
                <p className="font-semibold">Payment Method</p>
                <p>{dataDetail.payment_name}</p>
              </div>
              <div className="flex justify-between">
                <p className="font-semibold">Status</p>
                <p>{dataDetail.status_name}</p>
              </div>
              <div className="flex justify-between">
                <p className="font-semibold">Delivery Type</p>
                <p>{dataDetail.delivery_name}</p>
              </div>
              <div className="flex justify-between">
                <p className="font-semibold">Transaction at</p>
                <p>{formatDateTime(dataDetail.transaction_time)}</p>
              </div>
              <div className="flex flex-col mt-1">
                <p className="font-semibold">Delivery address</p>
                <p className="break-words">
                  {dataDetail.delivery_address || "no address"}
                </p>
              </div>
              <div className="flex flex-col mt-1">
                <p className="font-semibold">Notes</p>
                <p className="break-words">{dataDetail.notes || "no notes"}</p>
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
              <section className="bg-white/70 rounded-xl p-3 mb-4 text-black flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="flex gap-2 items-center">
                  <button className={`btn btn-sm ${filter === "ALL" ? "btn-primary text-white" : ""}`} onClick={() => setFilter("ALL")}>All</button>
                  <button className={`btn btn-sm ${filter === "PENDING" ? "btn-primary text-white" : ""}`} onClick={() => setFilter("PENDING")}>Pending orders</button>
                  <button className={`btn btn-sm ${filter === "COMPLETED" ? "btn-primary text-white" : ""}`} onClick={() => setFilter("COMPLETED")}>Completed orders</button>
                </div>
                <div className="flex-1" />
                <div className="min-w-[260px] w-full md:w-auto">
                  <Datepicker
                    value={dateRange}
                    popoverDirection="down"
                    separator="to"
                    inputClassName={"bg-white border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none w-full"}
                    onChange={(val) => setDateRange({ startDate: val?.startDate, endDate: val?.endDate })}
                  />
                </div>
              </section>
              <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 text-black py-7">
                {filteredSorted.map((item, key) => (
                  <div
                    className="history-card  flex flex-row px-4 py-5 bg-white hover:bg-gray-200 cursor-pointer duration-200 rounded-2xl gap-5 relative group"
                    onClick={() => setDetail(item.id)}
                    key={key}
                  >
                    <div className="">
                      <img
                        src={
                          item.products[0].product_img
                            ? item.products[0].product_img
                            : productPlaceholder
                        }
                        alt=""
                        width="100px"
                        className="rounded-full  aspect-square object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-center w-auto">
                      <div className="font-extrabold text-lg relative w-full">
                        {item.products[0].product_name}
                        {item.products.length > 1 && (
                          <p className="absolute text-sm font-medium top-1 right-0 bg-white duration-200 group-hover:bg-gray-200">
                            + {item.products.length - 1} more
                          </p>
                        )}
                      </div>
                      <p className="text-tertiary">
                        {n_f(item.grand_total)} VND
                      </p>
                      <p className="text-tertiary">{item.status_name}</p>
                    </div>
                    {/* <input
                  type="checkbox"
                  className="checkbox-history absolute bottom-4 right-4 delete-checkbox border-secondary bg-secondary rounded h-5 w-5"
                /> */}
                  </div>
                ))}
              </section>
              <section className="flex justify-center">
                <div className="join">
                  {listMeta.prev && (
                    <button
                      onClick={() => {
                        setSearchParams({
                          page: Number(listMeta.currentPage) - 1,
                        });
                      }}
                      className="join-item btn btn-primary text-white"
                    >
                      «
                    </button>
                  )}
                  <button className="join-item btn btn-primary text-white">
                    Page {listMeta.currentPage}
                  </button>
                  {listMeta.next && (
                    <button
                      onClick={() => {
                        setSearchParams({
                          page: Number(listMeta.currentPage) + 1,
                        });
                      }}
                      className="join-item btn btn-primary text-white"
                    >
                      »
                    </button>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section className="flex justify-center items-center py-7">
              <img src={loadingImage} className="invert" />
            </section>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

export default History;
