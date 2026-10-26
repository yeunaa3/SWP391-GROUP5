import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { getAdminOverview } from "../../services/adminService.js";
import { money } from "../../utils/premium.js";
import "../../assets/admin-dashboard.css";

function Counter({ value }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const target = Number(value || 0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(target); return; }
    const start = performance.now(); let frame;
    const tick = now => {
      const progress = Math.max(0, Math.min((now - start) / 750, 1));
      setShown(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown.toLocaleString()}</>;
}

function TrendChart({ rows, field, label, kind, locale }) {
  const gradient = useId().replace(/:/g, "");
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...rows.map(row => Number(row[field])));
  const points = rows.map((row, i) => [42 + i * 696 / Math.max(1, rows.length - 1), 230 - Number(row[field]) / max * 185]);
  const path = points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const selected = hover === null ? null : rows[hover];
  const valueLabel = value => field === "revenue" ? money(value) : Number(value).toLocaleString(locale);
  return <div className="admin-trend">
    <div className="admin-chart-tooltip" aria-live="polite">{selected ? `${selected.date} · ${label}: ${valueLabel(selected[field])}` : `${label} · ${locale === "vi-VN" ? "Di chuột hoặc Tab để xem từng ngày" : "Hover or Tab to inspect each day"}`}</div>
    <svg viewBox="0 0 780 280" role="img" aria-label={label}>
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8067ec" stopOpacity=".32" /><stop offset="100%" stopColor="#8067ec" stopOpacity="0" /></linearGradient></defs>
      {[0, .5, 1].map(ratio => <g key={ratio}><line x1="42" x2="738" y1={230 - ratio * 185} y2={230 - ratio * 185} stroke="currentColor" opacity=".1" /><text x="38" y={235 - ratio * 185} textAnchor="end" className="admin-axis">{field === "revenue" ? `${Math.round(max * ratio / 1000)}k` : Math.round(max * ratio)}</text></g>)}
      {kind === "area" ? <><path className="admin-area" d={`${path} L738,230 L42,230 Z`} fill={`url(#${gradient})`} /><path className="admin-line" d={path} fill="none" stroke="#8067ec" strokeWidth="3" strokeLinejoin="round" /></> : points.map(([x, y], i) => <rect className="admin-bar" key={i} x={x - Math.min(10, 240 / rows.length)} y={y} width={Math.min(20, 480 / rows.length)} height={230 - y} rx="4" fill="#8067ec" style={{ animationDelay: `${i * 15}ms` }} />)}
      {points.map(([x, y], i) => <g key={i} tabIndex="0" role="button" aria-label={`${rows[i].date}: ${valueLabel(rows[i][field])}`} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}><rect x={x - 348 / rows.length} y="30" width={696 / rows.length} height="205" fill="transparent" /><circle cx={x} cy={y} r={hover === i ? 6 : 3} fill="#8067ec" stroke="white" strokeWidth="2" /><title>{rows[i].date}: {valueLabel(rows[i][field])}</title></g>)}
      {[0, Math.floor((rows.length - 1) / 2), rows.length - 1].filter((n, i, a) => a.indexOf(n) === i).map(i => <text key={i} x={points[i]?.[0]} y="265" textAnchor="middle" className="admin-axis">{rows[i]?.date.slice(5)}</text>)}
    </svg>
    {!rows.some(row => Number(row[field]) > 0) && <p className="admin-chart-empty">{locale === "vi-VN" ? "Chưa phát sinh dữ liệu trong khoảng thời gian này." : "No activity recorded in this period."}</p>}
    <details className="admin-data-details"><summary>{locale === "vi-VN" ? "Xem bảng số liệu" : "View data table"}</summary><table><thead><tr><th>{locale === "vi-VN" ? "Ngày" : "Date"}</th><th>{label}</th></tr></thead><tbody>{rows.map(row => <tr key={row.date}><td>{row.date}</td><td>{valueLabel(row[field])}</td></tr>)}</tbody></table></details>
  </div>;
}

export default function AdminDashboardPage() {
  const { t, language } = usePreferences();
  const [days, setDays] = useState(30);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [field, setField] = useState("revenue");
  const [kind, setKind] = useState("area");
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: "" });
    getAdminOverview(days, controller.signal).then(data => setState({ loading: false, data, error: "" })).catch(error => {
      if (!controller.signal.aborted) setState({ loading: false, data: null, error: error.message });
    });
    return () => controller.abort();
  }, [days, attempt]);
  const locale = language === "vi" ? "vi-VN" : "en-GB";
  const data = state.data;
  const metrics = { revenue: t("Doanh thu ghi nhận · VND", "Recorded revenue · VND"), users: t("Tài khoản mới", "New accounts"), requests: t("Đăng ký Premium", "Premium requests") };
  const statuses = [["PENDING", t("Chờ duyệt", "Pending"), "#efb35b"], ["APPROVED", t("Đã duyệt", "Approved"), "#41b99a"], ["REJECTED", t("Từ chối", "Rejected"), "#e9788a"]];
  const counts = statuses.map(([status]) => Number(data?.requestStatus.find(row => row.status === status)?.count || 0));
  const total = counts.reduce((a, b) => a + b, 0);
  let offset = 0;
  const revenue = data?.daily.reduce((sum, row) => sum + Number(row.revenue), 0) || 0;
  return <main className="page-content admin-overview">
    <header className="admin-overview-hero"><div><span className="admin-eyebrow">THE PLUSE / CONTROL ROOM</span><h1>{t("Toàn cảnh trong một nhịp nhìn.", "Your operation. In one clear view.")}</h1><p>{t("Theo dõi độc giả, doanh thu và những yêu cầu đang chờ bạn xử lý.", "Follow your readers, recorded revenue and the requests that need your attention.")}</p><span className="admin-snapshot-dot">{t("Số liệu từ cơ sở dữ liệu", "Database snapshot")}</span></div>
      <div className="admin-hero-actions"><div className="admin-segment" aria-label={t("Khoảng thời gian", "Period")}>{[7, 30].map(value => <button key={value} aria-pressed={days === value} onClick={() => setDays(value)}>{value} {t("ngày", "days")}</button>)}</div><button className="admin-refresh" disabled={state.loading} onClick={() => setAttempt(value => value + 1)}>{state.loading ? t("Đang cập nhật…", "Updating…") : t("↻ Cập nhật", "↻ Refresh")}</button></div></header>
    {state.error && <section className="admin-panel" role="alert"><h2>{t("Chưa tải được tổng quan", "Overview unavailable")}</h2><p>{state.error}</p><button onClick={() => setAttempt(value => value + 1)}>{t("Thử lại", "Retry")}</button></section>}
    {state.loading && <div className="admin-skeleton-grid" role="status" aria-label={t("Đang tải thống kê", "Loading overview")}>{[1, 2, 3, 4].map(n => <div className="admin-skeleton" key={n} />)}</div>}
    {data && <>
      <section className="admin-kpis">{[
        [t("Doanh thu ghi nhận", "Recorded revenue"), revenue, "₫", t(`${days} ngày · giao dịch SUCCESS bằng VND`, `${days} days · SUCCESS transactions in VND`), "violet"],
        [t("Tài khoản", "Accounts"), data.totals.users, "↗", t("Tổng tài khoản trong hệ thống", "Total accounts in the system"), "blue"],
        [t("Độc giả Premium", "Premium readers"), data.totals.subscribers, "✦", t("Có gói đang trong thời hạn hiệu lực", "With a currently valid subscription"), "green"],
        [t("Cần duyệt", "Awaiting review"), data.totals.pendingRequests, "◷", t("Đăng ký Premium chưa xử lý", "Unprocessed Premium requests"), "amber"],
      ].map(([label, value, icon, note, color], index) => <article className={`admin-kpi tone-${color}`} key={label} style={{ animationDelay: `${index * 65}ms` }}><div className="admin-kpi-top"><span>{label}</span><i aria-hidden="true">{icon}</i></div><strong><Counter value={value} />{index === 0 && <small> VND</small>}</strong><p>{note}</p></article>)}</section>
      <section className="admin-main-grid"><article className="admin-panel admin-chart-panel"><div className="admin-panel-title"><div><span className="admin-eyebrow">PERFORMANCE</span><h2>{t("Chuyển động của hệ thống", "Activity over time")}</h2></div><select aria-label={t("Kiểu biểu đồ", "Chart type")} value={kind} onChange={e => setKind(e.target.value)}><option value="area">{t("Đường & vùng", "Area")}</option><option value="bars">{t("Cột", "Bars")}</option></select></div>
        <div className="admin-chart-tabs">{Object.entries(metrics).map(([key, label]) => <button key={key} aria-pressed={field === key} onClick={() => setField(key)}>{label}</button>)}</div>
        <TrendChart key={`${field}-${kind}`} rows={data.daily} field={field} label={metrics[field]} kind={kind} locale={locale} />
        <p className="admin-fine-print">{t("Doanh thu là tổng giao dịch SUCCESS, không phải doanh thu ròng hoặc số dư ngân hàng. Tài khoản/dữ liệu mẫu trong DB cũng được tính. Ngày thống kê theo múi giờ DB.", "Revenue sums SUCCESS transactions, not net revenue or bank balance. Demo records in the database are included. Daily buckets use the database timezone.")}</p></article>
        <aside className="admin-panel"><span className="admin-eyebrow">PREMIUM PIPELINE</span><h2>{t("Từ đăng ký đến quyền đọc", "From request to access")}</h2>
          <div className="admin-donut-wrap"><svg viewBox="0 0 180 180" role="img" aria-label={t("Phân bố trạng thái yêu cầu", "Request status distribution")}><circle cx="90" cy="90" r="68" fill="none" stroke="#eef0f5" strokeWidth="17" />{statuses.map(([status, label, color], index) => {
            const length = total ? counts[index] / total * 427.26 : 0; const dashOffset = -offset; offset += length;
            return <circle className="admin-donut-slice" key={status} cx="90" cy="90" r="68" fill="none" stroke={color} strokeWidth="17" strokeDasharray={`${length} 427.26`} strokeDashoffset={dashOffset} transform="rotate(-90 90 90)"><title>{label}: {counts[index]}</title></circle>;
          })}<text x="90" y="87" textAnchor="middle" className="admin-donut-number">{total}</text><text x="90" y="108" textAnchor="middle" className="admin-axis">{t("yêu cầu", "requests")}</text></svg></div>
          <div className="admin-status-legend">{statuses.map(([status, label, color], index) => <div key={status}><span><i style={{ background: color }} />{label}</span><strong>{counts[index]}</strong></div>)}</div>
          <p className="admin-fine-print">{t("Toàn bộ lịch sử yêu cầu, không giới hạn theo bộ lọc ngày.", "All request history, independent of the period filter.")}</p><Link className="admin-primary-link" to="/admin/subscription-packages">{t("Mở hàng chờ duyệt", "Open review queue")} →</Link>
        </aside></section>
      <section className="admin-bottom-grid"><article className="admin-panel"><div className="admin-panel-title"><div><span className="admin-eyebrow">ACTION CENTER</span><h2>{t("Ưu tiên xử lý hôm nay", "Your next actions")}</h2></div><Link to="/admin/subscription-packages">{t("Xem tất cả", "View all")} ↗</Link></div>
        {!data.recentRequests.length && <div className="admin-zero-state"><span>✓</span><h3>{t("Hàng chờ đang trống", "Your queue is clear")}</h3><p>{t("Đăng ký mới của độc giả sẽ xuất hiện tại đây.", "New reader requests will appear here.")}</p></div>}
        <div className="admin-request-list">{data.recentRequests.map(row => <Link to="/admin/subscription-packages" key={row.id}><span className="admin-avatar">{row.username.slice(0, 2).toUpperCase()}</span><div><strong>{row.username}</strong><small>PRE-{row.id} · {row.packageName}</small></div><div className="admin-request-value"><strong>{money(row.amount, row.currency)}</strong><small>{statuses.find(item => item[0] === row.status)?.[1] || row.status}</small></div><span aria-hidden="true">↗</span></Link>)}</div>
      </article><aside className="admin-panel admin-inventory"><span className="admin-eyebrow">CONTENT & BUSINESS</span><h2>{t("Những mảnh ghép đang vận hành", "Your publishing ecosystem")}</h2>{[[data.totals.articles, t("Bài đang xuất bản", "Published articles"), "/"], [data.totals.companies, t("Hồ sơ doanh nghiệp", "Company profiles"), "/ad-manager/partnerships"], [data.totals.activeCampaigns, t("Chiến dịch ACTIVE", "ACTIVE campaigns"), "/admin/ad-slots"]].map(([count, label, path], index) => <div className="admin-inventory-row" key={label}><span className="admin-inventory-number">0{index + 1}</span><div><strong>{Number(count).toLocaleString(locale)}</strong><p>{label}</p></div></div>)}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
            <Link to="/admin/b2b-packages" className="admin-settings-link">
              Quản lý gói quảng cáo B2B (CFG-05) →
            </Link>
            <Link to="/admin/packages" className="admin-settings-link">
              Quản lý gói thuê bao Premium →
            </Link>
          </div>
        </aside></section>
      <footer className="admin-overview-footer">{t("Cập nhật lúc", "Updated at")} {new Date(data.asOf).toLocaleString(locale)} · {t("Làm mới thủ công · Không phải giám sát thời gian thực", "Manual refresh · Not real-time monitoring")}</footer>
    </>}
  </main>;
}
