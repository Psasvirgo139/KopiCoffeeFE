import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import loadingImage from '../../assets/images/loading.svg';
import productPlaceholder from '../../assets/images/placeholder-image.webp';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import { getTransactionDetail } from '../../utils/dataProvider/transaction';
import useDocumentTitle from '../../utils/documentTitle';
import {
  formatDateTime,
  n_f,
} from '../../utils/helpers';

function HistoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const authInfo = useSelector((state) => state.userInfo);
  const controller = useMemo(() => new AbortController(), []);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const initialValue = {
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
    subtotal: 0,
    discount: 0,
    products: [],
  };
  const [dataDetail, setDataDetail] = useState({
    ...initialValue,
  });

  useDocumentTitle("Order Detail");

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

  useEffect(() => {
    if (!id) {
      navigate('/history');
      return;
    }

    setIsLoading(true);
    setIsError(false);
    
    getTransactionDetail(id, authInfo.token, controller)
      .then((result) => {
        if (result.data && result.data.data && result.data.data[0]) {
          setDataDetail(result.data.data[0]);
        } else {
          setIsError(true);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setIsError(true);
        setIsLoading(false);
        console.log(error);
      });

    return () => {
      controller.abort();
    };
  }, [id, authInfo.token, controller, navigate]);

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="bg-history bg-cover bg-center py-6 md:py-12 lg:py-20 min-h-screen">
          <section className="global-px">
            <div className="flex justify-center items-center py-20">
              <img src={loadingImage} className="invert w-16 h-16" alt="Loading..." />
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Header />
        <main className="bg-history bg-cover bg-center py-6 md:py-12 lg:py-20 min-h-screen">
          <section className="global-px">
            <div className="flex flex-col justify-center items-center py-20 text-center">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 max-w-md shadow-lg">
                <svg className="w-20 h-20 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
                <p className="text-gray-600 mb-6">
                  The order you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
                </p>

                <button
                  onClick={() => navigate('/history')}
                  className="btn btn-primary text-white w-full"
                >
                  Back to History
                </button>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="bg-history bg-cover bg-center py-6 md:py-12 lg:py-20 min-h-screen overflow-x-hidden">
        <section className="global-px">
          <div className="mb-6">
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Back to History</span>
            </button>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-6xl mx-auto overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">Order Details</h1>
                  <p className="text-white/90">Order ID: #{dataDetail.id}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="px-4 py-2 rounded-full text-sm font-semibold border-2 bg-white/20 backdrop-blur-sm text-white border-white/30">
                    {dataDetail.status_name}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-4 sm:p-6 md:p-8 w-full overflow-x-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                {/* Products Section */}
                <div className="p-4 sm:p-6 md:p-8 w-full overflow-x-hidden">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Order Items</h2>
                  <div className="space-y-3">
                    {dataDetail.products && dataDetail.products.length > 0 ? (
                      dataDetail.products.map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                          <div className="flex-shrink-0">
                            <img
                              src={item.product_img || productPlaceholder}
                              alt={item.product_name}
                              className="w-24 h-24 rounded-lg object-cover shadow-md"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-lg text-gray-900 mb-1 break-words overflow-wrap-anywhere">
                              {item.product_name}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                              Size: <span className="font-medium">{item.size}</span> × <span className="font-medium">{item.qty}</span>
                            </p>
                            {Array.isArray(item.add_ons) && item.add_ons.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-semibold text-gray-700 mb-1">Add-ons:</p>
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {item.add_ons.map((ao, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></span>
                                      <span className="break-words">{ao.name} <span className="text-gray-500">(+{n_f(Number(ao.price || 0))} VND)</span></span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 flex flex-col justify-center">
                            <p className="font-bold text-lg text-gray-900 whitespace-nowrap">
                              {n_f(item.subtotal)} VND
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                        <p className="text-lg">No products found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Information Sidebar */}
                <div className="lg:col-span-1 min-w-0">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Order Information</h2>
                    
                    {/* Pricing Summary */}
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center py-3 border-b-2 border-gray-300">
                        <p className="font-semibold text-gray-700 text-lg">Grand Total</p>
                        <p className="font-bold text-2xl text-gray-900">{n_f(dataDetail.grand_total)} VND</p>
                      </div>
                      <div className="space-y-2 text-sm">
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
                          <p className="text-green-600 font-semibold">-{n_f(dataDetail.discount || 0)} VND</p>
                        </div>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="space-y-3 mb-6 pt-4 border-t border-gray-300">
                      <div className="flex flex-col py-1">
                        <p className="font-medium text-gray-600 mb-2">Status</p>
                        <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold border w-fit ${getStatusBadgeClass(dataDetail.status_name)}`}>
                          {dataDetail.status_name}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <p className="font-medium text-gray-600">Payment Method</p>
                        <p className="text-gray-800 font-semibold">{dataDetail.payment_name || "N/A"}</p>
                      </div>
                      <div className="flex justify-between py-1">
                        <p className="font-medium text-gray-600">Delivery Type</p>
                        <p className="text-gray-800 font-semibold">{dataDetail.delivery_name || "N/A"}</p>
                      </div>
                      <div className="flex flex-col py-1">
                        <p className="font-medium text-gray-600 mb-1">Transaction Date</p>
                        <p className="text-gray-800">{formatDateTime(dataDetail.transaction_time)}</p>
                      </div>
                    </div>

                    {/* Address & Notes */}
                    <div className="space-y-4 pt-4 border-t border-gray-300">
                      <div className="flex flex-col">
                        <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Delivery Address
                        </p>
                        <p className="text-sm text-gray-600 break-words bg-white p-3 rounded-lg border border-gray-200">
                          {dataDetail.delivery_address || "No address provided"}
                        </p>
                      </div>
                      <div className="flex flex-col">
                        <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Notes
                        </p>
                        <p className="text-sm text-gray-600 break-words bg-white p-3 rounded-lg border border-gray-200">
                          {dataDetail.notes || "No notes"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default HistoryDetail;
