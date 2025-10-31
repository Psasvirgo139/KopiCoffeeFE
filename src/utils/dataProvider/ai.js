import api from "./base";

export const searchAiSuggestions = async (payload, token, controller) => {
  // payload: { keywords: string[]|undefined, days?: number, maxResults?: number, regionCode?: string, language?: string }
  const res = await api.post("/apiv1/ai/suggestions/search", payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: controller?.signal,
  });
  return res.data;
};

export const getTrendingDishes = async (params, token, controller) => {
  // params: { days?: number, maxResults?: number, shortsOnly?: boolean }
  const res = await api.get("/apiv1/trends/dishes", {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: controller?.signal,
  });
  return res.data;
};
