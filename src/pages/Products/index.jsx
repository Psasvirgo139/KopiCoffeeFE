import "react-loading-skeleton/dist/skeleton.css";

/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useState } from "react";

import _ from "lodash";
import Skeleton from "react-loading-skeleton";
import { connect, useSelector, useDispatch } from "react-redux";
import {
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import penIcon from "../../assets/icons/icon-pen.svg";
import illustrationsPromo from "../../assets/illustrations/mobile-search-undraw.png";
import images from "../../assets/images/person-with-a-coffee.webp";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import Modal from "../../components/Modal";
import { getPromos } from "../../utils/dataProvider/promo";
import useDocumentTitle from "../../utils/documentTitle";
import GetAllProducts from "./GetAllProducts";
import productPlaceholder from "../../assets/images/placeholder-image.webp";
import { n_f } from "../../utils/helpers";
import { cartActions } from "../../redux/slices/cart.slice";

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
  const [remove, setRemove] = useState({ product_id: "", size_id: "" });
  const closeRemoveModal = () => setRemove({ product_id: "", size_id: "" });

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

  const fetchPromo = async () => {
    try {
      setPromoLoad(true);
      const result = await getPromos({ page: 1 }, controller);
      setPromo(result.data.data);
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
        <section className="flex-1 flex flex-col items-center gap-5 py-5 md:border-r-2 border-solid md:pr-6">
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
                  promo.map((promo, idx) => (
                    <div
                      className="flex flex-row items-center bg-slate-300  rounded-xl gap-2 px-4 py-3 relative"
                      key={idx}
                    >
                      <div className="flex-1 flex justify-center py-1">
                        <div className="avatar">
                          <div className="w-24 rounded-xl">
                            <img src={promo.img || images} className="mix-blend-multiply contrast-100" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-[2_2_0%]">
                        <p className="font-bold">{promo.name}</p>
                        <p className="text-sm">{promo.desc}</p>
                      </div>
                      <NavLink to={`/promo/edit/${promo.id}`} className="flex items-center gap-2 text-primary">
                        Edit Promo
                      </NavLink>
                    </div>
                  ))
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
                      <div className="flex flex-row gap-3 w-full items-center" key={idx}>
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
                                  });
                                dispatch(
                                  cartActions.decrementQty({
                                    product_id: list.product_id,
                                    size_id: list.size_id,
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
                                  })
                                )
                              }
                              className="rounded-full bg-tertiary text-white font-bold w-6 h-6 items-center justify-center duration-200 hover:bg-primary-focus"
                            >
                              +
                            </button>
                          </div>
                        </aside>
                        <aside className="min-w-[120px] text-right font-medium flex flex-col items-end">
                          <button
                            onClick={() =>
                              setRemove({
                                product_id: list.product_id,
                                size_id: list.size_id,
                              })
                            }
                            className="rounded-full h-6 w-6 bg-tertiary text-white font-bold text-xs text-center flex mb-1"
                          >
                            <p className="m-auto">X</p>
                          </button>
                          <p>
                            VND {n_f(Number(list.price) * Number(list.qty))}
                          </p>
                        </aside>
                      </div>
                    );
                  })
                )}
              </section>
              <hr className="w-full" />
              <section className="flex flex-col w-full">
                <div className="flex flex-row uppercase">
                  <p className="flex-[2_2_0%]">Subtotal</p>
                  <p className="flex-1 text-right">
                    VND {n_f(cart.reduce((acc, cur) => acc + cur.price * cur.qty, 0))}
                  </p>
                </div>
                <div className="flex flex-row uppercase">
                  <p className="flex-[2_2_0%]">Tax & Fees</p>
                  <p className="flex-1 text-right">VND 20.000</p>
                </div>
                <div className="flex flex-row uppercase">
                  <p className="flex-[2_2_0%]">Shipping</p>
                  <p className="flex-1 text-right">VND 10.000</p>
                </div>
                <div className="flex flex-row uppercase font-bold my-4">
                  <p className="flex-[2_2_0%]">Total</p>
                  <p className="flex-1 text-right">
                    VND {n_f(cart.reduce((acc, cur) => acc + cur.price * cur.qty, 0) + 30000)}
                  </p>
                </div>
              </section>
              <div className="mt-auto flex w-full">
                <button onClick={() => navigate(`/cart`)} className="btn btn-primary text-white w-full">
                  Confirm Order
                </button>
              </div>
            </>
          )}
        </section>
        <section className="flex-[2_2_0%] flex flex-col md:pl-16 py-5">
          <nav className="list-none flex flex-row md:justify-between justify-evenly flex-wrap gap-5 mb-10 ">
            <li>
              <NavLink
                className={({ isActive }) =>
                  isActive
                    ? "font-semibold text-tertiary border-b-2 border-tertiary pb-1 drop-shadow-lg"
                    : "" +
                      " hover:drop-shadow-lg hover:border-b-2 border-tertiary pb-1"
                }
                to="/products"
                end
              >
                Favorite & Promo
              </NavLink>
            </li>
            <li>
              <NavLink
                className={({ isActive }) =>
                  isActive
                    ? "font-semibold text-tertiary border-b-2 border-tertiary pb-1 drop-shadow-lg"
                    : "" +
                      " hover:drop-shadow-lg hover:border-b-2 border-tertiary pb-1"
                }
                to="category/1"
              >
                Coffee
              </NavLink>
            </li>
            <li>
              <NavLink
                className={({ isActive }) =>
                  isActive
                    ? "font-semibold text-tertiary border-b-2 border-tertiary pb-1 drop-shadow-lg"
                    : "" +
                      " hover:drop-shadow-lg hover:border-b-2 border-tertiary pb-1"
                }
                to="category/2"
              >
                Non Coffee
              </NavLink>
            </li>
            <li>
              <NavLink
                className={({ isActive }) =>
                  isActive
                    ? "font-semibold text-tertiary border-b-2 border-tertiary pb-1 drop-shadow-lg"
                    : "" +
                      " hover:drop-shadow-lg hover:border-b-2 border-tertiary pb-1"
                }
                to="category/3"
              >
                Foods
              </NavLink>
            </li>
            <li>
              <NavLink
                className={({ isActive }) =>
                  isActive
                    ? "font-semibold text-tertiary border-b-2 border-tertiary pb-1 drop-shadow-lg"
                    : "" +
                      " hover:drop-shadow-lg hover:border-b-2 border-tertiary pb-1"
                }
                to="category/4"
              >
                Add-on
              </NavLink>
            </li>
            <li className="relative">
              <button
                onClick={toggleDdmenu}
                className={
                  (ddMenu ? "rotate-180" : "rotate-0") +
                  " duration-150 focus:bg-none"
                }
              >
                ▼
              </button>
              <div
                className={
                  (!ddMenu ? "opacity-0 z-0 " : " z-[5]") +
                  " absolute w-72 shadow border-1 border-gray-200 bg-white rounded-md right-0 p-5 top-10 text-primary duration-200 transition-opacity"
                }
              >
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
            </li>
          </nav>
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
