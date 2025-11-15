import "react-loading-skeleton/dist/skeleton.css";

/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useState } from "react";

import dayjs from "dayjs";
import _ from "lodash";
import Skeleton from "react-loading-skeleton";
import { connect, useSelector, useDispatch } from "react-redux";
import { NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import penIcon from "../../assets/icons/icon-pen.svg";
import illustrationsPromo from "../../assets/illustrations/mobile-search-undraw.png";
import images from "../../assets/images/person-with-a-coffee.webp";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import Modal from "../../components/Modal";
import { getPromos } from "../../utils/dataProvider/promo";
import { getCategories } from "../../utils/dataProvider/categories";
import useDocumentTitle from "../../utils/documentTitle";
import GetAllProducts from "./GetAllProducts";
import productPlaceholder from "../../assets/images/placeholder-image.webp";
import { n_f } from "../../utils/helpers";
import { cartActions } from "../../redux/slices/cart.slice";
import { createTransaction, validateOrder } from "../../utils/dataProvider/transaction";
import { getUserData } from "../../utils/authUtils";
import { toast } from "react-hot-toast";

const promos = [
  {
    name: "Limited Time Offer: 50% off!",
    desc: "Hurry, don't miss out!",
  },
  {
    name: "Buy One, Get One Free!",
    desc: "Double the fun.",
  },
  {
    name: "Exclusive Online Deal: Save 20%",
    desc: "Shop now and save.",
  },
  {
    name: "Flash Sale Alert: 24 Hours Only!",
    desc: "Act fast, limited stock.",
  },
];

function Products(props) {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const [ddMenu, setDdmenu] = useState(false);
  const [sort, setSort] = useState(undefined);
  const [promo, setPromo] = useState([]);
  const [promoLoad, setPromoLoad] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const controller = useMemo(() => new AbortController(), []);
  const [search, setSearch] = useState(
    searchParams.has("q") ? searchParams.get("q") : undefined
  );
  const { userInfo } = useSelector((state) => ({
    userInfo: state.userInfo,
  }));
  const cartRedux = useSelector((state) => state.cart);
  const cart = cartRedux.list;
  const dispatch = useDispatch();
  const [remove, setRemove] = useState({ product_id: "", size_id: "", add_on_ids: [] });
  const [categories, setCategories] = useState([]);
  const closeRemoveModal = () => setRemove({ product_id: "", size_id: "" });
  const [paidNow, setPaidNow] = useState(false);

  const toggleDdmenu = () => {
    setDdmenu(!ddMenu);
  };
  const navigate = useNavigate();

  const navigateWithParams = (newParams) => {
    const searchParams = new URLSearchParams(location.search);
    Object.entries(newParams).forEach(([key, value]) =>
      searchParams.set(key, value)
    );
    navigate(`${location.pathname}?${searchParams}`);
  };

  const navigateDeleteParams = (deleteParams) => {
    const searchParams = new URLSearchParams(location.search);
    Object.entries(deleteParams).forEach(([key, value]) =>
      searchParams.delete(key)
    );
    navigate(`${location.pathname}?${searchParams}`);
  };

  const delayedSort = _.debounce((orderBy, sort) => {
    navigateWithParams({ orderBy, sort });
  }, 200);

  const delayedSearch = useCallback(
    _.debounce((q) => {
      navigateWithParams({ q });
    }, 1500),
    []
  );

  useEffect(() => {
    if (sort) {
      const currSort = sort.split("_", 2);
      delayedSort(currSort[0], currSort[1]);
    }
    return () => {};
  }, [sort]);

  useEffect(() => {
    if (search) {
      delayedSearch(search);
    } else {
      navigateDeleteParams({ q: null });
    }
  }, [search]);

  const confirmOrder = async () => {
    if (!userInfo?.token || userInfo.token === "") {
      navigate("/auth/login");
      return;
    }
    if (cart.length < 1) return;
    if (Number(userInfo.role) === 2) {
      try {
        const body = { payment_id: 1, delivery_id: 1, status_id: 3, address: "", notes: "", customer_id: null, paid: paidNow };
        await createTransaction(body, cart, userInfo.token, controller);
        toast.success("Order saved");
        // If confirming from a draft, remove that draft; else start a fresh cart
        if (cartRedux.activeCartId) {
          dispatch(cartActions.deleteCart(cartRedux.activeCartId));
        } else {
          dispatch(cartActions.createNewCartAndActivate());
        }
        // Reset paid checkbox for new order
        setPaidNow(false);
      } catch (e) {
        toast.error("Failed to save order");
      }
      return;
    }
    // Validate stock before moving to cart
    try {
      const aggregated = Object.values(
        cart.reduce((acc, cur) => {
          const pid = cur.product_id;
          if (!acc[pid]) acc[pid] = { product_id: pid, qty: 0 };
          acc[pid].qty += Number(cur.qty || 0);
          return acc;
        }, {})
      );
      await validateOrder(aggregated, userInfo.token, controller);
      navigate(`/cart`);
    } catch (e) {
      const msg = e?.response?.data?.message || "Sản phẩm không đủ số lượng";
      toast.error(msg);
    }
  };

  const pickOngoingPromos = useCallback((items = []) => {
    const now = dayjs();
    return items.filter((item) => {
      const status = String(item.status || "").toLowerCase();
      if (status) {
        if (status.includes("ongoing") || status.includes("current")) return true;
        if (status.includes("ended") || status.includes("inactive") || status.includes("upcoming")) return false;
      }

      const active = item.active ?? item.is_active ?? true;
      if (!active) return false;

      const startsAt = item.startsAt || item.start_date || item.startDate || null;
      const endsAt = item.endsAt || item.end_date || item.endDate || null;

      if (startsAt && dayjs(startsAt).isAfter(now)) return false;
      if (endsAt && dayjs(endsAt).isBefore(now)) return false;

      return true;
    });
  }, []);

  const fetchPromo = async () => {
    try {
      setPromoLoad(true);
      const result = await getPromos({ page: 1, limit: 4, status: "current" }, controller);
      const items = Array.isArray(result.data?.data) ? result.data.data : [];
      setPromo(pickOngoingPromos(items));
      setPromoLoad(false);
    } catch (error) {
      setPromoLoad(false);
      setPromo([]);
      console.log(error);
    }
  };

  useEffect(() => {
    fetchPromo();
  }, []);

  useEffect(() => {
    const c = new AbortController();
    getCategories(c)
      .then((res) => setCategories((res.data?.data || []).sort((a,b) => (a.display_order ?? 0) - (b.display_order ?? 0))))
      .catch(() => setCategories([]));
    return () => c.abort();
  }, []);

  useDocumentTitle(props.title);
  return (
    <>
      <Modal
        isOpen={remove.product_id !== "" && remove.size_id !== ""}
        onClose={closeRemoveModal}
        className="flex flex-col gap-y-5"
      >
        Are you sure to delete this item from your cart?
        <div className="mx-auto space-x-3">
          <button
            onClick={() => {
              dispatch(
                cartActions.removeFromCart({
                  product_id: remove.product_id,
                  size_id: remove.size_id,
                  add_on_ids: Array.isArray(remove.add_on_ids) ? remove.add_on_ids : [],
                })
              );
              closeRemoveModal();
            }}
            className="btn btn-primary text-white"
          >
            Yes
          </button>
          <div onClick={closeRemoveModal} className="btn btn-error">
            No
          </div>
        </div>
      </Modal>
      <Header />

      <main className="flex flex-col-reverse md:flex-row global-px">
        <section className="flex-1 flex flex-col items-stretch gap-5 py-5 md:border-r-2 border-solid md:pr-6 md:min-w-[340px]">
          {Number(userInfo.role) === 1 ? (
            <>
              <h2 className="font-bold text-2xl">Promo Today</h2>
              <p className="text-center">
                Coupons will be updated every weeks.
                <br />
                Check them out!
              </p>
              <div className="flex flex-col justify-center gap-5">
                {promoLoad ? (
                  <Skeleton
                    height={125}
                    count={4}
                    containerClassName="flex-1 w-[350px] md:w-auto lg:w-[346px]"
                    style={{ marginBottom: "1rem", minWidth: 250 }}
                  />
                ) : promo.length < 1 ? (
                  <div className="flex flex-col text-center">
                    <img src={illustrationsPromo} width={200} />
                    <p className="text-tertiary font-semibold">No promo today</p>
                    <p className="text-black font-medium text-sm">Dont worry, check tommorow</p>
                  </div>
                ) : (
                  promo.map((promo, idx) => {
                    const promoName = promo.name || promo.title || promo.promo_name || "Promo";
                    const promoDesc = promo.desc || promo.description || promo.promo_desc || "";
                    const promoImage = promo.img || promo.image_url || images;
                    const promoKind = String(promo.kind || promo.type || "code").toLowerCase() === "event" ? "event" : "code";
                    return (
                    <div
                      className="flex flex-row items-center bg-slate-300  rounded-xl gap-2 px-4 py-3 relative"
                      key={idx}
                    >
                      <div className="flex-1 flex justify-center py-1">
                        <div className="avatar">
                          <div className="w-24 rounded-xl">
                            <img src={promoImage} className="mix-blend-multiply contrast-100" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-[2_2_0%]">
                        <p className="font-bold">{promoName}</p>
                        <p className="text-sm">{promoDesc}</p>
                      </div>
                      <NavLink to={`/promo/edit/${promoKind}/${promo.id}`} className="flex items-center gap-2 text-primary">
                        Edit Promo
                      </NavLink>
                    </div>
                    );
                  })
                )}
              </div>
              <div className="mt-auto flex w-full">
                <button onClick={() => navigate(`/promo/new`)} className="btn btn-primary text-white w-full">
                  Create new promo
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-bold text-2xl">Order Summary</h2>
              <section className="flex w-full flex-col gap-4 my-2">
                {cart.length < 1 ? (
                  <div className="text-center text-tertiary">Your cart is empty</div>
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
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:items-center" key={idx}>
                        <aside className="w-20 h-20">
                          <img
                            src={_.isEmpty(list.img) ? productPlaceholder : list.img}
                            alt={list.name}
                            className="aspect-square h-20 w-20 object-cover rounded-xl"
                          />
                        </aside>
                        <aside className="flex-1">
                          <p className="font-semibold">{list.name}</p>
                          <p className="text-sm">{sizeName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => {
                                if (list.qty - 1 < 1)
                                  return setRemove({
                                    product_id: list.product_id,
                                    size_id: list.size_id,
                                    add_on_ids: Array.isArray(list.add_on_ids) ? list.add_on_ids : [],
                                  });
                                dispatch(
                                  cartActions.decrementQty({
                                    product_id: list.product_id,
                                    size_id: list.size_id,
                                    add_on_ids: Array.isArray(list.add_on_ids) ? list.add_on_ids : [],
                                  })
                                );
                              }}
                              className="rounded-full bg-tertiary text-white font-bold w-6 h-6 items-center justify-center duration-200 hover:bg-primary-focus"
                            >
                              -
                            </button>
                            <p>x {list.qty}</p>
                            <button
                              onClick={() =>
                                dispatch(
                                  cartActions.incrementQty({
                                    product_id: list.product_id,
                                    size_id: list.size_id,
                                    add_on_ids: Array.isArray(list.add_on_ids) ? list.add_on_ids : [],
                                  })
                                )
                              }
                              className="rounded-full bg-tertiary text-white font-bold w-6 h-6 items-center justify-center duration-200 hover:bg-primary-focus"
                            >
                              +
                            </button>
                          </div>
                        </aside>
                        <aside className="sm:min-w-[120px] sm:text-right font-medium flex flex-col sm:items-end items-start w-full sm:w-auto">
                          <button
                            onClick={() =>
                              setRemove({
                                product_id: list.product_id,
                                size_id: list.size_id,
                                add_on_ids: Array.isArray(list.add_on_ids) ? list.add_on_ids : [],
                              })
                            }
                            className="rounded-full h-6 w-6 bg-tertiary text-white font-bold text-xs text-center flex mb-1"
                          >
                            <p className="m-auto">X</p>
                          </button>
                          <p>
                             {n_f(Number(list.price) * Number(list.qty))} VND
                          </p>
                        </aside>
                      </div>
                    );
                  })
                )}
              </section>
              <hr className="w-full" />
              <section className="flex flex-col w-full">
                {Number(userInfo.role) === 2 && (
                  <label className="flex items-center gap-2 mb-2 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-tertiary w-4 h-4"
                      checked={paidNow}
                      onChange={(e) => setPaidNow(e.target.checked)}
                    />
                    <span>Order is paid</span>
                  </label>
                )}
                <div className="flex flex-col sm:flex-row uppercase font-bold my-4 gap-2">
                  <p className="sm:flex-[2_2_0%]">Total</p>
                  <p className="sm:flex-1 sm:text-right">
                     {n_f(cart.reduce((acc, cur) => acc + cur.price * cur.qty, 0))} VND
                  </p>
                </div>
              </section>
              <div className="flex w-full mt-3">
                <div className="grid grid-cols-1 gap-3 w-full">
                  <button onClick={confirmOrder} className="btn btn-primary text-white w-full">
                    Confirm Order
                  </button>
                  {Number(userInfo.role) === 2 && (
                    <button
                      onClick={() => {
                        if (cart.length < 1) return;
                        dispatch(cartActions.saveActiveCartAsDraft());
                      }}
                      className="btn btn-secondary text-tertiary w-full"
                    >
                      Save Order
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
        <section className="flex-[2_2_0%] flex flex-col md:pl-16 py-5">
          <div className="relative">
  <div className="flex items-center justify-between mb-10">
    <nav className="list-none flex flex-row gap-5 overflow-x-auto whitespace-nowrap flex-nowrap scrollbar-hide pr-4">
      <li>
        <NavLink
          className={({ isActive }) =>
            isActive
              ? "font-semibold text-tertiary border-b-2 border-tertiary pb-1 drop-shadow-lg"
              : "hover:drop-shadow-lg hover:border-b-2 border-tertiary pb-1"
          }
          to="/products"
          end
        >
          Menu
        </NavLink>
      </li>
      {categories.map((c) => (
        <li key={c.id}>
          <NavLink
            className={({ isActive }) =>
              isActive
                ? "font-semibold text-tertiary border-b-2 border-tertiary pb-1 drop-shadow-lg"
                : "hover:drop-shadow-lg hover:border-b-2 border-tertiary pb-1"
            }
            to={`category/${c.id}`}
          >
            {c.name}
          </NavLink>
        </li>
      ))}
    </nav>

    {/* dropdown tách ra khỏi nav */}
    <div className="relative ml-2">
      <button
        onClick={toggleDdmenu}
        className={`${ddMenu ? "rotate-180" : "rotate-0"} duration-150 focus:bg-none`}
      >
        ▼
      </button>

      {ddMenu && (
        <div className="absolute w-72 shadow border border-gray-200 bg-white rounded-md right-0 p-5 top-10 text-primary z-50">
          <section className="flex flex-col">
            <aside className="flex-1 flex flex-col">
              <label
                htmlFor="searchProduct"
                className="block mb-2 text-sm font-medium text-gray-900"
              >
                Keywords
              </label>
              <input
                type="text"
                name="searchProduct"
                id="searchProduct"
                className="block w-full p-2 mb-6 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </aside>
            <aside className="flex-1">
              <label
                htmlFor="orderBy"
                className="block mb-2 text-sm font-medium text-gray-900"
              >
                Order by
              </label>
              <select
                id="orderBy"
                className="block w-full p-2 mb-6 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 "
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value={undefined}>Choose a order</option>
                <option value="price_asc">Price (Asc)</option>
                <option value="price_desc">Price (Desc)</option>
                <option value="id_desc">Newest</option>
                <option value="id_asc">Oldest</option>
                <option value="category_asc">Category (Asc)</option>
                <option value="category_desc">Category (Desc)</option>
              </select>
            </aside>
          </section>
        </div>
      )}
    </div>
  </div>
</div>

          <Routes path="/products/*">
            <Route
              index
              element={
                <GetAllProducts
                  searchParams={searchParams}
                  setSearchParams={setSearchParams}
                  sort={sort}
                  setSort={setSort}
                />
              }
            ></Route>
            <Route
              path="category/:catId"
              element={
                <GetAllProducts
                  searchParams={searchParams}
                  setSearchParams={setSearchParams}
                  sort={sort}
                  setSort={setSort}
                />
              }
            />
          </Routes>

          <section className="my-6 text-tertiary">
            *the price has been cutted by discount appears
          </section>
          {Number(props.userInfo.role) === 1 && (
            <div className="mt-auto flex w-full">
              <button
                onClick={() => navigate("/products/new")}
                className="btn btn-block btn-primary text-white font-bold normal-case"
              >
                Add new product
              </button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
});

const mapDispatchToProps = {};

export default connect(mapStateToProps, mapDispatchToProps)(Products);
