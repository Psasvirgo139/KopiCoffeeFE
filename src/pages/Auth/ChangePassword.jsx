import React from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { forceChangePassword } from "../../utils/dataProvider/auth";
import useDocumentTitle from "../../utils/documentTitle";

const ChangePassword = () => {
  useDocumentTitle("Change Password");
  const navigate = useNavigate();
  const controller = React.useMemo(() => new AbortController(), []);
  const userInfo = useSelector((s) => s.userInfo);

  const [form, setForm] = React.useState({ newpass: "", conf: "" });
  const [err, setErr] = React.useState({ newpass: "", conf: "" });
  const [isLoading, setIsLoading] = React.useState(false);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  function validate() {
    const v = { newpass: "", conf: "" };
    if (!form.newpass) v.newpass = "Input your new password";
    if (!form.conf) v.conf = "Confirm your new password";
    if (!v.newpass && !v.conf && form.newpass !== form.conf) v.conf = "Passwords do not match";
    setErr(v);
    return !v.newpass && !v.conf;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    if (!userInfo?.token) {
      toast.error("Your session expired. Please login again.");
      navigate("/auth/login", { replace: true });
      return;
    }

    setIsLoading(true);
    toast.promise(
      forceChangePassword(userInfo.token, { new_password: form.newpass }, controller)
        .then(() => {
          navigate("/", { replace: true });
          return "Password updated successfully";
        })
        .finally(() => setIsLoading(false)),
      {
        loading: "Updating password...",
        success: (m) => m,
        error: (err) => err?.response?.data?.msg || err?.response?.data?.message || "Failed to update password",
      }
    );
  }

  return (
    <section className="max-w-md mx-auto mt-16 p-6 border rounded-2xl shadow">
      <h1 className="text-2xl font-bold mb-4 text-center">Change Password</h1>
      <p className="text-sm text-gray-600 mb-6 text-center">
        You are using a temporary password. Please set a permanent password to continue.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="newpass" className="font-medium">New password</label>
          <input
            id="newpass"
            name="newpass"
            type="password"
            value={form.newpass}
            onChange={onChange}
            className={`border-2 rounded-2xl p-3 w-full mt-1 ${err.newpass ? "border-red-500" : "border-gray-400"}`}
            placeholder="Enter your new password"
          />
          <span className="text-xs text-red-500">{err.newpass}</span>
        </div>

        <div>
          <label htmlFor="conf" className="font-medium">Confirm new password</label>
          <input
            id="conf"
            name="conf"
            type="password"
            value={form.conf}
            onChange={onChange}
            className={`border-2 rounded-2xl p-3 w-full mt-1 ${err.conf ? "border-red-500" : "border-gray-400"}`}
            placeholder="Re-enter your new password"
          />
          <span className="text-xs text-red-500">{err.conf}</span>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full text-white bg-tertiary font-bold rounded-2xl text-lg p-3 text-center shadow-xl"
        >
          Change Password
        </button>

        <button
          type="button"
          onClick={() => navigate("/auth/login")}
          className="w-full border-2 border-gray-400 rounded-2xl text-lg p-3 text-center"
        >
          Back to Login
        </button>
      </form>
    </section>
  );
};

export default ChangePassword;
