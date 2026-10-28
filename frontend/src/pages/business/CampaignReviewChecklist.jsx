import { Link } from "react-router-dom";

const guidance={
  partnership:"Mở hồ sơ hợp tác để kiểm tra kết quả phê duyệt. Chờ quản lý duyệt trước khi gửi chiến dịch.",
  contract:"Kiểm tra thanh toán và hiệu lực hợp đồng. Hợp đồng của chiến dịch đã lưu không thể đổi trực tiếp.",
  slot:"Kiểm tra vị trí trong hợp đồng và liên hệ quản lý quảng cáo nếu vị trí đã ngừng hoạt động.",
  schedule:"Sửa thời gian bắt đầu/kết thúc: kết thúc sau bắt đầu, nằm trong hợp đồng và chưa hết hạn.",
  url:"Nhập URL HTTP/HTTPS hợp lệ tại bước Thông tin; sau đó lưu lại URL creative nếu có thay đổi.",
  creative:"Tải tệp quảng cáo lên thành công. Nếu tệp đã mất, tải lại một phiên bản mới.",
  dimensions:"Dùng đúng chiều rộng và chiều cao pixel theo hợp đồng ở cột tóm tắt bên phải.",
  creativeState:"Tải hoặc lưu phiên bản creative nháp mới trước khi gửi lại xét duyệt.",
  creativeUrl:"Tại bước Banner và đối tượng, lưu lại URL để đồng bộ với URL chiến dịch.",
  targeting:"Lưu đối tượng tại bước Banner và đối tượng; kiểm tra chuyên mục, thẻ và mã quốc gia.",
};

/** BUS-16 phân nhóm theo kết quả server; không coi checklist rỗng hoặc lỗi tải là đã đạt. */
export default function CampaignReviewChecklist({checks,campaignId}) {
  const failed=checks.filter(x=>!x.valid),passed=checks.filter(x=>x.valid);
  function destination(item){
    if(item.code==="contract" || item.code==="slot")return "/business/contracts";
    if(item.step==="company")return "/business/partnership/status";
    return item.step==="edit"?`/business/campaigns/edit/${campaignId}`:`/business/campaigns/${campaignId}/creative`;
  }
  return <section className="dashboard-section campaign-review-checklist">
    <h2>Điều kiện gửi xét duyệt</h2>
    <div className={`campaign-readiness ${failed.length || !checks.length?"needs-work":"ready"}`} role="status"><strong>{!checks.length?"Chưa có kết quả kiểm tra":failed.length?`Còn ${failed.length} yêu cầu chưa phù hợp`:"Đã đạt tất cả điều kiện kiểm tra"}</strong><p>{!checks.length?"Bấm Làm mới để tải kết quả. Chưa thể gửi khi chưa kiểm tra được dữ liệu.":failed.length?`Đã đạt ${passed.length}/${checks.length} yêu cầu. Hoàn thiện các mục dưới đây trước khi gửi.`:"Bạn có thể xác nhận gửi hồ sơ cho quản lý xét duyệt. Quảng cáo chưa tự động chạy."}</p></div>
    {!!failed.length && <div><h3>Cần xử lý trước khi gửi</h3><ol className="campaign-review-errors">{failed.map(item=><li key={item.code}><div><strong>Chưa đạt · {item.label}</strong><p>{item.message}</p><p className="campaign-fix-guide">{guidance[item.code] || "Mở bước liên quan, kiểm tra và lưu lại thông tin."}</p></div><Link to={destination(item)}>{["contract","slot"].includes(item.code)?"Kiểm tra hợp đồng":"Mở mục cần sửa"} →</Link></li>)}</ol></div>}
    {!!passed.length && <details className="campaign-passed-checks"><summary>Đã đạt · {passed.length} yêu cầu</summary><ul>{passed.map(item=><li key={item.code}><span aria-hidden="true">✓ </span>{item.label}</li>)}</ul></details>}
  </section>;
}
