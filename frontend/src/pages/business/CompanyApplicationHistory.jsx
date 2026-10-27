import { dateLabel } from "../../utils/businessCampaign.js";

const labels = {
  SUBMITTED: "Đã nộp — chưa có kết quả xét duyệt được lưu",
  PENDING_REVIEW: "Đã gửi — chờ xét duyệt",
  RESUBMITTED: "Đã gửi lại — chờ xét duyệt",
  APPROVED: "Đã phê duyệt", REJECTED: "Bị từ chối", NEEDS_REVISION: "Yêu cầu chỉnh sửa",
};

/** Mỗi version có kết quả và timeline riêng, không hiển thị trạng thái hiện tại của company cho tất cả bản cũ. */
export default function CompanyApplicationHistory({ versions = [] }) {
  return <section className="dashboard-section">
    <h2>Lịch sử hồ sơ đã nộp</h2>
    <p>Các lần gửi và kết quả xét duyệt được giữ theo từng phiên bản, kể cả khi tạo hồ sơ mới sau từ chối.</p>
    {versions.length ? versions.map(version => <details key={version.application_version}>
      <summary>Phiên bản {version.application_version} · {dateLabel(version.submitted_at)} · {labels[version.history_status] || labels.SUBMITTED}</summary>
      {version.application_code && <p>Mã hồ sơ lúc nộp: {version.application_code}</p>}
      <ol aria-label={`Lịch sử trạng thái phiên bản ${version.application_version}`}>
        {(version.history_events || []).map((event, index) => <li key={index}>
          <strong>{labels[event.status] || labels.SUBMITTED}</strong> · {dateLabel(event.occurred_at)}
          {event.reviewer_name && <p>Người xét duyệt: {event.reviewer_name}</p>}
          {event.note && <p>Phản hồi: {event.note}</p>}
        </li>)}
      </ol>
      <p>{version.company_name} · {version.tax_code}</p>
      <p>{version.industry} · {version.contact_person}</p>
      <p>{version.email} · {version.phone}</p>
      <p>{version.address} · địa chỉ xuất hóa đơn: {version.billing_address}</p>
    </details>) : <p>Chưa nộp hồ sơ.</p>}
  </section>;
}
