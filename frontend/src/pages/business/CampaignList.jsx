import { Link } from "react-router-dom";
import { campaignLabels, campaignStatuses, dateLabel, editableCampaign } from "../../utils/businessCampaign.js";
import "../../assets/campaign-list.css";

/** BUS-13 trình bày danh sách; lọc/sắp xếp ở component cha, mutation vẫn dùng luồng API hiện có. */
export default function CampaignList({items,total,q,setQ,filter,setFilter,delivery,setDelivery,sortOrder,setSortOrder,page,setPage,busy,canCreate,onCopy,onDelete}) {
  const change=setter=>event=>{setter(event.target.value);setPage(0);};
  const lastPage=Math.max(0,Math.ceil(items.length/10)-1),currentPage=Math.min(page,lastPage);
  const start=currentPage*10,visible=items.slice(start,start+10);
  const filtered=Boolean(q || filter!=="ALL" || delivery!=="ALL");
  const reset=()=>{setQ("");setFilter("ALL");setDelivery("ALL");setPage(0);};
  return <section className="dashboard-section campaign-list">
    <header className="campaign-list-heading"><div><h2>Chiến dịch và bản nháp</h2><p>Quản lý thông tin, tình trạng xét duyệt và lịch phân phối.</p></div><Link className="button-link" to="/business/campaigns/edit">+ Tạo chiến dịch</Link></header>
    {!canCreate && <p className="info-note">Cần hợp đồng đã thanh toán còn hiệu lực để tạo hoặc nhân bản chiến dịch. <Link to="/business/contracts">Xem hợp đồng →</Link></p>}
    <div className="campaign-list-controls">
      <label className="campaign-list-search">Tìm chiến dịch<input type="search" placeholder="Nhập mã, tên chiến dịch hoặc mã hợp đồng…" value={q} onChange={change(setQ)}/></label>
      <div className="campaign-list-filters">
        <label>Xét duyệt<select value={filter} onChange={change(setFilter)}><option value="ALL">Tất cả trạng thái</option>{["DRAFT","PENDING_REVIEW","NEEDS_REVISION","APPROVED","REJECTED"].map(s=><option key={s} value={s}>{campaignLabels[s]}</option>)}</select></label>
        <label>Phân phối<select value={delivery} onChange={change(setDelivery)}><option value="ALL">Tất cả trạng thái</option>{["NOT_RUNNING","SCHEDULED","ACTIVE","PAUSED","COMPLETED"].map(s=><option key={s} value={s}>{campaignLabels[s] || "Chưa phân phối"}</option>)}</select></label>
        <label>Sắp xếp<select value={sortOrder} onChange={change(setSortOrder)}><option value="NAME_ASC">Tên: A → Z</option><option value="NAME_DESC">Tên: Z → A</option><option value="CREATED_DESC">Tạo mới nhất</option><option value="CREATED_ASC">Tạo cũ nhất</option><option value="START_ASC">Bắt đầu: sớm nhất</option><option value="START_DESC">Bắt đầu: muộn nhất</option></select></label>
      </div>
    </div>
    <div className="campaign-list-result" role="status"><span><strong>{items.length}</strong> / {total} chiến dịch{filtered?" phù hợp bộ lọc":""}</span>{filtered && <button type="button" className="secondary-button" onClick={reset}>Xóa bộ lọc</button>}</div>
    <div className="campaign-list-table"><table><caption className="campaign-list-caption">Danh sách chiến dịch của doanh nghiệp</caption><colgroup><col className="col-name"/><col className="col-contract"/><col className="col-schedule"/><col className="col-state"/><col className="col-state"/><col className="col-actions"/></colgroup><thead><tr>{["Chiến dịch","Hợp đồng","Lịch chạy","Xét duyệt","Phân phối","Thao tác"].map(title=><th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>{visible.map(item=>{
      const states=campaignStatuses(item.status);
      return <tr key={item.campaign_id}><td><Link className="campaign-list-name" to={`/business/campaigns/${item.campaign_id}`}>{item.campaign_name}</Link><span className="campaign-list-code">{item.code}</span></td><td><span className="campaign-list-contract">{item.contract_code}</span><small>{item.slot_name || ""}</small></td><td><div className="campaign-list-date"><span>Từ</span><time>{dateLabel(item.scheduled_start_time)}</time></div><div className="campaign-list-date"><span>Đến</span><time>{dateLabel(item.scheduled_end_time)}</time></div></td><td><span className={`campaign-list-status status-${states.review}`}>{campaignLabels[states.review] || states.review}</span></td><td><span className={`campaign-list-status status-${states.delivery}`}>{campaignLabels[states.delivery] || "Chưa phân phối"}</span></td><td><div className="campaign-list-actions"><Link className="campaign-list-open" to={`/business/campaigns/${item.campaign_id}`}>Chi tiết →</Link>{editableCampaign(item.status) && <Link to={`/business/campaigns/edit/${item.campaign_id}`}>Sửa bản nháp</Link>}<details><summary>Thêm</summary><div className="campaign-list-extra"><button type="button" disabled={busy || !canCreate} onClick={()=>onCopy(item)}>Nhân bản</button>{item.status==="DRAFT" && <button type="button" className="campaign-list-delete" disabled={busy} onClick={()=>onDelete(item)}>Xóa bản nháp</button>}</div></details></div></td></tr>;
    })}</tbody></table></div>
    {!items.length && <div className="campaign-list-empty"><h3>{total?"Không tìm thấy chiến dịch phù hợp":"Chưa có chiến dịch"}</h3><p>{total?"Thử đổi từ khóa hoặc xóa các bộ lọc để xem lại danh sách.":"Tạo chiến dịch đầu tiên từ hợp đồng đủ điều kiện của doanh nghiệp."}</p>{filtered && <button type="button" className="secondary-button" onClick={reset}>Xóa bộ lọc</button>}</div>}
    <footer className="campaign-list-pagination"><span>{items.length?`${start+1}–${Math.min(start+10,items.length)} trong ${items.length} chiến dịch`:"0 chiến dịch"}</span><nav aria-label="Phân trang chiến dịch"><button type="button" className="secondary-button" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>← Trước</button><span>Trang {currentPage+1} / {lastPage+1}</span><button type="button" className="secondary-button" disabled={currentPage>=lastPage} onClick={()=>setPage(currentPage+1)}>Sau →</button></nav></footer>
  </section>;
}
