import { Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext.jsx";
import { usePreferences } from "../store/PreferencesContext.jsx";
import { currentPremium } from "../utils/premiumAccess.js";

/**
 * ============================================================================
 * [BF-01] PremiumMembership Component
 * Widget hiển thị trạng thái gói Premium hiện tại của người dùng:
 * - Chưa đăng nhập: Ẩn hoàn toàn.
 * - Đang tải / Lỗi kết nối: Báo trạng thái tải hoặc cho phép bấm "Kiểm tra lại".
 * - Đang có gói Premium: Hiển thị tên gói, thời hạn hiệu lực và nút "Bắt đầu đọc báo".
 * - Đang có đơn chờ Admin duyệt: Hiển thị thông báo nhắc nhở không chuyển tiền 2 lần.
 * ============================================================================
 */
export default function PremiumMembership() {
  const { user, premium, premiumActive, premiumLoading, premiumError, refreshPremium } = useAuth();
  const { t, language } = usePreferences();

  // 1. Chưa đăng nhập thì không render
  if (!user) {
    return null;
  }

  // 2. Đang gọi API lấy trạng thái gói từ backend
  if (premiumLoading) {
    return (
      <section className="premium-panel" role="status">
        {t("Đang kiểm tra gói của bạn…", "Checking your membership…")}
      </section>
    );
  }

  // 3. Xảy ra lỗi khi gọi API
  if (premiumError) {
    return (
      <section className="premium-panel" role="alert">
        <p>
          {t(
            "Chưa kiểm tra được trạng thái gói. Vui lòng tải lại trước khi đăng ký hoặc chuyển tiền.",
            "Unable to verify your membership. Retry before registering or transferring funds."
          )}
        </p>
        <button onClick={refreshPremium}>{t("Kiểm tra lại", "Retry")}</button>
      </section>
    );
  }

  // 4. Lấy gói đang có hiệu lực trong danh sách subscriptions
  const current = currentPremium(premium?.subscriptions);

  // Hàm chuyển đổi timestamp thành định dạng ngày giờ đọc được
  const formatDate = (value) =>
    new Date(value).toLocaleString(language === "vi" ? "vi-VN" : "en-GB");

  // Lọc các gói đã mua nhưng bắt đầu trong tương lai (đăng ký trước)
  const scheduled =
    premium?.subscriptions?.filter(
      (s) => s.status === "ACTIVE" && Date.parse(s.startAt) > Date.now()
    ) || [];

  // Nếu không có quyền Premium, không có gói tương lai và không có đơn chờ duyệt -> Ẩn
  if (!premiumActive && !scheduled.length && !premium?.pendingPackageId) {
    return null;
  }

  // 5. Giao diện hiển thị gói của bạn
  return (
    <section
      className="premium-panel premium-membership"
      aria-label={t("Gói của bạn", "Your membership")}
    >
      {/* Huy hiệu thông báo trạng thái */}
      <span className="premium-kicker">
        {premiumActive ? "✦ PREMIUM ACTIVE" : t("TRẠNG THÁI ĐĂNG KÝ", "MEMBERSHIP STATUS")}
      </span>

      {/* Tên gói đang sử dụng */}
      <h2>
        {current
          ? `${t("Bạn đang sử dụng", "You are using")} ${current.packageName}`
          : t("Gói của bạn", "Your plan")}
      </h2>

      {/* Thời hạn của gói đang kích hoạt */}
      {current && (
        <>
          <p>
            {t(
              "Đã mua và được duyệt · Đọc tập trung, đọc thành tiếng và không quảng cáo trong thời hạn gói.",
              "Purchased and approved · Focus reading, read aloud and no ads while your membership is active."
            )}
          </p>
          <dl className="premium-order-lines">
            <div>
              <dt>{t("Có hiệu lực từ", "Active from")}</dt>
              <dd>{formatDate(current.startAt)}</dd>
            </div>
            <div>
              <dt>{t("Hết hạn", "Expires")}</dt>
              <dd>{formatDate(current.endAt)}</dd>
            </div>
          </dl>
        </>
      )}

      {/* Các gói đã thanh toán đang chờ kích hoạt theo lịch */}
      {scheduled.map((s) => (
        <p key={s.id}>
          {t("Đã mua · Chờ đến ngày hiệu lực", "Purchased · Starts later")}:{" "}
          <strong>{s.packageName}</strong> · {formatDate(s.startAt)} → {formatDate(s.endAt)}
        </p>
      ))}

      {/* Thông báo nếu có đơn chờ admin xác nhận */}
      {Boolean(premium?.pendingPackageId) && (
        <p>
          {t(
            "Có yêu cầu đang chờ admin xác minh. Chưa cấp quyền cho yêu cầu này; không chuyển khoản lại nếu đã thanh toán.",
            "A request is awaiting administrator verification. It does not grant access yet; do not pay twice."
          )}
        </p>
      )}

      {/* Các nút hành động chính: Chuyển sang đọc báo / Xem lịch sử / Làm mới trạng thái */}
      <div className="premium-review-actions">
        <Link className="button-link" to="/search">
          {t("Bắt đầu đọc báo", "Start reading")} →
        </Link>
        <Link to="/premium/my-subscription">
          {t("Xem gói & lịch sử duyệt", "Membership & request history")}
        </Link>
        <button className="secondary-button" onClick={refreshPremium}>
          {t("Cập nhật trạng thái", "Refresh status")}
        </button>
      </div>
    </section>
  );
}
