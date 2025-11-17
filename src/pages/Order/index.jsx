import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import Footer from "../../components/Footer";
import Header from "../../components/Header";
import { cartActions } from "../../redux/slices/cart.slice";
import { n_f } from "../../utils/helpers";
import loadingImage from "../../assets/images/loading.svg";
import emptyBox from "../../assets/images/empty-box.svg";

function OrderDrafts() {
  const { cartsById, activeCartId } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const draftList = Object.values(cartsById || {}).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  return (
    <>
      <Header />
      <main className="global-px py-6 min-h-screen">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-quartenary mb-2">Draft Orders</h1>
            <p className="text-gray-600">Manage saved drafts before turning them into live orders.</p>
          </div>
          <button
            className="btn btn-primary text-white hover:bg-[#8B5A3C] transition-colors"
            onClick={() => {
              dispatch(cartActions.createNewCartAndActivate());
              navigate("/products");
            }}
          >
            Create new order
          </button>
        </div>

        {draftList.length < 1 ? (
          <section className="w-full flex flex-col justify-center items-center py-16 text-center">
            <div className="mb-6">
              <img src={emptyBox} alt="No drafts" className="w-52 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No drafts yet</h3>
            <p className="text-gray-500">Start by creating a new order and it will show up here.</p>
          </section>
        ) : (
          <div className="flex flex-col gap-4">
            {draftList.map((d) => {
              const subtotal = (d.list || []).reduce((acc, cur) => acc + cur.price * cur.qty, 0);
              const serviceFee = 30000;
              const total = subtotal + serviceFee;
              const isActive = activeCartId === d.id;
              return (
                <div
                  key={d.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-tertiary to-[#8B5A3C] px-4 py-3 text-white">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold">Draft #{d.id}</h3>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-gray-100 text-gray-800 border-gray-300"
                          }`}
                        >
                          {isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                      <p className="text-xs text-white/90">
                        {new Date(d.updatedAt || d.createdAt || Date.now()).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-3">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-tertiary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-500 mb-0.5">Table / Notes</p>
                            <p className="text-sm text-gray-700">
                              {d.tableNumber ? `Table ${d.tableNumber}` : "No table information"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1.5">
                            Items ({(d.list || []).length})
                          </p>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                            {(d.list || []).slice(0, 3).map((p, idx) => (
                              <div key={idx} className="flex items-start justify-between gap-2 text-xs bg-gray-50 rounded px-2 py-1.5">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate">
                                    {p.qty}x {p.name || p.product_name} {p.size ? `(${p.size})` : ""}
                                  </p>
                                  {Array.isArray(p.addOns || p.add_ons) && (p.addOns || p.add_ons).length > 0 && (
                                    <div className="mt-0.5 space-y-0.5 text-[11px] text-gray-500">
                                      {(p.addOns || p.add_ons).map((ao, addOnIdx) => (
                                        <div key={addOnIdx} className="flex items-center justify-between gap-2">
                                          <span className="truncate">
                                            + {ao?.name || ao?.add_on_name || "Add-on"}
                                          </span>
                                          {(ao?.price || ao?.add_on_price) && (
                                            <span className="whitespace-nowrap text-gray-600">
                                              +{ao?.price || ao?.add_on_price}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-tertiary whitespace-nowrap">
                                  {n_f(p.subtotal || (p.price * p.qty))}
                                </p>
                              </div>
                            ))}
                            {(d.list || []).length > 3 && (
                              <p className="text-xs text-gray-500 italic text-center pt-1">
                                +{(d.list || []).length - 3} more item{(d.list || []).length - 3 > 1 ? "s" : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Subtotal:</span>
                              <span className="font-medium text-gray-800">VND {n_f(subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Service:</span>
                              <span className="font-medium text-gray-800">VND {n_f(serviceFee)}</span>
                            </div>
                            <div className="border-t border-gray-300 pt-1.5 mt-1.5">
                              <div className="flex justify-between">
                                <span className="font-bold text-gray-800">Total:</span>
                                <span className="font-bold text-base text-tertiary">VND {n_f(total)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 grid grid-cols-2 gap-2">
                        <button
                          className="w-full btn btn-sm btn-primary text-white hover:bg-[#8B5A3C] transition-colors"
                          onClick={() => {
                            dispatch(cartActions.setActiveCart(d.id));
                            navigate("/products");
                          }}
                        >
                          Continue editing
                        </button>
                        <button
                          className="w-full btn btn-sm btn-error text-white hover:bg-red-600 transition-colors"
                          onClick={() => dispatch(cartActions.deleteCart(d.id))}
                        >
                          Delete draft
                        </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default OrderDrafts;
