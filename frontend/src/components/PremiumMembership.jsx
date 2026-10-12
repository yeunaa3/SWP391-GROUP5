import { Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext.jsx";
import { usePreferences } from "../store/PreferencesContext.jsx";
import { currentPremium } from "../utils/premiumAccess.js";

export default function PremiumMembership() {
  const { user, premium, premiumActive, premiumLoading, premiumError, refreshPremium } = useAuth();
  const { t, language } = usePreferences();
  if (!user) return null;
  if (premiumLoading) return <section className="premium-panel" role="status">{t("Đang kiểm tra gói của bạn…", "Checking your membership…")}</section>;
  if (premiumError) return <section className="premium-panel" role="alert"><p>{t("Chưa kiểm tra được trạng thái gói. Vui lòng tải lại trước khi đăng ký hoặc chuyển tiền.", "Unable to verify your membership. Retry before registering or transferring funds.")}</p><button onClick={refreshPremium}>{t("Kiểm tra lại", "Retry")}</button></section>;
  const current = currentPremium(premium?.subscriptions);
  const date = value => new Date(value).toLocaleString(language === "vi" ? "vi-VN" : "en-GB");
  const scheduled = premium?.subscriptions.filter(s => s.status === "ACTIVE" && Date.parse(s.startAt) > Date.now()) || [];
  if (!premiumActive && !scheduled.length && !premium?.pendingPackageId) return null;
  return <section className="premium-panel premium-membership" aria-label={t("Gói của bạn", "Your membership")}>
    <span className="premium-kicker">{premiumActive ? "✦ PREMIUM ACTIVE" : t("TRẠNG THÁI ĐĂNG KÝ", "MEMBERSHIP STATUS")}</span>
    <h2>{current ? `${t("Bạn đang sử dụng", "You are using")} ${current.packageName}` : t("Gói của bạn", "Your plan")}</h2>
    {current && <><p>{t("Đã mua và được duyệt · Đọc nội dung Premium của The Pluse, không hiển thị quảng cáo trong trang tin.", "Purchased and approved · Read The Pluse Premium content without ads on news pages.")}</p><dl className="premium-order-lines"><div><dt>{t("Có hiệu lực từ", "Active from")}</dt><dd>{date(current.startAt)}</dd></div><div><dt>{t("Hết hạn", "Expires")}</dt><dd>{date(current.endAt)}</dd></div></dl></>}
    {scheduled.map(s => <p key={s.id}>{t("Đã mua · Chờ đến ngày hiệu lực", "Purchased · Starts later")}: <strong>{s.packageName}</strong> · {date(s.startAt)} → {date(s.endAt)}</p>)}
    {Boolean(premium?.pendingPackageId) && <p>{t("Có yêu cầu đang chờ admin xác minh. Chưa cấp quyền cho yêu cầu này; không chuyển khoản lại nếu đã thanh toán.", "A request is awaiting administrator verification. It does not grant access yet; do not pay twice.")}</p>}
    <div className="premium-review-actions"><Link className="button-link" to="/search">{t("Bắt đầu đọc báo", "Start reading")} →</Link><Link to="/premium/my-subscription">{t("Xem gói & lịch sử duyệt", "Membership & request history")}</Link><button className="secondary-button" onClick={refreshPremium}>{t("Cập nhật trạng thái", "Refresh status")}</button></div>
  </section>;
}
