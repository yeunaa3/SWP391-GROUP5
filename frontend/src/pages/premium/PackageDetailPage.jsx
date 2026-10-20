import { Link } from "react-router-dom";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import usePremiumPlan from "../../hooks/usePremiumPlan.js";
import { money, readingBenefits, projectedExpiry } from "../../utils/premium.js";
import "../../assets/premium.css";
import { useAuth } from "../../store/AuthContext.jsx";
import { ownedPremium } from "../../utils/premiumAccess.js";
import PremiumMembership from "../../components/PremiumMembership.jsx";

/**
 * ============================================================================
 * [BF-01][UC-11] PACKAGE DETAIL & PURCHASE INITIATION PAGE
 * Phụ trách: Cường (Xem chi tiết gói cước Premium, Quyền lợi Đọc sạch không quảng cáo & Khởi tạo thanh toán)
 * ============================================================================
 */
export function PlanState({ loading, error, retry }) {
  const { t } = usePreferences();
  return (
    <main className="page-content premium-page">
      <Link to="/premium/packages">← {t("Danh sách gói", "All plans")}</Link>
      <section className="premium-empty" role={error ? "alert" : "status"}>
        <h1>
          {loading
            ? t("Đang tải thông tin gói…", "Loading plan…")
            : error
            ? t("Không tải được thông tin", "Unable to load plan")
            : t("Gói không còn mở bán", "Plan unavailable")}
        </h1>
        <p>
          {t(
            "Bạn chỉ có thể tiếp tục với gói đang hoạt động trong danh mục.",
            "Only an active catalog plan can be selected."
          )}
        </p>
        {error && <button onClick={retry}>{t("Thử lại", "Retry")}</button>}
      </section>
    </main>
  );
}

export default function PackageDetailPage() {
  const state = usePremiumPlan();
  const { t, language } = usePreferences();
  const { premium, premiumLoading, premiumError } = useAuth();

  if (!state.plan) return <PlanState {...state} />;

  const { plan } = state;
  const owned = ownedPremium(premium?.subscriptions, plan.id);
  const formatDate = (value) =>
    new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-GB", {
      dateStyle: "long",
    }).format(value);

  return (
    <main className="page-content premium-page">
      <Link className="premium-back" to="/premium/packages">
        ← {t("So sánh các gói", "Compare plans")}
      </Link>
      <PremiumMembership />

      <div className="premium-detail-grid">
        <div>
          {/* Header Hero Section */}
          <header className="premium-detail-hero">
            <span className="premium-kicker">THE PLUSE PREMIUM · {plan.code}</span>
            <h1>{plan.name}</h1>
            <p>{plan.description}</p>
            <span className="premium-duration">
              {plan.durationDays} {t("ngày truy cập", "days of access")}
            </span>
          </header>

          {/* [BF-01] Danh sách quyền lợi của gói cước */}
          <section className="premium-panel">
            <span className="premium-kicker">{t("DÀNH CHO BẠN", "YOUR BENEFITS")}</span>
            <h2>{t("Bạn nhận được những gì?", "What is included?")}</h2>
            <ul className="premium-benefit-list">
              {readingBenefits(language).map((value) => (
                <li key={value}>
                  <span>✓</span>
                  <div>
                    <strong>{value}</strong>
                    <p>{t("Quyền lợi được công bố trong danh mục của gói này.", "A benefit listed in this plan's catalog.")}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="premium-facts">
              <article>
                <h3>{t("Đọc bài viết gốc & Tóm tắt AI", "Premium reading")}</h3>
                <p>
                  {t(
                    "Mở khóa toàn bộ nội dung bài viết gốc, xem trọn bộ hình ảnh chất lượng cao và tóm tắt thông minh trên The Pluse. Đọc sạch 100% không quảng cáo.",
                    "Unlock full original article content and smart summaries with 100% ad-free reading on The Pluse."
                  )}
                </p>
              </article>
              <article>
                <h3>{t("Tiện ích đọc báo cao cấp", "Reading tools")}</h3>
                <p>
                  {t(
                    "Đặc quyền đọc tập trung và nghe đọc báo AI bằng giọng nói tiếng Việt tự nhiên. Không bị giới hạn thời gian đọc.",
                    "Exclusive focus mode and AI voice reader in natural Vietnamese. Unlimited reading time."
                  )}
                </p>
              </article>
            </div>
          </section>

          {/* Điều khoản sử dụng và thời hạn */}
          <section className="premium-panel">
            <h2>{t("Thời hạn và điều khoản", "Duration and terms")}</h2>
            <dl className="premium-order-lines">
              <div>
                <dt>{t("Thời hạn sử dụng", "Access duration")}</dt>
                <dd>{plan.durationDays} {t("ngày", "days")}</dd>
              </div>
              <div>
                <dt>{t("Bắt đầu dự kiến nếu kích hoạt hôm nay", "Estimated start if activated today")}</dt>
                <dd>{formatDate(new Date())}</dd>
              </div>
              <div>
                <dt>{t("Hết hạn dự kiến", "Estimated expiry")}</dt>
                <dd>{formatDate(projectedExpiry(new Date(), plan.durationDays))}</dd>
              </div>
              <div>
                <dt>{t("Tự động gia hạn", "Automatic renewal")}</dt>
                <dd>{t("Không bật", "Not enabled")}</dd>
              </div>
            </dl>
            <p className="premium-muted">
              {t(
                "Đây là lịch dự kiến cho lần mua mới. Ngày thực tế được xác nhận sau khi chuyển khoản được admin duyệt. Nếu còn hạn, thời gian được cấp thêm sẽ nối tiếp hạn hiện tại.",
                "Actual dates require verified payment. Additional access starts after an existing active period ends."
              )}
            </p>
            <details>
              <summary>{t("Hoàn tiền và đổi gói", "Refunds and plan changes")}</summary>
              <p>
                {t(
                  "Vui lòng liên hệ quản trị viên trước khi chuyển khoản; hệ thống không tự động trừ tiền định kỳ.",
                  "Contact the administrator before transferring money. No recurring charges are made."
                )}
              </p>
            </details>
          </section>
        </div>

        {/* [BF-01][UC-11] Thẻ mua gói & Nút hành động thanh toán */}
        <aside className="premium-purchase-card">
          <span className="premium-kicker">{t("GÓI BẠN ĐANG XEM", "YOUR SELECTED PLAN")}</span>
          <h2>{plan.name}</h2>
          <strong className="premium-price">{money(plan.price, plan.currency)}</strong>
          <p>{plan.durationDays} {t("ngày · Không tự gia hạn", "days · No auto-renewal")}</p>

          {premiumLoading || premiumError ? (
            <p>{t("Cần xác minh trạng thái gói trước khi đăng ký.", "Verify membership before checkout.")}</p>
          ) : (
            <Link
              className="button-link pulse-button"
              to={
                premium?.pendingPackageId
                  ? "/premium/payment-result"
                  : `/premium/checkout/${plan.id}`
              }
            >
              {premium?.pendingPackageId
                ? t("Xem yêu cầu chờ duyệt", "View pending request")
                : owned
                ? t("Đã mua · Gia hạn thêm", "Purchased · Extend access")
                : t("Tiến hành thanh toán", "Continue to checkout")} →
            </Link>
          )}

          <small>
            {t(
              "Xem lại gói và gửi yêu cầu chờ admin duyệt ở bước tiếp theo. Chưa phát sinh khoản thu khi bấm nút này.",
              "Review your plan and submit for administrator review next. This button does not charge you."
            )}
          </small>
          <hr />
          <p className="premium-muted">
            {t(
              "Chuyển khoản QR ngân hàng · Duyệt thủ công an toàn bởi Quản trị viên.",
              "Static bank QR · Manual verification required."
            )}
          </p>
        </aside>
      </div>
    </main>
  );
}
