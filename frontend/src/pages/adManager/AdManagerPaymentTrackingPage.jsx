import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    closeExpiredContract,
    getContractStatus,
    getContractStatusQueue,
    sendContractPaymentReminder,
} from "../../services/adManagerService.js";

function showMoney(value, currency = "VND") {
    if (value == null) return "—";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(Number(value));
}

function showDateTime(value) {
    return value ? String(value).replace("T", " ").slice(0, 16) : "—";
}

const statusLabels = {
    ACCEPTED: "Đã chấp nhận",
    PENDING_PAYMENT: "Chờ thanh toán",
    PAYMENT_FAILED: "Thanh toán thất bại",
    ACTIVE: "Đang hiệu lực",
    EXPIRED: "Đã hết hạn",
    CANCELLED: "Đã hủy",
    COMPLETED: "Đã hoàn tất",
    PENDING: "Chờ thanh toán",
    PAID: "Đã thanh toán",
    FAILED: "Thất bại",
    UNPAID: "Chưa thanh toán",
};

export default function AdManagerPaymentTrackingPage() {
    const { contractId } = useParams();
    return contractId
        ? <PaymentTrackingDetailPage contractId={contractId} />
        : <PaymentTrackingQueuePage />;
}

function PaymentTrackingDetailPage({ contractId }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState("");
    const [busy, setBusy] = useState(false);
    const [attempt, setAttempt] = useState(0);

    const refresh = useCallback(async (signal) => {
        setLoading(true);
        setError("");
        try {
            const data = await getContractStatus(contractId, signal);
            setDetail(data);
        } catch (requestError) {
            if (!signal?.aborted) setError(requestError.message);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [contractId]);

    useEffect(() => {
        const controller = new AbortController();
        refresh(controller.signal);
        return () => controller.abort();
    }, [refresh, attempt]);

    async function runAction(action, successMessage) {
        if (!detail) return;
        setBusy(true);
        setFeedback("");
        try {
            const revisionNo = detail.contract.revisionNo;
            let updated;
            if (action === "SEND_PAYMENT_REMINDER") {
                updated = await sendContractPaymentReminder(contractId, revisionNo);
                setDetail(updated);
            } else {
                updated = await closeExpiredContract(contractId, revisionNo);
                setDetail(updated);
            }
            setFeedback(successMessage);
        } catch (requestError) {
            setFeedback(requestError.message);
        } finally {
            setBusy(false);
        }
    }

    const contract = detail?.contract;
    const actions = detail?.allowedActions || [];

    return (
        <main className="page-content ad-manager-page">
            <header className="page-heading">
                <div>
                    <p className="eyebrow">ADM-06 · THEO DÕI THANH TOÁN</p>
                    <h1>Theo dõi thanh toán hợp đồng</h1>
                    <p className="page-subtitle">Theo dõi trạng thái thanh toán, gửi nhắc thanh toán hoặc đóng booking quá hạn.</p>
                </div>
                <div className="form-actions">
                    <Link className="secondary-button" to="/ad-manager/contracts">Danh sách hợp đồng</Link>
                    <button className="secondary-button" type="button" disabled={loading} onClick={() => setAttempt((value) => value + 1)}>Làm mới</button>
                </div>
            </header>

            {loading && <p role="status">Đang tải hợp đồng…</p>}
            {!loading && error && (
                <section className="info-note" role="alert">
                    <p>{error}</p>
                    <button className="secondary-button" type="button" onClick={() => setAttempt((value) => value + 1)}>Tải lại</button>
                </section>
            )}

            {!loading && contract && (
                <>
                    <section className="dashboard-section">
                        <h2>Tình trạng thanh toán</h2>
                        <dl className="business-details">
                            <div><dt>Mã hợp đồng</dt><dd>{contract.contractCode}</dd></div>
                            <div><dt>Doanh nghiệp</dt><dd>{contract.companyName}</dd></div>
                            <div><dt>Gói quảng cáo</dt><dd>{contract.packageName || "—"}</dd></div>
                            <div><dt>Ad slot</dt><dd>{contract.slotName || "—"}{contract.slotPosition ? ` · ${contract.slotPosition}` : ""}</dd></div>
                            <div><dt>Thời gian booking</dt><dd>{showDateTime(contract.startAt)} – {showDateTime(contract.endAt)}</dd></div>
                            <div><dt>Giá trị hợp đồng</dt><dd>{showMoney(contract.totalValue, contract.currency)}</dd></div>
                            <div><dt>Trạng thái hợp đồng</dt><dd>{statusLabels[contract.status] || contract.status}</dd></div>
                            <div><dt>Trạng thái thanh toán</dt><dd>{statusLabels[contract.paymentStatus] || contract.paymentStatus}</dd></div>
                            <div><dt>Hạn thanh toán</dt><dd>{showDateTime(contract.paymentDueAt)}</dd></div>
                        </dl>
                    </section>

                    <section className="dashboard-section">
                        <h2>Thao tác thanh toán</h2>
                        {detail.lastPaymentReminderAt && <p>Nhắc thanh toán gần nhất: {showDateTime(detail.lastPaymentReminderAt)}</p>}
                        <div className="form-actions">
                            {actions.includes("SEND_PAYMENT_REMINDER") && (
                                <button type="button" disabled={busy} onClick={() => runAction(
                                    "SEND_PAYMENT_REMINDER",
                                    "Đã gửi thông báo nhắc thanh toán cho doanh nghiệp.",
                                )}>
                                    {busy ? "Đang gửi…" : "Gửi nhắc thanh toán"}
                                </button>
                            )}
                            {actions.includes("CLOSE_BOOKING") && (
                                <button type="button" className="secondary-button" disabled={busy} onClick={() => {
                                    if (window.confirm("Đóng booking đã hết hạn thanh toán? Doanh nghiệp sẽ không thể tiếp tục thanh toán theo trạng thái booking này.")) {
                                        runAction("CLOSE_BOOKING", "Đã đóng booking quá hạn.");
                                    }
                                }}>
                                    {busy ? "Đang đóng…" : "Đóng booking quá hạn"}
                                </button>
                            )}
                        </div>
                    </section>

                    {feedback && <p className="info-note" role="status">{feedback}</p>}
                </>
            )}
        </main>
    );
}

function PaymentTrackingQueuePage() {
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [filters, setFilters] = useState({ q: "", status: "", page: 0, size: 20 });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        getContractStatusQueue(filters, controller.signal)
            .then((result) => setData(result))
            .catch((requestError) => {
                if (!controller.signal.aborted) setError(requestError.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [filters, attempt]);

    function applyFilters(event) {
        event.preventDefault();
        setFilters({ q: searchText.trim(), status: statusFilter, page: 0, size: 20 });
    }

    function clearFilters() {
        setSearchText("");
        setStatusFilter("");
        setFilters({ q: "", status: "", page: 0, size: 20 });
    }

    return (
        <main className="page-content ad-manager-page">
            <header className="page-heading">
                <div>
                    <p className="eyebrow">ADM-06 · THEO DÕI THANH TOÁN</p>
                    <h1>Theo dõi thanh toán hợp đồng</h1>
                    <p className="page-subtitle">Tìm hợp đồng theo trạng thái thanh toán hoặc trạng thái hiệu lực.</p>
                </div>
                <button className="secondary-button" type="button" disabled={loading} onClick={() => setAttempt((value) => value + 1)}>Làm mới</button>
            </header>

            <section className="dashboard-section">
                <form className="review-filters" onSubmit={applyFilters}>
                    <label>
                        <span>Tìm hợp đồng</span>
                        <input
                            type="search"
                            maxLength={150}
                            value={searchText}
                            onChange={(event) => setSearchText(event.target.value)}
                            placeholder="Mã hợp đồng hoặc doanh nghiệp…"
                        />
                    </label>
                    <label>
                        <span>Trạng thái hợp đồng</span>
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                            <option value="">Tất cả trạng thái</option>
                            {["PENDING_PAYMENT", "PAYMENT_FAILED", "ACTIVE", "EXPIRED", "CANCELLED", "COMPLETED"]
                                .map((status) => <option key={status} value={status}>{statusLabels[status] || status}</option>)}
                        </select>
                    </label>
                    <div className="review-filter-actions">
                        <button type="submit">Áp dụng</button>
                        <button type="button" className="secondary-button" onClick={clearFilters}>Xóa lọc</button>
                    </div>
                </form>
            </section>

            {loading && <p role="status">Đang tải danh sách hợp đồng…</p>}
            {!loading && error && (
                <section className="info-note" role="alert">
                    <p>{error}</p>
                    <button className="secondary-button" type="button" onClick={() => setAttempt((value) => value + 1)}>Tải lại</button>
                </section>
            )}

            {!loading && data && (
                <section className="dashboard-section">
                    <div className="section-heading">
                        <div><p className="section-kicker">DANH SÁCH THANH TOÁN</p><h2>{data.total} hợp đồng</h2></div>
                    </div>
                    {data.items.length === 0 ? (
                        <div className="review-empty" role="status">
                            <h3>Không có hợp đồng phù hợp</h3>
                            <p>Thử thay đổi bộ lọc hoặc xóa lọc để xem lại danh sách.</p>
                        </div>
                    ) : (
                        <div className="review-table-wrap">
                            <table className="review-table">
                                <thead><tr>
                                    <th>Mã hợp đồng</th><th>Doanh nghiệp</th><th>Gói / ad slot</th><th>Thời gian booking</th>
                                    <th>Số tiền</th><th>Thanh toán</th><th>Hợp đồng</th><th>Hạn thanh toán</th><th></th>
                                </tr></thead>
                                <tbody>{data.items.map((item) => (
                                    <tr key={item.contractId}>
                                        <td><strong>{item.contractCode}</strong></td>
                                        <td>{item.companyName}</td>
                                        <td>{item.packageName || "—"}<small>{item.slotName || "—"}</small></td>
                                        <td>{showDateTime(item.startAt)}<small>đến {showDateTime(item.endAt)}</small></td>
                                        <td>{showMoney(item.totalValue, item.currency)}</td>
                                        <td><span className="status-pill">{statusLabels[item.paymentStatus] || item.paymentStatus}</span></td>
                                        <td><span className="status-pill">{statusLabels[item.status] || item.status}</span></td>
                                        <td>{showDateTime(item.paymentDueAt)}</td>
                                        <td><Link className="review-open-link" to={`/ad-manager/contracts/${item.contractId}`}>Chi tiết</Link></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                    <nav className="review-pagination" aria-label="Phân trang hợp đồng">
                        <button className="secondary-button" disabled={data.page === 0} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Trang trước</button>
                        <span>Trang {data.totalPages === 0 ? 0 : data.page + 1} / {data.totalPages}</span>
                        <button className="secondary-button" disabled={data.page + 1 >= data.totalPages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Trang sau</button>
                    </nav>
                </section>
            )}
        </main>
    );
}
