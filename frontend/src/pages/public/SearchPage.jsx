import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DemoNotice from "../../components/DemoNotice.jsx";
import AdBanner from "../../components/AdBanner.jsx";
import NewsPhoto from "../../components/NewsPhoto.jsx";
import { getArticles } from "../../services/contentService.js";
import ArticleSearchPage from "./ArticleSearchPage.jsx";

export default function SearchPage() {
    const [params] = useSearchParams();
    return !params.has("q") &&
        (params.has("category") || params.get("sort") === "newest") ? (
        <BrowseNewsPage />
    ) : (
        <ArticleSearchPage />
    );
}

function BrowseNewsPage() {
    const [params, setParams] = useSearchParams();
    const [keyword, setKeyword] = useState(params.get("q") || "");
    useEffect(() => {
        setKeyword(params.get("q") || "");
    }, [params]);
    const [state, setState] = useState({
        articles: [],
        demo: false,
        loading: true,
    });
    useEffect(() => {
        let current = true;
        setState((current) => ({ ...current, loading: true }));
        getArticles({
            query: params.get("q") || "",
            category: params.get("category") || "",
            limit: 50,
        }).then(({ data, demo }) => {
            if (current) setState({ articles: data, demo, loading: false });
        });
        return () => {
            current = false;
        };
    }, [params]);
    const query = params.get("q") || "";
    const category = params.get("category") || "";
    const categoryNames = {
        business: "Kinh doanh",
        society: "Thời sự",
        technology: "Công nghệ",
        agriculture: "Nông nghiệp",
    };
    const credit = (article) =>
        `${article.sourceName || "The Pulse · Mẫu"} · ${new Date(article.publishedAt).toLocaleDateString("vi-VN")}`;
    return (
        <main>
            <DemoNotice show={state.demo} />
            <div className="public-content search-page">
                <p className="eyebrow">KHÁM PHÁ THE PULSE</p>
                <h1>
                    {query
                        ? `Kết quả tìm kiếm cho “${query}”`
                        : category
                          ? `Tin ${categoryNames[category] || category}`
                          : params.get("sort") === "newest"
                            ? "Tin mới nhất"
                            : "Tìm kiếm bài viết"}
                </h1>
                <form
                    className="news-keyword-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        setParams({
                            ...(keyword.trim() && { q: keyword.trim() }),
                            ...(category && { category }),
                        });
                    }}
                >
                    <label htmlFor="article-search-keyword">
                        Tìm theo tiêu đề hoặc từ khóa
                    </label>
                    <div>
                        <input
                            id="article-search-keyword"
                            type="search"
                            maxLength={200}
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            placeholder="Nhập từ khóa bài viết…"
                        />
                        <button type="submit">Tìm kiếm</button>
                    </div>
                </form>
                <p className="result-count">
                    {state.loading
                        ? "Đang tìm…"
                        : `${state.articles.length} kết quả`}
                </p>
                {query && (
                    <div className="search-refinements">
                        <span>Lọc kết quả:</span>
                        {[
                            ["", "Tất cả"],
                            ["society", "Thời sự"],
                            ["business", "Kinh doanh"],
                            ["technology", "Công nghệ"],
                            ["agriculture", "Nông nghiệp"],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                className={category === value ? "selected" : ""}
                                onClick={() =>
                                    setParams({
                                        q: query,
                                        ...(value && { category: value }),
                                    })
                                }
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}
                <AdBanner position="HOME_HERO" />
                {state.loading ? (
                    <div className="loading-card">Đang tải tin và ảnh…</div>
                ) : state.articles.length ? (
                    <>
                        <section
                            className="discovery-featured"
                            aria-label="Tin nổi bật"
                        >
                            {state.articles
                                .slice(0, 3)
                                .map((article, index) => (
                                    <article
                                        key={article.id}
                                        className={
                                            index === 0
                                                ? "discovery-lead"
                                                : "discovery-side"
                                        }
                                    >
                                        <Link to={`/articles/${article.slug}`}>
                                            <NewsPhoto
                                                article={article}
                                                eager={index === 0}
                                            />
                                        </Link>
                                        <div className="discovery-copy">
                                            <p className="eyebrow">
                                                {categoryNames[
                                                    article.category?.toLowerCase()
                                                ] || article.category}
                                            </p>
                                            <h2>
                                                <Link
                                                    to={`/articles/${article.slug}`}
                                                >
                                                    {article.title}
                                                </Link>
                                            </h2>
                                            {index === 0 && (
                                                <p className="story-summary">
                                                    {article.summary}
                                                </p>
                                            )}
                                            <small className="source-credit">
                                                {credit(article)}
                                            </small>
                                        </div>
                                    </article>
                                ))}
                        </section>
                        {state.articles.length > 3 && (
                            <div className="discovery-section-label">
                                <h2>
                                    {query
                                        ? "Các kết quả khác"
                                        : categoryNames[category]
                                          ? `Tin ${categoryNames[category].toLowerCase()} mới nhất`
                                          : "Tiếp nối dòng tin"}
                                </h2>
                                <span>Góc nhìn từ các nguồn báo</span>
                            </div>
                        )}
                        <section className="discovery-grid">
                            {state.articles.slice(3).map((article) => (
                                <article key={article.id}>
                                    <Link to={`/articles/${article.slug}`}>
                                        <NewsPhoto article={article} />
                                    </Link>
                                    <div className="discovery-copy">
                                        <p className="eyebrow">
                                            {categoryNames[
                                                article.category?.toLowerCase()
                                            ] || article.category}
                                        </p>
                                        <h2>
                                            <Link
                                                to={`/articles/${article.slug}`}
                                            >
                                                {article.title}
                                            </Link>
                                        </h2>
                                        <p className="story-summary">
                                            {article.summary}
                                        </p>
                                        <small className="source-credit">
                                            {credit(article)}
                                        </small>
                                    </div>
                                </article>
                            ))}
                        </section>
                    </>
                ) : (
                    <p className="loading-card">
                        Không tìm thấy bài viết phù hợp. Thử từ khóa khác ở
                        thanh tìm kiếm phía trên.
                    </p>
                )}
            </div>
        </main>
    );
}
