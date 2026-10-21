import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RequestState, StatusBadge, formatDateTime } from "../../components/adManager/AdManagerUi.jsx";
import { getBookingQueue } from "../../services/adManagerService.js";

function filtersFrom(params) {
    return {
        q: params.get("q") || "",
        status: params.get("status") || "",
        from: params.get("from") || "",
        to: params.get("to") || "",
        page: params.get("page") || "0",
        size: "20",
    };
}

function formatMoney(amount, currency) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currency || "VND",
    }).format(Number(amount || 0));
}

export default function AdManagerBookingQueuePage() {
    const [params, setParams] = useSearchParams();
    const filters = useMemo(() => filtersFrom(params), [params]);
    const [state, setState] = useState({ loading: true, error: "", data: null });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setState(current => ({ ...current, loading: true, error: "" }));
        getBookingQueue(filters, controller.signal)
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
        for (const key of ["q", "status", "from", "to"]) {
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

    const returnTo = "/ad-manager/bookings" + (params.size ? "?" + params.toString() : "");
    return <main className="page-content ad-manager-page">
        <header className="page-heading">
            <div>
                <p className="eyebrow">ADM-04 · UC-23</p>
                <h1>Yêu cầu đặt quảng cáo chờ xem xét</h1>
                <p className="page-subtitle">Danh sách yêu cầu mới đang chờ Ad Manager xử lý.</p>
            </div>
            <Link className="secondary-button" to="/ad-manager">Về tổng quan</Link>
        </header>
        <section className="dashboard-section">
            <form className="review-filters" key={params.toString()} onSubmit={applyFilters}>
                <label className="review-filter-search">
                    <span>Tìm booking</span>
                    <input name="q" maxLength="150" defaultValue={filters.q} placeholder="Mã booking, tên booking, doanh nghiệp" />
                </label>
                <label>
                    <span>Trạng thái</span>
                    <select name="status" defaultValue={filters.status}>
                        <option value="">Tất cả</option>
                        <option value="PENDING_REVIEW">Chờ xem xét</option>
                    </select>
                </label>
                <label><span>Từ ngày gửi</span><input type="date" name="from" defaultValue={filters.from} /></label>
                <label><span>Đến ngày gửi</span><input type="date" name="to" min={filters.from || undefined} defaultValue={filters.to} /></label>
                <div className="review-filter-actions">
                    <button type="submit">Áp dụng</button>
                    <button type="button" className="secondary-button" onClick={() => setParams({})}>Xóa lọc</button>
                </div>
            </form>
        </section>
        <RequestState loading={state.loading} error={state.error} onRetry={() => setAttempt(value => value + 1)} />
        {state.data && <section className="dashboard-section">
            <div className="section-heading">
                <div><p className="section-kicker">HÀNG CHỜ</p><h2>{state.data.total} yêu cầu</h2></div>
                <span>Yêu cầu gửi sớm hơn hiển thị trước</span>
            </div>
            {state.data.items.length === 0 ? <div className="review-empty" role="status">
                <h3>Chưa có yêu cầu phù hợp</h3><p>Hãy thay đổi bộ lọc hoặc kiểm tra lại sau.</p>
            </div> : <div className="review-table-wrap"><table className="review-table">
                <thead><tr><th>Mã booking</th><th>Doanh nghiệp</th><th>Vị trí</th><th>Thời gian quảng cáo</th><th>Giá trị dự kiến</th><th>Trạng thái</th><th></th></tr></thead>
                <tbody>{state.data.items.map(item => <tr key={item.contractId}>
                    <td><strong>{item.contractCode}</strong><small>{item.contractName}</small></td>
                    <td>{item.companyName}</td>
                    <td>{item.slotName}</td>
                    <td>{formatDateTime(item.startAt)}<small>đến {formatDateTime(item.endAt)}</small></td>
                    <td>{formatMoney(item.totalValue, item.currency)}</td>
                    <td><StatusBadge value={item.status} /><small>Gửi lúc {formatDateTime(item.submittedAt)}</small></td>
                    <td><Link className="review-open-link" to={"/ad-manager/bookings/" + item.contractId + "/proposal?returnTo=" + encodeURIComponent(returnTo)}>Mở yêu cầu →</Link></td>
                </tr>)}</tbody>
            </table></div>}
            <nav className="review-pagination" aria-label="Phân trang yêu cầu booking">
                <button className="secondary-button" disabled={state.data.page === 0} onClick={() => changePage(state.data.page - 1)}>Trang trước</button>
                <span>Trang {state.data.totalPages === 0 ? 0 : state.data.page + 1} / {state.data.totalPages}</span>
                <button className="secondary-button" disabled={state.data.page + 1 >= state.data.totalPages} onClick={() => changePage(state.data.page + 1)}>Trang sau</button>
            </nav>
        </section>}
    </main>;
}
