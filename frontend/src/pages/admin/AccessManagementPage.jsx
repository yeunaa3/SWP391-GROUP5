import { useEffect, useState } from "react";
import { apiRequest } from "../../services/apiClient.js";
import { useAuth } from "../../store/AuthContext.jsx";
import ModalShell from "../../components/ModalShell.jsx";
import "../../assets/iteration3-admin.css";

const statusNames = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngừng hoạt động",
  LOCKED: "Đã khóa",
};

const capabilityNames = {
  READER: "Đọc tin và quản lý tài khoản",
  SUBSCRIBER: "Không gian Premium (vẫn cần thuê bao còn hạn)",
  BUSINESS: "Không gian doanh nghiệp (vẫn kiểm tra hồ sơ/hợp đồng)",
  AD_MANAGER: "Xét duyệt quảng cáo",
  ADMINISTRATOR: "Quản trị hệ thống",
};

const roleTitles = {
  ADMINISTRATOR: "Quản trị viên (ADMINISTRATOR)",
  AD_MANAGER: "Quản lý quảng cáo (AD_MANAGER)",
  BUSINESS: "Doanh nghiệp đối tác (BUSINESS)",
  SUBSCRIBER: "Thuê bao Premium (SUBSCRIBER)",
  READER: "Độc giả (READER)",
};

/**
 * ============================================================================
 * [CFG-02][UC-34] QUẢN LÝ TÀI KHOẢN VÀ PHÂN QUYỀN TRUY CẬP (ACCESS MANAGEMENT)
 * - Tải dữ liệu tài khoản thật từ database kèm RBAC live checks.
 * - Hỗ trợ lọc theo trạng thái và tìm kiếm theo Vai trò / Nhóm quyền (Role).
 * - Tự động áp dụng bộ lọc ngay khi chọn nhóm quyền trong dropdown.
 * - Tìm kiếm thông minh: Tìm theo tên, username, email, tên công ty hoặc vai trò.
 * ============================================================================
 */
export default function AccessManagementPage() {
  const { refresh } = useAuth();
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ query: "", status: "", role: "" });
  const [applied, setApplied] = useState({ query: "", status: "", role: "", page: 0 });
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Gọi API tải danh sách tài khoản theo bộ lọc đã áp dụng
  async function load() {
    try {
      const result = await apiRequest(`/api/admin/access?${new URLSearchParams(applied)}`);
      setData(result);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    let alive = true;
    setError("");
    apiRequest(`/api/admin/access?${new URLSearchParams(applied)}`)
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [applied]);

  // Xử lý khi người dùng chọn lọc Nhóm quyền (Role) -> Tự động kích hoạt lọc ngay lập tức
  function handleRoleChange(newRole) {
    setFilters((f) => ({ ...f, role: newRole }));
    setApplied((a) => ({ ...a, role: newRole, page: 0 }));
  }

  // Xử lý khi người dùng chọn lọc Trạng thái -> Tự động kích hoạt lọc ngay lập tức
  function handleStatusChange(newStatus) {
    setFilters((f) => ({ ...f, status: newStatus }));
    setApplied((a) => ({ ...a, status: newStatus, page: 0 }));
  }

  // Xử lý khi nhấn nút "Tìm kiếm" cho ô nhập từ khóa
  function handleSearchSubmit(e) {
    e.preventDefault();
    setApplied({ ...filters, page: 0 });
  }

  // Xóa toàn bộ bộ lọc và quay về trang 1
  function handleClearFilters() {
    const cleared = { query: "", status: "", role: "" };
    setFilters(cleared);
    setApplied({ ...cleared, page: 0 });
  }

  const hasActiveFilters = Boolean(applied.query || applied.status || applied.role);

  function openUser(row) {
    setError("");
    setMessage("");
    setConfirm(false);
    setEditing({
      kind: "user",
      id: row.id,
      label: row.username,
      status: row.status,
      roleIds: row.roleIds,
      version: row.version,
      reason: "",
    });
  }

  function openRole(row) {
    setError("");
    setMessage("");
    setConfirm(false);
    setEditing({
      kind: "role",
      id: row?.id,
      name: row?.name || "",
      description: row?.description || "",
      status: row?.status || "ACTIVE",
      permissions: row?.permissions || [],
      version: row?.version || 0,
      builtIn: row?.builtIn || false,
      reason: "",
    });
  }

  function toggle(field, value) {
    setEditing((v) => ({
      ...v,
      [field]: v[field].includes(value)
        ? v[field].filter((x) => x !== value)
        : [...v[field], value],
    }));
    setConfirm(false);
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { kind, id, ...body } = editing;
      const path =
        kind === "user"
          ? `/api/admin/access/users/${id}`
          : `/api/admin/access/roles${id ? `/${id}` : ""}`;
      await apiRequest(path, { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
      setEditing(null);
      setConfirm(false);
      setMessage("Đã lưu và ghi lịch sử thay đổi quyền.");
      await refresh({ silent: true });
      await load();
    } catch (e) {
      setError(e.message);
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-content iteration3-admin">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CFG-02 · UC-34</p>
          <h1>Tài khoản và phân quyền</h1>
          <p className="page-subtitle">Quản lý quyền truy cập, trạng thái tài khoản và nhóm quyền người dùng.</p>
        </div>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => load().catch((e) => setError(e.message))}
        >
          ↻ Làm mới
        </button>
      </div>

      {error && <p role="alert" className="form-error">{error}</p>}
      {message && <p role="status" className="success-message">{message}</p>}

      {/* Khối tìm kiếm & lọc tài khoản theo Vai trò, Trạng thái, Từ khóa */}
      <section className="dashboard-section">
                <form className="admin-search-panel" onSubmit={handleSearchSubmit}>
          <div className="admin-search-panel-row">
            <div className="admin-search-field">
              <label>
                <span>Tìm kiếm tài khoản & vai trò</span>
                <div className="modern-search-input-wrap">
                  <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Nhập tên đăng nhập, họ tên, email hoặc vai trò..."
                    value={filters.query}
                    onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                  />
                  {filters.query && (
                    <button
                      type="button"
                      className="modern-search-clear-btn"
                      onClick={() => {
                        setFilters((f) => ({ ...f, query: "" }));
                        setApplied((a) => ({ ...a, query: "", page: 0 }));
                      }}
                      title="Xóa từ khóa"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </label>
            </div>

            <label className="admin-filter-label">
              <span>Nhóm quyền (Role)</span>
              <div className="modern-select-wrap">
                <select
                  value={filters.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="">Tất cả vai trò / nhóm quyền</option>
                  {data?.roles?.map((r) => (
                    <option key={r.id} value={r.name}>
                      {roleTitles[r.name] || r.name}
                    </option>
                  ))}
                </select>
                <svg className="modern-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </label>

            <label className="admin-filter-label">
              <span>Trạng thái tài khoản</span>
              <div className="modern-select-wrap">
                <select
                  value={filters.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(statusNames).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                <svg className="modern-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </label>

            <button type="submit" className="admin-search-submit-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Tìm kiếm</span>
            </button>
          </div>

          {hasActiveFilters && (
            <div className="admin-active-chips">
              <span className="chips-title">Đang lọc theo:</span>
              {applied.query && (
                <span className="filter-chip">
                  Từ khóa: <strong>"{applied.query}"</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters((f) => ({ ...f, query: "" }));
                      setApplied((a) => ({ ...a, query: "", page: 0 }));
                    }}
                    title="Bỏ lọc từ khóa"
                  >
                    ✕
                  </button>
                </span>
              )}
              {applied.role && (
                <span className="filter-chip">
                  Vai trò: <strong>{roleTitles[applied.role] || applied.role}</strong>
                  <button
                    type="button"
                    onClick={() => handleRoleChange("")}
                    title="Bỏ lọc vai trò"
                  >
                    ✕
                  </button>
                </span>
              )}
              {applied.status && (
                <span className="filter-chip">
                  Trạng thái: <strong>{statusNames[applied.status] || applied.status}</strong>
                  <button
                    type="button"
                    onClick={() => handleStatusChange("")}
                    title="Bỏ lọc trạng thái"
                  >
                    ✕
                  </button>
                </span>
              )}
              <button
                type="button"
                className="clear-all-chips"
                onClick={handleClearFilters}
              >
                ✕ Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </form>
      </section>

      {!data ? (
        <p>Đang tải danh sách tài khoản…</p>
      ) : (
        <>
          {/* Bảng danh sách tài khoản hiển thị vai trò */}
          <section className="dashboard-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2>
                Danh sách tài khoản ({data.total})
                {hasActiveFilters && (
                  <span style={{ fontSize: "13px", fontWeight: "normal", color: "#64748b", marginLeft: "10px" }}>
                    (Đang lọc: {applied.role ? `Role "${applied.role}"` : ""} {applied.status ? `Trạng thái "${statusNames[applied.status]}"` : ""} {applied.query ? `Từ khóa "${applied.query}"` : ""})
                  </span>
                )}
              </h2>
            </div>

            <div className="admin-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Doanh nghiệp</th>
                    <th>Nhóm quyền (Vai trò)</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.username}</strong>
                        <span>{u.fullName || "—"}</span>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>{u.email}</span>
                      </td>
                      <td>{u.companyName || "Chưa liên kết"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {data.roles
                            .filter((r) => u.roleIds.includes(r.id))
                            .map((r) => (
                              <span
                                key={r.id}
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  background:
                                    r.name === "ADMINISTRATOR"
                                      ? "#fee2e2"
                                      : r.name === "AD_MANAGER"
                                      ? "#f3e8ff"
                                      : r.name === "BUSINESS"
                                      ? "#dcfce7"
                                      : r.name === "SUBSCRIBER"
                                      ? "#fef3c7"
                                      : "#f1f5f9",
                                  color:
                                    r.name === "ADMINISTRATOR"
                                      ? "#991b1b"
                                      : r.name === "AD_MANAGER"
                                      ? "#6b21a8"
                                      : r.name === "BUSINESS"
                                      ? "#166534"
                                      : r.name === "SUBSCRIBER"
                                      ? "#92400e"
                                      : "#334155",
                                }}
                              >
                                {r.name}
                                {r.status !== "ACTIVE" ? " (tạm dừng)" : ""}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background: u.status === "ACTIVE" ? "#ecfdf5" : u.status === "LOCKED" ? "#fef2f2" : "#f1f5f9",
                            color: u.status === "ACTIVE" ? "#065f46" : u.status === "LOCKED" ? "#991b1b" : "#475569",
                          }}
                        >
                          {statusNames[u.status]}
                        </span>
                      </td>
                      <td>
                        <button className="secondary-button" onClick={() => openUser(u)}>
                          Chỉnh sửa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!data.users.length && (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <p style={{ fontSize: "15px", color: "#64748b" }}>
                    Không tìm thấy tài khoản nào phù hợp với bộ lọc hiện tại.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ marginTop: "10px" }}
                      onClick={handleClearFilters}
                    >
                      Xóa bộ lọc để xem tất cả
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Phân trang */}
            <div className="admin-pagination">
              <button
                className="secondary-button"
                disabled={!applied.page}
                onClick={() => setApplied({ ...applied, page: applied.page - 1 })}
              >
                ← Trang trước
              </button>
              <span>
                Trang {applied.page + 1} / {Math.max(1, Math.ceil(data.total / data.size))} · Tổng {data.total} tài khoản
              </span>
              <button
                className="secondary-button"
                disabled={(applied.page + 1) * data.size >= data.total}
                onClick={() => setApplied({ ...applied, page: applied.page + 1 })}
              >
                Trang sau →
              </button>
            </div>
          </section>

          {/* Quản lý nhóm quyền và năng lực */}
          <section className="dashboard-section">
            <div className="section-heading">
              <h2>Nhóm quyền và năng lực hệ thống</h2>
              <button onClick={() => openRole(null)}>+ Tạo nhóm quyền mới</button>
            </div>
            <p>
              Quyền cập nhật từ database ở mỗi yêu cầu. Khóa tài khoản sẽ thu hồi phiên đang đăng nhập ngay lập tức.
            </p>
            <div className="admin-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Mã Role</th>
                    <th>Năng lực được cấp (Permissions)</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.roles.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.name}</strong>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>{r.description}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {r.permissions.map((p) => (
                            <span
                              key={p}
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              {capabilityNames[p] || p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{statusNames[r.status]}</td>
                      <td>
                        <button className="secondary-button" onClick={() => openRole(r)}>
                          Sửa nhóm
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Modal chỉnh sửa User hoặc Role */}
      {editing && (
        <ModalShell
          title={
            confirm
              ? "Xác nhận thay đổi quyền"
              : editing.kind === "user"
              ? `Chỉnh quyền tài khoản: ${editing.label}`
              : editing.id
              ? `Chỉnh nhóm quyền: ${editing.name}`
              : "Tạo nhóm quyền mới"
          }
          onClose={() => {
            if (!busy) {
              setEditing(null);
              setConfirm(false);
            }
          }}
        >
          {error && <p role="alert" className="form-error">{error}</p>}
          {confirm ? (
            <>
              <p>
                <strong>{editing.kind === "user" ? editing.label : editing.name}</strong> → Trạng thái:{" "}
                <strong>{statusNames[editing.status]}</strong>
              </p>
              <ul>
                {(editing.kind === "user"
                  ? data.roles.filter((r) => editing.roleIds.includes(r.id)).map((r) => r.name)
                  : editing.permissions
                ).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p>
                <strong>Lý do thay đổi:</strong> {editing.reason}
              </p>
              <p style={{ fontSize: "13px", color: "#64748b" }}>
                Thay đổi sẽ có hiệu lực tức thì cho các yêu cầu tiếp theo của tài khoản liên quan.
              </p>
              <div className="form-actions">
                <button disabled={busy} onClick={save}>
                  {busy ? "Đang lưu…" : "Xác nhận lưu thay đổi"}
                </button>
                <button className="secondary-button" disabled={busy} onClick={() => setConfirm(false)}>
                  Quay lại
                </button>
              </div>
            </>
          ) : (
            <form
              className="admin-editor"
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  !(editing.kind === "user" ? editing.roleIds : editing.permissions).length
                ) {
                  setError("Vui lòng chọn ít nhất một nhóm quyền hoặc năng lực.");
                  return;
                }
                setError("");
                setConfirm(true);
              }}
            >
              {editing.kind === "role" && (
                <>
                  <label>
                    Mã nhóm quyền (UPPERCASE)
                    <input
                      required
                      pattern="[A-Z][A-Z0-9_]{2,49}"
                      maxLength={50}
                      disabled={editing.builtIn}
                      value={editing.name}
                      onChange={(e) =>
                        setEditing({ ...editing, name: e.target.value.toUpperCase() })
                      }
                    />
                  </label>
                  <label>
                    Mô tả chức năng nhóm quyền
                    <input
                      required
                      maxLength={255}
                      value={editing.description}
                      onChange={(e) =>
                        setEditing({ ...editing, description: e.target.value })
                      }
                    />
                  </label>
                </>
              )}

              <label>
                Trạng thái hoạt động
                <select
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                >
                  {Object.entries(statusNames)
                    .filter(([v]) => editing.kind === "user" || v !== "LOCKED")
                    .map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>

              <fieldset>
                <legend>
                  {editing.kind === "user" ? "Nhóm quyền được cấp" : "Năng lực được cấp"}
                </legend>
                {editing.kind === "user"
                  ? data.roles.map((r) => (
                      <label className="admin-check" key={r.id}>
                        <input
                          type="checkbox"
                          checked={editing.roleIds.includes(r.id)}
                          disabled={r.status !== "ACTIVE" && !editing.roleIds.includes(r.id)}
                          onChange={() => toggle("roleIds", r.id)}
                        />
                        {r.name} {r.status !== "ACTIVE" ? "(ngừng hoạt động)" : ""}
                      </label>
                    ))
                  : data.permissions.map((p) => (
                      <label className="admin-check" key={p}>
                        <input
                          type="checkbox"
                          disabled={editing.builtIn}
                          checked={editing.permissions.includes(p)}
                          onChange={() => toggle("permissions", p)}
                        />
                        {capabilityNames[p] || p}
                      </label>
                    ))}
              </fieldset>

              <label>
                Lý do thay đổi (bắt buộc cho nhật ký audit)
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", margin: "6px 0 8px" }}>
                  {[
                    "Cập nhật quyền theo nhiệm vụ công tác",
                    "Tạm khóa tài khoản để xác minh bảo mật",
                    "Kích hoạt lại tài khoản sau khi xác minh",
                    "Bổ sung vai trò doanh nghiệp đối tác",
                    "Theo quyết định của Ban Quản trị",
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditing((cur) => ({ ...cur, reason: r }))}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "14px",
                        fontSize: "11px",
                        background: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #cbd5e1",
                        cursor: "pointer",
                      }}
                    >
                      + {r}
                    </button>
                  ))}
                </div>
                <textarea
                  required
                  maxLength={500}
                  rows={3}
                  value={editing.reason}
                  onChange={(e) => setEditing({ ...editing, reason: e.target.value })}
                  placeholder="Nhập lý do thực hiện thay đổi phân quyền…"
                />
              </label>

              <div className="form-actions">
                <button type="submit">Kiểm tra thay đổi</button>
              </div>
            </form>
          )}
        </ModalShell>
      )}
    </main>
  );
}
