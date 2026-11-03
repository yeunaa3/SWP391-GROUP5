import { useEffect, useState } from "react";
import { apiRequest } from "../../services/apiClient.js";
import ModalShell from "../../components/ModalShell.jsx";
import "../../assets/iteration3-admin.css";

/**
 * Hàm định dạng dung lượng byte thành MB thân thiện cho người dùng
 */
function formatBytes(bytes) {
  const n = Number(bytes);
  if (!n || isNaN(n)) return "0 B";
  if (n < 1024 * 1024) {
    const kb = (n / 1024).toFixed(1).replace(/\.0$/, "");
    return `${kb} KB (${n.toLocaleString("vi-VN")} bytes)`;
  }
  const mb = (n / (1024 * 1024)).toFixed(1).replace(/\.0$/, "");
  return `${mb} MB (${n.toLocaleString("vi-VN")} bytes)`;
}

const IMAGE_PRESETS = [
  { label: "2 MB", bytes: 2 * 1024 * 1024 },
  { label: "5 MB", bytes: 5 * 1024 * 1024 },
  { label: "8 MB (Trần HTTP)", bytes: 8 * 1024 * 1024 },
  { label: "10 MB", bytes: 10 * 1024 * 1024 },
  { label: "20 MB", bytes: 20 * 1024 * 1024 },
  { label: "50 MB (Tối đa)", bytes: 50 * 1024 * 1024 },
];

const VIDEO_PRESETS = [
  { label: "10 MB", bytes: 10 * 1024 * 1024 },
  { label: "25 MB", bytes: 25 * 1024 * 1024 },
  { label: "50 MB", bytes: 50 * 1024 * 1024 },
  { label: "100 MB", bytes: 100 * 1024 * 1024 },
  { label: "200 MB", bytes: 200 * 1024 * 1024 },
  { label: "500 MB (Tối đa)", bytes: 500 * 1024 * 1024 },
];

const REASON_PRESETS = [
  "Tăng chất lượng hiển thị banner đối tác",
  "Tối ưu băng thông và tốc độ tải trang",
  "Theo đề xuất của bộ phận Kỹ thuật",
  "Điều chỉnh theo chính sách hệ thống mới",
];

/**
 * ============================================================================
 * [CFG-06][UC-37] CÀI ĐẶT HỆ THỐNG (SYSTEM SETTINGS MANAGEMENT)
 * - Quản lý tham số vận hành: dung lượng tối đa file ảnh/video quảng cáo.
 * - Hỗ trợ quy đổi Byte sang MB thân thiện, có các nút chọn nhanh dung lượng.
 * - Kiểm soát lịch sử thay đổi (Audit Log) 50 lần gần nhất.
 * - Xác nhận 2 bước minh bạch, bảo vệ an toàn hệ thống.
 * ============================================================================
 */
export default function SystemSettingsPage() {
  const [data, setData] = useState(null);
  const [group, setGroup] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setError("");
    const result = await apiRequest("/api/admin/settings");
    setData(result);
  }

  useEffect(() => {
    let alive = true;
    apiRequest("/api/admin/settings")
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  function open(row) {
    setEditing({
      ...row,
      value: row.setting_value,
      reason: "",
      restoreDefault: false,
    });
    setConfirm(false);
    setError("");
    setMessage("");
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      await apiRequest(`/api/admin/settings/${editing.setting_key}`, {
        method: "PUT",
        body: JSON.stringify({
          value: editing.value,
          version: editing.edit_version,
          restoreDefault: editing.restoreDefault,
          reason: editing.reason,
        }),
      });
      setEditing(null);
      setConfirm(false);
      setMessage("✓ Đã lưu cấu hình và ghi nhận vào Nhật ký kiểm toán. Cấu hình có hiệu lực ngay cho các tệp tải lên tiếp theo.");
      await load();
    } catch (e) {
      setError(e.message);
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  const isVideo = editing?.setting_key?.includes("video");
  const presets = isVideo ? VIDEO_PRESETS : IMAGE_PRESETS;

  return (
    <main className="page-content iteration3-admin">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CFG-06 · QUẢN TRỊ CẤU HÌNH</p>
          <h1>Cài đặt hệ thống</h1>
          <p className="page-subtitle">
            Quản lý giới hạn dung lượng tải tệp, tham số vận hành và theo dõi lịch sử thay đổi (Audit Log).
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() => load().catch((e) => setError(e.message))}
        >
          Làm mới
        </button>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}

      {/* KHUNG HƯỚNG DẪN THÂN THIỆN CHO QUẢN TRỊ VIÊN */}
      <section className="settings-guide-card" style={{
        background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
        border: "1px solid #a7f3d0",
        borderRadius: "16px",
        padding: "20px 24px",
        marginBottom: "24px",
        boxShadow: "0 2px 10px rgba(16, 185, 129, 0.05)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "20px" }}>💡</span>
          <strong style={{ fontSize: "15px", color: "#065f46" }}>
            Hướng dẫn nhanh cách sử dụng Cài đặt hệ thống:
          </strong>
        </div>
        <p style={{ fontSize: "13px", color: "#047857", margin: "0 0 12px", lineHeight: "1.6" }}>
          Màn hình này cho phép Quản trị viên điều chỉnh các hạn mức hệ thống (ví dụ: kích thước tối đa cho file ảnh hoặc video quảng cáo do doanh nghiệp tải lên).
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "14px",
          fontSize: "12.5px",
          color: "#064e3b"
        }}>
          <div style={{ background: "rgba(255,255,255,0.7)", padding: "10px 14px", borderRadius: "10px", border: "1px solid #d1fae5" }}>
            <strong>Bước 1: Chọn tham số</strong>
            <p style={{ margin: "4px 0 0", color: "#047857" }}>
              Tìm thẻ tham số có nhãn <strong>&ldquo;Cho phép sửa&rdquo;</strong> và bấm nút <em>&ldquo;Chỉnh sửa&rdquo;</em>.
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.7)", padding: "10px 14px", borderRadius: "10px", border: "1px solid #d1fae5" }}>
            <strong>Bước 2: Chọn dung lượng (MB)</strong>
            <p style={{ margin: "4px 0 0", color: "#047857" }}>
              Bấm nhanh vào các nút dung lượng gợi ý (ví dụ: <code>2 MB</code>, <code>5 MB</code>, <code>8 MB</code>...). Hệ thống tự quy đổi ra byte chuẩn.
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.7)", padding: "10px 14px", borderRadius: "10px", border: "1px solid #d1fae5" }}>
            <strong>Bước 3: Ghi lý do & Lưu</strong>
            <p style={{ margin: "4px 0 0", color: "#047857" }}>
              Nhập lý do thay đổi để lưu vào Nhật ký kiểm toán minh bạch, sau đó xác nhận lưu.
            </p>
          </div>
        </div>
      </section>

      {!data ? (
        <p>Đang tải cấu hình…</p>
      ) : (
        <>
          <section className="dashboard-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Danh mục tham số hệ thống ({data.settings.length})</h2>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
                  Giá trị cấu hình hiện hành và trần thực tế áp dụng tại máy chủ.
                </p>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>Lọc nhóm:</span>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                >
                  <option value="">Tất cả nhóm</option>
                  {[...new Set(data.settings.map((x) => x.group))].map((x) => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="settings-cards">
              {data.settings
                .filter((x) => !group || x.group === group)
                .map((row) => (
                  <article key={row.setting_key} style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    background: "#ffffff",
                    borderRadius: "14px",
                    border: row.editable ? "1.5px solid #cbd5e1" : "1px solid #e2e8f0",
                    padding: "20px",
                    boxShadow: row.editable ? "0 4px 12px rgba(15, 23, 42, 0.04)" : "none"
                  }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span className="eyebrow" style={{
                          fontSize: "10px",
                          letterSpacing: "0.08em",
                          fontWeight: "700",
                          color: row.editable ? "#059669" : "#64748b"
                        }}>
                          {row.group} · {row.editable ? "✓ CHO PHÉP SỬA" : "CHỈ XEM"}
                        </span>
                        {row.editable && (
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            background: "#ecfdf5",
                            color: "#059669",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: "1px solid #a7f3d0"
                          }}>
                            Dung lượng động
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 6px", color: "#0f172a", fontFamily: "monospace" }}>
                        {row.setting_key}
                      </h3>
                      <p style={{ fontSize: "12.5px", color: "#475569", lineHeight: "1.5", margin: "0 0 14px" }}>
                        {row.description}
                      </p>

                      <dl style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                        background: "#f8fafc",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: "1px solid #f1f5f9",
                        fontSize: "12px",
                        margin: "0 0 14px"
                      }}>
                        <div>
                          <dt style={{ color: "#64748b", fontSize: "11px" }}>Giá trị hiện tại</dt>
                          <dd style={{ margin: "2px 0 0", fontWeight: "700", color: "#0f172a" }}>
                            {row.editable ? formatBytes(row.setting_value) : row.setting_value}
                          </dd>
                        </div>
                        <div>
                          <dt style={{ color: "#64748b", fontSize: "11px" }}>Kiểu / Mặc định</dt>
                          <dd style={{ margin: "2px 0 0", color: "#334155" }}>
                            {row.data_type} / {row.editable ? formatBytes(row.default_value) : row.default_value}
                          </dd>
                        </div>
                        {row.editable && (
                          <div style={{ gridColumn: "span 2" }}>
                            <dt style={{ color: "#64748b", fontSize: "11px" }}>Trần upload thực tế (HTTP)</dt>
                            <dd style={{ margin: "2px 0 0", color: "#0284c7", fontWeight: "600" }}>
                              {formatBytes(row.effectiveBytes)} (giới hạn bảo vệ máy chủ)
                            </dd>
                          </div>
                        )}
                        <div style={{ gridColumn: "span 2", borderTop: "1px dashed #e2e8f0", paddingTop: "6px" }}>
                          <dt style={{ color: "#94a3b8", fontSize: "10px" }}>Cập nhật gần nhất</dt>
                          <dd style={{ margin: "2px 0 0", color: "#64748b", fontSize: "11px" }}>
                            {row.updatedBy || "Hệ thống"} · {row.updated_at ? new Date(row.updated_at).toLocaleString("vi-VN") : "Ban đầu"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {row.editable && (
                      <button
                        type="button"
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          background: "#0f172a",
                          color: "#ffffff",
                          fontWeight: "600",
                          fontSize: "12.5px",
                          border: "none",
                          cursor: "pointer",
                          marginTop: "8px"
                        }}
                        onClick={() => open(row)}
                      >
                        Chỉnh sửa tham số này ↗
                      </button>
                    )}
                  </article>
                ))}
            </div>
          </section>

          {/* NHẬT KÝ KIỂM TOÁN THAY ĐỔI */}
          <section className="dashboard-section" style={{ marginTop: "24px" }}>
            <div style={{ marginBottom: "14px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Nhật ký kiểm toán cấu hình · 50 lần gần nhất</h2>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
                Ghi nhận lịch sử Quản trị viên thay đổi các tham số, giá trị cũ/mới và lý do tương ứng.
              </p>
            </div>

            {!data.history.length ? (
              <p style={{ fontSize: "13px", color: "#64748b" }}>Chưa có thay đổi cấu hình nào được ghi nhận.</p>
            ) : (
              <div className="admin-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Thời gian / Người sửa</th>
                      <th>Tham số</th>
                      <th>Thay đổi giá trị</th>
                      <th>Lý do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((x) => (
                      <tr key={x.audit_log_id}>
                        <td>
                          <strong>{new Date(x.created_at).toLocaleString("vi-VN")}</strong>
                          <span style={{ color: "#64748b", fontSize: "11px" }}>{x.actor || "Hệ thống"}</span>
                        </td>
                        <td>
                          <code style={{ fontSize: "12px", color: "#0f172a", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                            {x.entity_id}
                          </code>
                        </td>
                        <td style={{ fontSize: "12px" }}>
                          <span style={{ color: "#ef4444", textDecoration: "line-through" }}>{x.old_value}</span>
                          {" → "}
                          <strong style={{ color: "#10b981" }}>{x.new_value}</strong>
                        </td>
                        <td style={{ fontSize: "12.5px", color: "#334155" }}>{x.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* MODAL CHỈNH SỬA CẤU HÌNH VỚI NÚT CHỌN NHANH MB VÀ LÝ DO */}
      {editing && (
        <ModalShell
          title={confirm ? "Xác nhận áp dụng cấu hình" : `Chỉnh sửa: ${editing.setting_key}`}
          className="admin-modal-wide"
          onClose={() => {
            if (!busy) {
              setEditing(null);
              setConfirm(false);
            }
          }}
        >
          {error && <p role="alert" className="form-error">{error}</p>}

          {confirm ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "10px 0" }}>
              <div style={{ background: "#fef3c7", border: "1px solid #fde68a", padding: "14px 18px", borderRadius: "12px", color: "#92400e", fontSize: "13px" }}>
                <strong>⚠️ Lưu ý kiểm toán hệ thống:</strong>
                <p style={{ margin: "6px 0 0", lineHeight: "1.5" }}>
                  Mọi thay đổi sẽ được áp dụng ngay lập tức cho các tệp tải lên mới của đối tác doanh nghiệp và được lưu vĩnh viễn vào nhật ký kiểm toán.
                </p>
              </div>

              <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#64748b" }}>Tham số điều chỉnh:</p>
                <h3 style={{ margin: "0 0 14px", fontSize: "17px", color: "#0f172a", fontFamily: "monospace" }}>
                  {editing.setting_key}
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "16px", padding: "14px", background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Giá trị cũ</span>
                    <p style={{ margin: "4px 0 0", fontWeight: "700", color: "#64748b", fontSize: "14px" }}>
                      {formatBytes(editing.setting_value)}
                    </p>
                  </div>
                  <span style={{ fontSize: "20px", color: "#059669" }}>➔</span>
                  <div>
                    <span style={{ fontSize: "11px", color: "#059669", fontWeight: "700" }}>Giá trị mới</span>
                    <p style={{ margin: "4px 0 0", fontWeight: "800", color: "#059669", fontSize: "16px" }}>
                      {formatBytes(editing.value)}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: "14px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Lý do thay đổi:</span>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", fontWeight: "600", color: "#1e293b", background: "#ffffff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    &ldquo;{editing.reason}&rdquo;
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => setConfirm(false)}
                >
                  Quay lại sửa
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={save}
                  style={{
                    background: "#059669",
                    color: "#ffffff",
                    fontWeight: "700",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  {busy ? "Đang lưu cấu hình..." : "Xác nhận & Lưu ngay"}
                </button>
              </div>
            </div>
          ) : (
            <form
              className="admin-editor"
              onSubmit={(e) => {
                e.preventDefault();
                setError("");
                if (!editing.reason?.trim()) {
                  setError("Vui lòng nhập lý do điều chỉnh tham số cấu hình.");
                  return;
                }
                setConfirm(true);
              }}
              style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "10px" }}
            >
              <div>
                <span className="eyebrow" style={{ fontSize: "10px", letterSpacing: "0.08em", color: "#059669", fontWeight: "700" }}>
                  THAM SỐ ĐANG CHỌN
                </span>
                <h3 style={{ margin: "4px 0", fontSize: "17px", color: "#0f172a", fontFamily: "monospace" }}>
                  {editing.setting_key}
                </h3>
                <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b" }}>{editing.description}</p>
              </div>

              {/* NÚT CHỌN NHANH DUNG LƯỢNG MB */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155", margin: 0 }}>
                    Chọn dung lượng tối đa (MB):
                  </label>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#059669" }}>
                    Tương đương: {formatBytes(editing.value)}
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {presets.map((p) => {
                    const isSelected = String(editing.value) === String(p.bytes);
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setEditing({ ...editing, value: String(p.bytes), restoreDefault: false })}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          background: isSelected ? "#059669" : "#ffffff",
                          color: isSelected ? "#ffffff" : "#1e293b",
                          border: isSelected ? "1.5px solid #059669" : "1px solid #cbd5e1",
                          boxShadow: isSelected ? "0 2px 6px rgba(5, 150, 105, 0.25)" : "none"
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ô NHẬP BYTE TÙY CHỈNH */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", margin: 0 }}>
                  Hoặc nhập số byte chính xác (Giới hạn: 1 đến {editing.max?.toLocaleString("vi-VN")} bytes):
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    required
                    type="number"
                    min={editing.min || 1}
                    max={editing.max}
                    step="1"
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value, restoreDefault: false })}
                    style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setEditing({ ...editing, value: editing.default_value, restoreDefault: true })}
                    style={{ whiteSpace: "nowrap", padding: "10px 14px", fontSize: "12px" }}
                  >
                    Khôi phục mặc định
                  </button>
                </div>
              </div>

              {/* LÝ DO THAY ĐỔI VỚI GỢI Ý CHIP */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155", margin: 0 }}>
                  Lý do thay đổi cấu hình (Bắt buộc cho Nhật ký kiểm toán):
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {REASON_PRESETS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditing({ ...editing, reason: r })}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "14px",
                        fontSize: "11px",
                        background: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #e2e8f0",
                        cursor: "pointer"
                      }}
                    >
                      + {r}
                    </button>
                  ))}
                </div>
                <textarea
                  required
                  rows="3"
                  maxLength={500}
                  placeholder="Nhập chi tiết mục đích điều chỉnh tham số này…"
                  value={editing.reason}
                  onChange={(e) => setEditing({ ...editing, reason: e.target.value })}
                  style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditing(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    fontWeight: "700",
                    padding: "10px 22px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Kiểm tra & Tiếp tục ➔
                </button>
              </div>
            </form>
          )}
        </ModalShell>
      )}
    </main>
  );
}
