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
    if (!confirmed || busy || premiumLoading || premiumError || premium?.pendingPackageId) return;
    setBusy(true); setError("");
    try { await submitPremiumRequest(plan.id); await refreshPremium(); navigate("/premium/payment-result"); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <main className="page-content premium-page">
    <PremiumMembership /><Link className="premium-back" to={`/premium/packages/${plan.id}`}>← {t("Quay lại quyền lợi gói", "Back to plan benefits")}</Link>
    <header className="premium-checkout-heading"><span className="premium-kicker">THE PLUSE PREMIUM</span><h1>{owned ? t("Gia hạn gói đã mua", "Extend your purchased plan") : t("Đăng ký gói Premium", "Register for Premium")}</h1>
      <p>{t("Gửi đăng ký trước để nhận mã đối soát. Admin xác nhận thanh toán rồi mới kích hoạt gói.", "Submit first to receive your transfer reference. An administrator verifies payment before activation.")}</p>
      <ol className="premium-steps"><li>✓ {t("Chọn gói", "Choose plan")}</li><li>2. {t("Gửi đăng ký", "Submit request")}</li><li>3. {t("Admin duyệt", "Administrator review")}</li></ol></header>
    <div className="premium-detail-grid"><form id="premium-checkout-form" onSubmit={submit}>
      <section className="premium-panel"><h2>{t("Tài khoản nhận quyền lợi", "Account receiving access")}</h2><strong>{user?.fullName || user?.username}</strong><p>{user?.email}</p></section>
      <section className="premium-panel"><h2>{t("Chuyển khoản QR · Duyệt thủ công", "Bank QR · Manual approval")}</h2>
        <p>{t("Sau khi gửi, trang kết quả hiển thị QR, số tiền đã chốt và mã chuyển khoản riêng. Không chuyển tiền trước khi nhận mã yêu cầu.", "After submission you receive the QR, confirmed amount and unique reference. Submit before transferring.")}</p>
        <p className="premium-muted">{t("Không nhập OTP/mật khẩu ngân hàng trên The Pluse. Chưa tích hợp payOS, thẻ hoặc ví.", "Never enter banking credentials here. payOS, cards and wallets are not integrated.")}</p></section>
      <section className="premium-panel"><label className="premium-consent"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>{t("Tôi đã xem quyền lợi; nếu đang có gói, tôi xác nhận mua thêm thời hạn gia hạn. Tôi đồng ý chờ admin xác minh thanh toán. Gửi đăng ký không đồng nghĩa đã trả tiền hoặc có quyền Premium.", "I reviewed the benefits and agree to wait for payment verification. Submitting does not confirm payment or Premium access.")}</span></label></section>
      {error && <p className="error-message" role="alert">{error}</p>}
    </form><aside className="premium-purchase-card"><span className="premium-kicker">{t("TÓM TẮT ĐĂNG KÝ", "REQUEST SUMMARY")}</span><h2>{plan.name}</h2><span className="premium-duration">{plan.durationDays} {t("ngày", "days")}</span>
      <div className="premium-total"><span>{t("Số tiền", "Amount")}</span><strong>{money(plan.price, plan.currency)}</strong></div>
      <p>{t("Tính hạn từ lúc duyệt. Nếu gói hiện tại còn hạn, thời gian mới nối tiếp hạn đó.", "Access starts on approval or after your existing active period ends.")}</p>
      <button form="premium-checkout-form" type="submit" disabled={!confirmed || busy || premiumLoading || premiumError || Boolean(premium?.pendingPackageId)}>{busy ? t("Đang gửi…", "Submitting…") : owned ? t("Gửi yêu cầu gia hạn — chờ duyệt", "Submit extension for review") : t("Gửi đăng ký — chờ admin duyệt", "Submit for review")}</button>
      <small>{t("Không tự động trừ tiền. Tối đa một yêu cầu chờ duyệt mỗi tài khoản.", "No automatic charge. One pending request per account.")}</small><Link className="premium-change-plan" to="/premium/packages">{t("Đổi gói", "Change plan")}</Link>
    </aside></div></main>;
}
