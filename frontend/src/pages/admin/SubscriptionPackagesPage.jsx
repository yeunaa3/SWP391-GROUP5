import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getAdminPackages,
  createPackage,
  updatePackage,
  togglePackageStatus,
  deletePackage,
} from "../../services/packageService.js";
import {
  getPremiumReviewQueue,
  reviewPremiumRequest,
} from "../../services/premiumService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { money } from "../../utils/premium.js";
import "../../assets/admin-dashboard.css";

export default function SubscriptionPackagesPage() {
  const { t, language } = usePreferences();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: "packages" (default) or "review"
  const currentTabParam = searchParams.get("tab");
  const activeTab = currentTabParam === "review" ? "review" : "packages";

  function switchTab(newTab) {
    setSearchParams({ tab: newTab });
  }

  // =========================================================================
  // STATE: GÓI CƯỚC PREMIUM (PACKAGES MANAGEMENT - UC-35)
  // =========================================================================
  const [packages, setPackages] = useState([]);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [pkgError, setPkgError] = useState("");
  const [pkgSuccess, setPkgSuccess] = useState("");
  const [pkgFilter, setPkgFilter] = useState("ALL"); // ALL, ACTIVE, INACTIVE

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [savingPkg, setSavingPkg] = useState(false);

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

  // =========================================================================
  // STATE: HÀNG ĐỢI DUYỆT ĐƠN THỦ CÔNG (REVIEW QUEUE - UC-12, UC-13)
  // =========================================================================
  const [requests, setRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(true);
  const [reqError, setReqError] = useState("");
  const [reqSuccess, setReqSuccess] = useState("");
  const [reqFilter, setReqFilter] = useState("ALL"); // ALL, PENDING, PAID, REJECTED

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);

  // =========================================================================
  // DATA LOADING (Tự động tải khi mở trang)
  // =========================================================================
  async function loadPackages() {
    setPkgLoading(true);
    setPkgError("");
    try {
      const data = await getAdminPackages();
      setPackages(data || []);
    } catch (err) {
      setPkgError(err.message || t("Không thể tải danh sách gói cước.", "Failed to load packages."));
    } finally {
      setPkgLoading(false);
    }
  }

  async function loadRequests() {
    setReqLoading(true);
    setReqError("");
    try {
      const data = await getPremiumReviewQueue();
      setRequests(data || []);
    } catch (err) {
      setReqError(err.message || t("Không thể tải danh sách đơn chờ duyệt.", "Failed to load review queue."));
    } finally {
      setReqLoading(false);
    }
  }

  useEffect(() => {
    loadPackages();
    loadRequests();
  }, []);

  // =========================================================================
  // ACTION HANDLERS: GÓI CƯỚC (PACKAGES)
  // =========================================================================
  function openCreateModal() {
    setEditingPkg(null);
    setForm({
      code: "",
      name: "",
      description: t(
        "Truy cập không giới hạn bài viết Premium, trải nghiệm đọc báo không quảng cáo.",
        "Unlimited access to Premium articles with ad-free focus reading."
      ),
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

  async function handlePackageSubmit(e) {
    e.preventDefault();
    setSavingPkg(true);
    setPkgError("");
    setPkgSuccess("");
    try {
      if (editingPkg) {
        await updatePackage(editingPkg.id, form);
        setPkgSuccess(
          t(
            `Đã cập nhật gói ${form.name} thành công.`,
            `Package ${form.name} updated successfully.`
          )
        );
      } else {
        await createPackage(form);
        setPkgSuccess(
          t(
            `Đã tạo mới gói ${form.name} thành công.`,
            `New package ${form.name} created successfully.`
          )
        );
      }
      setModalOpen(false);
      await loadPackages();
    } catch (err) {
      setPkgError(err.message || t("Không thể lưu gói cước.", "Failed to save package."));
    } finally {
      setSavingPkg(false);
    }
  }

  async function handleToggleStatus(pkg) {
    const nextActive = pkg.status !== "ACTIVE";
    try {
      await togglePackageStatus(pkg.id, nextActive);
      setPkgSuccess(
        t(
          `Đã ${nextActive ? "kích hoạt mở bán" : "tạm ẩn"} gói ${pkg.name}.`,
          `Package ${pkg.name} has been ${nextActive ? "activated" : "deactivated"}.`
        )
      );
      await loadPackages();
    } catch (err) {
      setPkgError(err.message || t("Không thể cập nhật trạng thái gói.", "Failed to update package status."));
    }
  }

  async function handleDelete(pkg) {
    if (
      !window.confirm(
        t(
          `Bạn có chắc chắn muốn ngưng kích hoạt gói "${pkg.name}" (${pkg.code})?`,
          `Are you sure you want to deactivate package "${pkg.name}" (${pkg.code})?`
        )
      )
    ) {
      return;
    }
    try {
      await deletePackage(pkg.id);
      setPkgSuccess(
        t(
          `Đã ngưng kích hoạt gói ${pkg.name}.`,
          `Package ${pkg.name} has been deactivated.`
        )
      );
      await loadPackages();
    } catch (err) {
      setPkgError(err.message || t("Không thể xóa gói cước.", "Failed to delete package."));
    }
  }

  // =========================================================================
  // ACTION HANDLERS: DUYỆT ĐƠN THỦ CÔNG (REVIEW REQUESTS)
  // =========================================================================
  async function handleReviewDecision(approve) {
    if (!selectedRequest || reviewBusy) return;
    if (approve && !paymentConfirmed) {
      alert(
        t(
          "Vui lòng tích chọn xác nhận đã đối soát tiền vào tài khoản.",
          "Please verify bank statement and check the confirmation box."
        )
      );
      return;
    }
    if (!approve && !reviewNote.trim()) {
      alert(
        t(
          "Vui lòng nhập lý do từ chối để gửi thông báo cho độc giả.",
          "Please enter a rejection reason to notify the subscriber."
        )
      );
      return;
    }

    setReviewBusy(true);
    setReqError("");
    setReqSuccess("");
    try {
      await reviewPremiumRequest(selectedRequest.id, {
        approve,
        paymentConfirmed,
        note: reviewNote.trim(),
      });
      setReqSuccess(
        approve
          ? t(
              `Đã duyệt và kích hoạt quyền đọc Premium cho tài khoản ${selectedRequest.username}.`,
              `Approved and granted Premium access to account ${selectedRequest.username}.`
            )
          : t(
              `Đã từ chối đơn yêu cầu của tài khoản ${selectedRequest.username}.`,
              `Rejected request for account ${selectedRequest.username}.`
            )
      );
      setSelectedRequest(null);
      setReviewNote("");
      setPaymentConfirmed(false);
      await loadRequests();
    } catch (err) {
      setReqError(err.message || t("Không thể xử lý yêu cầu.", "Failed to process request."));
    } finally {
      setReviewBusy(false);
    }
  }

  // =========================================================================
  // COMPUTED COUNTS & FILTERING
  // =========================================================================
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  const filteredPackages = packages.filter((pkg) => {
    if (pkgFilter === "ACTIVE") return pkg.status === "ACTIVE";
    if (pkgFilter === "INACTIVE") return pkg.status !== "ACTIVE";
    return true;
  });

  const filteredRequests = requests.filter((r) => {
    if (reqFilter === "PENDING") return r.status === "PENDING";
    if (reqFilter === "PAID") return r.status === "PAID";
    if (reqFilter === "REJECTED") return r.status === "REJECTED";
    return true;
  });

  return (
    <main className="page-content admin-overview">
      {/* Hero Header đồng bộ với Admin Dashboard */}
      <header className="admin-overview-hero">
        <div>
          <span className="admin-eyebrow">
            {t("HỆ THỐNG QUẢN TRỊ · CFG-03", "ADMINISTRATION · CFG-03")}
          </span>
          <h1>
            {t(
              "Quản lý Gói cước Premium & Duyệt đơn",
              "Subscription Packages & Review Management"
            )}
          </h1>
          <p>
            {t(
              "Cấu hình danh mục gói cước thành viên cho độc giả C2B và xử lý đối soát các giao dịch thanh toán chuyển khoản.",
              "Configure reader subscription packages and process manual bank transfer payment requests."
            )}
          </p>
        </div>

        <div className="admin-hero-actions">
          {activeTab === "packages" && (
            <button
              className="primary-button"
              style={{
                background: "#4f46e5",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: "10px",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
              }}
              onClick={openCreateModal}
            >
              + {t("Thêm gói cước mới", "Add New Package")}
            </button>
          )}
        </div>
      </header>

      {/* Thông báo kết quả thao tác */}
      {(pkgSuccess || reqSuccess) && (
        <div
          role="status"
          style={{
            background: "#f0fdf4",
            border: "1px solid #86efac",
            color: "#15803d",
            padding: "12px 18px",
            borderRadius: "12px",
            marginBottom: "20px",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          {pkgSuccess || reqSuccess}
        </div>
      )}

      {(pkgError || reqError) && (
        <div
          role="alert"
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#b91c1c",
            padding: "12px 18px",
            borderRadius: "12px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          {pkgError || reqError}
        </div>
      )}

      {/* Segmented Tabs: Đồng bộ với phong cách dashboard */}
      <div className="admin-segment" style={{ display: "inline-flex", marginBottom: "24px" }}>
        <button
          aria-pressed={activeTab === "packages"}
          onClick={() => switchTab("packages")}
          style={{ fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span>{t("Gói cước Premium", "Subscription Packages")}</span>
          <span style={{ fontSize: "11px", opacity: 0.8 }}>({packages.length})</span>
        </button>

        <button
          aria-pressed={activeTab === "review"}
          onClick={() => switchTab("review")}
          style={{ fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span>{t("Hàng đợi duyệt thanh toán", "Manual Review Queue")}</span>
          {pendingCount > 0 && (
            <span
              style={{
                background: "#ef4444",
                color: "#ffffff",
                padding: "1px 7px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: "700",
              }}
            >
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: QUẢN LÝ GÓI CƯỚC PREMIUM (UC-35)                                */}
      {/* ===================================================================== */}
      {activeTab === "packages" && (
        <section>
          {/* Sub-filter tabs */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
            {[
              { id: "ALL", label: t("Tất cả gói", "All Packages"), count: packages.length },
              {
                id: "ACTIVE",
                label: t("Đang kích hoạt", "Active"),
                count: packages.filter((p) => p.status === "ACTIVE").length,
              },
              {
                id: "INACTIVE",
                label: t("Tạm ẩn", "Inactive"),
                count: packages.filter((p) => p.status !== "ACTIVE").length,
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPkgFilter(item.id)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: pkgFilter === item.id ? "#8067ec" : "#e2e8f0",
                  background: pkgFilter === item.id ? "#f3f0fd" : "#ffffff",
                  color: pkgFilter === item.id ? "#514082" : "#64748b",
                  fontWeight: pkgFilter === item.id ? "700" : "500",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </div>

          {pkgLoading ? (
            <div className="admin-skeleton-grid" role="status">
              {[1, 2, 3].map((n) => (
                <div className="admin-skeleton" key={n} />
              ))}
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="admin-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
              <p style={{ color: "#64748b", margin: 0, fontSize: "15px" }}>
                {t("Chưa có gói cước nào trong danh mục này.", "No subscription packages found.")}
              </p>
            </div>
          ) : (
            <div
              className="admin-panel"
              style={{ padding: 0, overflow: "hidden", border: "1px solid var(--ao-line)" }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                    <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Mã gói", "Code")}</th>
                    <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Tên gói cước", "Package Name")}</th>
                    <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Thời hạn", "Duration")}</th>
                    <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Giá niêm yết", "Price")}</th>
                    <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Trạng thái", "Status")}</th>
                    <th style={{ padding: "14px 18px", fontWeight: "600", textAlign: "right" }}>
                      {t("Thao tác", "Actions")}
                    </th>
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
                              background: "#f1f5f9",
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
                              POPULAR
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: "600", color: "#0f172a" }}>{pkg.name}</div>
                          {pkg.description && (
                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", maxWidth: "360px" }}>
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
                              gap: "5px",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: "currentColor",
                              }}
                            />
                            {isActive ? t("Đang bán", "Active") : t("Tạm ẩn", "Inactive")}
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
        </section>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: HÀNG ĐỢI DUYỆT ĐƠN THỦ CÔNG (UC-12, UC-13)                     */}
      {/* ===================================================================== */}
      {activeTab === "review" && (
        <section>
          {/* Sub-filter tabs */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
            {[
              { id: "ALL", label: t("Tất cả đơn", "All Orders"), count: requests.length },
              {
                id: "PENDING",
                label: t("Chờ duyệt", "Pending"),
                count: requests.filter((r) => r.status === "PENDING").length,
              },
              {
                id: "PAID",
                label: t("Đã kích hoạt", "Approved"),
                count: requests.filter((r) => r.status === "PAID").length,
              },
              {
                id: "REJECTED",
                label: t("Đã từ chối", "Rejected"),
                count: requests.filter((r) => r.status === "REJECTED").length,
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setReqFilter(item.id)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: reqFilter === item.id ? "#8067ec" : "#e2e8f0",
                  background: reqFilter === item.id ? "#f3f0fd" : "#ffffff",
                  color: reqFilter === item.id ? "#514082" : "#64748b",
                  fontWeight: reqFilter === item.id ? "700" : "500",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </div>

          {/* Form Xử lý đối soát đơn đang chọn */}
          {selectedRequest && (
            <section
              className="admin-panel"
              style={{
                marginBottom: "24px",
                border: "2px solid #6366f1",
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <span className="admin-eyebrow">
                    {t("ĐỐI SOÁT ĐƠN HÀNG", "RECONCILE ORDER")} #{selectedRequest.id}
                  </span>
                  <h2 style={{ margin: "4px 0" }}>{selectedRequest.packageName}</h2>
                  <p style={{ margin: "4px 0", color: "#64748b", fontSize: "14px" }}>
                    {t("Tài khoản:", "Subscriber:")}{" "}
                    <strong style={{ color: "#1e293b" }}>{selectedRequest.username}</strong>{" "}
                    ({selectedRequest.email || t("Chưa có email", "No email")}) ·{" "}
                    {t("Thời hạn:", "Duration:")}{" "}
                    <strong style={{ color: "#1e293b" }}>
                      {selectedRequest.durationDays} {t("ngày", "days")}
                    </strong>
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {t("Số tiền thanh toán:", "Payment Amount:")}
                  </span>
                  <strong style={{ display: "block", fontSize: "24px", color: "#15803d" }}>
                    {money(selectedRequest.amount, selectedRequest.currency)}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  background: "#f1f5f9",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#334155",
                  marginBottom: "16px",
                }}
              >
                <span>{t("Nội dung chuyển khoản cần đối soát:", "Expected transfer memo:")} </span>
                <code
                  style={{
                    background: "#ffffff",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    color: "#1e40af",
                    fontWeight: "700",
                  }}
                >
                  THE PLUSE {selectedRequest.username} PREMIUM {selectedRequest.id}
                </code>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  margin: "16px 0",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1e293b",
                }}
              >
                <input
                  type="checkbox"
                  disabled={reviewBusy}
                  checked={paymentConfirmed}
                  onChange={(e) => setPaymentConfirmed(e.target.checked)}
                />
                <span>
                  {t(
                    "Tôi đã kiểm tra sao kê ngân hàng và xác nhận tiền đã vào tài khoản hệ thống.",
                    "I verified bank statement and confirmed receipt of funds."
                  )}
                </span>
              </label>

              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  {t("Ghi chú đối soát / Lý do từ chối (nếu có):", "Reconciliation note / Rejection reason:")}
                </label>
                <textarea
                  rows="2"
                  maxLength="500"
                  disabled={reviewBusy}
                  value={reviewNote}
                  placeholder={t(
                    "Nhập mã giao dịch ngân hàng hoặc lý do từ chối gửi thông báo cho độc giả…",
                    "Enter bank transaction code or rejection reason for subscriber…"
                  )}
                  onChange={(e) => setReviewNote(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  disabled={reviewBusy || !paymentConfirmed}
                  onClick={() => handleReviewDecision(true)}
                  style={{
                    background: "#16a34a",
                    color: "#ffffff",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    border: "none",
                    cursor: paymentConfirmed ? "pointer" : "not-allowed",
                    fontSize: "13px",
                    opacity: paymentConfirmed ? 1 : 0.6,
                  }}
                >
                  {t("Xác nhận & Cấp gói", "Confirm & Grant Access")}
                </button>

                <button
                  disabled={reviewBusy || !reviewNote.trim()}
                  onClick={() => handleReviewDecision(false)}
                  style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    border: "1px solid #fca5a5",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: reviewNote.trim() ? "pointer" : "not-allowed",
                    fontSize: "13px",
                  }}
                >
                  {t("Từ chối đơn", "Reject Request")}
                </button>

                <button
                  disabled={reviewBusy}
                  onClick={() => setSelectedRequest(null)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  {t("Đóng", "Close")}
                </button>
              </div>
            </section>
          )}

          {/* Danh sách yêu cầu duyệt */}
          {reqLoading ? (
            <div className="admin-skeleton-grid" role="status">
              {[1, 2, 3].map((n) => (
                <div className="admin-skeleton" key={n} />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="admin-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
              <p style={{ color: "#64748b", margin: 0, fontSize: "15px" }}>
                {t("Không có đơn đăng ký nào trong danh mục này.", "No requests found in this category.")}
              </p>
            </div>
          ) : (
            <div
              className="admin-panel"
              style={{ padding: 0, overflow: "hidden", border: "1px solid var(--ao-line)" }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                    <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Mã đơn", "Order ID")}</th>
                    <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Tài khoản", "Subscriber")}</th>
                    <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Gói cước", "Package")}</th>
                    <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Số tiền", "Amount")}</th>
                    <th style={{ padding: "14px 18px", fontWeight: "600" }}>{t("Trạng thái", "Status")}</th>
                    <th style={{ padding: "14px 18px", fontWeight: "600", textAlign: "right" }}>
                      {t("Thao tác", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => {
                    const isPending = req.status === "PENDING";
                    const isPaid = req.status === "PAID";
                    return (
                      <tr key={req.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "14px 18px", fontWeight: "700", color: "#1e293b" }}>
                          PRE-{req.id}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: "600", color: "#0f172a" }}>{req.username}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {req.email || t("Chưa có email", "No email")}
                          </div>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: "600" }}>{req.packageName}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {req.durationDays} {t("ngày", "days")}
                          </div>
                        </td>
                        <td style={{ padding: "14px 18px", fontWeight: "700", color: "#15803d" }}>
                          {money(req.amount, req.currency)}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              background: isPending ? "#fef3c7" : isPaid ? "#dcfce7" : "#fee2e2",
                              color: isPending ? "#b45309" : isPaid ? "#15803d" : "#b91c1c",
                              padding: "4px 10px",
                              borderRadius: "16px",
                              fontSize: "12px",
                              fontWeight: "700",
                              display: "inline-block",
                            }}
                          >
                            {isPending
                              ? t("Chờ duyệt", "Pending")
                              : isPaid
                              ? t("Đã kích hoạt", "Approved")
                              : t("Từ chối", "Rejected")}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px", textAlign: "right" }}>
                          {isPending ? (
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setReviewNote("");
                                setPaymentConfirmed(false);
                              }}
                              style={{
                                padding: "6px 14px",
                                borderRadius: "6px",
                                border: "none",
                                background: "#4f46e5",
                                color: "#ffffff",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              {t("Xử lý đơn", "Review")}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setReviewNote(req.reviewNotes || "");
                                setPaymentConfirmed(true);
                              }}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                color: "#475569",
                                fontSize: "13px",
                                cursor: "pointer",
                              }}
                            >
                              {t("Xem chi tiết", "Details")}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Modal Tạo / Sửa gói cước */}
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
              borderRadius: "16px",
              maxWidth: "540px",
              width: "100%",
              padding: "24px 28px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                {editingPkg
                  ? t(`Chỉnh sửa gói cước: ${editingPkg.code}`, `Edit Package: ${editingPkg.code}`)
                  : t("Tạo gói cước Premium mới", "Create New Premium Package")}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePackageSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#334155",
                      marginBottom: "4px",
                    }}
                  >
                    {t("Mã gói", "Package Code")} *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingPkg)}
                    placeholder="VD: 1M, 6M, VIP"
                    value={form.code}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                      })
                    }
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
                  <small style={{ color: "#64748b", fontSize: "11px" }}>
                    {t("Mã viết hoa, không dấu cách", "Uppercase code, unique")}
                  </small>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#334155",
                      marginBottom: "4px",
                    }}
                  >
                    {t("Tên gói hiển thị", "Display Name")} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("VD: Gói Tiêu chuẩn 1 Tháng", "E.g. Monthly Standard")}
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

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#334155",
                      marginBottom: "4px",
                    }}
                  >
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
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#334155",
                      marginBottom: "4px",
                    }}
                  >
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
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#334155",
                    marginBottom: "4px",
                  }}
                >
                  {t("Mô tả quyền lợi", "Description / Benefits")}
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
                  <span>{t("Gắn nhãn khuyên dùng (Popular)", "Mark as Popular")}</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                  <input
                    type="checkbox"
                    checked={form.status === "ACTIVE"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.checked ? "ACTIVE" : "INACTIVE",
                      })
                    }
                  />
                  <span>{t("Kích hoạt ngay trên trang bán", "Active for purchase")}</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={savingPkg}
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
                  disabled={savingPkg}
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
                  {savingPkg
                    ? t("Đang lưu…", "Saving…")
                    : editingPkg
                    ? t("Lưu thay đổi", "Save Changes")
                    : t("Tạo gói cước", "Create Package")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
