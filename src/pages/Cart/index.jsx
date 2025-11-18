import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { isEmpty } from 'lodash';
import { toast } from 'react-hot-toast';
import {
  useDispatch,
  useSelector,
} from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';

import loadingImage from '../../assets/images/loading.svg';
import productPlaceholder from '../../assets/images/placeholder-image.webp';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Modal from '../../components/Modal';
import { cartActions } from '../../redux/slices/cart.slice';
import { createTransaction, validateDiscount, createVNPayUrl } from '../../utils/dataProvider/transaction';
import { createPayOSPayment } from '../../utils/dataProvider/payment';
import useDocumentTitle from '../../utils/documentTitle';
import { n_f } from '../../utils/helpers';
import MapAddressModal from './MapAddressModal';
import { listAddresses, createAddress } from '../../utils/dataProvider/profile';
import { estimateShipping } from '../../utils/dataProvider/shipping';

function Cart() {
  const userInfo = useSelector((state) => state.userInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  // const [cart, setCart] = useState([]);
  const cartRedux = useSelector((state) => state.cart);
  const profile = useSelector((state) => state.profile);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountApplyToShipping, setDiscountApplyToShipping] = useState(false);
  const [discountMsg, setDiscountMsg] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cart = cartRedux.list;
  const [result, setResult] = useState("");
  const [showMapModal, setShowMapModal] = useState(false);
  
  // Kiểm tra lỗi thanh toán từ query params
  useEffect(() => {
    const error = searchParams.get("error");
    const payment = searchParams.get("payment");
    if (error === "payment_failed" || payment === "cancelled") {
      toast.error("Payment failed. Please try again.");
      // Xóa query params sau khi hiển thị thông báo
      navigate("/cart", { replace: true });
    }
  }, [searchParams, navigate]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [newAddressText, setNewAddressText] = useState("");
  const [shipFee, setShipFee] = useState(0);
  const [shipDistance, setShipDistance] = useState(null);
  const [shipError, setShipError] = useState("");
  const [shipLoading, setShipLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const [form, setForm] = useState({
    payment: "",
    delivery_address: "",
    notes: "",
    phone_number: "",
  });
  useDocumentTitle("My Cart");

  const validatePhoneNumber = (phone) => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (!phone || phone.trim() === "") {
      return "Phone number is required";
    }
    
    if (digitsOnly.length !== 10) {
      return "Phone number must be exactly 10 digits";
    }
    
    return "";
  };

  function onChangeForm(e) {
    const { name, value } = e.target;
    
    // For phone number, only allow digits and limit to 10 digits
    if (name === "phone_number") {
      // Remove non-digit characters
      const digitsOnly = value.replace(/\D/g, '');
      // Limit to 10 digits
      const limitedValue = digitsOnly.slice(0, 10);
      
      setForm((form) => ({
        ...form,
        [name]: limitedValue,
      }));
      
      // Validate phone number
      const error = validatePhoneNumber(limitedValue);
      setPhoneError(error);
    } else {
      setForm((form) => ({
        ...form,
        [name]: value,
      }));
    }
  }

  useEffect(() => {
    if (profile.isFulfilled) {
      const phoneNumRaw = profile.data?.phone_number || "";
      // Normalize phone number: remove all non-digit characters
      const phoneNum = phoneNumRaw.replace(/\D/g, '');
      setForm({
        ...form,
        phone_number: phoneNum,
        delivery_address: profile.data?.address,
      });
      // Validate phone number when loading from profile
      const error = validatePhoneNumber(phoneNum);
      setPhoneError(error);
      // fetch user addresses for dropdown
      if (userInfo?.token) {
        listAddresses(userInfo.token, controller)
          .then((res) => {
            const data = res.data?.data || [];
            setAddresses(data);
            const def = data.find((a) => a.is_default);
            if (def) {
              setSelectedAddressId(def.address_id || null);
            } else if (data.length > 0) {
              setSelectedAddressId(data[0].address_id || null);
            } else {
              setSelectedAddressId("__new__");
              setNewAddressText("");
            }
          })
          .catch(() => setAddresses([]));
      }
    }
    // setIsLoading(true);
    //   getCart(userInfo.token)
    //     .then((res) => {
    //       setCart(res.data.data);
    //       setIsLoading(false);
    //     })
    //     .catch((err) => {
    //       setIsLoading(false);
    //       toast.error("Failed to fetch data");
    //     });
  }, [profile]);

  const Loading = (props) => {
    return (
      <section className="min-h-[80vh] flex items-center justify-center flex-col">
        <div>
          <img src={loadingImage} alt="" />
        </div>
      </section>
    );
  };

  const toggleEdit = () => setEditMode(!editMode);
  const saveEditInfo = () => {
    toggleEdit();
  };

  const isNewAddressSelected = selectedAddressId === "__new__" || selectedAddressId === null;
  const missingAddress = isNewAddressSelected ? !newAddressText || String(newAddressText).trim() === "" : false;
  const phoneDigits = form.phone_number ? form.phone_number.replace(/\D/g, '') : '';
  const missingPhone = !form.phone_number || String(form.phone_number).trim() === "" || phoneDigits.length !== 10;
  const disabled = form.payment === "" || missingAddress || missingPhone || shipError !== "" || shipLoading || phoneError !== "";
  const controller = useMemo(() => new AbortController());

  // Estimate shipping when address selection changes
  useEffect(() => {
    if (!userInfo?.token) return;
    setShipError("");
    setShipLoading(true);
    const doEstimate = async () => {
      try {
        let params = {};
        if (!isNewAddressSelected && selectedAddressId) {
          params.address_id = selectedAddressId;
        } else if (isNewAddressSelected && newAddressText && newAddressText.trim() !== "") {
          params.address = newAddressText.trim();
        } else {
          setShipFee(0);
          setShipDistance(null);
          setShipLoading(false);
          return;
        }
        const res = await estimateShipping(userInfo.token, params, controller);
        const data = res.data?.data;
        setShipDistance(data?.distance_meters || null);
        setShipFee(Number(data?.shipping_fee || 0));
        setShipError("");
      } catch (e) {
        const msg = e?.response?.data?.message || "Không thể ước tính phí ship";
        setShipError(msg);
        setShipFee(0);
        setShipDistance(null);
      } finally {
        setShipLoading(false);
      }
    };
    doEstimate();
  }, [selectedAddressId, newAddressText, userInfo?.token]);
  const subtotal = useMemo(() => cart.reduce((acc, cur) => acc + Number(cur.price) * Number(cur.qty), 0), [cart]);

  const applyDiscount = async () => {
    setDiscountMsg("");
    setAppliedDiscount(0);
    setAppliedCode("");
    setDiscountApplyToShipping(false);
    const code = (discountCode || "").trim();
    if (!code) {
      setDiscountMsg("Vui lòng nhập mã giảm giá");
      return;
    }
    try {
      const res = await validateDiscount(code, subtotal, shipFee, userInfo.token, controller);
      const data = res.data || {};
      setAppliedDiscount(Number(data.discount_amount || 0));
      setAppliedCode(String(data.coupon_code || code));
      setDiscountApplyToShipping(Boolean(data.applies_to_shipping));
      setDiscountMsg(data.message || "Áp dụng mã thành công");
      toast.success("Applied discount");
    } catch (e) {
      const msg = e?.response?.data?.message || "Mã giảm giá không hợp lệ";
      setDiscountMsg(msg);
      setAppliedDiscount(0);
      setAppliedCode("");
      toast.error(msg);
    }
  };

  const payHandler = async () => {
    if (missingAddress) {
      toast.error("Vui lòng nhập địa chỉ giao hàng");
      return;
    }
    if (missingPhone || phoneError) {
      toast.error("Vui lòng nhập số điện thoại hợp lệ (10 chữ số) trước khi thanh toán");
      return;
    }
    if (form.payment === "") {
      toast.error("Vui lòng chọn phương thức thanh toán");
      return;
    }
    if (userInfo.token === "") {
      toast.error("Login to continue transaction");
      navigate("/auth/login");
      return;
    }
    if (editMode) return toast.error("You have unsaved changes");
    if (cart.length < 1)
      return toast.error("Add at least 1 product to your cart");
    setIsLoading(true);
    try {
      let addressIdToUse = selectedAddressId;
      if (!addressIdToUse || addressIdToUse === "__new__") {
        // create new non-default address for this user by default
        const resp = await createAddress(
          userInfo.token,
          { address_line: newAddressText || form.delivery_address, ward: undefined, district: undefined, city: undefined, latitude: undefined, longitude: undefined, set_default: (addresses.length === 0) },
          controller
        );
        addressIdToUse = resp.data?.address_id;
      }

        // CREATE TRANSACTION
        const txResp = await createTransaction(
            {
                payment_id: form.payment === "4" ? 2 : form.payment,
                delivery_id: 1,
                address_id: addressIdToUse,
                notes: form.notes,
                discount_code: appliedCode || undefined,
                discount_amount: appliedDiscount || undefined,
            },
            cart,
            userInfo.token,
            controller
        );

        const orderId = txResp?.data?.data?.id;
        if (!orderId) {
            toast.error("Không tạo được đơn hàng");
            return;
        }

        // CASE 1: VNPAY (payment === 2)
        if (form.payment === "2") {
            const vnPayResp = await createVNPayUrl(orderId, userInfo.token, controller);
            const url = vnPayResp?.data?.data?.payment_url;

            if (url) {
                window.location.href = url;
                return;
            }
            toast.error("Không tạo được liên kết VNPAY");
            return;
        }

        // CASE 2: PayOS (payment === 4)
        if (form.payment === "4") {
            try {
                const payOSResp = await createPayOSPayment(orderId, userInfo.token, controller);
                const payUrl = payOSResp?.data?.data?.payment_url;

                if (payUrl) {
                    dispatch(cartActions.resetCart());
                    window.location.href = payUrl;
                    return;
                }

                toast.error("Không thể tạo link thanh toán PayOS");
                return;

            } catch (e) {
                console.error("PayOS error:", e);
                toast.error("Không thể tạo link thanh toán PayOS. Vui lòng thử lại.");
                return;
            }
        }

        // CASE 3: các phương thức khác như COD
        toast.success("Success create transaction");
        dispatch(cartActions.resetCart());
        navigate("/history");

    } catch (err) {
        console.log(err);
        toast.error("An error ocurred, please check your internet connection");
    } finally {
        setIsLoading(false);
    }
  };
  return (
    <>
      <Header />

      <main className="bg-cart bg-cover bg-center min-h-screen">
        <div className="mx-auto px-4 sm:px-6 space-y-6 py-8 sm:py-12 max-w-sm sm:max-w-lg md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[88rem]">
          <section className="text-white lg:text-4xl text-3xl font-extrabold drop-shadow-lg text-center md:text-left mb-6">
            Checkout your item now!
          </section>
          <section className="flex flex-col lg:flex-row lg:gap-8 gap-6">
            {/* Order Summary Section */}
            <aside className="flex-1 flex">
              <section className="flex bg-white rounded-2xl shadow-lg p-6 lg:p-8 flex-col w-full">
                <div className="w-full mb-6">
                  <h2 className="text-tertiary font-bold text-2xl lg:text-3xl text-center">
                    Order Summary
                  </h2>
                </div>
                <section className="flex w-full flex-col gap-4 mb-6 max-h-[400px] overflow-y-auto scrollbar-hide">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Your cart is empty</p>
                    </div>
                  ) : (
                    cart.map((list, idx) => {
                      let sizeName;
                      switch (list.size_id) {
                        case 2:
                          sizeName = "Large";
                          break;
                        case 3:
                          sizeName = "Xtra Large";
                          break;
                        default:
                          sizeName = "Regular";
                          break;
                      }
                      return (
                        <div
                          className="flex flex-row gap-4 w-full items-center p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
                          key={idx}
                        >
                          <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24">
                            <img
                              src={
                                isEmpty(list.img) ? productPlaceholder : list.img
                              }
                              alt={list.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base sm:text-lg mb-1 truncate">{list.name}</p>
                            <div className="flex flex-wrap gap-2 items-center text-sm text-gray-600 mb-1">
                              <span className="bg-gray-100 px-2 py-0.5 rounded">Qty: {list.qty}</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded">{sizeName}</span>
                            </div>
                            {Array.isArray(list.add_ons_detail) && list.add_ons_detail.length > 0 && (
                              <ul className="text-xs sm:text-sm text-gray-500 list-disc ml-4 mt-1">
                                {list.add_ons_detail.map((ao) => (
                                  <li key={ao.id}>
                                    {ao.name} (+{n_f(Number(ao.price || 0))} VND)
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <p className="text-right font-semibold text-base sm:text-lg text-tertiary">
                              {n_f(Number(list.price) * Number(list.qty))} VND
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </section>
                <hr className="my-4" />
                <section className="flex flex-col w-full space-y-3">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-4">
                    <label className="text-sm font-semibold mb-2 block text-gray-700">Discount code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        placeholder="Enter discount code"
                        className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:border-tertiary focus:ring-2 focus:ring-tertiary/20 outline-none transition-all"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            applyDiscount();
                          }
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={applyDiscount} 
                        className="btn btn-primary text-white px-6 rounded-lg hover:opacity-90 transition-opacity font-semibold"
                      >
                        Apply
                      </button>
                    </div>
                    {discountMsg && (
                      <div className={`text-sm mt-2 font-medium ${appliedDiscount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {discountMsg}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row uppercase lg:text-lg">
                    <p className="flex-[2_2_0%]">Subtotal</p>
                    <p className="flex-1 lg:flex-none text-right">
                      {" "}
                      {n_f(subtotal)} VND
                    </p>
                  </div>
                  {appliedDiscount > 0 && !discountApplyToShipping && (
                    <div className="flex flex-row uppercase lg:text-lg text-green-700">
                      <p className="flex-[2_2_0%]">Discount ({appliedCode})</p>
                      <p className="flex-1 lg:flex-none text-right">- {n_f(appliedDiscount)} VND</p>
                    </div>
                  )}
                  <div className="flex flex-row uppercase lg:text-lg">
                    <p className="flex-[2_2_0%]">Shipping</p>
                    <p className="flex-1 lg:flex-none text-right">
                      {shipLoading ? "..." : n_f(shipFee)} VND
                    </p>
                  </div>
                  {!shipLoading && shipDistance !== null && (
                    <div className="flex flex-row text-sm text-gray-500">
                      <p className="flex-[2_2_0%]">Distance</p>
                      <p className="flex-1 lg:flex-none text-right">
                        {shipDistance >= 1000
                          ? `${(shipDistance / 1000).toFixed(2)} km`
                          : `${Math.round(shipDistance)} m`}
                      </p>
                    </div>
                  )}
                  {appliedDiscount > 0 && discountApplyToShipping && (
                    <div className="flex flex-row uppercase lg:text-lg text-green-700">
                      <p className="flex-[2_2_0%]">Discount ({appliedCode})</p>
                      <p className="flex-1 lg:flex-none text-right">- {n_f(appliedDiscount)} VND</p>
                    </div>
                  )}
                  {shipError && (
                    <div className="text-red-500 text-sm mt-2">{shipError}</div>
                  )}
                  <div className="flex flex-row uppercase  lg:text-xl font-bold my-10">
                    <p className="flex-[2_2_0%]">Total</p>
                    <p className="flex-initial lg:flex-none">
                      {" "}
                      {n_f(
                        discountApplyToShipping
                          ? (Number(subtotal || 0) + Math.max(0, Number(shipFee || 0) - Number(appliedDiscount || 0)))
                          : (Math.max(0, Number(subtotal || 0) - Number(appliedDiscount || 0)) + Number(shipFee || 0))
                      )} VND
                    </p>
                  </div>
                </section>
              </section>
            </aside>
            
            {/* Address & Payment Section */}
            <aside className="flex-1 flex flex-col gap-6">
              {/* Address Details */}
              <div>
                <section className="text-white text-xl lg:text-2xl font-extrabold drop-shadow-lg mb-4 relative flex items-center justify-between">
                  <span>Address details</span>
                  <div className="flex gap-3">
                    {editMode && (
                      <button
                        onClick={() => setShowMapModal(true)}
                        className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        Use Map
                      </button>
                    )}
                    <button
                      onClick={editMode ? saveEditInfo : toggleEdit}
                      className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      {editMode ? "Save" : "Edit"}
                    </button>
                  </div>
                </section>
                <section className="bg-white rounded-2xl shadow-lg p-6 lg:p-7 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <svg className="w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Delivery Address
                    </label>
                    <select
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-tertiary focus:ring-2 focus:ring-tertiary/20 outline-none transition-all bg-white"
                      value={selectedAddressId || "__new__"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__new__") {
                          setSelectedAddressId("__new__");
                          setNewAddressText("");
                          return;
                        }
                        const aid = Number(val);
                        setSelectedAddressId(aid);
                        const found = addresses.find((a) => a.address_id === aid);
                        if (found?.address_line) setForm((prev) => ({ ...prev, delivery_address: found.address_line }));
                      }}
                    >
                      {editMode && <option value="__new__">+ New address...</option>}
                      {addresses.map((a) => (
                        <option key={a.user_address_id} value={a.address_id}>
                          {a.is_default ? "⭐ (Default) " : ""}{a.address_line}
                        </option>
                      ))}
                    </select>
                    
                    {missingAddress && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Address is required
                      </p>
                    )}
                  </div>
                  <hr className="border-gray-200" />
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <svg className="w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Notes (Optional)
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={onChangeForm}
                      disabled={!editMode}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-tertiary focus:ring-2 focus:ring-tertiary/20 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                      name="notes"
                      placeholder="Add delivery instructions..."
                      rows="3"
                    />
                  </div>
                  <hr className="border-gray-200" />
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <svg className="w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={form.phone_number}
                      onChange={onChangeForm}
                      disabled={!editMode}
                      maxLength={10}
                      className={`w-full border-2 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-tertiary/20 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        phoneError || (missingPhone && form.phone_number) 
                          ? "border-red-300 focus:border-red-500" 
                          : "border-gray-300 focus:border-tertiary"
                      }`}
                      name="phone_number"
                      placeholder="Enter 10-digit phone number..."
                    />
                    {phoneError && (
                      <div className="text-red-500 text-sm mt-1 flex items-center gap-2 bg-red-50 p-2 rounded">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{phoneError}</span>
                      </div>
                    )}
                    {missingPhone && !phoneError && (
                      <div className="text-red-500 text-sm mt-1 flex items-center gap-2 bg-red-50 p-2 rounded">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>Phone number is required for this order. </span>
                        {!editMode && (
                          <button
                            type="button"
                            className="underline text-tertiary font-semibold hover:text-tertiary/80"
                            onClick={toggleEdit}
                          >
                            Edit to add phone number
                          </button>
                        )}
                      </div>
                    )}
                    {editMode && !phoneError && !missingPhone && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Valid phone number (10 digits)
                      </p>
                    )}
                    {editMode && !phoneError && form.phone_number && phoneDigits.length < 10 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Enter {10 - phoneDigits.length} more digit{10 - phoneDigits.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </section>
              </div>

              {/* Payment Method */}
              <div>
                <section className="text-white text-xl lg:text-2xl font-extrabold drop-shadow-lg mb-4">
                  Payment method
                </section>
                <section className="bg-white rounded-2xl shadow-lg p-6 lg:p-7 space-y-3">
                  <div 
                    className={`flex gap-3 items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.payment === "1" 
                        ? "border-tertiary bg-tertiary/5" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setForm({...form, payment: "1"})}
                  >
                    <input
                      type="radio"
                      className="accent-tertiary w-5 h-5 cursor-pointer"
                      name="payment"
                      value="1"
                      id="paymentCard"
                      checked={form.payment === "1"}
                      onChange={onChangeForm}
                    />
                    <label
                      htmlFor="paymentCard"
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 40 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect width="40" height="40" rx="10" fill="#F47B0A" />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M13 15C13 14.4696 13.2107 13.9609 13.5858 13.5858C13.9609 13.2107 14.4696 13 15 13H27C27.5304 13 28.0391 13.2107 28.4142 13.5858C28.7893 13.9609 29 14.4696 29 15V23C29 23.5304 28.7893 24.0391 28.4142 24.4142C28.0391 24.7893 27.5304 25 27 25H15C14.4696 25 13.9609 24.7893 13.5858 24.4142C13.2107 24.0391 13 23.5304 13 23V15ZM15.5 16C15.3674 16 15.2402 16.0527 15.1464 16.1464C15.0527 16.2402 15 16.3674 15 16.5V17.5C15 17.6326 15.0527 17.7598 15.1464 17.8536C15.2402 17.9473 15.3674 18 15.5 18H17.5C17.6326 18 17.7598 17.9473 17.8536 17.8536C17.9473 17.7598 18 17.6326 18 17.5V16.5C18 16.3674 17.9473 16.2402 17.8536 16.1464C17.7598 16.0527 17.6326 16 17.5 16H15.5ZM15.5 19C15.3674 19 15.2402 19.0527 15.1464 19.1464C15.0527 19.2402 15 19.3674 15 19.5C15 19.6326 15.0527 19.7598 15.1464 19.8536C15.2402 19.9473 15.3674 20 15.5 20H20.5C20.6326 20 20.7598 19.9473 20.8536 19.8536C20.9473 19.7598 21 19.6326 21 19.5C21 19.3674 20.9473 19.2402 20.8536 19.1464C20.7598 19.0527 20.6326 19 20.5 19H15.5ZM15.5 21C15.3674 21 15.2402 21.0527 15.1464 21.1464C15.0527 21.2402 15 21.3674 15 21.5C15 21.6326 15.0527 21.7598 15.1464 21.8536C15.2402 21.9473 15.3674 22 15.5 22H16.5C16.6326 22 16.7598 21.9473 16.8536 21.8536C16.9473 21.7598 17 21.6326 17 21.5C17 21.3674 16.9473 21.2402 16.8536 21.1464C16.7598 21.0527 16.6326 21 16.5 21H15.5ZM18.5 21C18.3674 21 18.2402 21.0527 18.1464 21.1464C18.0527 21.2402 18 21.3674 18 21.5C18 21.6326 18.0527 21.7598 18.1464 21.8536C18.2402 21.9473 18.3674 22 18.5 22H19.5C19.6326 22 19.7598 21.9473 19.8536 21.8536C19.9473 21.7598 20 21.6326 20 21.5C20 21.3674 19.9473 21.2402 19.8536 21.1464C19.7598 21.0527 19.6326 21 19.5 21H18.5ZM21.5 21C21.3674 21 21.2402 21.0527 21.1464 21.1464C21.0527 21.2402 21 21.3674 21 21.5C21 21.6326 21.0527 21.7598 21.1464 21.8536C21.2402 21.9473 21.3674 22 21.5 22H22.5C22.6326 22 22.7598 21.9473 22.8536 21.8536C22.9473 21.7598 23 21.6326 23 21.5C23 21.3674 22.9473 21.2402 22.8536 21.1464C22.7598 21.0527 22.6326 21 22.5 21H21.5ZM24.5 21C24.3674 21 24.2402 21.0527 24.1464 21.1464C24.0527 21.2402 24 21.3674 24 21.5C24 21.6326 24.0527 21.7598 24.1464 21.8536C24.2402 21.9473 24.3674 22 24.5 22H25.5C25.6326 22 25.7598 21.9473 25.8536 21.8536C25.9473 21.7598 26 21.6326 26 21.5C26 21.3674 25.9473 21.2402 25.8536 21.1464C25.7598 21.0527 25.6326 21 25.5 21H24.5Z"
                          fill="white"
                        />
                      </svg>
                      <span className="font-semibold">Card</span>
                    </label>
                  </div>
                  <div 
                    className={`flex gap-3 items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.payment === "2" 
                        ? "border-tertiary bg-tertiary/5" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setForm({...form, payment: "2"})}
                  >
                    <input
                      type="radio"
                      className="accent-tertiary w-5 h-5 cursor-pointer"
                      name="payment"
                      value="2"
                      id="paymentBank"
                      checked={form.payment === "2"}
                      onChange={onChangeForm}
                    />
                    <label
                      htmlFor="paymentBank"
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 40 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect width="40" height="40" rx="10" fill="#C4C4C4" />
                        <rect width="40" height="40" rx="10" fill="#895537" />
                        <path
                          d="M20 11L13 15V16H27V15L20 11ZM15 17L14.8 24H17.3L17 17H15ZM19 17L18.8 24H21.3L21 17H19ZM23 17L22.8 24H25.3L25 17H23ZM13 27H27V25H13V27Z"
                          fill="white"
                        />
                      </svg>
                      <span className="font-semibold">Bank account</span>
                    </label>
                  </div>
                  <div 
                    className={`flex gap-3 items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.payment === "3" 
                        ? "border-tertiary bg-tertiary/5" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setForm({...form, payment: "3"})}
                  >
                    <input
                      type="radio"
                      className="accent-tertiary w-5 h-5 cursor-pointer"
                      name="payment"
                      value="3"
                      id="paymentCod"
                      checked={form.payment === "3"}
                      onChange={onChangeForm}
                    />
                    <label
                      htmlFor="paymentCod"
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 40 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect width="40" height="40" rx="10" fill="#C4C4C4" />
                        <rect width="40" height="40" rx="10" fill="#FFBA33" />
                        <path
                          d="M10 15C9.44772 15 9 15.4477 9 16V25C9 25.5523 9.44772 26 10 26H12C12 27.6569 13.3431 29 15 29C16.6569 29 18 27.6569 18 26H24C24 27.6569 25.3431 29 27 29C28.6569 29 30 27.6569 30 26H31C31.5523 26 32 25.5523 32 25V20.5C32 20.2239 31.7761 20 31.5 20H28V16C28 15.4477 27.5523 15 27 15H10ZM28 21H30.5858C30.851 21 31.1054 21.1054 31.2929 21.2929L32 22V24H30C30 22.3431 28.6569 21 27 21H28ZM15 27C14.4477 27 14 26.5523 14 26C14 25.4477 14.4477 25 15 25C15.5523 25 16 25.4477 16 26C16 26.5523 15.5523 27 15 27ZM27 27C26.4477 27 26 26.5523 26 26C26 25.4477 26.4477 25 27 25C27.5523 25 28 25.4477 28 26C28 26.5523 27.5523 27 27 27Z"
                          fill="white"
                        />
                      </svg>
                      <span className="font-semibold">Cash on delivery</span>
                    </label>
                  </div>
                  <div 
                    className={`flex gap-3 items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.payment === "4" 
                        ? "border-tertiary bg-tertiary/5" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setForm({...form, payment: "4"})}
                  >
                    <input
                      type="radio"
                      className="accent-tertiary w-5 h-5 cursor-pointer"
                      name="payment"
                      value="4"
                      id="paymentPayOS"
                      checked={form.payment === "4"}
                      onChange={onChangeForm}
                    />
                    <label
                      htmlFor="paymentPayOS"
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 40 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect width="40" height="40" rx="10" fill="#C4C4C4" />
                        <rect width="40" height="40" rx="10" fill="#1E88E5" />
                        <path
                          d="M20 12C15.58 12 12 15.58 12 20C12 24.42 15.58 28 20 28C24.42 28 28 24.42 28 20C28 15.58 24.42 12 20 12ZM20 26C16.69 26 14 23.31 14 20C14 16.69 16.69 14 20 14C23.31 14 26 16.69 26 20C26 23.31 23.31 26 20 26ZM20 16C18.9 16 18 16.9 18 18V20C18 21.1 18.9 22 20 22C21.1 22 22 21.1 22 20V18C22 16.9 21.1 16 20 16Z"
                          fill="white"
                        />
                      </svg>
                      <span className="font-semibold">QR Bank Transfer (PayOS)</span>
                    </label>
                  </div>
                </section>
              </div>

              {/* Confirm Button */}
              <button
                disabled={disabled}
                onClick={payHandler}
                className={`${
                  isLoading && "loading"
                } btn btn-block btn-primary text-white py-4 font-bold rounded-xl text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Confirm and Pay"
                )}
              </button>
            </aside>
          </section>
        </div>
      </main>
      <Footer />
      <MapAddressModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        onPick={async (picked) => {
          try {
            // Create address immediately with coordinates, default if first
            const resp = await createAddress(
              userInfo.token,
              {
                address_line: picked.address || "",
                ward: picked.ward || "",
                district: picked.district || "",
                city: picked.city || "",
                latitude: picked.lat,
                longitude: picked.lng,
                set_default: (addresses.length === 0),
              },
              controller
            );
            const newId = resp.data?.address_id;
            const res2 = await listAddresses(userInfo.token, controller);
            const data2 = res2.data?.data || [];
            setAddresses(data2);
            if (newId) setSelectedAddressId(newId);
            setEditMode(false);
            toast.success("Address saved from map");
          } catch {
            // fallback to inline entry
            setSelectedAddressId("__new__");
            setNewAddressText(picked.address || "");
            toast.error("Failed to save address, please confirm manually");
          }
        }}
      />
    </>
  );
}

export default Cart;
