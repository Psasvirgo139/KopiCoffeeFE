import api from "./base";

// GET /apiv1/profile
export const getProfile = (token, controller) => {
  return api.get("/apiv1/profile", {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
};

// PATCH /apiv1/profile (multipart/form-data)
export const editProfile = (
  {
    image,
    display_name,
    address,
    birthdate,
    gender,
    email,
    phone_number,
    first_name,
    last_name,
  },
  token,
  controller
) => {
  const body = new FormData();

  if (image) body.append("image", image);
  if (display_name !== undefined) body.append("display_name", display_name);
  if (address !== undefined) body.append("address", address);
  if (birthdate !== undefined) body.append("birthdate", birthdate); // yyyy-mm-dd
  if (gender !== undefined) body.append("gender", gender);
  if (email !== undefined) body.append("email", email);
  if (phone_number !== undefined) body.append("phone_number", phone_number);
  if (first_name !== undefined) body.append("first_name", first_name);
  if (last_name !== undefined) body.append("last_name", last_name);

  return api.patch("/apiv1/profile", body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
    signal: controller?.signal,
  });
};

// PUT /apiv1/profile/password
export const changePassword = (token, { current_password, new_password }, controller) => {
  return api.put(
    "/apiv1/profile/password",
    { current_password, new_password },
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller?.signal,
    }
  );
};

// POST /apiv1/profile/address
export const saveDefaultAddress = (token, { address_line, ward, district, city, latitude, longitude }, controller) => {
  return api.post(
    "/apiv1/profile/address",
    { address_line, ward, district, city, latitude, longitude },
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller?.signal,
    }
  );
};