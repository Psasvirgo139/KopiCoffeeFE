/* eslint-disable react/prop-types */
import React, {
  useEffect,
  useState,
} from 'react';

import toast from 'react-hot-toast';
import {
  useDispatch,
  useSelector,
} from 'react-redux';
import {
  NavLink,
  useNavigate,
  useParams,
} from 'react-router-dom';

import loadingImage from '../../assets/images/loading.svg';
import lostImage from '../../assets/images/not_found.svg';
import productPlaceholder from '../../assets/images/placeholder-image.webp';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import { cartActions } from '../../redux/slices/cart.slice';
import { getProductbyId } from '../../utils/dataProvider/products';
import useDocumentTitle from '../../utils/documentTitle';

function ProductDetail(props) {
  // Helper to read stock from various possible backend field names
  const getAvailableStock = (obj) => {
    const v = obj?.stock ?? obj?.quantity ?? obj?.qty ?? obj?.available ?? obj?.stock_quantity ?? obj?.inventory;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const [form, setForm] = useState({
    delivery: 0,
    count: 1,
    now: 0,
    time: "",
    size: 1,
  });
  const [cart, setCart] = useState([]);
  const [detail, setDetail] = useState({
    price: 0,
  });
  const [dbSizes, setDbSizes] = useState([]);
  const [dbAddOns, setDbAddOns] = useState([]);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { productId } = useParams();

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const userInfo = useSelector((state) => state.userInfo);
  const cartRedux = useSelector((state) => state.cart);
  const filteredCart = cartRedux.list.filter(
    (obj) => String(obj.product_id) === String(productId)
  );

  const controller = React.useMemo(() => new AbortController(), []);

  useEffect(() => {
    setIsLoading(true);
    getProductbyId(productId, controller)
      .then((response) => {
        const item = response.data.data[0] || {};
        setDetail(item);
        setDbSizes(Array.isArray(item.sizes) ? item.sizes : []);
        setDbAddOns(Array.isArray(item.add_ons) ? item.add_ons : []);
        // If DB provides sizes, default to the first
        if (Array.isArray(item.sizes) && item.sizes.length > 0) {
          const firstId = item.sizes[0]?.size_id;
          if (firstId) setForm((prev) => ({ ...prev, size: String(firstId) }));
        }
        setIsLoading(false);
      })
      .catch((error) => {
        setNotFound(true);
        console.log(error);
        setIsLoading(false);
      });
  }, []);

  const NotFound = () => {
    return (
      <section className="w-full min-h-[80vh] flex justify-center flex-col gap-10 text-center py-5">
        <img src={lostImage} alt="404" className="h-72" />
        <div className="flex flex-col gap-3">
          <p className="text-xl font-semibold">Product Not Found</p>
          <NavLink to={"/products/"}>
            <button className="rounded-[25px] bg-secondary px-10 text-tertiary font-semibold py-2">
              Back to Products
            </button>
          </NavLink>
        </div>
      </section>
    );
  };

  const Loading = () => {
    return (
      <section className="min-h-[80vh] flex items-center justify-center flex-col">
        <div>
          <img src={loadingImage} alt="" />
        </div>
      </section>
    );
  };

  function onChangeForm(e) {
    return setForm((form) => {
      return {
        ...form,
        [e.target.name]: e.target.value,
      };
    });
  }

  const countIncrement = () => {
    return setForm((form) => {
      return {
        ...form,
        count: form.count + 1,
      };
    });
  };
  const countDecrement = () => {
    if (form.count > 1) {
      return setForm((form) => {
        return {
          ...form,
          count: form.count - 1,
        };
      });
    }
  };
  const checkoutHandler = () => {
    // Navigate back to products menu without constraints
    navigate("/products");
    // toast.promise(
    //   addCart(detail.id, cart, userInfo.token).then((res) => {
    //     return res;
    //   }),
    //   {
    //     loading: "Adding to cart...",
    //     success: () => {
    //       navigate("/cart");
    //       return "Succesfully add to cart";
    //     },
    //     error: "Error while adding to cart",
    //   }
    // );
  };

  const handleAddToCart = () => {
    const newItem = {
      size: Number(form.size),
      count: Number(form.count),
    };
    if (newItem.size < 1 || newItem.size > 3) {
      toast.error("Please choose size");
      return;
    }
    if (newItem.count < 1) {
      toast.error("Invalid count");
      return;
    }

    // Validate stock before adding to cart
    const stock = getAvailableStock(detail);
    if (typeof stock === "number") {
      let cartQtyForThisProduct = 0;
      cartRedux.list.forEach((item) => {
        if (item.product_id === detail.id && item.size_id === newItem.size) {
          cartQtyForThisProduct += Number(item.qty || 0);
        }
      });
      const totalWillBe = cartQtyForThisProduct + newItem.count;
      if (totalWillBe > stock) {
        toast.error("Not enough stock");
        return;
      }
    }

    // compute unit price = base + sizeDelta + addOnSum
    const base = Number(detail.price || 0);
    const sizeDelta = Number(
      (dbSizes.find((s) => String(s.size_id) === String(newItem.size))?.price_delta) || 0
    );
    const addonSum = dbAddOns
      .filter((a) => selectedAddOnIds.includes(a.add_on_id))
      .reduce((acc, cur) => acc + Number(cur.price || 0), 0);
    const unitPrice = base + sizeDelta + addonSum;

    const addOnsDetail = dbAddOns
      .filter((a) => selectedAddOnIds.includes(a.add_on_id))
      .map((a) => ({ id: a.add_on_id, name: a.name, price: a.price }));

    dispatch(
      cartActions.addtoCart({
        product_id: detail.id,
        size_id: newItem.size,
        qty: form.count,
        name: detail.name,
        img: detail.img,
        price: unitPrice,
        add_on_ids: selectedAddOnIds,
        add_ons_detail: addOnsDetail,
      })
    );

    setCart((prevItems) => {
      const index = prevItems.findIndex((item) => item.size === newItem.size); // cari indeks item dengan size yang sama
      if (index !== -1) {
        const newItems = [...prevItems]; // buat salinan array of objects yang sudah ada
        newItems[index].count += newItem.count; // tambahkan jumlah count pada item yang sudah ada
        return newItems; // kembalikan array of objects yang sudah diubah
      } else {
        return [...prevItems, newItem]; // tambahkan item baru jika tidak ada item dengan size yang sama
      }
    });

    setForm({ size: "", count: 1 }); // reset nilai form setelah berhasil menambahkan item ke cart
  };

  const Detail = (props) => {
    const p = props.data;
    const desc = !p.desc
      ? "This product does not have a description yet."
      : p.desc;
    useDocumentTitle(p.name);
    const defaultSizeNames = ["Regular", "Large", "Xtra Large"]; // FE default
    const dbSizeNames = (dbSizes || []).map((s) => String(s.name || "").trim().toLowerCase());
    const useDbSizesUi = (() => {
      if (!Array.isArray(dbSizes) || dbSizes.length === 0) return false;
      const normDefault = defaultSizeNames.map((x) => x.toLowerCase());
      if (dbSizeNames.length !== normDefault.length) return true;
      // compare set-equal
      const setA = new Set(dbSizeNames);
      const setB = new Set(normDefault);
      if (setA.size !== setB.size) return true;
      for (const v of setA) if (!setB.has(v)) return true;
      return false;
    })();
    const base = Number(p.price || 0);
    const sizeDelta = Number(
      (dbSizes.find((s) => String(s.size_id) === String(form.size))?.price_delta) || 0
    );
    const addonSum = dbAddOns
      .filter((a) => selectedAddOnIds.includes(a.add_on_id))
      .reduce((acc, cur) => acc + Number(cur.price || 0), 0);
    const unitPrice = base + sizeDelta + addonSum;
    return (
      <main className="global-px py-10">
        <nav className="flex flex-row list-none gap-1">
          <li className="after:content-['>'] after:font-semibold text-primary">
            <NavLink to="/products">Menu </NavLink>
          </li>
          <li className="text-tertiary font-semibold">{p.name}</li>
        </nav>
        <div className="flex justify-center mb-6">
  <img
    src={p.img ? p.img : productPlaceholder}
    alt={p.name}
    onError={(e) => (e.target.src = productPlaceholder)}
    className="w-full max-w-md h-auto object-cover rounded-2xl shadow-lg"
  />
</div>
        <section className="my-10">
          <div className="max-w-3xl mx-auto flex flex-col gap-5">
            <p className="font-black text-5xl uppercase w-full text-center mb-4">
              {p.name}
            </p>
            <p className="text-tertiary text-lg text-justify md:min-h-[100px]">
              {desc}
            </p>
            {/* <p className="text-tertiary text-lg mb-8">
              Delivery only on <b>Monday to friday</b> at <b>1 - 7 pm</b>
            </p> */}
            {/* Inline size selector (moved from below) */}
            <div className="font-bold mb-4">
              <p className="mb-2">Size</p>
              {useDbSizesUi ? (
                <div className="flex justify-center md:justify-start gap-4 list-none">
                  {(dbSizes || []).map((s) => (
                    <li key={s.size_id}>
                      <input
                        type="radio"
                        id={`size-${s.size_id}`}
                        name="size"
                        value={String(s.size_id)}
                        className="hidden peer"
                        checked={String(form.size) === String(s.size_id)}
                        onChange={onChangeForm}
                        required
                      />
                      <label
                        htmlFor={`size-${s.size_id}`}
                        className="inline-block bg-gray-400 rounded-full peer-checked:bg-secondary peer-checked:font-bold cursor-pointer px-3"
                      >
                        <p className=" p-2 text-center ">{s.code || s.name}</p>
                      </label>
                    </li>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center md:justify-start gap-4 list-none">
                  <li>
                    <input type="radio" id="size-r" name="size" value="1" className="hidden peer" checked={form.size === "1"} onChange={onChangeForm} required />
                    <label htmlFor="size-r" className="inline-block bg-gray-400 rounded-full peer-checked:bg-secondary peer-checked:font-bold cursor-pointer">
                      <p className=" p-2 w-12 h-12 text-center ">R</p>
                    </label>
                  </li>
                  <li>
                    <input type="radio" id="size-l" name="size" value="2" className="hidden peer" checked={form.size === "2"} onChange={onChangeForm} required />
                    <label htmlFor="size-l" className="inline-block bg-gray-400 rounded-full peer-checked:bg-secondary peer-checked:font-bold cursor-pointer">
                      <p className=" p-2 w-12 h-12 text-center ">L</p>
                    </label>
                  </li>
                  <li>
                    <input type="radio" id="size-xl" name="size" value="3" className="hidden peer" checked={form.size === "3"} onChange={onChangeForm} required />
                    <label htmlFor="size-xl" className="inline-block bg-gray-400 rounded-full peer-checked:bg-secondary peer-checked:font-bold cursor-pointer">
                      <p className="p-2 w-12 h-12 text-center ">XL</p>
                    </label>
                  </li>
                </div>
              )}
            </div>
            {/* Add-ons */}
            {Array.isArray(dbAddOns) && dbAddOns.length > 0 && (
              <div className="font-bold mb-4">
                <p className="mb-2">Add-ons</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {dbAddOns.map((a) => (
                    <label key={a.add_on_id} className="flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-sm">
                      <input
                        type="checkbox"
                        className="accent-tertiary"
                        checked={selectedAddOnIds.includes(a.add_on_id)}
                        onChange={(e) => {
                          setSelectedAddOnIds((prev) => {
                            const set = new Set(prev);
                            if (e.target.checked) set.add(a.add_on_id);
                            else set.delete(a.add_on_id);
                            return Array.from(set);
                          });
                        }}
                      />
                      <span className="text-sm font-normal">{a.name} (+{Number(a.price || 0).toLocaleString("vi-VN")} VND)</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between items-center">
              <div className="custom-number-input h-10 w-32">
                <div className="flex flex-row h-10 w-full rounded-lg relative bg-transparent mt-1v text-tertiary font-bold">
                  <button
                    onClick={countDecrement}
                    className=" bg-white h-full w-20 rounded-l cursor-pointer outline-none border-gray-400 border-2 border-r-0"
                  >
                    <span className="m-auto text-xl">−</span>
                  </button>
                  <input
                    type="number"
                    className="outline-none focus:outline-none text-center w-full bg-white text-md  md:text-basecursor-default flex items-center border-gray-400 border-2"
                    name="custom-input-number"
                    value={form.count}
                    onChange={onChangeForm}
                    min="1"
                  ></input>
                  <button
                    onClick={countIncrement}
                    className="bg-white h-full w-20 rounded-r cursor-pointer border-gray-400 border-2 border-l-0"
                  >
                    <span className="m-auto text-xl">+</span>
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-xl text-tertiary">
                 {p.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}  VND 
                </p>
                <p className="text-sm mt-1">Stock: {(() => { const s = getAvailableStock(p); return typeof s === "number" ? s : "-"; })()}</p>
              </div>
            </div>
            <button
              className="mt-4 block bg-tertiary text-white font-bold text-lg py-4 rounded-xl"
              onClick={handleAddToCart}
            >
              Add to Cart
            </button>
            {/* <button
              className="block bg-secondary disabled:bg-gray-300 disabled:cursor-not-allowed text-tertiary font-bold text-lg py-4 rounded-xl"
              disabled
            >
              Ask a Staff
            </button> */}
          </div>
        </section>
        <section className="flex flex-col md:flex-row gap-8">
          {/* Removed Choose a size aside (moved above the quantity) */}
          {/*
          <aside className="flex-1 font-bold rounded-xl shadow-primary px-5 py-8 text-center space-y-4 text-xl">
            <p>Choose a size</p>
            <div className="flex justify-center gap-4 list-none">
              ... size radios ...
            </div>
          </aside>
          */}
          <aside className="flex-[3_3_0] rounded-xl shadow-primary flex items-center px-6 md:px-14 py-8 gap-4 flex-wrap lg:flex-nowrap">
            <div className="">
              <img
                src={p.img ? p.img : productPlaceholder}
                alt={p.name}
                onError={(e) => (e.target.src = productPlaceholder)}
                className="h-24 w-24 md:h-40 md:w-40 object-cover rounded-full shadow-md"
              />
            </div>
            <div className="flex-[4_4_0] min-w-[100px] space-y-2">
              <p className="font-black uppercase text-xl text-center md:text-left">
                {p.name}
              </p>
              <div
                className={`grid grid-rows-2 gap-2 text-lg grid-auto-rows-16 ${
                  cart.length === 2 ? "grid-flow-row" : "grid-flow-col"
                }`}
              >
                {filteredCart.map((item, idx) => {
                  let sizeName;
                  switch (item.size_id) {
                    case 1:
                      sizeName = "Regular";
                      break;
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
                      className={`${
                        idx % 2 === 0 && cart.length < 2 ? "col-span-2" : ""
                      }`}
                      key={idx}
                    >
                      <p>
                        x{item.qty} ({sizeName})
                      </p>
                      {Array.isArray(item.add_ons_detail) && item.add_ons_detail.length > 0 && (
                        <ul className="text-sm text-tertiary list-disc ml-5">
                          {item.add_ons_detail.map((ao) => (
                            <li key={ao.id}>{ao.name} (+{Number(ao.price || 0).toLocaleString("vi-VN")} VND)</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 font-bold text-lg w-full content-end md:hidden">
              <p className="text-right">Back to menu</p>
            </div>
            <div className="flex-1">
              <button
                className="bg-secondary h-14 aspect-square flex items-center justify-center object-cover rounded-full"
                onClick={checkoutHandler}
              >
                <svg
                  width="32"
                  height="30"
                  viewBox="0 0 33 30"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M32.4142 16.4142C33.1953 15.6332 33.1953 14.3668 32.4142 13.5858L19.6863 0.857864C18.9052 0.0768156 17.6389 0.0768156 16.8579 0.857864C16.0768 1.63891 16.0768 2.90524 16.8579 3.68629L28.1716 15L16.8579 26.3137C16.0768 27.0948 16.0768 28.3611 16.8579 29.1421C17.6389 29.9232 18.9052 29.9232 19.6863 29.1421L32.4142 16.4142ZM0 17L31 17V13L0 13L0 17Z"
                    fill="#6A4029"
                  />
                </svg>
              </button>
            </div>
          </aside>
        </section>
      </main>
    );
  };

  return (
    <>
      <Header />
      {isLoading ? (
        <Loading />
      ) : notFound ? (
        <NotFound />
      ) : (
        <Detail data={detail} />
      )}
      <Footer />
    </>
  );
}
export default ProductDetail;
