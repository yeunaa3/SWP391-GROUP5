import {useEffect,useRef,useState} from "react";
import {apiRequest} from "../services/apiClient.js";
import {isoDay,addDays,dayCount,occupiedDay,validateRange,freeRanges} from "../utils/bookingCalendar.js";

/** BUS-07: kiểm tra cả ngày nhập tay và ngày chọn; lỗi tải khóa xác nhận lịch. */
export default function SlotBookingCalendar({slotId,packageId,slots=[],packages=[],startDate="",endDate="",onSelectRange}){
  const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const [windows,setWindows]=useState([]),[state,setState]=useState("loading"),[error,setError]=useState(""),[retry,setRetry]=useState(0),[cutoff,setCutoff]=useState("");
  const callback=useRef(onSelectRange);callback.current=onSelectRange;
  const slot=slots.find(s=>String(s.id)===String(slotId)),pack=packages.find(p=>String(p.id)===String(packageId));
  const duration=Number(pack?.durationDays||0),today=isoDay(new Date());
  useEffect(()=>{const controller=new AbortController();setState("loading");setError("");
    apiRequest("/api/advertising/availability",{signal:controller.signal}).then(rows=>{setWindows(rows);setState("ready");setCutoff(new Date().toLocaleString("vi-VN"));}).catch(e=>{if(e.name!=="AbortError"){setError(e.message);setState("error");}});
    return()=>controller.abort();
  },[retry]);
  const validation=validateRange({start:startDate,end:endDate,slot:slotId,duration,windows,ready:state==="ready"});
  // Không phụ thuộc identity callback của cha để tránh vòng lặp render/setState.
  useEffect(()=>{callback.current?.({startDate,endDate,isValid:!validation,errorMessage:validation});},[startDate,endDate,slotId,packageId,validation]);
  /** Kiểm tra ngay cả khi chọn lại đúng khoảng cũ; không chờ effect vì dependency có thể không đổi. */
  function select(start,end){
    const message=validateRange({start,end,slot:slotId,duration,windows,ready:state==="ready"});
    callback.current?.({startDate:start,endDate:end,isValid:!message,errorMessage:message});
  }
  /** Chọn đầu khoảng; có gói thì thử gợi ý đủ thời hạn, nếu vướng lịch cho chọn cuối thủ công. */
  function choose(day){if(!startDate||endDate||day<startDate){const end=duration?addDays(day,duration-1):"";select(day,end&&!validateRange({start:day,end,slot:slotId,duration,windows,ready:state==="ready"})?end:"");}else select(startDate,day);}
  if(!slotId||!packageId)return <p className="info-note">Chọn vị trí và gói để kiểm tra lịch khả dụng.</p>;
  const offset=(month.getDay()+6)%7,count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const suggestions=state==="ready"&&validation?freeRanges(windows,slotId,duration,startDate&&startDate>=today?startDate:today):[];
  return <section className="dashboard-section"><h3>Lịch khả dụng · {slot?.name}</h3><p>Gói {pack?.name} · tối đa {duration} ngày. Ngày kết thúc được bao gồm.</p>
    <div className="calendar-month"><button type="button" className="secondary-button" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>← Tháng trước</button><strong>{month.toLocaleDateString("vi-VN",{month:"long",year:"numeric"})}</strong><button type="button" className="secondary-button" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>Tháng sau →</button></div>
    {state==="loading"?<p role="status">Đang kiểm tra lịch…</p>:state==="error"?<div role="alert" className="form-error">Không tải được lịch: {error}. Chưa thể xác nhận còn trống. <button type="button" onClick={()=>setRetry(x=>x+1)}>Thử lại</button></div>:<><div className="slot-calendar">{["T2","T3","T4","T5","T6","T7","CN"].map(x=><strong key={x}>{x}</strong>)}{Array.from({length:offset},(_,i)=><span key={`blank${i}`}/>)}{Array.from({length:count},(_,i)=>{const day=isoDay(new Date(month.getFullYear(),month.getMonth(),i+1)),past=day<today,busy=occupiedDay(windows,slotId,day),chosen=startDate&&day>=startDate&&day<=(endDate||startDate);return <button type="button" key={day} disabled={past||busy} className={chosen?"selected":past?"past":busy?"occupied":"available"} aria-label={`${day} ${busy?"Đã đặt":"Trống"}`} onClick={()=>choose(day)}><span>{i+1}</span><small>{past?"Đã qua":busy?"Đã đặt":"Trống"}</small></button>;})}</div><small>Cập nhật {cutoff} · lịch hợp đồng. Trống (xanh), đã đặt/giữ chỗ (đỏ), đã qua (xám).</small></>}
    {validation?<p className="info-note" role="status">{validation}</p>:<p className="success-message">Lịch vừa kiểm tra: {dayCount(startDate,endDate)} ngày không xung đột.</p>}
    {!!suggestions.length&&<div><h4>Gợi ý khoảng trống cùng gói</h4>{suggestions.map(s=><button key={s.start} type="button" className="secondary-button" onClick={()=>select(s.start,s.end)}>{s.start} → {s.end}</button>)}</div>}
    <small>Lịch chỉ tham khảo, chưa giữ chỗ. Server luôn kiểm tra lại khi lưu/gửi.</small>
  </section>;
}
