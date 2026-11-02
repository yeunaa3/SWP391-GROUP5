import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../store/AuthContext.jsx";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { apiRequest } from "../../services/apiClient.js";
import "../../assets/business-dashboard.css";

const numberFormat = (val) => Number(val || 0).toLocaleString("vi-VN");

function AnimatedCounter({ value, suffix = "" }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(target);
      return;
    }
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.max(0, Math.min((now - start) / 700, 1));
      setShown(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <>
      {shown.toLocaleString("vi-VN")}
      {suffix}
    </>
  );
}

/**
 * ============================================================================
 * [BUS-01] BẢNG ĐIỀU KHIỂN DOANH NGHIỆP (THE PULSE BUSINESS DASHBOARD)
 * Đồng bộ phong cách hoàn toàn với Admin Dashboard & Ad Manager Dashboard:
 * 1. Khung Hero đón tiếp sang trọng, badge dữ liệu trực tiếp, nút làm mới.
 * 2. 4 thẻ KPI chỉ số lớn (Hợp đồng, Chiến dịch, Lượt xem, Clicks & CTR).
 * 3. Biểu đồ SVG xu hướng hiệu quả tương tác (Trend Chart).
 * 4. Bảng danh sách chiến dịch đang chạy với số liệu realtime.
 * 5. Khối thao tác nhanh 1-chạm & trạng thái hồ sơ đối tác doanh nghiệp.
 * ============================================================================
 */
export default function BusinessDashboardPage() {
  const { user } = useAuth();
  const { t } = usePreferences();

  const [workspace, setWorkspace] = useState(null);
  const [performanceRows, setPerformanceRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30); // 7 | 30
  const [metric, setMetric] = useState("impressions"); // "impressions" | "clicks"
  const [chartType, setChartType] = useState("area"); // "area" | "bar"
  const [hover, setHover] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const gradientId = useId().replace(/:/g, "");

  // Tải dữ liệu workspace và chuỗi thời gian hiệu suất quảng cáo
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest("/api/business/campaign-workspace").catch(() => null),
      apiRequest("/api/advertising/performance").catch(() => []),
    ])
      .then(([ws, perf]) => {
        if (!alive) return;
        setWorkspace(ws);
        setPerformanceRows(perf || []);
      })
      .catch((err) => {
        if (alive) setError(err.message || "Không thể tải bảng điều khiển doanh nghiệp.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [refreshCount]);

  const company = workspace?.company || {};
  const campaigns = workspace?.campaigns || [];
  const contracts = workspace?.contracts || [];

  const activeContracts = useMemo(
    () => contracts.filter((c) => c.status === "ACTIVE" && c.payment_status === "PAID"),
    [contracts]
  );

  const activeCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === "ACTIVE"),
    [campaigns]
  );

  // Xử lý chuỗi dữ liệu theo ngày cho biểu đồ
  const dailyData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(days) + 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const map = new Map();
    performanceRows.forEach((row) => {
      const dateStr = String(row.metricDate || "").slice(0, 10);
      if (days !== "all" && dateStr < cutoffStr) return;

      const item = map.get(dateStr) || { date: dateStr, impressions: 0, clicks: 0 };
      item.impressions += Number(row.impressions || 0);
      item.clicks += Number(row.clicks || 0);
      map.set(dateStr, item);
    });

    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [performanceRows, days]);

  // Tổng hợp chỉ số KPI
  const totalImpressions = useMemo(() => {
    const fromPerf = performanceRows.reduce((sum, r) => sum + Number(r.impressions || 0), 0);
    const fromWs = Number(workspace?.metrics?.impressions || 0);
    return Math.max(fromPerf, fromWs);
  }, [performanceRows, workspace?.metrics]);

  const totalClicks = useMemo(() => {
    const fromPerf = performanceRows.reduce((sum, r) => sum + Number(r.clicks || 0), 0);
    const fromWs = Number(workspace?.metrics?.clicks || 0);
    return Math.max(fromPerf, fromWs);
  }, [performanceRows, workspace?.metrics]);

  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

  // Thông số vẽ SVG biểu đồ
  const maxVal = Math.max(1, ...dailyData.map((d) => d[metric] || 0));
  const points = dailyData.map((item, i) => [
    42 + (i * 696) / Math.max(1, dailyData.length - 1),
    230 - ((item[metric] || 0) / maxVal) * 185,
  ]);
  const path = points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const activePoint = hover === null ? dailyData.at(-1) : dailyData[hover];

  const statusBadge = (st) => {
    switch (st) {
      case "ACTIVE":
        return <span className="campaign-status-badge status-active">● Đang chạy</span>;
      case "PENDING_REVIEW":
        return <span className="campaign-status-badge status-pending">◷ Chờ duyệt</span>;
      case "PAUSED":
        return <span className="campaign-status-badge status-paused">❚❚ Tạm dừng</span>;
      case "NEEDS_REVISION":
        return <span className="campaign-status-badge status-revision">! Cần sửa đổi</span>;
      default:
        return <span className="campaign-status-badge">{st || "Bản nháp"}</span>;
    }
  };

  return (
    <main className="page-content business-overview">
      {/* 1. Header Banner phong cách Control Room */}
      <header className="business-overview-hero">
        <div>
          <span className="business-eyebrow">THE PULSE · KHÔNG GIAN DOANH NGHIỆP</span>
          <h1>{t("Toàn cảnh hoạt động & Hiệu quả quảng cáo", "Business Operations & Ad Performance")}</h1>
          <p>
            {company.company_name
              ? `Chào mừng ${company.company_name}. Theo dõi chiến dịch phân phối, lưu lượng tương tác và các đầu việc cần bạn xử lý.`
              : "Quản lý hợp đồng quảng cáo, theo dõi số liệu hiển thị thực tế từ độc giả và tối ưu chiến dịch của bạn."}
          </p>
          <div className="business-snapshot-dot">
            <span>Dữ liệu trực tiếp từ hệ thống The Pulse</span>
          </div>
        </div>

        <div className="business-hero-actions">
          <div className="business-segment" aria-label="Khoảng thời gian">
            {[7, 30].map((val) => (
              <button
                key={val}
                type="button"
                aria-pressed={days === val}
                onClick={() => setDays(val)}
              >
                {val} ngày
              </button>
            ))}
          </div>
          <button
            type="button"
            className="business-refresh-btn"
            disabled={loading}
            onClick={() => setRefreshCount((c) => c + 1)}
          >
            {loading ? "Đang tải…" : "↻ Cập nhật số liệu"}
          </button>
        </div>
      </header>

      {error && (
        <section className="business-panel" role="alert" style={{ marginBottom: "20px" }}>
          <h2 style={{ color: "#b91c1c" }}>Chưa tải được bảng điều khiển</h2>
          <p>{error}</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => setRefreshCount((c) => c + 1)}
          >
            Thử lại
          </button>
        </section>
      )}

      {/* 2. Thẻ chỉ số tổng quan KPI */}
      <section className="business-kpis">
        <article className="business-kpi-card tone-emerald">
          <div className="business-kpi-top">
            <span>Hợp đồng hiệu lực</span>
            <div className="business-kpi-icon">📄</div>
          </div>
          <strong>
            <AnimatedCounter value={activeContracts.length} />
          </strong>
          <p>Hợp đồng đã thanh toán & đang trong thời hạn chạy</p>
        </article>

        <article className="business-kpi-card tone-indigo">
          <div className="business-kpi-top">
            <span>Chiến dịch đang chạy</span>
            <div className="business-kpi-icon">⚡</div>
          </div>
          <strong>
            <AnimatedCounter value={activeCampaigns.length} />
          </strong>
          <p>Banner được phê duyệt đang phân phối tới độc giả</p>
        </article>

        <article className="business-kpi-card tone-blue">
          <div className="business-kpi-top">
            <span>Lượt xem banner (Impressions)</span>
            <div className="business-kpi-icon">◉</div>
          </div>
          <strong>
            <AnimatedCounter value={totalImpressions} />
          </strong>
          <p>Tổng lượt hiển thị ghi nhận thực tế trên các trang</p>
        </article>

        <article className="business-kpi-card tone-amber">
          <div className="business-kpi-top">
            <span>Lượt click & CTR</span>
            <div className="business-kpi-icon">↗</div>
          </div>
          <strong>
            <AnimatedCounter value={totalClicks} />{" "}
            <small style={{ fontSize: "15px", color: "#d97706", fontWeight: "700" }}>
              ({overallCtr}%)
            </small>
          </strong>
          <p>Tỷ lệ tương tác chuyển đổi trung bình của chiến dịch</p>
        </article>
      </section>

      {/* 3. Bố cục 2 cột chính: Biểu đồ & Chiến dịch + Cột lối tắt nghiệp vụ */}
      <div className="business-main-grid">
        {/* Cột trái: Biểu đồ hiệu suất & Bảng chiến dịch */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Biểu đồ xu hướng hiệu quả phân phối */}
          <section className="business-panel">
            <div className="business-panel-header">
              <div>
                <h2>Hiệu quả phân phối theo ngày</h2>
                <div className="business-chart-tooltip" aria-live="polite">
                  {activePoint?.date
                    ? `${activePoint.date} · ${
                        metric === "impressions" ? "Lượt hiển thị" : "Lượt click"
                      }: ${numberFormat(activePoint[metric])}`
                    : `Di chuột hoặc chọn ngày để xem chi tiết ${
                        metric === "impressions" ? "lượt hiển thị" : "lượt click"
                      }`}
                </div>
              </div>

              <div className="business-chart-switches">
                <button
                  type="button"
                  aria-pressed={metric === "impressions"}
                  onClick={() => setMetric("impressions")}
                >
                  Lượt xem
                </button>
                <button
                  type="button"
                  aria-pressed={metric === "clicks"}
                  onClick={() => setMetric("clicks")}
                >
                  Clicks
                </button>
                <button
                  type="button"
                  aria-pressed={chartType === "area"}
                  onClick={() => setChartType(chartType === "area" ? "bar" : "area")}
                >
                  {chartType === "area" ? "Biểu đồ cột" : "Biểu đồ đường"}
                </button>
              </div>
            </div>

            {/* SVG Biểu đồ xu hướng */}
            {dailyData.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                <p style={{ margin: "0 0 10px" }}>Chưa phát sinh dữ liệu trong {days} ngày gần nhất.</p>
                <small>Dữ liệu sự kiện sẽ tự động xuất hiện khi banner của bạn được phân phối tới độc giả.</small>
              </div>
            ) : (
              <>
                <svg className="business-chart-svg" viewBox="0 0 780 280" role="img" aria-label="Biểu đồ hiệu suất">
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {[0, 0.5, 1].map((ratio) => (
                    <g key={ratio}>
                      <line
                        x1="42"
                        x2="738"
                        y1={230 - ratio * 185}
                        y2={230 - ratio * 185}
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                      />
                      <text x="36" y={234 - ratio * 185} textAnchor="end" fontSize="10" fill="#94a3b8">
                        {numberFormat(Math.round(maxVal * ratio))}
                      </text>
                    </g>
                  ))}

                  {chartType === "area" ? (
                    <>
                      <path
                        d={`${path} L738,230 L42,230 Z`}
                        fill={`url(#${gradientId})`}
                      />
                      <path
                        d={path}
                        fill="none"
                        stroke="#059669"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />
                    </>
                  ) : (
                    points.map(([x, y], i) => (
                      <rect
                        key={i}
                        x={x - Math.min(10, 240 / dailyData.length)}
                        y={y}
                        width={Math.min(20, 480 / dailyData.length)}
                        height={230 - y}
                        rx="4"
                        fill="#059669"
                      />
                    ))
                  )}

                  {points.map(([x, y], i) => (
                    <g
                      key={i}
                      tabIndex="0"
                      role="button"
                      aria-label={`${dailyData[i].date}: ${numberFormat(dailyData[i][metric])}`}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                    >
                      <rect
                        x={x - 348 / dailyData.length}
                        y="30"
                        width={696 / dailyData.length}
                        height="205"
                        fill="transparent"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={hover === i ? 6 : 3.5}
                        fill="#059669"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </g>
                  ))}

                  {[0, Math.floor((dailyData.length - 1) / 2), dailyData.length - 1]
                    .filter((n, i, a) => a.indexOf(n) === i)
                    .map((i) => (
                      <text key={i} x={points[i]?.[0]} y="260" textAnchor="middle" fontSize="10" fill="#94a3b8">
                        {dailyData[i]?.date.slice(5)}
                      </text>
                    ))}
                </svg>

                <details style={{ marginTop: "12px", fontSize: "12.5px", color: "#64748b" }}>
                  <summary style={{ cursor: "pointer", fontWeight: "600" }}>Xem bảng số liệu theo ngày</summary>
                  <table style={{ width: "100%", marginTop: "10px", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                        <th style={{ padding: "8px" }}>Ngày</th>
                        <th style={{ padding: "8px" }}>Lượt hiển thị</th>
                        <th style={{ padding: "8px" }}>Lượt click</th>
                        <th style={{ padding: "8px" }}>CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.map((d) => (
                        <tr key={d.date} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "8px" }}>{d.date}</td>
                          <td style={{ padding: "8px" }}>{numberFormat(d.impressions)}</td>
                          <td style={{ padding: "8px" }}>{numberFormat(d.clicks)}</td>
                          <td style={{ padding: "8px" }}>
                            {d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) + "%" : "0%"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </>
            )}
          </section>

          {/* Danh sách chiến dịch quảng cáo */}
          <section className="business-panel">
            <div className="business-panel-header">
              <h2>Chiến dịch của bạn ({campaigns.length})</h2>
              <Link className="business-panel-link" to="/business/campaigns">
                Quản lý tất cả chiến dịch →
              </Link>
            </div>

            {campaigns.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                <p>Bạn chưa có chiến dịch nào.</p>
                <Link to="/business/campaigns/edit" className="primary-button" style={{ display: "inline-block", marginTop: "10px" }}>
                  + Tạo chiến dịch đầu tiên
                </Link>
              </div>
            ) : (
              <div className="business-campaign-table-wrap">
                <table className="business-campaign-table">
                  <thead>
                    <tr>
                      <th>Chiến dịch</th>
                      <th>Vị trí</th>
                      <th>Lượt hiển thị</th>
                      <th>Lượt click</th>
                      <th>Trạng thái</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.slice(0, 5).map((camp) => (
                      <tr key={camp.campaign_id || camp.id}>
                        <td>
                          <strong>{camp.campaign_name || camp.name}</strong>
                          <span style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>
                            Mã: {camp.campaign_code || camp.code || `#${camp.campaign_id || camp.id}`}
                          </span>
                        </td>
                        <td>{camp.slot_name_snapshot || camp.slotName || "Trang chủ (HOME_HERO)"}</td>
                        <td>{numberFormat(camp.impressions || 0)}</td>
                        <td>{numberFormat(camp.clicks || 0)}</td>
                        <td>{statusBadge(camp.status)}</td>
                        <td>
                          <Link
                            to={`/business/campaigns/${camp.campaign_id || camp.id}`}
                            className="business-panel-link"
                            style={{ fontSize: "12px" }}
                          >
                            Chi tiết →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Cột phải: Hồ sơ đối tác & Lối tắt tác vụ nhanh */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Thẻ tình trạng hồ sơ đối tác doanh nghiệp */}
          <div className={`business-partner-card ${company.application_status === "APPROVED" ? "" : "pending"}`}>
            <div className="business-partner-card-header">
              <strong>HỒ SƠ ĐỐI TÁC</strong>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "12px",
                  background: company.application_status === "APPROVED" ? "#dcfce7" : "#fef3c7",
                  color: company.application_status === "APPROVED" ? "#15803d" : "#b45309",
                }}
              >
                {company.application_status === "APPROVED"
                  ? "✓ ĐÃ PHÊ DUYỆT"
                  : company.application_status === "PENDING_REVIEW"
                  ? "◷ ĐANG XÉT DUYỆT"
                  : company.application_status === "NEEDS_REVISION"
                  ? "! CẦN BỔ SUNG"
                  : "CHƯA NỘP HỒ SƠ"}
              </span>
            </div>
            <p>
              {company.company_name ? (
                <>
                  <strong>{company.company_name}</strong>
                  <br />
                  <span style={{ fontSize: "12px", color: "#475569" }}>MST: {company.tax_code || "Chưa cập nhật"}</span>
                </>
              ) : (
                "Vui lòng hoàn thiện hồ sơ pháp lý doanh nghiệp để mở khóa toàn bộ quyền hạn đặt quảng cáo."
              )}
            </p>
            <Link
              to="/business/company"
              style={{
                display: "inline-block",
                marginTop: "8px",
                fontSize: "12.5px",
                fontWeight: "600",
                color: "#059669",
              }}
            >
              Xem chi tiết hồ sơ doanh nghiệp →
            </Link>
          </div>

          {/* Lối tắt tác vụ nhanh (Quick Actions) */}
          <div className="business-panel">
            <h3 style={{ fontSize: "15px", margin: "0 0 14px", color: "#0f172a" }}>Lối tắt tác vụ</h3>
            <div className="business-actions-list">
              <Link to="/business/campaigns/edit" className="business-action-item">
                <div className="business-action-icon">＋</div>
                <div className="business-action-info">
                  <strong>Tạo chiến dịch mới</strong>
                  <small>Chọn hợp đồng & tải lên banner quảng cáo</small>
                </div>
                <span className="business-action-arrow">›</span>
              </Link>

              <Link to="/business/bookings/new" className="business-action-item">
                <div className="business-action-icon">🛒</div>
                <div className="business-action-info">
                  <strong>Đặt vị trí quảng cáo</strong>
                  <small>Đăng ký vị trí slot & gửi đề xuất hợp đồng</small>
                </div>
                <span className="business-action-arrow">›</span>
              </Link>

              <Link to="/business/performance" className="business-action-item">
                <div className="business-action-icon">📊</div>
                <div className="business-action-info">
                  <strong>Báo cáo hiệu quả chi tiết</strong>
                  <small>Phân tích lượt click, CTR & xuất CSV/PDF</small>
                </div>
                <span className="business-action-arrow">›</span>
              </Link>

              <Link to="/business/advertising/calendar" className="business-action-item">
                <div className="business-action-icon">📅</div>
                <div className="business-action-info">
                  <strong>Lịch phân phối vị trí</strong>
                  <small>Tra cứu thời gian bận/trống của các slot</small>
                </div>
                <span className="business-action-arrow">›</span>
              </Link>

              <Link to="/business/advertising/prices" className="business-action-item">
                <div className="business-action-icon">🏷️</div>
                <div className="business-action-info">
                  <strong>Bảng giá & Gói quảng cáo</strong>
                  <small>Tham khảo chi phí các gói B2B</small>
                </div>
                <span className="business-action-arrow">›</span>
              </Link>
            </div>
          </div>

          {/* Thông báo gần đây */}
          <div className="business-panel">
            <h3 style={{ fontSize: "15px", margin: "0 0 12px", color: "#0f172a" }}>Thông báo hoạt động</h3>
            {workspace?.notices?.length ? (
              <div style={{ display: "grid", gap: "10px" }}>
                {workspace.notices.slice(0, 3).map((n, i) => (
                  <div key={i} style={{ padding: "10px", background: "#f8fafc", borderRadius: "10px", fontSize: "12.5px" }}>
                    <strong style={{ display: "block", color: "#0f172a" }}>{n.title}</strong>
                    <span style={{ color: "#64748b" }}>{n.content}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>Chưa có thông báo mới.</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
