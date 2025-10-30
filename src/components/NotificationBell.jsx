import React, { useEffect, useRef, useState } from "react";
import {
  getUnreadCount,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../utils/dataProvider/notifications";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const esRef = useRef(null);

  // lần đầu: lấy số unread + 20 item đầu
  useEffect(() => {
    (async () => {
      setCount(await getUnreadCount());
      const page = await getNotifications(0, 20);
      setItems(page.content || []);
    })();
  }, []);

  // SSE realtime: nhận bản tin mới → tăng count, prepend vào list
  useEffect(() => {
    const es = new EventSource("/api/notifications/stream", { withCredentials: true });
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        setCount((c) => c + 1);
        setItems((arr) => [
          {
            id: data.targetId, // id trong notification_targets
            notification: {
              title: data.title,
              body: data.body,
              createdAt: data.createdAt,
              type: data.type,
              data: data.data,
            },
            readAt: null,
          },
          ...arr,
        ]);
      } catch {}
    };
    es.onerror = () => es.close();
    esRef.current = es;
    return () => es.close();
  }, []);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      const page = await getNotifications(0, 20);
      setItems(page.content || []);
      setCount(await getUnreadCount());
    }
  };

  const onMarkAll = async () => {
    await markAllNotificationsRead();
    setCount(0);
    setItems((arr) => arr.map((x) => ({ ...x, readAt: new Date().toISOString() })));
  };

  const onItemClick = async (it) => {
    if (!it.readAt) {
      await markNotificationRead(it.id);
      setCount((c) => Math.max(0, c - 1));
      setItems((arr) =>
        arr.map((x) => (x.id === it.id ? { ...x, readAt: new Date().toISOString() } : x))
      );
    }
    // TODO: nếu có orderId: điều hướng theo it.notification?.data?.orderId
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={toggleOpen} style={{ position: "relative", padding: "8px 12px" }}>
        Notifications
        <span
          style={{
            marginLeft: 8,
            minWidth: 24,
            padding: "2px 6px",
            borderRadius: 12,
            background: "#d33",
            color: "#fff",
            fontWeight: 600,
            display: "inline-block",
            textAlign: "center",
          }}
        >
          {String(count)} {/* luôn là số thật */}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            marginTop: 8,
            width: 360,
            maxHeight: 480,
            overflow: "auto",
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fff",
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: 12,
              borderBottom: "1px solid #eee",
            }}
          >
            <b>Notifications</b>
            <button onClick={onMarkAll}>Mark all as read</button>
          </div>

          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {items.map((it) => (
              <li
                key={it.id}
                onClick={() => onItemClick(it)}
                style={{
                  padding: 12,
                  background: it.readAt ? "#fff" : "#f6f9ff",
                  borderBottom: "1px solid #f0f0f0",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600 }}>{it.notification?.title}</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>{it.notification?.body}</div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                  {new Date(it.notification?.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <li style={{ padding: 16, textAlign: "center" }}>No notifications</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
