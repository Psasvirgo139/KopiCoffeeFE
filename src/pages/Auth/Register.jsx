import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

import useDocumentTitle from "../../utils/documentTitle";
import icon from "../../assets/jokopi.svg";
import { registerWithUsername } from "../../utils/dataProvider/auth";
import OtpModal from "../../components/otp/OtpModal";

const Register = () => {
  useDocumentTitle("Register");

  const controller = React.useMemo(() => new AbortController(), []);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  /* form có username + confirmPassword */
  const [form, setForm] = React.useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  /* lỗi tương ứng */
  const [error, setError] = React.useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  /* trạng thái OTP modal */
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");

  function registerHandler(e) {
    e.preventDefault();
    toast.dismiss();

    const valid = {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    };
    const emailRegex =
      /^(?:[a-zA-Z0-9._%+-]+)@(?:[a-zA-Z0-9-]+\.)+[A-Za-z]{2,}$/;
    const passRegex = /^(?=.*[0-9])(?=.*[a-zA-Z]).{8,}$/;

    // email
    if (!form.email) valid.email = "Email không được để trống";
    else if (!emailRegex.test(form.email)) valid.email = "Email không hợp lệ";

    // username
    if (!form.username) valid.username = "Tên đăng nhập không được để trống";
    else if (form.username.trim().length < 3)
      valid.username = "Tên đăng nhập tối thiểu 3 ký tự";

    // password
    if (!form.password) valid.password = "Mật khẩu không được để trống";
    else if (form.password.length < 8)
      valid.password = "Mật khẩu tối thiểu 8 ký tự";
    else if (!passRegex.test(form.password))
      valid.password = "Mật khẩu phải có cả chữ và số";

    // confirm
    if (!form.confirmPassword)
      valid.confirmPassword = "Vui lòng nhập lại mật khẩu";
    else if (form.confirmPassword !== form.password)
      valid.confirmPassword = "Mật khẩu không trùng khớp";

    setError(valid);

    const hasError = Object.values(valid).some((v) => v);
    if (!hasError) {
      setIsLoading(true);
      e.target.disabled = true;

      toast
        .promise(
          registerWithUsername(
            form.email,
            form.username,
            form.password,
            controller
          ).then((res) => {
            return (
              res?.data?.message ||
              res?.data?.msg ||
              "Đã gửi OTP. Vui lòng kiểm tra email."
            );
          }),
          {
            loading: "Đang xử lý...",
            success: (msg) => {
              // Mở modal OTP
              setOtpEmail(form.email);
              setOtpOpen(true);
              return msg;
            },
            error: ({ response }) => {
              return (
                response?.data?.message ||
                response?.data?.msg ||
                "Đăng ký thất bại"
              );
            },
          },
          { success: { duration: 4000 }, error: { duration: Infinity } }
        )
        .finally(() => {
          setIsLoading(false);
          e.target.disabled = false;
        });
    }
  }

  function onChangeForm(e) {
    const { name, value } = e.target;
    setForm((cur) => ({ ...cur, [name]: value }));
  }

  return (
    <>
      <header className="flex justify-between mb-10">
        <Link to="/">
          <div className="font-extrabold flex flex-row justify-center gap-4">
            <img src={icon} alt="logo" width="30px" />
            <h1 className="text-xl">Kopi.</h1>
          </div>
        </Link>
        <div className="text-xl font-semibold text-tertiary">Register</div>
      </header>

      <section className="mt-16">
        <form className="space-y-4 md:space-y-4 relative">
          {/* Email */}
          <div>
            <label htmlFor="email" className="text-[#4F5665] font-bold">
              Email address :
            </label>
            <input
              type="text"
              name="email"
              id="email"
              className={`border-gray-400 border-2 rounded-2xl p-3 w-full mt-2${
                error.email ? " border-red-500" : ""
              }`}
              placeholder="Enter your email address"
              value={form.email}
              onChange={onChangeForm}
            />
            <span className="flex items-center font-medium tracking-wide text-red-500 text-xs mt-1 ml-1 h-4">
              {error.email || ""}
            </span>
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="text-[#4F5665] font-bold">
              Username :
            </label>
            <input
              type="text"
              name="username"
              id="username"
              className={`border-gray-400 border-2 rounded-2xl p-3 w-full mt-2${
                error.username ? " border-red-500" : ""
              }`}
              placeholder="Enter your username"
              value={form.username}
              onChange={onChangeForm}
            />
            <span className="flex items-center font-medium tracking-wide text-red-500 text-xs mt-1 ml-1 h-4">
              {error.username || ""}
            </span>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="text-[#4F5665] font-bold">
              Password :
            </label>
            <input
              type="password"
              name="password"
              id="password"
              className={`border-gray-400 border-2 rounded-2xl p-3 w-full mt-2${
                error.password ? " border-red-500" : ""
              }`}
              placeholder="Enter your password"
              value={form.password}
              onChange={onChangeForm}
            />
            <span className="flex items-center font-medium tracking-wide text-red-500 text-xs mt-1 ml-1 h-4">
              {error.password || ""}
            </span>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="text-[#4F5665] font-bold"
            >
              Confirm Password :
            </label>
            <input
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              className={`border-gray-400 border-2 rounded-2xl p-3 w-full mt-2${
                error.confirmPassword ? " border-red-500" : ""
              }`}
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={onChangeForm}
            />
            <span className="flex items-center font-medium tracking-wide text-red-500 text-xs mt-1 ml-1 h-4">
              {error.confirmPassword || ""}
            </span>
          </div>

          <button
            type="submit"
            className={`${
              isLoading
                ? "cursor-not-allowed bg-secondary-200"
                : "cursor-pointer bg-secondary"
            } w-full text-tertiary focus:ring-4 focus:outline-none focus:ring-primary-300 font-bold rounded-2xl text-lg p-3 text-center shadow-xl inline-flex items-center justify-center transition ease-in-out duration-150 hover:bg-secondary-200`}
            onClick={registerHandler}
          >
            {isLoading ? (
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              ""
            )}
            Signup
          </button>

          <div className="inline-flex items-center justify-center w-full">
            <hr className="w-full h-px my-6 bg-gray-200 border-0" />
            <span className="absolute px-3 font-medium text-gray-900 -translate-x-1/2 bg-white left-1/2 w-64 text-center">
              Already have a account?
            </span>
          </div>

          <Link to="/auth/login">
            <button className="w-full text-white bg-tertiary focus:ring-4 focus:outline-none focus:ring-primary-300 font-bold rounded-2xl text-lg p-3 text-center shadow-xl lg:mb-20">
              Login here
            </button>
          </Link>
        </form>
      </section>

      <OtpModal
        isOpen={otpOpen}
        email={otpEmail}
        rawUsername={form.username}
        rawPassword={form.password}
        onClose={() => setOtpOpen(false)}
        onVerified={() => {
          navigate("/auth/login", { replace: true });
        }}
        ttlSeconds={30}
      />
    </>
  );
};

export default Register;
