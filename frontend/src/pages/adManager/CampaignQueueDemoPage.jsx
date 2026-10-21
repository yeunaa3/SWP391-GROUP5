import CampaignQueueToolbar from "../../components/adManager/CampaignQueueToolbar.jsx";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import ModalShell from "../../components/ModalShell.jsx";
import { reviewQueuePage } from "../../utils/campaignReview.js";
import "../../assets/business-campaign.css";

const PAGE_SIZE = 5;
const names = ["Sách và tri thức", "Không gian xanh", "Ẩm thực cuối tuần", "Du lịch bền vững"];
const companies = ["Công ty Minh Họa", "Thương hiệu Demo", "Doanh nghiệp Mẫu"];

function sampleQueue() {
  return Array.from({ length: 12 }, (_, index) => ({
    submission_id: index + 1,
    campaign_id: index + 1,
    campaign_code: `DEMO-CMP-${String(index + 1).padStart(3, "0")}`,
    company_name: companies[index % companies.length],
    version_no: index % 3 === 0 ? 2 : 1,
    submitted_at: new Date(Date.UTC(2026, 9, 20, 1, index * 20)).toISOString(),
    snapshot: {
      campaign: {
        campaign_name: `${names[index % names.length]} — ${index + 1}`,
      },
    },
  }));
}

export default function CampaignQueueDemoPage() {
  const [scenario, setScenario] = useState("queue");
  const [rows, setRows] = useState(sampleQueue);
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState("oldest");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
  const close = useCallback(() => setSelected(null), []);

  const result = reviewQueuePage(scenario === "empty" ? [] : rows, {
    query, order, page, size: PAGE_SIZE,
  });

  function chooseScenario(value) {
    setScenario(value);
    setQuery("");
    setPage(0);
    setSelected(null);
    setFeedback("");
  }

  function reset() {
    setRows(sampleQueue());
    setOrder("oldest");
    chooseScenario("queue");
  }

  function simulateProcessed() {
    setRows(items => items.filter(item => item.submission_id !== selected.submission_id));
    setFeedback(`Demo: ${selected.campaign_code} đã rời hàng chờ sau khi được xử lý. Không có dữ liệu thật bị thay đổi.`);
    setSelected(null);
  }

  return (
    <main className="page-content campaign-workspace" style={{ maxWidth: 1200, margin: "32px auto" }}>
      <header className="page-heading">
        <div>
          <p className="eyebrow">DEMO LOCAL · ADM-07 · UC-28</p>
          <h1>Chiến dịch chờ xét duyệt</h1>
          <p>Dữ liệu hư cấu để thử giao diện hàng chờ. Demo không gọi API campaign hoặc ghi dữ liệu thật.</p>
        </div>
        <Link to="/">Trang chủ</Link>
      </header>

      <section className="dashboard-section">
        <h2>Chọn tình huống</h2>
        <div className="article-actions" role="group" aria-label="Tình huống hàng chờ" style={{ flexWrap: "wrap" }}>
          {[["queue", "Có chiến dịch chờ"], ["empty", "Hàng chờ trống"], ["error", "Lỗi tải dữ liệu"]].map(([value, label]) => (
            <button key={value} aria-pressed={scenario === value} onClick={() => chooseScenario(value)}>{label}</button>
          ))}
          <button className="secondary-button" onClick={reset}>Khôi phục dữ liệu mẫu</button>
        </div>
      </section>

      {feedback && <p role="status" className="info-note">{feedback}</p>}
      {scenario === "error" ? (
        <section className="dashboard-section">
          <p role="alert">Giả lập: không tải được hàng chờ chiến dịch.</p>
          <button onClick={() => chooseScenario("queue")}>Giả lập thử lại thành công</button>
        </section>
      ) : (
        <section className="dashboard-section">
          <CampaignQueueToolbar query={query} onQueryChange={value => { setQuery(value); setPage(0); }} order={order} onOrderChange={value => { setOrder(value); setPage(0); }} />
          <p role="status">{result.total} phiên bản đang chờ{query.trim() ? " phù hợp tìm kiếm" : ""}.</p>

          {result.items.length === 0 ? (
            <p>{query.trim() ? "Không có chiến dịch phù hợp từ khóa." : "Hiện không có chiến dịch chờ xét duyệt."}</p>
          ) : (
            <div className="campaign-table">
              <table>
                <thead><tr><th>Chiến dịch</th><th>Doanh nghiệp</th><th>Phiên bản / trạng thái</th><th>Gửi lúc</th><th>Thao tác</th></tr></thead>
                <tbody>
                  {result.items.map(item => (
                    <tr key={item.submission_id}>
                      <td><strong>{item.snapshot.campaign.campaign_name}</strong><small>{item.campaign_code}</small></td>
                      <td>{item.company_name}</td>
                      <td><span className="campaign-badge">v{item.version_no} · Chờ duyệt</span></td>
                      <td>{new Date(item.submitted_at).toLocaleString("vi-VN")}</td>
                      <td><button onClick={() => setSelected(item)}>Xem phiên bản đã nộp</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <nav className="article-actions" aria-label="Phân trang hàng chờ">
            <button disabled={result.page === 0} onClick={() => setPage(result.page - 1)}>Trang trước</button>
            <span>Trang {result.page + 1}</span>
            <button disabled={!result.hasNext} onClick={() => setPage(result.page + 1)}>Trang sau</button>
          </nav>
        </section>
      )}

      {selected && (
        <ModalShell title="Thông tin phiên bản chiến dịch — minh họa" onClose={close}>
          <h2>{selected.snapshot.campaign.campaign_name}</h2>
          <p>{selected.campaign_code} · {selected.company_name} · v{selected.version_no}</p>
          <dl>
            <dt>Hợp đồng mẫu</dt><dd>DEMO-CONTRACT-001 · ACTIVE / PAID</dd>
            <dt>Vị trí quảng cáo</dt><dd>Banner đầu bài · 728 × 90px</dd>
            <dt>Creative</dt><dd>Ảnh PNG · cùng phiên bản đã nộp · chờ kiểm tra nội dung</dd>
            <dt>Phạm vi</dt><dd>Tất cả thiết bị · Việt Nam · Chuyên mục tin tức</dd>
            <dt>URL mẫu</dt><dd>https://example.test/demo</dd>
          </dl>
          <p>Luồng thật: từ ADM-07 mở ADM-08 để kiểm tra creative và ghi quyết định. Khung này chỉ là bản xem nhanh giả lập.</p>
          <button className="secondary-button" onClick={close}>Đóng</button>
          <button onClick={simulateProcessed}>Giả lập đã được xử lý</button>
        </ModalShell>
      )}
    </main>
  );
}
