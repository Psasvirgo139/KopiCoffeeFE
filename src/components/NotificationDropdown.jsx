import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUnreadNotifications, markAsRead, markAllAsRead } from "../utils/dataProvider/notifications";
import { NavLink } from "react-router-dom";

function NotificationDropdown({ onClose, onUnreadCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await getUnreadNotifications();
      const data = response.data?.data || [];
      setNotifications(data);
      if (onUnreadCountChange) {
        onUnreadCountChange(data.length);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (notificationId, e) => {
    e?.stopPropagation();
    try {
      await markAsRead(notificationId);
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    e?.stopPropagation();
    try {
      await markAllAsRead();
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Đánh dấu đã đọc nếu chưa đọc
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }
    
    // Redirect dựa trên redirectUrl từ backend
    if (notification.order?.redirectUrl) {
      navigate(notification.order.redirectUrl);
      onClose();
    } else if (notification.order?.orderId) {
      // Fallback nếu không có redirectUrl
      navigate(`/history/${notification.order.orderId}`);
      onClose();
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const statusMap = {
    PENDING: "Đang chờ",
    ACCEPTED: "Đã chấp nhận",
    REJECTED: "Đã từ chối",
    READY: "Sẵn sàng",
    SHIPPING: "Đang giao hàng",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    PAID: "Đã thanh toán",
  };

  const getStatusDisplay = (status) => statusMap[status] || status;

  return (
    <div className="absolute right-0 top-10 w-80 md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[500px] flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-bold text-lg">Thông báo</h3>
        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm text-tertiary hover:text-primary transition-colors"
          >
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500">Đang tải...</div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            Không có thông báo mới
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notif.isRead ? "bg-blue-50" : ""
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <div
                      className={`font-semibold text-sm mb-1 ${
                        !notif.isRead ? "font-bold" : ""
                      }`}
                    >
                      {notif.title}
                    </div>
                    <div className="text-xs text-gray-600 line-clamp-2">
                      {notif.message}
                    </div>
                    {notif.order && (
                      <div className="text-xs text-tertiary mt-1">
                        Mã đơn: {notif.order.orderCode} - {getStatusDisplay(notif.order.status)}
                        {notif.order.tableNumber && ` - Bàn ${notif.order.tableNumber}`}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {formatTime(notif.createdAt)}
                    </div>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-gray-200 text-center">
        <NavLink
          to="/notifications"
          onClick={onClose}
          className="text-sm text-tertiary hover:text-primary transition-colors font-medium"
        >
          Xem tất cả
        </NavLink>
      </div>
    </div>
  );
}

export default NotificationDropdown;

