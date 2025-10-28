import api from "./base";

const buildAuth = (token, controller) => ({
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  signal: controller?.signal,
});


export const getMonthlyReport = async (token, controller) => {
  const res = await api.get("/apiv1/adminPanel/monthlyReport", buildAuth(token, controller));
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
      const r2 = await api.get("/apiv1/admin/selling-report", { params, ...auth });
      return r2.data;
    } catch (e2) {
      try {
        const r3 = await api.get("/apiv1/admin/sellingReport", { params, ...auth });
        return r3.data;
      } catch (e3) {
        throw (e1.response ? e1 : e2.response ? e2 : e3);
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

export const exportRevenue = exportRevenueReport;
