import React, { useCallback, useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { toast } from "react-hot-toast";
import { connect } from "react-redux";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import Datepicker from "react-tailwindcss-datepicker";
import closeIcon from "../../assets/icons/close.svg";
import loadingImage from "../../assets/images/loading.svg";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import Loading from "../../components/Loading";
import Modal from "../../components/Modal";
import PromoNotFound from "../../components/Promo/PromoNotFound";
import { getAllProducts } from "../../utils/dataProvider/products";
import { editPromoEntry, getPromoById } from "../../utils/dataProvider/promo";
import useDocumentTitle from "../../utils/documentTitle";
import { n_f } from "../../utils/helpers";

const EditPromo = (props) => {
  const { promoId } = useParams();
  useDocumentTitle("Edit Promo");
  const initialState = {
    // unified form for code or event data shape
    name: "",
    desc: "",
    coupon_code: "",
    discount_type: "PERCENT",
    discount_value: "",
    min_order_amount: "",
    total_usage_limit: "",
    start_date: "",
    end_date: "",
    startDate: "",
    endDate: "",
    // event-only
    search_product: "",
    product_ids: [],
  };
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ ...initialState });
  const [resultSearch, setResultSearch] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [kind, setKind] = useState(""); // "code" | "event"
  const [error, setError] = useState({
    name: "",
    price: "",
    category_id: "",
    desc: "",
  });
  const navigate = useNavigate();
  const [cancel, setCancel] = useState(false);
  const [loadings, setLoadings] = useState({
    search: false,
    data: false,
  });

  // search products for event selection

  const searchHandler = useCallback(
    _.debounce((search) => {
      setLoadings({ ...loadings, search: true });
      getAllProducts("", { searchByName: search }, controller)
        .then((result) => setResultSearch(result.data.data))
        .catch((err) => {
          console.log(err);
          setResultSearch([]);
        })
        .finally(() => setLoadings({ ...loadings, search: false }));
    }, 1500),
    []
  );

  useEffect(() => {
    searchHandler(form.search_product);
  }, [form.search_product]);

  useEffect(() => {
    setLoadings({ ...loadings, data: true });
    getPromoById(promoId, controller)
      .then((res) => res.data)
      .then((payload) => {
        const it = payload?.data || payload; // support either wrapping
        if (!it) throw new Error("Not found");
        // map fields from list/detail API to form
        const next = {
          ...initialState,
          name: it.title || it.name || "",
          desc: it.description || it.desc || "",
          coupon_code: it.couponCode || it.coupon_code || "",
          discount_type: it.discountType || it.discount_type || "PERCENT",
          discount_value: it.discountValue ?? it.discount_value ?? "",
          min_order_amount: it.minOrderAmount ?? it.min_order_amount ?? "",
          total_usage_limit: it.totalUsageLimit ?? it.total_usage_limit ?? "",
          start_date: it.startsAt || it.start_date || "",
          end_date: it.endsAt || it.end_date || "",
          startDate: it.startsAt || it.start_date || "",
          endDate: it.endsAt || it.end_date || "",
          product_ids: Array.isArray(it.productIds) ? it.productIds : [],
        };
        setForm(next);
        setSelectedProducts(it.products || []);
        setKind((it.kind || it.type || "").toLowerCase() === "event" ? "event" : "code");
        setLoadings({ ...loadings, data: false });
      })
      .catch((err) => {
        setLoadings({ ...loadings, data: false });
        setNotFound(true);
        console.log(err);
      })
      .finally(() => {
        // setLoadings({ ...loadings, data: false });
      });
  }, []);

  const [isLoading, setLoading] = useState("");
  const controller = useMemo(() => new AbortController(), []);
  const formChangeHandler = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submitHandler = (e) => {
    e.preventDefault();
    if (!form.discount_type || !form.discount_value || !form.startDate || !form.endDate) {
      return toast.error("Please complete required fields");
    }
    if (form.discount_type === "PERCENT" && (Number(form.discount_value) < 1 || Number(form.discount_value) > 100)) {
      return toast.error("Percent must be 1-100");
    }
    if (kind === "code") {
      if (!form.coupon_code) return toast.error("Coupon code is required");
      if (form.coupon_code.length < 6) return toast.error("Coupon code min 6 char");
      if (form.min_order_amount && Number(form.min_order_amount) < 0) return toast.error("Min order must be >= 0");
      if (form.total_usage_limit && Number(form.total_usage_limit) < 1) return toast.error("Total usage must be >= 1");
      // ensure we don't send event-only fields
      form.product_ids = undefined;
    } else if (kind === "event") {
      if (!form.name) return toast.error("Event name is required");
      if (!selectedProducts.length) return toast.error("Select at least one product");
      form.coupon_code = undefined;
      form.min_order_amount = undefined;
      form.total_usage_limit = undefined;
      form.product_ids = selectedProducts.map((p) => p.id);
    }

    setLoading(true);
    editPromoEntry(promoId, form, props.userInfo.token, controller)
      .then((result) => {
        navigate(`/products/`, {
          replace: true,
        });
        toast.success("Discount updated");
      })
      .catch((err) => {
        if (err.response?.data?.msg) {
          toast.error(err.response?.data?.msg);
          return;
        }
        toast.error(err.message);
      })
      .finally(() => setLoading(false));
  };

  const setPromoProducts = (index) => {
    const prod = resultSearch[index];
    if (selectedProducts.find((p) => p.id === prod.id)) return;
    const next = [...selectedProducts, prod];
    setSelectedProducts(next);
    setForm({ ...form, product_ids: next.map((p) => p.id) });
    setResultSearch([]);
  };

  const removeSelectedProduct = (id) => {
    const next = selectedProducts.filter((p) => p.id !== id);
    setSelectedProducts(next);
    setForm({ ...form, product_ids: next.map((p) => p.id) });
  };

  return (
    <>
      <Modal isOpen={cancel} onClose={() => setCancel(!cancel)}>
        <p>Are you sure want to reset the form?</p>
        <section className="flex justify-center gap-x-5 mt-5">
          <button
            className="btn btn-error"
            onClick={() => {
              setForm({ ...initialState });
              setCancel(false);
            }}
          >
            Yes
          </button>
          <button className="btn" onClick={() => setCancel(!cancel)}>
            No
          </button>
        </section>
      </Modal>
      <Header />
      {loadings.data ? (
        <Loading />
      ) : notFound ? (
        <PromoNotFound />
      ) : (
        <main className="global-px py-6">
          <nav className="flex flex-row list-none gap-1">
            <li className="after:content-['>'] after:font-semibold text-primary">
              <NavLink to="/products">Favorite & Promo </NavLink>
            </li>
            <li className="text-tertiary font-semibold">Edit promo</li>
          </nav>
          <section className="flex flex-col md:flex-row py-14">
            <section className="flex-1" />
            <form
              onSubmit={submitHandler}
              className="flex-[2_2_0%] md:pl-12 lg:pl-24 flex flex-col gap-4"
            >
              {kind === "event" && (
                <>
                  <label className="text-tertiary font-bold text-lg" htmlFor="search_product">Products (multiple) :</label>
                  <div className="relative flex flex-col">
                    <input
                      placeholder="Search product by name"
                      name="search_product"
                      id="search_product"
                      value={form.search_product}
                      onChange={formChangeHandler}
                      maxLength={50}
                      className="border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none"
                    />
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {selectedProducts.map((p) => (
                        <span key={p.id} className="badge badge-outline gap-2">
                          {p.name}
                          <button onClick={(e) => { e.preventDefault(); removeSelectedProduct(p.id); }}>
                            <img src={closeIcon} width={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="absolute right-3 top-3">
                      {loadings.search ? (
                        <button>
                          <img src={loadingImage} width={18} />
                        </button>
                      ) : (
                        <></>
                      )}
                    </div>
                  </div>
                  {resultSearch.length > 0 && (
                    <div className="h-24 overflow-y-scroll flex flex-col rounded-lg border px-1">
                      {resultSearch.map((item, key) => (
                        <li
                          onClick={() => setPromoProducts(key)}
                          className="cursor-pointer bg-gray-50 hover:bg-gray-300 rounded-md p-1 text-sm font-medium"
                          key={key}
                        >
                          ID: {item.id} - {item.name} - Price: VND {n_f(item.price)} - Category: {item.category_name}
                        </li>
                      ))}
                    </div>
                  )}
                </>
              )}
              <label
                className="text-tertiary font-bold text-lg"
                htmlFor="product_name"
              >
                {kind === "event" ? "Event name :" : "Title :"}
              </label>
              <input
                placeholder="Type promo title max. 50 characters"
                name="name"
                id="product_name"
                value={form.name}
                onChange={formChangeHandler}
                maxLength={50}
                className="border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none"
              ></input>
              <label className="text-tertiary font-bold text-lg">Discount type :</label>
              <select
                name="discount_type"
                value={form.discount_type}
                onChange={formChangeHandler}
                className="select select-bordered w-full"
              >
                <option value="PERCENT">PERCENT (%)</option>
                <option value="AMOUNT">AMOUNT (VND)</option>
              </select>

              <label className="text-tertiary font-bold text-lg" htmlFor="discount_value">Discount value :</label>
              <input
                type="number"
                name="discount_value"
                id="discount_value"
                min={form.discount_type === "PERCENT" ? 1 : 1}
                max={form.discount_type === "PERCENT" ? 100 : undefined}
                value={form.discount_value}
                onChange={formChangeHandler}
                className="border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none"
              />

              <label
                className="text-tertiary font-bold text-lg"
                htmlFor="product_desc"
              >
                Description :
              </label>
              <textarea
                placeholder="Describe your promo min. 10 characters"
                name="desc"
                id="product_price"
                value={form.desc}
                onChange={formChangeHandler}
                className="border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none"
                minLength={10}
                maxLength={50}
              >
                {form.desc}
              </textarea>

              {kind === "code" && (
                <>
                  <label className="text-tertiary font-bold text-lg" htmlFor="coupon_code">Coupon Code :</label>
                  <input
                    placeholder="Type promo coupon code 6-12 characters"
                    name="coupon_code"
                    id="coupon_code"
                    value={(form.coupon_code || "").toUpperCase()}
                    onChange={formChangeHandler}
                    maxLength={12}
                    className="border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none"
                  />

                  <label className="text-tertiary font-bold text-lg" htmlFor="min_order_amount">Min order amount (VND) :</label>
                  <input
                    type="number"
                    name="min_order_amount"
                    id="min_order_amount"
                    min={0}
                    value={form.min_order_amount}
                    onChange={formChangeHandler}
                    className="border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none"
                  />

                  <label className="text-tertiary font-bold text-lg" htmlFor="total_usage_limit">Total usage limit :</label>
                  <input
                    type="number"
                    name="total_usage_limit"
                    id="total_usage_limit"
                    min={1}
                    value={form.total_usage_limit}
                    onChange={formChangeHandler}
                    className="border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none"
                  />
                </>
              )}

              {/* valid promo date */}
              <label
                className="text-tertiary font-bold text-lg"
                htmlFor="coupon_code"
              >
                Promo date (Start - End) :
              </label>
              <Datepicker
                // containerClassName={"bg-white"}
                inputClassName={
                  "bg-white border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none w-full"
                }
                minDate={new Date()}
                value={form}
                popoverDirection="up"
                separator="until"
                onChange={(e) =>
                  setForm({
                    ...form,
                    startDate: e.startDate,
                    endDate: e.endDate,
                    start_date: e.startDate,
                    end_date: e.endDate,
                  })
                }
              />

              <button
                type="submit"
                className={`${
                  isLoading && "loading"
                } btn btn-block btn-lg normal-case mt-2 btn-primary text-white shadow-lg rounded-2xl`}
              >
                Update Discount Information
              </button>
              {/* <button
              type="reset"
              onClick={() => setCancel(true)}
              className="btn btn-lg normal-case bg-gray-200 hover:bg-gray-300 border-gray-300 text-tertiary shadow-lg rounded-2xl"
            >
              Reset
            </button> */}
            </form>
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

export default connect(mapStateToProps, mapDispatchToProps)(EditPromo);