import api from "./base";

export const createPayOSPayment = (orderId, token, controller) => {
  return api.post(
    `/apiv1/payment/payos?orderId=${orderId}`,
    {},
    {
      signal: controller?.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );
};

