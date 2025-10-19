import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Backwards-compatible active cart view (used by existing pages)
  list: [],
  payment_id: "",
  delivery_id: "",
  delivery_address: "",
  notes: "",
  now: "",
  phone_number: "",
  // Multi-cart state
  activeCartId: null, // string | null – if pointing to a draft in cartsById
  cartsById: {}, // { [id: string]: { id, createdAt, updatedAt, list, payment_id, delivery_id, delivery_address, notes, now, phone_number } }
};

function generateCartId() {
  return String(Date.now());
}

function getTargetCart(prevState) {
  const activeId = prevState.activeCartId;
  if (activeId && prevState.cartsById[activeId]) {
    return { type: "draft", id: activeId, cart: prevState.cartsById[activeId] };
  }
  return { type: "active", id: null, cart: { ...prevState } };
}

function syncTopLevelFromCart(prevState, sourceCart) {
  return {
    ...prevState,
    list: sourceCart.list || [],
    payment_id: sourceCart.payment_id || "",
    delivery_id: sourceCart.delivery_id || "",
    delivery_address: sourceCart.delivery_address || "",
    notes: sourceCart.notes || "",
    now: sourceCart.now || "",
    phone_number: sourceCart.phone_number || "",
  };
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addtoCart: (prevState, action) => {
      const target = getTargetCart(prevState);
      const list = target.cart.list || [];
      const existIdx = list.findIndex(
        (item) =>
          item.product_id === action.payload.product_id &&
          item.size_id === action.payload.size_id
      );

      const updatedItem = {
        ...action.payload,
        qty: existIdx !== -1 ? list[existIdx].qty + action.payload.qty : action.payload.qty,
        subtotal:
          existIdx !== -1 && typeof list[existIdx].subtotal === "number"
            ? list[existIdx].subtotal + (action.payload.subtotal || action.payload.price * action.payload.qty)
            : action.payload.subtotal || action.payload.price * action.payload.qty,
      };

      const updatedList =
        existIdx !== -1
          ? [...list.slice(0, existIdx), updatedItem, ...list.slice(existIdx + 1)]
          : [...list, updatedItem];

      if (target.type === "draft") {
        const updatedDraft = {
          ...target.cart,
          list: updatedList,
          updatedAt: Date.now(),
        };
        const next = {
          ...prevState,
          cartsById: { ...prevState.cartsById, [target.id]: updatedDraft },
        };
        return syncTopLevelFromCart(next, updatedDraft);
      }
      // active top-level
      return {
        ...prevState,
        list: updatedList,
      };
    },
    incrementQty: (prevState, action) => {
      const target = getTargetCart(prevState);
      const updatedList = (target.cart.list || []).map((item) => {
        if (
          item.product_id === action.payload.product_id &&
          item.size_id === action.payload.size_id
        ) {
          return { ...item, qty: item.qty + 1, subtotal: (item.subtotal || item.price * item.qty) + item.price };
        }
        return item;
      });
      if (target.type === "draft") {
        const updatedDraft = { ...target.cart, list: updatedList, updatedAt: Date.now() };
        const next = { ...prevState, cartsById: { ...prevState.cartsById, [target.id]: updatedDraft } };
        return syncTopLevelFromCart(next, updatedDraft);
      }
      return { ...prevState, list: updatedList };
    },
    decrementQty: (prevState, action) => {
      const target = getTargetCart(prevState);
      const updatedList = (target.cart.list || []).map((item) => {
        if (
          item.product_id === action.payload.product_id &&
          item.size_id === action.payload.size_id
        ) {
          if (item.qty === 1) return item;
          return { ...item, qty: item.qty - 1, subtotal: Math.max(0, (item.subtotal || item.price * item.qty) - item.price) };
        }
        return item;
      });
      if (target.type === "draft") {
        const updatedDraft = { ...target.cart, list: updatedList, updatedAt: Date.now() };
        const next = { ...prevState, cartsById: { ...prevState.cartsById, [target.id]: updatedDraft } };
        return syncTopLevelFromCart(next, updatedDraft);
      }
      return { ...prevState, list: updatedList };
    },
    removeFromCart: (prevState, action) => {
      const target = getTargetCart(prevState);
      const updatedList = (target.cart.list || []).filter((item) => {
        return !(
          item.product_id === action.payload.product_id &&
          item.size_id === action.payload.size_id
        );
      });
      if (target.type === "draft") {
        const updatedDraft = { ...target.cart, list: updatedList, updatedAt: Date.now() };
        const next = { ...prevState, cartsById: { ...prevState.cartsById, [target.id]: updatedDraft } };
        return syncTopLevelFromCart(next, updatedDraft);
      }
      return { ...prevState, list: updatedList };
    },
    resetCart: (prevState, action) => {
      const target = getTargetCart(prevState);
      if (target.type === "draft") {
        const updatedDraft = {
          ...target.cart,
          list: [],
          payment_id: "",
          delivery_id: "",
          delivery_address: "",
          notes: "",
          now: "",
          phone_number: "",
          updatedAt: Date.now(),
        };
        const next = { ...prevState, cartsById: { ...prevState.cartsById, [target.id]: updatedDraft } };
        return syncTopLevelFromCart(next, updatedDraft);
      }
      return { ...prevState, ...initialState, activeCartId: prevState.activeCartId, cartsById: prevState.cartsById };
    },
    setDelivery: (prevState, action) => {
      const target = getTargetCart(prevState);
      if (target.type === "draft") {
        const updatedDraft = { ...target.cart, ...action.payload, updatedAt: Date.now() };
        const next = { ...prevState, cartsById: { ...prevState.cartsById, [target.id]: updatedDraft } };
        return syncTopLevelFromCart(next, updatedDraft);
      }
      return { ...prevState, ...action.payload };
    },
    // Save the current active cart as a draft and start a fresh active cart
    saveActiveCartAsDraft: (prevState) => {
      const activeSnapshot = {
        list: prevState.list,
        payment_id: prevState.payment_id,
        delivery_id: prevState.delivery_id,
        delivery_address: prevState.delivery_address,
        notes: prevState.notes,
        now: prevState.now,
        phone_number: prevState.phone_number,
      };
      const id = generateCartId();
      const draft = { id, createdAt: Date.now(), updatedAt: Date.now(), ...activeSnapshot };
      return {
        ...prevState,
        cartsById: { ...prevState.cartsById, [id]: draft },
        // Reset active
        list: [],
        payment_id: "",
        delivery_id: "",
        delivery_address: "",
        notes: "",
        now: "",
        phone_number: "",
        activeCartId: null,
      };
    },
    // Activate an existing draft cart by id (edits will affect that draft)
    setActiveCart: (prevState, action) => {
      const id = action.payload;
      const draft = prevState.cartsById[id];
      if (!draft) return prevState;
      const next = { ...prevState, activeCartId: id };
      return syncTopLevelFromCart(next, draft);
    },
    // Create a new empty cart and set as active (not saved as draft yet)
    createNewCartAndActivate: (prevState) => {
      return {
        ...prevState,
        activeCartId: null,
        list: [],
        payment_id: "",
        delivery_id: "",
        delivery_address: "",
        notes: "",
        now: "",
        phone_number: "",
      };
    },
    // Delete a draft cart by id
    deleteCart: (prevState, action) => {
      const id = action.payload;
      if (!prevState.cartsById[id]) return prevState;
      const nextCarts = { ...prevState.cartsById };
      delete nextCarts[id];
      const isActive = prevState.activeCartId === id;
      if (isActive) {
        return {
          ...prevState,
          cartsById: nextCarts,
          activeCartId: null,
          list: [],
          payment_id: "",
          delivery_id: "",
          delivery_address: "",
          notes: "",
          now: "",
          phone_number: "",
        };
      }
      return { ...prevState, cartsById: nextCarts };
    },
  },
});

export const cartActions = cartSlice.actions;
export default cartSlice.reducer;
