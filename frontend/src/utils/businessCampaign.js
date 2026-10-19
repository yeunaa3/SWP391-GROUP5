// Các hàm thuần dùng chung cho form, preview, bộ lọc và kiểm thử; không gọi API/ghi DB.
export const campaignLabels={DRAFT:"Bản nháp",PENDING_REVIEW:"Chờ duyệt",NEEDS_REVISION:"Cần chỉnh sửa",APPROVED:"Đã duyệt",SCHEDULED:"Đã lên lịch",ACTIVE:"Đang chạy",PAUSED:"Tạm dừng",COMPLETED:"Kết thúc",REJECTED:"Bị từ chối",CANCELLED:"Đã lưu trữ"};
export const editableCampaign=status=>["DRAFT","NEEDS_REVISION"].includes(status);
export const money=value=>Number(value||0).toLocaleString("vi-VN")+" ₫";
export const dateInput=value=>value?String(value).replace(" ","T").slice(0,16):"";
/** Ô datetime-local theo phút: làm tròn đầu hợp đồng lên để không sớm hơn timestamp có giây. */
export function startInput(value){if(!value)return "";const input=String(value).replace(" ","T");const d=new Date(input);if(d.getSeconds()||d.getMilliseconds()){d.setMinutes(d.getMinutes()+1);d.setSeconds(0,0);}return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;}
export const dateLabel=value=>value?String(value).replace("T"," ").slice(0,19):"—";

/** Một status DB được trình bày thành hai ý nghĩa: đã duyệt chưa và có đang phân phối không. */
export function campaignStatuses(status){
  return {review:["ACTIVE","PAUSED","SCHEDULED","COMPLETED","APPROVED"].includes(status)?"APPROVED":status,
    delivery:["ACTIVE","PAUSED","SCHEDULED","COMPLETED"].includes(status)?status:"NOT_RUNNING"};
}

/** Tạo URL UTM bằng URLSearchParams.set để không lặp tham số và luôn giữ query/hash cũ. */
export function withUtm(value,source,medium,campaign){
  const url=new URL(value);if(!["http:","https:"].includes(url.protocol)||url.username||url.password)throw new Error("URL phải là HTTP/HTTPS hợp lệ.");
  for(const [key,val] of Object.entries({utm_source:source,utm_medium:medium,utm_campaign:campaign}))if(val.trim())url.searchParams.set(key,val.trim());
  if(url.toString().length>1000)throw new Error("URL vượt 1000 ký tự.");return url.toString();
}
