import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyPremiumRequests } from "../../services/premiumService.js";
import { autoConfirmPayment } from "../../services/paymentService.js";
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
  const [autoSuccessMsg, setAutoSuccessMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [busySubId, setBusySubId] = useState(null);

  async function load() {
    setLoading(true); setError("");
    try { setRows(await getMyPremiumRequests()); await refreshPremium(); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function handleAutoPay(subscriptionId) {
    setBusySubId(subscriptionId);
    setError("");
    setAutoSuccessMsg("");
    try {
      const res = await autoConfirmPayment({ type: "PREMIUM", subscriptionId });
      setAutoSuccessMsg(
        res.emailSent
          ? t("⚡ Thanh toán thành công! Gói cước đã kích hoạt ngay và hóa đơn điện tử đã gửi tới email của bạn.", "⚡ Payment verified! Your subscription is now active and an invoice has been sent to your email.")
          : t("⚡ Thanh toán thành công! Gói cước đã kích hoạt ngay.", "⚡ Payment verified! Your subscription is now active.")
      );
      await load();
    } catch (e) {
      setError(e.message || t("Chưa thể kích hoạt tự động. Vui lòng thử lại hoặc chờ đối soát.", "Could not auto-verify. Please try again."));
    } finally {
      setBusySubId(null);
    }
  }
  useEffect(() => { load(); }, []);
  const date = value => value ? new Date(value).toLocaleString(language === "vi" ? "vi-VN" : "en-GB") : "—";
  return <main className="page-content premium-page"><PremiumMembership /><header className="premium-checkout-heading"><span className="premium-kicker">THE PLUSE PREMIUM</span><h1>{t("Đăng ký và trạng thái duyệt", "Requests and approval status")}</h1>
    <p>{t("Yêu cầu chờ duyệt chưa mở quyền. Cập nhật sau khi admin xử lý; quyền đọc bài được kiểm tra trực tiếp từ DB.", "Pending requests do not grant access. Refresh after review; article access is checked against the database.")}</p><button className="secondary-button" onClick={load} disabled={loading}>{t("Cập nhật trạng thái", "Refresh status")}</button></header>
    {loading && <p role="status">{t("Đang tải…", "Loading…")}</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {autoSuccessMsg && (
      <div
        role="status"
        style={{
          background: "#ecfdf5",
          border: "1px solid #10b981",
          color: "#065f46",
          padding: "16px 20px",
          borderRadius: "8px",
          marginBottom: "20px",
          fontWeight: "600",
          fontSize: "15px",
        }}
      >
        {autoSuccessMsg}
      </div>
    )}
    {!loading && !error && !rows.length && <section className="premium-panel"><p>{t("Chưa có yêu cầu duyệt thủ công. Gói mẫu đã cấp trước đó không nằm trong lịch sử yêu cầu này.", "No manual requests. Pre-existing demo subscriptions are not listed here.")}</p><Link to="/premium/packages">{t("Chọn gói", "Choose plan")}</Link></section>}
    {rows.map(row => <article className="premium-panel" key={row.id}><div className="premium-request-heading"><div><span className="premium-kicker">PRE-{row.id}</span><h2>{row.packageName}</h2></div><span className={`premium-request-status is-${row.status.toLowerCase()}`}>{row.status === "PENDING" ? t("Chờ admin duyệt", "Pending review") : row.status === "APPROVED" ? t("Đã duyệt", "Approved") : t("Bị từ chối", "Rejected")}</span></div>
      <dl className="premium-order-lines"><div><dt>{t("Số tiền", "Amount")}</dt><dd>{money(row.amount, row.currency)}</dd></div><div><dt>{t("Thời hạn", "Duration")}</dt><dd>{row.durationDays} {t("ngày", "days")}</dd></div><div><dt>{t("Gửi lúc", "Submitted")}</dt><dd>{date(row.submittedAt)}</dd></div></dl>
      {row.status === "PENDING" && (() => {
        const transferMemo = `THE PLUSE ${row.username || "USER"} PREMIUM ${row.id}`;
        return (
          <div className="premium-manual-transfer">
            <img
              className="premium-bank-qr"
              src={paymentConfig.getDynamicQrUrl(row.amount, transferMemo)}
              onError={e => { e.currentTarget.src = paymentConfig.qrImage; }}
              alt={t("QR chuyển khoản", "Bank transfer QR")}
            />
            <div>
              <h3>{t("Quét mã thanh toán tự động VietQR", "Scan VietQR to Pay")}</h3>
              <p><strong>{paymentConfig.bankName}</strong></p>
              <p>{paymentConfig.accountName} · <strong>{paymentConfig.accountNumber}</strong></p>
              <p>{t("Nội dung chuyển khoản", "Transfer Memo / Reference")}: <strong className="highlight-text">{transferMemo}</strong></p>
              <p>{t("Số tiền thanh toán", "Amount")}: <strong className="highlight-text">{money(row.amount, row.currency)}</strong></p>
              <p className="premium-hint">{t("⚡ Mã QR đã tự động điền sẵn số tiền và nội dung chuyển khoản. Khi quét bằng ứng dụng ngân hàng bất kỳ, bạn chỉ cần nhập mã OTP để xác nhận thanh toán.", "⚡ The QR code automatically includes the exact amount and description. Just scan with any mobile banking app and confirm with OTP.")}</p>
              <div style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  disabled={busySubId === row.id}
                  onClick={() => handleAutoPay(row.id)}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    fontWeight: "700",
                    fontSize: "15px",
                    cursor: busySubId === row.id ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {busySubId === row.id
                    ? t("Đang kiểm tra & kích hoạt tự động…", "Verifying & activating…")
                    : t("⚡ Tôi đã chuyển khoản xong — Kích hoạt gói ngay", "⚡ I have transferred — Activate now")}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {row.status === "APPROVED" && <><p>{t("Thời gian được cấp", "Granted period")}: <strong>{date(row.startAt)} → {date(row.endAt)}</strong></p><Link to="/">{t("Về trang báo", "Read news")} →</Link></>}
      {row.reviewNote && <p>{t("Ghi chú admin", "Administrator note")}: {row.reviewNote}</p>}{row.status === "REJECTED" && <Link to="/premium/packages">{t("Đăng ký lại", "Resubmit")}</Link>}
    </article>)}</main>;
}
