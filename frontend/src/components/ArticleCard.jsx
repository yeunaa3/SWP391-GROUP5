import { Link } from "react-router-dom";

export default function ArticleCard({ article, featured = false }) {
  return (
    <article className={`article-card ${featured ? "article-card-featured" : ""}`}>
      <Link className="article-image" to={`/articles/${article.slug}`}>
        <img src={article.thumbnailUrl} alt="" />
        {article.premium && <span className="premium-badge">Premium</span>}
      </Link>
      <div className="article-card-body">
        <p className="article-meta">{article.category || article.categories?.[0] || "News"} · {Number(article.views || 0).toLocaleString()} views</p>
        <h2><Link to={`/articles/${article.slug}`}>{article.title}</Link></h2>
        <p>{article.summary}</p>
        <Link className="text-link" to={`/articles/${article.slug}`}>Read article →</Link>
      </div>
    </article>
  );
}
