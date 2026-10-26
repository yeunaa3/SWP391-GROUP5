import { useEffect, useMemo, useState } from "react";
import {
  createAdminB2bPackage,
  getAdminB2bPackages,
  updateAdminB2bPackage,
} from "../../services/b2bPackageAdminService.js";

const emptyForm = {
  code: "",
  name: "",
  price: "",
  durationDays: "",
  impressionsQuota: "",
  description: "",
  status: "DRAFT",
};

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
    setEditorOpen(true)
  }

  function openEdit(item) {
    setEditingPackage(item);
    setForm(formFrom(item));
    setError("");
    setNotice("");
    setEditorOpen(true)
  }

  function changeField(event) {
    const { name, value } = event.currentTarget;
    setForm((current) => ({
      ...current,
      [name]: name === "code" ? value.toUpperCase() : value,
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
      setEditorOpen(false)
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
        <button type="button" onClick={openCreate}>Tạo gói mới</button>
      </header>

      {notice && <p role="status">{notice}</p>}

      <section className="dashboard-section ad-slot-list">
        <div className="list-toolbar">
          <div>
            <h2>Gói quảng cáo ({visiblePackages.length})</h2>
            <p>Danh sách gói B2B và trạng thái hiện tại.</p>
          </div>
          <div className="inline-filters">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo mã hoặc tên gói"
              aria-label="Tìm gói quảng cáo"
            />
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

      {error && packages.length > 0 && <p role="alert">{error}</p>}

      {editorOpen && (
        <section className="dashboard-section ad-slot-editor b2b-package-editor">
          <h2>
            {editingPackage ? "Chỉnh sửa gói quảng cáo" : "Tạo gói quảng cáo"}
          </h2>

          {error && <p role="alert">{error}</p>}

          <form className="ad-slot-form" onSubmit={savePackage}>
            <label>
              Mã gói
              <input
                name="code"
                value={form.code}
                onChange={changeField}
                maxLength={50}
                required
              />
            </label>

            <label>
              Tên gói
              <input
                name="name"
                value={form.name}
                onChange={changeField}
                maxLength={100}
                required
              />
            </label>

            <label>
              Giá (VND)
              <input
                name="price"
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={changeField}
                required
              />
            </label>

            <label>
              Thời hạn (ngày)
              <input
                name="durationDays"
                type="number"
                min="1"
                step="1"
                value={form.durationDays}
                onChange={changeField}
                required
              />
            </label>

            <label>
              Hạn mức impressions
              <input
                name="impressionsQuota"
                type="number"
                min="1"
                step="1"
                value={form.impressionsQuota}
                onChange={changeField}
                required
              />
            </label>

            <label>
              Trạng thái
              <select name="status" value={form.status} onChange={changeField}>
                <option value="DRAFT">Bản nháp</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Đã tắt</option>
              </select>
            </label>

            <label className="b2b-description-field">
              Mô tả
              <textarea
                name="description"
                rows="4"
                maxLength={4000}
                value={form.description}
                onChange={changeField}
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
        </section>
      )}
    </main>
  );
}