import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../store/AuthContext.jsx";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { readingBenefits } from "../../utils/premium.js";
import "../../assets/premium.css";

export default function MySubscriptionPage() {
  const { user, premium, premiumLoading, refreshPremium } = useAuth();
  const { t, language } = usePreferences();

  useEffect(() => {
    refreshPremium();
  }, []);

  const subscriptions = premium?.subscriptions || [];
  const activeSub = subscriptions.find(s => s.current) || subscriptions.find(s => s.status === "ACTIVE" && new Date(s.endAt) > new Date());
  const pendingPackageId = premium?.pendingPackageId;

  const formatDate = val => {
    if (!val) return "—";
    return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(val));
  };

  const daysLeft = activeSub
    ? Math.max(0, Math.ceil((new Date(activeSub.endAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <main className="page-content premium-page">
      <header className="premium-checkout-heading">
        <span className="premium-kicker">THE PLUSE PREMIUM</span>
        <h1>{t("Gói Premium của tôi", "My Subscription")}</h1>
        <p>
          {t(
            "Quản lý thông tin gói, thời hạn sử dụng và quyền lợi Premium của tài khoản.",
            "Manage your plan details, access duration and active member benefits."
          )}
        </p>
      </header>

      {/* Navigation tabs */}
      <nav className="premium-nav-tabs" aria-label="Subscription Navigation">
        <Link to="/premium/my-subscription" className="premium-nav-tab is-active">
          ✦ {t("Gói của tôi", "My Subscription")}
        </Link>
        <Link to="/premium/transactions" className="premium-nav-tab">
          🧾 {t("Lịch sử giao dịch & Biên lai", "Transactions & Receipts")}
        </Link>
        <Link to="/premium/payment-result" className="premium-nav-tab">
          ◷ {t("Yêu cầu chờ duyệt", "Pending Requests")} {pendingPackageId ? "●" : ""}
        </Link>
        <Link to="/premium/packages" className="premium-nav-tab">
          🛒 {t("Danh mục gói", "Plan Catalog")}
        </Link>
      </nav>

      {pendingPackageId ? (
        <section className="premium-panel premium-preview">
          <div className="premium-request-heading">
            <div>
              <span className="premium-kicker">{t("ĐANG CHỜ DUYỆT", "UNDER REVIEW")}</span>
              <h2>{t("Bạn có yêu cầu đăng ký đang chờ admin xác nhận", "You have a pending request awaiting verification")}</h2>
            </div>
            <Link to="/premium/payment-result" className="button-link">
              {t("Xem mã QR & Chuyển khoản", "View QR & Transfer")} →
            </Link>
          </div>
        </section>
      ) : null}

      {premiumLoading ? (
        <p role="status">{t("Đang tải thông tin gói…", "Loading subscription…")}</p>
      ) : activeSub ? (
        <div className="premium-detail-grid">
          <div>
            <section className="premium-panel">
              <div className="premium-request-heading">
                <div>
                  <span className="premium-kicker">THE PLUSE MEMBER</span>
                  <h2>{activeSub.packageName}</h2>
                  <p className="premium-muted">
                    {t("Chủ tài khoản", "Account")}: <strong>{user?.fullName || user?.username}</strong> ({user?.email})
                  </p>
                </div>
                <span className="premium-request-status is-approved">
                  ✓ {t("Đang hoạt động", "Active")}
                </span>
              </div>

              <dl className="premium-order-lines">
                <div>
                  <dt>{t("Ngày kích hoạt", "Started at")}</dt>
                  <dd>{formatDate(activeSub.startAt)}</dd>
                </div>
                <div>
                  <dt>{t("Ngày hết hạn", "Expires at")}</dt>
                  <dd><strong>{formatDate(activeSub.endAt)}</strong></dd>
                </div>
                <div>
                  <dt>{t("Thời hạn còn lại", "Days remaining")}</dt>
                  <dd className="highlight-text">
                    <strong>{daysLeft} {t("ngày", "days")}</strong>
                  </dd>
                </div>
                <div>
                  <dt>{t("Tự động gia hạn", "Auto-renewal")}</dt>
                  <dd>{t("Không bật (Thanh toán từng kỳ)", "Disabled (Manual per cycle)")}</dd>
                </div>
              </dl>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "24px" }}>
                <Link to={`/premium/checkout/${activeSub.packageId}`} className="button-link">
                  {t("Gia hạn thêm gói này", "Extend this plan")} →
                </Link>
                <Link to="/premium/transactions" className="secondary-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", padding: "12px 18px", borderRadius: "12px" }}>
                  🧾 {t("Xem lịch sử giao dịch", "View transactions")}
                </Link>
              </div>
            </section>

            <section className="premium-panel">
              <h2>{t("Quyền lợi Premium của bạn", "Your Active Benefits")}</h2>
              <ul className="premium-benefit-list">
                {readingBenefits(language).map(b => (
                  <li key={b}>
                    <span>✓</span>
                    <div>
                      <strong>{b}</strong>
                      <p>{t("Đang có hiệu lực trên toàn bộ các bài viết The Pluse.", "Currently active on all The Pluse articles.")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="premium-purchase-card">
            <span className="premium-kicker">{t("THAO TÁC NHANH", "QUICK ACTIONS")}</span>
            <h2>{t("Quản lý tài khoản", "Account Actions")}</h2>
            <p>
              {t(
                "Bạn có thể gia hạn bất kỳ lúc nào. Thời hạn mới sẽ tự động nối tiếp sau ngày hết hạn hiện tại mà không bị trừ bớt ngày.",
                "You can renew anytime. Your new period automatically begins after the current expiry date without losing any days."
              )}
            </p>
            <Link to={`/premium/checkout/${activeSub.packageId}`} className="button-link">
              {t("Gia hạn thêm thời hạn", "Renew & Extend")}
            </Link>
            <Link to="/premium/packages" className="premium-change-plan">
              {t("Xem các gói khác", "Explore other plans")}
            </Link>
            <hr />
            <Link to="/premium/transactions" style={{ display: "block", textAlign: "center", textDecoration: "none", fontWeight: "600", color: "var(--premium-green)" }}>
              🧾 {t("Xem lịch sử hóa đơn & biên lai", "Invoices & receipts history")} →
            </Link>
          </aside>
        </div>
      ) : (
        <section className="premium-empty">
          <span className="premium-kicker">CHƯA CÓ GÓI PREMIUM</span>
          <h2>{t("Tài khoản chưa có gói Premium đang hoạt động", "No active Premium subscription found")}</h2>
          <p style={{ maxWidth: "560px", margin: "14px auto 24px" }}>
            {t(
              "Đăng ký The Pluse Premium để đọc trọn vẹn các bài viết phân tích chuyên sâu, loại bỏ hoàn toàn quảng cáo và trải nghiệm chế độ đọc tập trung.",
              "Subscribe to The Pluse Premium to unlock in-depth coverage, remove newsroom banners, and use focus mode."
            )}
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/premium/packages" className="button-link">
              {t("Xem các gói Premium", "View Premium plans")} →
            </Link>
            <Link to="/premium/transactions" className="secondary-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", padding: "12px 18px", borderRadius: "12px" }}>
              🧾 {t("Xem lịch sử giao dịch cũ", "Past transactions")}
            </Link>
          </div>
        </section>
      )}

      {subscriptions.length > 1 ? (
        <section className="premium-panel" style={{ marginTop: "32px" }}>
          <h2>{t("Tất cả thời hạn đã cấp", "All Subscription Periods")}</h2>
          <div className="premium-table-wrap">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>{t("Mã", "ID")}</th>
                  <th>{t("Tên gói", "Plan")}</th>
                  <th>{t("Bắt đầu", "Start")}</th>
                  <th>{t("Hết hạn", "End")}</th>
                  <th>{t("Trạng thái", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(s => (
                  <tr key={s.id}>
                    <td>#{s.id}</td>
                    <td><strong>{s.packageName}</strong></td>
                    <td>{formatDate(s.startAt)}</td>
                    <td>{formatDate(s.endAt)}</td>
                    <td>
                      <span className={`premium-request-status ${s.current ? "is-approved" : ""}`}>
                        {s.current ? t("Đang dùng", "Current") : s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
