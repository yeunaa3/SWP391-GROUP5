/** BUS-14 chuẩn hóa dữ liệu nháp; có thể thiếu URL/banner nhưng hợp đồng và lịch phải hợp lệ. Backend kiểm lại độc lập. */
export function prepareCampaignDraft(form, contract, now = new Date()) {
  const name=String(form.name || "").trim();
  if(!name || name.length>150) throw new Error("Tên chiến dịch phải có từ 1 đến 150 ký tự.");
  const contractId=Number(form.contractId);
  if(!Number.isSafeInteger(contractId) || contractId<=0 || !contract || Number(contract.contract_id)!==contractId)
    throw new Error("Vui lòng chọn hợp đồng của doanh nghiệp.");
  if(contract.status!=="ACTIVE" || contract.payment_status!=="PAID")
    throw new Error("Chỉ được sử dụng hợp đồng đang hiệu lực và đã thanh toán.");
  const start=new Date(form.startTime),end=new Date(form.endTime);
  const contractStart=new Date(contract.start_at),contractEnd=new Date(contract.end_at);
  if(!form.startTime || !form.endTime || [start,end,contractStart,contractEnd].some(d=>!Number.isFinite(d.getTime())))
    throw new Error("Vui lòng nhập đầy đủ lịch bắt đầu và kết thúc hợp lệ.");
  if(end<=start) throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu.");
  if(start<contractStart || end>contractEnd) throw new Error("Lịch chiến dịch phải nằm trong thời hạn hợp đồng đã chọn.");
  if(end<=now) throw new Error("Lịch chiến dịch đã hết hạn. Hãy chọn lịch kết thúc trong tương lai.");
  const targetUrl=String(form.targetUrl || "").trim();
  if(targetUrl) {
    let url;try {url=new URL(targetUrl);} catch {throw new Error("URL đích phải là địa chỉ HTTP/HTTPS hợp lệ.");}
    if(!["http:","https:"].includes(url.protocol) || url.username || url.password || targetUrl.length>1000)
      throw new Error("URL đích phải là HTTP/HTTPS, không chứa thông tin đăng nhập và tối đa 1000 ký tự.");
  }
  const description=String(form.description || "").trim();
  if(description.length>2000) throw new Error("Mô tả tối đa 2000 ký tự.");
  return {...form,name,description,targetUrl,contractId};
}
