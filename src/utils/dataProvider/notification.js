import api from "./base";

// số unread
export const getUnreadCount = async () => {
  const { data } = await api.get("/api/notifications/unread-count");
  return data.count ?? 0;
};

// phân trang danh sách
export const getNotifications = async (page = 0, size = 20) => {
  const { data } = await api.get("/api/notifications", { params: { page, size } });
  return data; // Spring Page
};

// đánh dấu đã đọc 1 bản tin
export const markNotificationRead = (targetId) =>
  api.patch(`/api/notifications/${targetId}/read`);

// đánh dấu đã đọc tất cả
export const markAllNotificationsRead = () =>
  api.post("/api/notifications/read-all");
