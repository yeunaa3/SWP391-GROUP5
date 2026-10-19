import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { articleBlocks } from "../../utils/articleBlocks.js";
import DemoNotice from "../../components/DemoNotice.jsx";
import AdBanner from "../../components/AdBanner.jsx";
import ModalShell from "../../components/ModalShell.jsx";
import ArticleAudio from "../../components/ArticleAudio.jsx";
import { getArticle, getArticles } from "../../services/contentService.js";
import { useAuth } from "../../store/AuthContext.jsx";
import useReaderPolicy from "../../hooks/useReaderPolicy.js";

export default function ArticlePage() {
  const { slug } = useParams();
  const { user, premiumActive, premiumLoading } = useAuth();
  const { showAdvertising } = useReaderPolicy();
  const [state, setState] = useState({ article: null, demo: false });
  const [related, setRelated] = useState([]);
  const [notice, setNotice] = useState("");
  const [fontSize, setFontSize] = useState(19);
  const [focus, setFocus] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  useEffect(() => { 
    if (!premiumActive) setFocus(false); 
  }, [premiumActive]);

  const closePhoto = useCallback(() => setPhotoOpen(false), []);
  const accessKey = `${slug}:${user?.id || "guest"}:${premiumActive}`;

  useEffect(() => {
    let alive = true;
    setState({ article: null, demo: false });
    getArticle(slug).then(({ data, demo }) => { 
      if (alive) setState({ article: data, demo, accessKey }); 
    });
    getArticles({ limit: 6 }).then(({ data }) => { 
      if (alive) setRelated(data); 
    });
    return () => { alive = false; };
  }, [accessKey]);

  if (!state.article || state.accessKey !== accessKey || premiumLoading) {
    return <main className="route-state">Đang tải tin…</main>;
  }

  const article = state.article;
  const subscriber = !showAdvertising;
  // Free readers only get the summary; full original content requires Premium
  const locked = !premiumActive;
  const blocks = articleBlocks(article, locked);

  const summaryParagraphs = (article.summary || "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  return (
    <main className={focus && premiumActive ? "reader-focus" : ""}>
      <DemoNotice show={state.demo} />
      <div className="public-content">
        <div className="article-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>／</span>
          <Link to="/search">Tin tức</Link>
          <span>／</span>
          <span>{article.categories?.[0] || "Bài viết"}</span>
        </div>

        {/* Top Banner: Only visible for Free Readers */}
        {!subscriber && <AdBanner position="ARTICLE_TOP" />}

        <section className="srs-article-grid">
          <article className="srs-article">
            <p className="eyebrow">
              {article.categories?.join(" · ") || article.category} {article.premium && "· PREMIUM"}
            </p>
            <h1>{article.title}</h1>

            <div className="article-author-row">
              <span className="source-avatar">{(article.sourceName || "TP").slice(0, 2).toUpperCase()}</span>
              <div>
                <p className="article-byline">{article.sourceName ? `Theo ${article.sourceName}` : "The Pulse · Tin tức tổng hợp"}</p>
                <small>{new Date(article.publishedAt).toLocaleString("vi-VN")} · {article.sourceUrl ? "Tin từ nguồn báo gốc" : "Bài viết The Pulse"}</small>
              </div>
              <span className="article-access-label">{premiumActive ? "PREMIUM SUBSCRIBER" : "BẢN TÓM TẮT MIỄN PHÍ"}</span>
            </div>

            <div className="reader-toolbar">
              <span>Không gian đọc</span>
              <div>
                <button aria-label="Giảm cỡ chữ" disabled={fontSize <= 16} onClick={() => setFontSize(v => v - 1)}>A−</button>
                <span>{fontSize}px</span>
                <button aria-label="Tăng cỡ chữ" disabled={fontSize >= 26} onClick={() => setFontSize(v => v + 1)}>A+</button>
                {premiumActive ? (
                  <button aria-pressed={focus} onClick={() => setFocus(v => !v)}>
                    {focus ? "Thoát tập trung" : "✦ Đọc tập trung"}
                  </button>
                ) : (
                  <Link to="/premium/packages">✦ Đọc tập trung · Premium</Link>
                )}
              </div>
            </div>

            {/* Subscriber Status Banner */}
            {premiumActive && (
              <div className="premium-status-banner">
                <span className="premium-pill">✦ SUBSCRIBER</span>
                <span>Bạn đang đọc bài viết gốc đầy đủ không giới hạn · Trải nghiệm sạch 100% không quảng cáo</span>
              </div>
            )}

            {/* Main Thumbnail Photo */}
            {article.thumbnailUrl && (
              <figure>
                <button className="article-photo-button" aria-label="Phóng to ảnh bài viết" onClick={() => setPhotoOpen(true)}>
                  <img 
                    className="news-detail-photo" 
                    src={article.thumbnailUrl} 
                    alt={article.title} 
                    referrerPolicy="no-referrer" 
                    onError={e => { e.currentTarget.style.display = "none"; }} 
                  />
                  <span>⤢ Xem ảnh lớn</span>
                </button>
                <figcaption>{article.sourceName ? `Ảnh bài viết: ${article.sourceName}` : "Ảnh minh họa"}</figcaption>
              </figure>
            )}

            {/* Smart Summary Box: Tóm tắt toàn bộ nội dung từ bài báo gốc */}
            <section className="smart-summary-box" aria-label="Tóm tắt thông minh">
              <div className="summary-header">
                <div className="summary-title-wrap">
                  <span className="summary-icon" aria-hidden="true">✨</span>
                  <div>
                    <h2 className="summary-title">Tóm tắt toàn bộ nội dung bài viết</h2>
                    <span className="summary-subtitle">
                      {article.sourceName ? `Tổng hợp nhanh từ bài báo gốc của ${article.sourceName}` : "The Pulse AI Smart Summary"}
                    </span>
                  </div>
                </div>
                <span className={`summary-badge ${premiumActive ? "summary-badge-premium" : ""}`}>
                  {premiumActive ? "✦ Đọc nhanh 60s · Premium" : "Bản tóm tắt cho Free Reader"}
                </span>
              </div>
              <div className="summary-body">
                {summaryParagraphs.length > 0 ? (
                  summaryParagraphs.map((para, i) => <p key={i}>{para}</p>)
                ) : (
                  <p>Bản tóm tắt nội dung cốt lõi của bài viết đang được hệ thống tổng hợp tự động để độc giả nắm bắt nhanh sự việc.</p>
                )}
              </div>
              {!premiumActive && (
                <div className="summary-notice">
                  <span>💡</span>
                  <span>
                    <strong>Dành cho Độc giả Miễn phí:</strong> Bạn đang xem bản tóm tắt nội dung chính. Hãy nâng cấp <strong>The Pulse Premium</strong> để mở khóa nguyên văn toàn bộ bài báo gốc và loại bỏ 100% quảng cáo!
                  </span>
                </div>
              )}
            </section>

            {/* In-Article Banner (Under Summary for Free Readers) */}
            {!subscriber && <AdBanner position="IN_ARTICLE" />}

            {/* Audio Reader Component */}
            <ArticleAudio key={article.slug} article={article} locked={locked} />

            {/* Original Article Content: Preview + Locked for Free Readers; Full for Premium Subscribers */}
            <div style={{ fontSize }} className={locked ? "article-copy article-copy-locked" : "article-copy"}>
              {blocks.map((block, index) => (
                <div key={index}>
                  {block.type === "image" ? (
                    <figure className="source-article-figure">
                      <img 
                        loading="lazy" 
                        src={block.url} 
                        alt={block.text || article.title} 
                        referrerPolicy="no-referrer" 
                        onError={e => { e.currentTarget.style.display = "none"; }} 
                      />
                      <figcaption>{block.caption || `Ảnh: ${article.sourceName || "Báo nguồn"}`}</figcaption>
                    </figure>
                  ) : block.type === "heading" ? (
                    <h2>{block.text}</h2>
                  ) : (
                    <p>{block.text}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Premium Upsell Card (When locked for Free Readers) vs Full Article Actions (When unlocked for Subscribers) */}
            {locked ? (
              <section className="premium-upsell-card">
                <span className="upsell-tag">✦ ĐẶC QUYỀN THE PULSE PREMIUM</span>
                <h2 className="upsell-title">Đọc tiếp toàn bộ bài báo gốc với The Pulse Premium</h2>
                <p className="upsell-desc">
                  Bạn vừa xem bản tóm tắt nội dung chính. Để mở khóa 100% toàn văn bài viết gốc từ {article.sourceName || "tòa soạn báo"}, xem trọn bộ hình ảnh chất lượng cao và tận hưởng trải nghiệm <strong>đọc sạch hoàn toàn không có quảng cáo</strong>, hãy nâng cấp tài khoản ngay hôm nay!
                </p>
                <div className="upsell-benefits-grid">
                  <div className="upsell-benefit-item">
                    <span className="upsell-check">✔</span>
                    <span><strong>Toàn văn bài báo gốc:</strong> Mở khóa 100% nội dung nguyên bản từ {article.sourceName || "nguồn báo"}</span>
                  </div>
                  <div className="upsell-benefit-item">
                    <span className="upsell-check">✔</span>
                    <span><strong>100% Không quảng cáo:</strong> Loại bỏ hoàn toàn mọi biểu ngữ quảng cáo gây khó chịu trên toàn bộ web</span>
                  </div>
                  <div className="upsell-benefit-item">
                    <span className="upsell-check">✔</span>
                    <span><strong>Không gian Đọc tập trung:</strong> Chế độ đọc tối giản, tinh tế, êm dịu cho mắt</span>
                  </div>
                  <div className="upsell-benefit-item">
                    <span className="upsell-check">✔</span>
                    <span><strong>Nghe đọc bài viết AI:</strong> Trình phát giọng nói tiếng Việt mượt mà trên mọi thiết bị</span>
                  </div>
                </div>
                <div className="upsell-buttons">
                  <Link to="/premium/packages" className="upsell-cta-btn pulse-button">
                    ✦ Mua gói Premium ngay
                  </Link>
                  {!user ? (
                    <Link to="/login" className="upsell-secondary-btn">
                      Đã có tài khoản? Đăng nhập
                    </Link>
                  ) : (
                    <Link to="/profile" className="upsell-secondary-btn">
                      Quản lý tài khoản
                    </Link>
                  )}
                </div>
              </section>
            ) : (
              <div className="article-actions">
                <button onClick={() => setNotice("Chức năng lưu bài đang được hoàn thiện.")}>Lưu bài</button>
                <button 
                  className="secondary-button" 
                  onClick={async () => { 
                    try { 
                      await navigator.clipboard.writeText(article.sourceUrl || window.location.href); 
                      setNotice("Đã sao chép liên kết bài viết."); 
                    } catch { 
                      setNotice("Trình duyệt chưa cho phép sao chép. Bạn có thể sao chép URL trên thanh địa chỉ."); 
                    } 
                  }}
                >
                  Sao chép liên kết ↗
                </button>
              </div>
            )}

            {/* End of Article Banner: Only visible for Free Readers */}
            {!subscriber && <AdBanner position="END_OF_ARTICLE" />}

            {/* Original Source Credit */}
            {article.sourceUrl && (
              <section className="source-panel">
                <strong>Nguồn: {article.sourceName}</strong>
                <p>
                  Bài viết được tổng hợp từ nguồn báo gốc. Xem toàn bộ bài viết tại trang của nguồn báo hoặc đăng ký The Pulse Premium để đọc ngay trên ứng dụng.
                </p>
                <a className="button-link pulse-button" href={article.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Đọc toàn bộ tại {article.sourceName} ↗
                </a>
              </section>
            )}

            {notice && (
              <div className="inline-feedback" role="status">
                {notice}
                <button className="feedback-close" aria-label="Đóng thông báo" onClick={() => setNotice("")}>×</button>
              </div>
            )}
          </article>

          {/* Right Rail: Related Articles + Sidebar Ad (Only for Free Readers) */}
          <aside className="article-rail">
            <h2>TIN LIÊN QUAN</h2>
            {related.filter(a => a.slug !== slug).map(a => (
              <Link key={a.id} to={`/articles/${a.slug}`}>
                {a.title}
                <small className="source-credit">{a.sourceName || "The Pulse"}</small>
              </Link>
            ))}
            {!subscriber && <AdBanner position="ARTICLE_SIDEBAR" compact />}
          </aside>
        </section>
      </div>

      {photoOpen && (
        <ModalShell title={article.sourceName || "Ảnh bài viết"} onClose={closePhoto} className="photo-modal">
          <img src={article.thumbnailUrl} alt={article.title} referrerPolicy="no-referrer" />
          <p>{article.title}</p>
        </ModalShell>
      )}
    </main>
  );
}
