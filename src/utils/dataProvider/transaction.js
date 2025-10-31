import api from "./base";

export const createTransaction = (
  {
    payment_id = 1,
    delivery_id = 1,
    status_id = 3,
    address = "Table no 4",
    address_id = undefined,
    notes = "Makkah",
    customer_id = undefined,
    paid = undefined,
  },
  products = [],
  token,
  controller
) => {
  const body = {
    payment_id,
    delivery_id,
    status_id,
    products,
    address,
    notes,
  };
  if (typeof address_id !== "undefined") body.address_id = address_id;
  if (typeof customer_id !== "undefined") body.customer_id = customer_id;
  if (typeof paid !== "undefined") body.paid = paid;
  return api.post(`/apiv1/transactions`, body, {
    signal: controller?.signal,
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Validate order stock before proceeding (returns promise)
export const validateOrder = (products = [], token, controller) => {
  const body = { products };
  return api.post(`/apiv1/orders/validate`, body, {
    signal: controller?.signal,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
};

export const getTransactions = (
  { status = "PENDING", page = 1, limit = 20, type = "ALL" },
  token,
  controller
) => {
  return api.get("/apiv1/transactions", {
    params: {
      status,
      type,
      page,
      limit,
    },
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
};

export const createGuestTableOrder = (
  { qr_token = undefined, table_number = undefined, products = [], notes = "", payment_id = 1, paid = false },
  controller
) => {
  const body = { qr_token, table_number, products, notes, payment_id, paid };
  return api.post(`/apiv1/guest/table-orders`, body, {
    signal: controller?.signal,
    // no Authorization header on purpose
  });
};

export const updateTransactionStatus = (id, status, token, controller) => {
  return api.patch(
    `/apiv1/transactions/${id}/status`,
    { status },
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller?.signal,
    }
  );
};

export const setTransactionDone = (ids = [], token, controller) => {
  let convertedIds = ids.toString();
  if (typeof ids === "object") {
    convertedIds = ids.join(",");
  }
  return api.patch(
    "/apiv1/transactions/changeStatus",
    {
      transactions: convertedIds,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller?.signal,
    }
  );
};

export const getTransactionHistory = (
  { page = "1", limit = "9" },
  token,
  controller
) => {
  return api.get("/apiv1/userPanel/transactions", {
    params: {
      page,
      limit,
    },
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
};

export const getTransactionDetail = (transactionId, token, controller) => {
  return api.get(`/apiv1/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
};
