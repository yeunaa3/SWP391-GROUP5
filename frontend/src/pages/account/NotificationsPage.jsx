import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../store/AuthContext.jsx";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { apiRequest } from "../../services/apiClient.js";
import {
  filterNotifications,
  notificationCategory,
  notificationDestination,
} from "../../utils/notifications.js";
import "../../assets/notifications.css";

/**
 * Metadata thông tin hiển thị của từng nhóm danh mục thông báo
 */
const categoryMeta = {
  premium: { vi: "Gói Premium", en: "Premium", icon: "✦", colorClass: "cat-premium" },
  partnership: { vi: "Doanh nghiệp", en: "Partnership", icon: "▣", colorClass: "cat-partnership" },
  payment: { vi: "Thanh toán & Hóa đơn", en: "Payment & Invoice", icon: "↔", colorClass: "cat-payment" },
  campaign: { vi: "Chiến dịch quảng cáo", en: "Campaign", icon: "↗", colorClass: "cat-campaign" },
  account: { vi: "Tài khoản & Bảo mật", en: "Account & Security", icon: "◇", colorClass: "cat-account" },
  system: { vi: "Hệ thống The Pluse", en: "System", icon: "◉", colorClass: "cat-system" },
};

/**
 * ============================================================================
 * [ACC-02] TRANG TRUNG TÂM THÔNG BÁO (NOTIFICATION CENTER)
 * - Tinh gọn, trực quan, loại bỏ các nút điều hướng thừa thãi.
 * - Hiển thị danh sách thông báo dạng thẻ (Feed Cards) dễ đọc trực tiếp nội dung.
 * - Hỗ trợ lọc theo trạng thái (Tất cả / Chưa đọc / Đã đọc) và tìm kiếm từ khóa.
 * - Thao tác 1-chạm: Đánh dấu đã đọc/chưa đọc, Mở trang liên quan, Đánh dấu tất cả.
 * ============================================================================
 */
export default function NotificationsPage() {
  const { user } = useAuth();
  const accountRef = useRef(user?.id);
  accountRef.current = user?.id;

  const { t, language } = usePreferences();
  const [inbox, setInbox] = useState({ items: [], unreadCount: 0, nextCursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState("all"); // "all" | "unread" | "read"
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [feedback, setFeedback] = useState("");

  const roles = user?.roles || [];

  // Tải danh sách thông báo của tài khoản hiện tại từ backend
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setBusy(false);
    setError("");
    setFeedback("");

    apiRequest("/api/notifications")
      .then((data) => {
        if (alive) {
          setInbox(data || { items: [], unreadCount: 0, nextCursor: null });
        }
      })
      .catch(() => {
        if (alive) {
          setError(
            t(
              "Không thể tải thông báo vào lúc này. Vui lòng thử lại sau.",
              "Unable to load notifications at this time. Please retry."
            )
          );
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [user?.id, attempt, language]);

  // Lọc thông báo dựa trên tab và thanh tìm kiếm
  const filtered = filterNotifications(inbox.items, { state, category: "all", query });

  // Định dạng ngày giờ hiển thị
  const formatDate = (val) => {
    if (!val) return "—";
    return new Date(val).toLocaleString(language === "vi" ? "vi-VN" : "en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Đánh dấu 1 thông báo là đã đọc / chưa đọc
  async function handleToggleRead(item, read) {
    const owner = user?.id;
    setBusy(true);
    setFeedback("");
    try {
      await apiRequest(`/api/notifications/${item.id}/read`, {
        method: "PATCH",
        body: JSON.stringify({ read }),
      });

      if (accountRef.current !== owner) return;

      setInbox((prev) => ({
        ...prev,
        items: prev.items.map((n) => (n.id === item.id ? { ...n, read } : n)),
        unreadCount: Math.max(
          0,
          prev.unreadCount + (item.read === read ? 0 : read ? -1 : 1)
        ),
      }));

      // Kích hoạt event thông báo để chuông NotificationBell trên topbar cập nhật ngay
      window.dispatchEvent(new Event("notifications-updated"));
      setFeedback(
        read
          ? t("Đã đánh dấu là đã đọc.", "Marked as read.")
          : t("Đã đánh dấu là chưa đọc.", "Marked as unread.")
      );
    } catch {
      if (accountRef.current === owner) {
        setFeedback(
          t("Chưa lưu được trạng thái. Vui lòng thử lại.", "Failed to update read status. Retry.")
        );
      }
    } finally {
      if (accountRef.current === owner) setBusy(false);
    }
  }

  // Đánh dấu tất cả thông báo là đã đọc
  async function handleMarkAllRead() {
    if (!inbox.unreadCount || busy || loading) return;
    const owner = user?.id;
    setBusy(true);
    setFeedback("");
    try {
      await apiRequest("/api/notifications/read-all", { method: "POST" });
      if (accountRef.current !== owner) return;

      setInbox((prev) => ({
        ...prev,
        unreadCount: 0,
        items: prev.items.map((n) => ({ ...n, read: true })),
      }));

      window.dispatchEvent(new Event("notifications-updated"));
      setFeedback(t("Đã đánh dấu tất cả là đã đọc.", "All notifications marked as read."));
    } catch {
      if (accountRef.current === owner) {
        setFeedback(t("Cập nhật thất bại. Vui lòng thử lại.", "Update failed. Please retry."));
      }
    } finally {
      if (accountRef.current === owner) setBusy(false);
    }
  }

  // Tải thêm thông báo cũ hơn (phân trang theo cursor)
  async function handleLoadMore() {
    if (!inbox.nextCursor || busy) return;
    const owner = user?.id;
    setBusy(true);
    try {
      const next = await apiRequest(`/api/notifications?before=${inbox.nextCursor}`);
      if (accountRef.current !== owner) return;

      setInbox((prev) => ({
        ...next,
        items: [
          ...prev.items,
          ...next.items.filter((n) => !prev.items.some((old) => old.id === n.id)),
        ],
      }));
    } catch {
      if (accountRef.current === owner) {
        setFeedback(
          t("Chưa tải được thông báo cũ hơn.", "Unable to load older notifications.")
        );
      }
    } finally {
      if (accountRef.current === owner) setBusy(false);
    }
  }

  return (
    <main className="page-content notification-page">
      {/* Header trung tâm thông báo tinh gọn */}
      <header className="notification-clean-header">
        <div className="notification-header-info">
          <span className="notification-eyebrow">
            {t("TRUNG TÂM THÔNG BÁO", "NOTIFICATION CENTER")}
          </span>
          <h1>{t("Thông báo của bạn", "Your Notifications")}</h1>
          <p>
            {t(
              "Theo dõi các cập nhật quan trọng về tài khoản, gói đọc và quy trình làm việc.",
              "Stay updated on account activity, subscriptions, and important workflows."
            )}
          </p>
        </div>

        {/* Thao tác nhanh ở góc trên */}
        <div className="notification-header-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={loading || busy}
            onClick={() => setAttempt((a) => a + 1)}
            title={t("Làm mới danh sách", "Refresh list")}
          >
            ↻ {t("Làm mới", "Refresh")}
          </button>
          <button
            type="button"
            className="primary-button notification-mark-all-btn"
            disabled={!inbox.unreadCount || busy || loading}
            onClick={handleMarkAllRead}
          >
            ✓ {t("Đánh dấu tất cả đã đọc", "Mark all read")}
          </button>
        </div>
      </header>

      {/* Thông báo kết quả thao tác (toast/feedback) */}
      {feedback && (
        <div className="notification-feedback-toast" role="status">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback("")}
            aria-label={t("Đóng", "Close")}
          >
            ✕
          </button>
        </div>
      )}

      {/* Thanh lọc & tìm kiếm tối giản */}
      <div className="notification-toolbar">
        {/* Bộ lọc tab: Tất cả / Chưa đọc / Đã đọc */}
        <div className="notification-tabs-clean" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={state === "all"}
            className={state === "all" ? "active" : ""}
            onClick={() => setState("all")}
          >
            {t("Tất cả", "All")}
            <span className="tab-count">{inbox.items.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={state === "unread"}
            className={state === "unread" ? "active" : ""}
            onClick={() => setState("unread")}
          >
            {t("Chưa đọc", "Unread")}
            {inbox.unreadCount > 0 && (
              <span className="tab-count tab-count-unread">{inbox.unreadCount}</span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={state === "read"}
            className={state === "read" ? "active" : ""}
            onClick={() => setState("read")}
          >
            {t("Đã đọc", "Read")}
          </button>
        </div>

        {/* Ô tìm kiếm thông báo nhanh */}
        <div className="notification-search-box">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Tìm kiếm thông báo…", "Search notifications…")}
            aria-label={t("Tìm kiếm thông báo", "Search notifications")}
          />
          {query && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setQuery("")}
              aria-label={t("Xóa tìm kiếm", "Clear search")}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Vùng hiển thị danh sách thông báo */}
      {loading ? (
        <div className="notification-status-card" role="status">
          <div className="notification-spinner" />
          <p>{t("Đang tải thông báo…", "Loading notifications…")}</p>
        </div>
      ) : error ? (
        <div className="notification-status-card is-error" role="alert">
          <h2>{t("Không thể kết nối", "Connection Error")}</h2>
          <p>{error}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setAttempt((a) => a + 1)}
          >
            {t("Thử lại", "Retry")}
          </button>
        </div>
      ) : !filtered.length ? (
        <div className="notification-status-card">
          <span className="empty-icon" aria-hidden="true">✓</span>
          <h2>
            {inbox.items.length
              ? t("Không tìm thấy thông báo phù hợp", "No matching notifications found")
              : t("Hộp thư thông báo của bạn đang trống", "Your notification inbox is empty")}
          </h2>
          <p>
            {inbox.items.length
              ? t("Hãy thử đổi bộ lọc hoặc từ khóa tìm kiếm.", "Try changing the filter or search keyword.")
              : t(
                  "Khi có cập nhật mới về tài khoản, quyền lợi đọc bài hoặc nghiệp vụ, thông báo sẽ xuất hiện tại đây.",
                  "Updates on your account, articles, and workflows will appear here."
                )}
          </p>
          {inbox.items.length > 0 && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setState("all");
                setQuery("");
              }}
            >
              {t("Xem tất cả thông báo", "View all notifications")}
            </button>
          )}
        </div>
      ) : (
        <div className="notification-feed-list">
          {filtered.map((item) => {
            const catKey = notificationCategory(item);
            const cat = categoryMeta[catKey] || categoryMeta.system;
            const destination = notificationDestination(item, roles);

            return (
              <article
                key={item.id}
                className={`notification-card ${!item.read ? "is-unread" : "is-read"}`}
              >
                {/* Header của thẻ thông báo: Danh mục, Trạng thái & Thời gian */}
                <div className="notification-card-header">
                  <div className="notification-card-meta">
                    <span className={`notification-category-badge ${cat.colorClass}`}>
                      <span aria-hidden="true">{cat.icon}</span>{" "}
                      {t(cat.vi, cat.en)}
                    </span>
                    {!item.read && (
                      <span className="unread-indicator-badge">
                        ● {t("Mới", "New")}
                      </span>
                    )}
                    {item.entityId && (
                      <span className="notification-ref-badge">
                        #{item.entityId}
                      </span>
                    )}
                  </div>

                  <time dateTime={item.createdAt} className="notification-card-time">
                    {formatDate(item.createdAt)}
                  </time>
                </div>

                {/* Nội dung thông báo hiển thị đầy đủ, trực tiếp */}
                <h2 className="notification-card-title">{item.title}</h2>
                <p className="notification-card-body">{item.content}</p>

                {/* Thanh hành động trực tiếp ngay trên thẻ */}
                <div className="notification-card-actions">
                  {destination ? (
                    <Link to={destination} className="notification-cta-btn">
                      {t("Mở trang liên quan", "Open related page")} →
                    </Link>
                  ) : <span />}

                  <button
                    type="button"
                    className="notification-toggle-read-btn"
                    disabled={busy}
                    onClick={() => handleToggleRead(item, !item.read)}
                    title={
                      item.read
                        ? t("Đánh dấu chưa đọc", "Mark unread")
                        : t("Đánh dấu đã đọc", "Mark read")
                    }
                  >
                    {item.read
                      ? t("Đánh dấu chưa đọc", "Mark unread")
                      : `✓ ${t("Đánh dấu đã đọc", "Mark read")}`}
                  </button>
                </div>
              </article>
            );
          })}

          {/* Nút tải thêm thông báo cũ hơn */}
          {inbox.nextCursor && !loading && (
            <div className="notification-load-more-wrap">
              <button
                type="button"
                className="secondary-button notification-load-more-btn"
                disabled={busy}
                onClick={handleLoadMore}
              >
                {busy
                  ? t("Đang tải…", "Loading…")
                  : t("Tải thêm thông báo cũ hơn", "Load older notifications")}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
