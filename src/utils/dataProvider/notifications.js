import api from "./base";

/**
 * Get list of notifications
 * @param {Object|undefined} params - Query parameters (optional)
 * @param {number} params.page - Page number (if provided, enables pagination)
 * @param {number} params.limit - Items per page (default: 50 if page is provided)
 * @param {AbortController} controller - Optional abort controller
 * @returns {Promise}
 * 
 * Note: If params is undefined or null, returns ALL notifications (no pagination)
 *       If params.page is provided, returns paginated results
 */
export const getNotifications = (params = undefined, controller) => {
  // Nếu params là undefined hoặc null, không gửi params nào cả (lấy TẤT CẢ)
  // Nếu có params, gửi params đó (phân trang)
  const config = {};
  
  if (controller?.signal) {
    config.signal = controller.signal;
  }
  
  // Chỉ thêm params nếu có params và có ít nhất page hoặc limit
  if (params && typeof params === 'object' && (params.page !== undefined || params.limit !== undefined)) {
    config.params = params;
  }
  // Nếu không có params, không thêm params vào config (axios sẽ không gửi query string)
  
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log("[Notifications API] Calling getNotifications:", {
      hasParams: !!params && typeof params === 'object' && (params.page !== undefined || params.limit !== undefined),
      params: params,
      configParams: config.params,
      url: "/apiv1/notifications"
    });
  }
  
  return api.get("/apiv1/notifications", config);
};

/**
 * Get unread notification count
 * @param {AbortController} controller - Optional abort controller
 * @returns {Promise}
 */
export const getUnreadCount = (controller) => {
  return api.get("/apiv1/notifications/unread-count", {
    signal: controller?.signal,
  });
};

/**
 * Get list of unread notifications
 * @param {AbortController} controller - Optional abort controller
 * @returns {Promise}
 */
export const getUnreadNotifications = (controller) => {
  return api.get("/apiv1/notifications/unread", {
    signal: controller?.signal,
  });
};

/**
 * Mark a notification as read
 * @param {number} notificationId - Notification ID
 * @param {AbortController} controller - Optional abort controller
 * @returns {Promise}
 */
export const markAsRead = (notificationId, controller) => {
  return api.patch(`/apiv1/notifications/${notificationId}/read`, {}, {
    signal: controller?.signal,
  });
};

/**
 * Mark all notifications as read
 * @param {AbortController} controller - Optional abort controller
 * @returns {Promise}
 */
export const markAllAsRead = (controller) => {
  return api.patch("/apiv1/notifications/read-all", {}, {
    signal: controller?.signal,
  });
};

/**
 * Delete a notification
 * @param {number} notificationId - Notification ID
 * @param {AbortController} controller - Optional abort controller
 * @returns {Promise}
 */
export const deleteNotification = (notificationId, controller) => {
  return api.delete(`/apiv1/notifications/${notificationId}`, {
    signal: controller?.signal,
  });
};

