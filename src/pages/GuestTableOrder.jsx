import React, { useCallback, useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { useParams } from "react-router-dom";
import { createGuestTableOrder } from "../utils/dataProvider/transaction";
import { getAllProducts } from "../utils/dataProvider/products";
import { getCategories } from "../utils/dataProvider/categories";
import productPlaceholder from "../assets/images/placeholder-image.webp";
import loadingImage from "../assets/images/loading.svg";
import { toast } from "react-hot-toast";

function GuestTableOrder() {
  const { qrToken } = useParams();
  const controller = useMemo(() => new AbortController(), []);

  // Right panel: product listing (mirror /products)
  const [ddMenu, setDdmenu] = useState(false);
  const toggleDdmenu = () => setDdmenu(!ddMenu);
  const [sort, setSort] = useState(undefined);
  const [search, setSearch] = useState("");
  const [catId, setCatId] = useState("");
  const [page, setPage] = useState(1);
  const [inputPage, setInputPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({});
  const [categories, setCategories] = useState([]);

  const delayedSearch = useCallback(
    _.debounce((q) => {
      setPage(1);
      fetchProducts(catId, q, sort, 1);
    }, 500),
    [catId, sort]
  );

  const delayedSort = useMemo(
    () => _.debounce((orderBySort) => {
      setSort(orderBySort);
      setPage(1);
      fetchProducts(catId, search, orderBySort, 1);
    }, 200),
    [catId, search]
  );

  function fetchProducts(cat, q, srt, pg) {
    setIsLoading(true);
    const [orderBy, sortDir] = (srt || "").split("_", 2);
    getAllProducts(
      cat || "",
      { sort: sortDir, limit: 8, searchByName: q || "", orderBy, page: pg || 1 },
      controller
    )
      .then((response) => response.data)
      .then((data) => {
        setProducts(data.data || []);
        setMeta(data.meta || {});
        setIsLoading(false);
        setInputPage(pg || 1);
      })
      .catch(() => {
        setIsLoading(false);
        setProducts([]);
        setMeta({});
      });
  }

  useEffect(() => {
    fetchProducts(catId, search, sort, page);
    // eslint-disable-next-line
  }, [catId, page]);

  useEffect(() => {
    const c = new AbortController();
    getCategories(c)
      .then((res) => setCategories((res.data?.data || []).sort((a,b) => (a.display_order ?? 0) - (b.display_order ?? 0))))
      .catch(() => setCategories([]));
    return () => c.abort();
  }, []);

  // Left panel: local POS cart
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const addToCart = (p) => {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { id: p.id, name: p.name, price: p.price, img: p.img, qty: 1 }];
    });
  };

  const incrementQty = (id) => setCart((prev) => prev.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x)));
  const decrementQty = (id) => setCart((prev) => prev.flatMap((x) => (x.id === id ? (x.qty - 1 < 1 ? [] : [{ ...x, qty: x.qty - 1 }]) : [x])));
  const removeItem = (id) => setCart((prev) => prev.filter((x) => x.id !== id));
  const totalVnd = cart.reduce((acc, cur) => acc + Number(cur.price || 0) * Number(cur.qty || 0), 0);

  const submit = async () => {
    if (cart.length < 1) return toast.error("Please add products");
    setSubmitting(true);
    try {
      const payload = { qr_token: qrToken, products: cart.map((c) => ({ product_id: c.id, qty: c.qty })), notes };
      const res = await createGuestTableOrder(payload, controller);
      setResult(res.data?.data);
      toast.success("Order sent");
      setCart([]);
    } catch (e) {
      toast.error("Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <main className="flex flex-col-reverse md:flex-row global-px">
        {/* Left: Order Summary (POS-like) */}
        <section className="flex-1 flex flex-col items-center gap-5 py-5 md:border-r-2 border-solid md:pr-6">
          {result ? (
            <div className="border rounded p-4 w-full">
              <div className="mb-2">Order #{result.id}</div>
              {result.table_number && <div>Table {result.table_number}</div>}
              <div>Status: {result.status}</div>
            </div>
          ) : (
            <>
              <h2 className="font-bold text-2xl">Order Summary</h2>
              <section className="flex w-full flex-col gap-4 my-2">
                {cart.length < 1 ? (
                  <div className="text-center text-tertiary">Your cart is empty</div>
                ) : (
                  cart.map((item) => (
                    <div className="flex flex-row gap-3 w-full items-center" key={item.id}>
                      <aside className="w-20 h-20">
                        <img src={item.img ?? productPlaceholder} alt={item.name} className="aspect-square h-20 w-20 object-cover rounded-xl" />
                      </aside>
                      <aside className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <button onClick={() => decrementQty(item.id)} className="rounded-full bg-tertiary text-white font-bold w-6 h-6 items-center justify-center duration-200 hover:bg-primary-focus">-</button>
                          <p>x {item.qty}</p>
                          <button onClick={() => incrementQty(item.id)} className="rounded-full bg-tertiary text-white font-bold w-6 h-6 items-center justify-center duration-200 hover:bg-primary-focus">+</button>
                        </div>
                      </aside>
                      <aside className="min-w-[120px] text-right font-medium flex flex-col items-end">
                        <button onClick={() => removeItem(item.id)} className="rounded-full h-6 w-6 bg-tertiary text-white font-bold text-xs text-center flex mb-1">
                          <p className="m-auto">X</p>
                        </button>
                        <p>VND {Number(item.price || 0) * Number(item.qty || 0)}</p>
                      </aside>
                    </div>
                  ))
                )}
              </section>
              <hr className="w-full" />
              <section className="flex flex-col w-full">
                <div className="flex flex-row uppercase font-bold my-4">
                  <p className="flex-[2_2_0%]">Total</p>
                  <p className="flex-1 text-right">VND {totalVnd}</p>
                </div>
                <div className="mt-auto flex w-full">
                  <div className="grid grid-cols-1 gap-3 w-full">
                    <button onClick={submit} disabled={submitting} className="btn btn-primary text-white w-full">
                      {submitting ? "Submitting..." : "Place order"}
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </section>

        {/* Right: Product list */}
        <section className="flex-[2_2_0%] flex flex-col md:pl-16 py-5">
          <nav className="list-none flex flex-row md:justify-between justify-evenly flex-wrap gap-5 mb-10 ">
            <li>
              <button
                className={"hover:drop-shadow-lg hover:border-b-2 border-tertiary pb-1 " + (catId === "" ? "font-semibold text-tertiary border-b-2 drop-shadow-lg" : "")}
                onClick={() => setCatId("")}
              >
                Menu
              </button>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  className={"hover:drop-shadow-lg hover:border-b-2 border-tertiary pb-1 " + (catId === c.id ? "font-semibold text-tertiary border-b-2 drop-shadow-lg" : "")}
                  onClick={() => setCatId(c.id)}
                >
                  {c.name}
                </button>
              </li>
            ))}
            <li className="relative">
              <button onClick={toggleDdmenu} className={(ddMenu ? "rotate-180" : "rotate-0") + " duration-150 focus:bg-none"}>▼</button>
              <div className={(!ddMenu ? "opacity-0 z-0 " : " z-[5]") + " absolute w-72 shadow border-1 border-gray-200 bg-white rounded-md right-0 p-5 top-10 text-primary duration-200 transition-opacity"}>
                <section className="flex flex-col">
                  <aside className="flex-1 flex flex-col">
                    <label htmlFor="searchProduct" className="block mb-2 text-sm font-medium text-gray-900">Keywords</label>
                    <input
                      type="text"
                      name="searchProduct"
                      id="searchProduct"
                      className="block w-full p-2 mb-6 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); delayedSearch(e.target.value); }}
                    />
                  </aside>
                  <aside className="flex-1">
                    <label htmlFor="orderBy" className="block mb-2 text-sm font-medium text-gray-900">Order by</label>
                    <select
                      id="orderBy"
                      className="block w-full p-2 mb-6 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 "
                      value={sort}
                      onChange={(e) => delayedSort(e.target.value)}
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

          {isLoading ? (
            <section className="w-full h-80 flex justify-center items-center"><img src={loadingImage} alt="" /></section>
          ) : products.length < 1 ? (
            <section className="w-full flex flex-col justify-center items-center py-8 text-center font-medium gap-5">No products.</section>
          ) : (
            <>
              <section className="grid grid-cols-2 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-3 justify-items-center content-around gap-3 gap-y-16 mt-10">
                {products.map((product) => (
                  <div key={product.id} className="relative w-36 bg-white shadow-lg hover:shadow-xl duration-200 p-5 rounded-3xl">
                    <img src={product.img ?? productPlaceholder} alt="" className="aspect-square rounded-full object-cover mt-[-50%] w-full mb-3 shadow-lg" />
                    <div className="flex flex-col gap-5 content-between text-center">
                      <p className="font-black text-lg min-h-[102px]">{product.name}</p>
                      <p className="font-bold end text-tertiary">VND {product.price}</p>
                      <button className="btn btn-primary btn-sm text-white" onClick={() => addToCart(product)}>Add</button>
                    </div>
                  </div>
                ))}
              </section>
              <section className="flex items-center justify-center mt-12 relative">
                <ul className="pagination flex justify-center sm:justify-start lg:justify-center items-center p-0 w-full" role="navigation">
                  {meta.prev ? (
                    <li>
                      <button className="group border border-secondary bg-white hover:bg-secondary-200 text-secondary hover:text-tertiary rounded-lg font-bold py-2 px-4 mx-1 flex items-center lg:py-3 lg:px-4 duration-200" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        <svg className="fill-current h-5 w-5 sm:mr-2 transform rotate-180 transition-transform ease-in group-hover:transform group-hover:-translate-x-0.5" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg"><path d="M2.63236 9.26808H10.8757L9.1343 11.0095C8.73118 11.4126 8.73118 12.0662 9.1343 12.4693C9.53742 12.8724 10.191 12.8724 10.5941 12.4693L14.0977 8.96571C14.2913 8.77218 14.4001 8.50957 14.4001 8.23582C14.4001 7.96207 14.2913 7.6995 14.0977 7.50589L10.5942 4.00232C10.191 3.59925 9.53746 3.59921 9.13434 4.00232C8.73123 4.40544 8.73123 5.05903 9.13434 5.46214L10.8758 7.20356H2.63236C2.06226 7.20356 1.6001 7.66572 1.6001 8.23582C1.60006 8.80592 2.06226 9.26808 2.63236 9.26808Z"></path></svg>
                        <p className="hidden sm:flex">Previous</p>
                      </button>
                    </li>
                  ) : ""}
                  {meta.next ? (
                    <li>
                      <button className="group bg-secondary text-tertiary rounded-lg font-bold py-2 px-4 mx-1 flex items-center hover:bg-secondary-200 lg:py-3 lg:px-4 duration-200" onClick={() => setPage((p) => p + 1)}>
                        <p className="flex">Next</p>
                        <svg alt="Next page" className="fill-current h-5 ml-2 transition ease-in group-hover:transform group-hover:translate-x-0.5" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg"><path d="M2.63236 9.26808H10.8757L9.1343 11.0095C8.73118 11.4126 8.73118 12.0662 9.1343 12.4693C9.53742 12.8724 10.191 12.8724 10.5941 12.4693L14.0977 8.96571C14.2913 8.77218 14.4001 8.50957 14.4001 8.23582C14.4001 7.96207 14.2913 7.6995 14.0977 7.50589L10.5942 4.00232C10.191 3.59925 9.53746 3.59921 9.13434 4.00232C8.73123 4.40544 8.73123 5.05903 9.13434 5.46214L10.8758 7.20356H2.63236C2.06226 7.20356 1.6001 7.66572 1.6001 8.23582C1.60006 8.80592 2.06226 9.26808 2.63236 9.26808Z"></path></svg>
                      </button>
                    </li>
                  ) : ""}
                  <div className="hidden sm:flex justify-between items-center sm:absolute right-0">
                    <span className="text-sm mr-2">Page</span>
                    <input type="number" name="paginator" min="1" max={meta.totalPage} value={inputPage} onChange={(e) => setInputPage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { const pg = Math.max(1, Math.min(Number(meta.totalPage || 1), Number(e.target.value || 1))); setPage(pg); setInputPage(pg); window.scrollTo({ top: 0, behavior: "smooth" }); } }} className="w-10 h-6 border border-gray-200 bg-white rounded-sm p-1 text-center appearance-none focus:outline-none focus:ring-1 focus:ring-secondary text-sm" />
                    <span className="text-sm mx-1.5">of</span>
                    <span className="mr-2 text-sm">{meta.totalPage}</span>
                  </div>
                </ul>
              </section>
            </>
          )}
        </section>
      </main>
    </>
  );
}

export default GuestTableOrder;


