import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { dateLabel } from "../../utils/businessCampaign.js";
import {
  approvalWarnings,
  reviewFormError,
  reviewHref,
} from "../../utils/campaignSubmissionReview.js";
import "../../assets/campaign-submission-review.css";

const decisions = [
  {
    value: "APPROVED",
    title: "Phê duyệt",
    description: "Chấp nhận nội dung và lịch chạy đủ điều kiện.",
    icon: "✓",
  },
  {
    value: "NEEDS_REVISION",
    title: "Yêu cầu chỉnh sửa",
    description: "Trả về để doanh nghiệp cập nhật và nộp lại.",
    icon: "↺",
  },
  {
    value: "REJECTED",
    title: "Từ chối",
    description: "Không chấp nhận phiên bản chiến dịch này.",
    icon: "×",
  },
];

const deviceNames = {
  ALL: "Tất cả thiết bị",
  DESKTOP: "Máy tính",
  MOBILE: "Điện thoại",
  TABLET: "Máy tính bảng",
};

const paymentNames = {
  PAID: "Đã thanh toán",
  UNPAID: "Chưa thanh toán",
  PENDING: "Chờ thanh toán",
  FAILED: "Thanh toán thất bại",
  REFUNDED: "Đã hoàn tiền",
};

function Field({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children || "Chưa cung cấp"}</dd>
    </div>
  );
}

/** State belongs to this submitted version, never to the previously reviewed campaign. */
export default function CampaignSubmissionReview({
  row,
  busy,
  onDecide,
  onReload,
}) {
  const s = row.snapshot;
  const c = s.campaign;
  const cr = s.creative || {};
  const contract = s.contract || {};
  const target = s.targeting || {};

  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedDecision, setSavedDecision] = useState("");
  const [mediaFailed, setMediaFailed] = useState(false);
  const [mediaAttempt, setMediaAttempt] = useState(0);
  const [now, setNow] = useState(Date.now());

  const saving = useRef(false);
  const reasonInput = useRef(null);
  const feedback = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (savedDecision || saveError) feedback.current?.focus();
  }, [savedDecision, saveError]);

  const warnings = approvalWarnings(s, now);
  const media = reviewHref(cr.media_url);
  const destination = reviewHref(c.target_url);

  if (!media || mediaFailed) {
    warnings.push(
      "Chưa xem được tệp quảng cáo. Hãy thử tải lại để kiểm tra nội dung trước khi phê duyệt."
    );
  }

  const blocked = warnings.length > 0;
  const locked = busy || !!savedDecision;
  const resultTitles = {
    APPROVED: "Phê duyệt thành công",
    NEEDS_REVISION: "Đã gửi yêu cầu chỉnh sửa",
    REJECTED: "Đã từ chối chiến dịch",
  };

  async function save(event) {
    event.preventDefault();
    if (saving.current || savedDecision) return;
    const error = reviewFormError(decision, reason, blocked);
    setFormError(error);
    if (error) {
      if (decision && !(decision === "APPROVED" && blocked))
        reasonInput.current?.focus();
      return;
    }
    const payload = {
      submissionId: row.submission_id,
      decision,
      reason: reason.trim(),
    };
    saving.current = true;
    setSaveError("");
    try {
      await onDecide(payload);
      setSavedDecision(payload.decision);
    } catch (error) {
      setSaveError(
        error.message ||
          "Không thể lưu kết quả. Hãy tải lại trạng thái trước khi thử lại."
      );
    } finally {
      saving.current = false;
    }
  }

  return (
    <>
      <section
        className="csr-card csr-summary"
        aria-labelledby="csr-campaign-title"
      >
        <div className="csr-summary-top">
          <div>
            <p className="csr-eyebrow">
              PHIÊN BẢN ĐÃ NỘP · V{row.version_no}
            </p>
            <h2 id="csr-campaign-title">{c.campaign_name}</h2>
            <p className="csr-company">{row.company_name}</p>
          </div>
          <span
            className={`csr-status${savedDecision ? " is-reviewed" : ""}`}
          >
            ●{" "}
            {savedDecision
              ? {
                  APPROVED: "Đã phê duyệt",
                  NEEDS_REVISION: "Đã yêu cầu chỉnh sửa",
                  REJECTED: "Đã từ chối",
                }[savedDecision]
              : "Chờ xét duyệt"}
          </span>
        </div>
        <dl className="csr-summary-meta">
          <Field label="Mã chiến dịch">{row.campaign_code}</Field>
          <Field label="Gửi xét duyệt lúc">{dateLabel(row.submitted_at)}</Field>
          <Field label="Vị trí quảng cáo">
            {contract.slot_name_snapshot}
          </Field>
        </dl>
        {s.legacyImported && (
          <p className="csr-note">
            Hồ sơ được chuyển từ hệ thống cũ. Cần kiểm tra lại thông tin và điều
            kiện hiện tại trước khi phê duyệt.
          </p>
        )}
        {blocked && !savedDecision && (
          <div className="csr-warning" role="status">
            <strong>Cần kiểm tra trước khi phê duyệt</strong>
            <ul>
              {warnings.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            <p>
              Bạn vẫn có thể yêu cầu chỉnh sửa hoặc từ chối phiên bản này.
            </p>
          </div>
        )}
      </section>

      <div className="csr-layout">
        <div className="csr-content">
          <section className="csr-card" aria-labelledby="csr-preview-title">
            <div className="csr-section-heading">
              <div>
                <p className="csr-eyebrow">NỘI DUNG QUẢNG CÁO</p>
                <h2 id="csr-preview-title">Xem creative đã nộp</h2>
              </div>
              <span className="csr-tag">
                {cr.creative_type === "VIDEO" ? "Video" : "Hình ảnh"} · v
                {cr.version_no || "—"}
              </span>
            </div>
            <div className="csr-media">
              {!media || mediaFailed ? (
                <div className="csr-media-error" role="status">
                  <strong>Không tải được tệp quảng cáo</strong>
                  <p>
                    Chưa thể kiểm tra nội dung của phiên bản đã nộp.
                  </p>
                  {media && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setMediaFailed(false);
                        setMediaAttempt((v) => v + 1);
                      }}
                    >
                      Thử tải lại tệp
                    </button>
                  )}
                </div>
              ) : cr.creative_type === "VIDEO" ? (
                <video
                  key={mediaAttempt}
                  controls
                  preload="metadata"
                  src={media}
                  onError={() => setMediaFailed(true)}
                  aria-label="Video quảng cáo đã nộp"
                />
              ) : (
                <img
                  key={mediaAttempt}
                  src={media}
                  alt={cr.title || "Nội dung quảng cáo đã nộp"}
                  onError={() => setMediaFailed(true)}
                />
              )}
            </div>
            <div className="csr-media-caption">
              <span>Creative #{cr.creative_id || "—"}</span>
              <span>
                {cr.width_px || "—"} × {cr.height_px || "—"} px
              </span>
              <span>
                {cr.mime_type ||
                  (cr.creative_type === "VIDEO" ? "Video" : "Hình ảnh")}
              </span>
            </div>
            <div className="csr-destination">
              <span>Trang đích</span>
              {destination ? (
                <a
                  href={destination}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {c.target_url}
                  <span aria-hidden="true"> ↗</span>
                  <span className="csr-sr-only"> (mở trong tab mới)</span>
                </a>
              ) : (
                <p>{c.target_url || "Chưa cung cấp URL đích"}</p>
              )}
            </div>
          </section>

          <section className="csr-card" aria-labelledby="csr-details-title">
            <h2 id="csr-details-title">Thông tin chiến dịch</h2>
            {c.description && (
              <p className="csr-description">{c.description}</p>
            )}
            <dl className="csr-fields">
              <Field label="Bắt đầu chạy">
                {dateLabel(c.scheduled_start_time)}
              </Field>
              <Field label="Kết thúc chạy">
                {dateLabel(c.scheduled_end_time)}
              </Field>
              <Field label="Mã hợp đồng">{contract.contract_code}</Field>
              <Field label="Thanh toán">
                <span
                  className={
                    contract.payment_status === "PAID" ? "csr-paid" : ""
                  }
                >
                  {paymentNames[contract.payment_status] ||
                    contract.payment_status ||
                    "Chưa có thông tin"}
                </span>
              </Field>
            </dl>
            <div className="csr-divider" />
            <h3>Phạm vi phân phối</h3>
            <dl className="csr-fields">
              <Field label="Thiết bị">
                {deviceNames[target.device_type] || target.device_type}
              </Field>
              <Field label="Khu vực">
                {target.geo_scope === "ALL"
                  ? "Tất cả khu vực"
                  : target.geo_scope?.split(",").join(", ")}
              </Field>
              <Field label="Đối tượng">
                {target.target_audience || "Tất cả đối tượng"}
              </Field>
              <Field label="Chuyên mục / thẻ">
                {`Chuyên mục: ${
                  target.categoryIds?.length
                    ? target.categoryIds.map((id) => `#${id}`).join(", ")
                    : "Tất cả"
                } · Thẻ: ${
                  target.tagIds?.length
                    ? target.tagIds.map((id) => `#${id}`).join(", ")
                    : "Tất cả"
                }`}
              </Field>
            </dl>
            <p className="csr-footnote">
              Thông tin hiển thị là phiên bản được lưu khi doanh nghiệp gửi xét
              duyệt.
            </p>
          </section>
        </div>

        <form
          className="csr-card csr-decision"
          onSubmit={save}
          noValidate
          aria-labelledby="csr-decision-title"
          aria-busy={busy}
        >
          <p className="csr-eyebrow">KẾT QUẢ XÉT DUYỆT</p>
          <h2 id="csr-decision-title">Đưa ra quyết định</h2>
          <p className="csr-form-intro">
            Kiểm tra nội dung, lịch chạy và trang đích trước khi lựa chọn.
          </p>

          <fieldset disabled={locked}>
            <legend>
              Quyết định <span aria-hidden="true">*</span>
            </legend>
            <div className="csr-options">
              {decisions.map((item) => (
                <label
                  key={item.value}
                  className={`csr-option ${
                    decision === item.value ? "is-selected" : ""
                  } ${
                    item.value === "APPROVED" && blocked ? "is-disabled" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="campaign-review-decision"
                    value={item.value}
                    checked={decision === item.value}
                    disabled={item.value === "APPROVED" && blocked}
                    onChange={() => {
                      setDecision(item.value);
                      setFormError("");
                    }}
                    aria-describedby={
                      item.value === "APPROVED" && blocked && !savedDecision
                        ? "csr-approval-blocked"
                        : undefined
                    }
                  />
                  <span className="csr-option-copy">
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span className="csr-option-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {blocked && !savedDecision && (
            <p id="csr-approval-blocked" className="csr-approval-blocked">
              Chưa thể phê duyệt do các cảnh báo ở trên.
            </p>
          )}

          <label className="csr-reason-label" htmlFor="csr-reason">
            Nhận xét / lý do <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="csr-reason"
            ref={reasonInput}
            rows={5}
            maxLength={2000}
            required
            disabled={locked}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setFormError("");
            }}
            placeholder={
              decision === "NEEDS_REVISION"
                ? "Nêu rõ nội dung cần sửa để doanh nghiệp cập nhật…"
                : decision === "REJECTED"
                ? "Giải thích lý do không chấp nhận phiên bản này…"
                : "Ghi nhận kết quả kiểm tra nội dung và điều kiện chạy…"
            }
            aria-invalid={!!formError && !!decision}
            aria-describedby="csr-reason-help csr-form-error"
          />

          <div className="csr-reason-help" id="csr-reason-help">
            <span>Doanh nghiệp sẽ nhận được nhận xét này.</span>
            <span>{reason.length.toLocaleString("vi-VN")}/2.000</span>
          </div>
          <p
            id="csr-form-error"
            className="csr-error"
            role={formError ? "alert" : undefined}
          >
            {formError}
          </p>

          <button
            className="csr-primary"
            type="submit"
            disabled={
              locked || !decision || (decision === "APPROVED" && blocked)
            }
          >
            {busy
              ? "Đang lưu kết quả…"
              : savedDecision
              ? "Đã lưu kết quả"
              : "Lưu kết quả xét duyệt"}
          </button>

          {savedDecision && (
            <div
              ref={feedback}
              className="csr-feedback csr-feedback-success"
              role="status"
              tabIndex={-1}
            >
              <strong>{resultTitles[savedDecision]}</strong>
              <p>
                Quyết định và nhận xét đã được lưu. Doanh nghiệp sẽ nhận thông
                báo kết quả.
              </p>
              {savedDecision === "APPROVED" && (
                <p>
                  Chiến dịch được lên lịch hoặc bắt đầu chạy theo lịch đã đăng ký
                  nếu còn đủ điều kiện.
                </p>
              )}
            </div>
          )}

          {saveError && (
            <div
              ref={feedback}
              className="csr-feedback csr-feedback-error"
              role="alert"
              tabIndex={-1}
            >
              <strong>Chưa lưu được kết quả</strong>
              <p>{saveError}</p>
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={onReload}
              >
                Tải lại trạng thái
              </button>
            </div>
          )}

          {!busy && (
            <Link className="csr-back-link" to="/ad-manager/campaigns">
              Quay lại danh sách
            </Link>
          )}
          {!savedDecision && (
            <p className="csr-footnote">
              Bấm lưu để gửi quyết định và nhận xét cho doanh nghiệp. Hệ thống
              kiểm tra lại điều kiện hiện tại trước khi lưu.
            </p>
          )}
        </form>
      </div>
    </>
  );
}
