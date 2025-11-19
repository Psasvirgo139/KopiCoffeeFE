import api from "./base";

const buildAuth = (token, controller) => ({
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  signal: controller?.signal,
});

export const getMonthlyReport = async (token, controller) => {
  const res = await api.get(
    "/apiv1/adminPanel/monthlyReport",
    buildAuth(token, controller)
  );
  return res.data;
};

export const getSellingReport = async (
  view = "monthly",
  token,
  controller,
  from,
  to,
  buckets = 7
) => {
  const params = { view };
  if (from) params.from = from;
  if (to) params.to = to;
  if (buckets) params.buckets = buckets;

  const auth = {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: controller?.signal,
  };

  try {
    const r1 = await api.get("/apiv1/adminPanel/reports", { params, ...auth });
    return r1.data;
  } catch (e1) {
    try {
      const r2 = await api.get("/apiv1/admin/selling-report", {
        params,
        ...auth,
      });
      return r2.data;
    } catch (e2) {
      try {
        const r3 = await api.get("/apiv1/admin/sellingReport", {
          params,
          ...auth,
        });
        return r3.data;
      } catch (e3) {
        throw e1.response ? e1 : e2.response ? e2 : e3;
      }
    }
  }
};

export const exportRevenueReport = async (
  token,
  view = "monthly",
  from,
  to,
  buckets = 7
) => {
  const params = { view, buckets };
  if (from) params.from = from;
  if (to) params.to = to;

  const res = await api.get("/apiv1/adminPanel/reports/export", {
    params,
    ...buildAuth(token),
    responseType: "blob",
  });
  return res.data;
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

export const unbanCustomer = async (token, userId, controller) => {
  const cfg = { signal: controller?.signal };
  if (token) cfg.headers = { Authorization: `Bearer ${token}` };

  try {
    return await api.put(`/apiv1/admin/customers/${userId}/unban`, {}, cfg);
  } catch (err) {
    const statusCode = err?.response?.status;
    if (!statusCode || [404, 405, 400, 501].includes(statusCode)) {
      return await updateCustomer(
        token,
        userId,
        { status: "ACTIVE" },
        controller
      );
    }
    throw err;
  }
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
export const exportRevenue = exportRevenueReport;
