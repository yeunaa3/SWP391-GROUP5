import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyPremiumRequests } from "../../services/premiumService.js";
import { paymentConfig } from "../../data/paymentConfig.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import PremiumMembership from "../../components/PremiumMembership.jsx";
import { useAuth } from "../../store/AuthContext.jsx";
import { money } from "../../utils/premium.js";
import "../../assets/premium.css";

export default function PremiumRequestsPage() {
  const { t, language } = usePreferences();
  const { refreshPremium } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true); setError("");
    try { setRows(await getMyPremiumRequests()); await refreshPremium(); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const date = value => value ? new Date(value).toLocaleString(language === "vi" ? "vi-VN" : "en-GB") : "—";
  return <main className="page-content premium-page"><PremiumMembership /><header className="premium-checkout-heading"><span className="premium-kicker">THE PLUSE PREMIUM</span><h1>{t("Đăng ký và trạng thái duyệt", "Requests and approval status")}</h1>
    <p>{t("Yêu cầu chờ duyệt chưa mở quyền. Cập nhật sau khi admin xử lý; quyền đọc bài được kiểm tra trực tiếp từ DB.", "Pending requests do not grant access. Refresh after review; article access is checked against the database.")}</p><button className="secondary-button" onClick={load} disabled={loading}>{t("Cập nhật trạng thái", "Refresh status")}</button></header>
    {loading && <p role="status">{t("Đang tải…", "Loading…")}</p>}{error && <p className="error-message" role="alert">{error}</p>}
    {!loading && !error && !rows.length && <section className="premium-panel"><p>{t("Chưa có yêu cầu duyệt thủ công. Gói mẫu đã cấp trước đó không nằm trong lịch sử yêu cầu này.", "No manual requests. Pre-existing demo subscriptions are not listed here.")}</p><Link to="/premium/packages">{t("Chọn gói", "Choose plan")}</Link></section>}
    {rows.map(row => <article className="premium-panel" key={row.id}><div className="premium-request-heading"><div><span className="premium-kicker">PRE-{row.id}</span><h2>{row.packageName}</h2></div><span className={`premium-request-status is-${row.status.toLowerCase()}`}>{row.status === "PENDING" ? t("Chờ admin duyệt", "Pending review") : row.status === "APPROVED" ? t("Đã duyệt", "Approved") : t("Bị từ chối", "Rejected")}</span></div>
      <dl className="premium-order-lines"><div><dt>{t("Số tiền", "Amount")}</dt><dd>{money(row.amount, row.currency)}</dd></div><div><dt>{t("Thời hạn", "Duration")}</dt><dd>{row.durationDays} {t("ngày", "days")}</dd></div><div><dt>{t("Gửi lúc", "Submitted")}</dt><dd>{date(row.submittedAt)}</dd></div></dl>
      {row.status === "PENDING" && <div className="premium-manual-transfer"><img className="premium-bank-qr" src={paymentConfig.qrImage} alt={t("QR chuyển khoản", "Bank transfer QR")} /><div><h3>{t("Thông tin chuyển khoản", "Transfer instructions")}</h3><p>{paymentConfig.accountName} · {paymentConfig.accountNumber}</p><p>{t("Nội dung", "Reference")}: <strong>PLUSE PRE {row.id}</strong></p><p>{t("Số tiền", "Amount")}: <strong>{money(row.amount, row.currency)}</strong></p><p>{t("QR tĩnh: tự nhập đúng số tiền và nội dung. Kiểm tra người nhận; liên hệ admin trước khi chuyển tiền thật trong giai đoạn thử nghiệm. Nếu đã chuyển, không chuyển lại — hãy đợi đối soát.", "Static QR: enter the exact amount and reference. Verify the recipient and contact the administrator before real test payments. Do not pay twice while awaiting review.")}</p></div></div>}
      {row.status === "APPROVED" && <><p>{t("Thời gian được cấp", "Granted period")}: <strong>{date(row.startAt)} → {date(row.endAt)}</strong></p><Link to="/">{t("Về trang báo", "Read news")} →</Link></>}
      {row.reviewNote && <p>{t("Ghi chú admin", "Administrator note")}: {row.reviewNote}</p>}{row.status === "REJECTED" && <Link to="/premium/packages">{t("Đăng ký lại", "Resubmit")}</Link>}
    </article>)}</main>;
}
