import api from "./base";

export const getTables = (params = {}, token, controller) => {
  const query = {
    page: params.page ?? 1,
    limit: params.limit ?? 100,
    status: params.status,
  };
  return api.get("/apiv1/tables", {
    params: query,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal: controller?.signal,
  });
};

export const updateTable = (tableId, payload = {}, token, controller) => {
  return api.patch(`/apiv1/tables/${tableId}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
};

export const rotateTableQr = (tableId, token, controller) => {
  return api.post(`/apiv1/tables/${tableId}/rotate-qr`, {}, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
};


