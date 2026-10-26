import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getActivePremiumPlans } from "../../services/premiumService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { money, readingBenefits } from "../../utils/premium.js";
import "../../assets/premium.css";
import { useAuth } from "../../store/AuthContext.jsx";
import { ownedPremium } from "../../utils/premiumAccess.js";
import PremiumMembership from "../../components/PremiumMembership.jsx";

/**
 * ============================================================================
 * [BF-01][UC-10] PREMIUM PACKAGES CATALOG & PRICING
 * Phụ trách: Bùi Quang Cường
 * Hiển thị danh mục gói cước Premium, so sánh quyền lợi & trạng thái sở hữu
 * ============================================================================
 */
export default function PackagesPage() {
  const { t, language } = usePreferences();
  const { premium } = useAuth();
  const [state, setState] = useState({ loading: true, packages: [], error: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ loading: true, packages: [], error: false });

    getActivePremiumPlans()
      .then((packages) => {
        if (alive) {
          setState({ packages, loading: false, error: false });
        }
      })
      .catch(() => {
        if (alive) {
          setState({ packages: [], loading: false, error: true });
        }
      });

    return () => {
      alive = false;
    };
  }, [attempt, language]);

  return (
    <main className="page-content premium-page">
      <PremiumMembership />

      {/* Hero Header & Giá trị cốt lõi */}
      <header className="premium-hero">
        <span className="premium-kicker">THE PLUSE PREMIUM</span>
        <h1>{t("Đọc sâu hơn. Hiểu trọn hơn.", "More context. A clearer perspective.")}</h1>
        <p>
          {t(
            "Chọn thời hạn phù hợp và khám phá quyền lợi trước khi quyết định. Giá và gói được tải trực tiếp từ hệ thống.",
            "Explore plan benefits before you decide. Prices and plans come directly from our catalog."
          )}
        </p>
        <div className="premium-assurance">
          <span>✓ {t("Giá rõ ràng", "Transparent pricing")}</span>
          <span>✓ {t("Xem quyền lợi trước khi mua", "Review before buying")}</span>
          <span>✓ {t("Không tự động gia hạn", "No automatic renewal")}</span>
        </div>
      </header>

      {/* Trạng thái tải danh sách gói */}
      {state.loading && (
        <p role="status">{t("Đang tải gói Premium…", "Loading Premium plans…")}</p>
      )}

      {state.error && (
        <div role="alert" className="premium-empty">
          <p>{t("Không tải được danh sách gói cước vào lúc này.", "Unable to load plans at this time.")}</p>
        </div>
      )}

      {!state.loading && !state.error && !state.packages.length && (
        <p className="premium-empty">
          {t("Chưa có gói Premium đang mở bán.", "No Premium plans are currently available.")}
        </p>
      )}

      {/* Danh sách thẻ gói cước Premium */}
      <div className="premium-plans">
        {state.packages.map((item) => {
          const owned = ownedPremium(premium?.subscriptions, item.id);
          const pending = Number(premium?.pendingPackageId) === Number(item.id);

          return (
            <article
              className={`premium-plan ${owned ? "is-owned" : ""}`}
              key={item.id}
            >
              <span className="premium-kicker">
                {owned
                  ? t("✓ ĐÃ MUA GÓI NÀY", "✓ PURCHASED")
                  : pending
                  ? t("◷ ĐANG CHỜ DUYỆT", "◷ PENDING REVIEW")
                  : `${item.durationDays} ${t("NGÀY TRẢI NGHIỆM", "DAYS OF ACCESS")}`}
              </span>

              <h2>{item.name}</h2>
              <p>{item.description}</p>
              <strong className="premium-price">
                {money(item.price, item.currency)}
              </strong>

              <small>
                {owned
                  ? `${t("Thời hạn đã cấp đến", "Granted until")} ${new Date(
                      owned.endAt
                    ).toLocaleDateString(language === "vi" ? "vi-VN" : "en-GB")}`
                  : t(
                      "Thanh toán một lần cho toàn bộ thời hạn",
                      "One payment for the full period"
                    )}
              </small>

              <ul>
                {readingBenefits(language).map((benefit) => (
                  <li key={benefit}>
                    <span>✓</span>
                    {benefit}
                  </li>
                ))}
              </ul>

              <Link
                className="button-link"
                to={
                  pending
                    ? "/premium/payment-result"
                    : `/premium/packages/${item.id}`
                }
              >
                {owned
                  ? t("Xem gói đã mua", "View purchased plan")
                  : pending
                  ? t("Xem trạng thái duyệt", "View request status")
                  : t("Khám phá quyền lợi", "Explore benefits")}{" "}
                →
              </Link>
            </article>
          );
        })}
      </div>

      {/* Bảng so sánh quyền lợi: Tài khoản thường vs Premium */}
      <section className="premium-panel">
        <h2>{t("Premium khác gì tài khoản thường?", "What changes with Premium?")}</h2>
        <div className="premium-comparison-wrap">
          <table className="premium-comparison">
            <thead>
              <tr>
                <th>{t("Quyền lợi", "Feature")}</th>
                <th>{t("Chưa có Premium", "Without Premium")}</th>
                <th>Premium {t("còn hiệu lực", "active")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  t("Tin công khai / RSS", "Public news / RSS"),
                  t("Đọc phần có sẵn", "Read available content"),
                  t("Giống tài khoản thường", "Same public content"),
                ],
                [
                  t("Bài Premium của The Pluse", "The Pluse Premium articles"),
                  t("Chỉ xem trước · Có paywall", "Preview only · Paywall"),
                  t("Mở toàn bộ nội dung", "Full content unlocked"),
                ],
                [
                  t("Quảng cáo trên trang tin", "Ads on news pages"),
                  t("Banner & quảng bá website", "Banners & house promotions"),
                  t(
                    "Không quảng cáo khi gói còn hiệu lực",
                    "Ad-free while membership is active"
                  ),
                ],
                [
                  t("Đọc tập trung", "Focus reading"),
                  t("Không có", "Unavailable"),
                  t("Có, khi gói còn hạn", "Available while subscribed"),
                ],
                [
                  t("Đọc thành tiếng", "Read aloud"),
                  t("Không có", "Unavailable"),
                  t(
                    "Có · Cần giọng tiếng Việt trên trình duyệt",
                    "Available · Vietnamese browser voice required"
                  ),
                ],
                [
                  t("Kích hoạt / hết hạn", "Activation / expiry"),
                  t("Gửi yêu cầu chưa cấp quyền", "Requests do not grant access"),
                  t(
                    "Admin duyệt → hiệu lực theo thời hạn đã cấp",
                    "Approved → valid for the granted period"
                  ),
                ],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) =>
                    i ? (
                      <td key={i}>{cell}</td>
                    ) : (
                      <th scope="row" key={i}>
                        {cell}
                      </th>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="premium-muted">
          {t(
            "Premium không mở khóa paywall của VnExpress/Tuổi Trẻ hay bổ sung toàn văn mà RSS không cung cấp. Lưu bài vẫn đang phát triển, không coi là quyền lợi đã hoàn thiện.",
            "Premium does not bypass publishers’ paywalls or add full text missing from RSS. Bookmarks remain in development."
          )}
        </p>
      </section>

      <p className="premium-disclaimer">
        {t(
          "Hệ thống đang thử nghiệm. Một số quyền lợi trong danh mục vẫn đang được phát triển. Chuyển khoản QR tĩnh cần xác minh thủ công; chưa tự động kích hoạt gói.",
          "Test system. Some catalog benefits remain in development. Static QR transfers require manual verification; activation is not automatic."
        )}
      </p>
    </main>
  );
}
