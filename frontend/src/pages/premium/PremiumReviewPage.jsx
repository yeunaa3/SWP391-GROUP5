import { useEffect, useState } from "react";
import {
  getPremiumReviewQueue,
  reviewPremiumRequest,
  getAdminPackages,
  createAdminPackage,
  updateAdminPackage,
  toggleAdminPackageStatus,
  deleteAdminPackage
} from "../../services/premiumService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { money } from "../../utils/premium.js";
import "../../assets/premium.css";

/**
 * ============================================================================
 * [BF-01][CFG-03] C2B PREMIUM MANAGEMENT & MANUAL PROCESSING
 * Phụ trách: Bùi Quang Cường
 * Quản trị C2B (Độc giả - Báo chí):
 * - Xử lý & đối soát thủ công các yêu cầu đăng ký/gia hạn chuyển khoản
 * - Quản lý, thêm, sửa, bật/tắt danh mục gói cước Premium cho độc giả
 * (Phân định rạch ròi: CFG-03 là C2B, còn CFG-04 và CFG-05 là B2B)
 * ============================================================================
 */
export default function PremiumReviewPage() {
  const { t, language } = usePreferences();
  const [activeTab, setActiveTab] = useState("requests"); // "requests" | "packages"

  // State: Review Queue (Duyệt đơn thủ công)
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

  // State: Package Management (Quản lý gói C2B)
  const [packages, setPackages] = useState([]);
  const [packageLoading, setPackageLoading] = useState(true);
  const [packageError, setPackageError] = useState("");
  const [packageSuccess, setPackageSuccess] = useState("");
  const [packageModal, setPackageModal] = useState(null); // null | { mode: 'create' | 'edit', data: {...} }
  const [packageBusy, setPackageBusy] = useState(false);

  // Form State for Package Add/Edit
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    price: "",
    durationDays: 30,
    displayOrder: 1,
    status: "ACTIVE"
  });

  // Tự động tải dữ liệu hàng đợi duyệt
  async function loadRequests() {
    setReviewLoading(true);
    setReviewError("");
    try {
      const data = await getPremiumReviewQueue();
      setRequests(data || []);
    } catch (e) {
      setReviewError(e.message || "Không thể tải danh sách yêu cầu.");
    } finally {
      setReviewLoading(false);
    }
  }

  // Tự động tải danh sách gói Premium
  async function loadPackages() {
    setPackageLoading(true);
    setPackageError("");
    try {
      const data = await getAdminPackages();
      setPackages(data || []);
    } catch (e) {
      setPackageError(e.message || "Không thể tải danh mục gói cước.");
    } finally {
      setPackageLoading(false);
    }
  }

  // Tự động nạp dữ liệu khi vào trang hoặc chuyển tab (Không cần nút tải lại thủ công)
  useEffect(() => {
    loadRequests();
    loadPackages();
  }, []);

  // Xử lý Duyệt / Từ chối đơn Premium
  async function handleReviewDecision(approve) {
    if (!selectedRequest || reviewBusy) return;
    if (approve && !paymentConfirmed) {
      alert(t("Vui lòng tích xác nhận đã đối soát tiền vào tài khoản.", "Please confirm receipt of payment."));
      return;
    }
    if (!approve && !reviewNote.trim()) {
      alert(t("Vui lòng nhập lý do từ chối để thông báo cho độc giả.", "Please provide a reason for rejection."));
      return;
    }

    setReviewBusy(true);
    setReviewError("");
    setReviewSuccess("");

    try {
      await reviewPremiumRequest(selectedRequest.id, {
        approve,
        paymentConfirmed,
        note: reviewNote.trim()
      });

      setReviewSuccess(
        approve
          ? t(`Đã duyệt và kích hoạt thành công gói cho tài khoản ${selectedRequest.username}.`, `Approved and granted access to ${selectedRequest.username}.`)
          : t(`Đã từ chối đơn yêu cầu của tài khoản ${selectedRequest.username}.`, `Rejected request of ${selectedRequest.username}.`)
      );

      setSelectedRequest(null);
      setReviewNote("");
      setPaymentConfirmed(false);

      // Tự động cập nhật danh sách ngay lập tức
      await loadRequests();
    } catch (e) {
      setReviewError(e.message || "Không thể xử lý yêu cầu.");
    } finally {
      setReviewBusy(false);
    }
  }

  // Mở modal tạo gói cước mới
  function openCreateModal() {
    setFormData({
      code: "",
      name: "",
      description: "",
      price: "",
      durationDays: 30,
      displayOrder: packages.length + 1,
      status: "ACTIVE"
    });
    setPackageModal({ mode: "create" });
    setPackageError("");
    setPackageSuccess("");
  }

  // Mở modal chỉnh sửa gói cước
  function openEditModal(pkg) {
    setFormData({
      id: pkg.id,
      code: pkg.code,
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price,
      durationDays: pkg.durationDays,
      displayOrder: pkg.displayOrder || 1,
      status: pkg.status || "ACTIVE"
    });
    setPackageModal({ mode: "edit", data: pkg });
    setPackageError("");
    setPackageSuccess("");
  }

  // Lưu gói cước (Tạo mới hoặc Cập nhật)
  async function handleSavePackage(e) {
    e.preventDefault();
    if (packageBusy) return;

    if (!formData.name.trim()) {
      alert(t("Tên gói cước không được để trống.", "Plan name is required."));
      return;
    }
    if (packageModal.mode === "create" && !formData.code.trim()) {
      alert(t("Mã gói cước không được để trống.", "Plan code is required."));
      return;
    }
    if (Number(formData.price) < 0 || isNaN(Number(formData.price))) {
      alert(t("Giá cước phải là số lớn hơn hoặc bằng 0.", "Price must be non-negative."));
      return;
    }
    if (Number(formData.durationDays) <= 0) {
      alert(t("Thời hạn gói phải lớn hơn 0 ngày.", "Duration must be positive."));
      return;
    }

    setPackageBusy(true);
    setPackageError("");

    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        currency: "VND",
        durationDays: Number(formData.durationDays),
        displayOrder: Number(formData.displayOrder),
        status: formData.status
      };

      if (packageModal.mode === "create") {
        await createAdminPackage(payload);
        setPackageSuccess(t("Đã tạo mới gói Premium thành công!", "New Premium plan created successfully!"));
      } else {
        await updateAdminPackage(formData.id, payload);
        setPackageSuccess(t("Đã cập nhật thông tin gói cước thành công!", "Plan updated successfully!"));
      }

      setPackageModal(null);
      // Tự động làm mới danh sách gói ngay lập tức
      await loadPackages();
    } catch (err) {
      setPackageError(err.message || "Không thể lưu gói cước.");
    } finally {
      setPackageBusy(false);
    }
  }

  // Bật / Tắt trạng thái mở bán gói
  async function handleToggleStatus(pkg) {
    setPackageBusy(true);
    setPackageError("");
    setPackageSuccess("");
    try {
      await toggleAdminPackageStatus(pkg.id);
      setPackageSuccess(
        t(`Đã chuyển trạng thái gói ${pkg.name} sang ${pkg.status === "ACTIVE" ? "TẠM ẨN" : "MỞ BÁN"}.`,
          `Changed status of ${pkg.name}.`)
      );
      await loadPackages();
    } catch (e) {
      setPackageError(e.message || "Không thể thay đổi trạng thái.");
    } finally {
      setPackageBusy(false);
    }
  }

  // Xóa / Ẩn gói cước
  async function handleDeletePackage(pkg) {
    if (!window.confirm(t(`Bạn có chắc chắn muốn ẩn gói cước "${pkg.name}" khỏi hệ thống?`, `Are you sure you want to disable plan "${pkg.name}"?`))) {
      return;
    }
    setPackageBusy(true);
    setPackageError("");
    try {
      await deleteAdminPackage(pkg.id);
      setPackageSuccess(t(`Đã đóng gói cước "${pkg.name}".`, `Disabled plan "${pkg.name}".`));
      await loadPackages();
    } catch (e) {
      setPackageError(e.message || "Không thể xóa gói cước.");
    } finally {
      setPackageBusy(false);
    }
  }

  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  return (
    <main className="page-content premium-page">
      {/* Header Banner */}
      <header className="premium-hero" style={{ padding: "32px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <span className="premium-kicker" style={{ letterSpacing: "0.15em", color: "#166534" }}>
              ADMINISTRATOR · C2B MANAGEMENT (CFG-03)
            </span>
            <h1 style={{ margin: "8px 0 12px", fontSize: "2rem" }}>
              {t("Quản lý Gói cước Premium & Duyệt đơn C2B", "C2B Premium Packages & Manual Review")}
            </h1>
            <p style={{ maxWidth: "780px", color: "#475569", margin: 0, fontSize: "0.95rem" }}>
              {t(
                "Không gian nghiệp vụ C2B (Độc giả - Báo chí): Xử lý đối soát thủ công các giao dịch chuyển khoản khi gặp ngoại lệ, đồng thời quản lý danh mục gói cước mở bán cho người đọc.",
                "C2B (Reader-facing) administration: Manually reconcile bank transfers and manage reader subscription packages."
              )}
            </p>
          </div>
          <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", color: "#92400E", padding: "8px 16px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "600" }}>
            📌 C2B (Độc giả) · Tách biệt với CFG-04 & CFG-05 (B2B Doanh nghiệp)
          </div>
        </div>

        {/* Tab Switchers */}
        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <button
            onClick={() => setActiveTab("requests")}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              fontWeight: "700",
              cursor: "pointer",
              background: activeTab === "requests" ? "#166534" : "#E2E8F0",
              color: activeTab === "requests" ? "#FFFFFF" : "#334155",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            📋 {t("Hàng đợi Duyệt đơn chuyển khoản", "Manual Review Queue")}
            {pendingCount > 0 && (
              <span style={{ background: "#DC2626", color: "#FFFFFF", padding: "2px 8px", borderRadius: "20px", fontSize: "0.75rem" }}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("packages")}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              fontWeight: "700",
              cursor: "pointer",
              background: activeTab === "packages" ? "#166534" : "#E2E8F0",
              color: activeTab === "packages" ? "#FFFFFF" : "#334155",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            📦 {t("Quản lý Danh mục Gói cước C2B", "Manage C2B Plans")} ({packages.length})
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* TAB 1: DUYỆT ĐƠN & ĐỐI SOÁT THỦ CÔNG                                    */}
      {/* ========================================================================= */}
      {activeTab === "requests" && (
        <section>
          {reviewSuccess && (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", color: "#166534", padding: "14px 20px", borderRadius: "12px", marginBottom: "20px", fontWeight: "600" }}>
              ✓ {reviewSuccess}
            </div>
          )}

          {reviewError && (
            <p className="error-message" role="alert" style={{ marginBottom: "20px" }}>
              {reviewError}
            </p>
          )}

          {/* Form Xử lý đơn đang chọn */}
          {selectedRequest && (
            <section className="premium-panel" style={{ border: "2px solid #2563EB", background: "#F8FAFC" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span className="premium-kicker" style={{ color: "#2563EB" }}>
                    XỬ LÝ ĐỐI SOÁT ĐƠN HÀNG #{selectedRequest.id}
                  </span>
                  <h2 style={{ margin: "6px 0" }}>{selectedRequest.packageName}</h2>
                  <p style={{ margin: "4px 0", color: "#475569" }}>
                    Tài khoản: <strong>{selectedRequest.username}</strong> ({selectedRequest.email || "Chưa có email"}) · Thời hạn: <strong>{selectedRequest.durationDays} ngày</strong>
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748B" }}>Số tiền thanh toán:</span>
                  <strong style={{ display: "block", fontSize: "1.6rem", color: "#166534" }}>
                    {money(selectedRequest.amount, selectedRequest.currency)}
                  </strong>
                </div>
              </div>

              <div style={{ margin: "16px 0", padding: "14px", background: "#EFF6FF", borderRadius: "10px", border: "1px dashed #93C5FD", fontSize: "0.9rem" }}>
                💡 <strong>Cú pháp sao kê chuẩn:</strong> <code style={{ background: "#FFFFFF", padding: "2px 8px", borderRadius: "4px", color: "#1E40AF" }}>THE PLUSE {selectedRequest.username} PREMIUM {selectedRequest.id}</code> (hoặc <code>DANG KY GOI {selectedRequest.packageId}</code>). Kiểm tra kỹ số tài khoản thụ hưởng trước khi bấm xác nhận.
              </div>

              <label className="premium-consent" style={{ margin: "16px 0" }}>
                <input
                  type="checkbox"
                  disabled={reviewBusy}
                  checked={paymentConfirmed}
                  onChange={e => setPaymentConfirmed(e.target.checked)}
                />
                <span style={{ fontWeight: "600", color: "#1E293B" }}>
                  {t("Tôi đã kiểm tra sao kê ngân hàng và xác nhận tiền đã vào tài khoản hệ thống.", "I verified that funds have reached our bank account.")}
                </span>
              </label>

              <label className="premium-review-note">
                <span>{t("Ghi chú đối soát / Lý do từ chối (nếu có):", "Reconciliation note / Rejection reason:")}</span>
                <textarea
                  maxLength={500}
                  disabled={reviewBusy}
                  value={reviewNote}
                  placeholder={t("Nhập mã giao dịch ngân hàng, hoặc lý do từ chối để gửi email cho độc giả…", "Enter bank txn ref, or rejection reason…")}
                  onChange={e => setReviewNote(e.target.value)}
                  style={{ borderRadius: "8px", border: "1px solid #CBD5E1", padding: "10px" }}
                />
              </label>

              <div className="premium-review-actions" style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button
                  disabled={reviewBusy || !paymentConfirmed}
                  onClick={() => handleReviewDecision(true)}
                  style={{ background: "#166534", color: "#FFFFFF", padding: "12px 24px", borderRadius: "10px", fontWeight: "700", border: "none", cursor: "pointer" }}
                >
                  ✓ {t("Xác nhận đã nhận tiền & Cấp gói", "Confirm payment & Activate plan")}
                </button>

                <button
                  className="secondary-button"
                  disabled={reviewBusy || !reviewNote.trim()}
                  onClick={() => handleReviewDecision(false)}
                  style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #F87171", padding: "12px 20px", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}
                >
                  ✕ {t("Từ chối đơn", "Reject request")}
                </button>

                <button
                  className="secondary-button"
                  disabled={reviewBusy}
                  onClick={() => setSelectedRequest(null)}
                  style={{ padding: "12px 20px", borderRadius: "10px", cursor: "pointer" }}
                >
                  {t("Đóng", "Close")}
                </button>
              </div>
            </section>
          )}

          {reviewLoading && <p role="status">{t("Đang tải danh sách yêu cầu…", "Loading requests…")}</p>}

          {!reviewLoading && !reviewError && !requests.length && (
            <div className="premium-empty" style={{ padding: "48px 24px", textAlign: "center" }}>
              <p style={{ fontSize: "1.1rem", color: "#64748B" }}>
                ✓ {t("Hiện không có đơn đăng ký nào chờ đối soát.", "No pending requests awaiting manual review.")}
              </p>
            </div>
          )}

          {/* Danh sách yêu cầu */}
          <div style={{ display: "grid", gap: "16px" }}>
            {requests.map(row => (
              <article
                className="premium-panel"
                key={row.id}
                style={{
                  margin: 0,
                  borderLeft: row.status === "PENDING" ? "5px solid #F59E0B" : row.status === "PAID" ? "5px solid #16A34A" : "5px solid #EF4444"
                }}
              >
                <div className="premium-request-heading">
                  <div>
                    <span className={`premium-request-status ${row.status === "PAID" ? "is-approved" : row.status === "REJECTED" ? "is-rejected" : ""}`}>
                      {row.status === "PENDING" ? "◷ ĐANG CHỜ DUYỆT" : row.status === "PAID" ? "✓ ĐÃ KÍCH HOẠT" : "✕ ĐÃ TỪ CHỐI"}
                    </span>
                    <h3 style={{ margin: "8px 0 4px" }}>{row.packageName}</h3>
                    <p style={{ margin: 0, color: "#64748B", fontSize: "0.9rem" }}>
                      Độc giả: <strong>{row.username}</strong> · Email: {row.email || "—"} · Gửi lúc: {String(row.submittedAt).replace("T", " ").slice(0, 19)}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong className="premium-price" style={{ margin: "0 0 6px", fontSize: "1.4rem", color: "#0F172A" }}>
                      {money(row.amount, row.currency)}
                    </strong>
                    <span className="premium-duration">{row.durationDays} {t("ngày", "days")}</span>
                  </div>
                </div>

                {row.reviewNote && (
                  <p style={{ marginTop: "12px", padding: "10px 14px", background: "#F1F5F9", borderRadius: "8px", fontSize: "0.85rem", color: "#334155" }}>
                    <strong>Ghi chú kiểm duyệt:</strong> {row.reviewNote}
                  </p>
                )}

                {row.status === "PENDING" && (
                  <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className="secondary-button"
                      disabled={reviewBusy}
                      onClick={() => {
                        setSelectedRequest(row);
                        setReviewNote("");
                        setPaymentConfirmed(false);
                      }}
                      style={{ padding: "8px 18px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
                    >
                      🔍 {t("Kiểm tra sao kê & Xử lý", "Review & Settle")}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUẢN LÝ DANH MỤC GÓI CƯỚC C2B                                     */}
      {/* ========================================================================= */}
      {activeTab === "packages" && (
        <section>
          {packageSuccess && (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", color: "#166534", padding: "14px 20px", borderRadius: "12px", marginBottom: "20px", fontWeight: "600" }}>
              ✓ {packageSuccess}
            </div>
          )}

          {packageError && (
            <p className="error-message" role="alert" style={{ marginBottom: "20px" }}>
              {packageError}
            </p>
          )}

          {/* Action Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ margin: 0 }}>{t("Danh sách Gói Hội Viên C2B", "Consumer Subscription Packages")}</h2>
              <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: "0.9rem" }}>
                {t("Cấu hình giá tiền, số ngày trải nghiệm và hiển thị ra trang chọn gói cho độc giả.", "Manage packages displayed on the public reader pricing page.")}
              </p>
            </div>
            <button
              onClick={openCreateModal}
              style={{
                background: "#166534",
                color: "#FFFFFF",
                padding: "12px 20px",
                borderRadius: "10px",
                fontWeight: "700",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              + {t("Thêm gói cước mới", "Add New Plan")}
            </button>
          </div>

          {/* Modal Form Thêm / Sửa Gói */}
          {packageModal && (
            <section className="premium-panel" style={{ border: "2px solid #166534", background: "#F8FAFC", marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 16px" }}>
                {packageModal.mode === "create" ? "➕ Thêm gói cước Premium mới" : `✏️ Chỉnh sửa gói cước: ${formData.code}`}
              </h3>
              <form onSubmit={handleSavePackage} style={{ display: "grid", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                  <label>
                    <span style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                      Mã định danh gói (CODE) *
                    </span>
                    <input
                      type="text"
                      required
                      disabled={packageModal.mode === "edit" || packageBusy}
                      value={formData.code}
                      placeholder="VD: VIP_1M, ANNUAL_365"
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                    />
                  </label>

                  <label>
                    <span style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                      Tên gói cước *
                    </span>
                    <input
                      type="text"
                      required
                      disabled={packageBusy}
                      value={formData.name}
                      placeholder="VD: Gói Trải Nghiệm 1 Tháng"
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                    />
                  </label>

                  <label>
                    <span style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                      Giá cước (VND) *
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1000"
                      disabled={packageBusy}
                      value={formData.price}
                      placeholder="VD: 59000"
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                    />
                  </label>

                  <label>
                    <span style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                      Thời hạn sử dụng (Số ngày) *
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      disabled={packageBusy}
                      value={formData.durationDays}
                      placeholder="VD: 30"
                      onChange={e => setFormData({ ...formData, durationDays: e.target.value })}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                    />
                  </label>

                  <label>
                    <span style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                      Thứ tự hiển thị
                    </span>
                    <input
                      type="number"
                      min="1"
                      disabled={packageBusy}
                      value={formData.displayOrder}
                      onChange={e => setFormData({ ...formData, displayOrder: e.target.value })}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                    />
                  </label>
                </div>

                <label>
                  <span style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                    Mô tả gói cước & Quyền lợi
                  </span>
                  <textarea
                    rows={3}
                    disabled={packageBusy}
                    value={formData.description}
                    placeholder="Mô tả quyền lợi nổi bật của gói cước cho độc giả…"
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                  />
                </label>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={packageBusy}
                    style={{ background: "#166534", color: "#FFFFFF", padding: "10px 24px", borderRadius: "8px", fontWeight: "700", border: "none", cursor: "pointer" }}
                  >
                    {packageBusy ? "Đang lưu…" : "Lưu gói cước"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={packageBusy}
                    onClick={() => setPackageModal(null)}
                    style={{ padding: "10px 18px", borderRadius: "8px", cursor: "pointer" }}
                  >
                    Hủy bỏ
                  </button>
                </div>
              </form>
            </section>
          )}

          {packageLoading && <p role="status">{t("Đang tải danh mục gói…", "Loading plans…")}</p>}

          {/* Bảng Danh mục Gói C2B */}
          {!packageLoading && (
            <div className="premium-panel" style={{ padding: "0", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ background: "#F1F5F9", borderBottom: "2px solid #CBD5E1", color: "#475569" }}>
                      <th style={{ padding: "14px 18px" }}>Mã gói</th>
                      <th style={{ padding: "14px 18px" }}>Tên gói cước</th>
                      <th style={{ padding: "14px 18px" }}>Thời hạn</th>
                      <th style={{ padding: "14px 18px" }}>Đơn giá</th>
                      <th style={{ padding: "14px 18px" }}>Mô tả</th>
                      <th style={{ padding: "14px 18px" }}>Trạng thái</th>
                      <th style={{ padding: "14px 18px", textAlign: "right" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map(pkg => (
                      <tr key={pkg.id} style={{ borderBottom: "1px solid #E2E8F0" }}>
                        <td style={{ padding: "14px 18px", fontWeight: "700", color: "#1E293B" }}>
                          <code>{pkg.code}</code>
                        </td>
                        <td style={{ padding: "14px 18px", fontWeight: "600" }}>{pkg.name}</td>
                        <td style={{ padding: "14px 18px" }}>
                          <span className="premium-duration">{pkg.durationDays} ngày</span>
                        </td>
                        <td style={{ padding: "14px 18px", fontWeight: "700", color: "#166534" }}>
                          {money(pkg.price, pkg.currency)}
                        </td>
                        <td style={{ padding: "14px 18px", color: "#64748B", maxWidth: "260px" }}>
                          {pkg.description || "—"}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: "20px",
                            fontSize: "0.78rem",
                            fontWeight: "700",
                            background: pkg.status === "ACTIVE" ? "#DCFCE7" : "#F1F5F9",
                            color: pkg.status === "ACTIVE" ? "#166534" : "#64748B"
                          }}>
                            {pkg.status === "ACTIVE" ? "✓ ĐANG MỞ BÁN" : "TẠM ẨN"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "8px" }}>
                            <button
                              className="secondary-button"
                              onClick={() => openEditModal(pkg)}
                              style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer" }}
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              className="secondary-button"
                              onClick={() => handleToggleStatus(pkg)}
                              style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer" }}
                            >
                              {pkg.status === "ACTIVE" ? "Ẩn gói" : "Mở bán"}
                            </button>
                            <button
                              className="secondary-button"
                              onClick={() => handleDeletePackage(pkg)}
                              style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", color: "#DC2626", cursor: "pointer" }}
                            >
                              🗑 Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
