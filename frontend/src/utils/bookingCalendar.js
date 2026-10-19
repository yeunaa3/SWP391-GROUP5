/** Lịch dùng ngày YYYY-MM-DD; endAt từ DB là đầu khoảng không bao gồm. */
export const isoDay=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export function addDays(day,count){const d=new Date(`${day}T12:00:00`);d.setDate(d.getDate()+count);return isoDay(d);}
export const dayCount=(start,end)=>Math.round((new Date(`${end}T12:00:00`)-new Date(`${start}T12:00:00`))/86400000)+1;
/** Hai khoảng [a,b) giao nhau khi a<d và b>c; kết thúc 00:00 không chiếm ngày mới. */
export function occupiedDay(windows,slot,day){return windows.some(w=>String(w.slotId)===String(slot)&&String(w.startAt).replace(" ","T")<`${addDays(day,1)}T00:00:00`&&String(w.endAt).replace(" ","T")>`${day}T00:00:00`);}
/** Dùng cho cả chọn lịch và nhập tay; chỉ xác nhận khi availability tải thành công. */
export function validateRange({start,end,slot,duration,windows,ready,today=isoDay(new Date())}){
  if(!ready)return "Chưa kiểm tra được lịch. Vui lòng tải lại.";
  if(!slot||!start||!end)return "Chọn đủ vị trí và khoảng ngày.";
  if(start<today)return "Ngày bắt đầu không được ở quá khứ.";
  if(end<start)return "Ngày kết thúc phải từ ngày bắt đầu trở đi.";
  if(start>addDays(today,365))return "Ngày bắt đầu tối đa trong 365 ngày tới.";
  const count=dayCount(start,end);
  if(!Number.isFinite(count)||count>365||(duration>0&&count>duration))return "Số ngày vượt thời hạn cho phép của gói.";
  for(let i=0;i<count;i++)if(occupiedDay(windows,slot,addDays(start,i)))return "Khoảng ngày đi qua lịch đã đặt hoặc đang giữ chỗ.";
  return "";
}
/** Tìm ba khoảng trống bằng lịch vừa tải; chỉ gợi ý, không giữ chỗ. */
export function freeRanges(windows,slot,duration,from=isoDay(new Date())){
  const result=[],days=Math.max(1,Math.min(Number(duration)||1,365));
  for(let offset=0;offset<365&&result.length<3;offset++){
    const start=addDays(from,offset),end=addDays(start,days-1);
    if(!validateRange({start,end,slot,duration:days,windows,ready:true,today:isoDay(new Date())})){result.push({start,end});offset+=days-1;}
  }
  return result;
}
