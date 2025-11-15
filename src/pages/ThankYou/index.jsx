import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentStatus = searchParams.get("payment");
  const orderId = searchParams.get("orderId");
  const isSuccess = paymentStatus === "success";

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate("/products");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {isSuccess ? (
            <>
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Payment Successful
              </h1>
              <p className="text-gray-600 mb-6">
                Your order has been confirmed and is being processed.
                {orderId && (
                  <span className="block mt-2 text-sm">
                    Order ID: #{orderId}
                  </span>
                )}
                <span className="block mt-2 text-sm text-gray-500">
                  Redirecting to products page in 3 seconds...
                </span>
              </p>
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Payment Failed
              </h1>
              <p className="text-gray-600 mb-6">
                An error occurred during payment. Please try again.
              </p>
            </>
          )}

          <button
            onClick={() => navigate("/products")}
            className="w-full bg-tertiary hover:bg-tertiary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Back to Products
          </button>
        </div>
      </main>
    </>
  );
};

export default ThankYou;

