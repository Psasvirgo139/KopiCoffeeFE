import axios from "axios";

const host = (
  process.env.REACT_APP_BACKEND_HOST || "http://localhost:8080/Kopi"
).replace(/\/$/, "");

export function login(email, password, rememberMe, controller) {
  const body = { email, password, rememberMe };
  const url = `${host}/apiv1/auth/login`;
  return axios.post(url, body, { signal: controller?.signal });
}

export function register(email, password, phone_number, controller) {
  const body = { email, password };
  const url = `${host}/apiv1/auth/register`;
  return axios.post(url, body, { signal: controller?.signal });
}

export function forgotPass(email, controller) {
  const body = { email };
  const url = `${host}/apiv1/auth/forgotPass`;
  return axios.post(url, body, { signal: controller?.signal });
}

/** (Legacy) Xác thực trạng thái reset pass */
export function verifyResetPass(verify, code, controller) {
  const url = `${host}/apiv1/auth/resetPass?verify=${verify}&code=${code}`;
  return axios.get(url, { signal: controller?.signal });
}

/** (Legacy) Đặt lại mật khẩu  */
export function resetPass(verify, code, password, controller) {
  const url = `${host}/apiv1/auth/resetPass?verify=${verify}&code=${code}`;
  return axios.patch(
    url,
    { newPassword: password },
    { signal: controller?.signal }
  );
}

/** (Legacy) Đổi mật khẩu bắt buộc */
export function forceChangePassword(token, { new_password }, controller) {
  const url = `${host}/apiv1/auth/force-change-password`;
  return axios.post(
    url,
    { new_password },
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller?.signal,
    }
  );
}

export function registerWithUsername(email, username, password, controller) {
  const url = `${host}/apiv1/auth/register`;
  return axios.post(
    url,
    { email, username, password },
    { signal: controller?.signal }
  );
}

/*Xác thực OTP */
export function verifyOtp(email, otp, controller) {
  const url = `${host}/apiv1/auth/verify-otp`;
  return axios.post(url, { email, otp }, { signal: controller?.signal });
}

export function resendOtp(email, username, password, controller) {
  const url = `${host}/apiv1/auth/register`;
  return axios.post(
    url,
    { email, username, password },
    { signal: controller?.signal }
  );
}

export function registerEmailPassword(email, password, controller) {
  const url = `${host}/apiv1/auth/register`;
  return axios.post(url, { email, password }, { signal: controller?.signal });
}

export function logoutUser(token) {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const url = `${host}/apiv1/auth/logout`;
  return axios.delete(url, config);
}
export function forceChangePassword(token, { new_password }, controller) {
  const url = `${process.env.REACT_APP_BACKEND_HOST}/apiv1/auth/force-change-password`;

  return axios.post(
    url,
    { new_password },
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller?.signal,
    }
  );
}
