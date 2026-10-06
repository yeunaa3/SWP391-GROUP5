import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdvertisingCatalog } from "../../services/contentService.js";
import { apiRequest } from "../../services/apiClient.js";

const iso = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export default function SlotCalendarPage() {
  const [slots,setSlots] = useState([]); const [windows,setWindows] = useState([]);
  const [slot,setSlot] = useState(""); const [month,setMonth] = useState(() => new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const [start,setStart] = useState(""); const [end,setEnd] = useState("");
  const [state,setState] = useState("loading"); const [error,setError] = useState("");
  useEffect(() => { let alive=true;
    Promise.all([getAdvertisingCatalog(),apiRequest("/api/advertising/availability")]).then(([catalog,reserved]) => { if(alive) { setSlots(catalog.slots); setSlot(String(catalog.slots[0]?.id || "")); setWindows(reserved); setState("ready"); } }).catch(e => { if(alive) { setError(e.message); setState("error"); } });
    return () => { alive=false; };
  },[]);
  const occupied = day => windows.some(item => String(item.slotId)===slot && day >= String(item.startAt).slice(0,10) && day <= String(item.endAt).slice(0,10));
  const today=iso(new Date());
  function choose(day) {
    if(!start || end || day<start) { setStart(day); setEnd(""); return; }
    const cursor=new Date(`${start}T12:00:00`);
    while(iso(cursor)<=day) { if(occupied(iso(cursor))) { setError("Khoảng chọn đi qua ngày đã được đặt. Hãy chọn khoảng trống khác."); return; } cursor.setDate(cursor.getDate()+1); }
    setError(""); setEnd(day);
  }
  const offset=(month.getDay()+6)%7; const count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const chosenSlot=slots.find(item => String(item.id)===slot);
  const duration=start && end ? Math.round((new Date(`${end}T12:00:00`)-new Date(`${start}T12:00:00`))/86400000)+1 : 0;
  return <main className="page-content"><div className="page-heading"><div><p className="eyebrow">ĐẶT QUẢNG CÁO</p><h1>Lịch vị trí quảng cáo</h1><p className="page-subtitle">Chọn vị trí, ngày bắt đầu và ngày kết thúc để tiếp tục đặt chỗ.</p></div><Link className="outline-button" to="/business/advertising/prices">Xem báo giá</Link></div>
    {state==="loading" ? <p className="loading-card">Đang tải lịch từ MySQL…</p> : <div className="calendar-layout"><section className="dashboard-section"><label className="calendar-slot">Vị trí quảng cáo<select value={slot} onChange={e=>{setSlot(e.target.value);setStart("");setEnd("");setError("");}}>{slots.map(item=><option key={item.id} value={item.id}>{item.name} · {item.width} × {item.height}</option>)}</select></label>
      <div className="calendar-month"><button className="secondary-button" aria-label="Tháng trước" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>←</button><h2>{month.toLocaleDateString("vi-VN",{month:"long",year:"numeric"})}</h2><button className="secondary-button" aria-label="Tháng sau" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>→</button></div>
      <div className="slot-calendar" aria-label="Lịch khả dụng">{["T2","T3","T4","T5","T6","T7","CN"].map(day=><strong key={day}>{day}</strong>)}{Array.from({length:offset},(_,i)=><span key={`blank-${i}`}/>)}{Array.from({length:count},(_,i)=>{const day=iso(new Date(month.getFullYear(),month.getMonth(),i+1));const busy=occupied(day);const past=day<today;const selected=start && day>=start && day<=(end || start); return <button key={day} disabled={busy||past||state!=="ready"} className={`${busy ? "occupied" : ""} ${selected ? "selected" : ""} ${day===today ? "today" : ""}`} aria-label={`${day} · ${busy ? "Đã đặt" : past ? "Đã qua" : "Trống"}`} aria-pressed={Boolean(selected)} onClick={()=>choose(day)}>{i+1}<small>{busy ? "Đã đặt" : past ? "—" : "Trống"}</small></button>;})}</div>
      <div className="calendar-legend"><span>● Trống</span><span>● Đã đặt</span><span>● Đang chọn</span></div></section>
      <aside className="dashboard-section calendar-selection"><p className="eyebrow">KHOẢNG CHẠY QUẢNG CÁO</p><h2>{chosenSlot?.name || "Chọn vị trí"}</h2><p>Bấm ngày bắt đầu, sau đó bấm ngày kết thúc. Bấm lại để chọn khoảng mới.</p><dl><dt>Bắt đầu</dt><dd>{start || "Chưa chọn"}</dd><dt>Kết thúc</dt><dd>{end || "Chưa chọn"}</dd><dt>Thời lượng</dt><dd>{duration ? `${duration} ngày` : "—"}</dd></dl>{error && <p role="alert" className="form-error">{error}</p>}{duration && state==="ready" ? <Link className="button-link" to={`/business/bookings/new?slotId=${slot}&startDate=${start}&endDate=${end}`}>Tiếp tục đặt chỗ →</Link> : <p className="info-note">Chọn đủ khoảng ngày trống để tiếp tục.</p>}<small>Lịch dựa trên hợp đồng Active đã thanh toán. Đây là thông tin tham khảo, chưa giữ chỗ; khi gửi yêu cầu cần kiểm tra lại trên server.</small></aside></div>}
  </main>;
}
