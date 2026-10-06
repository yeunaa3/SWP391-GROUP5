import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext.jsx";
import { apiRequest } from "../services/apiClient.js";

export default function AdvertisingRecords() {
  const { user } = useAuth();
  const business = user?.roles?.includes("BUSINESS");
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { apiRequest("/api/advertising/campaign-data").then(setRecords).catch(e => setError(e.message)); }, []);
  return <section className="dashboard-section advertising-records"><h2>Chiến dịch từ MySQL</h2>
    <p>Ba chiến dịch thử nghiệm của Pulse Partners. Số lượt xem và click dưới đây là dữ liệu mẫu để thử báo cáo.</p>
    {error && <p role="alert">{error}</p>}
    <div className="campaign-data-grid">{records.map(record => <article key={record.id}>
      <img src={record.mediaUrl} alt={record.name} /><h3>{record.name}</h3><p>{record.contractCode} · {record.slotName}</p>
      <span className="status-pill">{record.status}</span><dl><dt>Impressions mẫu</dt><dd>{Number(record.impressions).toLocaleString("vi-VN")}</dd>
        <dt>Clicks mẫu</dt><dd>{Number(record.clicks).toLocaleString("vi-VN")}</dd><dt>CTR mẫu</dt><dd>{record.impressions ? (record.clicks / record.impressions * 100).toFixed(2) : "0"}%</dd></dl>
      <div className="record-actions">{business ? <><Link to={`/business/campaigns/${record.id}`}>Chi tiết →</Link><Link to={`/business/campaigns/${record.id}/creative`}>Banner & nhắm mục tiêu</Link><Link to={`/business/performance/${record.id}`}>Xem báo cáo</Link></> : <><Link to={`/ad-manager/campaigns/${record.id}/review`}>Xem chiến dịch →</Link><Link to="/ad-manager/reports">Báo cáo quảng cáo</Link></>}</div>
    </article>)}</div>{!records.length && !error && <p>Chưa có chiến dịch phù hợp với tài khoản này.</p>}</section>;
}
