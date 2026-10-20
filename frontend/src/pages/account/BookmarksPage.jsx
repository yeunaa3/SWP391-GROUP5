import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getBookmarks, removeBookmark } from "../../services/bookmarkService.js";
import { useAuth } from "../../store/AuthContext.jsx";

const PAGE_SIZE = 10;

export default function BookmarksPage() {
  const { user } = useAuth();

  // Remount the list when the signed-in account changes.
  return <BookmarkList key={user?.id} />;
}

function SavedArticle({ article, removing, disabled, onRemove }) {
  return (
    <li>
      <h2>
        <Link to={`/articles/${encodeURIComponent(article.slug)}`}>
          {article.title}
        </Link>
      </h2>
      <p>{article.category || "Tin tức"}{article.premium && " · Premium"}</p>
      <p>
        Đã lưu:{" "}
        <time dateTime={article.savedAt}>
          {new Date(article.savedAt).toLocaleString("vi-VN")}
        </time>
      </p>
      <button disabled={disabled} onClick={() => onRemove(article.id)}>
        {removing ? "Đang bỏ lưu…" : "Bỏ lưu"}
      </button>
    </li>
  );
}

function BookmarkList() {
  const [data, setData] = useState({ items: [], hasNext: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [page, setPage] = useState(0);
  const [reloadCount, setReloadCount] = useState(0);
  const [removingId, setRemovingId] = useState(null);
  const isMounted = useRef(false);
  const mutationInProgress = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    getBookmarks(page, PAGE_SIZE, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("Không tải được bài viết đã lưu.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadCount, page]);

  async function handleRemove(articleId) {
    if (mutationInProgress.current) return;

    mutationInProgress.current = true;
    setRemovingId(articleId);
    setFeedback("");

    try {
      await removeBookmark(articleId);
      if (!isMounted.current) return;

      setFeedback("Đã bỏ lưu bài viết.");

      if (data.items.length === 1 && page > 0) {
        setPage(value => value - 1);
      } else {
        setReloadCount(value => value + 1);
      }
    } catch {
      if (isMounted.current) {
        setFeedback("Không thể bỏ lưu. Vui lòng thử lại.");
      }
    } finally {
      mutationInProgress.current = false;
      if (isMounted.current) setRemovingId(null);
    }
  }

  const removing = removingId !== null;

  return (
    <main className="page-content">
      <header className="page-heading">
        <div>
          <p className="eyebrow">ACC-03 · UC-10</p>
          <h1>Bài viết đã lưu</h1>
          <p>Lưu bài để đọc lại. Quyền đọc toàn văn phụ thuộc gói Premium còn hiệu lực.</p>
        </div>
        <Link to="/search" className="secondary-button">Tìm bài viết</Link>
      </header>

      {feedback && <p role="status">{feedback}</p>}
      {loading && <p role="status">Đang tải…</p>}
      {!loading && error && (
        <div role="alert">
          {error}
          <button onClick={() => setReloadCount(value => value + 1)}>Thử lại</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="dashboard-section">
            {data.items.length === 0 ? (
              <>
                <h2>Chưa có bài viết</h2>
                <p>Các bài đã lưu đang được xuất bản sẽ hiển thị tại đây.</p>
              </>
            ) : (
              <ul>
                {data.items.map(article => (
                  <SavedArticle
                    key={article.id}
                    article={article}
                    removing={removingId === article.id}
                    disabled={removing}
                    onRemove={handleRemove}
                  />
                ))}
              </ul>
            )}
          </section>

          <nav aria-label="Phân trang bài đã lưu" className="article-actions">
            <button disabled={page === 0 || removing} onClick={() => setPage(value => value - 1)}>
              Trang trước
            </button>
            <span aria-live="polite">Trang {page + 1}</span>
            <button disabled={!data.hasNext || removing} onClick={() => setPage(value => value + 1)}>
              Trang sau
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
