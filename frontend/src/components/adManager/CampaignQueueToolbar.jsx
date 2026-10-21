import { useId, useRef } from "react";
import "../../assets/campaign-queue-toolbar.css";

export default function CampaignQueueToolbar({
  query, onQueryChange, order, onOrderChange,
  placeholder = "Nhập tên chiến dịch, mã hoặc doanh nghiệp",
}) {
  const id = useId();
  const searchRef = useRef(null);

  function clearSearch() {
    onQueryChange("");
    searchRef.current?.focus();
  }

  return (
    <div className="queue-toolbar">
      <div className="queue-toolbar__field">
        <label htmlFor={id + "-search"}>Tìm kiếm chiến dịch</label>
        <div className="queue-toolbar__search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" />
          </svg>
          <input ref={searchRef} id={id + "-search"} type="search" value={query}
            placeholder={placeholder} aria-describedby={id + "-hint"}
            onChange={event => onQueryChange(event.target.value)} />
          {query && <button type="button" className="queue-toolbar__clear"
            aria-label="Xóa từ khóa tìm kiếm" onClick={clearSearch}>×</button>}
        </div>
        <small id={id + "-hint"}>Tìm theo tên chiến dịch, mã hoặc doanh nghiệp</small>
      </div>
      <div className="queue-toolbar__field">
        <label htmlFor={id + "-order"}>Thứ tự gửi</label>
        <select id={id + "-order"} value={order} onChange={event => onOrderChange(event.target.value)}>
          <option value="oldest">Cũ nhất trước</option>
          <option value="newest">Mới nhất trước</option>
        </select>
      </div>
    </div>
  );
}
