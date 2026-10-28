import { Link } from "react-router-dom";
import { dateLabel } from "../../utils/businessCampaign.js";
import CompanyApplicationHistory from "./CompanyApplicationHistory.jsx";
import "../../assets/partnership-status.css";

const labels={DRAFT:"Chưa gửi",PENDING_REVIEW:"Chờ xét duyệt",RESUBMITTED:"Đã gửi lại — chờ xét duyệt",NEEDS_REVISION:"Yêu cầu bổ sung",APPROVED:"Đã phê duyệt",REJECTED:"Bị từ chối"};

/** BUS-04 chỉ đọc quá trình thật: không suy diễn manager đã kiểm tra tài liệu khi chưa có quyết định. */
export default function PartnershipStatus({company,versions=[]}) {
  const state=company.application_status || "DRAFT";
  const draft=state==="DRAFT",pending=["PENDING_REVIEW","RESUBMITTED"].includes(state);
  const decided=["NEEDS_REVISION","APPROVED","REJECTED"].includes(state);
  const current=versions.find(v=>Number(v.application_version)===Number(company.application_version));
  const events=current?.history_events || [];
  const review=[...events].reverse().find(e=>["APPROVED","REJECTED","NEEDS_REVISION"].includes(e.status));
  const active=draft?0:pending?1:state==="APPROVED"?3:2;
  const steps=["Chuẩn bị hồ sơ",state==="RESUBMITTED"?"Đã gửi lại":"Đã gửi",state==="NEEDS_REVISION"?"Yêu cầu bổ sung":state==="REJECTED"?"Bị từ chối":"Xét duyệt", "Phê duyệt"];
  const note=company.review_note || review?.note;
  return <>
    <section className="dashboard-section partnership-tracker">
      <h2>Tiến trình đăng ký hợp tác</h2>
      <ol className="partnership-steps" aria-label="Tiến trình xử lý hồ sơ">{steps.map((label,index)=><li key={index} className={index<active?"complete":index===active?"current":"future"} aria-current={index===active?"step":undefined}><span className="step-dot" aria-hidden="true">{index<active?"✓":index+1}</span><strong>{label}</strong><small>{index===active?(pending?"Chờ quản lý xét duyệt":"Hiện tại"):index<active?"Đã qua":"Chưa đến"}</small></li>)}</ol>
      <div className={`partnership-outcome outcome-${state}`} role="status"><strong>{labels[state] || state}</strong><p>{draft?"Hồ sơ chưa được gửi xét duyệt. Hoàn thiện thông tin và tài liệu tại tab Đăng ký hợp tác.":pending?"Hệ thống đã nhận hồ sơ. Vui lòng chờ quản lý xét duyệt; thông tin và tài liệu đang khóa sửa.":state==="APPROVED"?"Hồ sơ đã được phê duyệt. Bạn có thể sử dụng các chức năng đặt quảng cáo và chiến dịch.":note || "Chưa có nội dung phản hồi được lưu."}</p></div>
      <div className="partnership-status-grid"><div><h3>Hồ sơ {company.application_code || "chưa được tạo"}</h3><dl><dt>Doanh nghiệp</dt><dd>{company.company_name || "Chưa lưu hồ sơ"}</dd><dt>Thời gian gửi gần nhất</dt><dd>{draft?"Chưa gửi trong vòng hiện tại":dateLabel(company.submitted_at)}</dd><dt>Phiên bản đã nộp</dt><dd>{company.application_version || 0}</dd><dt>Thời gian xét duyệt</dt><dd>{decided?dateLabel(company.reviewed_at || review?.occurred_at):"Chưa có kết quả"}</dd><dt>Người xét duyệt</dt><dd>{decided?(review?.reviewer_name || "Chưa có thông tin được lưu"):"Chưa có kết quả"}</dd></dl></div>
      <div><h3>{state==="NEEDS_REVISION"?"Nội dung cần bổ sung":"Phản hồi xét duyệt"}</h3><p className="partnership-review-note">{draft?"Chưa gửi xét duyệt.":pending?"Chưa có kết quả xét duyệt cho lần gửi này.":note || "Chưa có nội dung phản hồi được lưu."}</p>{state==="NEEDS_REVISION" && <div className="form-actions"><Link className="button-link" to="/business/company">Sửa thông tin doanh nghiệp</Link><Link to="/business/partnership/apply">Bổ sung tài liệu và gửi lại</Link></div>}{state==="REJECTED" && <Link className="button-link" to="/business/partnership/apply">Tạo hồ sơ hợp tác mới</Link>}{draft && <Link to="/business/partnership/apply">Tiếp tục đăng ký hợp tác →</Link>}</div></div>
    </section>
    <CompanyApplicationHistory versions={versions}/>
  </>;
}
