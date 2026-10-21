import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { apiRequest } from "../../services/apiClient.js";
import { getAdvertisingCatalog } from "../../services/contentService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { paymentConfig } from "../../data/paymentConfig.js";
import { autoConfirmPayment, checkPaymentStatus } from "../../services/paymentService.js";
import UiIcon from "../../components/UiIcon.jsx";
import SlotBookingCalendar from "../../components/SlotBookingCalendar.jsx";
import ContractDraftEditor from "./ContractDraftEditor.jsx";

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
};

const status = (value) => statusLabels[value] || value || "Chưa có";
const currency = (value) => Number(value || 0).toLocaleString("vi-VN") + " ₫";
const time = (value) => (value ? String(value).replace("T", " ").slice(0, 16) : "—");
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
        <dt>Đơn giá vị trí / 30 ngày</dt>
        <dd>{currency(saved.slotMonthlyPrice)}</dd>
        <dt>Số ngày</dt>
        <dd>{saved.days}</dd>
        <dt>Tổng báo giá</dt>
        <dd>{currency(saved.total)}</dd>
        <dt>Thời điểm báo giá</dt>
        <dd>{time(saved.quotedAt)}</dd>
      </dl>
      <p>
        Tổng = giá gói + giá vị trí × số ngày / 30. Gửi yêu cầu chưa đồng nghĩa
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

  const [data, setData] = useState(empty);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // UC-38/BUS-02: dữ liệu đang chỉnh sửa của hồ sơ công ty, độc lập với hồ sơ cá nhân ở UC-08.
  const [companyForm, setCompanyForm] = useState({
    name: "",
    taxCode: "",
    email: "",
    phone: "",
    address: "",
    billingAddress: "",
  });

  const [booking, setBooking] = useState({
    name: "",
    slotId: query.get("slotId") || "",
    packageId: query.get("packageId") || "",
    startDate: query.get("startDate") || "",
    endDate: query.get("endDate") || "",
  });

  const [calendarError, setCalendarError] = useState("");
  const [calendarValid, setCalendarValid] = useState(false);
  const [editingBooking, setEditingBooking] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [campaignForm, setCampaignForm] = useState({
    name: "",
    description: "",
    contractId: "",
    startTime: "",
    endTime: "",
  });

  const [file, setFile] = useState(null);
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
  const contract = data.contracts.find(
    (item) => String(item.contract_id) === params.contractId,
  );

  // Nạp lại dữ liệu thật từ backend sau thao tác lưu/gửi; không tự giả lập trạng thái thành công.
  async function refresh() {
    const result = await apiRequest("/api/business/workspace");
    setData(result);
    return result;
  }

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setError("");
    setMessage("");
    setFile(null);
    setEditingBooking(false);
    setDeleteConfirm(false);

    Promise.all([
      apiRequest("/api/business/workspace"),
      getAdvertisingCatalog(),
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

  // Lắng nghe tự động thanh toán hợp đồng từ PayOS/Ngân hàng mỗi 2.5s
  useEffect(() => {
    if (!contract || contract.payment_status === "PAID" || !["BUS-08", "BUS-09", "BUS-10", "BUS-12"].includes(screen.id)) {
      return;
    }
    const timer = setInterval(async () => {
      try {
        const res = await checkPaymentStatus("CONTRACT", contract.contract_id);
        if (res && res.paid) {
          clearInterval(timer);
          setMessage("⚡ Hệ thống đã nhận được thanh toán hợp đồng từ PayOS/Ngân hàng! Hợp đồng đã kích hoạt có hiệu lực.");
          await refresh();
        }
      } catch (err) {
        // ignore polling glitch
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [contract?.contract_id, contract?.payment_status, screen.id]);

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

  // Làm mới bỏ phần đang sửa và tải thông tin đã lưu, không ghi dữ liệu form.
  async function reloadWorkspace() {
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
  const isApplication = ["BUS-03", "BUS-04"].includes(screen.id);

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
            BUS-07 Đặt Quảng Cáo
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

              <h3>Tài liệu pháp lý</h3>
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
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const body = new FormData();
                      body.append("file", file);
                      action(
                        () =>
                          apiRequest("/api/business/documents", {
                            method: "POST",
                            body,
                          }),
                        "Đã tải tài liệu và lưu thông tin vào MySQL.",
                        () => setFile(null),
                      );
                    }}
                  >
                    <Field label="PDF, PNG hoặc JPEG · tối đa 8 MB">
                      <input
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        required
                        disabled={busy}
                        onChange={(event) =>
                          setFile(event.target.files?.[0] || null)
                        }
                      />
                    </Field>
                    <button
                      className="secondary-button"
                      disabled={busy || !file}
                    >
                      Tải tài liệu lên
                    </button>
                  </form>
                  <button
                    disabled={busy || !data.documents.length}
                    onClick={() =>
                      action(
                        () =>
                          apiRequest("/api/business/application/submit", {
                            method: "POST",
                          }),
                        "Đã gửi hồ sơ chờ quản lý xét duyệt.",
                      )
                    }
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

              // Tính giá dự kiến theo công thức: Giá gói + (Giá vị trí * Số ngày / 30)
              const estimatedPrice =
                selectedSlotObj && selectedPackObj && bookingDays > 0
                  ? Number(selectedPackObj.price) +
                    (Number(
                      selectedSlotObj.base_price ||
                        selectedSlotObj.basePrice ||
                        0,
                    ) *
                      bookingDays) /
                      30
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
                            ? `/business/contracts/${result.id}`
                            : "/business/contracts",
                        ),
                    );
                  }}
                >
                  <div className="section-heading">
                    <div>
                      <p className="section-kicker">ĐẶT QUẢNG CÁO · BUS-07</p>
                      <h2>Yêu cầu đặt quảng cáo</h2>
                    </div>
                    <Link
                      className="outline-button"
                      to="/business/advertising/calendar"
                    >
                      Xem toàn bộ lịch (BUS-06) ↗
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
                              ) *
                                (bookingDays / 30),
                            )}{" "}
                            ({bookingDays}/30 ngày). Server xác nhận lại báo giá
                            khi lưu.
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
                        type="date"
                        required
                        value={booking.endDate}
                        onChange={(event) => {
                          setBooking({
                            ...booking,
                            endDate: event.target.value,
                          });
                          setCalendarValid(false);
                        }}
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

          {screen.id === "BUS-11" && (
            <section className="dashboard-section">
              <div className="section-heading">
                <h2>Hợp đồng và yêu cầu đã gửi</h2>
                <Link className="button-link" to="/business/bookings/new">
                  Yêu cầu đặt quảng cáo
                </Link>
              </div>

              <div className="business-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mã / tên</th>
                      <th>Vị trí</th>
                      <th>Khoảng chạy</th>
                      <th>Giá trị</th>
                      <th>Trạng thái</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.contracts.map((item) => (
                      <tr key={item.contract_id}>
                        <td>
                          <strong>{item.contract_code}</strong>
                          <br />
                          {item.contract_name}
                        </td>
                        <td>{item.slot_name_snapshot}</td>
                        <td>
                          {time(item.start_at)}
                          <br />
                          {time(item.end_at)} (kết thúc)
                        </td>
                        <td>{currency(item.total_value)}</td>
                        <td>
                          <Badge value={item.status} />
                          <br />
                          {status(item.payment_status)}
                        </td>
                        <td>
                          <Link to={`/business/contracts/${item.contract_id}`}>
                            Chi tiết →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!data.contracts.length && (
                <p>
                  Chưa có yêu cầu/hợp đồng. Hãy gửi yêu cầu đặt quảng cáo.
                </p>
              )}
            </section>
          )}

          {["BUS-08", "BUS-09", "BUS-10", "BUS-12"].includes(screen.id) && (
            <section className="dashboard-section">
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

                  {contract.status === "DRAFT" ? (
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
                                { method: "POST" },
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
                  ) : contract.status === "ACTIVE" &&
                    contract.payment_status === "PAID" ? (
                    <>
                      <p
                        className="info-note"
                        style={{
                          background: "#ecfdf5",
                          border: "1px solid #10b981",
                          color: "#065f46",
                        }}
                      >
                        ✓ Hợp đồng đã thanh toán thành công và đang có hiệu lực.
                      </p>
                      <Link
                        className="button-link"
                        to="/business/campaigns/edit"
                      >
                        Tạo chiến dịch với hợp đồng này →
                      </Link>
                    </>
                  ) : (
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "20px",
                        marginTop: "16px",
                      }}
                    >
                      <h3
                        style={{
                          margin: "0 0 12px 0",
                          fontSize: "16px",
                          fontWeight: "700",
                        }}
                      >
                        Thanh toán hợp đồng tự động qua VietQR
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          gap: "20px",
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                        }}
                      >
                        <img
                          src={paymentConfig.getDynamicQrUrl(
                            contract.total_value,
                            `THEPLUSE CTR ${contract.contract_id}`,
                          )}
                          onError={(e) => {
                            e.currentTarget.src = paymentConfig.qrImage;
                          }}
                          alt="VietQR Hợp đồng"
                          style={{
                            width: "180px",
                            height: "180px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            padding: "4px",
                          }}
                        />
                        <div style={{ flex: 1, minWidth: "260px" }}>
                          <p style={{ margin: "0 0 6px 0" }}>
                            Ngân hàng: <strong>{paymentConfig.bankName}</strong>
                          </p>
                          <p style={{ margin: "0 0 6px 0" }}>
                            Chủ tài khoản:{" "}
                            <strong>{paymentConfig.accountName}</strong>
                          </p>
                          <p style={{ margin: "0 0 6px 0" }}>
                            Số tài khoản:{" "}
                            <strong>{paymentConfig.accountNumber}</strong>
                          </p>
                          <p style={{ margin: "0 0 6px 0" }}>
                            Số tiền:{" "}
                            <strong
                              style={{ color: "#047857", fontSize: "16px" }}
                            >
                              {currency(contract.total_value)}
                            </strong>
                          </p>
                          <p style={{ margin: "0 0 12px 0" }}>
                            Nội dung chuyển khoản:{" "}
                            <strong
                              style={{
                                color: "#4f46e5",
                                background: "#eef2ff",
                                padding: "2px 8px",
                                borderRadius: "4px",
                              }}
                            >
                              THEPLUSE CTR {contract.contract_id}
                            </strong>
                          </p>
                          <p
                            style={{
                              fontSize: "13px",
                              color: "#64748b",
                              margin: "0 0 16px 0",
                            }}
                          >
                            ⚡ Quét mã bằng app ngân hàng bất kỳ. Sau khi chuyển
                            khoản, bấm nút xác nhận dưới đây để hệ thống tự động
                            kích hoạt hợp đồng và gửi hóa đơn điện tử về email
                            doanh nghiệp.
                          </p>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#f0fdf4", color: "#16a34a", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", border: "1px solid #bbf7d0", marginBlock: "10px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                            <span>Hệ thống đang tự động lắng nghe giao dịch chuyển khoản từ PayOS / Ngân hàng (không cần bấm nút)...</span>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              action(
                                () =>
                                  autoConfirmPayment({
                                    type: "CONTRACT",
                                    contractId: contract.contract_id,
                                  }),
                                "⚡ Thanh toán hợp đồng thành công! Hợp đồng đã kích hoạt có hiệu lực và biên lai điện tử đã gửi tới email doanh nghiệp.",
                              )
                            }
                            style={{
                              background:
                                "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              color: "#ffffff",
                              border: "none",
                              padding: "10px 20px",
                              borderRadius: "8px",
                              fontWeight: "700",
                              cursor: busy ? "not-allowed" : "pointer",
                            }}
                          >
                            {busy
                              ? "Đang xử lý kích hoạt…"
                              : "⚡ Xác nhận đã thanh toán VietQR (Tự động kích hoạt hợp đồng)"}
                          </button>
                        </div>
                      </div>
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
                      `/api/business/campaigns${
                        params.campaignId ? `/${params.campaignId}` : ""
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

                      <button disabled={busy || !file}>
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
    </main>
  );
}

