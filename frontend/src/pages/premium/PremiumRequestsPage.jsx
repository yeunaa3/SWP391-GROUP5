import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyPremiumRequests } from "../../services/premiumService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import PremiumMembership from "../../components/PremiumMembership.jsx";
import AutoPaymentTimerCard from "../../components/AutoPaymentTimerCard.jsx";
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

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await getMyPremiumRequests());
      await refreshPremium();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const date = (value) =>
    value
      ? new Date(value).toLocaleString(language === "vi" ? "vi-VN" : "en-GB")
      : "—";

  return (
    <main className="page-content premium-page">
      <PremiumMembership />
      <header className="premium-checkout-heading">
        <span className="premium-kicker">THE PLUSE PREMIUM</span>
        <h1>{t("Đăng ký và trạng thái duyệt", "Requests and approval status")}</h1>
        <p>
          {t(
            "Yêu cầu chờ duyệt chưa mở quyền. Cập nhật sau khi thanh toán hoặc admin xử lý; quyền đọc bài được kiểm tra trực tiếp từ DB.",
            "Pending requests do not grant access. Updated automatically after payment; article access is checked against the database."
          )}
        </p>
        <button className="secondary-button" onClick={load} disabled={loading}>
          {t("Cập nhật trạng thái", "Refresh status")}
        </button>
      </header>

      {loading && <p role="status">{t("Đang tải…", "Loading…")}</p>}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

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

      {!loading && !error && !rows.length && (
        <section className="premium-panel">
          <p>
            {t(
              "Chưa có yêu cầu duyệt thủ công. Gói mẫu đã cấp trước đó không nằm trong lịch sử yêu cầu này.",
              "No manual requests. Pre-existing demo subscriptions are not listed here."
            )}
          </p>
          <Link to="/premium/packages">{t("Chọn gói", "Choose plan")}</Link>
        </section>
      )}

      {rows.map((row) => (
        <article className="premium-panel" key={row.id}>
          <div className="premium-request-heading">
            <div>
              <span className="premium-kicker">PRE-{row.id}</span>
              <h2>{row.packageName}</h2>
            </div>
            <span
              className={`premium-request-status is-${row.status.toLowerCase()}`}
            >
              {row.status === "PENDING"
                ? t("Chờ thanh toán (PayOS / VietQR)", "Pending Payment")
                : row.status === "APPROVED"
                ? t("Đã kích hoạt", "Active")
                : t("Bị từ chối", "Rejected")}
            </span>
          </div>

          <dl className="premium-order-lines">
            <div>
              <dt>{t("Số tiền", "Amount")}</dt>
              <dd>{money(row.amount, row.currency)}</dd>
            </div>
            <div>
              <dt>{t("Thời hạn", "Duration")}</dt>
              <dd>
                {row.durationDays} {t("ngày", "days")}
              </dd>
            </div>
            <div>
              <dt>{t("Gửi lúc", "Submitted")}</dt>
              <dd>{date(row.submittedAt)}</dd>
            </div>
          </dl>

          {/* Khối Thanh Toán Tự Động Cooldown 5 Phút (Bỏ nút thủ công, tự nhận diện 100%) */}
          {row.status === "PENDING" && (
            <AutoPaymentTimerCard
              type="PREMIUM"
              referenceId={row.id}
              amount={row.amount}
              itemName={`Gói ${row.packageName}`}
              onSuccess={async () => {
                setAutoSuccessMsg(
                  t(
                    "⚡ Thanh toán thành công! Gói cước đã kích hoạt ngay và hóa đơn điện tử đã gửi tới email của bạn.",
                    "⚡ Payment verified! Your subscription is now active and an invoice has been sent to your email."
                  )
                );
                await load();
              }}
            />
          )}

          {row.status === "APPROVED" && (
            <>
              <p>
                {t("Thời gian được cấp", "Granted period")}:{" "}
                <strong>
                  {date(row.startAt)} → {date(row.endAt)}
                </strong>
              </p>
              <Link to="/">{t("Về trang báo", "Read news")} →</Link>
            </>
          )}

          {row.reviewNote && (
            <p>
              {t("Ghi chú admin", "Administrator note")}: {row.reviewNote}
            </p>
          )}

          {row.status === "REJECTED" && (
            <Link to="/premium/packages">{t("Đăng ký lại", "Resubmit")}</Link>
          )}
        </article>
      ))}
    </main>
  );
}
