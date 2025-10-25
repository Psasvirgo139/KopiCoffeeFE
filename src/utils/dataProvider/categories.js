import api from "./base";

export const getCategories = (controller) => {
  return api.get("/apiv1/categories", {
    signal: controller?.signal,
  });
};


