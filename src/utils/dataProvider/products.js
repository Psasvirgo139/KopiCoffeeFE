import axios from "axios";

import api from "./base";

const host = process.env.REACT_APP_BACKEND_HOST;

export function getAllProducts(
  catId = "",
  { orderBy = "", sort = "", searchByName = "", limit = "10", page = "1" },
  controller
) {
  const params = { orderBy, sort, searchByName, limit, page };
  const url = `${host}/apiv1/products?category=${catId}`;

  return axios.get(url, { params, signal: controller.signal });
}

export function getProductbyId(productId, controller) {
  const url = `${host}/apiv1/products/${productId}`;

  return axios.get(url, {
    signal: controller.signal,
  });
}

export const createProductEntry = (
  { name = "", price = "", category_id = "", desc = "", image = "" },
  token,
  controller
) => {
  const bodyForm = new FormData();
 // ✅ Nếu là File (từ input type="file")
  if (image instanceof File) {
    bodyForm.append("image", image);
  }
  // ✅ Nếu là string URL (ảnh đã có sẵn) → BE nhận ở field 'img'
  else if (typeof image === "string" && image.trim() !== "") {
    bodyForm.append("img", image);
  }
  bodyForm.append("name", name);
  bodyForm.append("category_id", category_id);
  bodyForm.append("desc", desc);
  bodyForm.append("price", price);

  // const body = {
  //   name,
  //   price,
  //   category_id,
  //   desc,
  //   image,
  // };
  // console.log(image);
  return api.post("/apiv1/products", bodyForm, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
    signal: controller.signal,
  });
};

export const editProductEntry = (
  { name = "", price = "", category_id = "", desc = "", image = "" },
  productId,
  token,
  controller
) => {
  const bodyForm = new FormData();
  // If image is a File/Blob, send as 'image'; if string URL, send as 'img'
  if (image && typeof image !== "string") {
    bodyForm.append("image", image);
  } else if (typeof image === "string" && image !== "") {
    bodyForm.append("img", image);
  }
  bodyForm.append("name", name);
  bodyForm.append("category_id", category_id);
  bodyForm.append("desc", desc);
  bodyForm.append("price", price);

  // const body = {
  //   name,
  //   price,
  //   category_id,
  //   desc,
  //   image,
  // };
  return api.patch(`/apiv1/products/${productId}`, bodyForm, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
    signal: controller.signal,
  });
};

export const deleteProductEntry = (productId, token, controller) => {
  return api.delete(`/apiv1/products/${productId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
  });
};
