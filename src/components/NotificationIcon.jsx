import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { getUnreadCount } from "../utils/dataProvider/notifications";
import NotificationDropdown from "./NotificationDropdown";

function NotificationIcon() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const userInfo = useSelector((state) => state.userInfo);
  const intervalRef = useRef(null);
  const disabledRef = useRef(false);

  // Load unread count
  const loadUnreadCount = async () => {
    if (!userInfo.token || disabledRef.current) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await getUnreadCount();
      setUnreadCount(response.data?.unreadCount || 0);
    } catch (error) {
      // Tắt polling nếu backend chưa hỗ trợ để tránh spam console
      disabledRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!userInfo.token) return;

    // Load immediately
    loadUnreadCount();

    // Polling every 30 seconds
    if (!disabledRef.current) {
    intervalRef.current = setInterval(() => {
      loadUnreadCount();
    }, 30000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userInfo.token]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (!userInfo.token) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="relative focus:outline-none"
        aria-label="Notifications"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-gray-700"
        >
          <path
            d="M12 2C8.686 2 6 4.686 6 8V12L4 16H20L18 12V8C18 4.686 15.314 2 12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 20H15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {isDropdownOpen && (
        <NotificationDropdown
          onClose={() => setIsDropdownOpen(false)}
          onUnreadCountChange={setUnreadCount}
        />
      )}
    </div>
  );
}

export default NotificationIcon;

