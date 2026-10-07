import { Link } from "react-router-dom";
import { usePreferences } from "../store/PreferencesContext.jsx";

export default function AuthShell({ code, eyebrow, title, description, children }) {
  const {t}=usePreferences();
  return <main className="auth-split"><section className="auth-brand-panel"><Link to="/">← {t("Về trang báo","Back to The Pulse")}</Link><strong className="auth-logo">THE PULSE</strong><div><h2>{t("Một tài khoản để đọc tin, khám phá Premium và hợp tác quảng cáo.","One account for trusted news, Premium reading and advertising partnerships.")}</h2><div className="auth-benefits"><article><strong>{t("Dành cho độc giả","Reader access")}</strong><span>{t("Lưu bài, gói Premium và lịch sử thanh toán","Bookmarks, Premium plans and receipts")}</span></article><article><strong>{t("Dành cho doanh nghiệp","Business access")}</strong><span>{t("Hợp đồng, chiến dịch và hiệu quả quảng cáo","Contracts, campaigns and performance")}</span></article></div><article className="security-card"><strong>{t("Bảo mật từ thiết kế","Secure by design")}</strong><i /><i /><i /></article></div></section><section className="auth-form-panel"><div className="auth-links"></div><div className="auth-form-wrap"><p className="eyebrow">{eyebrow} · {code}</p><h1>{title}</h1><p className="auth-description">{description}</p>{children}</div><footer>© 2026 The Pulse</footer></section></main>;
}
