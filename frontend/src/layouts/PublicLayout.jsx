import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { usePreferences } from "../store/PreferencesContext.jsx";
import { useAuth } from "../store/AuthContext.jsx";
import QuickSearch from "../components/QuickSearch.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import AdBanner from "../components/AdBanner.jsx";
import { AdPreviewContext } from "../store/AdPreviewContext.jsx";

export default function PublicLayout() {
  const { user } = useAuth();
  const { t, language } = usePreferences();
  const { pathname } = useLocation();
  const [previewEnabled, setPreviewEnabled] = useState(import.meta.env.DEV);
  const subscriber = user?.roles?.includes("SUBSCRIBER");
  const newsPage = pathname === "/" || pathname === "/search" || pathname.startsWith("/articles/");
  const preview = previewEnabled && !subscriber && newsPage;
  const workspace = user?.roles?.includes("ADMINISTRATOR") ? "/admin" : user?.roles?.includes("AD_MANAGER") ? "/ad-manager" : user?.roles?.includes("BUSINESS") ? "/business" : "/account/profile";
  return <AdPreviewContext.Provider value={preview}><div className={`site-shell ${preview ? "ad-preview-on" : ""}`}>
    <div className="utility-bar"><span>{new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-GB", { dateStyle: "full", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date())}</span><span className="live-edition"><i /> {t("Góc nhìn mỗi ngày", "A fresh perspective, every day")}</span></div>
    <header className="public-header"><Link className="brand" to="/">THE PULSE<span className="brand-caption">NEWS & PERSPECTIVES</span></Link><nav aria-label="Primary navigation"><NavLink end to="/">{t("Tin tức", "News")}</NavLink><NavLink to="/premium/packages">Premium</NavLink><NavLink to={user?.roles?.includes("BUSINESS") ? "/business" : "/register"}>{t("Quảng cáo", "Advertise")}</NavLink></nav><div className="public-actions"><QuickSearch/><ThemeToggle/>{user ? <Link className="button-link pulse-button" to={workspace}>{t("Không gian làm việc", "Workspace")} ↗</Link> : <Link className="button-link pulse-button" to="/login">{t("Đăng nhập", "Sign in")}</Link>}</div></header>
    <nav className="category-nav" aria-label="News categories"><Link to="/search">{t("Mới nhất", "Latest")}</Link><Link to="/search?category=society">{t("Thời sự", "Society")}</Link><Link to="/search?category=business">{t("Kinh doanh", "Business")}</Link><Link to="/search?category=technology">{t("Công nghệ", "Technology")}</Link><Link to="/search?category=agriculture">{t("Nông nghiệp", "Agriculture")}</Link><Link to="/search">{t("Tất cả chuyên mục", "All topics")} ↗</Link></nav>
    {import.meta.env.DEV && newsPage && !subscriber && <div className="ad-preview-switch"><span>{preview ? "Đang xem thử nhiều vị trí quảng cáo · 3 mẫu xoay mỗi 4 giây" : "Đang dùng quảng cáo từ chiến dịch trong DB"}</span><button aria-pressed={previewEnabled} onClick={() => setPreviewEnabled(value => !value)}>{previewEnabled ? "Tắt xem thử" : "Bật xem thử quảng cáo"}</button></div>}
    {preview && <><div className="public-content public-preview-top"><AdBanner position="HEADER_BANNER"/></div><div className="ad-skin" aria-label="Quảng cáo nền mẫu"><Link to="/advertising-demo?brand=novalearn" className="skin-left"><small>QUẢNG CÁO MẪU</small><strong>NOVA<br/>LEARN</strong><span>Học kỹ năng mới.<br/>Mở lối tương lai.</span><b>Khám phá ↗</b></Link><Link to="/advertising-demo?brand=greenfarm" className="skin-right"><small>QUẢNG CÁO MẪU</small><strong>GREEN<br/>FARM</strong><span>Công nghệ xanh.<br/>Mùa vụ tốt hơn.</span><b>Tìm hiểu ↗</b></Link></div></>}
    <Outlet />
    <footer className="public-footer"><div><strong>THE PULSE</strong><Link to="/search">{t("Khám phá tin tức", "Explore news")}</Link><Link to="/premium/packages">Premium</Link><Link to="/register">{t("Hợp tác quảng cáo", "Advertising partnership")}</Link></div><span>© 2026 The Pulse</span></footer>
  </div></AdPreviewContext.Provider>;
}
