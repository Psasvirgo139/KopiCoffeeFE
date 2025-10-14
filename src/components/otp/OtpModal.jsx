import React from "react";
import { toast } from "react-hot-toast";
import { verifyOtp, resendOtp } from "../../utils/dataProvider/auth";

const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

export default function OtpModal({
  isOpen,
  email,
  rawUsername,
  rawPassword,
  onClose,
  onVerified,
  ttlSeconds = 30,
}) {
  const [otp, setOtp] = React.useState("");
  const [secondsLeft, setSecondsLeft] = React.useState(ttlSeconds);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const controllerRef = React.useRef(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setOtp("");
    setSecondsLeft(ttlSeconds);
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [isOpen, ttlSeconds]);

  const handleVerify = async (e) => {
    e?.preventDefault?.();
    if (!otp || otp.length !== 6) {
      toast.error("Vui lòng nhập đủ 6 số OTP");
      return;
    }
    setIsVerifying(true);
    controllerRef.current?.abort?.();
    controllerRef.current = new AbortController();
    try {
      await verifyOtp(email, otp, controllerRef.current);
      toast.success("Xác thực thành công!");
      onVerified?.();
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        "OTP sai hoặc đã hết hạn";
      toast.error(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!rawUsername || !rawPassword) {
      toast.error(
        "Thiếu username hoặc password để gửi lại OTP. Vui lòng đăng ký lại."
      );
      return;
    }
    setIsResending(true);
    controllerRef.current?.abort?.();
    controllerRef.current = new AbortController();
    try {
      await resendOtp(email, rawUsername, rawPassword, controllerRef.current);
      toast.success("Đã gửi lại OTP. Vui lòng kiểm tra email.");
      setSecondsLeft(ttlSeconds);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        "Không thể gửi lại OTP";
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onClose?.()}
      />
      {/* modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 className="text-xl font-bold mb-2">Nhập mã OTP</h3>
        <p className="text-sm text-gray-600 mb-4">
          Mã đã được gửi tới <span className="font-semibold">{email}</span>. Mã
          có hiệu lực trong <span className="font-semibold">{ttlSeconds}s</span>
          .
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="------"
            className="tracking-widest text-center text-2xl border-2 border-gray-300 rounded-xl px-4 py-3 w-full"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            autoFocus
          />

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Hết hạn sau:{" "}
              <span className="font-semibold">00:{pad(secondsLeft)}</span>
            </span>

            <button
              type="button"
              disabled={secondsLeft > 0 || isResending}
              onClick={handleResend}
              className={`font-semibold ${
                secondsLeft > 0 || isResending
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-secondary hover:opacity-80"
              }`}
            >
              {isResending ? "Đang gửi..." : "Gửi lại mã"}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-3"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className={`w-2/3 bg-secondary text-tertiary font-bold rounded-xl py-3 shadow-md hover:bg-secondary-200 transition ${
                isVerifying ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isVerifying ? "Đang xác thực..." : "Xác thực"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
