import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { RequestState, StatusBadge, PriorityBadge, formatDateTime } from "../../components/adManager/AdManagerUi.jsx";
import { decidePartnership, documentUrl, getPartnership, savePartnershipNote } from "../../services/adManagerService.js";

const decisionLabels = {
    APPROVED: "Phê duyệt",
    NEEDS_REVISION: "Yêu cầu chỉnh sửa",
    REJECTED: "Từ chối",
    NOTE: "Đã lưu ghi chú",
};

export default function PartnershipDetailPage() {
    const { companyId } = useParams();
    const [params] = useSearchParams();
    const [state, setState] = useState({ loading: true, error: "", data: null });
    const [attempt, setAttempt] = useState(0);
    const [note, setNote] = useState("");
    const [decision, setDecision] = useState("APPROVED");
    const [reason, setReason] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        setState(current => ({ ...current, loading: true, error: "" }));
        getPartnership(companyId, controller.signal)
            .then(data => {
                setState({ loading: false, error: "", data });
                setNote(data.savedNote || "");
            })
            .catch(error => {
                if (!controller.signal.aborted) setState({ loading: false, error: error.message, data: null });
            });
        return () => controller.abort();
    }, [companyId, attempt]);

    const rawReturnTo = params.get("returnTo");
    const returnTo = rawReturnTo === "/ad-manager/partnerships" || rawReturnTo?.startsWith("/ad-manager/partnerships?")
        ? rawReturnTo : "/ad-manager/partnerships";
    const company = state.data?.company;
    const reviewable = company && ["PENDING_REVIEW", "RESUBMITTED"].includes(company.status);

    async function saveNote(event) {
        event.preventDefault();
        setSaving(true); setFeedback("");
        try {
            const data = await savePartnershipNote(companyId, company.applicationVersion, note);
            setState({ loading: false, error: "", data });
            setNote(data.savedNote);
            setFeedback("Đã lưu ghi chú cho đúng phiên bản hồ sơ hiện tại.");
        } catch (error) { setFeedback(error.message); }
        finally { setSaving(false); }
    }

    async function submitDecision(event) {
        event.preventDefault();
        setSaving(true); setFeedback("");
        try {
            const data = await decidePartnership(companyId, company.applicationVersion, decision, reason);
            setState({ loading: false, error: "", data });
            setConfirmed(false); setReason("");
            setFeedback(`Đã hoàn tất quyết định: ${decisionLabels[decision]}. Business đã nhận thông báo trong hệ thống.`);
        } catch (error) { setFeedback(error.message); }
        finally { setSaving(false); }
    }

    return <main className="page-content ad-manager-page">
        <header className="page-heading"><div><p className="eyebrow">ADM-03 · UC-19 / UC-20</p><h1>Xem xét hồ sơ hợp tác</h1>
            <p className="page-subtitle">Kiểm tra phiên bản đã gửi, tài liệu pháp lý, lưu ghi chú rồi mới ra quyết định.</p></div>
            <Link className="secondary-button" to={returnTo}>← Về hàng chờ</Link>
        </header>
        <RequestState loading={state.loading} error={state.error} onRetry={() => setAttempt(value => value + 1)} />
        {feedback && <p className="review-feedback" role="status">{feedback}</p>}
        {company && <>
            <section className="review-summary">
                <div><span>Mã hồ sơ</span><strong>{company.applicationCode}</strong></div>
                <div><span>Phiên bản đang xem</span><strong>v{company.applicationVersion}</strong></div>
                <div><span>Trạng thái</span><StatusBadge value={company.status} /></div>
                <div><span>Ưu tiên</span><PriorityBadge value={company.priority} /></div>
                <div><span>Thời điểm gửi</span><strong>{formatDateTime(company.submittedAt)}</strong></div>
            </section>

            {company.status === "RESUBMITTED" && <p className="review-notice">Đây là hồ sơ gửi lại. Thông tin và tài liệu bên dưới thuộc phiên bản v{company.applicationVersion}.</p>}

            <div className="review-detail-grid">
                <section className="dashboard-section">
                    <p className="section-kicker">THÔNG TIN DOANH NGHIỆP</p><h2>{company.companyName}</h2>
                    <dl className="review-fields">
                        <div><dt>Mã số thuế</dt><dd>{company.taxCode}</dd></div>
                        <div><dt>Email</dt><dd>{company.email}</dd></div>
                        <div><dt>Điện thoại</dt><dd>{company.phone}</dd></div>
                        <div><dt>Địa chỉ</dt><dd>{company.address}</dd></div>
                        <div><dt>Ngành nghề</dt><dd>{company.industry || "Chưa cung cấp trong phiên bản cũ"}</dd></div>
                        <div><dt>Người liên hệ</dt><dd>{company.contactPerson || "Chưa cung cấp trong phiên bản cũ"}</dd></div>
                        <div><dt>Địa chỉ thanh toán</dt><dd>{company.billingAddress || "Chưa cung cấp"}</dd></div>
                    </dl>
                </section>
                <aside className={`dashboard-section review-validation ${state.data.validation.canApprove ? "is-valid" : "is-warning"}`}>
                    <p className="section-kicker">KIỂM TRA TỰ ĐỘNG</p><h2>Tóm tắt hợp lệ</h2>
                    <strong>{state.data.validation.availableDocuments}/{state.data.validation.totalDocuments} tài liệu có thể mở</strong>
                    <p>{state.data.validation.message}</p>
                </aside>
            </div>

            <section className="dashboard-section">
                <div className="section-heading"><div><p className="section-kicker">TÀI LIỆU PHÁP LÝ</p><h2>Tài liệu của phiên bản v{company.applicationVersion}</h2></div></div>
                {state.data.documents.length === 0 ? <div className="review-empty"><h3>Chưa có tài liệu</h3><p>Không thể phê duyệt hồ sơ này. Có thể yêu cầu Business chỉnh sửa và gửi lại.</p></div> :
                    <ul className="review-document-list">{state.data.documents.map(document => <li key={document.documentId}>
                        <div><strong>{document.fileName}</strong><span>{document.documentType} · v{document.version} · {formatDateTime(document.uploadedAt)}</span></div>
                        {document.available ? <a href={documentUrl(document.viewUrl)} target="_blank" rel="noopener noreferrer">Mở tài liệu ↗</a> : <span className="review-unavailable">Không khả dụng</span>}
                    </li>)}</ul>}
            </section>

            <section className="dashboard-section">
                <p className="section-kicker">BƯỚC 1 · UC-19</p><h2>Ghi chú xem xét</h2>
                <p>Ghi chú được gắn với phiên bản v{company.applicationVersion}. Lưu ghi chú không thay đổi trạng thái hồ sơ.</p>
                <form className="review-note-form" onSubmit={saveNote}>
                    <label><span>Nội dung xem xét</span><textarea rows="5" maxLength="2000" required disabled={!reviewable || saving} value={note} onChange={event => setNote(event.target.value)} placeholder="Ghi rõ thông tin và tài liệu đã kiểm tra…" /></label>
                    <button type="submit" disabled={!reviewable || saving || !note.trim()}>{saving ? "Đang lưu…" : "Lưu ghi chú"}</button>
                </form>
            </section>

            <section className="dashboard-section">
                <p className="section-kicker">BƯỚC 2 · UC-20</p><h2>Quyết định hồ sơ</h2>
                {!reviewable ? <p>Hồ sơ đã có quyết định cuối hoặc đang chờ Business chỉnh sửa.</p> : !state.data.reviewReady ? <p>Hãy lưu ghi chú xem xét trước khi ra quyết định.</p> :
                    <form className="review-decision-form" onSubmit={submitDecision}>
                        <fieldset><legend>Chọn quyết định</legend>
                            {["APPROVED", "NEEDS_REVISION", "REJECTED"].map(value => <label key={value} className={decision === value ? "is-selected" : ""}>
                                <input type="radio" name="decision" value={value} checked={decision === value} onChange={() => { setDecision(value); setConfirmed(false); }} />{decisionLabels[value]}
                            </label>)}
                        </fieldset>
                        {decision !== "APPROVED" && <label><span>Lý do bắt buộc</span><textarea rows="4" maxLength="2000" required value={reason} onChange={event => setReason(event.target.value)} placeholder={decision === "REJECTED" ? "Nêu rõ lý do từ chối…" : "Liệt kê nội dung Business cần sửa…"} /></label>}
                        {decision === "APPROVED" && !state.data.validation.canApprove && <p className="review-blocked">Không thể phê duyệt vì tài liệu của phiên bản này chưa đầy đủ hoặc không mở được.</p>}
                        <label className="review-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Tôi xác nhận quyết định áp dụng cho phiên bản v{company.applicationVersion}.</label>
                        <button type="submit" disabled={saving || !confirmed || (decision === "APPROVED" && !state.data.validation.canApprove) || (decision !== "APPROVED" && !reason.trim())}>{saving ? "Đang xử lý…" : `Xác nhận ${decisionLabels[decision].toLowerCase()}`}</button>
                    </form>}
            </section>

            <section className="dashboard-section">
                <p className="section-kicker">LỊCH SỬ</p><h2>Ghi chú và quyết định</h2>
                {state.data.history.length === 0 ? <p>Chưa có hoạt động xem xét.</p> : <ol className="review-history">{state.data.history.map((event, index) => <li key={`${event.createdAt}-${index}`}>
                    <div><strong>{decisionLabels[event.decision] || event.decision}</strong><span>{event.reviewerName} · {formatDateTime(event.createdAt)}</span></div><p>{event.note}</p>
                </li>)}</ol>}
            </section>
        </>}
    </main>;
}
