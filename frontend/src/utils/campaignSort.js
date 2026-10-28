const collator=new Intl.Collator("vi",{sensitivity:"base",numeric:true});
const timestamp=value=>{
  if(!value)return null;
  const result=new Date(String(value).replace(" ","T")).getTime();
  return Number.isFinite(result)?result:null;
};

/** BUS-13 sắp xếp bản sao sau khi lọc, trước phân trang; ngày thiếu luôn xuống cuối, ID giữ thứ tự ổn định. */
export function sortCampaigns(campaigns,order="CREATED_DESC") {
  return [...campaigns].sort((a,b)=>{
    let compared=0;
    if(order==="NAME_ASC" || order==="NAME_DESC") {
      compared=collator.compare(a.campaign_name || "",b.campaign_name || "")*(order==="NAME_DESC"?-1:1);
    } else {
      const field=order.startsWith("START_")?"scheduled_start_time":"created_at";
      const left=timestamp(a[field]),right=timestamp(b[field]);
      if(left===null && right!==null)return 1;
      if(right===null && left!==null)return -1;
      compared=left===null?0:(left-right)*(order.endsWith("DESC")?-1:1);
    }
    return compared || Number(b.campaign_id)-Number(a.campaign_id);
  });
}
