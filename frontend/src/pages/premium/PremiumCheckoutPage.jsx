import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext.jsx";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { submitPremiumRequest } from "../../services/premiumService.js";
import { PlanState } from "./PackageDetailPage.jsx";
import PremiumMembership from "../../components/PremiumMembership.jsx";
import { ownedPremium } from "../../utils/premiumAccess.js";
import usePremiumPlan from "../../hooks/usePremiumPlan.js";
import { money } from "../../utils/premium.js";
import "../../assets/premium.css";

/**
 * ============================================================================
 * [BF-01][UC-11] PREMIUM CHECKOUT & PAYMENT INITIATION
 * Phụ trách: Bùi Quang Cường
 * Khởi tạo đơn thanh toán VietQR tự động & kích hoạt gói cước
 * ============================================================================
 */
export default function PremiumCheckoutPage() {
  const state = usePremiumPlan();
  const { user, premium, premiumLoading, premiumError, refreshPremium } = useAuth();
  const { t } = usePreferences();
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!state.plan) return <PlanState {...state} />;
  const { plan } = state;
  const owned = ownedPremium(premium?.subscriptions, plan.id);

  async function submit(event) {
    event.preventDefault();
    if (!confirmed || busy || premiumLoading || premiumError || premium?.pendingPackageId) {
      return;
    }
    setBusy(true);
    setError("");

    try {
      await submitPremiumRequest(plan.id);
      await refreshPremium();
      navigate("/premium/payment-result");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-content premium-page">
      <PremiumMembership />
      <Link className="premium-back" to={`/premium/packages/${plan.id}`}>
        ← {t("Quay lại quyền lợi gói", "Back to plan benefits")}
      </Link>

      <header className="premium-checkout-heading">
        <span className="premium-kicker">THE PLUSE PREMIUM</span>
        <h1>
          {owned
            ? t("Gia hạn gói đã mua", "Extend your purchased plan")
            : t("Đăng ký gói Premium", "Register for Premium")}
        </h1>
        <p>
          {t(
            "Thanh toán tự động qua VietQR. Gói cước kích hoạt ngay sau khi chuyển khoản và hóa đơn gửi về email của bạn.",
            "Automatic payment via VietQR. Instant activation and receipt emailed to you upon transfer."
          )}
        </p>
        <ol className="premium-steps">
          <li>✓ {t("Chọn gói", "Choose plan")}</li>
          <li>2. {t("Nhận mã VietQR", "Get VietQR")}</li>
          <li>3. {t("Kích hoạt tự động", "Auto-activation")}</li>
        </ol>
      </header>

      <div className="premium-detail-grid">
        <form id="premium-checkout-form" onSubmit={submit}>
          <section className="premium-panel">
            <h2>{t("Tài khoản nhận quyền lợi", "Account receiving access")}</h2>
            <strong>{user?.fullName || user?.username}</strong>
            <p>
              {user?.email ||
                t(
                  "Chưa có email (sẽ không nhận được biên lai qua email)",
                  "No email configured"
                )}
            </p>
          </section>

          <section className="premium-panel">
            <h2>{t("Thanh toán VietQR tự động", "Automated VietQR Payment")}</h2>
            <p>
              {t(
                "Hệ thống sẽ tạo mã QR chuẩn Napas chứa sẵn số tiền và nội dung chuyển khoản riêng biệt. Bạn chỉ cần quét mã bằng app ngân hàng và kích hoạt ngay lập tức.",
                "The system generates an instant Napas VietQR with predefined amount and memo. Scan with any banking app to activate immediately."
              )}
            </p>
            <p className="premium-muted">
              {t(
                "Biên lai điện tử có mã đối soát sẽ tự động gửi tới email ngay sau khi kích hoạt.",
                "An electronic invoice will be automatically sent to your email upon activation."
              )}
            </p>
          </section>

          <section className="premium-panel">
            <label className="premium-consent">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                {t(
                  "Tôi đã xem quyền lợi gói và đồng ý tiếp tục tạo mã thanh toán VietQR cho tài khoản này.",
                  "I reviewed the plan benefits and agree to proceed with VietQR payment."
                )}
              </span>
            </label>
          </section>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </form>

        <aside className="premium-purchase-card">
          <span className="premium-kicker">
            {t("TÓM TẮT ĐĂNG KÝ", "REQUEST SUMMARY")}
          </span>
          <h2>{plan.name}</h2>
          <span className="premium-duration">
            {plan.durationDays} {t("ngày", "days")}
          </span>

          <div className="premium-total">
            <span>{t("Số tiền", "Amount")}</span>
            <strong>{money(plan.price, plan.currency)}</strong>
          </div>

          <p>
            {t(
              "Tính hạn từ lúc kích hoạt. Nếu gói hiện tại còn hạn, thời gian mới nối tiếp hạn đó.",
              "Access starts upon activation or after your existing active period ends."
            )}
          </p>

          <button
            form="premium-checkout-form"
            type="submit"
            disabled={
              !confirmed ||
              busy ||
              premiumLoading ||
              premiumError ||
              Boolean(premium?.pendingPackageId)
            }
          >
            {busy
              ? t("Đang khởi tạo…", "Initializing…")
              : owned
              ? t("Tiếp tục thanh toán gia hạn (VietQR)", "Continue to renewal QR")
              : t("Tiếp tục thanh toán (VietQR)", "Continue to VietQR payment")}
          </button>

          <small>
            {t(
              "Thanh toán an toàn không lưu tài khoản ngân hàng.",
              "Secure transfer via standard banking app."
            )}
          </small>
          <Link className="premium-change-plan" to="/premium/packages">
            {t("Đổi gói", "Change plan")}
          </Link>
        </aside>
      </div>
    </main>
  );
}
