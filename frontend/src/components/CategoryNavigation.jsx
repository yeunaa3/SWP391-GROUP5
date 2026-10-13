import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePreferences } from "../store/PreferencesContext.jsx";

// One list supplies both the navigation bar and the expanded category panel.
const categories = [
    { slug: "society", vi: "Thời sự", en: "Society" },
    { slug: "business", vi: "Kinh doanh", en: "Business" },
    { slug: "technology", vi: "Công nghệ", en: "Technology" },
    { slug: "agriculture", vi: "Nông nghiệp", en: "Agriculture" },
];

export default function CategoryNavigation() {
    const { t } = usePreferences();
    const { pathname, search } = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => { setIsOpen(false); }, [pathname, search]);

    function closeOnEscape(event) {
        if (event.key === "Escape") setIsOpen(false);
    }

    return <div onKeyDown={closeOnEscape}>
        <nav className="category-nav" aria-label={t("Chuyên mục tin tức", "News categories")}>
            <Link to="/news?sort=newest" aria-current={pathname === "/news" && search === "?sort=newest" ? "page" : undefined}>
                {t("Mới nhất", "Latest")}
            </Link>
            {categories.map(category => <Link key={category.slug} to={`/news?category=${category.slug}`}>
                {t(category.vi, category.en)}
            </Link>)}
            <button type="button" className="all-topics-toggle" aria-expanded={isOpen}
                aria-controls="all-news-topics" onClick={() => setIsOpen(!isOpen)}>
                {t("Tất cả chuyên mục", "All topics")} {isOpen ? "▴" : "▾"}
            </button>
        </nav>
        {isOpen && <section id="all-news-topics" className="all-topics-panel" aria-label={t("Tất cả chuyên mục", "All topics")}>
            <div>
                <strong>{t("Bạn muốn đọc chuyên mục nào?", "Choose a news category")}</strong>
                <button type="button" className="secondary-button" onClick={() => setIsOpen(false)}>{t("Đóng", "Close")}</button>
            </div>
            <ul>{categories.map(category => <li key={category.slug}>
                <Link to={`/news?category=${category.slug}`} onClick={() => setIsOpen(false)}>{t(category.vi, category.en)} →</Link>
            </li>)}</ul>
            <Link to="/search" onClick={() => setIsOpen(false)}>{t("Tìm kiếm bài viết theo từ khóa →", "Search articles by keyword →")}</Link>
        </section>}
    </div>;
}
