import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { usePreferences } from "../store/PreferencesContext.jsx";
import { useAuth } from "../store/AuthContext.jsx";
import QuickSearch from "../components/QuickSearch.jsx";
import "../assets/news-navigation.css";
import ThemeToggle from "../components/ThemeToggle.jsx";
import AdBanner from "../components/AdBanner.jsx";
import { AdPreviewContext } from "../store/AdPreviewContext.jsx";
import { useAdAllowance } from "../store/AdAllowanceContext.jsx";
import { workspaceHome } from "../utils/sessionRouting.js";

export default function PublicLayout() {
    const { user, premiumActive, premiumLoading, loading, refreshPremium } =
        useAuth();
    const { t, language } = usePreferences();
    const { adFreeActive, remainingSeconds, allowanceError, allowanceLoading } =
        useAdAllowance();
    const { pathname, search } = useLocation();
    const [topicsOpen, setTopicsOpen] = useState(false);
    useEffect(() => {
        setTopicsOpen(false);
    }, [pathname, search]);
    const [previewEnabled, setPreviewEnabled] = useState(false);
    useEffect(() => {
        refreshPremium();
    }, [pathname, refreshPremium]);
    const subscriber = adFreeActive;
    const newsPage =
        pathname === "/" ||
        pathname === "/search" ||
        pathname.startsWith("/articles/");
    const showPlacements =
        newsPage && !subscriber && !premiumLoading && !loading;
    const preview = previewEnabled && !subscriber && newsPage;
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
                        <NavLink end to="/">
                            {t("Tin tức", "News")}
                        </NavLink>
                        <NavLink to="/premium/packages">Premium</NavLink>
                        <NavLink
                            to={
                                user?.roles?.includes("BUSINESS")
                                    ? "/business"
                                    : "/register"
                            }
                        >
                            {t("Quảng cáo", "Advertise")}
                        </NavLink>
                        <NavLink to="/search">
                            {t("Tìm kiếm", "Search")}
                        </NavLink>
                    </nav>
                    <div className="public-actions">
                        <QuickSearch />
                        <ThemeToggle />
                        {premiumActive && (
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
                <nav
                    className="category-nav"
                    aria-label={t("Chuyên mục tin tức", "News categories")}
                >
                    <Link
                        to="/search?sort=newest"
                        aria-current={
                            pathname === "/search" && search === "?sort=newest"
                                ? "page"
                                : undefined
                        }
                    >
                        {t("Mới nhất", "Latest")}
                    </Link>
                    <Link to="/search?category=society">
                        {t("Thời sự", "Society")}
                    </Link>
                    <Link to="/search?category=business">
                        {t("Kinh doanh", "Business")}
                    </Link>
                    <Link to="/search?category=technology">
                        {t("Công nghệ", "Technology")}
                    </Link>
                    <Link to="/search?category=agriculture">
                        {t("Nông nghiệp", "Agriculture")}
                    </Link>
                    <button
                        type="button"
                        className="all-topics-toggle"
                        aria-expanded={topicsOpen}
                        aria-controls="all-news-topics"
                        onClick={() => setTopicsOpen((value) => !value)}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") setTopicsOpen(false);
                        }}
                    >
                        {t("Tất cả chuyên mục", "All topics")}{" "}
                        {topicsOpen ? "▴" : "▾"}
                    </button>
                </nav>
                {topicsOpen && (
                    <section
                        id="all-news-topics"
                        className="all-topics-panel"
                        aria-label={t("Tất cả chuyên mục", "All topics")}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") setTopicsOpen(false);
                        }}
                    >
                        <div>
                            <strong>
                                {t(
                                    "Bạn muốn đọc chuyên mục nào?",
                                    "Choose a news category",
                                )}
                            </strong>
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => setTopicsOpen(false)}
                            >
                                {t("Đóng", "Close")}
                            </button>
                        </div>
                        <ul>
                            {[
                                ["society", t("Thời sự", "Society")],
                                ["business", t("Kinh doanh", "Business")],
                                ["technology", t("Công nghệ", "Technology")],
                                [
                                    "agriculture",
                                    t("Nông nghiệp", "Agriculture"),
                                ],
                            ].map(([slug, label]) => (
                                <li key={slug}>
                                    <Link
                                        to={`/search?category=${slug}`}
                                        onClick={() => setTopicsOpen(false)}
                                    >
                                        {label} →
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link to="/search" onClick={() => setTopicsOpen(false)}>
                            {t(
                                "Tìm kiếm bài viết theo từ khóa →",
                                "Search articles by keyword →",
                            )}
                        </Link>
                    </section>
                )}
                {import.meta.env.DEV && newsPage && !subscriber && (
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
                {newsPage && premiumActive && (
                    <div className="premium-ad-clock" role="status">
                        {allowanceError
                            ? t(
                                  "Chưa kiểm tra được hạn mức miễn quảng cáo. Quảng cáo vẫn hiển thị.",
                                  "Ad-free allowance unavailable. Ads remain visible.",
                              )
                            : allowanceLoading
                              ? t(
                                    "Đang kiểm tra 5 phút miễn quảng cáo hôm nay…",
                                    "Checking today’s ad-free allowance…",
                                )
                              : adFreeActive
                                ? `${t("Miễn quảng cáo hôm nay còn", "Today's ad-free time remaining")}: ${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`
                                : t(
                                      "Đã dùng hết 5 phút miễn quảng cáo hôm nay. Tiện ích Premium vẫn sử dụng được.",
                                      "Today's 5 ad-free minutes are used. Premium reading tools remain available.",
                                  )}
                    </div>
                )}
                <Outlet />
                <footer className="public-footer">
                    <div>
                        <strong>THE PULSE</strong>
                        <Link to="/search">
                            {t("Khám phá tin tức", "Explore news")}
                        </Link>
                        <Link to="/premium/packages">Premium</Link>
                        <Link to="/register">
                            {t("Hợp tác quảng cáo", "Advertising partnership")}
                        </Link>
                    </div>
                    <span>© 2026 The Pulse</span>
                </footer>
            </div>
        </AdPreviewContext.Provider>
    );
}
