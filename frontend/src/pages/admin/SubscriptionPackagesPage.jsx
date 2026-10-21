import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminPackages,
  createPackage,
  updatePackage,
  togglePackageStatus,
  deletePackage,
} from "../../services/packageService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { money } from "../../utils/premium.js";
import "../../assets/admin-dashboard.css";
import "../../assets/premium.css";

export default function SubscriptionPackagesPage() {
  const { t } = usePreferences();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, ACTIVE, INACTIVE

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null); // null = create mode
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    price: 50000,
    currency: "VND",
    durationDays: 30,
    isPopular: false,
    status: "ACTIVE",
  });

  async function loadPackages() {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminPackages();
      setPackages(data || []);
    } catch (err) {
      setError(err.message || "Failed to load packages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPackages();
  }, []);

  function openCreateModal() {
    setEditingPkg(null);
    setForm({
      code: "",
      name: "",
      description: "Truy cập không giới hạn bài viết Premium, trải nghiệm đọc báo không quảng cáo.",
      price: 50000,
      currency: "VND",
      durationDays: 30,
      isPopular: false,
      status: "ACTIVE",
    });
    setModalOpen(true);
  }

  function openEditModal(pkg) {
    setEditingPkg(pkg);
    setForm({
      code: pkg.code,
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price,
      currency: pkg.currency || "VND",
      durationDays: pkg.durationDays,
      isPopular: Boolean(pkg.isPopular),
      status: pkg.status || "ACTIVE",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      if (editingPkg) {
        await updatePackage(editingPkg.id, form);
        setSuccessMsg(t(`Đã cập nhật gói ${form.name} thành công.`, `Package ${form.name} updated successfully.`));
      } else {
        await createPackage(form);
        setSuccessMsg(t(`Đã tạo gói mới ${form.name} thành công.`, `New package ${form.name} created successfully.`));
      }
      setModalOpen(false);
      await loadPackages();
    } catch (err) {
      setError(err.message || "Failed to save package");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(pkg) {
    const nextActive = pkg.status !== "ACTIVE";
    try {
      await togglePackageStatus(pkg.id, nextActive);
      setSuccessMsg(
        t(
          `Đã ${nextActive ? "kích hoạt" : "tạm dừng"} gói ${pkg.name}.`,
          `Package ${pkg.name} has been ${nextActive ? "activated" : "deactivated"}.`
        )
      );
      await loadPackages();
    } catch (err) {
      setError(err.message || "Failed to update status");
    }
  }

  async function handleDelete(pkg) {
    if (
      !window.confirm(
        t(
          `Bạn có chắc chắn muốn xóa/ngưng kích hoạt gói "${pkg.name}" (${pkg.code})?`,
          `Are you sure you want to deactivate package "${pkg.name}" (${pkg.code})?`
        )
      )
    ) {
      return;
    }
    try {
      await deletePackage(pkg.id);
      setSuccessMsg(t(`Đã ngưng kích hoạt gói ${pkg.name}.`, `Package ${pkg.name} has been deactivated.`));
      await loadPackages();
    } catch (err) {
      setError(err.message || "Failed to delete package");
    }
  }

  const filteredPackages = packages.filter((pkg) => {
    if (filter === "ACTIVE") return pkg.status === "ACTIVE";
    if (filter === "INACTIVE") return pkg.status !== "ACTIVE";
    return true;
  });

  return (
    <main className="page-content admin-overview" style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      {/* Header */}
      <header className="admin-overview-hero" style={{ marginBottom: "28px" }}>
        <div>
          <span className="admin-eyebrow">ADMINISTRATION · CFG-05 · UC-35</span>
          <h1 style={{ fontSize: "28px", fontWeight: "800", margin: "8px 0" }}>
            {t("Quản lý Gói cước Premium & Bảng giá", "Subscription Packages Management")}
          </h1>
          <p style={{ color: "#64748b", fontSize: "15px", margin: 0 }}>
            {t(
              "Cấu hình các gói thành viên Premium, thời hạn, giá niêm yết và trạng thái phân phối cho độc giả.",
              "Configure reader subscription packages, pricing, duration, and availability."
            )}
          </p>
        </div>
        <div className="admin-hero-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            className="primary-button"
            style={{
              background: "#4f46e5",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: "8px",
              fontWeight: "600",
              border: "none",
              cursor: "pointer",
            }}
            onClick={openCreateModal}
          >
            + {t("Thêm gói cước mới", "Add New Package")}
          </button>
          <button
            className="secondary-button"
            disabled={loading}
            onClick={loadPackages}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            ↻ {t("Tải lại", "Refresh")}
          </button>
        </div>
      </header>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          style={{
            background: "#fef2f2",
            border: "1px solid #f87171",
            color: "#b91c1c",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}
      {successMsg && (
        <div
          role="status"
          style={{
            background: "#f0fdf4",
            border: "1px solid #4ade80",
            color: "#15803d",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          ✓ {successMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { id: "ALL", label: t("Tất cả gói", "All Packages") },
            { id: "ACTIVE", label: t("Đang kích hoạt (Hiển thị)", "Active") },
            { id: "INACTIVE", label: t("Tạm ẩn / Ngưng bán", "Inactive") },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid",
                borderColor: filter === item.id ? "#4f46e5" : "#e2e8f0",
                background: filter === item.id ? "#eef2ff" : "#ffffff",
                color: filter === item.id ? "#4338ca" : "#64748b",
                fontWeight: filter === item.id ? "700" : "500",
                cursor: "pointer",
              }}
            >
              {item.label} ({packages.filter((p) => item.id === "ALL" || (item.id === "ACTIVE" ? p.status === "ACTIVE" : p.status !== "ACTIVE")).length})
            </button>
          ))}
        </div>
        <Link
          to="/admin/subscription-packages"
          style={{
            color: "#4f46e5",
            fontSize: "14px",
            fontWeight: "600",
            textDecoration: "none",
          }}
        >
          {t("Hàng chờ duyệt thanh toán thủ công (CFG-03) →", "Manual Review Queue (CFG-03) →")}
        </Link>
      </div>

      {/* Packages Table / Grid */}
      {loading ? (
        <p style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>{t("Đang tải danh sách gói cước…", "Loading packages…")}</p>
      ) : filteredPackages.length === 0 ? (
        <div style={{ background: "#ffffff", padding: "48px 24px", borderRadius: "12px", textAlign: "center", border: "1px solid #e2e8f0" }}>
          <p style={{ fontSize: "16px", color: "#64748b", margin: 0 }}>
            {t("Chưa có gói cước nào trong danh mục này.", "No subscription packages found.")}
          </p>
        </div>
      ) : (
        <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Mã gói", "Code")}</th>
                <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Tên gói cước", "Package Name")}</th>
                <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Thời hạn", "Duration")}</th>
                <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Giá niêm yết", "Price")}</th>
                <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Trạng thái", "Status")}</th>
                <th style={{ padding: "14px 18px", fontWeight: "600", textAlign: "right" }}>{t("Thao tác", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackages.map((pkg) => {
                const isActive = pkg.status === "ACTIVE";
                return (
                  <tr key={pkg.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 18px", fontWeight: "700", color: "#1e293b" }}>
                      <span
                        style={{
                          background: "#e2e8f0",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {pkg.code}
                      </span>
                      {pkg.isPopular && (
                        <span
                          style={{
                            marginLeft: "8px",
                            background: "#fef3c7",
                            color: "#b45309",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "700",
                          }}
                        >
                          ★ POPULAR
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>{pkg.name}</div>
                      {pkg.description && (
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", maxWidth: "340px" }}>
                          {pkg.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px 18px", color: "#334155" }}>
                      <strong>{pkg.durationDays}</strong> {t("ngày", "days")}
                    </td>
                    <td style={{ padding: "14px 18px", fontWeight: "700", color: "#047857" }}>
                      {money(pkg.price, pkg.currency)}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <button
                        onClick={() => handleToggleStatus(pkg)}
                        title={t("Bấm để đổi trạng thái", "Click to toggle")}
                        style={{
                          background: isActive ? "#dcfce7" : "#fee2e2",
                          color: isActive ? "#15803d" : "#b91c1c",
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor" }} />
                        {isActive ? t("Đang bán (ACTIVE)", "ACTIVE") : t("Tạm ẩn (INACTIVE)", "INACTIVE")}
                      </button>
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          onClick={() => openEditModal(pkg)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            color: "#334155",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          {t("Chỉnh sửa", "Edit")}
                        </button>
                        <button
                          onClick={() => handleDelete(pkg)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid #fecaca",
                            background: "#fff5f5",
                            color: "#dc2626",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          {t("Xóa", "Delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Create / Edit */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              maxWidth: "540px",
              width: "100%",
              padding: "24px 28px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                {editingPkg
                  ? t(`Chỉnh sửa gói cước: ${editingPkg.code}`, `Edit Package: ${editingPkg.code}`)
                  : t("Tạo gói cước Premium mới", "Create New Premium Package")}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    {t("Mã gói (Code)", "Package Code")} *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingPkg)}
                    placeholder="VD: 1M, 6M, VIP"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      background: editingPkg ? "#f1f5f9" : "#fff",
                    }}
                  />
                  <small style={{ color: "#64748b", fontSize: "11px" }}>{t("Mã viết hoa, không dấu cách", "Uppercase code, unique")}</small>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    {t("Tên gói hiển thị", "Display Name")} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Gói Tiêu chuẩn 1 Tháng"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    {t("Giá bán (VND)", "Price (VND)")} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    {t("Thời hạn (Số ngày)", "Duration (Days)")} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.durationDays}
                    onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  {t("Mô tả quyền lợi / Tính năng đi kèm", "Description / Benefits")}
                </label>
                <textarea
                  rows="3"
                  maxLength="500"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "24px", marginBottom: "20px", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                  <input
                    type="checkbox"
                    checked={form.isPopular}
                    onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
                  />
                  <span>{t("Gắn nhãn Gói khuyên dùng (Popular)", "Mark as Popular")}</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                  <input
                    type="checkbox"
                    checked={form.status === "ACTIVE"}
                    onChange={(e) => setForm({ ...form, status: e.target.checked ? "ACTIVE" : "INACTIVE" })}
                  />
                  <span>{t("Kích hoạt ngay trên trang bán", "Active for purchase")}</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  {t("Hủy bỏ", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#4f46e5",
                    color: "#ffffff",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {saving ? t("Đang lưu…", "Saving…") : editingPkg ? t("Lưu thay đổi", "Save Changes") : t("Tạo gói cước", "Create Package")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
