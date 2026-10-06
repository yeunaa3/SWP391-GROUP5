import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DemoNotice from "../../components/DemoNotice.jsx";
import AdBanner from "../../components/AdBanner.jsx";
import ModalShell from "../../components/ModalShell.jsx";
import ArticleAudio from "../../components/ArticleAudio.jsx";
import { useAdPreview } from "../../store/AdPreviewContext.jsx";
import { getArticle, getArticles } from "../../services/contentService.js";
import { useAuth } from "../../store/AuthContext.jsx";

export default function ArticlePage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const adPreview = useAdPreview();
  const [state, setState] = useState({ article: null, demo: false });
  const [related, setRelated] = useState([]);
  const [notice, setNotice] = useState("");
  const [fontSize, setFontSize] = useState(19);
  const [focus, setFocus] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const closePhoto = useCallback(() => setPhotoOpen(false), []);
  useEffect(() => { setState({ article: null, demo: false }); getArticle(slug).then(({ data, demo }) => setState({ article: data, demo }));
    getArticles({ limit: 6 }).then(({ data }) => setRelated(data)); }, [slug, user]);
  if (!state.article) return <main className="route-state">Đang tải tin…</main>;
  const article = state.article;
  const subscriber = user?.roles?.includes("SUBSCRIBER");
  const locked = article.premium && !subscriber;
  const paragraphs = (article.content || article.summary).split("\n\n");
  return <main className={focus ? "reader-focus" : ""}><DemoNotice show={state.demo} /><div className="public-content">
    <div className="article-breadcrumb"><Link to="/">Trang chủ</Link><span>／</span><Link to="/search">Tin tức</Link><span>／</span><span>{article.categories?.[0] || "Bài viết"}</span></div>
    {!subscriber && <AdBanner position="ARTICLE_TOP" />}
    <section className="srs-article-grid"><article className="srs-article"><p className="eyebrow">{article.categories?.join(" · ") || article.category} {article.premium && "· PREMIUM DEMO"}</p><h1>{article.title}</h1>
      <div className="article-author-row"><span className="source-avatar">{(article.sourceName || "TP").slice(0, 2).toUpperCase()}</span><div><p className="article-byline">{article.sourceName ? `Theo ${article.sourceName}` : "The Pulse · Nội dung mẫu"}</p><small>{new Date(article.publishedAt).toLocaleString("vi-VN")} · {article.sourceUrl ? "Tin từ nguồn báo" : "Bài viết mẫu"}</small></div><span className="article-access-label">{article.premium ? "PREMIUM" : "CÔNG KHAI"}</span></div>
      <div className="reader-toolbar"><span>Không gian đọc</span><div><button aria-label="Giảm cỡ chữ" disabled={fontSize <= 16} onClick={() => setFontSize(value => value - 1)}>A−</button><span>{fontSize}px</span><button aria-label="Tăng cỡ chữ" disabled={fontSize >= 26} onClick={() => setFontSize(value => value + 1)}>A+</button><button aria-pressed={focus} onClick={() => setFocus(value => !value)}>{focus ? "Thoát tập trung" : "Đọc tập trung"}</button></div></div>
      {article.thumbnailUrl && <figure><button className="article-photo-button" aria-label="Phóng to ảnh bài viết" onClick={() => setPhotoOpen(true)}><img className="news-detail-photo" src={article.thumbnailUrl} alt={article.title} referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = "none"; }} /><span>⤢ Xem ảnh lớn</span></button><figcaption>{article.sourceName ? `Ảnh trong RSS: ${article.sourceName}` : "Ảnh minh họa"}</figcaption></figure>}
      <ArticleAudio key={article.slug} article={article} locked={locked}/>
      <div style={{ fontSize }} className={locked ? "article-copy article-copy-locked" : "article-copy"}>{paragraphs.map((paragraph, index) => <div key={index}><p>{paragraph}</p>{adPreview && !locked && index === Math.floor((paragraphs.length - 1) / 2) && <AdBanner position="IN_ARTICLE"/>}</div>)}</div>
      {adPreview && <AdBanner position="END_OF_ARTICLE"/>}
      {article.sourceUrl && <section className="source-panel"><strong>Nguồn: {article.sourceName}</strong><p>Phần giới thiệu được cập nhật từ RSS. Xem toàn bộ bài viết tại trang của nguồn báo.</p><a className="button-link pulse-button" href={article.sourceUrl} target="_blank" rel="noopener noreferrer">Đọc toàn bộ tại {article.sourceName} ↗</a></section>}
      {locked ? <section className="paywall-card"><p className="eyebrow light">PREMIUM · DEMO</p><h2>Đọc tiếp với The Pulse Premium</h2><p>Bài mẫu riêng để kiểm thử quyền truy cập Premium.</p><Link className="button-link pulse-button" to="/premium/packages">Xem gói đọc báo</Link> <Link to="/login">Đăng nhập</Link></section>
        : <div className="article-actions"><button onClick={() => setNotice("Chức năng lưu bài đang được hoàn thiện.")}>Lưu bài</button><button className="secondary-button" onClick={async () => { try { await navigator.clipboard.writeText(article.sourceUrl || window.location.href); setNotice("Đã sao chép liên kết bài viết."); } catch { setNotice("Trình duyệt chưa cho phép sao chép. Bạn có thể sao chép URL trên thanh địa chỉ."); } }}>Sao chép liên kết ↗</button></div>}
      {notice && <div className="inline-feedback" role="status">{notice}<button className="feedback-close" aria-label="Đóng thông báo" onClick={() => setNotice("")}>×</button></div>}
    </article><aside className="article-rail"><h2>TIN LIÊN QUAN</h2>{related.filter(a => a.slug !== slug).map(a => <Link key={a.id} to={`/articles/${a.slug}`}>{a.title}<small className="source-credit">{a.sourceName || "The Pulse"}</small></Link>)}{!subscriber && <AdBanner position="ARTICLE_SIDEBAR" compact />}</aside></section>
  </div>{photoOpen && <ModalShell title={article.sourceName || "Ảnh bài viết"} onClose={closePhoto} className="photo-modal"><img src={article.thumbnailUrl} alt={article.title} referrerPolicy="no-referrer"/><p>{article.title}</p></ModalShell>}</main>;
}
