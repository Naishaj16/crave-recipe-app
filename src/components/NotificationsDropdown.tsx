import { useEffect, useRef } from "react";
import type { AppNotification } from "../services/profileService";
import { markNotificationRead, markAllNotificationsRead } from "../services/profileService";

interface NotificationsDropdownProps {
  notifications: AppNotification[];
  unreadCount: number;
  onClose: () => void;
  onRefresh: () => void;
  onNavigateToRecipe?: (id: number) => void;
}

export default function NotificationsDropdown({
  notifications,
  unreadCount,
  onClose,
  onRefresh,
  onNavigateToRecipe,
}: NotificationsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  const handleMarkOne = async (id: number, link?: string) => {
    try {
      await markNotificationRead(id);
      onRefresh();
      if (link && link.includes("#recipe-") && onNavigateToRecipe) {
        const recipeId = parseInt(link.replace("/#recipe-", "").replace("#recipe-", ""), 10);
        if (!isNaN(recipeId)) {
          onNavigateToRecipe(recipeId);
          onClose();
        }
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      onRefresh();
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="notifications-dropdown-menu" ref={dropdownRef}>
      <div className="notif-dropdown-header">
        <div>
          <h4>Notifications</h4>
          <span className="notif-count-text">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </span>
        </div>
        {unreadCount > 0 && (
          <button type="button" className="notif-mark-all-btn" onClick={handleMarkAll}>
            Mark all read
          </button>
        )}
      </div>

      <div className="notif-items-container">
        {notifications.length === 0 ? (
          <div className="notif-empty-state">
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-card ${!n.is_read ? "unread" : ""}`}
              onClick={() => handleMarkOne(n.id, n.link)}
            >
              <div className="notif-content-col">
                <div className="notif-title-row">
                  <strong className="notif-title">{n.title}</strong>
                  {!n.is_read && <span className="notif-dot" aria-label="Unread" />}
                </div>
                <p className="notif-message">{n.message}</p>
                <span className="notif-timestamp">{formatDate(n.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
