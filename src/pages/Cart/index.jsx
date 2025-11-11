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
import { useNavigate } from 'react-router-dom';

import loadingImage from '../../assets/images/loading.svg';
import productPlaceholder from '../../assets/images/placeholder-image.webp';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Modal from '../../components/Modal';
import { cartActions } from '../../redux/slices/cart.slice';
import { createTransaction, validateDiscount } from '../../utils/dataProvider/transaction';
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
  const [discountMsg, setDiscountMsg] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cart = cartRedux.list;
  const [result, setResult] = useState("");
  const [showMapModal, setShowMapModal] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [newAddressText, setNewAddressText] = useState("");
  const [shipFee, setShipFee] = useState(0);
  const [shipDistance, setShipDistance] = useState(null);
  const [shipError, setShipError] = useState("");
  const [shipLoading, setShipLoading] = useState(false);

  const [form, setForm] = useState({
    payment: "",
    delivery_address: "",
    notes: "",
    phone_number: "",
  });
  useDocumentTitle("My Cart");

  function onChangeForm(e) {
    return setForm((form) => {
      return {
        ...form,
        [e.target.name]: e.target.value,
      };
    });
  }

  useEffect(() => {
    if (profile.isFulfilled) {
      setForm({
        ...form,
        phone_number: profile.data?.phone_number,
        delivery_address: profile.data?.address,
      });
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
  const missingPhone = !form.phone_number || String(form.phone_number).trim() === "";
  const disabled = form.payment === "" || missingAddress || missingPhone || shipError !== "" || shipLoading;
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
    const code = (discountCode || "").trim();
    if (!code) {
      setDiscountMsg("Vui lòng nhập mã giảm giá");
      return;
    }
    try {
      const res = await validateDiscount(code, subtotal, userInfo.token, controller);
      const data = res.data || {};
      setAppliedDiscount(Number(data.discount_amount || 0));
      setAppliedCode(String(data.coupon_code || code));
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
    if (missingPhone) {
      toast.error("Vui lòng cập nhật số điện thoại trước khi thanh toán");
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

      await createTransaction(
        {
          payment_id: form.payment,
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

      <main className="bg-cart bg-cover bg-center">
        <div className="mx-auto px-3 space-y-3 py-10 max-w-sm sm:max-w-lg md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[88rem]">
          <section className="text-white lg:text-3xl text-2xl font-extrabold drop-shadow-lg text-center md:text-left">
            Checkout your item now!
          </section>
          <section className="flex flex-col md:flex-row lg:gap-16 gap-10">
            <aside className="flex-1 flex">
              <section className="flex bg-white rounded-lg p-5 lg:p-7 flex-col w-full">
                <div className="w-full my-4 lg:my-6">
                  <p className="text-tertiary font-bold text-xl lg:text-3xl text-center">
                    Order Summary
                  </p>
                </div>
                <section className="flex w-full flex-col gap-4 my-4">
                  {cart.map((list, idx) => {
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
                        className="flex flex-row gap-2 lg:gap-5 w-full lg:text-lg items-center relative"
                        key={idx}
                      >
                        <aside className="flex-1">
                          <img
                            src={
                              isEmpty(list.img) ? productPlaceholder : list.img
                            }
                            alt={list.name}
                            className="aspect-square h-auto object-cover rounded-xl"
                          />
                        </aside>
                        <aside className="flex-[2_2_0%]">
                          <p className="font-semibold">{list.name}</p>
                          <div className="flex gap-2">
                            <p>x {list.qty}</p>
                          </div>
                          <p>{sizeName}</p>
                          {Array.isArray(list.add_ons_detail) && list.add_ons_detail.length > 0 && (
                            <ul className="text-sm text-gray-500 list-disc ml-5">
                              {list.add_ons_detail.map((ao) => (
                                <li key={ao.id}>
                                  {ao.name} (+{n_f(Number(ao.price || 0))} VND)
                                </li>
                              ))}
                            </ul>
                          )}
                        </aside>
                        <aside className="flex-1">
                          <p className="text-right">
                             {n_f(Number(list.price) * Number(list.qty))} VND
                          </p>
                        </aside>
                      </div>
                    );
                  })}
                </section>
                <hr />
                <section className="flex flex-col w-full my-4">
                  <div className="flex flex-col mb-4">
                    <label className="text-sm font-semibold mb-1">Discount code</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        placeholder="Enter discount code"
                        className="flex-1 border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none"
                      />
                      <button type="button" onClick={applyDiscount} className="btn btn-sm btn-primary text-white">
                        Apply
                      </button>
                    </div>
                    {discountMsg && (
                      <div className={`text-sm mt-1 ${appliedDiscount > 0 ? 'text-green-600' : 'text-red-500'}`}>{discountMsg}</div>
                    )}
                  </div>
                  <div className="flex flex-row uppercase lg:text-lg">
                    <p className="flex-[2_2_0%]">Subtotal</p>
                    <p className="flex-1 lg:flex-none text-right">
                      {" "}
                      {n_f(subtotal)} VND
                    </p>
                  </div>
                  {appliedDiscount > 0 && (
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
                  {shipError && (
                    <div className="text-red-500 text-sm mt-2">{shipError}</div>
                  )}
                  <div className="flex flex-row uppercase  lg:text-xl font-bold my-10">
                    <p className="flex-[2_2_0%]">Total</p>
                    <p className="flex-initial lg:flex-none">
                      {" "}
                      {n_f(Math.max(0, subtotal - Number(appliedDiscount || 0)) + Number(shipFee || 0))} VND
                    </p>
                  </div>
                </section>
              </section>
            </aside>
            <aside className="flex-1 flex flex-col gap-5">
              <section className="text-white text-xl lg:text-2xl font-extrabold drop-shadow-lg text-center md:text-left relative items-center">
                Address details
                <button
                  onClick={editMode ? saveEditInfo : toggleEdit}
                  className="absolute text-lg right-0 bottom-0 top-1 hover:underline"
                >
                  {editMode ? "save" : "edit"}
                </button>
                {editMode && (
                  <button
                    onClick={() => setShowMapModal(true)}
                    className="absolute text-lg right-16 bottom-0 top-1 hover:underline"
                  >
                    use map
                  </button>
                )}
              </section>
              <section className="bg-white rounded-xl  p-5 lg:p-7 space-y-2">
                <div className="flex gap-2 items-center">
                  <b>Delivery</b> to
                  <select
                    className="border rounded px-2 py-1 text-sm"
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
                    {editMode && <option value="__new__">New address...</option>}
                    {addresses.map((a) => (
                      <option key={a.user_address_id} value={a.address_id}>
                        {a.is_default ? "(Default) " : ""}{a.address_line}
                      </option>
                    ))}
                  </select>
                  {editMode && selectedAddressId === "__new__" && (
                    <div className="w-full mt-2">
                      <input
                        type="text"
                        className="border rounded px-2 py-1 text-sm w-full"
                        placeholder="Type new address and press Enter"
                        value={newAddressText}
                        onChange={(e) => setNewAddressText(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            const text = (newAddressText || "").trim();
                            if (!text) return;
                            try {
                              const resp = await createAddress(
                                userInfo.token,
                                { address_line: text, set_default: (addresses.length === 0) },
                                controller
                              );
                              const res2 = await listAddresses(userInfo.token, controller);
                              const data2 = res2.data?.data || [];
                              setAddresses(data2);
                              const newId = resp.data?.address_id;
                              if (newId) setSelectedAddressId(newId);
                              toast.success("Address saved");
                            } catch {
                              toast.error("Failed to save address");
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
                {missingAddress && (
                  <p className="text-red-500 text-sm">Address is required</p>
                )}
                <hr />
                <input
                  value={form.notes}
                  onChange={onChangeForm}
                  disabled={!editMode}
                  className="outline-none w-full"
                  name="notes"
                  placeholder="notes..."
                />
                <hr />
                <input
                  value={form.phone_number}
                  onChange={onChangeForm}
                  disabled
                  className="outline-none"
                  name="phone_number"
                  placeholder="phone number..."
                />
                {missingPhone && (
                  <div className="text-red-500 text-sm flex items-center gap-2">
                    Phone number is required. Update it in your profile.
                    <button
                      type="button"
                      className="underline text-tertiary"
                      onClick={() => navigate("/profile")}
                    >
                      Go to Profile
                    </button>
                  </div>
                )}
              </section>
              <section className="text-white text-xl lg:text-2xl font-extrabold drop-shadow-lg text-center md:text-left relative">
                Payment method
              </section>
              <section className="bg-white rounded-xl  p-5 lg:p-7 space-y-3">
                <div className="flex gap-2 items-center">
                  <input
                    type="radio"
                    className="accent-tertiary w-4 h-4"
                    name="payment"
                    value="1"
                    id="paymentCard"
                    checked={form.payment === "1"}
                    onChange={onChangeForm}
                  />
                  <label
                    htmlFor="paymentCard"
                    className="flex items-center gap-2"
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
                    Card
                  </label>
                </div>
                <hr />
                <div className="flex gap-2 items-center">
                  <input
                    type="radio"
                    className="accent-tertiary w-4 h-4"
                    name="payment"
                    value="2"
                    id="paymentBank"
                    checked={form.payment === "2"}
                    onChange={onChangeForm}
                  />
                  <label
                    htmlFor="paymentBank"
                    className="flex items-center gap-2"
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
                    Bank account
                  </label>
                </div>
                <hr />
                <div className="flex gap-2 items-center">
                  <input
                    type="radio"
                    className="accent-tertiary w-4 h-4"
                    name="payment"
                    value="3"
                    id="paymentCod"
                    checked={form.payment === "3"}
                    onChange={onChangeForm}
                  />
                  <label
                    htmlFor="paymentCod"
                    className="flex items-center gap-2"
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
                    Cash on delivery
                  </label>
                </div>
              </section>
              <button
                disabled={disabled}
                onClick={payHandler}
                className={`${
                  isLoading && "loading"
                } btn btn-block btn-primary text-white py-4 font-bold rounded-lg disabled:bg-opacity-100`}
              >
                Confirm and Pay
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
