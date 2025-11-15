import api from "./base";

/**
 * Gửi tin nhắn chat đến backend
 * @param {string} message - Nội dung tin nhắn
 * @param {Array} history - Lịch sử chat (optional)
 * @returns {Promise} Response từ API
 */
export function sendChatMessage(message, history = [], orderState = null, orderContext = null) {
  const payload = {
    message,
    history: history.slice(-10), // Lấy 10 tin nhắn gần nhất
  };
  if (orderState) payload.orderState = orderState;
  if (orderContext) payload.orderContext = orderContext;
  return api.post("/apiv1/chat/message", payload);
}

