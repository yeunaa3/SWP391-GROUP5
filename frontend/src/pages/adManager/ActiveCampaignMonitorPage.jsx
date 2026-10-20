import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient.js";
import "../../assets/analytics.css";

/**
 * ============================================================================
 * [BF-08][ADM-09] ACTIVE CAMPAIGN MONITOR & REAL-TIME OPERATIONAL CONTROL
 * Phụ trách: Cường (Màn hình giám sát chiến dịch, Biểu đồ SVG, Xuất CSV & Tạm dừng/Mở lại)
 * 
 * Tính năng cốt lõi:
 * 1. [BF-08][UC-39] Nút Thao tác Tạm dừng (PAUSE) / Kích hoạt lại (RESUME) chiến dịch tức thì
 * 2. [BF-08][UC-32] Bảng điều khiển KPI: Tổng chiến dịch, Active, Paused, Views, Clicks, CTR, Doanh thu
 * 3. [BF-08][ADM-09] Biểu đồ xu hướng SVG tương tác theo ngày (Line Chart & Bar Chart)
 * 4. [BF-08][ADM-09] Tìm kiếm, lọc theo Trạng thái (ACTIVE / PAUSED / COMPLETED) và Vị trí Slot
 * 5. [BF-08][ADM-09] Live Preview modal xem thử banner thực tế
 * 6. [BF-08][ADM-09] Xuất dữ liệu thống kê ra file CSV phục vụ kiểm toán
 * ============================================================================
 */
const numberFormat = (val) => Number(val || 0).toLocaleString("vi-VN");
const currencyFormat = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val || 0);

function AnimatedValue({ value, decimals = 0, suffix = "" }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let frame;
    const from = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - from) / 600);
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <strong>
      {shown.toLocaleString("vi-VN", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      })}
      {suffix}
    </strong>
  );
}

export default function ActiveCampaignMonitorPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [performanceRows, setPerformanceRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [previewAd, setPreviewAd] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [daysFilter, setDaysFilter] = useState("30");
  const [chartMetric, setChartMetric] = useState("impressions");
  const [chartType, setChartType] = useState("line");
  const [chartHover, setChartHover] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Load campaign & performance data
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest("/api/advertising/campaign-data"),
      apiRequest("/api/advertising/performance"),
    ])
      .then(([campData, perfData]) => {
        if (alive) {
          setCampaigns(campData || []);
          setPerformanceRows(perfData || []);
        }
      })
      .catch((err) => {
        if (alive) setError(err.message || "Không thể tải dữ liệu chiến dịch.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [refreshCount]);

  // Handle UC-39: Pause/Resume campaign
  const handleToggleStatus = async (campaign) => {
    const isPausing = campaign.status === "ACTIVE";
    const confirmMessage = isPausing
      ? `Bạn có chắc muốn TẠM DỪNG chiến dịch "${campaign.name}"? Quảng cáo sẽ tạm dừng hiển thị tới độc giả.`
      : `Bạn có muốn KÍCH HOẠT LẠI chiến dịch "${campaign.name}"? Banner sẽ tiếp tục phân phối bình thường.`;

    if (!window.confirm(confirmMessage)) return;

    setActionLoading(campaign.id);
    setActionSuccess("");
    setError("");

    try {
      const res = await apiRequest(`/api/advertising/campaigns/${campaign.id}/toggle-status`, {
        method: "POST",
      });
      const newStatus = res?.status || (isPausing ? "PAUSED" : "ACTIVE");
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, status: newStatus } : c))
      );
      setActionSuccess(
        isPausing
          ? `Đã tạm dừng chiến dịch "${campaign.name}" thành công.`
          : `Đã kích hoạt lại chiến dịch "${campaign.name}".`
      );
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setError(err.message || "Không thể thay đổi trạng thái chiến dịch.");
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((item) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.companyName && item.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.contractCode && item.contractCode.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesPosition = positionFilter === "all" || item.positionCode === positionFilter;

      return matchesSearch && matchesStatus && matchesPosition;
    });
  }, [campaigns, searchTerm, statusFilter, positionFilter]);

  // Overall KPIs calculated from campaigns
  const kpis = useMemo(() => {
    const totalImpressions = campaigns.reduce((acc, c) => acc + Number(c.impressions || 0), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + Number(c.clicks || 0), 0);
    const totalAmount = campaigns.reduce((acc, c) => acc + Number(c.amount || 0), 0);
    const activeCount = campaigns.filter((c) => c.status === "ACTIVE").length;
    const pausedCount = campaigns.filter((c) => c.status === "PAUSED").length;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      totalImpressions,
      totalClicks,
      totalAmount,
      activeCount,
      pausedCount,
      ctr,
    };
  }, [campaigns]);

  // Filtered performance for chart
  const dailyData = useMemo(() => {
    const map = new Map();
    const cutoff = new Date();
    if (daysFilter !== "all") {
      cutoff.setDate(cutoff.getDate() - Number(daysFilter) + 1);
    }
    const cutoffStr =
      daysFilter === "all"
        ? ""
        : `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(
            cutoff.getDate()
          ).padStart(2, "0")}`;

    performanceRows.forEach((row) => {
      const dateStr = String(row.metricDate || "").slice(0, 10);
      if (daysFilter !== "all" && dateStr < cutoffStr) return;

      const item = map.get(dateStr) || { date: dateStr, impressions: 0, clicks: 0 };
      item.impressions += Number(row.impressions || 0);
      item.clicks += Number(row.clicks || 0);
      map.set(dateStr, item);
    });

    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [performanceRows, daysFilter]);

  // Campaign distribution for Share of Voice
  const campaignShares = useMemo(() => {
    const totalImp = kpis.totalImpressions || 1;
    return campaigns.map((camp) => ({
      id: camp.id,
      name: camp.name,
      impressions: Number(camp.impressions || 0),
      percentage: ((Number(camp.impressions || 0) / totalImp) * 100).toFixed(1),
    }));
  }, [campaigns, kpis.totalImpressions]);

  // Chart helpers
  const maxMetricVal = Math.max(1, ...dailyData.map((d) => d[chartMetric] || 0));
  const chartPoints = dailyData.map((item, i) => [
    40 + (i * 720) / Math.max(1, dailyData.length - 1),
    240 - ((item[chartMetric] || 0) / maxMetricVal) * 190,
  ]);
  const chartPath = chartPoints.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const activePoint = chartHover === null ? dailyData.at(-1) : dailyData[chartHover];

  // Export CSV
  const handleExportCsv = () => {
    const safe = (v) => `"${String(v ?? "").replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
    const headers = [
      "Mã chiến dịch",
      "Tên chiến dịch",
      "Doanh nghiệp",
      "Mã hợp đồng",
      "Vị trí",
      "Kích thước",
      "Lượt hiển thị (Realtime)",
      "Lượt click (Realtime)",
      "CTR (%)",
      "Trạng thái",
      "Giá trị (VND)",
    ];
    const rows = filteredCampaigns.map((c) => {
      const imp = Number(c.impressions || 0);
      const clk = Number(c.clicks || 0);
      const ctrVal = imp > 0 ? ((clk / imp) * 100).toFixed(2) : "0.00";
      return [
        c.id,
        c.name,
        c.companyName || "N/A",
        c.contractCode || "N/A",
        c.positionCode || c.slotName,
        `${c.widthPx || 0}x${c.heightPx || 0}px`,
        imp,
        clk,
        `${ctrVal}%`,
        c.status,
        c.amount || 0,
      ];
    });

    const csvContent =
      "\ufeff" + [headers, ...rows].map((row) => row.map(safe).join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `the-pluse-active-campaigns-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const ringColors = ["#cc1836", "#2b8790", "#e0ab4f", "#8073c4", "#376957", "#d9534f"];

  return (
    <main className="page-content performance-page">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADM-09 · GIÁM SÁT CHIẾN DỊCH QUẢNG CÁO (BF-08 / UC-30 / UC-39)</p>
          <h1>Báo cáo vận hành & Phân phối chiến dịch</h1>
          <p className="page-subtitle">
            Hệ thống ghi nhận tương tác thực tế (Impressions & Clicks) từ độc giả đọc báo. Điều phối
            và tạm dừng / tiếp tục chiến dịch linh hoạt.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setRefreshCount((c) => c + 1)}
            disabled={loading}
          >
            ↻ Làm mới
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || !filteredCampaigns.length}
          >
            ↓ Xuất báo cáo CSV
          </button>
          <Link
            to="/ad-manager/reports"
            style={{
              padding: "10px 14px",
              background: "#1e293b",
              color: "#fff",
              borderRadius: "8px",
              fontSize: "13px",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Báo cáo ADM-10 →
          </Link>
        </div>
      </div>

      {/* Real-time Interaction Tracking Banner */}
      <div
        style={{
          background: "#ecfdf5",
          border: "1px solid #a7f3d0",
          borderRadius: "10px",
          padding: "12px 18px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "13px",
          color: "#065f46",
        }}
      >
        <span style={{ fontSize: "18px" }}>🟢</span>
        <div>
          <strong>Bộ ghi nhận tương tác tự động đang hoạt động:</strong> Mọi lượt xem banner và lượt
          click của độc giả trên website sẽ được cập nhật trực tiếp vào cơ sở dữ liệu{" "}
          <code>ad_metrics</code> và phản ánh ngay tức thì trên màn hình này.
        </div>
      </div>

      {/* Messages */}
      {actionSuccess && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
            padding: "12px 18px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontWeight: 500,
          }}
        >
          ✓ {actionSuccess}
        </div>
      )}
      {error && (
        <div role="alert" className="form-error" style={{ marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="performance-kpis">
        <article>
          <span className="kpi-icon">◉</span>
          <span>Tổng lượt hiển thị (Realtime)</span>
          <AnimatedValue value={kpis.totalImpressions} />
          <small>Được độc giả kích hoạt trên trang</small>
        </article>

        <article>
          <span className="kpi-icon">↗</span>
          <span>Tổng lượt click (Realtime)</span>
          <AnimatedValue value={kpis.totalClicks} />
          <small>Tự động chuyển tiếp đích</small>
        </article>

        <article>
          <span className="kpi-icon">◎</span>
          <span>Tỷ lệ CTR trung bình</span>
          <AnimatedValue value={kpis.ctr} decimals={2} suffix="%" />
          <small>Clicks / Impressions</small>
        </article>

        <article>
          <span className="kpi-icon">📊</span>
          <span>Chiến dịch đang vận hành</span>
          <strong>
            {kpis.activeCount} <span style={{ fontSize: "18px", color: "#64748b" }}>/ {campaigns.length}</span>
          </strong>
          <small>{kpis.pausedCount} chiến dịch đang tạm dừng</small>
        </article>
      </div>

      {/* Interactive Performance Charts Section */}
      <div className="performance-charts">
        {/* Trend line / bar chart */}
        <section className="dashboard-section">
          <div className="performance-chart-heading">
            <div>
              <h2>Nhịp phân phối chiến dịch theo ngày</h2>
              <p>Biểu đồ số liệu thời gian thực ghi nhận từ MySQL. Rê chuột để xem chi tiết từng ngày.</p>
            </div>
            <div className="chart-switches">
              <button
                type="button"
                aria-pressed={chartMetric === "impressions"}
                onClick={() => setChartMetric("impressions")}
              >
                Hiển thị (Impressions)
              </button>
              <button
                type="button"
                aria-pressed={chartMetric === "clicks"}
                onClick={() => setChartMetric("clicks")}
              >
                Lượt Clicks
              </button>
              <button
                type="button"
                aria-pressed={chartType === "line"}
                onClick={() => setChartType((v) => (v === "line" ? "bar" : "line"))}
              >
                {chartType === "line" ? "Dạng cột" : "Dạng đường"}
              </button>
            </div>
          </div>

          <div className="chart-insight" role="status">
            {activePoint?.date ? `Ngày ${activePoint.date}:` : "Hôm nay:"}{" "}
            <strong>{numberFormat(activePoint?.[chartMetric] || 0)}</strong>{" "}
            {chartMetric === "impressions" ? "lượt hiển thị" : "lượt clicks"}
          </div>

          {dailyData.length > 0 ? (
            <>
              <svg
                className="performance-svg"
                viewBox="0 0 800 280"
                role="img"
                aria-label="Biểu đồ hiệu suất phân phối"
              >
                <defs>
                  <linearGradient id="campaign-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor="#cc1836" stopOpacity="0.25" />
                    <stop offset="1" stopColor="#cc1836" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map((i) => (
                  <g key={i}>
                    <line
                      x1="40"
                      x2="770"
                      y1={50 + i * 47.5}
                      y2={50 + i * 47.5}
                      stroke="#e2e8f0"
                      strokeDasharray="4 5"
                    />
                    <text x="0" y={54 + i * 47.5} fontSize="9" fill="#94a3b8">
                      {numberFormat(Math.round(maxMetricVal * (1 - i / 4)))}
                    </text>
                  </g>
                ))}

                {chartType === "line" ? (
                  <>
                    <path
                      d={`${chartPath} L${chartPoints.at(-1)?.[0]},240 L40,240 Z`}
                      fill="url(#campaign-fill)"
                    />
                    <path
                      className="chart-line"
                      d={chartPath}
                      fill="none"
                      stroke="#cc1836"
                      strokeWidth="3"
                    />
                    {chartPoints.map(([x, y], i) => (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={chartHover === i ? 7 : 4}
                        fill="#cc1836"
                        stroke="#fff"
                        strokeWidth="2"
                      />
                    ))}
                  </>
                ) : (
                  chartPoints.map(([x, y], i) => (
                    <rect
                      className="chart-bar"
                      key={i}
                      x={x - 10}
                      y={y}
                      width="20"
                      height={Math.max(0, 240 - y)}
                      rx="4"
                      fill={chartHover === i ? "#862441" : "#cc1836"}
                    />
                  ))
                )}

                {chartPoints.map(([x], i) => (
                  <rect
                    key={i}
                    x={x - 720 / Math.max(1, dailyData.length) / 2}
                    y="30"
                    width={720 / Math.max(1, dailyData.length)}
                    height="220"
                    fill="transparent"
                    onMouseEnter={() => setChartHover(i)}
                  />
                ))}
              </svg>

              <div className="chart-days">
                {dailyData.map((item, i) => (
                  <button
                    key={item.date}
                    type="button"
                    className={chartHover === i ? "selected" : ""}
                    onFocus={() => setChartHover(i)}
                    onClick={() => setChartHover(i)}
                  >
                    {item.date.slice(5)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="info-note" style={{ margin: "30px 0" }}>
              Chưa có dữ liệu phân phối theo ngày trong khoảng thời gian này.
            </p>
          )}
        </section>

        {/* Share of Voice (Ring Chart) */}
        <aside className="dashboard-section campaign-share">
          <h2>Tỷ trọng hiển thị (Share of Voice)</h2>
          <div
            className="share-ring"
            style={{
              background: `conic-gradient(${campaignShares
                .map((item, i) => {
                  const from =
                    (campaignShares.slice(0, i).reduce((sum, x) => sum + x.impressions, 0) /
                      (kpis.totalImpressions || 1)) *
                    100;
                  const to = from + (item.impressions / (kpis.totalImpressions || 1)) * 100;
                  return `${ringColors[i % ringColors.length]} ${from}% ${to}%`;
                })
                .join(",")})`,
            }}
          >
            <div>
              <AnimatedValue value={campaigns.length} />
              <small>chiến dịch</small>
            </div>
          </div>

          <div style={{ maxHeight: "210px", overflowY: "auto" }}>
            {campaignShares.map((item, i) => (
              <div key={item.id} className="share-item">
                <i style={{ background: ringColors[i % ringColors.length] }} />
                <span title={item.name} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.name}
                </span>
                <strong>{item.percentage}%</strong>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Filter and Control Bar for Campaign Table */}
      <div className="performance-filters" style={{ marginTop: "10px" }}>
        <label style={{ flex: 1, minWidth: "220px" }}>
          Tìm kiếm chiến dịch / Doanh nghiệp
          <input
            type="search"
            placeholder="Nhập tên chiến dịch, công ty hoặc mã HĐ…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #ddd6cd",
              borderRadius: "8px",
              background: "#fbfaf7",
              color: "#26313f",
              fontSize: "13px",
            }}
          />
        </label>

        <label>
          Trạng thái
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang chạy (ACTIVE)</option>
            <option value="PAUSED">Tạm dừng (PAUSED)</option>
          </select>
        </label>

        <label>
          Vị trí Banner
          <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
            <option value="all">Tất cả vị trí</option>
            <option value="HOME_HERO">HOME_HERO</option>
            <option value="ARTICLE_TOP">ARTICLE_TOP</option>
            <option value="ARTICLE_SIDEBAR">ARTICLE_SIDEBAR</option>
          </select>
        </label>

        <label>
          Thời gian phân phối
          <select value={daysFilter} onChange={(e) => setDaysFilter(e.target.value)}>
            <option value="all">Tất cả dữ liệu</option>
            <option value="7">7 ngày qua</option>
            <option value="30">30 ngày qua</option>
          </select>
        </label>
      </div>

      {/* Campaign Operations Table */}
      <section className="dashboard-section performance-details" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2>Danh sách chiến dịch quảng cáo ({filteredCampaigns.length})</h2>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
              Quản lý vận hành (UC-39): Bạn có thể tạm dừng hoặc kích hoạt lại chiến dịch bất kỳ lúc nào.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="loading-card" style={{ padding: "40px", textAlign: "center" }}>
            Đang tải danh sách chiến dịch…
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <p className="info-note" style={{ margin: "20px 0" }}>
            Không tìm thấy chiến dịch nào khớp với bộ lọc tìm kiếm.
          </p>
        ) : (
          <div className="data-table" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Chiến dịch & Doanh nghiệp</th>
                  <th>Vị trí & Kích thước</th>
                  <th>Lượt hiển thị (Realtime)</th>
                  <th>Lượt click (Realtime)</th>
                  <th>CTR (%)</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Điều khiển vận hành (UC-39)</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((camp) => {
                  const imp = Number(camp.impressions || 0);
                  const clk = Number(camp.clicks || 0);
                  const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(2) : "0.00";
                  const isActive = camp.status === "ACTIVE";

                  return (
                    <tr key={camp.id}>
                      {/* Name & Company */}
                      <td>
                        <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "13px" }}>
                          {camp.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                          🏢 {camp.companyName || "Pulse Partners"} · HĐ: <code>{camp.contractCode}</code>
                        </div>
                      </td>

                      {/* Position & Size */}
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#334155",
                          }}
                        >
                          {camp.positionCode || camp.slotName}
                        </span>
                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>
                          {camp.widthPx} x {camp.heightPx} px
                        </div>
                      </td>

                      {/* Impressions */}
                      <td>
                        <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                          {numberFormat(imp)}
                        </strong>
                      </td>

                      {/* Clicks */}
                      <td>
                        <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                          {numberFormat(clk)}
                        </strong>
                      </td>

                      {/* CTR */}
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color: Number(ctr) > 1.5 ? "#15803d" : "#b45309",
                          }}
                        >
                          {ctr}%
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td>
                        {isActive ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              background: "#dcfce7",
                              color: "#15803d",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 700,
                              letterSpacing: "0.5px",
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                background: "#22c55e",
                                borderRadius: "50%",
                                display: "inline-block",
                              }}
                            />
                            ĐANG CHẠY
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              background: "#fef3c7",
                              color: "#b45309",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 700,
                              letterSpacing: "0.5px",
                            }}
                          >
                            <span
                              style={{
                                width: "7px",
                                height: "7px",
                                background: "#f59e0b",
                                borderRadius: "50%",
                                display: "inline-block",
                              }}
                            />
                            TẠM DỪNG
                          </span>
                        )}
                      </td>

                      {/* Operations / UC-39 controls */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                          {/* Banner preview button */}
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ padding: "6px 10px", fontSize: "11px" }}
                            onClick={() => setPreviewAd(camp)}
                            title="Xem trước banner quảng cáo"
                          >
                            👁 Xem mẫu
                          </button>

                          {/* Pause / Resume toggle button */}
                          <button
                            type="button"
                            disabled={actionLoading === camp.id}
                            onClick={() => handleToggleStatus(camp)}
                            style={{
                              padding: "6px 12px",
                              fontSize: "11px",
                              fontWeight: 600,
                              borderRadius: "6px",
                              cursor: "pointer",
                              border: "none",
                              color: "#fff",
                              background: isActive ? "#b91c1c" : "#15803d",
                              transition: "background 0.2s",
                            }}
                          >
                            {actionLoading === camp.id
                              ? "Đang lưu…"
                              : isActive
                              ? "⏸ Tạm dừng"
                              : "▶ Tiếp tục"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Banner Preview Modal */}
      {previewAd && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setPreviewAd(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              maxWidth: "600px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>
                Xem trước mẫu quảng cáo
              </h3>
              <button
                type="button"
                onClick={() => setPreviewAd(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                border: "1px dashed #cbd5e1",
                borderRadius: "8px",
                padding: "16px",
                textAlign: "center",
                background: "#f8fafc",
                marginBottom: "16px",
              }}
            >
              {previewAd.mediaUrl ? (
                <img
                  src={previewAd.mediaUrl}
                  alt={previewAd.name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "260px",
                    objectFit: "contain",
                    borderRadius: "6px",
                  }}
                />
              ) : (
                <div style={{ padding: "40px 20px", color: "#94a3b8" }}>
                  Chưa có ảnh banner được tải lên.
                </div>
              )}
            </div>

            <div style={{ fontSize: "13px", color: "#334155", display: "grid", gap: "8px" }}>
              <div>
                <strong>Chiến dịch:</strong> {previewAd.name}
              </div>
              <div>
                <strong>Doanh nghiệp:</strong> {previewAd.companyName || "Pulse Partners"}
              </div>
              <div>
                <strong>Vị trí hiển thị:</strong> <code>{previewAd.positionCode || previewAd.slotName}</code> ({previewAd.widthPx}x{previewAd.heightPx} px)
              </div>
              <div>
                <strong>Link đích (Target URL):</strong>{" "}
                <a
                  href={previewAd.targetUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2563eb", wordBreak: "break-all" }}
                >
                  {previewAd.targetUrl || "—"}
                </a>
              </div>
            </div>

            <div style={{ textAlign: "right", marginTop: "20px" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPreviewAd(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
