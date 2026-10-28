import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../services/apiClient.js";
import CampaignList from "./CampaignList.jsx";
import CompanyApplicationHistory from "./CompanyApplicationHistory.jsx";
import { sortCampaigns } from "../../utils/campaignSort.js";
import { prepareCampaignDraft } from "../../utils/campaignDraft.js";
import { prepareCompanyProfile, saveAndVerifyCompany } from "../../services/companyProfileService.js";
import { campaignLabels as labels, editableCampaign as editable, money, dateInput, startInput, dateLabel, campaignStatuses, withUtm } from "../../utils/businessCampaign.js";
import "../../assets/business-campaign.css";
        const json = (path, body, method = "POST") => apiRequest(path, {method, body: JSON.stringify(body)});
        const names = {"BUS-01": "Tổng quan doanh nghiệp", "BUS-02": "Hồ sơ doanh nghiệp", "BUS-13": "Danh sách chiến dịch", "BUS-14": "Thông tin chiến dịch", "BUS-15": "Banner và đối tượng", "BUS-16": "Kiểm tra trước khi gửi", "BUS-17": "Trạng thái và chi tiết"};
        const emptyForm = {name: "", description: "", contractId: "", startTime: "", endTime: "", targetUrl: ""};
// Badge/Field/Media chỉ trình bày trạng thái, nhãn field và đúng loại ảnh/video; không quyết định quyền nghiệp vụ.
        function Badge({value}){
        return <span className="campaign-badge">{labels[value] || ({NOT_RUNNING: "Chưa phân phối"}[value]) || value || "—"}</span>;
        }
        function Field({label, children}){
        return <label className="business-field"><span>{label}</span>{children}</label>;
        }
        function Media({creative, ...props}){
        return creative?.mime_type?.startsWith("video/") || creative?.creative_type === "VIDEO" ? <video controls preload="metadata" src={creative.media_url} {...props}/> : creative?.media_url ? <img src={creative.media_url} alt={creative.title || "Banner xem trước"} {...props}/> : <p>Chưa có creative.</p>;
        }
        /** Xác nhận cụ thể trước mutation; hủy chỉ đóng dialog, không gọi API. */
        function Confirm({value, onCancel, onConfirm, busy, error}){
        return value && <div className="campaign-dialog-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="campaign-dialog"><h2 id="confirm-title">{value.title}</h2><p>{value.text}</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" disabled={busy} autoFocus onClick={onCancel}>Hủy</button><button type="button" disabled={busy} onClick={onConfirm}>{busy ? "Đang xử lý…" : "Xác nhận"}</button></div></section></div>;
        }

        /** Giữ draft trên server; cảnh báo reload/rời trang nếu người dùng đang có dữ liệu chưa lưu. */
        function useUnsaved(dirty) {
        const ref = useRef(dirty);
                ref.current = dirty;
                useEffect(() => {
                const unload = e => {
                if (ref.current) {
                e.preventDefault();
                        e.returnValue = "";
                }
                };
                        const click = e => {
                        const a = e.target.closest?.("a[href]");
                                if (ref.current && a && !a.target && !e.ctrlKey && !e.metaKey && !window.confirm("Bạn có thay đổi chưa lưu. Rời trang?")) {
                        e.preventDefault();
                                e.stopPropagation();
                        }
                        };
                        window.addEventListener("beforeunload", unload);
                        document.addEventListener("click", click, true);
                        return() => {
                window.removeEventListener("beforeunload", unload);
                        document.removeEventListener("click", click, true);
                };
                }, []);
                return ref;
        }

        /** Controller giao diện BF-06: load dữ liệu thật, không tạo success hoặc status giả ở frontend. */
        export default function BusinessCampaignPage({screen}){
        const {campaignId} = useParams(),
                navigate = useNavigate();
                const [workspace, setWorkspace] = useState(null),
        [detail, setDetail] = useState(null),
        [checks, setChecks] = useState([]);
                const [loading, setLoading] = useState(true),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        [message, setMessage] = useState("");
                const [form, setForm] = useState(emptyForm),
        [companyForm, setCompanyForm] = useState({}),
        [target, setTarget] = useState({categoryIds: [], tagIds: [], geoScope: "", audience: "", deviceType: "ALL"});
                const [file, setFile] = useState(null),
        [preview, setPreview] = useState(null),
        [device, setDevice] = useState("desktop");
                const [q, setQ] = useState(""),
        [filter, setFilter] = useState("ALL"),
        [delivery, setDelivery] = useState("ALL"),
        [page, setPage] = useState(0),
        [sortOrder, setSortOrder] = useState("CREATED_DESC");
                const [dirty, setDirty] = useState(false),
        [confirm, setConfirm] = useState(null),
        [utm, setUtm] = useState({source: "thepulse", medium: "display", campaign: ""});
                const dirtyRef = useUnsaved(dirty), savingRef = useRef(false), requestKey = useRef(crypto.randomUUID()), loadGeneration = useRef(0);
                const c = detail?.campaign, ct = detail?.contract, creatives = detail?.creatives || [], latest = creatives.find(x => x.status !== "ARCHIVED"), approved = creatives.find(x => x.status === "APPROVED");
                const company = workspace?.company || {}, allowed = company.application_status === "APPROVED";
                const profileEditable = !company.company_id || ["DRAFT", "NEEDS_REVISION"].includes(company.application_status);
                const activeContracts = (workspace?.contracts || []).filter(x => x.status === "ACTIVE" && x.payment_status === "PAID" && new Date(x.end_at) > new Date());
                const selectedContract = ct || activeContracts.find(x => String(x.contract_id) === form.contractId);
                const version = c?.edit_version;
                const savedTarget = {categoryIds: detail?.targeting?.categoryIds || [], tagIds: detail?.targeting?.tagIds || [], geoScope: detail?.targeting?.geo_scope || "", audience: detail?.targeting?.target_audience || "", deviceType: detail?.targeting?.device_type || "ALL"};
                const targetChanged = !!c && JSON.stringify(target) !== JSON.stringify(savedTarget);
                const creativeChanged = !!file || !!c && form.targetUrl !== (c.target_url || "");
                /** Nạp workspace và record; AbortController ngăn response màn cũ ghi đè khi chuyển route. */
                async function load(signal, keep = {}){//gọi GET /api/business/campaign-workspace
                const generation = ++loadGeneration.current;
                        const [w, d] = await Promise.all([apiRequest("/api/business/campaign-workspace", {signal, cache: "no-store"}), campaignId ? apiRequest(`/api/business/campaigns/${campaignId}`, {signal}) : Promise.resolve(null)]);
                        if (signal?.aborted || generation !== loadGeneration.current)
                        return;
                        setWorkspace(w);
                        setDetail(d);
                        const cp = w.company;
                        setCompanyForm({name: cp.company_name || "", taxCode: cp.tax_code || "", email: cp.email || "", phone: cp.phone || "", address: cp.address || "", billingAddress: cp.billing_address || "", industry: cp.industry || "", contactPerson: cp.contact_person || ""});
                        const cam = d?.campaign;
                        const first = w.contracts.find(x => x.status === "ACTIVE" && x.payment_status === "PAID" && new Date(x.end_at) > new Date());
                        setForm(keep.form || (cam ? {name: cam.campaign_name, description: cam.description || "", contractId: String(cam.contract_id), startTime: startInput(cam.scheduled_start_time), endTime: dateInput(cam.scheduled_end_time), targetUrl: cam.target_url || ""} : {...emptyForm, contractId: String(first?.contract_id || ""), startTime: startInput(first?.start_at), endTime: dateInput(first?.end_at)}));
                        const t = d?.targeting;
                        setTarget(keep.target || {categoryIds: t?.categoryIds || [], tagIds: t?.tagIds || [], geoScope: t?.geo_scope || "", audience: t?.target_audience || "", deviceType: t?.device_type || "ALL"});
                        if (screen.id === "BUS-16" && campaignId)
                        setChecks(await apiRequest(`/api/business/campaigns/${campaignId}/validation`, {signal}));
                        setDirty(Boolean(keep.form || keep.target));
                        dirtyRef.current = Boolean(keep.form || keep.target);
                }
                useEffect(() => {
                const controller = new AbortController();
                        setLoading(true);
                        setError("");
                        setMessage("");
                        setDetail(null);
                        setFile(null);
                        setConfirm(null);
                        requestKey.current = crypto.randomUUID();
                        load(controller.signal).catch(e => {
                if (!controller.signal.aborted)
                        setError(e.message);
                }).finally(() => {
                if (!controller.signal.aborted)
                        setLoading(false);
                });
                        return() => controller.abort();
                }, [screen.id, campaignId]);
                        useEffect(() => {
                        if (!file) {
                        setPreview(null);
                                return;
                        }
                        const url = URL.createObjectURL(file);
                                setPreview({media_url: url, mime_type: file.type, title: file.name});
                                return() => URL.revokeObjectURL(url);
                        }, [file]);
                        /** Một mutation tại một thời điểm; điều hướng ngay khi save trả ID, không phụ thuộc refresh cũ. */
                        async function run(task, success, after, keep = {}){
                        if (savingRef.current)
                                return;
                                savingRef.current = true;
                                setBusy(true);
                                setError("");
                                setMessage("");
                                try {
                                const result = await task();
                                        setDirty(false);
                                        dirtyRef.current = false;
                                        setConfirm(null);
                                        setMessage(success);
                                        if (after)
                                        await after(result);
                                        else
                                        await load(undefined, keep);
                                } catch (e) {
                        setConfirm(null);
                                setError(e.message);
                        } finally {
                        savingRef.current = false;
                                setBusy(false);
                        }
                        }
                        /** Cập nhật ô nhập và đánh dấu chưa lưu để cảnh báo khi rời trang. */
                        function update(field, value) {
                        setForm(x => ({...x, [field]: value}));
                                setDirty(true);
                        }
                        /** Lưu nháp có requestKey/editVersion để retry tạo không trùng, tab cũ không ghi đè. */
                        function saveDraft(next) {
                        // Kiểm tra cả hai nút lưu; lỗi giữ nguyên form và requestKey để thử lại không tạo trùng.
                        let payload;
                        try { payload=prepareCampaignDraft(form,selectedContract); }
                        catch(e) { setError(e.message); return; }
                        run(() => json(`/api/business/campaigns${campaignId ? `/${campaignId}` : ""}`, {...payload, editVersion: version, requestKey: requestKey.current}, campaignId ? "PUT" : "POST"), "Đã lưu bản nháp.", r => {
                          if(!r?.id) throw new Error("Server chưa trả mã chiến dịch. Hãy kiểm tra danh sách chiến dịch trước khi thử lại.");
                          navigate(next ? `/business/campaigns/${r.id}/creative` : "/business/campaigns");
                        });
                        }
                        /** BUS-02 lưu hồ sơ sau xác nhận, chỉ khi chưa gửi hoặc được yêu cầu bổ sung. */
                        function saveCompany(e) {
                        e.preventDefault();
                        if (!profileEditable) return;
                                let payload;
                                try { payload = prepareCompanyProfile(companyForm); }
                        catch (e) { setError(e.message); return; }
                        setError(""); setMessage("");
                                setConfirm({title: "Xác nhận lưu hồ sơ", text: "Lưu những thay đổi thông tin doanh nghiệp? Hồ sơ chưa được gửi xét duyệt.", action: () => persistCompany(payload)});
                        }
                        /** Giữ dialog và dữ liệu nhập khi lỗi; chỉ bỏ dirty sau khi backend đọc lại đủ tám trường đã lưu. */
                        async function persistCompany(payload) {
                        if (savingRef.current) return;
                                // Một GET bắt đầu trước PUT không được ghi đè lại hồ sơ vừa lưu bằng dữ liệu cũ.
                                loadGeneration.current++;
                                savingRef.current = true; setBusy(true); setError(""); setMessage("");
                                try {
                                const saved = await saveAndVerifyCompany(payload);
                                        setWorkspace(previous => ({...previous, ...saved}));
                                        setCompanyForm(payload); setDirty(false); dirtyRef.current = false;
                                        setConfirm(null); setMessage("Đã lưu hồ sơ và kiểm tra lại dữ liệu trên máy chủ.");
                                } catch (e) {
                        setError(e.message); setDirty(true); dirtyRef.current = true;
                        } finally { savingRef.current = false; setBusy(false); }
                        }
                        /** Upload bản mới giữ nguyên creative cũ; backend kiểm tra thực file trước khi lưu liên kết. */
                        function upload(e) {
                        e.preventDefault();
                                const body = new FormData();
                                body.append("file", file);
                                body.append("targetUrl", form.targetUrl);
                                body.append("editVersion", version);
                                run(() => apiRequest(`/api/business/campaigns/${campaignId}/creative`, {method: "POST", body}), "Đã lưu creative phiên bản mới.", () => {
                                setFile(null);
                                        return load(undefined, targetChanged ? {target} : {});
                                });
                        }
                        /** Bật/tắt ID catalog trong draft giao diện, chỉ lưu DB khi bấm Lưu đối tượng. */
                        function toggleTarget(key, value) {
                        setTarget(t => ({...t, [key]: t[key].includes(value) ? t[key].filter(x => x !== value) : [...t[key], value]}));
                                setDirty(true);
                        }
                        /** Đặt hành động chờ trong modal; chưa gọi task cho tới khi người dùng xác nhận. */
                        function ask(title, text, task, after) {
                        setConfirm({title, text, action: () => run(task, "Đã hoàn tất thao tác.", after)});
                        }
                        const filtered = sortCampaigns((workspace?.campaigns || []).filter(x => `${x.code} ${x.campaign_name} ${x.contract_code}`.toLocaleLowerCase("vi").includes(q.toLocaleLowerCase("vi")) && (filter === "ALL" || campaignStatuses(x.status).review === filter) && (delivery === "ALL" || campaignStatuses(x.status).delivery === delivery)), sortOrder);
                                const metrics = workspace?.metrics || {}, hasMetrics = Number(metrics.sampleCount) > 0;
                                const steps = [['BUS-14', 'Thông tin', `/business/campaigns/edit/${campaignId || ""}`], ['BUS-15', 'Banner và đối tượng', `/business/campaigns/${campaignId}/creative`], ['BUS-16', 'Kiểm tra', `/business/campaigns/${campaignId}/submit`], ['BUS-17', 'Trạng thái', `/business/campaigns/${campaignId}`]];
                                return <main className="page-content campaign-workspace"><header className="page-heading"><div><p className="eyebrow">THE PULSE BUSINESS · {screen.id}</p><h1>{names[screen.id]}</h1><p>Hồ sơ, nội dung quảng cáo và lịch sử xét duyệt của doanh nghiệp.</p></div><button className="secondary-button" disabled={busy || loading} onClick={() => {if (!dirty || window.confirm("Bỏ thay đổi chưa lưu và tải lại?")){setLoading(true); load().catch(e => setError(e.message)).finally(() => setLoading(false)); }}}>Làm mới</button></header>
    {error && <p role="alert" className="form-error">{error}</p>}{message && <p role="status" className="success-message">{message}</p>}
    {loading?<p>Đang tải dữ liệu…</p>:!workspace?<button onClick={() => location.reload()}>Thử tải lại</button>:<>
    {screen.id === "BUS-01" && <>
    <section className="stats-grid">{[["Hồ sơ hợp tác", labels[company.application_status] || company.application_status || "Chưa có hồ sơ"], ["Hợp đồng hiệu lực", activeContracts.length], ["Chiến dịch đang chạy", workspace.campaigns.filter(x => x.status === "ACTIVE").length], ["Chờ xét duyệt", workspace.campaigns.filter(x => x.status === "PENDING_REVIEW").length], ["Lượt hiển thị", hasMetrics?Number(metrics.impressions).toLocaleString("vi-VN"):"Chưa có dữ liệu"], ["Lượt click", hasMetrics?Number(metrics.clicks).toLocaleString("vi-VN"):"Chưa có dữ liệu"], ["CTR", hasMetrics && Number(metrics.impressions) > 0?(Number(metrics.clicks) / Number(metrics.impressions) * 100).toFixed(2) + "%":"Chưa đủ dữ liệu"]].map(([label, value]) => <article className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
    <p>Số liệu sự kiện thực tế, cập nhật gần nhất: {dateLabel(metrics.cutoff)}. Không cộng số liệu mẫu vào tổng này.</p>
    <section className="dashboard-section"><h2>Tiếp tục công việc</h2><div className="form-actions"><Link className="button-link" to="/business/company">Hồ sơ doanh nghiệp</Link><Link to="/business/bookings/new">Đặt quảng cáo</Link><Link to="/business/campaigns">Chiến dịch và bản nháp</Link></div></section>
    <section className="dashboard-section"><h2>Thông báo gần đây</h2>{workspace.notices.length?workspace.notices.map((n, i) => <article key={i}><h3>{n.title}</h3><p>{n.content}</p><small>{dateLabel(n.created_at)}</small></article>):<p>Chưa có thông báo.</p>}</section>
    </>}
    {screen.id === "BUS-02" && <>
    <form className="dashboard-section" onSubmit={saveCompany}><h2>Thông tin doanh nghiệp</h2><p>Trạng thái: <Badge value={company.application_status}/></p><div className="business-form-grid">{[["name", "Tên pháp lý", 150], ["taxCode", "Mã số thuế", 14], ["industry", "Ngành nghề", 150], ["contactPerson", "Người liên hệ", 150], ["email", "Email liên hệ", 254], ["phone", "Điện thoại", 30], ["address", "Địa chỉ", 500], ["billingAddress", "Địa chỉ xuất hóa đơn", 500]].map(([key, label, max]) => <Field key={key} label={label}><input required maxLength={max} type={key === "email"?"email":"text"} disabled={busy || !profileEditable} value={companyForm[key] || ""} onChange={e => {setCompanyForm(x => ({...x, [key]:e.target.value})); setDirty(true); }}/></Field>)}</div><div className="form-actions"><button disabled={busy || !profileEditable}>Lưu hồ sơ</button><Link to="/business/partnership/apply">Tài liệu và gửi xét duyệt</Link></div><p>Chỉ được sửa bản nháp hoặc hồ sơ được quản lý yêu cầu bổ sung. Hồ sơ đang chờ duyệt hoặc đã duyệt bị khóa. Tải tài liệu và gửi xét duyệt tại Đăng ký hợp tác.</p></form>
    </>}
    {screen.id === "BUS-02" && <CompanyApplicationHistory versions={workspace.companyVersions || []}/>}
    {screen.id !== "BUS-01" && screen.id !== "BUS-02" && !allowed?<section className="dashboard-section"><h2>Chưa đủ điều kiện sử dụng quảng cáo</h2><p>{company.application_status === "REJECTED"?"Hồ sơ bị từ chối. Vui lòng tạo hồ sơ mới và chờ phê duyệt.":company.application_status === "NEEDS_REVISION"?"Hồ sơ cần chỉnh sửa hoặc xét duyệt lại. Hãy hoàn thiện và gửi lại.":"Hồ sơ hợp tác đang chờ hoặc chưa gửi. Vui lòng chờ phê duyệt."}</p><Link to="/business/partnership/status">Xem hồ sơ hợp tác</Link></section>:<>
    {screen.id === "BUS-13" && <CampaignList
      items={filtered} total={workspace.campaigns.length}
      q={q} setQ={setQ} filter={filter} setFilter={setFilter} delivery={delivery} setDelivery={setDelivery}
      sortOrder={sortOrder} setSortOrder={setSortOrder} page={page} setPage={setPage}
      busy={busy} canCreate={Boolean(activeContracts.length)}
      onCopy={item=>run(()=>apiRequest(`/api/business/campaigns/${item.campaign_id}/copy`,{method:"POST"}),"Đã nhân bản.",r=>navigate(`/business/campaigns/edit/${r.id}`))}
      onDelete={item=>ask("Xóa bản nháp?","Chỉ bản chưa từng gửi được xóa. Lịch sử được giữ theo chính sách lưu trữ.",()=>apiRequest(`/api/business/campaigns/${item.campaign_id}`,{method:"DELETE"}))}
    />}
    {["BUS-14", "BUS-15", "BUS-16", "BUS-17"].includes(screen.id) && <>
    <nav className="campaign-steps" aria-label="Tiến độ chiến dịch">{steps.map(([id, label, path], i) => <Link aria-current={screen.id === id?"step":undefined} aria-disabled={!campaignId && i > 0} onClick={e => {if (!campaignId && i > 0)e.preventDefault(); }} key={id} to={path}><span>{i + 1}</span>{label}</Link>)}</nav>
    <div className="campaign-columns"><div>
            {screen.id === "BUS-14" && !activeContracts.length && <section className="dashboard-section"><h2>Chưa có hợp đồng đủ điều kiện</h2><p>Tạo chiến dịch cần hợp đồng đang hiệu lực, đã thanh toán và chưa hết hạn. Bản nháp cũ vẫn được giữ nhưng chỉ lưu tiếp khi hợp đồng đáp ứng điều kiện.</p><Link to="/business/contracts">Kiểm tra danh sách hợp đồng →</Link></section>}
            {screen.id === "BUS-14" && <form className="dashboard-section" onSubmit={e => {e.preventDefault(); saveDraft(true); }}><h2>{campaignId?"Sửa bản nháp":"Tạo chiến dịch"}</h2><fieldset disabled={busy || !!c && !editable(c.status)} className="campaign-fieldset"><div className="business-form-grid"><Field label="Hợp đồng Active và đã thanh toán"><select required value={form.contractId} disabled={!!campaignId} onChange={e => {const s = activeContracts.find(x => String(x.contract_id) === e.target.value); setForm(x => ({...x, contractId:e.target.value, startTime:startInput(s?.start_at), endTime:dateInput(s?.end_at)})); setDirty(true); }}><option value="">Chọn hợp đồng</option>{ct && !activeContracts.some(x=>Number(x.contract_id)===Number(ct.contract_id)) && <option value={ct.contract_id}>{ct.contract_code} · Không còn đủ điều kiện lưu</option>}{activeContracts.map(x => <option key={x.contract_id} value={x.contract_id}>{x.contract_code} · {x.slot_name_snapshot}</option>)}</select></Field><Field label="Tên chiến dịch"><input required maxLength={150} value={form.name} onChange={e => update("name", e.target.value)}/></Field><Field label="Bắt đầu"><input type="datetime-local" required min={startInput(selectedContract?.start_at)} max={dateInput(selectedContract?.end_at)} value={form.startTime} onChange={e => update("startTime", e.target.value)}/></Field><Field label="Kết thúc"><input type="datetime-local" required min={form.startTime} max={dateInput(selectedContract?.end_at)} value={form.endTime} onChange={e => update("endTime", e.target.value)}/></Field><Field label="URL đích"><input type="url" maxLength={1000} value={form.targetUrl} onChange={e => update("targetUrl", e.target.value)} placeholder="https://…"/></Field><Field label="Mô tả"><textarea rows={4} maxLength={2000} value={form.description} onChange={e => update("description", e.target.value)}/></Field></div><p>Có thể lưu nháp chưa có URL/banner/đối tượng; phải đủ các mục này trước khi gửi duyệt.</p><div className="form-actions"><button type="button" className="secondary-button" onClick={e => {if (e.currentTarget.form.reportValidity())saveDraft(false); }}>Lưu nháp và thoát</button><button disabled={!activeContracts.length}>Lưu và tiếp tục</button></div></fieldset></form>}
            {screen.id === "BUS-15" && c && <>
            <form className="dashboard-section" onSubmit={upload}><h2>Creative và URL đích</h2><fieldset className="campaign-fieldset" disabled={busy || !editable(c.status)}><Field label={`PNG/JPEG hoặc MP4 ≤ 60 giây · ${ct.width_px}
    × ${ct.height_px}
    px · tối đa 8 MB`}><input type="file" accept="image/png,image/jpeg,video/mp4" required onChange={e => {setFile(e.target.files?.[0] || null); setDirty(true); }}/></Field><Field label="URL đích"><input required type="url" maxLength={1000} value={form.targetUrl} onChange={e => update("targetUrl", e.target.value)}/></Field><details><summary>Thêm UTM để phân biệt nguồn truy cập</summary>{Object.keys(utm).map(key => <Field key={key} label={key}><input value={utm[key]} maxLength={100} onChange={e => setUtm(x => ({...x, [key]:e.target.value}))}/></Field>)}<button type="button" className="secondary-button" onClick={() => {try{update("targetUrl", withUtm(form.targetUrl, utm.source, utm.medium, utm.campaign)); } catch (e){setError(e.message); }}}>Áp dụng UTM</button></details><button disabled={!file}>Tải và lưu phiên bản mới</button>{latest && <button type="button" disabled={!!file} className="secondary-button" onClick={() => run(() => json(`/api/business/campaigns/${campaignId}`
                                , {contractId:c.contract_id, name:c.campaign_name, description:c.description, startTime:c.scheduled_start_time, endTime:c.scheduled_end_time, targetUrl:form.targetUrl, editVersion:version}, "PUT"), "Đã lưu URL thành phiên bản nháp mới.", undefined, targetChanged?{target}:{})}>Lưu URL vào bản nháp</button>}</fieldset></form>
            <section className="dashboard-section"><div className="section-heading"><h2>Xem trước trên trang báo</h2><select aria-label="Thiết bị xem trước" value={device} onChange={e => setDevice(e.target.value)}><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select></div><div className={`campaign-news-preview ${device}`
                                                                                                                                                                                                        }><header>THE PULSE <small>Xem trước · không phân phối thật</small></header><div className={ct.slot_position_snapshot === "ARTICLE_SIDEBAR"?"preview-sidebar":""}><article><h3>Bản tin hôm nay</h3><p>Bố cục mô phỏng trang báo để kiểm tra vị trí và tỷ lệ banner.</p></article><aside><small>Quảng cáo · {ct.slot_name_snapshot}</small><Media creative={preview || latest}/></aside></div></div></section>
            <form className="dashboard-section" onSubmit={e => {e.preventDefault(); run(() => json(`/api/business/campaigns/${campaignId}
    /targeting`, {...target, editVersion:version}, "PUT"), "Đã lưu đối tượng.", undefined, creativeChanged?{form}:{}); }}><h2>Đối tượng và phạm vi</h2><fieldset className="campaign-fieldset" disabled={busy || !editable(c.status)}><p>Không chọn chuyên mục/thẻ nghĩa là tất cả; vị trí, hợp đồng và lịch chạy vẫn phải hợp lệ.</p>{[["categoryIds", "Chuyên mục", workspace.categories], ["tagIds", "Thẻ", workspace.tags]].map(([key, label, items]) => <fieldset key={key}><legend>{label}</legend><div className="campaign-checkboxes">{items.map(x => <label key={x.id}><input type="checkbox" checked={target[key].includes(x.id)} onChange={() => toggleTarget(key, x.id)}/>{x.name}</label>)}</div></fieldset>)}<Field label="Quốc gia theo vùng trình duyệt"><input value={target.geoScope} maxLength={255} placeholder="ALL hoặc mã ISO, ví dụ VN,US (không định vị GPS)" onChange={e => {setTarget(x => ({...x, geoScope:e.target.value})); setDirty(true); }}/></Field><Field label="Mô tả đối tượng"><textarea maxLength={500} value={target.audience} onChange={e => {setTarget(x => ({...x, audience:e.target.value})); setDirty(true); }}/></Field><Field label="Thiết bị"><select value={target.deviceType} onChange={e => {setTarget(x => ({...x, deviceType:e.target.value})); setDirty(true); }}>{["ALL", "DESKTOP", "MOBILE", "TABLET"].map(v => <option key={v} value={v}>{v}</option>)}</select></Field><button>Lưu đối tượng</button></fieldset></form>
            <section className="dashboard-section"><h2>Lịch sử creative</h2>
                {creatives.map(cr => <article className="campaign-version" key={cr.creative_id}><strong>v{cr.version_no} · {cr.creative_type}</strong><Badge value={cr.status}/><p>{cr.width_px} × {cr.height_px} px · {Number(cr.file_size).toLocaleString()} bytes · {dateLabel(cr.created_at)}</p><a href={cr.media_url} target="_blank" rel="noreferrer">Mở phiên bản</a>{cr.status === "DRAFT" && editable(c.status) && <button className="secondary-button" disabled={busy || dirty} onClick={() => ask("Bỏ creative nháp?", "Creative đã nộp và tệp có lịch sử sẽ được giữ.", () => apiRequest(`/api/business/campaigns/${campaignId}/creatives/${cr.creative_id}`, {
                        method:"DELETE"}))}>Bỏ bản nháp</button>}</article>)}</section><Link className="button-link" to={`/business/campaigns/${campaignId}/submit`}
                                                              >Tiếp tục kiểm tra</Link>
            </>}

            {screen.id === "BUS-16" && c && <section className="dashboard-section"><h2>Kiểm tra toàn bộ hồ sơ</h2><dl><dt>Tên</dt><dd>{c.campaign_name}</dd><dt>URL</dt><dd>{c.target_url || "Chưa nhập"}</dd><dt>Lịch chạy</dt><dd>{dateLabel(c.scheduled_start_time)} → {dateLabel(c.scheduled_end_time)}</dd><dt>Đối tượng</dt><dd>{detail.targeting.device_type || "Chưa lưu"} · {detail.targeting.geo_scope || "Tất cả khu vực"}</dd></dl><Media creative={latest} className="campaign-preview"/><ul className="campaign-checks">{checks.map(x => <li key={x.code}><strong>{x.valid ? "Đạt" : "Cần sửa"} · {x.label}</strong><p>{x.message}</p>{!x.valid && <Link to={x.step === "company" ? "/business/company" : x.step === "edit" ? `/business/campaigns/edit/${campaignId}` : `/business/campaigns/${campaignId}/creative`}>Sửa mục này</Link>}</li>)}</ul><button disabled={busy || !editable(c.status) || !checks.length || checks.some(x => !x.valid)} onClick={() => ask("Xác nhận gửi xét duyệt", "Hệ thống sẽ lưu phiên bản bất biến gồm thông tin, banner và đối tượng. Bản đã nộp bị khóa sửa; quảng cáo chưa tự chạy.", () => json(`/api/business/campaigns/${campaignId}/submit`, {editVersion: version}), () => navigate(`/business/campaigns/${campaignId}`))}>Gửi chiến dịch để duyệt</button></section>
            }

            {screen.id === "BUS-17" && c && <>
            <section className="dashboard-section"><h2>
                    {c.campaign_name}
                </h2><p>{c.campaign_code || `CMP-${campaignId}`}
                </p><Badge value={c.status}
                           /><p>{c.description}
                </p><p>{dateLabel(c.scheduled_start_time)}
                    → {dateLabel(c.scheduled_end_time)}
                </p>{detail.submissions[0]?.review_note && <p role="status">Phản hồi: {detail.submissions[0].review_note}
                </p>}
                <h3>Creative đã duyệt</h3><Media creative={approved}
                                                 className="campaign-preview"/><h3>Phiên bản mới nhất</h3><Media creative={latest}
                                                 className="campaign-preview"/><div className="form-actions">{editable(c.status) && <Link className="button-link" to={`/business/campaigns/edit/${campaignId}`}
                                                                                                         >Chỉnh sửa và gửi lại</Link>}
                    {["ACTIVE", "PAUSED", "APPROVED", "SCHEDULED"].includes(c.status) && <button disabled={busy} onClick={() => ask("Yêu cầu thay creative", "Tạo bản nháp thay thế. Bản đang chạy tiếp tục cho đến khi phiên bản mới được phê duyệt và đến lịch chạy.", () => apiRequest(`/api/business/campaigns/${campaignId}/change-request`, {method: "POST"}), r => navigate(`/business/campaigns/edit/${r.id}`))}>Yêu cầu thay quảng cáo</button>
                    }
                    <Link to={`/business/performance/${campaignId}`}
                          >Xem hiệu quả</Link></div></section>
            <section className="dashboard-section"><h2>Các phiên bản đã gửi</h2>
                {detail.submissions.length?detail.submissions.map(s => <details key={s.submission_id}
                                                                                ><summary>v{s.version_no}
                        · {labels[s.status]}
                        · {dateLabel(s.submitted_at)}
                    </summary>{s.snapshot.legacyImported && <p className="info-note">Phiên bản chuyển từ yêu cầu cũ, giữ dữ liệu sẵn có tại lúc nâng cấp.</p>}
                    <p>{s.review_note || "Đang chờ quản lý xử lý."}</p><p>{s.snapshot.campaign.campaign_name}
                        · {dateLabel(s.snapshot.campaign.scheduled_start_time)}
                        → {dateLabel(s.snapshot.campaign.scheduled_end_time)}
                    </p><p>URL: {s.snapshot.campaign.target_url}
                    </p><p>Creative #{s.creative_id}
                        · {s.snapshot.targeting.device_type || "ALL"}
                        · {s.snapshot.targeting.geo_scope || "ALL"}
                    </p><Media creative={s.snapshot.creative}
                               className="campaign-preview"/></details>):<p>Chưa gửi phiên bản nào.</p>}
            </section><section className="dashboard-section"><h2>Timeline hoạt động</h2><ol>{detail.history.map(h => <li key={h.activity_id}
                                                                                                                         ><strong>{h.action}
                        </strong> · {dateLabel(h.created_at)}
                        · {h.actor_name}
                        <p>{h.note}</p></li>)}</ol></section>
            </>}
        </div>
                                < aside className = "dashboard-section campaign-contract-summary" > <h2>Hợp đồng và vị trí</h2>{selectedContract?<><strong>{selectedContract.contract_code}
        </strong><p>{selectedContract.slot_name_snapshot}
        </p><p>{dateLabel(selectedContract.start_at)}
            → {dateLabel(selectedContract.end_at)}
        </p><p>Giá trị đã ký: {money(selectedContract.total_value)}
        </p><p>Quota: {Number(selectedContract.impressions_quota_snapshot || 0).toLocaleString()}
            lượt</p><p>Đã thanh toán · không phát sinh phí khi lưu nháp chiến dịch.</p></>:<p>Chọn hợp đồng hợp lệ để tiếp tục.</p>}
        {detail && <><h3>Tiến độ quota</h3><p>{Number(detail.delivery.impressions).toLocaleString()}
            / {Number(c.impression_limit || selectedContract?.impressions_quota_snapshot || 0).toLocaleString()}
            lượt thật</p><progress aria-label="Tiến độ quota" value={Number(detail.delivery.impressions)}
                               max={Number(c.impression_limit || selectedContract?.impressions_quota_snapshot || 1)}
                               /><small>Cập nhật: {dateLabel(detail.delivery.cutoff)}
        </small><p>Quota hợp đồng dùng chung đã sử dụng: {Number(detail.delivery.contractImpressions).toLocaleString()}
            / {Number(selectedContract?.impressions_quota_snapshot || 0).toLocaleString()}
            lượt.</p><h3>Dự báo hiển thị</h3>{detail.forecast.available?<><strong>Khoảng {Number(detail.forecast.estimatedImpressions).toLocaleString()}
            lượt</strong><p>{detail.forecast.method}</p></>:<p>Chưa đủ dữ liệu thật để dự báo. Cần ít nhất 7 ngày hoàn chỉnh và 100 lượt hiển thị theo vị trí.</p>}<small>Mốc dữ liệu: 
            {dateLabel(detail.forecast.cutoff)}
        </small></>}<Link to="/business/campaigns">Về danh sách</Link></aside>
                                < /div>
        </>}

        </>}
        </>}
        <Confirm value=
                 {confirm} error={error} busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => confirm.action()}/>
</main>;
}
