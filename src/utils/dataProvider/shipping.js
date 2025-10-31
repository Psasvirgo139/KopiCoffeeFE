import api from "./base";

export const getShipperLocation = (orderId, token, controller) => {
  return api.get(`/apiv1/shipping/${orderId}/location`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
};

export const updateShipperLocation = (orderId, { lat, lng }, token, controller) => {
  return api.post(
    `/apiv1/shipping/${orderId}/location`,
    { lat, lng },
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller?.signal,
    }
  );
};

export const getShippingInfo = (orderId, token, controller) => {
  return api.get(`/apiv1/shipping/${orderId}/info`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
};

export const claimOrder = (orderId, token, controller) => {
  return api.post(
    `/apiv1/shipping/${orderId}/claim`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller?.signal,
    }
  );
};


