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

// Test function for debugging (can be called from browser console)
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
  const [filter, setFilter] = useState("all"); // "all" or "unread"
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useDocumentTitle("Notifications");

  const loadAllNotifications = async (abortController) => {
    try {
      setLoading(true);
      console.log("[NotificationPage] Loading all notifications...");
      
      // DO NOT pass page and limit to get ALL notifications
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
      
      // Display error message to user with more details
      if (error.response?.status === 401) {
        console.error("[NotificationPage] Unauthorized - Token may be expired");
        toast.error("Login session has expired. Please log in again.");
      } else if (error.response?.status === 403) {
        console.error("[NotificationPage] Forbidden - No permission");
        toast.error("You do not have permission to access notifications.");
      } else if (error.response?.status === 404) {
        console.error("[NotificationPage] Not found - API endpoint may not exist");
        toast.error("API not found. Please check the configuration.");
      } else if (error.response?.status >= 500) {
        console.error("[NotificationPage] Server error");
        const serverMessage = error.response?.data?.message || error.response?.data?.error || "";
        toast.error(`Server error: ${serverMessage || "Please try again later."}`);
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || error.message?.includes('Network')) {
        console.error("[NotificationPage] Network error");
        toast.error("Cannot connect to server. Check network connection.");
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error("[NotificationPage] Request timeout");
        toast.error("Request timeout. Please try again.");
      } else if (error.response?.status === 400) {
        const badRequestMessage = error.response?.data?.message || error.response?.data?.error || "";
        console.error("[NotificationPage] Bad request:", badRequestMessage);
        toast.error(`Invalid request: ${badRequestMessage || "Please check again."}`);
      } else {
        // Generic error - show more details in console, less in toast
        // Ignore abort errors (they're expected when component unmounts)
        if (error.message === 'canceled' || error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
          console.log("[NotificationPage] Request was canceled (likely component unmounted)");
          return; // Don't show error toast for canceled requests
        }
        const errorMessage = error.response?.data?.message || error.message || "Unknown error";
        console.error("[NotificationPage] Generic error:", errorMessage);
        toast.error(`Cannot load notifications: ${errorMessage}`);
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
  } catch (error) {
    console.error("Failed to mark as read:", error);
  } finally {
    // Luôn reload lại danh sách để đồng bộ trạng thái
    const controller = new AbortController();
    loadAllNotifications(controller);
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
        toast.error("Cannot mark all as read. Please try again.");
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
      toast.success("Notification deleted");
      // Reload without abort controller (fresh load)
      const controller = new AbortController();
      loadAllNotifications(controller);
    } catch (error) {
      console.error("Failed to delete notification:", error);
      if (error.message !== 'canceled' && error.name !== 'AbortError') {
        toast.error("Cannot delete notification. Please try again.");
      }
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
    } else if (notification.order?.orderId) {
      // Fallback if no redirectUrl
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

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  // Filter notifications based on selected filter
  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  // Categorize notifications by time
  const categorizeNotifications = (notifs) => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const newNotifications = [];
    const todayNotifications = [];
    const olderNotifications = [];

    notifs.forEach((notif) => {
      const notifDate = new Date(notif.createdAt);
      
      if (notifDate >= oneHourAgo) {
        newNotifications.push(notif);
      } else if (notifDate >= todayStart) {
        todayNotifications.push(notif);
      } else {
        olderNotifications.push(notif);
      }
    });

    return {
      new: newNotifications,
      today: todayNotifications,
      older: olderNotifications,
    };
  };

  const categorized = useMemo(() => {
    return categorizeNotifications(filteredNotifications);
  }, [filteredNotifications]);

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
    <>
      <Header />
      <main className="global-px py-10 min-h-[80vh] bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-tertiary to-primary rounded-xl flex items-center justify-center shadow-md">
                  <svg
                    width="24"
                    height="24"
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
                <div>
                  <h1 className="text-3xl font-bold text-tertiary">Notifications</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {notifications.filter((n) => !n.isRead).length} Unread Notifications
                  </p>
                </div>
              </div>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800"
                  title="Options"
                >
                  <svg
                    width="24"
                    height="24"
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
                  <div className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border border-gray-200 z-10 min-w-[200px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {notifications.some((n) => !n.isRead) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAllAsRead();
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
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
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Mark all as read
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  filter === "all"
                    ? "bg-tertiary text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  filter === "unread"
                    ? "bg-tertiary text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-tertiary border-t-transparent mb-4"></div>
              <p className="text-gray-600 font-medium">Loading Notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  width="48"
                  height="48"
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
              <p className="text-xl font-semibold text-gray-700 mb-2">
                {filter === "unread" ? "No unread notifications" : "No notifications"}
              </p>
              <p className="text-sm text-gray-500">You will receive notifications when there is an order update.</p>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {/* New Section */}
                {categorized.new.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-1.5 h-1.5 bg-tertiary rounded-full animate-pulse"></div>
                        <h2 className="text-lg font-bold text-gray-800">New</h2>
                        <span className="px-2 py-0.5 bg-tertiary/10 text-tertiary text-xs font-semibold rounded-full">
                          {categorized.new.length}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {categorized.new.map((notif) => (
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
                  </div>
                )}

                {/* Today Section */}
                {categorized.today.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <h2 className="text-lg font-bold text-gray-800">Today</h2>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          {categorized.today.length}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {categorized.today.map((notif) => (
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
                  </div>
                )}

                {/* Earlier Section */}
                {categorized.older.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                        <h2 className="text-lg font-bold text-gray-800">Earlier</h2>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                          {categorized.older.length}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {categorized.older.map((notif) => (
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
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      
      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={closeDeleteModal} className="flex flex-col gap-y-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center shadow-lg">
              <svg
                width="28"
                height="28"
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
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Delete Notification</h3>
              <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
            </div>
          </div>
          
          <p className="text-gray-600 leading-relaxed">
            Are you sure you want to delete this notification? The notification will be deleted permanently and cannot be restored.
          </p>
          
          {notificationToDelete && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-tertiary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-tertiary"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 mb-1.5">
                    {notificationToDelete.title}
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {notificationToDelete.message}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 justify-end mt-2 pt-2">
            <button
              onClick={closeDeleteModal}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 hover:shadow-md"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Delete Notification
            </button>
          </div>
        </div>
      </Modal>
      
      <Footer />
    </>
  );
}

// NotificationCard Component with menu button (3 dots) to delete
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
    <div
      className={`bg-white rounded-xl shadow-md border transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden group ${
        !notification.isRead 
          ? "border-l-4 border-l-tertiary bg-gradient-to-r from-tertiary/5 to-white" 
          : "border-gray-200"
      }`}
    >
      {!notification.isRead && (
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-tertiary to-primary"></div>
      )}
      <div className="p-5">
        <div className="flex justify-between items-start gap-4">
          <div
            className="flex-1 cursor-pointer"
            onClick={onClick}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                !notification.isRead 
                  ? "bg-gradient-to-br from-tertiary to-primary text-white shadow-md" 
                  : "bg-gray-100 text-gray-600"
              }`}>
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
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3
                    className={`text-lg ${
                      !notification.isRead ? "font-bold text-gray-900" : "font-semibold text-gray-800"
                    }`}
                  >
                    {notification.title}
                  </h3>
                  {!notification.isRead && (
                    <div className="w-2.5 h-2.5 bg-tertiary rounded-full flex-shrink-0 mt-2 animate-pulse"></div>
                  )}
                </div>
                
                <p className="text-gray-700 mb-3 leading-relaxed">{notification.message}</p>
                
                {notification.order && (
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-tertiary/10 text-tertiary rounded-lg text-sm font-medium">
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
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span>Order Code: {notification.order.orderCode}</span>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(notification.order.status)}`}>
                      {getStatusDisplay(notification.order.status)}
                    </span>
                    {notification.order.tableNumber && (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
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
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <line x1="9" y1="3" x2="9" y2="21" />
                          <line x1="3" y1="9" x2="21" y2="9" />
                        </svg>
                        Table {notification.order.tableNumber}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
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
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatTime(notification.createdAt)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              title="Options"
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
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-200 z-10 min-w-[140px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
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
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete Notification
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationPage;

