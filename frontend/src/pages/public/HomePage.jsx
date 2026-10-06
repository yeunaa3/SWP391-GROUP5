import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DemoNotice from "../../components/DemoNotice.jsx";
import AdBanner from "../../components/AdBanner.jsx";
import NewsTicker from "../../components/NewsTicker.jsx";
import NewsPhoto from "../../components/NewsPhoto.jsx";
import { getArticles } from "../../services/contentService.js";

export default function HomePage() {
  const [state, setState] = useState({ articles: [], demo: false, loading: true });
  const [source, setSource] = useState("");
  useEffect(() => { getArticles({ limit: 40 }).then(({ data, demo }) => setState({ articles: [...data].sort((a, b) => Number(Boolean(b.sourceUrl)) - Number(Boolean(a.sourceUrl))), demo, loading: false })); }, []);
  const [lead, ...more] = state.articles;
  return <main><DemoNotice show={state.demo} /><div className="public-content">
    <AdBanner position="HOME_HERO" />
    {state.loading ? <div className="loading-card">Đang tải tin…</div> : lead ? <>
      <NewsTicker articles={state.articles}/><div className="edition-heading"><div><p className="eyebrow">GÓC NHÌN MỖI NGÀY</p><h2>Thế giới đang chuyển động.</h2></div><span>Đọc tin. Hiểu sâu. Kết nối.</span></div>
      <section className="srs-lead-grid"><article className="srs-lead">
        {lead.thumbnailUrl && <img className="news-lead-photo" src={lead.thumbnailUrl} alt="" loading="eager" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = "none"; }} />}
        <p className="eyebrow">TIN NỔI BẬT · {lead.category}</p><h1>{lead.title}</h1><p>{lead.summary}</p>
        <p className="source-credit">{lead.sourceName ? `Theo ${lead.sourceName}` : "The Pulse · Nội dung mẫu"} · {new Date(lead.publishedAt).toLocaleDateString("vi-VN")}</p>
        <Link className="button-link pulse-button" to={`/articles/${lead.slug}`}>Đọc tin</Link>
      </article><aside className="most-viewed"><h2>TIN MỚI</h2><ol>{state.articles.slice(1, 6).map(article => <li key={article.id}><Link className="rail-news-link" to={`/articles/${article.slug}`}><NewsPhoto article={article}/><span>{article.title}<small className="source-credit">{article.sourceName || "The Pulse"}</small></span></Link></li>)}</ol><AdBanner position="ARTICLE_SIDEBAR" compact /></aside></section>
      <div className="editorial-tabs"><h2>Dòng tin hôm nay</h2><div>{["", "VnExpress", "Tuổi Trẻ"].map(name => <button key={name} className={source === name ? "selected" : ""} onClick={() => setSource(name)}>{name || "Tất cả"}</button>)}</div></div>
      <section className="headline-grid">{more.filter(article => !source || article.sourceName === source).slice(0, 6).map(article => <article key={article.id}>
        {article.thumbnailUrl && <Link to={`/articles/${article.slug}`}><img className="news-card-photo" src={article.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = "none"; }} /></Link>}
        <p className="eyebrow">{article.premium ? "PREMIUM · DEMO" : article.category}</p><h2><Link to={`/articles/${article.slug}`}>{article.title}</Link></h2><p>{article.summary}</p><span className="source-credit">{article.sourceName || "The Pulse · Nội dung mẫu"}</span>
      </article>)}</section><section className="premium-experience"><div><p className="eyebrow">THE PULSE PREMIUM</p><h2>Một góc nhìn sâu hơn.<br/>Một trải nghiệm riêng bạn.</h2><p>Khám phá nội dung Premium mẫu, quản lý gói đọc báo và tận hưởng không gian đọc không quảng cáo khi gói đang có hiệu lực.</p><Link className="button-link" to="/premium/packages">Khám phá các gói →</Link></div><div className="premium-orbit" aria-hidden="true"><span>P</span><small>READ BEYOND<br/>THE HEADLINES</small></div></section><AdBanner position="ARTICLE_TOP" />
      {["business", "technology", "society"].map(category => <section className="news-category-block" key={category}>
        <div className="section-heading"><h2>{({ business: "Kinh doanh", technology: "Công nghệ", society: "Thời sự" })[category]}</h2><Link to={`/search?category=${category}`}>Xem thêm →</Link></div>
        <div className="headline-grid">{state.articles.filter(a => category === "business" ? /Business|Kinh doanh/.test(a.category) : category === "technology" ? /Technology|Công nghệ/.test(a.category) : /Society|Thời sự/.test(a.category)).slice(0, 3).map(article => <article key={article.id}><Link to={`/articles/${article.slug}`}><NewsPhoto article={article}/></Link><h3><Link to={`/articles/${article.slug}`}>{article.title}</Link></h3><p>{article.summary}</p><small>{article.sourceName || "The Pulse"}</small></article>)}</div>
      </section>)}
    </> : <p>Chưa có tin. Admin có thể nhập tin trong System Settings.</p>}</div></main>;
}
