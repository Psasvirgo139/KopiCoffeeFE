import React, { useCallback, useEffect, useMemo, useState } from "react";

import _ from "lodash";
import { toast } from "react-hot-toast";
import { connect } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import Datepicker from "react-tailwindcss-datepicker";

import closeIcon from "../../assets/icons/close.svg";
import loadingImage from "../../assets/images/loading.svg";
import productPlaceholder from "../../assets/images/placeholder-promo.jpg";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import Modal from "../../components/Modal";
import { getAllProducts } from "../../utils/dataProvider/products";
import { createPromoEntry, createPromoEvent } from "../../utils/dataProvider/promo";
import useDocumentTitle from "../../utils/documentTitle";
import { n_f } from "../../utils/helpers";

const NewPromo = (props) => {
  useDocumentTitle("New Promo");
  const initialState = {
    name: "",
    desc: "",
    coupon_code: "",
    discount_type: "PERCENT", // PERCENT | AMOUNT
    discount_value: "",
    min_order_amount: "",
    total_usage_limit: "",
    per_user_limit: "",
    start_date: "",
    end_date: "",
    startDate: "",
    endDate: "",
    // event-only
    product_ids: [],
    is_shipping_fee: false,
  };
  const [mode, setMode] = useState("code"); // code | event
  const [selectedProduct, setSelectedProduct] = useState({
    name: "",
    id: "",
    category_name: "",
  });
  const [form, setForm] = useState({
    ...initialState,
    search_product: "", // for event multi-select
  });
  const [error, setError] = useState({
    name: "",
    price: "",
    category_id: "",
    desc: "",
  });
  const [resultSearch, setResultSearch] = useState([]);
  const navigate = useNavigate();
  const [preview, setPreview] = useState("");
  const [cancel, setCancel] = useState(false);
  const [loadings, setLoadings] = useState({
    search: false,
  });
  const [selectedProducts, setSelectedProducts] = useState([]); // for event
  const [invalidProducts, setInvalidProducts] = useState([]);
  const [showInvalidModal, setShowInvalidModal] = useState(false);

  // create a preview as a side effect, whenever selected file is changed
  useEffect(() => {
    if (!form.image) {
      setPreview(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(form.image);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [form.image]);

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
    if (mode === "event") {
      searchHandler(form.search_product);
    }
  }, [form.search_product, mode]);

  const onSelectFile = (e) => {
    if (!e.target.files || e.target.files.length === 0) {
      setForm({ ...form, image: "" });
      return;
    }

    if (e.target.files[0].size > 2097152) {
      return toast.error("Files must not exceed 2 MB");
    }

    // I've kept this example simple by using the first image instead of multiple
    setForm({ ...form, image: e.target.files[0] });
  };

  const [isLoading, setLoading] = useState("");
  const controller = useMemo(() => new AbortController(), []);
  const formChangeHandler = (e) =>
    setForm({ ...form, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submitHandler = (e) => {
    e.preventDefault();
    if (mode === "code") {
      if (
        form.coupon_code === "" ||
        form.discount_type === "" ||
        form.discount_value === "" ||
        form.startDate === "" ||
        form.endDate === ""
      ) {
        return toast.error("Please complete required fields");
      }
      if (form.desc && form.desc.length < 10)
        return toast.error("Description min 10 char");
      if (form.coupon_code.length < 6)
        return toast.error("Coupon code min 6 char");
      if (
        form.discount_type === "PERCENT" &&
        (Number(form.discount_value) < 1 || Number(form.discount_value) > 100)
      )
        return toast.error("Percent must be 1-100");

      setLoading(true);
      createPromoEntry(form, props.userInfo.token, controller)
        .then(() => {
          navigate(`/products/`, { replace: true });
          toast.success("Discount code added");
        })
        .catch((err) => {
          if (err.response?.data?.msg) return toast.error(err.response.data.msg);
          toast.error(err.message);
        })
        .finally(() => setLoading(false));
    } else {
      if (
        !form.name ||
        !form.discount_type ||
        !form.discount_value ||
        !form.startDate ||
        !form.endDate ||
        selectedProducts.length === 0
      ) {
        return toast.error("Please complete event fields and select products");
      }
      setLoading(true);
      createPromoEvent(form, props.userInfo.token, controller)
        .then(() => {
          navigate(`/products/`, { replace: true });
          toast.success("Discount event added");
        })
        .catch((err) => {
          const apiMsg = err.response?.data?.message || err.response?.data?.msg;
          const invalids = err.response?.data?.invalid_products;
          if (Array.isArray(invalids) && invalids.length > 0) {
            setInvalidProducts(invalids);
            setShowInvalidModal(true);
            return;
          }
          if (apiMsg) return toast.error(apiMsg);
          return toast.error(err.message || "Create failed");
        })
        .finally(() => setLoading(false));
    }
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
      <Modal isOpen={showInvalidModal} onClose={() => setShowInvalidModal(false)}>
        <div className="space-y-3">
          <p className="font-bold text-lg text-tertiary">Create failed</p>
          <p className="text-sm">Some products already belong to active discount events:</p>
          <ul className="list-disc pl-5 text-sm">
            {invalidProducts.map((it, idx) => (
              <li key={idx}>
                {it.product_name ? `${it.product_name}` : `Product #${it.product_id}`} {it.event_name ? `(in event: ${it.event_name})` : ""}
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <button className="btn" onClick={() => setShowInvalidModal(false)}>Close</button>
          </div>
        </div>
      </Modal>
      <main className="global-px py-6">
        <nav className="flex flex-row list-none gap-1">
          <li className="after:content-['>'] after:font-semibold text-primary">
            <NavLink to="/products">Favorite & Promo </NavLink>
          </li>
          <li className="text-tertiary font-semibold">Add new promo</li>
        </nav>
        <section className="flex flex-col md:flex-row py-14">
          <section className="flex-1 flex flex-col items-center gap-4">
            <div className="avatar">
              <div className="w-52 rounded-full">
                <img src={preview || productPlaceholder} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full max-w-xs mt-2">
              <button
                type="button"
                className={`btn btn-block btn-lg normal-case ${
                  mode === "code" ? "btn-primary text-white" : "btn-secondary text-tertiary"
                }`}
                onClick={() => setMode("code")}
              >
                Add discount code
              </button>
              <button
                type="button"
                className={`btn btn-block btn-lg normal-case ${
                  mode === "event" ? "btn-primary text-white" : "btn-secondary text-tertiary"
                }`}
                onClick={() => setMode("event")}
              >
                Add discount event
              </button>
            </div>
          </section>
          <form
            onSubmit={submitHandler}
            className="flex-[2_2_0%] md:pl-12 lg:pl-24 flex flex-col gap-4"
          >
            <input
              id="form_image"
              type="file"
              accept="image/png, image/webp, image/jpeg"
              className="hidden"
              onChange={onSelectFile}
            />
            {mode === "event" && (
              <>
                <label
                  className="text-tertiary font-bold text-lg"
                  htmlFor="search_product"
                >
                  Products (multiple) :
                </label>
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
                </div>
                {resultSearch.length > 0 && (
                  <div className="h-24 overflow-y-scroll flex flex-col rounded-lg border px-1">
                    {resultSearch.map((item, key) => (
                      <li
                        onClick={() => setPromoProducts(key)}
                        className="cursor-pointer bg-gray-50 hover:bg-gray-300 rounded-md p-1 text-sm font-medium"
                        key={key}
                      >
                        ID: {item.id} - {item.name} - Price: VND {n_f(item.price)} -
                        Category: {item.category_name}
                      </li>
                    ))}
                  </div>
                )}
              </>
            )}
            {mode === "event" && (
              <>
                <label
                  className="text-tertiary font-bold text-lg"
                  htmlFor="product_name"
                >
                  Event name :
                </label>
                <input
                  placeholder="Type event name max. 50 characters"
                  name="name"
                  id="product_name"
                  value={form.name}
                  onChange={formChangeHandler}
                  maxLength={50}
                  className="border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none"
                ></input>
              </>
            )}
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

            {mode === "code" && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  id="is_shipping_fee"
                  name="is_shipping_fee"
                  type="checkbox"
                  checked={!!form.is_shipping_fee}
                  onChange={formChangeHandler}
                  className="checkbox checkbox-sm"
                />
                <label htmlFor="is_shipping_fee" className="text-sm">Apply discount to shipping fee</label>
              </div>
            )}

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

            {mode === "code" && (
              <>
                <label className="text-tertiary font-bold text-lg" htmlFor="coupon_code">
                  Coupon Code :
                </label>
                <input
                  placeholder="Type promo coupon code 6-12 characters"
                  name="coupon_code"
                  id="coupon_code"
                  value={form.coupon_code.toUpperCase()}
                  onChange={formChangeHandler}
                  maxLength={12}
                  className="border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none"
                />

                <label className="text-tertiary font-bold text-lg" htmlFor="min_order_amount">
                  Min order amount (VND) :
                </label>
                <input
                  type="number"
                  name="min_order_amount"
                  id="min_order_amount"
                  min={0}
                  value={form.min_order_amount}
                  onChange={formChangeHandler}
                  className="border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none"
                />

                <label className="text-tertiary font-bold text-lg" htmlFor="total_usage_limit">
                  Total usage limit :
                </label>
                <input
                  type="number"
                  name="total_usage_limit"
                  id="total_usage_limit"
                  min={1}
                  value={form.total_usage_limit}
                  onChange={formChangeHandler}
                  className="border-b-2 py-2 border-gray-300 focus:border-tertiary outline-none"
                />

                <label className="text-tertiary font-bold text-lg" htmlFor="per_user_limit">
                  Per-user usage limit :
                </label>
                <input
                  type="number"
                  name="per_user_limit"
                  id="per_user_limit"
                  min={1}
                  value={form.per_user_limit}
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
              {mode === "code" ? "Save Discount Code" : "Save Discount Event"}
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
      <Footer />
    </>
  );
};

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
});

const mapDispatchToProps = {};

export default connect(mapStateToProps, mapDispatchToProps)(NewPromo);
