import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import Footer from "../../components/Footer";
import Header from "../../components/Header";
import { cartActions } from "../../redux/slices/cart.slice";
import { n_f } from "../../utils/helpers";

function OrderDrafts() {
  const { cartsById, activeCartId } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const draftList = Object.values(cartsById || {}).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  return (
    <>
      <Header />
      <main className="global-px py-8">
        <section className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Draft Orders</h1>
          <button
            className="btn btn-primary text-white"
            onClick={() => {
              dispatch(cartActions.createNewCartAndActivate());
              navigate("/products");
            }}
          >
            New Order
          </button>
        </section>

        {draftList.length < 1 ? (
          <div className="text-center text-tertiary">No drafts saved.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {draftList.map((d) => {
              const subtotal = (d.list || []).reduce((acc, cur) => acc + cur.price * cur.qty, 0);
              const total = subtotal + 30000;
              const isActive = activeCartId === d.id;
              return (
                <div key={d.id} className={`rounded-lg border p-4 ${isActive ? "border-tertiary" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Draft #{d.id}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(d.updatedAt || d.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm mt-2">Items: {(d.list || []).length}</div>
                  <div className="text-sm">Subtotal: VND {n_f(subtotal)}</div>
                  <div className="text-sm font-bold">Total: VND {n_f(total)}</div>
                  <div className="flex gap-2 mt-4">
                    <button
                      className="btn btn-secondary text-tertiary"
                      onClick={() => {
                        dispatch(cartActions.setActiveCart(d.id));
                        navigate("/products");
                      }}
                    >
                      Set Active
                    </button>
                    <button
                      className="btn btn-error text-white"
                      onClick={() => dispatch(cartActions.deleteCart(d.id))}
                    >
                      Delete
                    </button>
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


