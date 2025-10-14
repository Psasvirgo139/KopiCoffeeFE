import api from "./base";

export const createPromoEntry = (
  {
    name = "",
    desc = "",
    coupon_code = "",
    discount_type = "",
    discount_value = "",
    min_order_amount = "",
    total_usage_limit = "",
    start_date = "",
    end_date = "",
  },
  token,
  controller
) => {
  const payload = {
    name,
    desc,
    coupon_code,
    discount_type,
    discount_value,
    min_order_amount,
    total_usage_limit,
    start_date,
    end_date,
  };
  return api.post("/apiv1/promo", payload, {
    signal: controller.signal,
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getPromos = (
  { page = 1, limit = 4, available = "true", searchByName = "" },
  controller
) => {
  const params = {
    page,
    limit,
    available,
    searchByName,
  };
  return api.get("/apiv1/promo", {
    params,
    signal: controller.signal,
  });
};

export const editPromoEntry = (
  promoId,
  {
    name = "",
    desc = "",
    discount_type = "",
    discount_value = "",
    coupon_code = "",
    start_date = "",
    end_date = "",
  },
  token,
  controller
) => {
  const payload = {
    name,
    desc,
    discount_type,
    discount_value,
    coupon_code,
    start_date,
    end_date,
  };
  return api.patch(`/apiv1/promo/${promoId}`, payload, {
    signal: controller.signal,
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getPromoById = (promoId, controller) => {
  return api.get(`/apiv1/promo/${promoId}`, { signal: controller.signal });
};

export const deletePromoEntry = (promoId, token, controller) => {
  return api.delete(`/apiv1/promo/${promoId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
  });
};

export const createPromoEvent = (
  {
    name = "",
    desc = "",
    discount_type = "",
    discount_value = "",
    start_date = "",
    end_date = "",
    product_ids = [],
  },
  token,
  controller
) => {
  const payload = {
    name,
    desc,
    discount_type,
    discount_value,
    start_date,
    end_date,
    product_ids,
  };
  return api.post("/apiv1/promo/events", payload, {
    signal: controller.signal,
    headers: { Authorization: `Bearer ${token}` },
  });
};
