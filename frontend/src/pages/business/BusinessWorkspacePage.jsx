import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../services/apiClient.js";
import { getAdvertisingCatalog } from "../../services/contentService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import UiIcon from "../../components/UiIcon.jsx";
import SlotBookingCalendar from "../../components/SlotBookingCalendar.jsx";

const statusLabels={DRAFT:"Bản nháp",PENDING_REVIEW:"Chờ xét duyệt",RESUBMITTED:"Đã gửi lại",NEEDS_REVISION:"Cần chỉnh sửa",APPROVED:"Đã duyệt",REJECTED:"Bị từ chối",ACTIVE:"Đang hiệu lực",PAID:"Đã thanh toán",UNPAID:"Chưa thanh toán",PROPOSED:"Đã có đề xuất",SCHEDULED:"Đã lên lịch",COMPLETED:"Đã hoàn thành",CANCELLED:"Đã hủy",EXPIRED:"Hết hạn"};
const status=value=>statusLabels[value] || value || "Chưa có";
const currency=value=>Number(value || 0).toLocaleString("vi-VN")+" ₫";
const time=value=>value?String(value).replace("T"," ").slice(0,16):"—";
const datetime=value=>value?String(value).replace(" ","T").slice(0,16):"";
const editable=value=>["DRAFT","NEEDS_REVISION"].includes(value);
const empty={company:{},documents:[],contracts:[],campaigns:[]};

// UC-25/BUS-13: giải thích vì sao các thao tác booking/chiến dịch bị khóa theo hồ sơ hợp tác.
function partnershipNotice(state) {
  if(["PENDING_REVIEW","RESUBMITTED"].includes(state)) return "Hồ sơ hợp tác đã gửi yêu cầu. Vui lòng chờ Partnership Application được phê duyệt.";
  if(state==="REJECTED") return "Hồ sơ hợp tác bị từ chối. Vui lòng tạo Partnership Application mới và chờ phê duyệt.";
  if(state==="NEEDS_REVISION") return "Hồ sơ hợp tác cần chỉnh sửa. Vui lòng sửa, gửi lại và chờ phê duyệt.";
  return "Vui lòng hoàn thiện và gửi Partnership Application, sau đó chờ phê duyệt để sử dụng chức năng này.";
}

function Field({label,children}) {return <label className="business-field"><span>{label}</span>{children}</label>;}
function Badge({value}) {return <span className={`status-pill business-badge badge-${String(value || 'EMPTY').toLowerCase()}`}>{status(value)}</span>;}

export default function BusinessWorkspacePage({screen}) {
  const { tr }=usePreferences();const params=useParams();const navigate=useNavigate();const [query]=useSearchParams();
  const [data,setData]=useState(empty);const [catalog,setCatalog]=useState(null);const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
  // UC-38/BUS-02: dữ liệu đang chỉnh sửa của hồ sơ công ty, độc lập với hồ sơ cá nhân ở UC-08.
  const [companyForm,setCompanyForm]=useState({name:"",taxCode:"",email:"",phone:"",address:"",billingAddress:""});
  const [booking,setBooking]=useState({name:"",slotId:query.get("slotId") || "",packageId:query.get("packageId") || "",startDate:query.get("startDate") || "",endDate:query.get("endDate") || ""});
  const [calendarError,setCalendarError]=useState("");
  const [editingBooking,setEditingBooking]=useState(false);const [deleteConfirm,setDeleteConfirm]=useState(false);
  const [campaignForm,setCampaignForm]=useState({name:"",description:"",contractId:"",startTime:"",endTime:""});
  const [file,setFile]=useState(null);const [targetUrl,setTargetUrl]=useState("");
  const queryString=query.toString();
  useEffect(()=>{if(screen.id==="BUS-07") {const selected=new URLSearchParams(queryString);setBooking({name:"",slotId:selected.get("slotId") || "",packageId:selected.get("packageId") || "",startDate:selected.get("startDate") || "",endDate:selected.get("endDate") || ""});}},[screen.id,queryString]);
  const current=data.campaigns.find(c=>String(c.campaign_id)===params.campaignId);
  const contract=data.contracts.find(c=>String(c.contract_id)===params.contractId);
  // Nạp lại dữ liệu thật từ backend sau thao tác lưu/gửi; không tự giả lập trạng thái thành công.
  async function refresh(){const result=await apiRequest("/api/business/workspace");setData(result);return result;}
  useEffect(()=>{let alive=true;setLoading(true);setError("");setMessage("");setFile(null);setEditingBooking(false);setDeleteConfirm(false);
    Promise.all([apiRequest("/api/business/workspace"),getAdvertisingCatalog()]).then(([result,offers])=>{if(!alive)return;
      setData(result);setCatalog(offers);const c=result.company;
      setCompanyForm({name:c.company_name || "",taxCode:c.tax_code || "",email:c.email || "",phone:c.phone || "",address:c.address || "",billingAddress:c.billing_address || ""});
      const draft=result.contracts.find(row=>String(row.contract_id)===params.contractId);
      if(draft) setBooking({name:draft.contract_name,slotId:String(draft.slot_id),packageId:String(draft.b2b_package_id),startDate:String(draft.start_at).slice(0,10),endDate:new Date(Date.parse(String(draft.end_at).slice(0,10)+"T00:00:00Z")-86400000).toISOString().slice(0,10)});
      const selected=result.campaigns.find(row=>String(row.campaign_id)===params.campaignId);
      setCampaignForm(selected?{name:selected.campaign_name,description:selected.description || "",contractId:String(selected.contract_id),startTime:datetime(selected.scheduled_start_time),endTime:datetime(selected.scheduled_end_time)}:{name:"",description:"",contractId:"",startTime:"",endTime:""});
      setTargetUrl(selected?.target_url || "");
    }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return ()=>{alive=false;};
  },[screen.id,params.campaignId,params.contractId]);
  // Bao thao tác API: khóa gửi lặp, hiển thị lỗi/thành công, đồng bộ workspace rồi gọi callback nếu có.
  async function action(task,success,after){if(busy)return;setBusy(true);setError("");setMessage("");try{const result=await task();await refresh();setMessage(success);after?.(result);}catch(e){setError(e.message);}finally{setBusy(false);}}
  const json=(path,body,method="POST")=>apiRequest(path,{method,body:JSON.stringify(body)});
  const activeContracts=data.contracts.filter(c=>c.status==="ACTIVE" && c.payment_status==="PAID" && new Date(c.end_at)>new Date());
  const isProfile=screen.id==="BUS-02";const isApplication=["BUS-03","BUS-04"].includes(screen.id);
  // BUS-13 hiển thị danh sách ở nhánh riêng; isCampaign dùng cho màn tạo/sửa/banner/gửi/chi tiết.
  const isCampaign=["BUS-14","BUS-15","BUS-16","BUS-17"].includes(screen.id);
  // Kiểm tra cả đường dẫn trực tiếp: chỉ hồ sơ APPROVED được mở booking và chiến dịch.
  if(!loading && ["BUS-07","BUS-13","BUS-14","BUS-15","BUS-16","BUS-17"].includes(screen.id) && data.company.application_status!=="APPROVED") return <main className="page-content business-live"><div className="page-heading"><h1>{tr(screen.name)}</h1></div>{error && <p className="form-error" role="alert">{error}</p>}<section className="dashboard-section"><p className="info-note" role="status">{partnershipNotice(data.company.application_status)}</p><div className="form-actions"><Link className="button-link" to="/business/partnership/status">Xem hồ sơ hợp tác</Link><Link className="outline-button" to="/business">Về tổng quan doanh nghiệp</Link></div></section></main>;
  return <main className="page-content business-live"><div className="page-heading"><div><p className="eyebrow">THE PULSE BUSINESS · {screen.id}</p><h1>{tr(screen.name)}</h1><p className="page-subtitle">Hồ sơ, hợp đồng và chiến dịch — mọi thông tin trong một không gian.</p></div><button className="secondary-button" disabled={busy || loading} onClick={()=>action(refresh,"Đã cập nhật dữ liệu mới nhất.")}>Làm mới</button></div>
    {error && <p role="alert" className="form-error">{error}</p>}{message && <p role="status" className="success-message">{message}</p>}
    {loading?<p className="loading-card">Đang tải dữ liệu doanh nghiệp…</p>:<>
    {screen.id==="BUS-01" && <>
      <section className="business-welcome"><div><span className="welcome-kicker">THE PULSE · ĐỐI TÁC QUẢNG CÁO</span><h2>Thương hiệu của bạn.<br/><span>Đúng nơi, đúng thời điểm.</span></h2><p>Quản lý hợp tác và chiến dịch trong một không gian. Theo dõi từng bước, từ đặt vị trí đến hiệu quả quảng cáo.</p><Link className="welcome-cta" to="/business/campaigns/edit">Tạo chiến dịch <UiIcon name="arrow"/></Link></div><div className="welcome-emblem" aria-hidden="true"><span>P<span className="emblem-dot">.</span></span><small>MAKE AN IMPACT</small></div></section>
      <section className="stats-grid business-overview-stats">{[["company","Hợp tác doanh nghiệp",status(data.company.application_status),"Trạng thái hồ sơ hiện tại"],["document","Hợp đồng hiệu lực",activeContracts.length,"Đã thanh toán, còn thời hạn"],["campaign","Chiến dịch đã tạo",data.campaigns.length,"Tất cả trạng thái"],["calendar","Chiến dịch chờ duyệt",data.campaigns.filter(c=>c.status==="PENDING_REVIEW").length,"Đang chờ quản lý xử lý"]].map(([icon,label,value,note])=><article className="stat-card" key={label}><div className="stat-topline"><span>{label}</span><UiIcon name={icon}/></div><strong className={typeof value==="string"?"business-status-heading":""}>{value}</strong><small>{note}</small></article>)}</section>
      <div className="business-dashboard-columns"><section className="dashboard-section"><div className="section-heading"><div><p className="section-kicker">CAMPAIGN WORKSPACE</p><h2>Chiến dịch gần đây</h2></div><Link to="/business/campaigns">Xem tất cả ↗</Link></div><div className="recent-campaigns">{data.campaigns.slice(0,3).map(c=><Link className="recent-campaign" key={c.campaign_id} to={`/business/campaigns/${c.campaign_id}`}><div className="recent-campaign-media">{c.media_url?<img src={c.media_url} alt=""/>:<UiIcon name="campaign"/>}</div><div><strong>{c.campaign_name}</strong><small>{c.contract_code} · {time(c.scheduled_start_time)}</small><Badge value={c.status}/></div><UiIcon name="arrow"/></Link>)}</div>{!data.campaigns.length && <p>Chưa có chiến dịch. Tạo chiến dịch đầu tiên khi hợp đồng đã có hiệu lực.</p>}</section>
      <section className="dashboard-section business-shortcuts"><p className="section-kicker">QUICK ACCESS</p><h2>Bạn muốn làm gì?</h2><div className="business-test-steps">{[["company","Hồ sơ & hợp tác","Thông tin công ty, tài liệu pháp lý","/business/company"],["calendar","Đặt vị trí quảng cáo","Bảng giá và lịch quảng cáo","/business/advertising/calendar"],["campaign","Quản lý chiến dịch","Nội dung banner và trạng thái duyệt","/business/campaigns"],["chart","Theo dõi hiệu quả","Lượt hiển thị, click và báo cáo","/business/performance"]].map(([icon,title,detail,path])=><Link to={path} key={path}><span className="shortcut-icon"><UiIcon name={icon}/></span><span><strong>{title}</strong><small>{detail}</small></span><UiIcon name="arrow"/></Link>)}</div></section></div>
      <p className="business-demo-footnote">Tài khoản business.demo có hợp đồng mẫu đã thanh toán. Để thử đăng ký hợp tác từ đầu, tạo tài khoản Doanh nghiệp mới.</p>
    </>}
    {isProfile && <form className="dashboard-section" onSubmit={e=>{e.preventDefault();action(()=>json("/api/business/company",companyForm,"PUT"),"Đã lưu hồ sơ doanh nghiệp vào MySQL.");}}><h2>Thông tin doanh nghiệp</h2><div className="business-form-grid">{[["name","Tên pháp lý",150],["taxCode","Mã số thuế (10 số hoặc 10 số-3 số)",14],["email","Email liên hệ",254],["phone","Số điện thoại",30],["address","Địa chỉ",500],["billingAddress","Địa chỉ xuất hóa đơn",500]].map(([key,label,max])=><Field key={key} label={label}><input value={companyForm[key]} onChange={e=>setCompanyForm({...companyForm,[key]:e.target.value})} type={key==="email"?"email":"text"} maxLength={max} required disabled={busy || ["PENDING_REVIEW","RESUBMITTED"].includes(data.company.application_status) || (data.company.application_status==="APPROVED" && ["name","taxCode"].includes(key))}/></Field>)}</div><div className="form-actions"><button disabled={busy || ["PENDING_REVIEW","RESUBMITTED"].includes(data.company.application_status)}>Lưu hồ sơ</button><Link className="outline-button" to="/business/partnership/apply">Tiếp tục đăng ký hợp tác →</Link></div></form>}
    {isApplication && <section className="dashboard-section"><h2>Hồ sơ hợp tác</h2><Badge value={data.company.application_status}/><dl className="business-details"><dt>Doanh nghiệp</dt><dd>{data.company.company_name || "Chưa có hồ sơ"}</dd><dt>Mã hồ sơ</dt><dd>{data.company.application_code || "—"}</dd><dt>Thời gian gửi</dt><dd>{time(data.company.submitted_at)}</dd><dt>Phản hồi quản lý</dt><dd>{data.company.review_note || "Chưa có phản hồi"}</dd></dl>
      <h3>Tài liệu pháp lý</h3>{data.documents.length?<ul className="business-document-list">{data.documents.map(doc=><li key={doc.document_id}><a href={`/api/media/document/${doc.document_id}`} target="_blank" rel="noreferrer">{doc.original_file_name} ↗</a><small>Phiên bản {doc.version_no} · {time(doc.uploaded_at)}</small></li>)}</ul>:<p>Chưa tải tài liệu.</p>}
      {!data.company.company_id?<Link className="button-link" to="/business/company">Lưu hồ sơ doanh nghiệp trước →</Link>:editable(data.company.application_status)?<><form onSubmit={e=>{e.preventDefault();const body=new FormData();body.append("file",file);action(()=>apiRequest("/api/business/documents",{method:"POST",body}),"Đã tải tài liệu và lưu thông tin vào MySQL.",()=>setFile(null));}}><Field label="PDF, PNG hoặc JPEG · tối đa 8 MB"><input type="file" accept="application/pdf,image/png,image/jpeg" required disabled={busy} onChange={e=>setFile(e.target.files?.[0] || null)}/></Field><button className="secondary-button" disabled={busy || !file}>Tải tài liệu lên</button></form><button disabled={busy || !data.documents.length} onClick={()=>action(()=>apiRequest("/api/business/application/submit",{method:"POST"}),"Đã gửi hồ sơ chờ quản lý xét duyệt.")}>Gửi đăng ký hợp tác</button></>:<p className="info-note">{data.company.application_status==="APPROVED"?"Doanh nghiệp đã được duyệt, có thể đặt quảng cáo.":"Hồ sơ đã khóa. Chờ quản lý xét duyệt hoặc yêu cầu chỉnh sửa."}</p>}
    </section>}
    {screen.id==="BUS-07" && (() => {
      // Tìm thông tin vị trí và gói đã chọn để tính toán và validate
      const selectedSlotObj = catalog?.slots?.find(s => String(s.id) === String(booking.slotId));
      const selectedPackObj = catalog?.offers?.find(p => String(p.id) === String(booking.packageId));
      
      // Tính số ngày khách chọn trên lịch
      const bookingDays = booking.startDate && booking.endDate
        ? Math.max(0, Math.round((new Date(`${booking.endDate}T12:00:00`) - new Date(`${booking.startDate}T12:00:00`)) / 86400000) + 1)
        : 0;

      // Tính giá dự kiến theo công thức: Giá gói + (Giá vị trí * Số ngày / 30)
      const estimatedPrice = (selectedSlotObj && selectedPackObj && bookingDays > 0)
        ? Number(selectedPackObj.price) + (Number(selectedSlotObj.base_price || selectedSlotObj.basePrice || 0) * bookingDays / 30)
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
        (!selectedPackObj?.durationDays || bookingDays <= Number(selectedPackObj.durationDays)) &&
        !calendarError;

      return (
        <form
          className="dashboard-section"
          onSubmit={e => {
            e.preventDefault();
            const saveDraft = e.nativeEvent.submitter?.value === "draft";
            action(
              () => json(
                saveDraft ? "/api/business/bookings/drafts" : "/api/business/bookings",
                { ...booking, slotId: Number(booking.slotId), packageId: Number(booking.packageId) }
              ),
              saveDraft ? "Đã lưu bản nháp." : "Đã ghi nhận yêu cầu đặt quảng cáo. Chờ quản lý chuẩn bị đề xuất hợp đồng.",
              result => navigate(saveDraft ? `/business/contracts/${result.id}` : "/business/contracts")
            );
          }}
        >
          <div className="section-heading">
            <div>
              <p className="section-kicker">ĐẶT QUẢNG CÁO · BUS-07</p>
              <h2>Yêu cầu đặt quảng cáo</h2>
            </div>
            <Link className="outline-button" to="/business/advertising/calendar">Xem toàn bộ lịch (BUS-06) ↗</Link>
          </div>

          {data.company.application_status !== "APPROVED" && (
            <p className="info-note" role="status">
              Hồ sơ hợp tác chưa được duyệt. Bạn cần được phê duyệt hợp tác trước khi gửi yêu cầu đặt quảng cáo.{" "}
              <Link to="/business/partnership/status">Xem hồ sơ →</Link>
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
                onChange={e => setBooking({ ...booking, name: e.target.value })}
              />
            </Field>

            <Field label="Vị trí quảng cáo">
              <select
                required
                value={booking.slotId}
                onChange={e => {
                  setBooking({ ...booking, slotId: e.target.value, startDate: "", endDate: "" });
                  setCalendarError("");
                }}
              >
                <option value="">-- Chọn vị trí quảng cáo --</option>
                {catalog?.slots?.map(slot => (
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
                onChange={e => {
                  setBooking({ ...booking, packageId: e.target.value, startDate: "", endDate: "" });
                  setCalendarError("");
                }}
              >
                <option value="">-- Chọn gói quảng cáo --</option>
                {catalog?.offers?.map(pack => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name} · {currency(pack.price)} · Thời hạn: {pack.durationDays} ngày
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Ước tính thời lượng & Giá">
              <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}>
                <strong>{bookingDays > 0 ? `${bookingDays} ngày` : "Chưa chọn lịch"}</strong>
                {estimatedPrice > 0 && (
                  <span style={{ color: "#059669", fontWeight: "bold", marginLeft: "8px" }}>
                    · Giá dự kiến: {currency(estimatedPrice)}
                  </span>
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
            onSelectRange={({ startDate, endDate, isValid, errorMessage }) => {
              setBooking(prev => ({ ...prev, startDate, endDate }));
              setCalendarError(errorMessage || "");
            }}
          />

          {/* Đồng bộ 2 ô ngày bắt đầu và kết thúc */}
          <div className="business-form-grid" style={{ marginTop: "12px" }}>
            <Field label="Ngày bắt đầu (từ lịch)">
              <input
                type="date"
                required
                value={booking.startDate}
                onChange={e => {
                  setBooking({ ...booking, startDate: e.target.value });
                  setCalendarError("");
                }}
              />
            </Field>
            <Field label="Ngày kết thúc (từ lịch)">
              <input
                type="date"
                required
                value={booking.endDate}
                onChange={e => {
                  setBooking({ ...booking, endDate: e.target.value });
                  setCalendarError("");
                }}
              />
            </Field>
          </div>

          {/* Thông báo điều kiện hợp lệ */}
          <div style={{ marginBlock: "16px" }}>
            {calendarError ? (
              <div className="form-error" role="alert" style={{ color: "#dc2626", background: "#fee2e2", padding: "12px", borderRadius: "8px", border: "1px solid #fca5a5" }}>
                ⚠️ <strong>Lịch không hợp lệ:</strong> {calendarError}
              </div>
            ) : !isBookingValid ? (
              <p className="info-note">
                ℹ️ <strong>Điều kiện bắt buộc:</strong> Vui lòng nhập Tên yêu cầu, chọn Vị trí, Gói và chọn khoảng ngày trống (màu xanh) trên lịch không bị trùng để kích hoạt <strong>Lưu bản nháp</strong> và <strong>Gửi yêu cầu</strong>.
              </p>
            ) : (
              <p className="info-note" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46" }}>
                ✓ <strong>Mọi điều kiện đều hợp lệ:</strong> Khoảng chạy {bookingDays} ngày phù hợp với gói "{selectedPackObj?.name}". Giá dự kiến: {currency(estimatedPrice)}. Bạn có thể lưu nháp hoặc gửi yêu cầu ngay.
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
              title={!isBookingValid ? "Vui lòng chọn khoảng ngày hợp lệ trên bảng lịch để lưu nháp" : "Lưu bản nháp"}
            >
              Lưu bản nháp
            </button>
            <button
              type="submit"
              value="submit"
              disabled={busy || !isBookingValid || catalog?.demo}
              title={!isBookingValid ? "Vui lòng chọn khoảng ngày hợp lệ trên bảng lịch để gửi yêu cầu" : "Gửi yêu cầu đặt quảng cáo"}
            >
              Gửi yêu cầu đặt quảng cáo
            </button>
            <Link className="outline-button" to="/business/contracts">Xem danh sách hợp đồng</Link>
          </div>
        </form>
      );
    })()}
    {screen.id==="BUS-11" && <section className="dashboard-section"><div className="section-heading"><h2>Hợp đồng và yêu cầu đã gửi</h2><Link className="button-link" to="/business/bookings/new">Yêu cầu đặt quảng cáo</Link></div><div className="business-table-wrap"><table><thead><tr><th>Mã / tên</th><th>Vị trí</th><th>Khoảng chạy</th><th>Giá trị</th><th>Trạng thái</th><th/></tr></thead><tbody>{data.contracts.map(c=><tr key={c.contract_id}><td><strong>{c.contract_code}</strong><br/>{c.contract_name}</td><td>{c.slot_name_snapshot}</td><td>{time(c.start_at)}<br/>{time(c.end_at)} (kết thúc)</td><td>{currency(c.total_value)}</td><td><Badge value={c.status}/><br/>{status(c.payment_status)}</td><td><Link to={`/business/contracts/${c.contract_id}`}>Chi tiết →</Link></td></tr>)}</tbody></table></div>{!data.contracts.length && <p>Chưa có yêu cầu/hợp đồng. Hãy gửi yêu cầu đặt quảng cáo.</p>}</section>}
    {["BUS-08","BUS-09","BUS-10","BUS-12"].includes(screen.id) && <section className="dashboard-section"><h2>Thông tin hợp đồng</h2>{contract?<><Badge value={contract.status}/><dl className="business-details">{[["Mã hợp đồng",contract.contract_code],["Tên",contract.contract_name],["Vị trí",contract.slot_name_snapshot],["Gói",contract.package_name_snapshot],["Giá trị",currency(contract.total_value)],["Thanh toán",status(contract.payment_status)],["Bắt đầu",time(contract.start_at)],["Kết thúc",time(contract.end_at)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{contract.status==="DRAFT"?<><div className="form-actions"><button type="button" className="secondary-button" disabled={busy} onClick={()=>setEditingBooking(true)}>Sửa bản nháp</button><button type="button" className="outline-button" disabled={busy} onClick={()=>setDeleteConfirm(true)}>Xóa bản nháp</button></div>{deleteConfirm && <div role="alert" className="info-note"><p>Xóa bản nháp “{contract.contract_name}”? Thao tác này không thể hoàn tác.</p><div className="form-actions"><button disabled={busy} onClick={()=>action(()=>apiRequest(`/api/business/bookings/${contract.contract_id}`,{method:"DELETE"}),"Đã xóa bản nháp.",()=>navigate("/business/contracts"))}>Xác nhận xóa</button><button className="outline-button" disabled={busy} onClick={()=>setDeleteConfirm(false)}>Giữ bản nháp</button></div></div>}{editingBooking && <form onSubmit={e=>{e.preventDefault();action(()=>json(`/api/business/bookings/${contract.contract_id}`,{...booking,slotId:Number(booking.slotId),packageId:Number(booking.packageId)},"PUT"),"Đã lưu bản nháp.",()=>setEditingBooking(false));}}><div className="business-form-grid"><Field label="Tên yêu cầu"><input required maxLength={200} value={booking.name} onChange={e=>setBooking({...booking,name:e.target.value})}/></Field><Field label="Vị trí"><select required value={booking.slotId} onChange={e=>setBooking({...booking,slotId:e.target.value})}>{catalog?.slots.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label="Gói quảng cáo"><select required value={booking.packageId} onChange={e=>setBooking({...booking,packageId:e.target.value})}>{catalog?.offers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>{[["startDate","Ngày bắt đầu"],["endDate","Ngày kết thúc (bao gồm)"]].map(([key,label])=><Field key={key} label={label}><input required type="date" value={booking[key]} onChange={e=>setBooking({...booking,[key]:e.target.value})}/></Field>)}</div><p className="info-note">Giá trị được tính lại khi lưu. Lưu bản nháp chưa gửi yêu cầu.</p><div className="form-actions"><button disabled={busy}>Lưu bản nháp</button><button type="button" className="outline-button" disabled={busy} onClick={()=>setEditingBooking(false)}>Đóng chỉnh sửa</button></div></form>}<p className="info-note">Bản nháp chưa được gửi. Gửi yêu cầu để quản lý xét duyệt và chuẩn bị đề xuất hợp đồng. Thao tác này chưa giữ chỗ hoặc thanh toán.</p><button disabled={busy || editingBooking || data.company.application_status!=="APPROVED"} onClick={()=>action(()=>apiRequest(`/api/business/bookings/${contract.contract_id}/submit`,{method:"POST"}),"Đã gửi yêu cầu đặt quảng cáo. Chờ quản lý xét duyệt và chuẩn bị đề xuất hợp đồng.")}>{busy?"Đang gửi…":"Gửi yêu cầu đặt quảng cáo"}</button>{data.company.application_status!=="APPROVED" && <p className="info-note">Doanh nghiệp cần được duyệt hợp tác trước khi gửi yêu cầu.</p>}</>:contract.status==="PENDING_REVIEW"?<p role="status" className="info-note">Yêu cầu đã gửi, đang chờ quản lý xét duyệt và chuẩn bị đề xuất hợp đồng. Chưa giữ chỗ hoặc thanh toán.</p>:contract.status==="ACTIVE" && contract.payment_status==="PAID"?<Link className="button-link" to="/business/campaigns/edit">Tạo chiến dịch →</Link>:<p className="info-note">Yêu cầu đã lưu thật. Quản lý chuẩn bị đề xuất, thương lượng và thanh toán chưa được nối API; chưa thể kích hoạt hợp đồng này. Không có hóa đơn giả.</p>}</>:<p>Chọn một hợp đồng từ <Link to="/business/contracts">danh sách hợp đồng</Link>.</p>}</section>}
    {screen.id==="BUS-13" && <section className="dashboard-section"><div className="section-heading"><h2>Chiến dịch của doanh nghiệp</h2><Link className="button-link" to="/business/campaigns/edit">Tạo chiến dịch</Link></div><div className="business-campaign-grid">{data.campaigns.map(c=><article key={c.campaign_id}>{c.media_url && <img src={c.media_url} alt={c.campaign_name}/>}<h3>{c.campaign_name}</h3><p>{c.contract_code}</p><Badge value={c.status}/><p>{time(c.scheduled_start_time)} → {time(c.scheduled_end_time)}</p><div className="record-actions"><Link to={`/business/campaigns/${c.campaign_id}`}>Chi tiết</Link>{editable(c.status) && <Link to={`/business/campaigns/edit/${c.campaign_id}`}>Chỉnh sửa</Link>}<Link to={`/business/performance/${c.campaign_id}`}>Báo cáo</Link></div></article>)}</div>{!data.campaigns.length && <p>Chưa có chiến dịch.</p>}</section>}
    {screen.id==="BUS-14" && <form className="dashboard-section" onSubmit={e=>{e.preventDefault();action(()=>json(`/api/business/campaigns${params.campaignId?`/${params.campaignId}`:""}`,{...campaignForm,contractId:Number(campaignForm.contractId)},params.campaignId?"PUT":"POST"),"Đã lưu chiến dịch nháp vào MySQL.",result=>navigate(`/business/campaigns/${result.id}/creative`));}}><h2>Thông tin chiến dịch</h2>{!activeContracts.length && <p className="info-note">Chưa có hợp đồng đã thanh toán còn hiệu lực. business.demo có sẵn hợp đồng mẫu để test.</p>}<div className="business-form-grid"><Field label="Hợp đồng đã thanh toán"><select required disabled={busy || Boolean(params.campaignId)} value={campaignForm.contractId} onChange={e=>{const ct=activeContracts.find(c=>String(c.contract_id)===e.target.value);setCampaignForm({...campaignForm,contractId:e.target.value,startTime:datetime(ct?.start_at),endTime:datetime(ct?.end_at)});}}><option value="">Chọn hợp đồng</option>{activeContracts.map(c=><option key={c.contract_id} value={c.contract_id}>{c.contract_code} · {c.slot_name_snapshot}</option>)}</select></Field><Field label="Tên chiến dịch"><input required maxLength={150} value={campaignForm.name} onChange={e=>setCampaignForm({...campaignForm,name:e.target.value})}/></Field>{[["startTime","Bắt đầu"],["endTime","Kết thúc"]].map(([key,label])=><Field key={key} label={label}><input required type="datetime-local" value={campaignForm[key]} onChange={e=>setCampaignForm({...campaignForm,[key]:e.target.value})}/></Field>)}<Field label="Mô tả"><textarea maxLength={2000} rows={4} value={campaignForm.description} onChange={e=>setCampaignForm({...campaignForm,description:e.target.value})}/></Field></div><button disabled={busy || !activeContracts.length || (params.campaignId && (!current || !editable(current.status)))}>Lưu nháp và tiếp tục</button></form>}
    {isCampaign && screen.id!=="BUS-14" && <section className="dashboard-section">{!current?<p>Không tìm thấy chiến dịch của doanh nghiệp này.</p>:<><h2>{current.campaign_name}</h2><Badge value={current.status}/><p>{current.contract_code} · {time(current.scheduled_start_time)} → {time(current.scheduled_end_time)}</p><p>{current.description}</p>{current.media_url && <img className="business-creative-preview" src={current.media_url} alt="Banner hiện tại"/>}<p>Banner: {status(current.creative_status)}</p>
      {screen.id==="BUS-15" && editable(current.status) && <form onSubmit={e=>{e.preventDefault();const body=new FormData();body.append("file",file);body.append("targetUrl",targetUrl);action(()=>apiRequest(`/api/business/campaigns/${current.campaign_id}/creative`,{method:"POST",body}),"Đã lưu phiên bản banner mới vào MySQL và kho tệp local.");}}><Field label={`Banner PNG/JPEG ${current.width_px} × ${current.height_px} px · tối đa 8 MB`}><input type="file" accept="image/png,image/jpeg" required disabled={busy} onChange={e=>setFile(e.target.files?.[0] || null)}/></Field><Field label="URL đích (http/https)"><input type="url" value={targetUrl} required maxLength={1000} onChange={e=>setTargetUrl(e.target.value)}/></Field><button disabled={busy || !file}>Tải và lưu banner</button><p className="info-note">Nhắm đối tượng theo chuyên mục, thẻ, địa lý và video chưa nối API; banner mới chưa tự được duyệt/phân phối.</p></form>}
      <div className="form-actions">{editable(current.status)?<><Link className="outline-button" to={`/business/campaigns/edit/${current.campaign_id}`}>Sửa thông tin</Link><Link className="outline-button" to={`/business/campaigns/${current.campaign_id}/creative`}>Banner</Link>{screen.id!=="BUS-16" && <Link className="button-link" to={`/business/campaigns/${current.campaign_id}/submit`}>Kiểm tra và gửi duyệt →</Link>}{screen.id==="BUS-16" && <button disabled={busy || current.creative_status!=="DRAFT"} onClick={()=>action(()=>apiRequest(`/api/business/campaigns/${current.campaign_id}/submit`,{method:"POST"}),"Đã gửi chiến dịch và đúng phiên bản banner để xét duyệt.",()=>navigate(`/business/campaigns/${current.campaign_id}`))}>Gửi chiến dịch và banner để duyệt</button>}</>:<p className="info-note">Bản đã gửi/đã duyệt bị khóa sửa. Việc xét duyệt, lên lịch và yêu cầu đổi quảng cáo sẽ được nối ở đợt tiếp theo.</p>}<Link className="outline-button" to="/business/campaigns">Danh sách chiến dịch</Link></div>
    </>}</section>}
    </>}
  </main>;
}
