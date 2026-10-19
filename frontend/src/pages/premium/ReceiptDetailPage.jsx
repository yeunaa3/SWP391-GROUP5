import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTransactionDetail } from "../../services/premiumService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { money } from "../../utils/premium.js";
import "../../assets/premium.css";

export default function ReceiptDetailPage() {
  const { transactionId } = useParams();
  const { t, language } = usePreferences();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    getTransactionDetail(transactionId)
      .then(res => {
        if (alive) setData(res);
      })
      .catch(err => {
        if (alive) setError(err.message || "Không tìm thấy biên lai giao dịch.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [transactionId]);

  const formatDate = val => {
    if (!val) return "—";
    return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-GB", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(val));
  };

  const getTypeName = type => {
    if (type === "PREMIUM_PURCHASE") return t("Đăng ký mới gói Premium", "New Premium Subscription");
    if (type === "PREMIUM_RENEWAL") return t("Gia hạn thời hạn gói Premium", "Subscription Extension / Renewal");
    return type || t("Thanh toán dịch vụ Premium", "Premium Service Payment");
  };

  function handlePrint() {
    window.print();
  }

  return (
    <main className="page-content premium-page">
      <Link className="premium-back" to="/premium/transactions">
        ← {t("Quay lại Lịch sử giao dịch", "Back to Transaction History")}
      </Link>

      {loading && <p role="status">{t("Đang tải biên lai…", "Loading receipt…")}</p>}

      {error && (
        <section className="premium-empty" role="alert">
          <span className="premium-kicker">LỖI BIÊN LAI</span>
          <h2>{t("Không tìm thấy biên lai", "Receipt Not Found")}</h2>
          <p>{error}</p>
          <Link to="/premium/transactions" className="button-link">
            {t("Về lịch sử giao dịch", "Back to transactions")}
          </Link>
        </section>
      )}

      {!loading && !error && data && (
        <>
          <article className="premium-receipt-card">
            <header className="premium-receipt-header">
              <span className="premium-receipt-brand">THE PLUSE</span>
              <p className="premium-kicker" style={{ marginTop: "4px" }}>
                {t("BIÊN LAI ĐIỆN TỬ DỊCH VỤ PREMIUM", "PREMIUM SERVICE ELECTRONIC RECEIPT")}
              </p>
              <span className="premium-receipt-badge">
                ✓ {t("ĐÃ THANH TOÁN THÀNH CÔNG", "PAID SUCCESSFULLY")}
              </span>
            </header>

            <dl className="premium-order-lines premium-receipt-lines">
              <div>
                <dt>{t("Mã biên lai / giao dịch", "Receipt Reference")}</dt>
                <dd className="highlight-text">
                  <strong>{data.txnRef || `TXN-${data.id}`}</strong>
                </dd>
              </div>
              <div>
                <dt>{t("Mã hệ thống", "System Transaction ID")}</dt>
                <dd>#{data.id}</dd>
              </div>
              <div>
                <dt>{t("Thời gian thanh toán", "Payment Time")}</dt>
                <dd>{formatDate(data.paidAt)}</dd>
              </div>
              <div>
                <dt>{t("Phương thức thanh toán", "Payment Method")}</dt>
                <dd>
                  {data.paymentGateway === "MANUAL"
                    ? t("Chuyển khoản VietQR (MBBank) · Admin xác nhận", "VietQR (MBBank) · Verified")
                    : data.paymentGateway}
                </dd>
              </div>
            </dl>

            <hr style={{ border: 0, borderTop: "1px solid var(--premium-line)", margin: "20px 0" }} />

            <section>
              <h3 style={{ fontSize: "1.05rem", marginBottom: "14px", color: "var(--premium-green)" }}>
                {t("Thông tin khách hàng", "Customer Information")}
              </h3>
              <dl className="premium-order-lines">
                <div>
                  <dt>{t("Họ và tên", "Full Name")}</dt>
                  <dd><strong>{data.fullName || data.username}</strong></dd>
                </div>
                <div>
                  <dt>{t("Tài khoản", "Username")}</dt>
                  <dd>{data.username}</dd>
                </div>
                <div>
                  <dt>{t("Email nhận quyền lợi", "Contact Email")}</dt>
                  <dd>{data.email}</dd>
                </div>
              </dl>
            </section>

            <hr style={{ border: 0, borderTop: "1px solid var(--premium-line)", margin: "20px 0" }} />

            <section>
              <h3 style={{ fontSize: "1.05rem", marginBottom: "14px", color: "var(--premium-green)" }}>
                {t("Chi tiết gói đăng ký", "Plan Details")}
              </h3>
              <dl className="premium-order-lines">
                <div>
                  <dt>{t("Loại giao dịch", "Transaction Type")}</dt>
                  <dd>{getTypeName(data.transactionType)}</dd>
                </div>
                <div>
                  <dt>{t("Gói dịch vụ", "Service Plan")}</dt>
                  <dd><strong>{data.packageName || t("Gói Premium", "Premium Plan")}</strong></dd>
                </div>
                {data.durationDays ? (
                  <div>
                    <dt>{t("Thời hạn được cấp", "Duration")}</dt>
                    <dd>{data.durationDays} {t("ngày", "days")}</dd>
                  </div>
                ) : null}
                {data.startAt && data.endAt ? (
                  <div>
                    <dt>{t("Thời gian hiệu lực", "Effective Period")}</dt>
                    <dd>
                      {formatDate(data.startAt)} → {formatDate(data.endAt)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <div className="premium-receipt-total">
              <span>{t("Tổng tiền đã thanh toán", "Total Amount Paid")}</span>
              <span className="highlight-text">{money(data.amount, data.currency || "VND")}</span>
            </div>

            <footer className="premium-receipt-footer">
              <p>
                {t(
                  "Biên lai điện tử có giá trị xác nhận quyền lợi trên hệ thống The Pluse. Mọi thắc mắc vui lòng liên hệ admin.",
                  "This electronic receipt confirms valid entitlement on The Pluse. Contact support for any assistance."
                )}
              </p>
              <small>The Pluse News &bull; SWP391 Group 5 &bull; support@thepluse.example</small>
            </footer>
          </article>

          <div className="premium-receipt-actions">
            <button onClick={handlePrint} className="button-link" style={{ cursor: "pointer" }}>
              🖨 {t("In biên lai / Lưu PDF", "Print / Save PDF")}
            </button>
            <Link to="/premium/transactions" className="secondary-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", padding: "14px 20px", borderRadius: "12px" }}>
              ← {t("Về danh sách giao dịch", "Back to list")}
            </Link>
            <Link to="/premium/my-subscription" className="secondary-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", padding: "14px 20px", borderRadius: "12px" }}>
              ✦ {t("Về gói của tôi", "My Subscription")}
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
