import api from "./base";

export const getMonthlyReport = (token, controller) => {
  return api.get("/apiv1/adminPanel/monthlyReport", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
  });
};

export const getSellingReport = (view = "monthly", token, controller) => {
  return api.get("/apiv1/adminPanel/reports", {
    params: {
      view,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
  });
};

export const getEmployees = (token, controller, params = {}) => {
  const cfg = { signal: controller?.signal, params: params || {} };
  if (token) cfg.headers = { Authorization: `Bearer ${token}` };
  return api.get("/apiv1/admin/employees", cfg);
};

export const getEmployeeDetail = (token, userId, controller) => {
  const cfg = { signal: controller?.signal };
  if (token) cfg.headers = { Authorization: `Bearer ${token}` };
  return api.get(`/apiv1/admin/employees/${userId}`, cfg);
};

export const getPositions = (token, controller) => {
  const cfg = { signal: controller?.signal };
  if (token) cfg.headers = { Authorization: `Bearer ${token}` };
  return api.get(`/apiv1/admin/positions`, cfg);
};

export const getRoles = (token, controller) => {
  const cfg = { signal: controller?.signal };
  if (token) cfg.headers = { Authorization: `Bearer ${token}` };
  return api.get(`/apiv1/admin/roles`, cfg);
};

export const updateEmployee = (token, userId, payload = {}, controller) => {
  const cfg = { signal: controller?.signal };
  if (token) cfg.headers = { Authorization: `Bearer ${token}` };
  return api.put(`/apiv1/admin/employees/${userId}`, payload, cfg);
};

export const demoteEmployeeToCustomer = (token, userId, controller) => {
  const cfg = { signal: controller?.signal };
  if (token) cfg.headers = { Authorization: `Bearer ${token}` };
  return api.delete(`/apiv1/admin/employees/${userId}`, cfg);
};

export const getCustomers = (
  token,
  page = 0,
  size = 20,
  controller,
  filters = {}
) => {
  const params = { page, size, ...(filters || {}) };
  const cfg = { signal: controller?.signal, params };
  if (token) cfg.headers = { Authorization: `Bearer ${token}` };
  return api.get(`/apiv1/admin/customers`, cfg);
};

export const getCustomerDetail = (token, userId, controller) => {
  const cfg = { signal: controller?.signal };
  if (token) cfg.headers = { Authorization: `Bearer ${token}` };
  return api.get(`/apiv1/admin/customers/${userId}`, cfg);
};

export const deleteCustomer = (token, userId, controller) => {
  const cfg = { signal: controller?.signal };
  if (token) cfg.headers = { Authorization: `Bearer ${token}` };
  return api.delete(`/apiv1/admin/customers/${userId}`, cfg);
};

export const updateCustomer = (token, userId, payload = {}, controller) => {
  const cfg = { signal: controller?.signal };
  if (token) cfg.headers = { Authorization: `Bearer ${token}` };
  return api.put(`/apiv1/admin/customers/${userId}`, payload, cfg);
};

export const createEmployee = (token, payload = {}, controller) => {
  const cfg = { signal: controller?.signal };
  if (token) cfg.headers = { Authorization: `Bearer ${token}` };
  return api.post(`/apiv1/admin/employees`, payload, cfg);
};

export const buildUpdateEmployeePayload = ({
  roleId,
  positionId,
  status,
} = {}) => {
  const p = {};
  if (roleId !== undefined && roleId !== null) p.roleId = Number(roleId);
  if (positionId !== undefined && positionId !== null)
    p.positionId = Number(positionId);
  if (status !== undefined && status !== null && String(status).trim() !== "")
    p.status = String(status);
  return p;
};

export const updateCustomerDto = (
  token,
  userId,
  { roleId, positionId, status } = {},
  controller
) => {
  const payload = buildUpdateEmployeePayload({ roleId, positionId, status });
  const cfg = { signal: controller?.signal };
  if (token) cfg.headers = { Authorization: `Bearer ${token}` };
  return api.put(`/apiv1/admin/customers/${userId}`, payload, cfg);
};
