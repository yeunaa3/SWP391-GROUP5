import { useEffect, useMemo, useState } from "react";
import {
  createAdminAdSlot,
  getAdminAdSlots,
  updateAdminAdSlot,
} from "../../services/adSlotService.js";

const emptyDraft = {
  positionCode: "",
  name: "",
  pageScope: "",
  width: "",
  height: "",
  basePrice: "",
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
    pageScope: slot.pageScope,
    width: String(slot.width),
    height: String(slot.height),
    basePrice: String(slot.basePrice),
    status: slot.status,
  };
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

    if (!name || !pageScope || !Number.isInteger(width) || width < 1 ||
      !Number.isInteger(height) || height < 1 ||
      !Number.isFinite(basePrice) || basePrice < 0) {
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
          : null,
      );
      setEditorOpen(false);
      setMessage(
        selectedSlot
          ? "Đã lưu thay đổi vị trí quảng cáo."
          : "Đã tạo vị trí quảng cáo mới.",
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
          <p className="eyebrow">CFG-04 · QUẢN TRỊ</p>
          <h1>Quản lý vị trí quảng cáo</h1>
          <p className="page-subtitle">
            Xem, tạo và chỉnh sửa cấu hình các vị trí quảng cáo.
          </p>
        </div>
        <button type="button" onClick={startCreate}>Tạo vị trí mới</button>
      </header>

      {message && <p role="status">{message}</p>}

      <section className="dashboard-section ad-slot-list">
        <div className="list-toolbar">
          <div>
            <h2>Vị trí quảng cáo ({visibleSlots.length})</h2>
            <p>Danh sách slot đã lưu trong hệ thống.</p>
          </div>
          <div className="inline-filters">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo mã, tên hoặc vị trí"
              aria-label="Tìm vị trí quảng cáo"
            />
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
              Làm mới
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
                  <th>Mã vị trí</th><th>Tên vị trí</th><th>Nơi hiển thị</th>
                  <th>Kích thước</th><th>Giá cơ bản</th><th>Trạng thái</th>
                  <th>Cập nhật</th><th>Thao tác</th>
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

      {error && slots.length > 0 && <p role="alert">{error}</p>}

      {editorOpen && (
        <section className="dashboard-section ad-slot-editor">
          <h2>{selectedSlot ? "Chỉnh sửa vị trí" : "Tạo vị trí mới"}</h2>
          {selectedSlot?.activeUsageCount > 0 && (
            <p>
              Slot đang được booking/chiến dịch sử dụng. Backend sẽ chặn thao tác
              tắt không an toàn.
            </p>
          )}

          <form className="ad-slot-form" onSubmit={saveSlot}>
            <label>
              Mã vị trí
              <input name="positionCode" value={draft.positionCode} onChange={changeField} maxLength={50} required />
            </label>
            <label>
              Tên vị trí
              <input name="name" value={draft.name} onChange={changeField} maxLength={100} required />
            </label>
            <label>
              Nơi hiển thị
              <input name="pageScope" value={draft.pageScope} onChange={changeField} maxLength={50} required />
            </label>
            <label>
              Chiều rộng (px)
              <input name="width" type="number" min="1" step="1" value={draft.width} onChange={changeField} required />
            </label>
            <label>
              Chiều cao (px)
              <input name="height" type="number" min="1" step="1" value={draft.height} onChange={changeField} required />
            </label>
            <label>
              Giá cơ bản (VND)
              <input name="basePrice" type="number" min="0" step="1" value={draft.basePrice} onChange={changeField} required />
            </label>
            <label>
              Trạng thái
              <select name="status" value={draft.status} onChange={changeField}>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Đã tắt</option>
              </select>
            </label>

            <div className="ad-slot-form-actions">
              <button type="button" className="secondary-button" onClick={() => setEditorOpen(false)}>
                Hủy
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : selectedSlot ? "Lưu thay đổi" : "Tạo vị trí"}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}