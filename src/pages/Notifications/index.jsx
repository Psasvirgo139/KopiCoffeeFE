import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../../utils/dataProvider/notifications";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Modal from "../../components/Modal";
import useDocumentTitle from "../../utils/documentTitle";

// Test function để debug (có thể gọi từ browser console)
window.testNotifications = async function() {
  try {
    const token = localStorage.getItem('kopi_token');
    console.log("Token:", token ? "Found" : "Not found");
    
    const response = await getNotifications(undefined);
    console.log("✅ API Response:", response.data);
    console.log("✅ Notifications count:", response.data?.data?.length || 0);
    console.log("✅ Full response:", response);
    return response.data;
  } catch (error) {
    console.error("❌ API Error:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return null;
  }
};

function NotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const navigate = useNavigate();

  useDocumentTitle("Thông báo");

  const loadAllNotifications = async (abortController) => {
    try {
      setLoading(true);
      console.log("[NotificationPage] Loading all notifications...");
      
      // KHÔNG truyền page và limit để lấy TẤT CẢ thông báo
      const response = await getNotifications(undefined, abortController);
      
      console.log("[NotificationPage] API Response:", {
        status: response.status,
        data: response.data,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        notificationsCount: response.data?.data?.length || (Array.isArray(response.data) ? response.data.length : 0),
        hasMeta: !!response.data?.meta
      });
      
      // Handle multiple response formats:
      // 1. { data: [...], meta: {...} } - Standard format
      // 2. [...] - Direct array
      // 3. { notifications: [...] } - Alternative format
      let notificationsData = null;
      
      if (Array.isArray(response.data)) {
        // Direct array response
        notificationsData = response.data;
        console.log("[NotificationPage] Response is direct array");
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        // Standard format with data field
        notificationsData = response.data.data;
        console.log("[NotificationPage] Response has data.data field");
      } else if (response.data?.notifications && Array.isArray(response.data.notifications)) {
        // Alternative format
        notificationsData = response.data.notifications;
        console.log("[NotificationPage] Response has data.notifications field");
      } else {
        console.warn("[NotificationPage] Unknown response format:", response.data);
        notificationsData = [];
      }
      
      if (notificationsData && Array.isArray(notificationsData)) {
        console.log(`[NotificationPage] Loaded ${notificationsData.length} notifications`);
        setNotifications(notificationsData);
      } else {
        console.error("[NotificationPage] notificationsData is not an array:", notificationsData);
        setNotifications([]);
      }
    } catch (error) {
      const errorDetails = {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method
      };
      
      console.error("[NotificationPage] Failed to load notifications:", errorDetails);
      
      // Hiển thị thông báo lỗi cho user với thông tin chi tiết hơn
      if (error.response?.status === 401) {
        console.error("[NotificationPage] Unauthorized - Token may be expired");
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      } else if (error.response?.status === 403) {
        console.error("[NotificationPage] Forbidden - No permission");
        toast.error("Bạn không có quyền truy cập thông báo.");
      } else if (error.response?.status === 404) {
        console.error("[NotificationPage] Not found - API endpoint may not exist");
        toast.error("API không tìm thấy. Vui lòng kiểm tra lại cấu hình.");
      } else if (error.response?.status >= 500) {
        console.error("[NotificationPage] Server error");
        const serverMessage = error.response?.data?.message || error.response?.data?.error || "";
        toast.error(`Lỗi server: ${serverMessage || "Vui lòng thử lại sau."}`);
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || error.message?.includes('Network')) {
        console.error("[NotificationPage] Network error");
        toast.error("Không thể kết nối đến server. Kiểm tra kết nối mạng.");
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error("[NotificationPage] Request timeout");
        toast.error("Request timeout. Vui lòng thử lại.");
      } else if (error.response?.status === 400) {
        const badRequestMessage = error.response?.data?.message || error.response?.data?.error || "";
        console.error("[NotificationPage] Bad request:", badRequestMessage);
        toast.error(`Yêu cầu không hợp lệ: ${badRequestMessage || "Vui lòng kiểm tra lại."}`);
      } else {
        // Generic error - show more details in console, less in toast
        // Ignore abort errors (they're expected when component unmounts)
        if (error.message === 'canceled' || error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
          console.log("[NotificationPage] Request was canceled (likely component unmounted)");
          return; // Don't show error toast for canceled requests
        }
        const errorMessage = error.response?.data?.message || error.message || "Lỗi không xác định";
        console.error("[NotificationPage] Generic error:", errorMessage);
        toast.error(`Không thể tải thông báo: ${errorMessage}`);
      }
      
      setNotifications([]);
    } finally {
      // Only update loading state if request wasn't aborted
      if (!abortController?.signal?.aborted) {
        setLoading(false);
        console.log("[NotificationPage] Loading completed");
      }
    }
  };

  useEffect(() => {
    // Create new AbortController for this load
    const abortController = new AbortController();
    let isMounted = true;
    
    loadAllNotifications(abortController).then(() => {
      if (isMounted) {
        // Only update state if component is still mounted
      }
    });
    
    // Cleanup: abort request if component unmounts
    return () => {
      isMounted = false;
      console.log("[NotificationPage] Component unmounting, aborting request");
      abortController.abort();
    };
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      // Reload without abort controller (fresh load)
      const controller = new AbortController();
      loadAllNotifications(controller);
    } catch (error) {
      console.error("Failed to mark as read:", error);
      if (error.message !== 'canceled' && error.name !== 'AbortError') {
        toast.error("Không thể đánh dấu đã đọc. Vui lòng thử lại.");
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      // Reload without abort controller (fresh load)
      const controller = new AbortController();
      loadAllNotifications(controller);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      if (error.message !== 'canceled' && error.name !== 'AbortError') {
        toast.error("Không thể đánh dấu tất cả đã đọc. Vui lòng thử lại.");
      }
    }
  };

  const openDeleteModal = (notification) => {
    setNotificationToDelete(notification);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setNotificationToDelete(null);
  };

  const handleDelete = async () => {
    if (!notificationToDelete) return;
    
    try {
      await deleteNotification(notificationToDelete.id);
      closeDeleteModal();
      toast.success("Đã xóa thông báo");
      // Reload without abort controller (fresh load)
      const controller = new AbortController();
      loadAllNotifications(controller);
    } catch (error) {
      console.error("Failed to delete notification:", error);
      if (error.message !== 'canceled' && error.name !== 'AbortError') {
        toast.error("Không thể xóa thông báo. Vui lòng thử lại.");
      }
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
    } else if (notification.order?.orderId) {
      // Fallback nếu không có redirectUrl
      navigate(`/history/${notification.order.orderId}`);
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
      hour: "2-digit",
      minute: "2-digit",
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
    <>
      <Header />
      <main className="global-px py-10 min-h-[80vh]">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-tertiary">Thông báo</h1>
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 bg-tertiary text-white rounded-lg hover:bg-primary transition-colors"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Đang tải thông báo...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-xl mb-2">Không có thông báo</p>
              <p className="text-sm">Bạn sẽ nhận được thông báo khi có cập nhật đơn hàng</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {notifications.map((notif) => (
                  <NotificationCard
                    key={notif.id}
                    notification={notif}
                    onMarkAsRead={() => handleMarkAsRead(notif.id)}
                    onDelete={() => openDeleteModal(notif)}
                    onClick={() => handleNotificationClick(notif)}
                    getStatusDisplay={getStatusDisplay}
                    formatTime={formatTime}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      
      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={closeDeleteModal} className="flex flex-col gap-y-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-600"
              >
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Xóa thông báo</h3>
          </div>
          
          <p className="text-gray-600">
            Bạn có chắc chắn muốn xóa thông báo này? Hành động này không thể hoàn tác.
          </p>
          
          {notificationToDelete && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="font-semibold text-sm text-gray-700 mb-1">
                {notificationToDelete.title}
              </p>
              <p className="text-xs text-gray-500 line-clamp-2">
                {notificationToDelete.message}
              </p>
            </div>
          )}
          
          <div className="flex gap-3 justify-end mt-2">
            <button
              onClick={closeDeleteModal}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Xóa
            </button>
          </div>
        </div>
      </Modal>
      
      <Footer />
    </>
  );
}

// NotificationCard Component với nút menu (3 chấm) để xóa
function NotificationCard({ notification, onMarkAsRead, onDelete, onClick, getStatusDisplay, formatTime }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div
      className={`bg-white rounded-lg shadow-md border p-4 hover:shadow-lg transition-shadow relative ${
        !notification.isRead ? "border-l-4 border-l-blue-500 bg-blue-50" : ""
      }`}
    >
      <div className="flex justify-between items-start gap-4">
        <div
          className="flex-1 cursor-pointer"
          onClick={onClick}
        >
          <div className="flex items-start gap-3">
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
            )}
            <div className="flex-1">
              <h3
                className={`text-lg mb-2 ${
                  !notification.isRead ? "font-bold" : "font-semibold"
                }`}
              >
                {notification.title}
              </h3>
              <p className="text-gray-700 mb-2">{notification.message}</p>
              {notification.order && (
                <div className="text-sm text-tertiary mb-2">
                  <span className="font-medium">Mã đơn:</span> {notification.order.orderCode} -{" "}
                  {getStatusDisplay(notification.order.status)}
                  {notification.order.tableNumber && ` - Bàn ${notification.order.tableNumber}`}
                </div>
              )}
              <div className="text-xs text-gray-400">
                {formatTime(notification.createdAt)}
              </div>
            </div>
          </div>
        </div>
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            title="Tùy chọn"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 z-10 min-w-[120px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Xóa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationPage;

