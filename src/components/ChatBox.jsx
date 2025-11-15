import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { sendChatMessage } from "../utils/dataProvider/chat";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { cartActions } from "../redux/slices/cart.slice";

const ChatBox = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasShownWelcome = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen && !hasShownWelcome.current && messages.length === 0) {
      hasShownWelcome.current = true;
      setMessages([
        {
          role: "assistant",
          content:
            "Xin chào! 👋\n\nTôi là trợ lý ảo của Kopi Coffee & Workspace. Tôi có thể giúp bạn:\n\n✨ Đặt hàng sản phẩm\n📋 Xem danh sách sản phẩm\n📊 Kiểm tra tồn kho (Admin)\n💰 Xem báo cáo doanh thu (Admin)\n\nHãy cho tôi biết bạn cần gì nhé! 😊",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    if (!isOpen) {
      hasShownWelcome.current = false;
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const messageText = input.trim();
    setInput("");
    handleSendMessage(messageText);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestionText) => {
    if (suggestionText.trim()) {
      handleSendMessage(suggestionText);
    }
  };

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || loading) return;

    const userMessage = {
      role: "user",
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    };

    // Tính mảng messages tiếp theo đồng bộ để dùng ngay
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setLoading(true);

    try {
      // Lấy order context gần nhất từ assistant (nếu có)
      const lastAssistant = [...nextMessages].reverse().find((m) => m.role === "assistant" && (m.orderState || m.orderContext));
      const response = await sendChatMessage(
        messageText.trim(),
        nextMessages,
        lastAssistant?.orderState || null,
        lastAssistant?.orderContext || null
      );
      const data = response.data;
      const productInfo =
        data?.data && typeof data.data === "object"
          ? data.data.productInfo || (data.intent === "product_info" ? data.data : null)
          : null;

      const assistantMessage = {
        role: "assistant",
        content: data.message || "Xin chào! Tôi có thể giúp gì cho bạn?",
        timestamp: new Date().toISOString(),
        suggestions: data.suggestions || [],
        orderState: data.orderState || null,
        orderContext: data.orderContext || null,
        orderCreated: data.orderCreated || false,
        orderId: data.orderId || null,
        redirectTo: data.redirectTo || null,
        orderData: data.orderData || null,
        productInfo: productInfo || null,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Nếu BE trả về dữ liệu đơn/ sản phẩm → thêm vào cart trước khi điều hướng
      if (data.orderCreated && data.orderData && data.orderData.productId) {
        const qty = Number(data.orderData.quantity || 1);
        const price = Number(data.orderData.price || 0);
        dispatch(
          cartActions.addtoCart({
            product_id: Number(data.orderData.productId),
            size_id: 1,
            add_on_ids: [],
            img: data.orderData.img || "",
            name: data.orderData.productName || "Sản phẩm",
            price: price,
            qty: qty,
            subtotal: price * qty,
          })
        );
        if (data.orderData.deliveryId || data.orderData.deliveryAddress || data.orderData.phoneNumber) {
          dispatch(
            cartActions.setDelivery({
              delivery_id: data.orderData.deliveryId || "",
              delivery_address: data.orderData.deliveryAddress || "",
              phone_number: data.orderData.phoneNumber || "",
            })
          );
        }
      }

      // Xử lý redirect nếu đơn hàng được tạo thành công
      if (data.orderCreated && data.redirectTo) {
        toast.success("Đơn hàng đã được tạo thành công! Đang chuyển hướng...");
        setTimeout(() => {
          navigate(data.redirectTo);
          setIsOpen(false); // Đóng chat khi redirect
        }, 2000); // Delay 2 giây để user đọc thông báo
      } else if (data.orderCreated) {
        toast.success("Đơn hàng đã được tạo thành công!");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(
        error?.response?.data?.message ||
          "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau."
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[400px] h-[650px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slideUp">
          {/* Header */}
          <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 text-white p-5 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl backdrop-blur-sm">
                ☕
              </div>
              <div>
                <div className="font-bold text-lg">Trợ lý ảo Kopi</div>
                <div className="text-xs text-amber-100 opacity-90">Luôn sẵn sàng hỗ trợ bạn</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/20 transition-all duration-200 text-xl hover:rotate-90"
              aria-label="Đóng chat"
            >
              ×
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-end gap-2 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  } animate-fadeIn`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-700 to-amber-900 rounded-full flex items-center justify-center text-white text-sm shadow-md flex-shrink-0">
                      ☕
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-amber-700 to-amber-900 text-white rounded-br-sm shadow-lg"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-md hover:shadow-lg transition-shadow"
                    }`}
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    <div className="text-sm leading-relaxed">{msg.content}</div>
                  {msg.productInfo && (
                    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-gray-700 shadow-sm">
                      <div className="font-semibold text-amber-900">{msg.productInfo.name || "Sản phẩm"}</div>
                      {msg.productInfo.img && (
                        <img
                          src={msg.productInfo.img}
                          alt={msg.productInfo.name || "Product"}
                          className="mt-2 h-32 w-full rounded-lg object-cover"
                        />
                      )}
                      <div className="mt-2">
                        <span className="font-medium text-amber-800">Giá:</span>{" "}
                        {msg.productInfo.priceFormatted ||
                          (msg.productInfo.price ? `${msg.productInfo.price} VNĐ` : "Đang cập nhật")}
                      </div>
                      {msg.productInfo.description && (
                        <div className="mt-2 text-xs text-gray-600">{msg.productInfo.description}</div>
                      )}
                      {typeof msg.productInfo.stock === "number" && (
                        <div className="mt-2 text-xs text-gray-500">Còn lại: {msg.productInfo.stock}</div>
                      )}
                    </div>
                  )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center text-white text-sm shadow-md flex-shrink-0">
                      👤
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex items-end gap-2 justify-start animate-fadeIn">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-700 to-amber-900 rounded-full flex items-center justify-center text-white text-sm shadow-md">
                    ☕
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {messages.length > 0 &&
                messages[messages.length - 1]?.role === "assistant" &&
                messages[messages.length - 1]?.suggestions &&
                messages[messages.length - 1].suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 animate-fadeIn">
                    {messages[messages.length - 1].suggestions.map(
                      (suggestion, idx) => {
                        const suggestionText =
                          typeof suggestion === "string"
                            ? suggestion
                            : suggestion.content || "";
                        return (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestionText)}
                            className="px-4 py-2 text-xs font-medium bg-white border border-gray-300 rounded-full hover:bg-gradient-to-r hover:from-amber-700 hover:to-amber-900 hover:text-white hover:border-transparent transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                          >
                            {suggestionText}
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200 shadow-lg">
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập tin nhắn của bạn..."
                  disabled={loading}
                  className="w-full px-5 py-3 pr-12 border-2 border-gray-200 rounded-full outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                />
                {input.trim() && (
                  <button
                    onClick={handleSend}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 transition-colors"
                  >
                    ➤
                  </button>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                aria-label="Gửi tin nhắn"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 flex items-center justify-center text-2xl ${
          isOpen ? "rotate-180" : "hover:scale-110 hover:rotate-12"
        }`}
        aria-label="Mở/Đóng chat"
      >
        {isOpen ? "✕" : "💬"}
      </button>
    </div>
  );
};

export default ChatBox;

