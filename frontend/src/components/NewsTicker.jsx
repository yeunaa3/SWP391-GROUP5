import { useState } from "react";
import { Link } from "react-router-dom";

export default function NewsTicker({ articles }) {
  const [paused, setPaused] = useState(false);
  if (!articles.length) return null;
  return <section className={`news-ticker ${paused ? "ticker-paused" : ""}`} aria-label="Dải tin mới">
    <span className="ticker-label"><i/> MỚI NHẤT</span><div className="ticker-window"><div className="ticker-track">
      {articles.slice(0, 6).map(article => <Link key={article.id} to={`/articles/${article.slug}`}><span>{article.sourceName || "THE PULSE"}</span>{article.title}<b>✦</b></Link>)}
    </div></div><button type="button" aria-label={paused ? "Chạy dải tin" : "Dừng dải tin"} onClick={() => setPaused(value => !value)}>{paused ? "▶" : "Ⅱ"}</button>
  </section>;
}
