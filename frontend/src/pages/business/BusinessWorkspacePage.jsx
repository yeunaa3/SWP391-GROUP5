import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { apiRequest } from "../../services/apiClient.js";
import { getAdvertisingCatalog } from "../../services/contentService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import AutoPaymentTimerCard from "../../components/AutoPaymentTimerCard.jsx";
import { checkPaymentStatus } from "../../services/paymentService.js";
import UiIcon from "../../components/UiIcon.jsx";
import SlotBookingCalendar from "../../components/SlotBookingCalendar.jsx";
import PartnershipStatus from "./PartnershipStatus.jsx";
import "../../assets/partnership-status.css";
import ContractDraftEditor from "./ContractDraftEditor.jsx";
import { applicationSubmitBlockReason, legalDocumentError } from "../../utils/partnershipApplication.js";
import { addDays } from "../../utils/bookingCalendar.js";

const statusLabels = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ xét duyệt",
  RESUBMITTED: "Đã gửi lại",
  NEEDS_REVISION: "Cần chỉnh sửa",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  ACTIVE: "Đang hiệu lực",
  PAID: "Đã thanh toán",
  UNPAID: "Chưa thanh toán",
  PROPOSED: "Đã có đề xuất",
  SCHEDULED: "Đã lên lịch",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
  PENDING: "Đang chờ thanh toán",
  ACCEPTED: "Đã chấp nhận",
  PENDING_PAYMENT: "Chờ thanh toán",
  PAYMENT_FAILED: "Thanh toán thất bại",
  FAILED: "Thất bại",
};

const contractListStatuses = [
  "DRAFT",
  "PENDING_REVIEW",
  "PROPOSED",
  "REVISION_REQUESTED",
  "ACCEPTED",
  "PENDING_PAYMENT",
  "PAYMENT_FAILED",
  "ACTIVE",
  "CANCELLED",
  "EXPIRED",
  "COMPLETED",
];

const contractPaymentStatuses = ["PENDING", "PAID", "FAILED", "UNPAID"];

const status = (value) => statusLabels[value] || value || "Chưa có";
const currency = (value) => Number(value || 0).toLocaleString("vi-VN") + " ₫";
const time = (value) => (value ? String(value).replace("T", " ").slice(0, 16) : "—");
const inclusiveProposalEnd = (value) => {
  if (!value) return "—";
  const normalized = String(value).replace(" ", "T").slice(0, 16);
  return `${addDays(normalized.slice(0, 10), -1)} ${normalized.slice(11, 16)}`;
};
const datetime = (value) =>
  value ? String(value).replace(" ", "T").slice(0, 16) : "";
const editable = (value) => ["DRAFT", "NEEDS_REVISION"].includes(value);

const empty = {
  company: {},
  documents: [],
  contracts: [],
  campaigns: [],
};

// UC-25/BUS-13: giải thích vì sao các thao tác booking/chiến dịch bị khóa theo hồ sơ hợp tác.
function partnershipNotice(state) {
  if (["PENDING_REVIEW", "RESUBMITTED"].includes(state)) {
    return "Hồ sơ hợp tác đã gửi yêu cầu. Vui lòng chờ Partnership Application được phê duyệt.";
  }

  if (state === "REJECTED") {
    return "Hồ sơ hợp tác bị từ chối. Vui lòng tạo Partnership Application mới và chờ phê duyệt.";
  }

  if (state === "NEEDS_REVISION") {
    return "Hồ sơ hợp tác cần chỉnh sửa. Vui lòng sửa, gửi lại và chờ phê duyệt.";
  }

  return "Vui lòng hoàn thiện và gửi Partnership Application, sau đó chờ phê duyệt để sử dụng chức năng này.";
}

function Field({ label, children }) {
  return (
    <label className="business-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Badge({ value }) {
  return (
    <span
      className={`status-pill business-badge badge-${String(
        value || "EMPTY",
      ).toLowerCase()}`}
    >
      {status(value)}
    </span>
  );
}

/** Đọc báo giá đã chốt trong DB để thay đổi catalog sau này không làm mất căn cứ giá cũ. */
function QuoteSummary({ quote }) {
  let saved = quote;

  if (typeof saved === "string") {
    try {
      saved = JSON.parse(saved);
    } catch {
      saved = null;
    }
  }

  if (!saved || typeof saved !== "object") {
    return null;
  }

  return (
    <section className="info-note">
      <h3>Báo giá đã lưu</h3>
      <dl className="business-details">
        <dt>Giá gói</dt>
        <dd>{currency(saved.packagePrice)}</dd>
        <dt>Giá vị trí</dt>
        <dd>{currency(saved.slotMonthlyPrice)}</dd>
        <dt>Số ngày</dt>
        <dd>{saved.days}</dd>
        <dt>Tổng báo giá</dt>
        <dd>{currency(saved.total)}</dd>
        <dt>Thời điểm báo giá</dt>
        <dd>{time(saved.quotedAt)}</dd>
      </dl>
      <p>
        Tổng = giá gói + giá vị trí. Gửi yêu cầu chưa đồng nghĩa
        giữ chỗ hoặc đã thanh toán.
      </p>
    </section>
  );
}

export default function BusinessWorkspacePage({ screen }) {
  const { tr } = usePreferences();
  const params = useParams();
  const navigate = useNavigate();
  const [query] = useSearchParams();

  // Dữ liệu workspace: hồ sơ công ty, hợp đồng, chiến dịch, tài liệu pháp lý
  const [data, setData] = useState(empty);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contractSearch, setContractSearch] = useState("");
  const [contractStatusFilter, setContractStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");

  // Các trạng thái thao tác: đang gửi, lỗi, thông báo thành công
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [proposalRevisionReason, setProposalRevisionReason] = useState("");
  const [showProposalRevisionForm, setShowProposalRevisionForm] = useState(false);
  const [showBookingCancellation, setShowBookingCancellation] = useState(false);
  const [bookingCancellationReason, setBookingCancellationReason] = useState("");

  // UC-38/BUS-02: dữ liệu đang chỉnh sửa của hồ sơ công ty, độc lập với hồ sơ cá nhân ở UC-08.
  const [companyForm, setCompanyForm] = useState({
    name: "",
    taxCode: "",
    email: "",
    phone: "",
    address: "",
    billingAddress: "",
  });

  // UC-25/BUS-07: dữ liệu đang chỉnh sửa của yêu cầu đặt quảng cáo, độc lập với dữ liệu hợp đồng/campaign.
  const [booking, setBooking] = useState({
    name: "",
    slotId: query.get("slotId") || "",
    packageId: query.get("packageId") || "",
    startDate: query.get("startDate") || "",
    endDate: query.get("endDate") || "",
  });

  // UC-25/BUS-07: trạng thái kiểm tra lịch đặt quảng cáo, xung đột hay hợp lệ.
  const [calendarError, setCalendarError] = useState("");
  const [calendarValid, setCalendarValid] = useState(false);
  const [editingBooking, setEditingBooking] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // UC-25/BUS-07: dữ liệu đang chỉnh sửa của chiến dịch, độc lập với dữ liệu hợp đồng.
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    description: "",
    contractId: "",
    startTime: "",
    endTime: "",
  });


  // UC-25/BUS-07: dữ liệu file upload và URL đích của chiến dịch, không lưu trong DB.
  const [file, setFile] = useState(null);
  const [documentError, setDocumentError] = useState("");
  const [applicationConfirm, setApplicationConfirm] = useState(false);
  const [documentNotice, setDocumentNotice] = useState("");
  const [documentInputKey, setDocumentInputKey] = useState(0);
  const documentSaving = useRef(false);
  const [targetUrl, setTargetUrl] = useState("");

  const queryString = query.toString();


  useEffect(() => {
    if (screen.id === "BUS-07") {
      const selected = new URLSearchParams(queryString);

      setBooking({
        name: "",
        slotId: selected.get("slotId") || "",
        packageId: selected.get("packageId") || "",
        startDate: selected.get("startDate") || "",
        endDate: selected.get("endDate") || "",
      });
    }
  }, [screen.id, queryString]);


  const current = data.campaigns.find(
    (campaign) => String(campaign.campaign_id) === params.campaignId,
  );
  const targetContractId =
    params.contractId ||
    query.get("contractId") ||
    query.get("id");

  const contract =
    data.contracts.find((item) => String(item.contract_id) === String(targetContractId)) ||
    (screen.id === "BUS-10" && query.get("orderCode")
      ? data.contracts.find((item) => String(item.contract_id) === String(query.get("orderCode")))
      : null) ||
    (screen.id === "BUS-10"
      ? data.contracts.find((item) => item.status === "PENDING_PAYMENT" || item.payment_status === "UNPAID" || item.payment_status === "PENDING") ||
        data.contracts[0]
      : null);

  const activeContractId = contract?.contract_id || targetContractId || "";
  const linkedCampaigns = data.campaigns.filter(
    (item) => String(item.contract_id) === String(contract?.contract_id),
  );
  const contractRows = (data.contracts || []).filter((item) => {
    const search = contractSearch.trim().toLocaleLowerCase("vi");
    const matchesSearch = !search || [
      item.contract_code,
      item.contract_name,
      item.package_name_snapshot,
      item.slot_name_snapshot,
    ].some((value) => String(value || "").toLocaleLowerCase("vi").includes(search));
    const matchesContractStatus = !contractStatusFilter || item.status === contractStatusFilter;
    const matchesPaymentStatus = !paymentStatusFilter || item.payment_status === paymentStatusFilter;
    return matchesSearch && matchesContractStatus && matchesPaymentStatus;
  });
  const contractsAwaitingReview = (data.contracts || []).filter((item) =>
    ["PENDING_REVIEW", "PROPOSED", "REVISION_REQUESTED"].includes(item.status),
  ).length;
  const contractsAwaitingPayment = (data.contracts || []).filter((item) =>
    ["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(item.status)
      && item.payment_status !== "PAID",
  ).length;
  const activePaidContractCount = (data.contracts || []).filter((item) =>
    item.status === "ACTIVE" && item.payment_status === "PAID",
  ).length;
  const canCancelContract = Boolean(contract && (
    ["PENDING_REVIEW", "PROPOSED", "REVISION_REQUESTED", "ACCEPTED", "PENDING_PAYMENT", "PAYMENT_FAILED"].includes(contract.status)
    || (contract.status === "ACTIVE" && contract.payment_status === "PAID")
  ));

  // Tự động kiểm tra và xác nhận thanh toán khi PayOS redirect về có mã thành công
  useEffect(() => {
    const isPayOsReturn =
      (query.get("status") === "PAID" || query.get("code") === "00") &&
      ["BUS-09", "BUS-10", "BUS-12"].includes(screen.id);

    if (isPayOsReturn && contract?.contract_id) {
      const orderCode = query.get("orderCode");
      checkPaymentStatus("CONTRACT", contract.contract_id, orderCode ? Number(orderCode) : undefined)
        .then((res) => {
          if (res?.paid) {
            setMessage("⚡ Thanh toán hợp đồng thành công! Hợp đồng đã kích hoạt có hiệu lực.");
            refresh();
          }
        })
        .catch(() => {});
    }
  }, [screen.id, contract?.contract_id, query]);

  // Nạp lại dữ liệu thật từ backend sau thao tác lưu/gửi; không tự giả lập trạng thái thành công.
  async function refresh() {
    const result = await apiRequest("/api/business/workspace", { cache: "no-store" });
    setData(result);
    return result;
  }

  // Nạp dữ liệu thật từ backend khi vào trang, đồng thời nạp catalog quảng cáo để hiển thị giá/ID gói và vị trí.
  useEffect(() => {
    let alive = true;

    setLoading(true);
    setError("");
    setMessage("");
    setFile(null);
    setDocumentError("");
    setDocumentNotice("");
    setApplicationConfirm(false);
    setEditingBooking(false);
    setDeleteConfirm(false);

    Promise.all([
      apiRequest("/api/business/workspace"),
      // Hồ sơ và trạng thái hợp tác không phụ thuộc danh mục quảng cáo.
      ["BUS-03", "BUS-04"].includes(screen.id) ? Promise.resolve(null) : getAdvertisingCatalog(),
    ])
      .then(([result, offers]) => {
        if (!alive) {
          return;
        }

        setData(result);
        setCatalog(offers);

        const company = result.company;

        setCompanyForm({
          name: company.company_name || "",
          taxCode: company.tax_code || "",
          email: company.email || "",
          phone: company.phone || "",
          address: company.address || "",
          billingAddress: company.billing_address || "",
        });

        const draft = result.contracts.find(
          (row) => String(row.contract_id) === params.contractId,
        );

        if (draft) {
          setBooking({
            name: draft.contract_name,
            slotId: String(draft.slot_id),
            packageId: String(draft.b2b_package_id),
            startDate: String(draft.start_at).slice(0, 10),
            endDate: new Date(
              Date.parse(`${String(draft.end_at).slice(0, 10)}T00:00:00Z`) -
              86400000,
            )
              .toISOString()
              .slice(0, 10),
          });
        }

        const selected = result.campaigns.find(
          (row) => String(row.campaign_id) === params.campaignId,
        );

        setCampaignForm(
          selected
            ? {
              name: selected.campaign_name,
              description: selected.description || "",
              contractId: String(selected.contract_id),
              startTime: datetime(selected.scheduled_start_time),
              endTime: datetime(selected.scheduled_end_time),
            }
            : {
              name: "",
              description: "",
              contractId: "",
              startTime: "",
              endTime: "",
            },
        );

        setTargetUrl(selected?.target_url || "");
      })
      .catch((e) => {
        if (alive) {
          setError(e.message);
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [screen.id, params.campaignId, params.contractId]);



  // Bao thao tác API: khóa gửi lặp, hiển thị lỗi/thành công, đồng bộ workspace rồi gọi callback nếu có.
  async function action(task, success, after) {
    if (busy) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await task();
      setMessage(success);
      after?.(result);

      await refresh().catch(() =>
        setError(
          "Thao tác đã lưu thành công nhưng chưa tải lại được dữ liệu. Bấm Làm mới để xem, không cần gửi lại.",
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function handleProposalDecision(decision, reason = "", changeType = "") {
    if (!contract) return;

    action(
      () =>
        apiRequest(
          `/api/business/bookings/${contract.contract_id}/proposal/decision`,
          {
            method: "POST",
            body: JSON.stringify({
              expectedRevisionNo: Number(contract.revision_no),
              proposalRevisionNo: Number(contract.latest_proposal_revision_no),
              decision,
              changeType: decision === "REQUEST_REVISION" ? changeType : null,
              reason: decision === "REQUEST_REVISION" ? reason.trim() : null,
            }),
          },
        ),
      decision === "ACCEPT"
        ? "Đã đồng ý đề xuất. Hợp đồng đang chờ thanh toán."
        : changeType === "CONTRACT_INFO"
          ? "Đã gửi yêu cầu đổi thông tin hợp đồng cho Ad Manager."
          : "Đã gửi yêu cầu sửa điều khoản cho Ad Manager.",
      decision === "REQUEST_REVISION"
        ? () => {
          setProposalRevisionReason("");
          setShowProposalRevisionForm(false);
        }
        : undefined,
    );
  }

  // Làm mới bỏ phần đang sửa và tải thông tin đã lưu, không ghi dữ liệu form.
  async function reloadWorkspace() {
    setApplicationConfirm(false);
    if (busy || loading) {
      return;
    }

    setEditingBooking(false);
    setDeleteConfirm(false);
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await refresh();
      setMessage("Đã cập nhật dữ liệu mới nhất.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // UC-25/BUS-07: tìm thông tin vị trí và gói đã chọn để tính toán và validate
  const json = (path, body, method = "POST") =>
    apiRequest(path, {
      method,
      body: JSON.stringify(body),
    });

  const activeContracts = data.contracts.filter(
    (item) =>
      item.status === "ACTIVE" &&
      item.payment_status === "PAID" &&
      new Date(item.end_at) > new Date(),
  );

  const isProfile = screen.id === "BUS-02";
  const isPartnership = ["BUS-03", "BUS-04"].includes(screen.id);
  const isApplication = screen.id === "BUS-03";
  const submitBlockReason = applicationSubmitBlockReason(data.company, data.documents, file, busy);

  /** Chọn tệp chưa phải upload; chỉ xóa lựa chọn sau khi server xác nhận đã lưu tài liệu. */
  async function uploadApplicationDocument(event) {
    event.preventDefault();
    if (busy || documentSaving.current) return;
    const validation = legalDocumentError(file);
    setDocumentError(validation); setDocumentNotice("");
    if (validation) return;
    if (data.documents.length >= 5) { setDocumentError("Tối đa 5 tài liệu. Hãy gỡ tệp không dùng trước khi tải thêm."); return; }
    documentSaving.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const body = new FormData(); body.append("file", file);
      await apiRequest("/api/business/documents", { method: "POST", body });
      setFile(null); setDocumentInputKey(value => value + 1);
      try {
        await refresh();
        setDocumentNotice("Đã tải tài liệu lên máy chủ. Kiểm tra tài liệu trong danh sách rồi bấm Gửi đăng ký hợp tác.");
      } catch {
        setDocumentError("Tài liệu đã được lưu nhưng chưa tải lại được danh sách. Bấm Làm mới để kiểm tra; không cần tải tệp lại.");
      }
    } catch (e) {
      setDocumentError(e.message); // Giữ tệp để người dùng sửa lỗi/thử lại, không báo thành công giả.
    } finally { documentSaving.current = false; setBusy(false); }
  }

  // BUS-13 hiển thị danh sách ở nhánh riêng; isCampaign dùng cho màn tạo/sửa/banner/gửi/chi tiết.
  const isCampaign = ["BUS-14", "BUS-15", "BUS-16", "BUS-17"].includes(
    screen.id,
  );

  // Kiểm tra cả đường dẫn trực tiếp: chỉ hồ sơ APPROVED được mở booking và chiến dịch.
  if (
    !loading &&
    ["BUS-07", "BUS-13", "BUS-14", "BUS-15", "BUS-16", "BUS-17"].includes(
      screen.id,
    ) &&
    data.company.application_status !== "APPROVED"
  ) {
    return (
      <main className="page-content business-live">
        <div className="page-heading">
          <h1>{tr(screen.name)}</h1>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <section className="dashboard-section">
          <p className="info-note" role="status">
            {partnershipNotice(data.company.application_status)}
          </p>
          <div className="form-actions">
            <Link className="button-link" to="/business/partnership/status">
              Xem hồ sơ hợp tác
            </Link>
            <Link className="outline-button" to="/business">
              Về tổng quan doanh nghiệp
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-content business-live">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            CỔNG DOANH NGHIỆP · THE PULSE B2B
          </p>
          <h1>{tr(screen.name)}</h1>
          <p className="page-subtitle">
            Hồ sơ, hợp đồng và chiến dịch — mọi thông tin trong một không gian.
          </p>
        </div>

        <button
          className="secondary-button"
          disabled={busy || loading}
          onClick={reloadWorkspace}
        >
          Làm mới
        </button>
      </div>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="success-message">
          {message}
        </p>
      )}

      {loading ? (
        <p className="loading-card">Đang tải dữ liệu doanh nghiệp…</p>
      ) : (
        <>
          {screen.id === "BUS-01" && (
            <>
              <section className="business-welcome">
                <div>
                  <span className="welcome-kicker">
                    THE PULSE · ĐỐI TÁC QUẢNG CÁO
                  </span>
                  <h2>
                    Thương hiệu của bạn.
                    <br />
                    <span>Đúng nơi, đúng thời điểm.</span>
                  </h2>
                  <p>
                    Quản lý hợp tác và chiến dịch trong một không gian. Theo dõi
                    từng bước, từ đặt vị trí đến hiệu quả quảng cáo.
                  </p>
                  <Link className="welcome-cta" to="/business/campaigns/edit">
                    Tạo chiến dịch <UiIcon name="arrow" />
                  </Link>
                </div>

                <div className="welcome-emblem" aria-hidden="true">
                  <span>
                    P<span className="emblem-dot">.</span>
                  </span>
                  <small>MAKE AN IMPACT</small>
                </div>
              </section>

              <section className="stats-grid business-overview-stats">
                {[
                  [
                    "company",
                    "Hợp tác doanh nghiệp",
                    status(data.company.application_status),
                    "Trạng thái hồ sơ hiện tại",
                  ],
                  [
                    "document",
                    "Hợp đồng hiệu lực",
                    activeContracts.length,
                    "Đã thanh toán, còn thời hạn",
                  ],
                  [
                    "campaign",
                    "Chiến dịch đã tạo",
                    data.campaigns.length,
                    "Tất cả trạng thái",
                  ],
                  [
                    "calendar",
                    "Chiến dịch chờ duyệt",
                    data.campaigns.filter(
                      (campaign) => campaign.status === "PENDING_REVIEW",
                    ).length,
                    "Đang chờ quản lý xử lý",
                  ],
                ].map(([icon, label, value, note]) => (
                  <article className="stat-card" key={label}>
                    <div className="stat-topline">
                      <span>{label}</span>
                      <UiIcon name={icon} />
                    </div>
                    <strong
                      className={
                        typeof value === "string"
                          ? "business-status-heading"
                          : ""
                      }
                    >
                      {value}
                    </strong>
                    <small>{note}</small>
                  </article>
                ))}
              </section>

              <div className="business-dashboard-columns">
                <section className="dashboard-section">
                  <div className="section-heading">
                    <div>
                      <p className="section-kicker">CAMPAIGN WORKSPACE</p>
                      <h2>Chiến dịch gần đây</h2>
                    </div>
                    <Link to="/business/campaigns">Xem tất cả ↗</Link>
                  </div>

                  <div className="recent-campaigns">
                    {data.campaigns.slice(0, 3).map((campaign) => (
                      <Link
                        className="recent-campaign"
                        key={campaign.campaign_id}
                        to={`/business/campaigns/${campaign.campaign_id}`}
                      >
                        <div className="recent-campaign-media">
                          {campaign.media_url ? (
                            <img src={campaign.media_url} alt="" />
                          ) : (
                            <UiIcon name="campaign" />
                          )}
                        </div>
                        <div>
                          <strong>{campaign.campaign_name}</strong>
                          <small>
                            {campaign.contract_code} ·{" "}
                            {time(campaign.scheduled_start_time)}
                          </small>
                          <Badge value={campaign.status} />
                        </div>
                        <UiIcon name="arrow" />
                      </Link>
                    ))}
                  </div>

                  {!data.campaigns.length && (
                    <p>
                      Chưa có chiến dịch. Tạo chiến dịch đầu tiên khi hợp đồng
                      đã có hiệu lực.
                    </p>
                  )}
                </section>

                <section className="dashboard-section business-shortcuts">
                  <p className="section-kicker">QUICK ACCESS</p>
                  <h2>Bạn muốn làm gì?</h2>
                  <div className="business-test-steps">
                    {[
                      [
                        "company",
                        "Hồ sơ & hợp tác",
                        "Thông tin công ty, tài liệu pháp lý",
                        "/business/company",
                      ],
                      [
                        "calendar",
                        "Đặt vị trí quảng cáo",
                        "Bảng giá và lịch quảng cáo",
                        "/business/advertising/calendar",
                      ],
                      [
                        "campaign",
                        "Quản lý chiến dịch",
                        "Nội dung banner và trạng thái duyệt",
                        "/business/campaigns",
                      ],
                      [
                        "chart",
                        "Theo dõi hiệu quả",
                        "Lượt hiển thị, click và báo cáo",
                        "/business/performance",
                      ],
                    ].map(([icon, title, detail, path]) => (
                      <Link to={path} key={path}>
                        <span className="shortcut-icon">
                          <UiIcon name={icon} />
                        </span>
                        <span>
                          <strong>{title}</strong>
                          <small>{detail}</small>
                        </span>
                        <UiIcon name="arrow" />
                      </Link>
                    ))}
                  </div>
                </section>
              </div>

              <p className="business-demo-footnote">
                Tài khoản business.demo có hợp đồng mẫu đã thanh toán. Để thử
                đăng ký hợp tác từ đầu, tạo tài khoản Doanh nghiệp mới.
              </p>
            </>
          )}

          {isProfile && (
            <form
              className="dashboard-section"
              onSubmit={(event) => {
                event.preventDefault();
                action(
                  () => json("/api/business/company", companyForm, "PUT"),
                  "Đã lưu hồ sơ doanh nghiệp vào MySQL.",
                );
              }}
            >
              <h2>Thông tin doanh nghiệp</h2>
              <div className="business-form-grid">
                {[
                  ["name", "Tên pháp lý", 150],
                  ["taxCode", "Mã số thuế (10 số hoặc 10 số-3 số)", 14],
                  ["email", "Email liên hệ", 254],
                  ["phone", "Số điện thoại", 30],
                  ["address", "Địa chỉ", 500],
                  ["billingAddress", "Địa chỉ xuất hóa đơn", 500],
                ].map(([key, label, max]) => (
                  <Field key={key} label={label}>
                    <input
                      value={companyForm[key]}
                      onChange={(event) =>
                        setCompanyForm({
                          ...companyForm,
                          [key]: event.target.value,
                        })
                      }
                      type={key === "email" ? "email" : "text"}
                      maxLength={max}
                      required
                      disabled={
                        busy ||
                        ["PENDING_REVIEW", "RESUBMITTED"].includes(
                          data.company.application_status,
                        ) ||
                        (data.company.application_status === "APPROVED" &&
                          ["name", "taxCode"].includes(key))
                      }
                    />
                  </Field>
                ))}
              </div>

              <div className="form-actions">
                <button
                  disabled={
                    busy ||
                    ["PENDING_REVIEW", "RESUBMITTED"].includes(
                      data.company.application_status,
                    )
                  }
                >
                  Lưu hồ sơ
                </button>
                <Link
                  className="outline-button"
                  to="/business/partnership/apply"
                >
                  Tiếp tục đăng ký hợp tác →
                </Link>
              </div>
            </form>
          )}

          {isPartnership && <nav className="partnership-tabs" aria-label="Đăng ký hợp tác"><Link to="/business/partnership/apply" aria-current={isApplication ? "page" : undefined}>Đăng ký hợp tác</Link><Link to="/business/partnership/status" aria-current={screen.id === "BUS-04" ? "page" : undefined}>Trạng thái xử lý</Link></nav>}
          {screen.id === "BUS-04" && <PartnershipStatus company={data.company} versions={data.companyVersions || []} />}
          {isApplication && (
            <section className="dashboard-section">
              <h2>Hồ sơ hợp tác</h2>
              <Badge value={data.company.application_status} />
              <dl className="business-details">
                <dt>Doanh nghiệp</dt>
                <dd>{data.company.company_name || "Chưa có hồ sơ"}</dd>
                <dt>Mã hồ sơ</dt>
                <dd>{data.company.application_code || "—"}</dd>
                <dt>Thời gian gửi</dt>
                <dd>{time(data.company.submitted_at)}</dd>
                <dt>Thời gian xét duyệt</dt>
                <dd>{time(data.company.reviewed_at)}</dd>
                <dt>Phản hồi quản lý</dt>
                <dd>{data.company.review_note || "Chưa có phản hồi"}</dd>
              </dl>

              {data.company.application_status === "REJECTED" && (
                <div className="info-note">
                  <p>
                    Hồ sơ này đã bị từ chối. Tạo đăng ký mới và tải lại tài
                    liệu, lịch sử cũ vẫn được giữ.
                  </p>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Tạo hồ sơ hợp tác mới sau từ chối? Bạn cần tải lại tài liệu và gửi xét duyệt.",
                        )
                      ) {
                        action(
                          () =>
                            apiRequest("/api/business/application/new", {
                              method: "POST",
                            }),
                          "Đã mở hồ sơ mới. Hãy cập nhật thông tin và tải lại tài liệu.",
                        );
                      }
                    }}
                  >
                    Tạo hồ sơ hợp tác mới
                  </button>
                </div>
              )}

              <h3>Tài liệu pháp lý ({data.documents.length}/5)</h3>
              {data.documents.length ? (
                <ul className="business-document-list">
                  {data.documents.map((document) => (
                    <li key={document.document_id}>
                      <a
                        href={`/api/media/document/${document.document_id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {document.original_file_name} ↗
                      </a>
                      <small>
                        Phiên bản {document.version_no} ·{" "}
                        {time(document.uploaded_at)}
                      </small>
                      {editable(data.company.application_status) && <button type="button" className="secondary-button" disabled={busy} onClick={() => {
                        // Chỉ gỡ sau xác nhận; file thuộc lịch sử đã nộp vẫn được giữ ở backend.
                        if (window.confirm(`Gỡ tài liệu “${document.original_file_name}” khỏi hồ sơ chuẩn bị gửi?`)) action(() => apiRequest(`/api/business/documents/${document.document_id}`, { method: "DELETE" }), "Đã gỡ tài liệu khỏi hồ sơ chuẩn bị gửi.");
                      }}>Gỡ tài liệu</button>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Chưa tải tài liệu.</p>
              )}

              {!data.company.company_id ? (
                <Link className="button-link" to="/business/company">
                  Lưu hồ sơ doanh nghiệp trước →
                </Link>
              ) : editable(data.company.application_status) ? (
                <>
                  {data.documents.length >= 5 && <p className="info-note">Đã đủ 5 tài liệu. Gỡ tài liệu không dùng để tải tệp khác.</p>}
                  <form onSubmit={uploadApplicationDocument} aria-label="Tải tài liệu pháp lý">
                    <Field label="PDF, PNG hoặc JPEG · tối đa 8 MB/tệp · tối đa 5 tài liệu">
                      <input
                        key={documentInputKey}
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        required
                        disabled={busy}
                        onChange={(event) => {
                          const selected = event.target.files?.[0] || null;
                          setFile(selected); setDocumentNotice("");
                          setDocumentError(selected ? legalDocumentError(selected) : "");
                        }}
                      />
                    </Field>
                    <button
                      className="secondary-button"
                      disabled={busy || !file || data.documents.length >= 5}
                    >
                      {busy ? "Đang xử lý…" : "Tải tài liệu lên"}
                    </button>
                    {file && <>
                      <p className="info-note" role="status">Đã chọn “{file.name}”, chưa tải lên máy chủ. Bấm Tải tài liệu lên để lưu tệp.</p>
                      <button type="button" className="outline-button" disabled={busy} onClick={() => { setFile(null); setDocumentError(""); setDocumentInputKey(value => value + 1); }}>Bỏ tệp đã chọn</button>
                    </>}
                  </form>
                  {documentError && <p className="form-error" role="alert">{documentError}</p>}
                  {documentNotice && <p className="success-message" role="status">{documentNotice}</p>}
                  {submitBlockReason && <p id="application-submit-reason" className="info-note" role="status">{submitBlockReason} <Link to="/business/company">Xem hồ sơ doanh nghiệp</Link></p>}
                  <button
                    disabled={Boolean(submitBlockReason)}
                    aria-describedby={submitBlockReason ? "application-submit-reason" : undefined}
                    onClick={() => { setError(""); setApplicationConfirm(true); }}
                  >
                    Gửi đăng ký hợp tác
                  </button>
                </>
              ) : (
                <p className="info-note">
                  {data.company.application_status === "APPROVED"
                    ? "Doanh nghiệp đã được duyệt, có thể đặt quảng cáo."
                    : "Hồ sơ đã khóa. Chờ quản lý xét duyệt hoặc yêu cầu chỉnh sửa."}
                </p>
              )}
            </section>
          )}


          {/* UC-25/BUS-07: form tạo yêu cầu đặt quảng cáo, hiển thị khi hồ sơ hợp tác đã được duyệt. */}


          {screen.id === "BUS-07" &&
            (() => {
              // Tìm thông tin vị trí và gói đã chọn để tính toán và validate
              const selectedSlotObj = catalog?.slots?.find(
                (slot) => String(slot.id) === String(booking.slotId),
              );
              const selectedPackObj = catalog?.offers?.find(
                (pack) => String(pack.id) === String(booking.packageId),
              );

              // Tính số ngày khách chọn trên lịch
              const bookingDays =
                booking.startDate && booking.endDate
                  ? Math.max(
                    0,
                    Math.round(
                      (new Date(`${booking.endDate}T12:00:00`) -
                        new Date(`${booking.startDate}T12:00:00`)) /
                      86400000,
                    ) + 1,
                  )
                  : 0;

              const estimatedPrice =
                selectedSlotObj && selectedPackObj && bookingDays > 0
                  ? Number(selectedPackObj.price) +
                  Number(selectedSlotObj.base_price || selectedSlotObj.basePrice || 0)
                  : 0;

              // ĐIỀU KIỆN HỢP LỆ ĐỂ MỞ NÚT "LƯU BẢN NHÁP" VÀ "GỬI YÊU CẦU ĐẶT QUẢNG CÁO":
              // 1. Hồ sơ doanh nghiệp phải được duyệt (APPROVED)
              // 2. Tên yêu cầu không để trống
              // 3. Đã chọn vị trí và gói quảng cáo
              // 4. Đã chọn ngày bắt đầu và ngày kết thúc
              // 5. Khoảng ngày không bị lỗi xung đột lịch (calendarError trống)
              // 6. Số ngày không vượt quá thời hạn gói
              const isBookingValid =
                data.company.application_status === "APPROVED" &&
                Boolean(booking.name?.trim()) &&
                Boolean(booking.slotId) &&
                Boolean(booking.packageId) &&
                Boolean(booking.startDate) &&
                Boolean(booking.endDate) &&
                bookingDays > 0 &&
                (!selectedPackObj?.durationDays ||
                  bookingDays <= Number(selectedPackObj.durationDays)) &&
                calendarValid &&
                !calendarError;

              return (
                <form
                  className="dashboard-section"
                  onSubmit={(event) => {
                    event.preventDefault();

                    if (!isBookingValid) {
                      return;
                    }

                    const saveDraft =
                      event.nativeEvent.submitter?.value === "draft";

                    action(
                      () =>
                        json(
                          saveDraft
                            ? "/api/business/bookings/drafts"
                            : "/api/business/bookings",
                          {
                            ...booking,
                            slotId: Number(booking.slotId),
                            packageId: Number(booking.packageId),
                            quotedAmount:
                              Math.round(estimatedPrice * 100) / 100,
                          },
                        ),
                      saveDraft
                        ? "Đã lưu bản nháp."
                        : "Đã ghi nhận yêu cầu đặt quảng cáo. Chờ quản lý chuẩn bị đề xuất hợp đồng.",
                      (result) =>
                        navigate(
                          saveDraft
                            ? `/business/bookings/${result.id}/proposal`
                            : "/business/contracts",
                        ),
                    );
                  }}
                >
                  <div className="section-heading">
                    <div>
                      <p className="section-kicker">CỔNG DOANH NGHIỆP · ĐẶT GIỮ CHỖ</p>
                      <h2>Yêu cầu đặt quảng cáo</h2>
                    </div>
                    <Link
                      className="outline-button"
                      to="/business/advertising/calendar"
                    >
                      Xem toàn bộ lịch phân phối ↗
                    </Link>
                  </div>

                  {data.company.application_status !== "APPROVED" && (
                    <p className="info-note" role="status">
                      Hồ sơ hợp tác chưa được duyệt. Bạn cần được phê duyệt hợp
                      tác trước khi gửi yêu cầu đặt quảng cáo.{" "}
                      <Link to="/business/partnership/status">
                        Xem hồ sơ →
                      </Link>
                    </p>
                  )}

                  {/* Form chọn thông tin ban đầu: Tên, Vị trí, Gói */}
                  <div className="business-form-grid">
                    <Field label="Tên yêu cầu đặt quảng cáo">
                      <input
                        required
                        maxLength={200}
                        placeholder="Ví dụ: Chiến dịch mùa hè - ACME 2026"
                        value={booking.name}
                        onChange={(event) =>
                          setBooking({ ...booking, name: event.target.value })
                        }
                      />
                    </Field>

                    <Field label="Vị trí quảng cáo">
                      <select
                        required
                        value={booking.slotId}
                        onChange={(event) => {
                          setBooking({
                            ...booking,
                            slotId: event.target.value,
                            startDate: "",
                            endDate: "",
                          });
                          setCalendarError("");
                        }}
                      >
                        <option value="">-- Chọn vị trí quảng cáo --</option>
                        {catalog?.slots?.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {slot.name} · {slot.width} × {slot.height} px
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Gói quảng cáo B2B">
                      <select
                        required
                        value={booking.packageId}
                        onChange={(event) => {
                          setBooking({
                            ...booking,
                            packageId: event.target.value,
                            startDate: "",
                            endDate: "",
                          });
                          setCalendarValid(false);
                          setCalendarError("");
                        }}
                      >
                        <option value="">-- Chọn gói quảng cáo --</option>
                        {catalog?.offers?.map((pack) => (
                          <option key={pack.id} value={pack.id}>
                            {pack.name} · {currency(pack.price)} · Thời hạn:{" "}
                            {pack.durationDays} ngày
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Ước tính thời lượng & Giá">
                      <div
                        style={{
                          padding: "12px",
                          background: "#f9fafb",
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                          fontSize: "13px",
                        }}
                      >
                        <strong>
                          {bookingDays > 0
                            ? `${bookingDays} ngày`
                            : "Chưa chọn lịch"}
                        </strong>
                        {estimatedPrice > 0 && (
                          <span
                            style={{
                              color: "#059669",
                              fontWeight: "bold",
                              marginLeft: "8px",
                            }}
                          >
                            · Giá dự kiến: {currency(estimatedPrice)}
                          </span>
                        )}
                        {estimatedPrice > 0 && (
                          <p>
                            Giá gói {currency(selectedPackObj.price)} + vị trí{" "}
                            {currency(
                              Number(
                                selectedSlotObj.basePrice ||
                                selectedSlotObj.base_price ||
                                0,
                              ),
                            )}{" "}
                            (Server xác nhận lại báo giá khi lưu.)
                          </p>
                        )}
                      </div>
                    </Field>
                  </div>

                  {/* BẢNG LỊCH KIỂM TRA NGÀY KHẢ DỤNG:
                      - Tự động hiển thị khi khách chọn Vị trí và Gói
                      - Hiển thị ngày xám (đã qua), xanh (được phép đặt), đỏ (đã có người đặt)
                      - Khách click chọn ngày bắt đầu và kết thúc trực tiếp trên bảng lịch
                  */}
                  <SlotBookingCalendar
                    slotId={booking.slotId}
                    packageId={booking.packageId}
                    slots={catalog?.slots || []}
                    packages={catalog?.offers || []}
                    startDate={booking.startDate}
                    endDate={booking.endDate}
                    focusDate={booking.startDate}
                    onSelectRange={({
                      startDate,
                      endDate,
                      isValid,
                      errorMessage,
                    }) => {
                      setBooking((prev) => ({
                        ...prev,
                        startDate,
                        endDate,
                      }));
                      setCalendarError(errorMessage || "");
                      setCalendarValid(isValid);
                    }}
                  />

                  {/* Đồng bộ 2 ô ngày bắt đầu và kết thúc */}
                  <div
                    className="business-form-grid"
                    style={{ marginTop: "12px" }}
                  >
                    <Field label="Ngày bắt đầu (từ lịch)">
                      <input
                        type="date"
                        required
                        value={booking.startDate}
                        onChange={(event) => {
                          setBooking({
                            ...booking,
                            startDate: event.target.value,
                          });
                          setCalendarValid(false);
                        }}
                      />
                    </Field>

                    <Field label="Ngày kết thúc (từ lịch)">
                      <input
                        type="text"
                        value={booking.endDate
                          ? new Date(`${booking.endDate}T12:00:00`).toLocaleDateString("vi-VN")
                          : ""}
                        placeholder="Ngày kết thúc được chọn trên lịch"
                        readOnly
                        aria-readonly="true"
                      />
                    </Field>
                  </div>

                  {/* Thông báo điều kiện hợp lệ */}
                  <div style={{ marginBlock: "16px" }}>
                    {calendarError ? (
                      <div
                        className="form-error"
                        role="alert"
                        style={{
                          color: "#dc2626",
                          background: "#fee2e2",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #fca5a5",
                        }}
                      >
                        ⚠️ <strong>Lịch không hợp lệ:</strong> {calendarError}
                      </div>
                    ) : !isBookingValid ? (
                      <p className="info-note">
                        ℹ️ <strong>Điều kiện bắt buộc:</strong> Vui lòng nhập
                        Tên yêu cầu, chọn Vị trí, Gói và chọn khoảng ngày trống
                        (màu xanh) trên lịch không bị trùng để kích hoạt{" "}
                        <strong>Lưu bản nháp</strong> và{" "}
                        <strong>Gửi yêu cầu</strong>.
                      </p>
                    ) : (
                      <p
                        className="info-note"
                        style={{
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          color: "#065f46",
                        }}
                      >
                        ✓ <strong>Mọi điều kiện đều hợp lệ:</strong> Khoảng chạy{" "}
                        {bookingDays} ngày phù hợp với gói "
                        {selectedPackObj?.name}". Giá dự kiến:{" "}
                        {currency(estimatedPrice)}. Bạn có thể lưu nháp hoặc gửi
                        yêu cầu ngay.
                      </p>
                    )}
                  </div>

                  {/* Nút hành động: Chỉ Enabled khi mọi điều kiện đều phù hợp (isBookingValid === true) */}
                  <div className="form-actions">
                    <button
                      type="submit"
                      value="draft"
                      className="secondary-button"
                      disabled={busy || !isBookingValid || catalog?.demo}
                      title={
                        !isBookingValid
                          ? "Vui lòng chọn khoảng ngày hợp lệ trên bảng lịch để lưu nháp"
                          : "Lưu bản nháp"
                      }
                    >
                      Lưu bản nháp
                    </button>
                    <button
                      type="submit"
                      value="submit"
                      disabled={busy || !isBookingValid || catalog?.demo}
                      title={
                        !isBookingValid
                          ? "Vui lòng chọn khoảng ngày hợp lệ trên bảng lịch để gửi yêu cầu"
                          : "Gửi yêu cầu đặt quảng cáo"
                      }
                    >
                      Gửi yêu cầu đặt quảng cáo
                    </button>
                    <Link
                      className="outline-button"
                      to="/business/contracts"
                    >
                      Xem danh sách hợp đồng
                    </Link>
                  </div>
                </form>
              );
            })()}


          {/* UC-25/BUS-11: danh sách hợp đồng và yêu cầu đã gửi, hiển thị khi khách đã có hợp đồng. */}

          {screen.id === "BUS-11" && (
            <section className="dashboard-section business-contract-list" aria-labelledby="business-contract-list-title">
              <header className="business-contract-list-heading">
                <div>
                  <p className="business-contract-kicker">CỔNG DOANH NGHIỆP · QUẢN LÝ HỢP ĐỒNG</p>
                  <h2 id="business-contract-list-title">Hợp đồng và yêu cầu đặt quảng cáo</h2>
                  <p className="business-contract-list-description">
                    Theo dõi lịch chạy, giá trị, trạng thái hợp đồng và thanh toán của từng booking.
                  </p>
                </div>
                <Link className="business-contract-primary" to="/business/bookings/new">
                  Tạo yêu cầu mới <span aria-hidden="true">→</span>
                </Link>
              </header>

              <div className="business-contract-stats" aria-label="Tổng quan hợp đồng">
                <article><span>Tổng booking</span><strong>{data.contracts.length}</strong></article>
                <article><span>Đang xét duyệt</span><strong>{contractsAwaitingReview}</strong></article>
                <article><span>Chờ thanh toán</span><strong>{contractsAwaitingPayment}</strong></article>
                <article><span>Đang hiệu lực</span><strong>{activePaidContractCount}</strong></article>
              </div>

              <div className="business-contract-filters" role="search" aria-label="Lọc hợp đồng">
                <label className="business-contract-search">
                  <span>Tìm hợp đồng</span>
                  <input
                    type="search"
                    value={contractSearch}
                    onChange={(event) => setContractSearch(event.target.value)}
                    placeholder="Mã, tên hợp đồng, gói hoặc vị trí…"
                  />
                </label>
                <label>
                  <span>Trạng thái hợp đồng</span>
                  <select value={contractStatusFilter} onChange={(event) => setContractStatusFilter(event.target.value)}>
                    <option value="">Tất cả trạng thái</option>
                    {contractListStatuses.map((value) => <option key={value} value={value}>{status(value)}</option>)}
                  </select>
                </label>
                <label>
                  <span>Trạng thái thanh toán</span>
                  <select value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value)}>
                    <option value="">Tất cả thanh toán</option>
                    {contractPaymentStatuses.map((value) => <option key={value} value={value}>{status(value)}</option>)}
                  </select>
                </label>
                {(contractSearch || contractStatusFilter || paymentStatusFilter) && (
                  <button
                    className="business-contract-clear"
                    type="button"
                    onClick={() => {
                      setContractSearch("");
                      setContractStatusFilter("");
                      setPaymentStatusFilter("");
                    }}
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>

              <div className="business-contract-results-heading">
                <h3>Danh sách hợp đồng</h3>
                <span>{contractRows.length} / {data.contracts.length} booking</span>
              </div>

              {contractRows.length > 0 ? (
                <div className="business-contract-table-wrap">
                  <table className="business-contract-table">
                    <thead>
                      <tr>
                        <th>Hợp đồng</th>
                        <th>Gói và vị trí</th>
                        <th>Khoảng chạy</th>
                        <th>Giá trị</th>
                        <th>Trạng thái hợp đồng</th>
                        <th>Thanh toán</th>
                        <th><span className="visually-hidden">Thao tác</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractRows.map((item) => (
                        <tr key={item.contract_id}>
                          <td data-label="Hợp đồng">
                            <strong className="business-contract-code">{item.contract_code || "—"}</strong>
                            <span className="business-contract-name">{item.contract_name || "Booking quảng cáo"}</span>
                          </td>
                          <td data-label="Gói và vị trí">
                            <strong>{item.package_name_snapshot || "—"}</strong>
                            <span className="business-contract-name">{item.slot_name_snapshot || "Chưa chọn vị trí"}</span>
                          </td>
                          <td data-label="Khoảng chạy">
                            <span>{time(item.start_at)}</span>
                            <span className="business-contract-name">đến {time(item.end_at)}</span>
                          </td>
                          <td data-label="Giá trị"><strong>{currency(item.total_value)}</strong></td>
                          <td data-label="Trạng thái hợp đồng"><Badge value={item.status} /></td>
                          <td data-label="Thanh toán"><Badge value={item.payment_status} /></td>
                          <td data-label="Thao tác" className="business-contract-actions">
                            <Link className="business-contract-detail" to={`/business/contracts/${item.contract_id}`}>
                              Chi tiết
                            </Link>
                            {(["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(item.status)
                              && item.payment_status !== "PAID") && (
                              <Link className="business-contract-pay" to={`/business/contracts/${item.contract_id}/checkout`}>
                                Thanh toán →
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="business-contract-empty" role="status">
                  <span className="business-contract-empty-icon" aria-hidden="true">▤</span>
                  <h3>{data.contracts.length ? "Không tìm thấy booking phù hợp" : "Bạn chưa có booking nào"}</h3>
                  <p>{data.contracts.length
                    ? "Thử đổi từ khóa hoặc trạng thái để xem lại danh sách."
                    : "Gửi yêu cầu đặt quảng cáo để bắt đầu quy trình xét duyệt và ký hợp đồng."}</p>
                  {!data.contracts.length && (
                    <Link className="business-contract-primary" to="/business/bookings/new">
                      Yêu cầu đặt quảng cáo <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
              )}
            </section>
          )}

          {["BUS-08", "BUS-09", "BUS-10", "BUS-12"].includes(screen.id) && (
            <nav className="business-booking-tabs" aria-label="Các bước booking và hợp đồng">
              {[
                ["BUS-08", "Xem đề xuất", `/business/bookings/${activeContractId}/proposal`],
                ["BUS-09", "Thanh toán", `/business/contracts/${activeContractId}/checkout`],
                ["BUS-10", "Kết quả thanh toán", `/business/contracts/payment-result?contractId=${activeContractId}`],
                ["BUS-12", "Chi tiết hợp đồng", `/business/contracts/${activeContractId}`],
              ].map(([id, label, to]) => (
                <Link key={id} to={to} className={screen.id === id ? "is-active" : ""} aria-current={screen.id === id ? "page" : undefined}>{label}</Link>
              ))}
            </nav>
          )}

          {["BUS-09", "BUS-10", "BUS-12"].includes(screen.id) && (
            <section className="dashboard-section business-booking-panel">
              {!contract ? <p>Chọn hợp đồng từ <Link to="/business/contracts">danh sách hợp đồng</Link>.</p> : <>
                <header className="business-booking-summary">
                  <div><span>Mã hợp đồng</span><strong>{contract.contract_code || "—"}</strong></div>
                  <div><span>Trạng thái</span><Badge value={contract.status} /></div>
                  <div><span>Thanh toán</span><Badge value={contract.payment_status} /></div>
                  <div><span>Giá trị</span><strong>{currency(contract.total_value)}</strong></div>
                </header>

                {screen.id === "BUS-09" && <>
                  <p className="business-flow-kicker">CỔNG DOANH NGHIỆP · THANH TOÁN QUẢNG CÁO</p>
                  <h2>Thanh toán quảng cáo</h2>
                  <dl className="business-details">
                    <div><dt>Đơn hàng</dt><dd>{contract.contract_name || contract.package_name_snapshot || "Booking quảng cáo"}</dd></div>
                    <div><dt>Vị trí</dt><dd>{contract.slot_name_snapshot || "—"}</dd></div>
                    <div><dt>Thời gian</dt><dd>{time(contract.start_at)} – {time(contract.end_at)}</dd></div>
                    <div><dt>Số tiền cần thanh toán</dt><dd>{currency(contract.total_value)}</dd></div>
                    <div><dt>Hạn thanh toán</dt><dd>{time(contract.payment_due_at)}</dd></div>
                    <div><dt>Phương thức</dt><dd>VietQR / PayOS</dd></div>
                  </dl>
                  {contract.status === "PENDING_PAYMENT" && contract.payment_status !== "PAID" ? <AutoPaymentTimerCard type="CONTRACT" referenceId={contract.contract_id} amount={contract.total_value} itemName={`Hợp đồng ${contract.contract_code}`} onSuccess={async () => { await refresh(); navigate(`/business/contracts/payment-result?contractId=${contract.contract_id}`); }} /> : contract.payment_status === "PAID" ? <p role="status" className="info-note">Hợp đồng đã thanh toán. Xem kết quả tại <Link to={`/business/contracts/payment-result?contractId=${contract.contract_id}`}>Kết quả thanh toán</Link>.</p> : <p role="status" className="info-note">Hợp đồng chưa ở trạng thái có thể thanh toán.</p>}
                </>}

                {screen.id === "BUS-10" && <>
                  <p className="business-flow-kicker">CỔNG DOANH NGHIỆP · KẾT QUẢ GIAO DỊCH</p>
                  <h2>Kết quả thanh toán</h2>
                  <dl className="business-details">
                    <div><dt>Trạng thái thanh toán</dt><dd><Badge value={contract.payment_status} /></dd></div>
                    <div><dt>Mã hợp đồng</dt><dd>{contract.contract_code || "—"}</dd></div>
                    <div><dt>Số tiền</dt><dd>{currency(contract.total_value)}</dd></div>
                    <div><dt>Trạng thái hợp đồng</dt><dd><Badge value={contract.status} /></dd></div>
                  </dl>
                  {contract.payment_status === "PAID"
                    ? <p role="status" className="info-note business-payment-result-message is-success">Thanh toán thành công. Hợp đồng đã được kích hoạt nếu đáp ứng điều kiện nghiệp vụ.</p>
                    : <p role="status" className="info-note business-payment-result-message is-pending">Chưa ghi nhận thanh toán thành công. Bạn có thể thử lại ở <Link to={`/business/contracts/${contract.contract_id}/checkout`}>Cổng thanh toán</Link>.</p>}
                  <p className="business-payment-reference-note">Mã giao dịch và thời điểm xử lý chưa được API workspace hiện tại cung cấp.</p>
                  {contract.payment_status === "PAID" && <Link className="button-link" to={`/business/contracts/${contract.contract_id}`}>Mở hợp đồng →</Link>}
                </>}

                {screen.id === "BUS-12" && <>
                  <p className="business-flow-kicker">CỔNG DOANH NGHIỆP · CHI TIẾT HỢP ĐỒNG</p>
                  <h2>Chi tiết hợp đồng</h2>
                  <dl className="business-details">
                    <div><dt>Tên hợp đồng</dt><dd>{contract.contract_name || "—"}</dd></div>
                    <div><dt>Gói</dt><dd>{contract.package_name_snapshot || "—"}</dd></div>
                    <div><dt>Vị trí</dt><dd>{contract.slot_name_snapshot || "—"}</dd></div>
                    <div><dt>Thời gian</dt><dd>{time(contract.start_at)} – {time(contract.end_at)}</dd></div>
                    <div><dt>Giá trị</dt><dd>{currency(contract.total_value)}</dd></div>
                    <div><dt>Thanh toán</dt><dd><Badge value={contract.payment_status} /></dd></div>
                  </dl>
                  {contract.latest_proposal_terms && <section className="business-contract-terms"><h3>Điều khoản thương mại</h3><p style={{whiteSpace:"pre-wrap"}}>{contract.latest_proposal_terms}</p></section>}
                  <h3>Chiến dịch liên kết</h3>
                  {linkedCampaigns.length ? <ul className="business-linked-campaigns">{linkedCampaigns.map(item => <li key={item.campaign_id}><Link to={`/business/campaigns/${item.campaign_id}`}>{item.campaign_name}</Link><Badge value={item.status} /></li>)}</ul> : <p>Chưa có chiến dịch liên kết.</p>}
                  {contract.status === "ACTIVE" && contract.payment_status === "PAID" && <Link className="button-link" to={`/business/campaigns/edit?contractId=${contract.contract_id}`}>Tạo chiến dịch →</Link>}
                  <p><Link to="/business/contracts">← Danh sách hợp đồng</Link></p>
                </>}
              </>}
            </section>
          )}

          {screen.id === "BUS-08" && (
            <section className="dashboard-section business-booking-panel business-booking-proposal-panel">
              <p className="business-flow-kicker">CỔNG DOANH NGHIỆP · ĐỀ XUẤT HỢP ĐỒNG</p>
              <h2>Thông tin hợp đồng</h2>

              {contract ? (
                <>
                  <Badge value={contract.status} />

                  {!editingBooking && (
                    <dl className="business-details">
                      {[
                        ["Mã hợp đồng", contract.contract_code],
                        ["Tên", contract.contract_name],
                        ["Vị trí", contract.slot_name_snapshot],
                        ["Gói", contract.package_name_snapshot],
                        ["Giá trị", currency(contract.total_value)],
                        ["Thanh toán", status(contract.payment_status)],
                        ["Bắt đầu", time(contract.start_at)],
                        ["Kết thúc", time(contract.end_at)],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {!editingBooking && <QuoteSummary quote={contract.quote_snapshot} />}
                  {contract.latest_proposal_status === "ACCEPTED" && (
                    <section className="dashboard-section business-accepted-proposal-panel">
                      <h3>Điều khoản đã chấp thuận</h3>

                      <dl className="business-details">
                        <div>
                          <dt>Thời gian quảng cáo</dt>
                          <dd>
                            {time(contract.latest_proposal_start_at)}
                            {" đến "}
                            {inclusiveProposalEnd(contract.latest_proposal_end_at)}
                          </dd>
                        </div>
                        <div>
                          <dt>Giá đã chấp thuận</dt>
                          <dd>{currency(contract.latest_proposal_amount)}</dd>
                        </div>
                        <div>
                          <dt>Hạn thanh toán</dt>
                          <dd>{time(contract.payment_due_at)}</dd>
                        </div>
                      </dl>

                      <p><strong>Điều khoản thương mại</strong></p>
                      <p style={{ whiteSpace: "pre-wrap" }}>
                        {contract.latest_proposal_terms}
                      </p>
                    </section>
                  )}
                  {contract.status === "PENDING_REVIEW"
                    && contract.latest_proposal_status === "REVISION_REQUESTED" && (
                      <section className="dashboard-section">
                        <h3>
                          {contract.latest_proposal_response_type === "CONTRACT_INFO"
                            ? "Đã gửi yêu cầu đổi thông tin hợp đồng"
                            : "Đã gửi yêu cầu sửa điều khoản"}
                        </h3>
                        <p role="status" className="info-note">
                          Ad Manager đang xem xét yêu cầu của bạn và sẽ gửi đề xuất cập nhật.
                        </p>
                        {contract.latest_proposal_response_reason && (
                          <p style={{ whiteSpace: "pre-wrap" }}>
                            <strong>Lý do đã gửi: </strong>{contract.latest_proposal_response_reason}
                          </p>
                        )}
                      </section>
                    )}
                  {contract.status !== "PROPOSED"
                    && contract.latest_proposal_id
                    && ["SENT", "REVISION_REQUESTED"].includes(contract.latest_proposal_status) && (
                      <section className="dashboard-section">
                        <h3>Proposal gần nhất · phiên bản {contract.latest_proposal_revision_no}</h3>
                        <dl className="business-details">
                          <div>
                            <dt>Thời gian đề xuất</dt>
                            <dd>
                              {time(contract.latest_proposal_start_at)}
                              {" đến "}
                              {inclusiveProposalEnd(contract.latest_proposal_end_at)}
                            </dd>
                          </div>
                          {contract.latest_proposal_package_name && (
                            <div>
                              <dt>Package đề xuất</dt>
                              <dd>{contract.latest_proposal_package_name}</dd>
                            </div>
                          )}
                          {contract.latest_proposal_slot_name && (
                            <div>
                              <dt>Ad slot đề xuất</dt>
                              <dd>{contract.latest_proposal_slot_name}</dd>
                            </div>
                          )}
                          <div>
                            <dt>Giá đề xuất</dt>
                            <dd>{currency(contract.latest_proposal_amount)}</dd>
                          </div>
                          <div>
                            <dt>Hạn phản hồi</dt>
                            <dd>{time(contract.latest_proposal_expires_at)}</dd>
                          </div>
                        </dl>
                        <p><strong>Điều khoản thương mại</strong></p>
                        <p style={{ whiteSpace: "pre-wrap" }}>
                          {contract.latest_proposal_terms || "Chưa có điều khoản."}
                        </p>
                      </section>
                    )}
                  {contract.status === "PROPOSED" ? (
                    <>
                      <h3>Đề xuất hợp đồng từ Ad Manager</h3>
                      {contract.latest_proposal_id ? (
                        <>
                          <dl className="business-details">
                            <div>
                              <dt>Phiên bản đề xuất</dt>
                              <dd>{contract.latest_proposal_revision_no}</dd>
                            </div>
                            <div>
                              <dt>Thời gian đề xuất</dt>
                              <dd>
                                {time(contract.latest_proposal_start_at)}
                                {" đến "}
                                {inclusiveProposalEnd(contract.latest_proposal_end_at)}
                              </dd>
                            </div>
                            {contract.latest_proposal_package_name && (
                              <div>
                                <dt>Package đề xuất</dt>
                                <dd>{contract.latest_proposal_package_name}</dd>
                              </div>
                            )}
                            {contract.latest_proposal_slot_name && (
                              <div>
                                <dt>Ad slot đề xuất</dt>
                                <dd>{contract.latest_proposal_slot_name}</dd>
                              </div>
                            )}
                            <div>
                              <dt>Giá đề xuất</dt>
                              <dd>{currency(contract.latest_proposal_amount)}</dd>
                            </div>
                            <div>
                              <dt>Hạn phản hồi</dt>
                              <dd>{time(contract.latest_proposal_expires_at)}</dd>
                            </div>
                          </dl>

                          <p><strong>Điều khoản thương mại</strong></p>
                          <p style={{ whiteSpace: "pre-wrap" }}>
                            {contract.latest_proposal_terms}
                          </p>
                          {contract.latest_proposal_status === "SENT"
                            && new Date(
                              String(contract.latest_proposal_expires_at).replace(" ", "T"),
                            ).getTime() > Date.now() ? (
                            <>
                              <p role="status" className="info-note">
                                Đề xuất đang chờ doanh nghiệp xem xét và phản hồi.
                              </p>

                              <div className="form-actions">
                                <button
                                  type="button"
                                  className="secondary-button"
                                  aria-expanded={showProposalRevisionForm}
                                  onClick={() => setShowProposalRevisionForm((shown) => !shown)}
                                >
                                  {showProposalRevisionForm ? "Ẩn yêu cầu" : "Gửi yêu cầu"}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleProposalDecision("ACCEPT")}
                                >
                                  Đồng ý đề xuất
                                </button>
                              </div>

                              {showProposalRevisionForm && (
                                <form
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    handleProposalDecision("REQUEST_REVISION", proposalRevisionReason, "TERMS");
                                  }}
                                >
                                  <label className="business-field">
                                    <span>Lý do yêu cầu</span>
                                    <textarea
                                      required
                                      maxLength={2000}
                                      rows={4}
                                      value={proposalRevisionReason}
                                      onChange={(event) => setProposalRevisionReason(event.target.value)}
                                    />
                                  </label>

                                  <div className="form-actions">
                                    <button
                                      type="submit"
                                      disabled={busy || !proposalRevisionReason.trim()}
                                    >
                                      Yêu cầu sửa điều khoản
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy || !proposalRevisionReason.trim()}
                                      onClick={() => handleProposalDecision(
                                        "REQUEST_REVISION", proposalRevisionReason, "CONTRACT_INFO",
                                      )}
                                    >
                                      Yêu cầu đổi thông tin hợp đồng
                                    </button>
                                  </div>
                                </form>
                              )}
                            </>
                          ) : contract.latest_proposal_status === "REVISION_REQUESTED" ? (
                            <p role="status" className="info-note">
                              {contract.latest_proposal_response_type === "CONTRACT_INFO"
                                ? "Đã gửi yêu cầu đổi thông tin hợp đồng."
                                : "Đã gửi yêu cầu sửa điều khoản."} Đang chờ Ad Manager gửi đề xuất mới.
                            </p>
                          ) : (
                            <p role="status" className="info-note">
                              Đề xuất đã hết hạn hoặc không còn chờ phản hồi. Hãy tải lại workspace.
                            </p>
                          )}
                        </>
                      ) : (
                        <p role="alert" className="info-note">
                          Chưa tải được nội dung đề xuất. Hãy tải lại trang.
                        </p>
                      )}
                    </>
                  ) : contract.status === "REVISION_REQUESTED" ? (
                    <>
                      <p role="status" className="info-note">
                        Quản lý yêu cầu thay đổi thông tin booking. Nếu đổi package hoặc ad slot, hãy chọn lại khoảng ngày trên lịch rồi gửi booking.
                      </p>
                      {editingBooking ? (
                        <ContractDraftEditor
                          key={contract.contract_id}
                          contract={contract}
                          catalog={catalog}
                          busy={busy}
                          submitImmediately
                          onCancel={() => setEditingBooking(false)}
                          onSave={(payload) =>
                            action(
                              () =>
                                json(
                                  `/api/business/bookings/${contract.contract_id}/submit`,
                                  payload,
                                  "PUT",
                                ),
                              "Đã lưu và gửi lại booking để quản lý xem xét.",
                              () => setEditingBooking(false),
                            )
                          }
                        />
                      ) : (
                        <div className="form-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={busy}
                            onClick={() => {
                              setEditingBooking(true);
                              setError("");
                              setMessage("");
                            }}
                          >
                            Sửa thông tin booking
                          </button>

                        </div>
                      )}
                    </>
                  ) : contract.status === "DRAFT" ? (
                    <>
                      <div className="form-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={busy || editingBooking}
                          onClick={() => {
                            setDeleteConfirm(false);
                            setEditingBooking(true);
                            setError("");
                            setMessage("");
                          }}
                        >
                          Sửa bản nháp
                        </button>
                        <button
                          type="button"
                          className="outline-button"
                          disabled={busy}
                          onClick={() => {
                            setEditingBooking(false);
                            setDeleteConfirm(true);
                          }}
                        >
                          Xóa bản nháp
                        </button>
                      </div>

                      {deleteConfirm && (
                        <div role="alert" className="info-note">
                          <p>
                            Xóa bản nháp “{contract.contract_name}”? Thao tác
                            này không thể hoàn tác.
                          </p>
                          <div className="form-actions">
                            <button
                              disabled={busy}
                              onClick={() =>
                                action(
                                  () =>
                                    apiRequest(
                                      `/api/business/bookings/${contract.contract_id}`,
                                      { method: "DELETE" },
                                    ),
                                  "Đã xóa bản nháp.",
                                  () => navigate("/business/contracts"),
                                )
                              }
                            >
                              Xác nhận xóa
                            </button>
                            <button
                              className="outline-button"
                              disabled={busy}
                              onClick={() => setDeleteConfirm(false)}
                            >
                              Giữ bản nháp
                            </button>
                          </div>
                        </div>
                      )}

                      {editingBooking && (
                        <ContractDraftEditor
                          key={contract.contract_id}
                          contract={contract}
                          catalog={catalog}
                          busy={busy}
                          onCancel={() => setEditingBooking(false)}
                          onSave={(payload) =>
                            action(
                              () =>
                                json(
                                  `/api/business/bookings/${contract.contract_id}`,
                                  payload,
                                  "PUT",
                                ),
                              "Đã lưu bản nháp.",
                              () => setEditingBooking(false),
                            )
                          }
                        />
                      )}

                      <p className="info-note">
                        Bản nháp chưa được gửi. Gửi yêu cầu để quản lý xét duyệt
                        và chuẩn bị đề xuất hợp đồng. Thao tác này chưa giữ chỗ
                        hoặc thanh toán.
                      </p>
                      <button
                        disabled={
                          busy ||
                          editingBooking ||
                          data.company.application_status !== "APPROVED"
                        }
                        onClick={() =>
                          action(
                            () =>
                              apiRequest(
                                `/api/business/bookings/${contract.contract_id}/submit`,
                                {
                                  method: "POST",
                                  body: JSON.stringify({
                                    expectedRevisionNo: Number(contract.revision_no),
                                  }),
                                }
                              ),
                            "Đã gửi yêu cầu đặt quảng cáo. Chờ quản lý xét duyệt và chuẩn bị đề xuất hợp đồng.",
                          )
                        }
                      >
                        {busy ? "Đang gửi…" : "Gửi yêu cầu đặt quảng cáo"}
                      </button>

                      {data.company.application_status !== "APPROVED" && (
                        <p className="info-note">
                          Doanh nghiệp cần được duyệt hợp tác trước khi gửi yêu
                          cầu.
                        </p>
                      )}
                    </>
                  ) : contract.status === "PENDING_REVIEW" ? (
                    <p role="status" className="info-note">
                      Yêu cầu đã gửi, đang chờ quản lý xét duyệt và chuẩn bị đề
                      xuất hợp đồng. Chưa giữ chỗ hoặc thanh toán.
                    </p>
                  ) : screen.id === "BUS-10" ? (
                    contract.payment_status === "PAID" ? (
                      <div className="payment-result-box" style={{ background: "#ecfdf5", border: "1px solid #10b981", borderRadius: "10px", padding: "24px", marginBottom: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "50%", background: "#10b981", color: "#fff", fontSize: "20px", fontWeight: "bold" }}>✓</span>
                          <div>
                            <h3 style={{ margin: 0, color: "#065f46", fontSize: "18px" }}>Xác nhận thanh toán hợp đồng thành công!</h3>
                            <p style={{ margin: "4px 0 0", color: "#047857", fontSize: "14px" }}>Hợp đồng quảng cáo đã kích hoạt và sẵn sàng để tạo chiến dịch.</p>
                          </div>
                        </div>
                        <dl className="business-details" style={{ margin: "16px 0", background: "#ffffff", padding: "16px", borderRadius: "8px", border: "1px solid #d1fae5" }}>
                          <div>
                            <dt>Mã giao dịch / Order Code</dt>
                            <dd><strong>{query.get("orderCode") || `PAYOS-CTR-${contract.contract_id}`}</strong></dd>
                          </div>
                          <div>
                            <dt>Mã hợp đồng</dt>
                            <dd><strong>{contract.contract_code}</strong></dd>
                          </div>
                          <div>
                            <dt>Số tiền đã thanh toán</dt>
                            <dd><strong style={{ color: "#059669" }}>{currency(contract.total_value)}</strong></dd>
                          </div>
                          <div>
                            <dt>Thời gian xử lý</dt>
                            <dd>{time(contract.signed_at || contract.updated_at)}</dd>
                          </div>
                          <div>
                            <dt>Trạng thái hợp đồng</dt>
                            <dd><span className="badge is-active">Đang hiệu lực (ACTIVE)</span></dd>
                          </div>
                        </dl>
                        <div className="form-actions" style={{ marginTop: "20px" }}>
                          <Link className="button-link" to={`/business/campaigns/edit?contractId=${contract.contract_id}`}>
                            Tạo chiến dịch với hợp đồng này →
                          </Link>
                          <Link className="secondary-button" to={`/business/contracts/${contract.contract_id}`}>
                            Xem chi tiết hợp đồng
                          </Link>
                          <Link className="outline-button" to="/business/contracts">
                            Danh sách hợp đồng
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="payment-result-pending" style={{ marginBottom: "20px" }}>
                        <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: "10px", padding: "20px", marginBottom: "16px" }}>
                          <h3 style={{ margin: "0 0 8px", color: "#b45309", fontSize: "16px" }}>Đang chờ nhận tín hiệu thanh toán</h3>
                          <p style={{ margin: 0, color: "#92400e", fontSize: "14px" }}>
                            Hệ thống đang tự động kiểm tra giao dịch từ PayOS và Ngân hàng. Nếu bạn đã hoàn tất chuyển khoản, bấm "Kiểm tra lại giao dịch ngay" hoặc quét mã dưới đây để thanh toán.
                          </p>
                          <div style={{ marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={busy}
                              onClick={async () => {
                                try {
                                  setBusy(true);
                                  const orderCode = query.get("orderCode");
                                  const res = await checkPaymentStatus("CONTRACT", contract.contract_id, orderCode ? Number(orderCode) : undefined);
                                  if (res?.paid) {
                                    setMessage("⚡ Thanh toán hợp đồng thành công! Hợp đồng đã kích hoạt có hiệu lực.");
                                    await refresh();
                                  } else {
                                    setMessage("Chưa nhận được tín hiệu thanh toán mới. Vui lòng kiểm tra lại app ngân hàng hoặc cổng PayOS.");
                                  }
                                } catch (e) {
                                  setError(e.message || "Lỗi khi kiểm tra giao dịch.");
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              🔄 Kiểm tra lại giao dịch ngay
                            </button>
                            <Link className="outline-button" to={`/business/contracts/${contract.contract_id}/checkout`}>
                              Mở cổng thanh toán Checkout
                            </Link>
                          </div>
                        </div>
                        <AutoPaymentTimerCard
                          type="CONTRACT"
                          referenceId={contract.contract_id}
                          amount={contract.total_value}
                          itemName={`Hợp đồng ${contract.contract_code}`}
                          onSuccess={async () => {
                            setMessage(
                              "⚡ Thanh toán hợp đồng thành công! Hợp đồng đã kích hoạt có hiệu lực và biên lai điện tử đã gửi tới email doanh nghiệp."
                            );
                            await refresh();
                          }}
                        />
                      </div>
                    )
                  ) : contract.status === "ACTIVE" &&
                    contract.payment_status === "PAID" ? (
                    <div style={{ background: "#ecfdf5", border: "1px solid #10b981", borderRadius: "10px", padding: "20px", marginBottom: "20px" }}>
                      <p
                        className="info-note"
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          margin: "0 0 12px 0",
                          color: "#065f46",
                          fontWeight: "600"
                        }}
                      >
                        ✓ Hợp đồng đã thanh toán thành công và đang có hiệu lực.
                      </p>
                      <div className="form-actions">
                        <Link
                          className="button-link"
                          to={`/business/campaigns/edit?contractId=${contract.contract_id}`}
                        >
                          Tạo chiến dịch với hợp đồng này →
                        </Link>
                        {screen.id !== "BUS-12" && (
                          <Link className="secondary-button" to={`/business/contracts/${contract.contract_id}`}>
                            Xem chi tiết hợp đồng
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="checkout-payment-wrapper">
                      {screen.id === "BUS-12" && (
                        <div style={{ marginBottom: "16px" }}>
                          <Link
                            className="button-link"
                            to={`/business/contracts/${contract.contract_id}/checkout`}
                            style={{ display: "inline-block" }}
                          >
                            Mở trang thanh toán riêng →
                          </Link>
                        </div>
                      )}
                      {contract.status === "PENDING_PAYMENT" || screen.id === "BUS-09" ? (
                        <AutoPaymentTimerCard
                          type="CONTRACT"
                          referenceId={contract.contract_id}
                          amount={contract.total_value}
                          itemName={`Hợp đồng ${contract.contract_code}`}
                          onSuccess={async () => {
                            setMessage(
                              "⚡ Thanh toán hợp đồng thành công! Hợp đồng đã kích hoạt có hiệu lực và biên lai điện tử đã gửi tới email doanh nghiệp."
                            );
                            await refresh();
                          }}
                        />
                      ) : (
                        <p role="status" className="info-note">
                          Hợp đồng chưa ở trạng thái thanh toán. Kiểm tra trạng thái tại Chi tiết hợp đồng.
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p>
                  Chọn một hợp đồng từ{" "}
                  <Link to="/business/contracts">danh sách hợp đồng</Link>.
                </p>
              )}
            </section>
          )}

          {["BUS-08", "BUS-09", "BUS-10", "BUS-12"].includes(screen.id)
            && canCancelContract && (
              <section className="dashboard-section business-booking-cancel">
                <h3>Hủy booking</h3>
                <p>
                  Booking sẽ chuyển sang trạng thái đã hủy và được lưu lại trong lịch sử.
                  {contract.payment_status === "PAID"
                    ? " Hợp đồng và các chiến dịch liên kết sẽ dừng; khoản đã thanh toán không được hoàn tự động."
                    : " Nếu đã mở link PayOS, hệ thống sẽ yêu cầu PayOS hủy link thanh toán."}
                </p>
                {!showBookingCancellation ? (
                  <button type="button" className="outline-button" disabled={busy}
                    onClick={() => setShowBookingCancellation(true)}>
                    Hủy booking
                  </button>
                ) : (
                  <form onSubmit={(event) => {
                    event.preventDefault();
                    const reason = bookingCancellationReason.trim();
                    if (!reason || busy) return;
                    const warning = contract.payment_status === "PAID"
                      ? "Xác nhận hủy booking đã thanh toán? Việc này sẽ dừng hợp đồng và chiến dịch liên kết, không tự động hoàn tiền."
                      : "Xác nhận hủy booking? Thao tác này không thể gửi lại booking đã hủy.";
                    if (!window.confirm(warning)) return;
                    action(
                      () => apiRequest(`/api/business/bookings/${contract.contract_id}/cancel`, {
                        method: "POST",
                        body: JSON.stringify({
                          expectedRevisionNo: Number(contract.revision_no),
                          reason,
                        }),
                      }),
                      "Booking đã chuyển sang trạng thái đã hủy.",
                      () => {
                        setShowBookingCancellation(false);
                        setBookingCancellationReason("");
                      },
                    );
                  }}>
                    <label className="business-field">
                      <span>Lý do hủy (bắt buộc)</span>
                      <textarea required maxLength={500} rows={3} value={bookingCancellationReason}
                        onChange={(event) => setBookingCancellationReason(event.target.value)} />
                    </label>
                    <div className="form-actions">
                      <button type="submit" disabled={busy || !bookingCancellationReason.trim()}>
                        {busy ? "Đang hủy…" : "Xác nhận hủy booking"}
                      </button>
                      <button type="button" className="outline-button" disabled={busy}
                        onClick={() => { setShowBookingCancellation(false); setBookingCancellationReason(""); }}>
                        Giữ booking
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}

          {screen.id === "BUS-13" && (
            <section className="dashboard-section">
              <div className="section-heading">
                <h2>Chiến dịch của doanh nghiệp</h2>
                <Link className="button-link" to="/business/campaigns/edit">
                  Tạo chiến dịch
                </Link>
              </div>

              <div className="business-campaign-grid">
                {data.campaigns.map((campaign) => (
                  <article key={campaign.campaign_id}>
                    {campaign.media_url && (
                      <img
                        src={campaign.media_url}
                        alt={campaign.campaign_name}
                      />
                    )}
                    <h3>{campaign.campaign_name}</h3>
                    <p>{campaign.contract_code}</p>
                    <Badge value={campaign.status} />
                    <p>
                      {time(campaign.scheduled_start_time)} →{" "}
                      {time(campaign.scheduled_end_time)}
                    </p>
                    <div className="record-actions">
                      <Link to={`/business/campaigns/${campaign.campaign_id}`}>
                        Chi tiết
                      </Link>
                      {editable(campaign.status) && (
                        <Link
                          to={`/business/campaigns/edit/${campaign.campaign_id}`}
                        >
                          Chỉnh sửa
                        </Link>
                      )}
                      <Link
                        to={`/business/performance/${campaign.campaign_id}`}
                      >
                        Báo cáo
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {!data.campaigns.length && <p>Chưa có chiến dịch.</p>}
            </section>
          )}

          {screen.id === "BUS-14" && (
            <form
              className="dashboard-section"
              onSubmit={(event) => {
                event.preventDefault();
                action(
                  () =>
                    json(
                      `/api/business/campaigns${params.campaignId ? `/${params.campaignId}` : ""
                      }`,
                      {
                        ...campaignForm,
                        contractId: Number(campaignForm.contractId),
                      },
                      params.campaignId ? "PUT" : "POST",
                    ),
                  "Đã lưu chiến dịch nháp vào MySQL.",
                  (result) =>
                    navigate(`/business/campaigns/${result.id}/creative`),
                );
              }}
            >
              <h2>Thông tin chiến dịch</h2>

              {!activeContracts.length && (
                <p className="info-note">
                  Chưa có hợp đồng đã thanh toán còn hiệu lực. business.demo có
                  sẵn hợp đồng mẫu để test.
                </p>
              )}

              <div className="business-form-grid">
                <Field label="Hợp đồng đã thanh toán">
                  <select
                    required
                    disabled={busy || Boolean(params.campaignId)}
                    value={campaignForm.contractId}
                    onChange={(event) => {
                      const selectedContract = activeContracts.find(
                        (item) =>
                          String(item.contract_id) === event.target.value,
                      );

                      setCampaignForm({
                        ...campaignForm,
                        contractId: event.target.value,
                        startTime: datetime(selectedContract?.start_at),
                        endTime: datetime(selectedContract?.end_at),
                      });
                    }}
                  >
                    <option value="">Chọn hợp đồng</option>
                    {activeContracts.map((item) => (
                      <option key={item.contract_id} value={item.contract_id}>
                        {item.contract_code} · {item.slot_name_snapshot}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Tên chiến dịch">
                  <input
                    required
                    maxLength={150}
                    value={campaignForm.name}
                    onChange={(event) =>
                      setCampaignForm({
                        ...campaignForm,
                        name: event.target.value,
                      })
                    }
                  />
                </Field>

                {[
                  ["startTime", "Bắt đầu"],
                  ["endTime", "Kết thúc"],
                ].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      required
                      type="datetime-local"
                      value={campaignForm[key]}
                      onChange={(event) =>
                        setCampaignForm({
                          ...campaignForm,
                          [key]: event.target.value,
                        })
                      }
                    />
                  </Field>
                ))}

                <Field label="Mô tả">
                  <textarea
                    maxLength={2000}
                    rows={4}
                    value={campaignForm.description}
                    onChange={(event) =>
                      setCampaignForm({
                        ...campaignForm,
                        description: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>

              <button
                disabled={
                  busy ||
                  !activeContracts.length ||
                  (params.campaignId &&
                    (!current || !editable(current.status)))
                }
              >
                Lưu nháp và tiếp tục
              </button>
            </form>
          )}

          {isCampaign && screen.id !== "BUS-14" && (
            <section className="dashboard-section">
              {!current ? (
                <p>Không tìm thấy chiến dịch của doanh nghiệp này.</p>
              ) : (
                <>
                  <h2>{current.campaign_name}</h2>
                  <Badge value={current.status} />
                  <p>
                    {current.contract_code} ·{" "}
                    {time(current.scheduled_start_time)} →{" "}
                    {time(current.scheduled_end_time)}
                  </p>
                  <p>{current.description}</p>

                  {current.media_url && (
                    <img
                      className="business-creative-preview"
                      src={current.media_url}
                      alt="Banner hiện tại"
                    />
                  )}

                  <p>Banner: {status(current.creative_status)}</p>

                  {screen.id === "BUS-15" && editable(current.status) && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const body = new FormData();
                        body.append("file", file);
                        body.append("targetUrl", targetUrl);
                        action(
                          () =>
                            apiRequest(
                              `/api/business/campaigns/${current.campaign_id}/creative`,
                              { method: "POST", body },
                            ),
                          "Đã lưu phiên bản banner mới vào MySQL và kho tệp local.",
                        );
                      }}
                    >
                      <Field
                        label={`Banner PNG/JPEG ${current.width_px} × ${current.height_px} px · tối đa 8 MB`}
                      >
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          required
                          disabled={busy}
                          onChange={(event) =>
                            setFile(event.target.files?.[0] || null)
                          }
                        />
                      </Field>

                      <Field label="URL đích (http/https)">
                        <input
                          type="url"
                          value={targetUrl}
                          required
                          maxLength={1000}
                          onChange={(event) =>
                            setTargetUrl(event.target.value)
                          }
                        />
                      </Field>

                      <button disabled={busy || !file || data.documents.length >= 5}>
                        Tải và lưu banner
                      </button>
                      <p className="info-note">
                        Nhắm đối tượng theo chuyên mục, thẻ, địa lý và video
                        chưa nối API; banner mới chưa tự được duyệt/phân phối.
                      </p>
                    </form>
                  )}

                  <div className="form-actions">
                    {editable(current.status) ? (
                      <>
                        <Link
                          className="outline-button"
                          to={`/business/campaigns/edit/${current.campaign_id}`}
                        >
                          Sửa thông tin
                        </Link>
                        <Link
                          className="outline-button"
                          to={`/business/campaigns/${current.campaign_id}/creative`}
                        >
                          Banner
                        </Link>
                        {screen.id !== "BUS-16" && (
                          <Link
                            className="button-link"
                            to={`/business/campaigns/${current.campaign_id}/submit`}
                          >
                            Kiểm tra và gửi duyệt →
                          </Link>
                        )}
                        {screen.id === "BUS-16" && (
                          <button
                            disabled={busy || current.creative_status !== "DRAFT"}
                            onClick={() =>
                              action(
                                () =>
                                  apiRequest(
                                    `/api/business/campaigns/${current.campaign_id}/submit`,
                                    { method: "POST" },
                                  ),
                                "Đã gửi chiến dịch và đúng phiên bản banner để xét duyệt.",
                                () =>
                                  navigate(
                                    `/business/campaigns/${current.campaign_id}`,
                                  ),
                              )
                            }
                          >
                            Gửi chiến dịch và banner để duyệt
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="info-note">
                        Bản đã gửi/đã duyệt bị khóa sửa. Việc xét duyệt, lên
                        lịch và yêu cầu đổi quảng cáo sẽ được nối ở đợt tiếp
                        theo.
                      </p>
                    )}
                    <Link className="outline-button" to="/business/campaigns">
                      Danh sách chiến dịch
                    </Link>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
      {applicationConfirm && <div className="campaign-dialog-backdrop"><section className="campaign-dialog" role="dialog" aria-modal="true" aria-labelledby="application-confirm-title" style={{ maxHeight: "85vh", overflowY: "auto" }}>
        <h2 id="application-confirm-title">Xác nhận gửi đăng ký hợp tác</h2>
        <p>Thông tin doanh nghiệp đã lưu và tài liệu sau sẽ được gửi xét duyệt. Sau khi gửi, hồ sơ doanh nghiệp và tài liệu pháp lý sẽ được khóa để chờ quản lý xét duyệt.</p>
        <dl className="business-details">{[["Doanh nghiệp", "company_name"], ["Mã số thuế", "tax_code"], ["Ngành nghề", "industry"], ["Người liên hệ", "contact_person"], ["Email", "email"], ["Điện thoại", "phone"], ["Địa chỉ", "address"], ["Địa chỉ xuất hóa đơn", "billing_address"]].map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{data.company[key] || "—"}</dd></div>)}</dl>
        <h3>Tài liệu pháp lý</h3><ul>{data.documents.map(doc => <li key={doc.document_id}><a href={`/api/media/document/${doc.document_id}`} target="_blank" rel="noreferrer">{doc.original_file_name}</a> · Phiên bản {doc.version_no}</li>)}</ul>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" className="secondary-button" disabled={busy} autoFocus onClick={() => setApplicationConfirm(false)}>Hủy</button><button type="button" disabled={busy || Boolean(submitBlockReason)} onClick={() => action(async () => {
          // BUS-03 chỉ gửi dữ liệu đã lưu; hủy xác nhận không phát sinh POST hay thay đổi DB.
          const result = await apiRequest("/api/business/application/submit", { method: "POST" });
          setApplicationConfirm(false); return result;
        }, "Đã gửi hồ sơ chờ quản lý xét duyệt.")}>{busy ? "Đang gửi…" : "Xác nhận gửi"}</button></div>
      </section></div>}
    </main>
  );
}

