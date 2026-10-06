import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getArticles } from "../services/contentService.js";
import ModalShell from "./ModalShell.jsx";

export default function QuickSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const keyboard = event => {
      const typing = event.target instanceof HTMLElement && (event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName));
      if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") || (event.key === "/" && !typing)) {
        event.preventDefault(); setOpen(value => !value);
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, []);
  useEffect(() => {
    if (!open) return;
    let current = true; setLoading(true);
    const timer = setTimeout(() => getArticles({ query, limit: 5 }).then(({ data }) => {
      if (current) { setResults(data); setLoading(false); }
    }), 250);
    return () => { current = false; clearTimeout(timer); };
  }, [open, query]);
  return <>
    <button type="button" className="quick-search-trigger" aria-label="Tìm kiếm nhanh" onClick={() => setOpen(true)}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span>Tìm kiếm</span><kbd>Ctrl K</kbd>
    </button>
    {open && <ModalShell title="Khám phá The Pulse" onClose={close} className="search-modal">
      <form onSubmit={event => { event.preventDefault(); close(); navigate(`/search?q=${encodeURIComponent(query)}`); }}>
        <label className="quick-search-label">Bạn muốn đọc về điều gì?<input aria-label="Từ khóa tìm nhanh" placeholder="Nhập chủ đề, tiêu đề hoặc từ khóa…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      </form><div className="quick-search-meta"><span>{query ? "KẾT QUẢ GỢI Ý" : "TIN MỚI ĐỂ KHÁM PHÁ"}</span><small>Enter để xem tất cả · Esc để đóng</small></div>
      {loading ? <div className="search-skeleton"><i/><i/><i/></div> : <div className="quick-search-results">
        {results.map(article => <Link key={article.id} to={`/articles/${article.slug}`} onClick={close}>
          {article.thumbnailUrl && <img src={article.thumbnailUrl} alt="" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = "none"; }} />}
          <div><small>{article.sourceName || "The Pulse"} · {article.category}</small><strong>{article.title}</strong></div><span>↗</span>
        </Link>)}{!results.length && <p>Chưa có kết quả. Thử từ khóa khác nhé.</p>}
      </div>}
    </ModalShell>}
  </>;
}
