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
    // Mark as read if unread
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }
    
    // Redirect based on redirectUrl from backend
    if (notification.order?.redirectUrl) {
      navigate(notification.order.redirectUrl);
      onClose();
    } else if (notification.order?.orderId) {
      // Fallback if no redirectUrl
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

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const statusMap = {
    PENDING: "Pending",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    READY: "Ready",
    SHIPPING: "Shipping",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    PAID: "Paid",
  };

  const getStatusDisplay = (status) => statusMap[status] || status;

  const getStatusColor = (status) => {
    const colors = {
      PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      ACCEPTED: "bg-blue-100 text-blue-800 border-blue-200",
      REJECTED: "bg-red-100 text-red-800 border-red-200",
      READY: "bg-green-100 text-green-800 border-green-200",
      SHIPPING: "bg-purple-100 text-purple-800 border-purple-200",
      COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
      CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
      PAID: "bg-teal-100 text-teal-800 border-teal-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="absolute right-0 top-12 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-tertiary to-primary rounded-lg flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <h3 className="font-bold text-lg text-gray-800">Notifications</h3>
          {notifications.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-tertiary text-white text-xs font-semibold rounded-full">
              {notifications.length}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-tertiary hover:text-primary transition-colors font-medium flex items-center gap-1 px-2 py-1 hover:bg-tertiary/10 rounded-lg"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Mark all as read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {loading ? (
          <div className="px-4 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-tertiary border-t-transparent mb-3"></div>
            <p className="text-sm text-gray-500 font-medium">Loading...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No new notifications</p>
            <p className="text-xs text-gray-500">All notifications have been read</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`px-4 py-3.5 hover:bg-gradient-to-r hover:from-tertiary/5 hover:to-transparent cursor-pointer transition-all duration-200 group ${
                  !notif.isRead ? "bg-gradient-to-r from-tertiary/10 to-transparent border-l-4 border-l-tertiary" : ""
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    !notif.isRead 
                      ? "bg-gradient-to-br from-tertiary to-primary text-white shadow-md" 
                      : "bg-gray-100 text-gray-500 group-hover:bg-tertiary/10"
                  }`}>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div
                        className={`font-semibold text-sm leading-tight ${
                          !notif.isRead ? "font-bold text-gray-900" : "text-gray-800"
                        }`}
                      >
                        {notif.title}
                      </div>
                      {!notif.isRead && (
                        <div className="w-2 h-2 bg-tertiary rounded-full flex-shrink-0 mt-1.5 animate-pulse"></div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2">
                      {notif.message}
                    </div>
                    
                    {notif.order && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-tertiary/10 text-tertiary rounded-md text-xs font-medium">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          {notif.order.orderCode}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusColor(notif.order.status)}`}>
                          {getStatusDisplay(notif.order.status)}
                        </span>
                        {notif.order.tableNumber && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <line x1="9" y1="3" x2="9" y2="21" />
                              <line x1="3" y1="9" x2="21" y2="9" />
                            </svg>
                            Table {notif.order.tableNumber}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {formatTime(notif.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <NavLink
          to="/notifications"
          onClick={onClose}
          className="block text-center text-sm text-tertiary hover:text-primary transition-colors font-semibold py-2 px-4 rounded-lg hover:bg-tertiary/10 transition-all duration-200"
        >
          <span className="flex items-center justify-center gap-2">
            View all notifications
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </NavLink>
      </div>
    </div>
  );
}

export default NotificationDropdown;

