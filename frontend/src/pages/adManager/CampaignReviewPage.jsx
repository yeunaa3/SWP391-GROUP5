import CampaignQueueToolbar from "../../components/adManager/CampaignQueueToolbar.jsx";
import CampaignSubmissionReview from "./CampaignSubmissionReview.jsx";
import { reviewQueuePage } from "../../utils/campaignReview.js";
import {useEffect,useState} from "react";
import {Link,useParams} from "react-router-dom";
import {apiRequest} from "../../services/apiClient.js";
import {dateLabel} from "../../utils/businessCampaign.js";
import "../../assets/business-campaign.css";

/** BF-07 nhận bàn giao BF-06: hiển thị snapshot bất biến và quyết định gắn đúng submissionId. */
export default function CampaignReviewPage(){
  const {campaignId}=useParams();const [rows,setRows]=useState([]),[error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [query, setQuery] = useState(""), [order, setOrder] = useState("oldest");
  const queueRows = reviewQueuePage(rows, { query, order, size: Math.max(rows.length, 1) }).items;
  function load(){setLoading(true);setError("");return apiRequest("/api/ad-manager/campaign-submissions").then(setRows).catch(e=>setError(e.message)).finally(()=>setLoading(false));}
  useEffect(()=>{load();},[campaignId]);
  const row=rows.find(r=>String(r.campaign_id)===campaignId);
  /** Giữ hồ sơ tại chỗ để hiển thị kết quả; server khóa submission và kiểm tra lại điều kiện. */
  async function decide(payload){setBusy(true);try{await apiRequest(`/api/ad-manager/campaign-submissions/${campaignId}/decision`,{method:"POST",body:JSON.stringify(payload)});}finally{setBusy(false);}}
  return <main className={`page-content campaign-workspace${campaignId?" campaign-submission-review":""}`}>
    {campaignId&&<Link className="csr-breadcrumb" to="/ad-manager/campaigns">← Chiến dịch chờ xét duyệt</Link>}
    <div className="page-heading"><div><h1>{campaignId?"Xét duyệt chiến dịch":"Chiến dịch chờ xét duyệt"}</h1>{campaignId&&<p className="csr-page-description">Kiểm tra phiên bản đã nộp và phản hồi cho doanh nghiệp.</p>}</div><button className="secondary-button" disabled={loading||busy} onClick={load}>Tải lại</button></div>
    {error&&<p role="alert" className="form-error">{error}</p>}
    {loading?<p role="status">Đang tải…</p>:campaignId?error?<section className="csr-card csr-state"><h2>Chưa tải được hồ sơ xét duyệt</h2><p>Hãy tải lại để kiểm tra trạng thái mới nhất của chiến dịch.</p><button className="secondary-button" onClick={load}>Thử lại</button></section>:!row?<section className="csr-card csr-state"><h2>Không còn phiên bản chờ xét duyệt</h2><p>Chiến dịch có thể đã được xử lý bởi quản lý khác. Hãy quay lại danh sách để chọn hồ sơ tiếp theo.</p><Link to="/ad-manager/campaigns">Về danh sách chờ duyệt →</Link></section>:<CampaignSubmissionReview key={row.submission_id} row={row} busy={busy} onDecide={decide} onReload={load}/>
      :<section className="dashboard-section"><CampaignQueueToolbar query={query} onQueryChange={setQuery} order={order} onOrderChange={setOrder} /><p>{queueRows.length} phiên bản đang chờ.</p>{queueRows.map(r=><article className="campaign-version" key={r.submission_id}><h2>{r.snapshot.campaign.campaign_name}</h2><p>{r.company_name} · {r.campaign_code} · v{r.version_no} · {dateLabel(r.submitted_at)}</p><Link className="button-link" to={`/ad-manager/campaigns/${r.campaign_id}/review`}>Xem đúng phiên bản đã nộp</Link></article>)}</section>}</main>;
}
