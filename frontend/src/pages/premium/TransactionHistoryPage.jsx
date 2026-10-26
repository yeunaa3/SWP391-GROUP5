import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyTransactions } from "../../services/premiumService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { money } from "../../utils/premium.js";
import "../../assets/premium.css";

export default function TransactionHistoryPage() {
  const { t, language } = usePreferences();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const data = await getMyTransactions();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Không thể tải lịch sử giao dịch.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = val => {
    if (!val) return "—";
    return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(val));
  };

  const getTypeName = type => {
    if (type === "PREMIUM_PURCHASE") return t("Đăng ký mới", "New Purchase");
    if (type === "PREMIUM_RENEWAL") return t("Gia hạn", "Renewal");
    return type || t("Giao dịch Premium", "Premium Transaction");
  };

  return (
    <main className="page-content premium-page">
      <Link className="premium-back" to="/premium/my-subscription">
        ← {t("Quay lại Gói của tôi", "Back to My Subscription")}
      </Link>

      <header className="premium-checkout-heading">
        <span className="premium-kicker">THE PLUSE PREMIUM · PRE-06</span>
        <h1>{t("Lịch sử giao dịch & Hóa đơn", "Transaction History & Invoices")}</h1>
        <p>
          {t(
            "Danh sách các giao dịch thanh toán gói Premium đã được xác minh thành công. Bấm 'Xem biên lai' để xem hóa đơn chi tiết.",
            "List of verified Premium subscription payments. Click 'View Receipt' for detailed invoice records."
          )}
        </p>
      </header>

      {/* Navigation tabs */}
      <nav className="premium-nav-tabs" aria-label="Subscription Navigation">
        <Link to="/premium/my-subscription" className="premium-nav-tab">
          ✦ {t("Gói của tôi", "My Subscription")}
        </Link>
        <Link to="/premium/transactions" className="premium-nav-tab is-active">
          🧾 {t("Lịch sử giao dịch & Biên lai", "Transactions & Receipts")}
        </Link>
        <Link to="/premium/payment-result" className="premium-nav-tab">
          ◷ {t("Yêu cầu chờ duyệt", "Pending Requests")}
        </Link>
      </nav>

      {loading && <p role="status">{t("Đang tải lịch sử giao dịch…", "Loading transactions…")}</p>}
      {error && (
        <div role="alert" className="premium-empty">
          <p>{error}</p>
          <button onClick={loadData}>{t("Thử lại", "Retry")}</button>
        </div>
      )}

      {!loading && !error && !transactions.length && (
        <section className="premium-empty">
          <span className="premium-kicker">CHƯA CÓ GIAO DỊCH</span>
          <h2>{t("Chưa có giao dịch thanh toán nào", "No recorded transactions found")}</h2>
          <p style={{ maxWidth: "500px", margin: "14px auto 24px" }}>
            {t(
              "Khi bạn đăng ký gói Premium và được admin xác nhận thanh toán, biên lai điện tử sẽ tự động xuất hiện tại đây.",
              "When you purchase a subscription and payment is confirmed, electronic receipts will appear here."
            )}
          </p>
          <Link to="/premium/packages" className="button-link">
            {t("Khám phá các gói Premium", "Explore Premium plans")} →
          </Link>
        </section>
      )}

      {!loading && !error && transactions.length > 0 && (
        <section className="premium-panel">
          <div className="premium-request-heading">
            <h2>{t("Danh sách biên lai thanh toán", "Payment Receipts")} ({transactions.length})</h2>
          </div>

          <div className="premium-table-wrap">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>{t("Mã giao dịch", "Txn Reference")}</th>
                  <th>{t("Gói dịch vụ", "Plan")}</th>
                  <th>{t("Loại giao dịch", "Type")}</th>
                  <th>{t("Số tiền", "Amount")}</th>
                  <th>{t("Thời gian", "Paid At")}</th>
                  <th>{t("Phương thức", "Gateway")}</th>
                  <th>{t("Trạng thái", "Status")}</th>
                  <th style={{ textAlign: "right" }}>{t("Thao tác", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(item => (
                  <tr key={item.id}>
                    <td>
                      <strong className="highlight-text">{item.txnRef || `TXN-${item.id}`}</strong>
                    </td>
                    <td>{item.packageName || t("Gói Premium", "Premium Plan")}</td>
                    <td>{getTypeName(item.transactionType)}</td>
                    <td>
                      <strong>{money(item.amount, item.currency || "VND")}</strong>
                    </td>
                    <td>{formatDate(item.paidAt)}</td>
                    <td>
                      <span className="premium-tag">
                        {item.paymentGateway === "MANUAL" ? "VietQR / Chuyển khoản" : item.paymentGateway}
                      </span>
                    </td>
                    <td>
                      <span className="premium-request-status is-approved">
                        ✓ {t("Thành công", "Success")}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        to={`/premium/transactions/${item.id}`}
                        className="button-link"
                        style={{ padding: "8px 14px", fontSize: ".85rem", textDecoration: "none" }}
                      >
                        {t("Xem biên lai", "View Receipt")} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
