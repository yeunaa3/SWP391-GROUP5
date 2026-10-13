import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../services/apiClient.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import AdBanner from "../../components/AdBanner.jsx";
import "../../assets/article-search.css";

function readSearchFilters(params) {
    return {
        q: params.get("q") || "",
        category: params.get("category") || "",
        from: params.get("from") || "",
        to: params.get("to") || "",
        access: params.get("access") || "all",
        sort: params.get("sort") || "newest",
    };
}
// The browser URL uses q; the backend API expects query.
function buildSearchRequest(params) {
    const request = new URLSearchParams(readSearchFilters(params));
    request.set("query", request.get("q").trim());
    request.delete("q");
    request.set("page", params.get("page") || "0");
    request.set("size", "12");
    if (!request.get("from")) request.delete("from");
    if (!request.get("to")) request.delete("to");
    return request;
}

export default function ArticleSearchPage() {
    const [params, setParams] = useSearchParams();
    const queryString = params.toString();
    const { t, language } = usePreferences();
    const [filters, setFilters] = useState(() => readSearchFilters(params));
    const [categories, setCategories] = useState([]);
    const [categoryError, setCategoryError] = useState(false);
    const [searchResults, setSearchResults] = useState(null);
    const [error, setError] = useState("");
    const [validation, setValidation] = useState("");
    const [loading, setLoading] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    useEffect(() => {
        setFilters(readSearchFilters(new URLSearchParams(queryString)));
        setValidation("");
    }, [queryString]);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        setCategoryError(false);
        setSearchResults(null);
        const request = buildSearchRequest(new URLSearchParams(queryString));
        apiRequest(`/api/articles/search?${request}`, {
            signal: controller.signal,
        })
            .then((result) => {
                if (!controller.signal.aborted) setSearchResults(result);
            })
            .catch((e) => {
                if (!controller.signal.aborted) setError(e.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        apiRequest("/api/articles/categories", { signal: controller.signal })
            .then((result) => {
                if (!controller.signal.aborted) setCategories(result);
            })
            .catch(() => {
                if (!controller.signal.aborted) setCategoryError(true);
            });
        // Ignore requests from the previous filters after navigation or unmount.
        return () => controller.abort();
    }, [queryString, retryCount]);
    const updateFilter = (field, value) =>
        setFilters((current) => ({ ...current, [field]: value }));
    function handleSearchSubmit(event) {
        event.preventDefault();
        if (filters.from && filters.to && filters.from > filters.to) {
            setValidation(
                t(
                    "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.",
                    "End date must be on or after start date.",
                ),
            );
            return;
        }
        setValidation("");
        setParams({ ...filters, q: filters.q.trim(), page: "0" });
        setRetryCount((n) => n + 1);
    }
    function goToPage(number) {
        const next = new URLSearchParams(params);
        next.set("page", String(number));
        setParams(next);
    }
    const categoryLabels = {
        business: t("Kinh doanh", "Business"),
        technology: t("Công nghệ", "Technology"),
        society: t("Thời sự", "Society"),
        agriculture: t("Nông nghiệp", "Agriculture"),
    };
    return (
        <main className="public-content article-search">
            <header>
                <h1>{t("Tìm kiếm bài viết", "Search articles")}</h1>
                <p>
                    {t(
                        "Tìm theo tiêu đề, phần tóm tắt và lọc các bài đã xuất bản.",
                        "Search published articles by title, summary and filters.",
                    )}
                </p>
            </header>
            <form className="article-search-form" onSubmit={handleSearchSubmit}>
                <label>
                    {t("Từ khóa", "Keyword")}
                    <input
                        type="search"
                        maxLength={200}
                        value={filters.q}
                        onChange={(e) => updateFilter("q", e.target.value)}
                        placeholder={t("Nhập từ khóa…", "Enter keywords…")}
                    />
                </label>
                <label>
                    {t("Chuyên mục", "Category")}
                    <select
                        value={filters.category}
                        onChange={(e) =>
                            updateFilter("category", e.target.value)
                        }
                    >
                        <option value="">
                            {t("Tất cả chuyên mục", "All categories")}
                        </option>
                        {filters.category &&
                            !categories.some(
                                (c) => c.slug === filters.category,
                            ) && (
                                <option value={filters.category}>
                                    {categoryLabels[filters.category] ||
                                        filters.category}
                                </option>
                            )}
                        {categories.map((c) => (
                            <option key={c.slug} value={c.slug}>
                                {categoryLabels[c.slug] || c.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    {t("Đăng từ ngày", "Published from")}
                    <input
                        type="date"
                        value={filters.from}
                        onChange={(e) => updateFilter("from", e.target.value)}
                    />
                </label>
                <label>
                    {t("Đến hết ngày", "Published through")}
                    <input
                        type="date"
                        min={filters.from || undefined}
                        value={filters.to}
                        onChange={(e) => updateFilter("to", e.target.value)}
                    />
                </label>
                <label>
                    {t("Loại truy cập", "Access type")}
                    <select
                        value={filters.access}
                        onChange={(e) => updateFilter("access", e.target.value)}
                    >
                        <option value="all">
                            {t("Công khai và Premium", "Public and Premium")}
                        </option>
                        <option value="public">
                            {t("Công khai", "Public")}
                        </option>
                        <option value="premium">Premium</option>
                    </select>
                </label>
                <label>
                    {t("Sắp xếp", "Sort order")}
                    <select
                        value={filters.sort}
                        onChange={(e) => updateFilter("sort", e.target.value)}
                    >
                        <option value="newest">
                            {t("Mới nhất", "Newest")}
                        </option>
                        <option value="oldest">{t("Cũ nhất", "Oldest")}</option>
                        <option value="popular">
                            {t("Nhiều lượt xem nhất", "Most viewed")}
                        </option>
                    </select>
                </label>
                <div className="search-form-actions">
                    <button type="submit">{t("Tìm kiếm", "Search")}</button>
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                            setFilters(
                                readSearchFilters(new URLSearchParams()),
                            );
                            setParams({});
                            setValidation("");
                            setRetryCount((n) => n + 1);
                        }}
                    >
                        {t("Xóa bộ lọc", "Clear filters")}
                    </button>
                </div>
                <small className="search-date-note">
                    {t(
                        "Ngày đăng tính theo giờ Việt Nam (UTC+7).",
                        "Publication dates use Vietnam time (UTC+7).",
                    )}
                </small>
                {validation && (
                    <p role="alert" className="form-error">
                        {validation}
                    </p>
                )}
                {categoryError && (
                    <p role="alert">
                        {t(
                            "Chưa tải được chuyên mục.",
                            "Unable to load categories.",
                        )}{" "}
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setRetryCount((n) => n + 1)}
                        >
                            {t("Thử lại", "Retry")}
                        </button>
                    </p>
                )}
            </form>
            <AdBanner position="HOME_HERO" />
            <section
                aria-label={t("Kết quả tìm kiếm", "Search results")}
                aria-busy={loading}
            >
                {loading ? (
                    <p role="status" className="loading-card">
                        {t("Đang tìm…", "Searching…")}
                    </p>
                ) : error ? (
                    <div role="alert" className="form-error">
                        <p>
                            {t(
                                "Không tải được kết quả.",
                                "Unable to load results.",
                            )}{" "}
                            {error}
                        </p>
                        <button onClick={() => setRetryCount((n) => n + 1)}>
                            {t("Thử lại", "Retry")}
                        </button>
                    </div>
                ) : (
                    searchResults && (
                        <>
                            <p role="status">
                                {searchResults.totalElements}{" "}
                                {t("kết quả", "results")}
                                {params.get("q")?.trim() &&
                                    ` · “${params.get("q").trim()}”`}
                            </p>
                            {searchResults.content.length ? (
                                <div className="article-search-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>
                                                    {t("Bài viết", "Article")}
                                                </th>
                                                <th>
                                                    {t(
                                                        "Chuyên mục",
                                                        "Category",
                                                    )}
                                                </th>
                                                <th>
                                                    {t("Truy cập", "Access")}
                                                </th>
                                                <th>
                                                    {t(
                                                        "Ngày đăng",
                                                        "Published",
                                                    )}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {searchResults.content.map(
                                                (article) => (
                                                    <tr key={article.id}>
                                                        <td>
                                                            <Link
                                                                to={`/articles/${article.slug}`}
                                                            >
                                                                {article.title}
                                                            </Link>
                                                            <small>
                                                                {article.sourceName ||
                                                                    "The Pluse"}
                                                            </small>
                                                        </td>
                                                        <td>
                                                            {categoryLabels[
                                                                article.category?.toLowerCase()
                                                            ] ||
                                                                article.category}
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={
                                                                    article.premium
                                                                        ? "search-premium"
                                                                        : ""
                                                                }
                                                            >
                                                                {article.premium
                                                                    ? "Premium"
                                                                    : t(
                                                                          "Công khai",
                                                                          "Public",
                                                                      )}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <time
                                                                dateTime={
                                                                    article.publishedAt
                                                                }
                                                            >
                                                                {new Intl.DateTimeFormat(
                                                                    language ===
                                                                        "vi"
                                                                        ? "vi-VN"
                                                                        : "en-GB",
                                                                    {
                                                                        dateStyle:
                                                                            "medium",
                                                                        timeZone:
                                                                            "Asia/Ho_Chi_Minh",
                                                                    },
                                                                ).format(
                                                                    new Date(
                                                                        article.publishedAt,
                                                                    ),
                                                                )}
                                                            </time>
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="loading-card">
                                    {searchResults.totalElements
                                        ? t(
                                              "Trang này không có kết quả. Hãy về trang đầu.",
                                              "No results on this page. Return to the first page.",
                                          )
                                        : t(
                                              "Không tìm thấy bài phù hợp. Thử từ khóa hoặc bộ lọc khác.",
                                              "No matches. Try another keyword or filter.",
                                          )}
                                </p>
                            )}
                            {searchResults.totalPages > 0 && (
                                <nav
                                    className="search-pagination"
                                    aria-label={t("Phân trang", "Pagination")}
                                >
                                    <button
                                        className="secondary-button"
                                        disabled={searchResults.first}
                                        onClick={() => goToPage(0)}
                                    >
                                        {t("Trang đầu", "First")}
                                    </button>
                                    <button
                                        className="secondary-button"
                                        disabled={searchResults.first}
                                        onClick={() =>
                                            goToPage(searchResults.page - 1)
                                        }
                                    >
                                        {t("Trước", "Previous")}
                                    </button>
                                    <span>
                                        {searchResults.page <
                                        searchResults.totalPages
                                            ? `${t("Trang", "Page")} ${searchResults.page + 1} / ${searchResults.totalPages}`
                                            : t(
                                                  "Ngoài phạm vi kết quả",
                                                  "Page outside result range",
                                              )}
                                    </span>
                                    <button
                                        className="secondary-button"
                                        disabled={searchResults.last}
                                        onClick={() =>
                                            goToPage(searchResults.page + 1)
                                        }
                                    >
                                        {t("Sau", "Next")}
                                    </button>
                                </nav>
                            )}
                        </>
                    )
                )}
            </section>
        </main>
    );
}
