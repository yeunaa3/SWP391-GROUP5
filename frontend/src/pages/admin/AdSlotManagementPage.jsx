import { useEffect, useMemo, useState } from "react";
import {
  createAdminAdSlot,
  getAdminAdSlots,
  updateAdminAdSlot,
} from "../../services/adSlotService.js";
import ModalShell from "../../components/ModalShell.jsx";

const emptyDraft = {
  positionCode: "",
  name: "",
  pageScope: "HOME",
  width: "1200",
  height: "300",
  basePrice: "7500000",
  status: "ACTIVE",
};

function money(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function date(value) {
  return value ? new Date(value).toLocaleDateString("vi-VN") : "—";
}

function makeDraft(slot) {
  return {
    positionCode: slot.positionCode,
    name: slot.name,
    pageScope: slot.pageScope || "HOME",
    width: String(slot.width),
    height: String(slot.height),
    basePrice: String(slot.basePrice),
    status: slot.status,
  };
}

/**
 * ============================================================================
 * [CFG-04] MINH HỌA TRỰC QUAN VỊ TRÍ QUẢNG CÁO (LIVE INTERACTIVE MOCKUP)
 * Mô phỏng trực tiếp layout website The Pulse theo thời gian thực:
 * - Thay đổi kích thước (width x height) -> Box quảng cáo co giãn aspect ratio tự động.
 * - Thay đổi vị trí (HOME, ARTICLE, SIDEBAR) -> Banner nhảy đúng vị trí trên giao diện mẫu.
 * - Đổi trạng thái, tên, giá -> Các chỉ số trên banner cập nhật ngay lập tức.
 * ============================================================================
 */
function AdSlotVisualMockup({ draft, setDraft }) {
  const width = Math.max(10, Number(draft.width) || 1200);
  const height = Math.max(10, Number(draft.height) || 300);
  const ratio = (width / height).toFixed(2);
  const isHome = String(draft.pageScope || draft.positionCode || "").toUpperCase().includes("HOME");
  const isSidebar = String(draft.pageScope || draft.positionCode || "").toUpperCase().includes("SIDEBAR");

  const presets = [
    { label: "1200 × 300 (Hero Banner)", w: 1200, h: 300, scope: "HOME" },
    { label: "970 × 250 (Billboard)", w: 970, h: 250, scope: "HOME" },
    { label: "728 × 90 (Leaderboard)", w: 728, h: 90, scope: "ARTICLE" },
    { label: "300 × 250 (In-Article)", w: 300, h: 250, scope: "ARTICLE" },
    { label: "300 × 600 (Half Page / Sidebar)", w: 300, h: 600, scope: "ARTICLE_SIDEBAR" },
  ];

  return (
    <div className="ad-slot-mockup-container">
      {/* Khung thanh tiêu đề trình duyệt web mẫu */}
      <div className="mockup-browser-bar">
        <div className="mockup-window-dots">
          <span className="mockup-dot red"></span>
          <span className="mockup-dot yellow"></span>
          <span className="mockup-dot green"></span>
        </div>
        <div className="mockup-browser-url">
          https://thepulse.vn/{isHome ? "trang-chu" : "articles/kinh-doanh-viet-nam-2026"}
        </div>
      </div>

      {/* Vùng hiển thị mô phỏng giao diện trang web */}
      <div className="mockup-viewport">
        {/* Header trang tin tức */}
        <div className="mockup-site-header">
          <div className="mockup-site-logo">
            THE <span>PULSE</span>
          </div>
          <div className="mockup-site-nav">
            <span>Thời sự</span>
            <span>Kinh doanh</span>
            <span>Công nghệ</span>
            <span>Góc nhìn</span>
          </div>
        </div>

        {/* Khối Banner Quảng cáo mô phỏng động */}
        {isHome ? (
          <>
            <div
              className={`mockup-ad-banner-box ${draft.status === "INACTIVE" ? "inactive" : ""}`}
              style={{
                minHeight: Math.min(150, Math.max(70, (height / width) * 360)),
              }}
            >
              <span className="mockup-banner-badge">VỊ TRÍ: {draft.positionCode || "SLOT_CODE"}</span>
              <div className="mockup-banner-title">{draft.name || "Tên vị trí quảng cáo"}</div>
              <div className="mockup-banner-specs">
                {draft.width || 0} × {draft.height || 0} px · Tỷ lệ ~{ratio}:1
              </div>
              <div className="mockup-banner-price">
                Giá niêm yết: <strong>{money(draft.basePrice)}</strong> / ngày
              </div>
            </div>

            {/* Khung tin tức trang chủ mô phỏng */}
            <div className="mockup-article-main" style={{ marginTop: "10px" }}>
              <div className="mockup-line title"></div>
              <div className="mockup-line"></div>
              <div className="mockup-line short"></div>
            </div>
          </>
        ) : isSidebar ? (
          <div className="mockup-content-grid">
            <div className="mockup-article-main">
              <div className="mockup-line title"></div>
              <div className="mockup-line"></div>
              <div className="mockup-line"></div>
              <div className="mockup-line short"></div>
              <div className="mockup-line"></div>
            </div>
            <div className="mockup-sidebar-box">
              <div
                className={`mockup-ad-banner-box ${draft.status === "INACTIVE" ? "inactive" : ""}`}
                style={{
                  minHeight: Math.min(220, Math.max(100, (height / width) * 120)),
                }}
              >
                <span className="mockup-banner-badge">SIDEBAR</span>
                <div className="mockup-banner-title" style={{ fontSize: "12px" }}>
                  {draft.name || "Sidebar Slot"}
                </div>
                <div className="mockup-banner-specs" style={{ fontSize: "10.5px" }}>
                  {draft.width || 0} × {draft.height || 0}
                </div>
                <div className="mockup-banner-price" style={{ fontSize: "11px" }}>
                  {money(draft.basePrice)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mockup-article-main">
            <div className="mockup-line title"></div>
            <div className="mockup-line"></div>
            {/* Banner trong luồng đọc bài viết */}
            <div
              className={`mockup-ad-banner-box ${draft.status === "INACTIVE" ? "inactive" : ""}`}
              style={{
                minHeight: Math.min(130, Math.max(65, (height / width) * 320)),
                margin: "8px 0",
              }}
            >
              <span className="mockup-banner-badge">IN-ARTICLE</span>
              <div className="mockup-banner-title">{draft.name || "Banner bài viết"}</div>
              <div className="mockup-banner-specs">
                {draft.width || 0} × {draft.height || 0} px · Tỷ lệ ~{ratio}:1
              </div>
              <div className="mockup-banner-price">{money(draft.basePrice)}</div>
            </div>
            <div className="mockup-line"></div>
            <div className="mockup-line short"></div>
          </div>
        )}
      </div>

      {/* Dải nút chọn nhanh kích thước chuẩn quốc tế (IAB Presets) */}
      <div style={{ padding: "12px 16px", background: "#f1f5f9", borderTop: "1px solid #cbd5e1" }}>
        <div className="preset-pills-label">Gợi ý kích thước chuẩn quốc tế (IAB):</div>
        <div className="preset-pills" style={{ marginTop: "6px" }}>
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`preset-pill-btn ${
                Number(draft.width) === p.w && Number(draft.height) === p.h ? "active" : ""
              }`}
              onClick={() => {
                setDraft((prev) => ({
                  ...prev,
                  width: String(p.w),
                  height: String(p.h),
                  pageScope: prev.pageScope || p.scope,
                }));
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdSlotManagementPage() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);

  async function loadSlots(signal) {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminAdSlots(signal);
      if (!signal?.aborted) setSlots(data);
      return data;
    } catch (requestError) {
      if (!signal?.aborted) {
        setError(requestError.message || "Không tải được danh sách vị trí quảng cáo.");
      }
      return null;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadSlots(controller.signal);
    return () => controller.abort();
  }, []);

  const visibleSlots = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return slots.filter((slot) => {
      const matchesSearch =
        !keyword ||
        `${slot.positionCode} ${slot.name} ${slot.pageScope}`
          .toLowerCase()
          .includes(keyword);

      return (
        matchesSearch &&
        (statusFilter === "ALL" || slot.status === statusFilter)
      );
    });
  }, [slots, search, statusFilter]);

  function startCreate() {
    setSelectedSlot(null);
    setDraft({ ...emptyDraft });
    setError("");
    setMessage("");
    setEditorOpen(true);
  }

  function startEdit(slot) {
    setSelectedSlot(slot);
    setDraft(makeDraft(slot));
    setError("");
    setMessage("");
    setEditorOpen(true);
  }

  function changeField(event) {
    const { name, value } = event.currentTarget;
    setDraft((current) => ({
      ...current,
      [name]: name === "positionCode" ? value.toUpperCase() : value,
    }));
  }

  async function saveSlot(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const positionCode = draft.positionCode.trim().toUpperCase();
    const name = draft.name.trim();
    const pageScope = draft.pageScope.trim();
    const width = Number(draft.width);
    const height = Number(draft.height);
    const basePrice = Number(draft.basePrice);

    if (!/^[A-Z0-9][A-Z0-9_-]{0,49}$/.test(positionCode)) {
      setError("Mã vị trí chỉ gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.");
      return;
    }

    if (
      !name ||
      !pageScope ||
      !Number.isInteger(width) ||
      width < 1 ||
      !Number.isInteger(height) ||
      height < 1 ||
      !Number.isFinite(basePrice) ||
      basePrice < 0
    ) {
      setError("Hãy nhập tên, vị trí hiển thị, kích thước hợp lệ và giá không âm.");
      return;
    }

    const payload = {
      positionCode,
      name,
      pageScope,
      width,
      height,
      basePrice,
      status: draft.status,
      ...(selectedSlot ? { updatedAt: selectedSlot.updatedAt } : {}),
    };

    setSaving(true);

    try {
      if (selectedSlot) {
        await updateAdminAdSlot(selectedSlot.id, payload);
      } else {
        await createAdminAdSlot(payload);
      }

      const latest = await getAdminAdSlots();
      setSlots(latest);
      setSelectedSlot(
        selectedSlot
          ? latest.find((slot) => slot.id === selectedSlot.id) || null
          : null
      );
      setEditorOpen(false);
      setMessage(
        selectedSlot
          ? "Đã lưu thay đổi vị trí quảng cáo."
          : "Đã tạo vị trí quảng cáo mới."
      );
    } catch (saveError) {
      setError(saveError.message || "Không lưu được. Hãy tải lại danh sách và thử lại.");
      if (saveError.status === 409) {
        const latest = await getAdminAdSlots();
        setSlots(latest);
      }
    } finally {
      setSaving(false);
    }
  }

  async function refreshAndResetEditor() {
    setLoading(true);
    setError("");

    try {
      const latest = await getAdminAdSlots();
      setSlots(latest);
      setSelectedSlot(null);
      setDraft({ ...emptyDraft });
      setEditorOpen(false);
      setMessage("Danh sách đã tải lại. Hãy chọn lại vị trí cần chỉnh sửa.");
    } catch (requestError) {
      setError(requestError.message || "Không tải được danh sách vị trí quảng cáo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-content ad-slot-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">CFG-04 · QUẢN LÝ VỊ TRÍ QUẢNG CÁO</p>
          <h1>Quản lý vị trí quảng cáo</h1>
          <p className="page-subtitle">
            Xem, tạo và chỉnh sửa cấu hình các vị trí quảng cáo trên các trang của The Pulse.
          </p>
        </div>
        <button type="button" onClick={startCreate}>＋ Tạo vị trí mới</button>
      </header>

      {message && <p className="success-message" role="status">{message}</p>}
      {error && !editorOpen && <p className="form-error" role="alert">{error}</p>}

      <section className="dashboard-section ad-slot-list">
        <div className="list-toolbar">
          <div>
            <h2>Vị trí quảng cáo ({visibleSlots.length})</h2>
            <p>Danh sách slot đã lưu trong hệ thống.</p>
          </div>
          <div className="inline-filters">
            <div className="modern-search-input-wrap" style={{ minWidth: "260px" }}>
              <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo mã, tên hoặc vị trí…"
                aria-label="Tìm vị trí quảng cáo"
              />
              {search && (
                <button
                  type="button"
                  className="modern-search-clear-btn"
                  onClick={() => setSearch("")}
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Lọc theo trạng thái"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Đã tắt</option>
            </select>
            <button
              type="button"
              className="secondary-button"
              onClick={refreshAndResetEditor}
            >
              ↻ Làm mới
            </button>
          </div>
        </div>

        {loading ? (
          <p>Đang tải danh sách vị trí...</p>
        ) : error && slots.length === 0 ? (
          <div role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => loadSlots()}>Thử tải lại</button>
          </div>
        ) : visibleSlots.length === 0 ? (
          <p>Chưa có vị trí phù hợp với bộ lọc.</p>
        ) : (
          <div className="ad-slot-table-wrap">
            <table className="ad-slot-table">
              <thead>
                <tr>
                  <th>Mã vị trí</th>
                  <th>Tên vị trí</th>
                  <th>Nơi hiển thị</th>
                  <th>Kích thước</th>
                  <th>Giá cơ bản</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleSlots.map((slot) => (
                  <tr key={slot.id}>
                    <td><strong>{slot.positionCode}</strong></td>
                    <td>{slot.name}</td>
                    <td>{slot.pageScope}</td>
                    <td>{slot.width} × {slot.height} px</td>
                    <td>{money(slot.basePrice)}</td>
                    <td>
                      <span className={`ad-slot-status status-${slot.status.toLowerCase()}`}>
                        {slot.status === "ACTIVE" ? "Đang hoạt động" : "Đã tắt"}
                      </span>
                      {slot.activeUsageCount > 0 && (
                        <small>{slot.activeUsageCount} booking/chiến dịch đang dùng</small>
                      )}
                    </td>
                    <td>{date(slot.updatedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => startEdit(slot)}
                      >
                        Chỉnh sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODAL DIALOG CHỈNH SỬA VỊ TRÍ KÈM MINH HỌA TRỰC QUAN THỜI GIAN THỰC */}
      {editorOpen && (
        <ModalShell
          title={selectedSlot ? `Chỉnh sửa vị trí: ${selectedSlot.name}` : "Tạo vị trí quảng cáo mới"}
          className="admin-modal-wide"
          onClose={() => setEditorOpen(false)}
        >
          {error && <p role="alert" className="form-error">{error}</p>}
          {selectedSlot?.activeUsageCount > 0 && (
            <div className="review-notice" style={{ marginBottom: "16px" }}>
              ⚠️ Vị trí này đang có {selectedSlot.activeUsageCount} chiến dịch đang sử dụng. Hãy thận trọng khi đổi kích thước hoặc tắt vị trí.
            </div>
          )}

          <div className="admin-split-editor">
            {/* Cột trái: Form nhập thông tin vị trí */}
            <form className="admin-editor-column" onSubmit={saveSlot}>
              <label>
                Mã vị trí (UPPERCASE)
                <input
                  name="positionCode"
                  value={draft.positionCode}
                  onChange={changeField}
                  maxLength={50}
                  placeholder="VD: HOME_HERO, ARTICLE_SIDEBAR..."
                  required
                />
              </label>

              <label>
                Tên vị trí hiển thị
                <input
                  name="name"
                  value={draft.name}
                  onChange={changeField}
                  maxLength={100}
                  placeholder="VD: Banner Đầu Trang Chủ, Banner Cột Phải..."
                  required
                />
              </label>

              <label>
                Nơi hiển thị (Page Scope)
                <input
                  name="pageScope"
                  value={draft.pageScope}
                  onChange={changeField}
                  maxLength={50}
                  placeholder="VD: HOME, ARTICLE, ARTICLE_SIDEBAR..."
                  required
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Chiều rộng (px)
                  <input
                    name="width"
                    type="number"
                    min="1"
                    step="1"
                    value={draft.width}
                    onChange={changeField}
                    required
                  />
                </label>

                <label>
                  Chiều cao (px)
                  <input
                    name="height"
                    type="number"
                    min="1"
                    step="1"
                    value={draft.height}
                    onChange={changeField}
                    required
                  />
                </label>
              </div>

              <label>
                Giá cơ bản (VND / ngày)
                <input
                  name="basePrice"
                  type="number"
                  min="0"
                  step="1"
                  value={draft.basePrice}
                  onChange={changeField}
                  required
                />
                <small style={{ color: "#059669", fontWeight: "600", marginTop: "4px" }}>
                  Giá hiển thị: {money(draft.basePrice)} / ngày
                </small>
              </label>

              <label>
                Trạng thái hoạt động
                <select name="status" value={draft.status} onChange={changeField}>
                  <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                  <option value="INACTIVE">Đã tắt (INACTIVE)</option>
                </select>
              </label>

              <div className="form-actions" style={{ marginTop: "12px" }}>
                <button type="submit" disabled={saving}>
                  {saving ? "Đang lưu..." : selectedSlot ? "Lưu thay đổi" : "Tạo vị trí"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditorOpen(false)}
                >
                  Hủy
                </button>
              </div>
            </form>

            {/* Cột phải: Minh họa trực quan layout trang web The Pulse thay đổi theo thời gian thực */}
            <AdSlotVisualMockup draft={draft} setDraft={setDraft} />
          </div>
        </ModalShell>
      )}
    </main>
  );
}
