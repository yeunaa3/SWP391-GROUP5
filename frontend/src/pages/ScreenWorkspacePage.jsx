import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdvertisingRecords from "../components/AdvertisingRecords.jsx";
import ScreenConnections from "../components/ScreenConnections.jsx";
import { apiRequest } from "../services/apiClient.js";
import { getAdvertisingCatalog } from "../services/contentService.js";

import { primaryAction, screenFields, screenMode } from "../data/screenUiCatalog.js";

const areaCopy = {
  account: "Manage personal settings and account activity.",
  premium: "Review subscription, payment and entitlement information.",
  business: "Manage the company partnership, contracts, campaigns and performance.",
  adManager: "Review partnership, contract and campaign work submitted by businesses.",
  admin: "Configure master data, access control and operational settings.",
  public: "Browse news and Premium coverage.",
};

const samples = [
  ["REF-2026-041", "Submitted record requiring review", "Pending review"],
  ["REF-2026-036", "Approved record with valid configuration", "Active"],
  ["REF-2026-029", "Updated record awaiting confirmation", "Needs revision"],
];

function isAction(field) {
  return /button| link|save |submit |create |continue |accept |send |export |download |open |remove |renew |retry |shortcut|pagination/i.test(field);
}

function sampleValue(field) {
  const value = field.toLowerCase();
  if (value.includes("email")) return "contact@company.vn";
  if (value.includes("phone")) return "090 123 4567";
  if (value.includes("name")) return "The Pulse Demo";
  if (value.includes("code") || value.includes("number") || value.includes("reference")) return "REF-2026-041";
  if (value.includes("url")) return "https://example.com/campaign";
  if (value.includes("price") || value.includes("amount")) return "15000000";
  if (value.includes("quota") || value.includes("impression")) return "100000";
  if (value.includes("width")) return "1200";
  if (value.includes("height")) return "300";
  if (value.includes("duration")) return "30";
  return "";
}

function FieldControl({ field, catalog, selected }) {
  const name = field.toLowerCase();
  if (catalog && /slot|b2b package/.test(name)) {
    const slot = name.includes("slot"); const options = slot ? catalog.slots : catalog.offers;
    return <select key={`${field}-${selected.slotId}-${selected.packageId}`} defaultValue={(slot ? selected.slotId : selected.packageId) || ""}><option value="">Chọn {slot ? "vị trí" : "gói quảng cáo"}</option>{options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>;
  }
  if (/declaration|confirmation|agreement|remember/.test(name)) {
    return <label className="check specification-check"><input type="checkbox" /> I confirm this information is correct.</label>;
  }
  if (/upload|file/.test(name)) return <input type="file" accept="image/*,.pdf" />;
  if (/description|summary|objective|needs|reason|terms|information|content/.test(name)) return <textarea rows="4" placeholder={`Enter ${name}`} />;
  if (/status|type|category|role|company|package|slot|device|industry|decision|filter|selector|method/.test(name)) {
    return <select defaultValue=""><option value="" disabled>Select {name}</option><option>Active</option><option>Pending review</option><option>Needs revision</option></select>;
  }
  if (/date|time|period|expiry|deadline/.test(name)) return <input key={`${field}-${selected?.startDate}-${selected?.endDate}`} type="date" defaultValue={name.includes("start") ? selected?.startDate || "" : name.includes("end") ? selected?.endDate || "" : ""}/>;
  if (name.includes("email")) return <input type="email" defaultValue={sampleValue(field)} />;
  if (name.includes("password")) return <input type="password" placeholder="••••••••" />;
  if (name.includes("phone")) return <input type="tel" defaultValue={sampleValue(field)} />;
  if (/price|amount|quota|impression|click|duration|width|height|priority|ctr/.test(name)) return <input type="number" min="0" defaultValue={sampleValue(field)} />;
  return <input defaultValue={sampleValue(field)} placeholder={`Enter ${name}`} />;
}

function ScreenForm({ fields, onSubmit, catalog, selected }) {
  const inputFields = fields.filter((field) => !isAction(field));
  return <form className="specification-form" onSubmit={onSubmit}><div className="form-section-heading"><div><h2>Details</h2><p>Fields and validation follow the SRS screen specification.</p></div><span>{inputFields.length} components</span></div><div className="specification-grid">{inputFields.map((field) => <label key={field} className={/description|summary|objective|reason|terms|upload|file|information|content/.test(field.toLowerCase()) ? "field-wide" : ""}><span>{field}</span><FieldControl field={field} catalog={catalog} selected={selected}/></label>)}</div><div className="form-actions"><button type="button" className="secondary-button" onClick={onSubmit}>Save draft</button><button type="submit">{primaryAction(fields)}</button></div></form>;
}

function ScreenList({ fields }) {
  const filters = fields.filter((field) => /filter|search|date|status|type|category/.test(field.toLowerCase())).slice(0, 3);
  const columns = fields.filter((field) => !isAction(field) && !filters.includes(field)).slice(0, 4);
  const tableColumns = columns.length >= 3 ? columns : ["Reference", "Description", "Status"];
  return <section className="dashboard-section dashboard-section-wide"><div className="list-toolbar"><div><h2>Records</h2><p>Search, filter and open an authorized record.</p></div><div className="inline-filters">{(filters.length ? filters : ["Search and filters"]).map((field) => <input key={field} placeholder={field} />)}<button type="button" className="secondary-button">Apply</button></div></div><div className="data-table"><div className="table-row table-head" style={{ gridTemplateColumns: `repeat(${tableColumns.length}, minmax(130px, 1fr))` }}>{tableColumns.map((column) => <span key={column}>{column}</span>)}</div>{samples.map(([ref, description, status], rowIndex) => <div className="table-row" style={{ gridTemplateColumns: `repeat(${tableColumns.length}, minmax(130px, 1fr))` }} key={ref}>{tableColumns.map((column, columnIndex) => <span key={column}>{columnIndex === 0 ? <strong>{ref}</strong> : columnIndex === tableColumns.length - 1 ? <span className={`status-pill status-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span> : `${description}${rowIndex ? ` ${rowIndex + 1}` : ""}`}</span>)}</div>)}</div><div className="table-footer"><span>Showing 3 sample records</span><button type="button" className="secondary-button">Open selected</button></div></section>;
}

function ScreenReport({ fields }) {
  const metrics = fields.filter((field) => /active|pending|impression|click|ctr|quota|alert|failed|warning|total|status/.test(field.toLowerCase())).slice(0, 4);
  const shown = metrics.length ? metrics : fields.slice(0, 4);
  return <><section className="stats-grid">{shown.map((field, index) => <article className="stat-card" key={field}><span>{field}</span><strong>{["248,120", "6,482", "2.61%", "78%"][index] || "24"}</strong><small>{index % 2 ? "Updated today" : "+8.4% this period"}</small></article>)}</section><section className="dashboard-grid"><article className="dashboard-section dashboard-section-wide"><div className="section-heading"><div><h2>Performance trend</h2><p>Daily values shown for the selected reporting period.</p></div><select><option>Last 30 days</option><option>Last 7 days</option></select></div><div className="bar-chart" aria-label="Sample performance chart">{[38, 52, 47, 70, 61, 84, 76, 92, 68, 88, 79, 96].map((height, index) => <span key={index} style={{ height: `${height}%` }} title={`Day ${index + 1}`} />)}</div></article><aside className="dashboard-section"><h2>Attention required</h2><ul className="alert-list"><li><strong>2</strong><span>records await review</span></li><li><strong>1</strong><span>delivery warning</span></li><li><strong>3</strong><span>payments pending</span></li></ul></aside></section><ScreenList fields={fields} /></>;
}

export default function ScreenWorkspacePage({ screen }) {
  const [message, setMessage] = useState("");
  const [params] = useSearchParams();
  const [catalog, setCatalog] = useState(null);
  useEffect(() => { setMessage(""); setCatalog(null); let alive = true;
    if (screen.id === "BUS-07") getAdvertisingCatalog().then(data => { if (alive) setCatalog(data); });
    return () => { alive = false; }; }, [screen.id]);
  const fields = useMemo(() => screenFields[screen.id] || ["Search and filters", "Record", "Status", "Open details"], [screen.id]);
  const mode = screenMode(screen.id);
  const showTraceability = import.meta.env.VITE_SHOW_TRACEABILITY === "true";
  function submit(event) { event.preventDefault(); setMessage("Biểu mẫu này chưa nối API lưu/gửi. Chưa có dữ liệu nào được ghi vào DB."); }
  return (
    <main className="page-content">
      <div className="page-heading"><div><p className="eyebrow">{screen.id} · {screen.feature}</p><h1>{screen.name}</h1><p className="page-subtitle">{areaCopy[screen.area] || areaCopy.public}</p></div>{mode !== "form" && <button type="button" onClick={() => setMessage(`${primaryAction(fields)} is ready for API integration.`)}>{primaryAction(fields)}</button>}</div>
      {message && <div className="success-message" role="status">{message}<button type="button" onClick={() => setMessage("")}>×</button></div>}
      <ScreenConnections screen={screen}/>
      {screen.id === "CFG-06" && <section className="dashboard-section"><h2>Nhập tin từ RSS</h2><p>VnExpress và Tuổi Trẻ · Tự cập nhật mỗi 15 phút · Giữ nguyên nguồn bài viết.</p><button onClick={async () => { try { const result = await apiRequest("/api/admin/news-import", { method: "POST" }); setMessage(`Đã xử lý ${result.processed} tin; ${result.errors.length} nguồn lỗi.`); } catch (error) { setMessage(error.message); } }}>Cập nhật tin ngay</button></section>}
      {["BUS-01", "BUS-11", "BUS-13", "BUS-18", "BUS-19", "ADM-01", "ADM-09", "ADM-10"].includes(screen.id) && <AdvertisingRecords />}
      {mode === "form" ? <ScreenForm fields={fields} onSubmit={submit} catalog={screen.id === "BUS-07" ? catalog : null} selected={{slotId:params.get("slotId"),packageId:params.get("packageId"),startDate:params.get("startDate"),endDate:params.get("endDate")}}/> : mode === "report" ? <ScreenReport fields={fields} /> : <ScreenList fields={fields} />}
      {showTraceability && <><section className="component-inventory"><div><h2>SRS component coverage</h2><p>Components included on this page from the approved screen specification.</p></div><div>{fields.map((field) => <span key={field}>✓ {field}</span>)}</div></section><section className="trace-footer"><span>Traceability</span><strong>{screen.bf?.join(", ") || "Supporting flow"}</strong><span>{screen.uc?.join(", ") || "Dashboard/supporting screen"}</span></section></>}
    </main>
  );
}
