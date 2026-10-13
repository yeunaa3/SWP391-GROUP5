import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PriorityBadge, RequestState, StatusBadge, formatDateTime } from "../../components/adManager/AdManagerUi.jsx";
import { getPartnershipQueue } from "../../services/adManagerService.js";

function filtersFrom(params) {
    return {
        q: params.get("q") || "",
        status: params.get("status") || "",
        priority: params.get("priority") || "",
        from: params.get("from") || "",
        to: params.get("to") || "",
        page: params.get("page") || "0",
        size: "20",
    };
}

export default function PartnershipQueuePage() {
    const [params, setParams] = useSearchParams();
    const filters = useMemo(() => filtersFrom(params), [params]);
    const [state, setState] = useState({ loading: true, error: "", data: null });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setState(current => ({ ...current, loading: true, error: "" }));
        getPartnershipQueue(filters, controller.signal)
            .then(data => setState({ loading: false, error: "", data }))
            .catch(error => {
                if (!controller.signal.aborted) setState({ loading: false, error: error.message, data: null });
            });
        return () => controller.abort();
    }, [filters, attempt]);

    function applyFilters(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const next = new URLSearchParams();
        for (const key of ["q", "status", "priority", "from", "to"]) {
            const value = String(form.get(key) || "").trim();
            if (value) next.set(key, value);
        }
        setParams(next);
    }

    function changePage(page) {
        const next = new URLSearchParams(params);
        if (page > 0) next.set("page", String(page)); else next.delete("page");
        setParams(next);
    }

    const returnTo = `/ad-manager/partnerships${params.size ? `?${params}` : ""}`;
    return <main className="page-content ad-manager-page">
        <header className="page-heading"><div><p className="eyebrow">ADM-02 · UC-19</p><h1>Hồ sơ hợp tác chờ xem xét</h1>
            <p className="page-subtitle">Danh sách chỉ gồm hồ sơ mới gửi và hồ sơ Business đã chỉnh sửa, gửi lại.</p></div>
            <Link className="secondary-button" to="/ad-manager">Về tổng quan</Link>
        </header>
        <section className="dashboard-section">
            <form className="review-filters" key={params.toString()} onSubmit={applyFilters}>
                <label className="review-filter-search"><span>Tìm hồ sơ</span><input name="q" maxLength="150" defaultValue={filters.q} placeholder="Mã hồ sơ, doanh nghiệp, mã số thuế" /></label>
                <label><span>Trạng thái</span><select name="status" defaultValue={filters.status}><option value="">Tất cả</option><option value="PENDING_REVIEW">Chờ xem xét</option><option value="RESUBMITTED">Đã gửi lại</option></select></label>
                <label><span>Ưu tiên</span><select name="priority" defaultValue={filters.priority}><option value="">Tất cả</option><option value="URGENT">Khẩn cấp</option><option value="HIGH">Cao</option><option value="NORMAL">Bình thường</option></select></label>
                <label><span>Từ ngày</span><input type="date" name="from" defaultValue={filters.from} /></label>
                <label><span>Đến ngày</span><input type="date" name="to" min={filters.from || undefined} defaultValue={filters.to} /></label>
                <div className="review-filter-actions"><button type="submit">Áp dụng</button><button type="button" className="secondary-button" onClick={() => setParams({})}>Xóa lọc</button></div>
            </form>
        </section>
        <RequestState loading={state.loading} error={state.error} onRetry={() => setAttempt(value => value + 1)} />
        {state.data && <section className="dashboard-section">
            <div className="section-heading"><div><p className="section-kicker">HÀNG CHỜ</p><h2>{state.data.total} hồ sơ</h2></div><span>Ưu tiên cao và hồ sơ gửi sớm hiển thị trước</span></div>
            {state.data.items.length === 0 ? <div className="review-empty" role="status"><h3>Không có hồ sơ phù hợp</h3><p>Hãy đổi bộ lọc hoặc chờ Business gửi hồ sơ mới.</p></div> :
                <div className="review-table-wrap"><table className="review-table">
                    <thead><tr><th>Mã hồ sơ</th><th>Doanh nghiệp</th><th>Phiên bản</th><th>Thời điểm gửi</th><th>Trạng thái</th><th>Ưu tiên</th><th></th></tr></thead>
                    <tbody>{state.data.items.map(item => <tr key={item.companyId}>
                        <td><strong>{item.applicationCode}</strong></td>
                        <td>{item.companyName}<small>MST: {item.taxCode} · {item.documentCount} tài liệu</small></td>
                        <td>v{item.applicationVersion}</td><td>{formatDateTime(item.submittedAt)}</td>
                        <td><StatusBadge value={item.status} /></td><td><PriorityBadge value={item.priority} /></td>
                        <td><Link className="review-open-link" to={`/ad-manager/partnerships/${item.companyId}?returnTo=${encodeURIComponent(returnTo)}`}>Mở xem xét →</Link></td>
                    </tr>)}</tbody>
                </table></div>}
            <nav className="review-pagination" aria-label="Phân trang hồ sơ">
                <button className="secondary-button" disabled={state.data.page === 0} onClick={() => changePage(state.data.page - 1)}>Trang trước</button>
                <span>Trang {state.data.totalPages === 0 ? 0 : state.data.page + 1} / {state.data.totalPages}</span>
                <button className="secondary-button" disabled={state.data.page + 1 >= state.data.totalPages} onClick={() => changePage(state.data.page + 1)}>Trang sau</button>
            </nav>
        </section>}
    </main>;
}
