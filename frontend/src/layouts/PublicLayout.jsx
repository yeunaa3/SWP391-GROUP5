import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { usePreferences } from "../store/PreferencesContext.jsx";
import { useAuth } from "../store/AuthContext.jsx";
import QuickSearch from "../components/QuickSearch.jsx";
import CategoryNavigation from "../components/CategoryNavigation.jsx";
import "../assets/news-navigation.css";
import ThemeToggle from "../components/ThemeToggle.jsx";
import AdBanner from "../components/AdBanner.jsx";
import { AdPreviewContext } from "../store/AdPreviewContext.jsx";
import useReaderPolicy from "../hooks/useReaderPolicy.js";
import { workspaceHome } from "../utils/sessionRouting.js";
import AccountMenu from "../components/AccountMenu.jsx";
import NotificationBell from "../components/NotificationBell.jsx";

export default function PublicLayout() {
    const { user, premiumActive, refreshPremium } =
        useAuth();
    const { t, language } = usePreferences();
    const { readerNavigation, showAdvertising } = useReaderPolicy();
    const { pathname } = useLocation();
    const [previewEnabled, setPreviewEnabled] = useState(false);
    useEffect(() => {
        refreshPremium();
    }, [pathname, refreshPremium]);
    const newsPage =
        pathname === "/" ||
        pathname === "/search" ||
        pathname === "/news" ||
        pathname.startsWith("/articles/");
    const showPlacements =
        newsPage && showAdvertising;
    const preview = previewEnabled && showAdvertising && newsPage;
    const workspace = workspaceHome(user);
    return (
        <AdPreviewContext.Provider value={preview}>
            <div className={`site-shell ${preview ? "ad-preview-on" : ""}`}>
                <div className="utility-bar">
                    <span>
                        {new Intl.DateTimeFormat(
                            language === "vi" ? "vi-VN" : "en-GB",
                            { dateStyle: "full", timeZone: "Asia/Ho_Chi_Minh" },
                        ).format(new Date())}
                    </span>
                    <span className="live-edition">
                        <i />{" "}
                        {t(
                            "Góc nhìn mỗi ngày",
                            "A fresh perspective, every day",
                        )}
                    </span>
                </div>
                <header className="public-header">
                    <Link className="brand" to="/">
                        THE PULSE
                        <span className="brand-caption">
                            NEWS & PERSPECTIVES
                        </span>
                    </Link>
                    <nav aria-label="Primary navigation">
                        <Link to="/" className={pathname === "/" || pathname === "/news" || pathname.startsWith("/articles/") ? "active" : undefined}>
                            {t("Tin tức", "News")}
                        </Link>
                        {readerNavigation && <NavLink to="/premium/packages">Premium</NavLink>}
                    </nav>
                    <div className="public-actions">
                        <QuickSearch />
                        <ThemeToggle />
                        {user && <NotificationBell />}
                        {user && <AccountMenu />}
                        {readerNavigation && premiumActive && (
                            <Link
                                className="premium-header-badge"
                                to="/premium/packages"
                            >
                                ✦ Premium
                            </Link>
                        )}
                        {user ? (
                            <Link
                                className="button-link pulse-button"
                                to={workspace}
                            >
                                {t("Không gian làm việc", "Workspace")} ↗
                            </Link>
                        ) : (
                            <Link
                                className="button-link pulse-button"
                                to="/login"
                            >
                                {t("Đăng nhập", "Sign in")}
                            </Link>
                        )}
                    </div>
                </header>
                {pathname !== "/search" && <CategoryNavigation />}
                {import.meta.env.DEV && newsPage && showAdvertising && (
                    <div className="ad-preview-switch">
                        <span>
                            {preview
                                ? "Đang xem thử nhiều vị trí quảng cáo · 3 mẫu xoay mỗi 4 giây"
                                : "Đang dùng quảng cáo từ chiến dịch trong DB"}
                        </span>
                        <button
                            aria-pressed={previewEnabled}
                            onClick={() => setPreviewEnabled((value) => !value)}
                        >
                            {previewEnabled
                                ? "Tắt xem thử"
                                : "Bật xem thử quảng cáo"}
                        </button>
                    </div>
                )}
                {showPlacements && (
                    <>
                        <div className="public-content public-preview-top">
                            <AdBanner position="HEADER_BANNER" />
                        </div>
                        <div
                            className="ad-skin house-skin"
                            aria-label="Tự giới thiệu The Pluse"
                        >
                            <Link to="/search" className="skin-left">
                                <small>THE PLUSE</small>
                                <strong>
                                    TIN
                                    <br />
                                    MỖI NGÀY
                                </strong>
                                <span>
                                    Tin tức mới.
                                    <br />
                                    Góc nhìn mới.
                                </span>
                                <b>Khám phá ↗</b>
                            </Link>
                            <Link to="/premium/packages" className="skin-right">
                                <small>THE PLUSE</small>
                                <strong>
                                    ĐỌC
                                    <br />
                                    PREMIUM
                                </strong>
                                <span>
                                    Đọc tập trung.
                                    <br />
                                    Nghe bài viết.
                                </span>
                                <b>Tìm hiểu ↗</b>
                            </Link>
                        </div>
                    </>
                )}
                <Outlet />
                <footer className="public-footer">
                    <div>
                        <strong>THE PULSE</strong>
                        <Link to="/search">
                            {t("Khám phá tin tức", "Explore news")}
                        </Link>
                        {readerNavigation && <Link to="/premium/packages">Premium</Link>}
                    </div>
                    <span>© 2026 The Pulse</span>
                </footer>
            </div>
        </AdPreviewContext.Provider>
    );
}
