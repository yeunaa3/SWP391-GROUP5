import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getBookmarkStatus,
  removeBookmark,
  saveBookmark,
} from "../services/bookmarkService.js";
import { useAuth } from "../store/AuthContext.jsx";
import "../assets/bookmark-button.css";

function BookmarkIcon({ saved = false }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={saved ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />
    </svg>
  );
}

export default function BookmarkButton({ articleId }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <Link
        to="/login"
        className="reader-bookmark-button"
        aria-label="Đăng nhập để lưu bài"
        title="Đăng nhập để lưu bài"
      >
        <BookmarkIcon />
      </Link>
    );
  }

  const canBookmark = user.roles?.some(role =>
    ["READER", "SUBSCRIBER"].includes(role),
  );

  if (!canBookmark) return null;

  // A different account/article starts with a fresh bookmark state.
  return <BookmarkControl key={`${user.id}:${articleId}`} articleId={articleId} />;
}

function BookmarkControl({ articleId }) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
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

    getBookmarkStatus(articleId, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setSaved(data.saved);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("Không kiểm tra được trạng thái lưu bài.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [articleId, retryCount]);

  async function toggleBookmark() {
    if (mutationInProgress.current || loading || error) return;

    mutationInProgress.current = true;
    setLoading(true);
    setError("");

    try {
      if (saved) {
        await removeBookmark(articleId);
      } else {
        await saveBookmark(articleId);
      }

      if (isMounted.current) setSaved(value => !value);
    } catch {
      if (isMounted.current) {
        setError("Chưa lưu được thay đổi. Hãy kiểm tra lại trạng thái trước khi thử tiếp.");
      }
    } finally {
      mutationInProgress.current = false;
      if (isMounted.current) setLoading(false);
    }
  }

  const label = loading ? "Đang xử lý lưu bài" : saved ? "Bỏ lưu bài" : "Lưu bài";

  return (
    <span className="reader-bookmark">
      <button
        type="button"
        className="reader-bookmark-button"
        disabled={loading || Boolean(error)}
        aria-label={label}
        title={label}
        aria-pressed={saved}
        aria-busy={loading}
        onClick={toggleBookmark}
      >
        <BookmarkIcon saved={saved} />
      </button>
      {error && (
        <span className="reader-bookmark-feedback" role="alert">
          {error}
          <button
            type="button"
            disabled={loading}
            onClick={() => setRetryCount(value => value + 1)}
          >
            Thử lại
          </button>
        </span>
      )}
    </span>
  );
}
