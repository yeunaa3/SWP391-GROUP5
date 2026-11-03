import { useEffect, useMemo, useState } from "react";
import {
  createAdminB2bPackage,
  getAdminB2bPackages,
  updateAdminB2bPackage,
} from "../../services/b2bPackageAdminService.js";
import ModalShell from "../../components/ModalShell.jsx";

const emptyForm = {
  code: "",
  name: "",
  price: "15000000",
  durationDays: "30",
  impressionsQuota: "100000",
  description: "",
  status: "ACTIVE",
};

const STANDARD_PACKAGES = [
  {
    code: "STARTER_30D",
    name: "Gói Khởi Động 30 Ngày",
    durationDays: 30,
    impressionsQuota: 100000,
    price: 15000000,
    description: "Gói cơ bản tiếp cận 100.000 lượt xem trong 30 ngày cho các doanh nghiệp vừa và nhỏ.",
    label: "STARTER_30D · Khởi động (30 ngày · 100k lượt · 15 triệu)",
  },
  {
    code: "GROWTH_30D",
    name: "Gói Tăng Trưởng 30 Ngày",
    durationDays: 30,
    impressionsQuota: 250000,
    price: 30000000,
    description: "Gói mở rộng tối ưu tương tác với 250.000 lượt hiển thị chất lượng cao trên các chuyên mục.",
    label: "GROWTH_30D · Tăng trưởng (30 ngày · 250k lượt · 30 triệu)",
  },
  {
    code: "ENTERPRISE_60D",
    name: "Gói Doanh Nghiệp 60 Ngày",
    durationDays: 60,
    impressionsQuota: 500000,
    price: 55000000,
    description: "Gói phủ sóng thương hiệu liên tục 60 ngày với 500.000 impressions đa vị trí.",
    label: "ENTERPRISE_60D · Doanh nghiệp (60 ngày · 500k lượt · 55 triệu)",
  },
  {
    code: "PREMIUM_VIP_90D",
    name: "Gói Toàn Diện VIP 90 Ngày",
    durationDays: 90,
    impressionsQuota: 1000000,
    price: 99000000,
    description: "Gói đối tác chiến lược 90 ngày với 1.000.000 lượt hiển thị cao cấp, ưu tiên phân bổ tối đa.",
    label: "PREMIUM_VIP_90D · VIP (90 ngày · 1.000k lượt · 99 triệu)",
  },
];

const DURATION_PRESETS = [7, 14, 30, 60, 90, 180];
const QUOTA_PRESETS = [50000, 100000, 250000, 500000, 1000000, 2000000];
const PACKAGE_PRICE_PRESETS = [10000000, 15000000, 30000000, 55000000, 99000000];

function money(value, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function updatedDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "—";
}

function statusLabel(status) {
  if (status === "ACTIVE") return "Đang hoạt động";
  if (status === "DRAFT") return "Bản nháp";
  return "Đã tắt";
}

function formFrom(item) {
  return {
    code: item.code,
    name: item.name,
    price: String(item.price),
    durationDays: String(item.durationDays),
    impressionsQuota: String(item.impressionsQuota),
    description: item.description || "",
    status: item.status,
  };
}

/**
 * ============================================================================
 * [CFG-05] THẺ XEM TRƯỚC GÓI QUẢNG CÁO B2B (LIVE CARD PREVIEW)
 * ============================================================================
 */
function B2bPackageVisualCard({ form }) {
  const price = Number(form.price) || 0;
  const quota = Math.max(1, Number(form.impressionsQuota) || 1);
  const duration = Math.max(1, Number(form.durationDays) || 30);
  const cpm = Math.round((price / quota) * 1000);
  const dailyPacing = Math.round(quota / duration);
  const isActive = form.status === "ACTIVE";
  const isDraft = form.status === "DRAFT";

  return (
    <div className="b2b-package-preview-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className={`b2b-card-badge ${!isActive ? "inactive" : ""}`}>
          {isActive ? "✦ ĐANG HOẠT ĐỘNG" : isDraft ? "✎ BẢN NHÁP" : "⊘ ĐÃ TẮT"}
        </span>
        <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace", letterSpacing: "0.05em" }}>
          {form.code || "MÃ_GÓI"}
        </span>
      </div>

      <div>
        <h3 className="b2b-card-title">{form.name || "Tên gói quảng cáo"}</h3>
        <p style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "6px", lineHeight: "1.5" }}>
          {form.description || "Gói quảng cáo tiêu chuẩn hiển thị trên toàn mạng lưới The Pulse."}
        </p>
      </div>

      <div className="b2b-card-price-row">
        <strong>{money(price, "VND")}</strong>
        <span>/ {duration} ngày hiển thị</span>
      </div>

      <div className="b2b-card-metrics-grid">
        <div className="b2b-metric-item">
          <span>Hạn mức hiển thị</span>
          <strong>{Number(quota).toLocaleString("vi-VN")} lượt</strong>
        </div>
        <div className="b2b-metric-item">
          <span>Đơn giá CPM ước tính</span>
          <strong>{money(cpm, "VND")} <small style={{ fontSize: "10px", fontWeight: "normal", color: "#94a3b8" }}>/1k lượt</small></strong>
        </div>
        <div className="b2b-metric-item">
          <span>Phân bổ trung bình</span>
          <strong>~{Number(dailyPacing).toLocaleString("vi-VN")} lượt/ngày</strong>
        </div>
        <div className="b2b-metric-item">
          <span>Thời hạn chiến dịch</span>
          <strong>{duration} ngày liên tục</strong>
        </div>
      </div>

      <ul className="b2b-card-features">
        <li>✓ Tự động xoay vòng carousel trên các vị trí đã đặt</li>
        <li>✓ Báo cáo thời gian thực về lượt hiển thị & lượt click</li>
        <li>✓ Cam kết phân bổ đúng hạn mức {Number(quota).toLocaleString("vi-VN")} impressions</li>
      </ul>
    </div>
  );
}

export default function B2bPackageManagementPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function loadPackages(signal) {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminB2bPackages(signal);
      if (!signal?.aborted) setPackages(data);
    } catch (requestError) {
      if (!signal?.aborted) {
        setError(requestError.message || "Không tải được danh sách gói quảng cáo.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadPackages(controller.signal);
    return () => controller.abort();
  }, []);

  const visiblePackages = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return packages.filter((item) => {
      const matchesSearch =
        !keyword ||
        `${item.code} ${item.name}`.toLowerCase().includes(keyword);
      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [packages, search, statusFilter]);

  function openCreate() {
    setEditingPackage(null);
    setForm({ ...emptyForm });
    setError("");
    setNotice("");
    setEditorOpen(true);
  }

  function openEdit(item) {
    setEditingPackage(item);
    setForm(formFrom(item));
    setError("");
    setNotice("");
    setEditorOpen(true);
  }

  function changeField(event) {
    const { name, value } = event.currentTarget;
    setForm((current) => ({
      ...current,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  }

  function handleSelectTemplate(e) {
    const code = e.target.value;
    if (!code) return;
    const found = STANDARD_PACKAGES.find((p) => p.code === code);
    if (found) {
      setForm((current) => ({
        ...current,
        code: found.code,
        name: found.name,
        durationDays: String(found.durationDays),
        impressionsQuota: String(found.impressionsQuota),
        price: String(found.price),
        description: found.description,
      }));
    }
  }

  function applyPreset(field, val) {
    setForm((current) => ({
      ...current,
      [field]: String(val),
    }));
  }

  async function savePackage(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const price = Number(form.price);
    const durationDays = Number(form.durationDays);
    const impressionsQuota = Number(form.impressionsQuota);

    if (!/^[A-Z0-9][A-Z0-9_-]{0,49}$/.test(code)) {
      setError("Mã gói phải gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.");
      return;
    }

    if (
      !name ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(durationDays) ||
      durationDays < 1 ||
      !Number.isInteger(impressionsQuota) ||
      impressionsQuota < 1
    ) {
      setError("Hãy kiểm tra tên, giá, thời hạn và hạn mức impressions.");
      return;
    }

    const payload = {
      code,
      name,
      price,
      durationDays,
      impressionsQuota,
      description: form.description.trim(),
      status: form.status,
      ...(editingPackage ? { updatedAt: editingPackage.updatedAt } : {}),
    };

    setSaving(true);

    try {
      if (editingPackage) {
        await updateAdminB2bPackage(editingPackage.id, payload);
      } else {
        await createAdminB2bPackage(payload);
      }

      await loadPackages();
      setEditorOpen(false);
      setNotice(
        editingPackage ? "Đã lưu thay đổi gói quảng cáo." : "Đã tạo gói quảng cáo mới.",
      );
    } catch (saveError) {
      setError(saveError.message || "Không lưu được gói. Hãy kiểm tra dữ liệu và thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-content ad-slot-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">CFG-05 · Quản Lý Gói Quảng Cáo</p>
          <h1>B2B Package and Pricing Management</h1>
          <p className="page-subtitle">
            Quản lý thời hạn, hạn mức impressions, giá và trạng thái gói quảng cáo B2B.
          </p>
        </div>
        <button type="button" onClick={openCreate}>＋ Tạo gói mới</button>
      </header>

      {notice && <p role="status" className="notice-banner">{notice}</p>}

      <section className="dashboard-section ad-slot-list">
        <div className="list-toolbar">
          <div>
            <h2>Gói quảng cáo ({visiblePackages.length})</h2>
            <p>Danh sách gói B2B và trạng thái hiện tại.</p>
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
                placeholder="Tìm theo mã hoặc tên gói…"
                aria-label="Tìm gói quảng cáo"
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
              <option value="DRAFT">Bản nháp</option>
              <option value="INACTIVE">Đã tắt</option>
            </select>
            <button
              type="button"
              className="secondary-button"
              onClick={() => loadPackages()}
            >
              Làm mới
            </button>
          </div>
        </div>

        {loading ? (
          <p>Đang tải danh sách gói...</p>
        ) : error && packages.length === 0 ? (
          <div role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => loadPackages()}>Thử tải lại</button>
          </div>
        ) : visiblePackages.length === 0 ? (
          <p>Chưa có gói phù hợp với bộ lọc.</p>
        ) : (
          <div className="ad-slot-table-wrap">
            <table className="ad-slot-table">
              <thead>
                <tr>
                  <th>Mã gói</th>
                  <th>Tên gói</th>
                  <th>Thời hạn</th>
                  <th>Hạn mức impressions</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visiblePackages.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.code}</strong></td>
                    <td>
                      {item.name}
                      {item.description && <small>{item.description}</small>}
                    </td>
                    <td>{item.durationDays} ngày</td>
                    <td>{Number(item.impressionsQuota).toLocaleString("vi-VN")}</td>
                    <td>{money(item.price, item.currency)}</td>
                    <td>
                      <span className={`ad-slot-status status-${String(item.status).toLowerCase()}`}>
                        {statusLabel(item.status)}
                      </span>
                      {item.activeContractCount > 0 && (
                        <small>{item.activeContractCount} hợp đồng đang chạy</small>
                      )}
                    </td>
                    <td>{updatedDate(item.updatedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => openEdit(item)}
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

      {error && packages.length > 0 && <p role="alert" className="form-error">{error}</p>}

      {/* MODAL BIÊN TẬP VÀ XEM TRƯỚC GÓI QUẢNG CÁO B2B TRỰC QUAN */}
      {editorOpen && (
        <ModalShell
          title={editingPackage ? `Chỉnh sửa gói: ${editingPackage.name}` : "Tạo gói quảng cáo B2B mới"}
          className="admin-modal-wide"
          onClose={() => {
            setEditorOpen(false);
            setError("");
          }}
        >
          <div className="admin-split-editor">
            {/* Cột trái: Form nhập liệu */}
            <form className="ad-slot-form" onSubmit={savePackage}>
              {error && <p role="alert" className="form-error">{error}</p>}

              {/* LỰA CHỌN GÓI MẪU CÓ SẴN */}
              <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "6px", display: "block" }}>
                  ⚡ Chọn nhanh mẫu gói (Tự động điền đầy đủ cấu hình):
                </label>
                <select
                  defaultValue=""
                  onChange={handleSelectTemplate}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #94a3b8", fontSize: "13px", background: "#ffffff" }}
                >
                  <option value="">-- Bấm vào đây để chọn gói mẫu --</option>
                  {STANDARD_PACKAGES.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <label>
                Mã gói (In hoa, không dấu)
                <input
                  name="code"
                  value={form.code}
                  onChange={changeField}
                  maxLength={50}
                  placeholder="VD: STARTER_30D"
                  required
                />
              </label>

              <label>
                Tên gói quảng cáo
                <input
                  name="name"
                  value={form.name}
                  onChange={changeField}
                  maxLength={100}
                  placeholder="VD: Gói Doanh Nghiệp Khởi Động"
                  required
                />
              </label>

              {/* CHỌN NHANH GIÁ GÓI */}
              <label>
                Giá gói (VND)
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", margin: "6px 0 8px" }}>
                  {PACKAGE_PRICE_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`preset-pill-btn ${Number(form.price) === p ? "active" : ""}`}
                      onClick={() => applyPreset("price", p)}
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                    >
                      {money(p)}
                    </button>
                  ))}
                </div>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="1000"
                  value={form.price}
                  onChange={changeField}
                  required
                />
              </label>

              {/* CHỌN NHANH THỜI HẠN */}
              <div className="preset-pills-wrap">
                <span className="preset-pills-label">Thời hạn chiến dịch:</span>
                <div className="preset-pills">
                  {DURATION_PRESETS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      className={`preset-pill-btn ${form.durationDays === String(days) ? "active" : ""}`}
                      onClick={() => applyPreset("durationDays", days)}
                    >
                      {days} ngày
                    </button>
                  ))}
                </div>
                <input
                  name="durationDays"
                  type="number"
                  min="1"
                  step="1"
                  value={form.durationDays}
                  onChange={changeField}
                  placeholder="Số ngày khác…"
                  required
                />
              </div>

              {/* CHỌN NHANH HẠN MỨC IMPRESSIONS */}
              <div className="preset-pills-wrap">
                <span className="preset-pills-label">Hạn mức impressions:</span>
                <div className="preset-pills">
                  {QUOTA_PRESETS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className={`preset-pill-btn ${form.impressionsQuota === String(q) ? "active" : ""}`}
                      onClick={() => applyPreset("impressionsQuota", q)}
                    >
                      {(q / 1000).toLocaleString("vi-VN")}k lượt
                    </button>
                  ))}
                </div>
                <input
                  name="impressionsQuota"
                  type="number"
                  min="1"
                  step="1"
                  value={form.impressionsQuota}
                  onChange={changeField}
                  placeholder="Hạn mức khác…"
                  required
                />
              </div>

              <label>
                Trạng thái hiển thị
                <select name="status" value={form.status} onChange={changeField}>
                  <option value="ACTIVE">Đang hoạt động (Active)</option>
                  <option value="DRAFT">Bản nháp (Draft)</option>
                  <option value="INACTIVE">Đã tắt (Inactive)</option>
                </select>
              </label>

              <label className="b2b-description-field">
                Mô tả chi tiết và quyền lợi
                <textarea
                  name="description"
                  rows="3"
                  maxLength={4000}
                  value={form.description}
                  onChange={changeField}
                  placeholder="Mô tả ưu đãi, vị trí ưu tiên hoặc phân khúc độc giả của gói…"
                />
              </label>

              <div className="ad-slot-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={saving}
                  onClick={() => {
                    setEditorOpen(false);
                    setError("");
                  }}
                >
                  Hủy
                </button>

                <button type="submit" disabled={saving}>
                  {saving
                    ? "Đang lưu..."
                    : editingPackage
                      ? "Lưu thay đổi"
                      : "Tạo gói"}
                </button>
              </div>
            </form>

            {/* Cột phải: Live Preview Card */}
            <div className="admin-editor-column">
              <div className="mockup-info-badge">
                <span>✨ Xem trước giao diện thẻ gói (Live Card Preview)</span>
              </div>
              <B2bPackageVisualCard form={form} />
              <div className="mockup-hint-box" style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11.5px", color: "#64748b", lineHeight: "1.6" }}>
                <strong style={{ color: "#0f172a", display: "block", marginBottom: "4px" }}>💡 Lưu ý định giá B2B:</strong>
                Chỉ số CPM (chi phí cho mỗi 1.000 lượt hiển thị) giúp đối tác dễ dàng so sánh hiệu quả giữa các gói. Bạn có thể chọn nhanh các mẫu gói có sẵn ở trên để áp dụng cấu hình khuyến nghị.
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </main>
  );
}
