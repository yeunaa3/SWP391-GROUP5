import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RequestState, formatDateTime } from "../../components/adManager/AdManagerUi.jsx";
import { getAdManagerDashboard } from "../../services/adManagerService.js";

const activityLabels = {
    SAVE_COMPANY: "Business cập nhật hồ sơ doanh nghiệp",
    SUBMIT_APPLICATION: "Business gửi hồ sơ hợp tác",
    REVIEW_PARTNERSHIP: "Ad Manager lưu ghi chú xem xét",
    DECIDE_PARTNERSHIP: "Ad Manager hoàn tất quyết định hồ sơ",
    SAVE_BOOKING_DRAFT: "Business lưu nháp yêu cầu đặt quảng cáo",
    SUBMIT_BOOKING_REQUEST: "Business gửi yêu cầu đặt quảng cáo",
    DELETE_BOOKING_DRAFT: "Business xóa nháp yêu cầu đặt quảng cáo",
    SAVE_CAMPAIGN: "Business lưu chiến dịch",
    SUBMIT_CAMPAIGN: "Business gửi chiến dịch",
};

const entityLabels = {
    COMPANY: "Doanh nghiệp",
    CONTRACT: "Hợp đồng",
    CAMPAIGN: "Chiến dịch",
};

export default function AdManagerDashboardPage() {
    const [state, setState] = useState({ loading: true, error: "", data: null });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setState(current => ({ ...current, loading: true, error: "" }));
        getAdManagerDashboard(controller.signal)
            .then(data => setState({ loading: false, error: "", data }))
            .catch(error => {
                if (!controller.signal.aborted) {
                    setState(current => ({ ...current, loading: false, error: error.message }));
                }
            });
        return () => controller.abort();
    }, [attempt]);

    const metrics = state.data ? [
        ["Hồ sơ hợp tác chờ xem xét", state.data.pendingPartnerships, "/ad-manager/partnerships"],
        ["Yêu cầu đặt quảng cáo chờ xử lý", state.data.pendingBookings, "/ad-manager/bookings"],
        ["Chiến dịch chờ duyệt", state.data.pendingCampaigns, "/ad-manager/campaigns"],
        ["Chiến dịch đang hoạt động", state.data.activeCampaigns, "/ad-manager/campaign-monitor"],
        ["Cảnh báo phân phối", state.data.deliveryAlerts, "/ad-manager/campaign-monitor"],
        ["Cảnh báo thanh toán", state.data.paymentAlerts, "/ad-manager/bookings"],
    ] : [];

    const priorityWork = state.data ? [
        [state.data.pendingPartnerships, "hồ sơ hợp tác đang chờ xem xét", "/ad-manager/partnerships", state.data.pendingPartnerships ? "urgent" : "normal"],
        [state.data.pendingBookings, "yêu cầu đặt quảng cáo đang chờ xử lý", "/ad-manager/bookings", state.data.pendingBookings ? "warning" : "normal"],
        [state.data.pendingCampaigns, "chiến dịch đang chờ duyệt", "/ad-manager/campaigns", state.data.pendingCampaigns ? "warning" : "normal"],
        [state.data.deliveryAlerts + state.data.paymentAlerts, "cảnh báo cần kiểm tra", "/ad-manager/campaign-monitor", state.data.deliveryAlerts + state.data.paymentAlerts ? "urgent" : "normal"],
    ] : [];

    return <main className="page-content ad-manager-page">
        <header className="page-heading">
            <div><p className="eyebrow">ADM-01 · TỔNG QUAN</p><h1>Quản lý quảng cáo</h1>
                <p className="page-subtitle">Theo dõi hồ sơ hợp tác, hợp đồng, chiến dịch và các cảnh báo cần xử lý.</p>
                <div className="review-live-status" aria-label="Trạng thái dữ liệu">
                    <span>Dữ liệu trực tiếp</span><span>Phân quyền Ad Manager</span><span>Có nhật ký hoạt động</span>
                </div>
            </div>
            <div className="review-header-actions">
                <Link className="button-link" to="/ad-manager/partnerships">Mở hồ sơ hợp tác</Link>
                <Link className="secondary-button" to="/ad-manager/campaigns">Mở hàng đợi chiến dịch</Link>
                <Link className="secondary-button" to="/ad-manager/campaign-monitor">Xem cảnh báo</Link>
            </div>
        </header>
        <RequestState loading={state.loading} error={state.error} onRetry={() => setAttempt(value => value + 1)} />
        {state.data && <>
            <section className="review-metrics" aria-label="Số liệu tổng quan">
                {metrics.map(([label, value, path]) => <Link to={path} className="review-metric" key={label}>
                    <span>{label}</span><strong>{Number(value).toLocaleString("vi-VN")}</strong><small>Mở danh sách →</small>
                </Link>)}
            </section>
            <div className="review-dashboard-grid">
                <section className="dashboard-section">
                    <div className="section-heading"><div><p className="section-kicker">HOẠT ĐỘNG GẦN ĐÂY</p><h2>Dấu vết nghiệp vụ</h2></div></div>
                    {state.data.recentActivity.length === 0 ? <p className="review-empty-message">Chưa có hoạt động nghiệp vụ được ghi nhận.</p> :
                        <ul className="review-activity-list">{state.data.recentActivity.map((item, index) => <li key={`${item.entityType}-${item.entityId}-${index}`}>
                            <div><strong>{activityLabels[item.action] || item.action}</strong><span>{entityLabels[item.entityType] || item.entityType} #{item.entityId}</span></div>
                            <div><span>{item.actorName}</span><time>{formatDateTime(item.createdAt)}</time></div>
                        </li>)}</ul>}
                </section>
                <aside className="dashboard-section review-priority-work">
                    <div className="section-heading"><div><p className="section-kicker">CẦN XỬ LÝ</p><h2>Công việc ưu tiên</h2></div></div>
                    <ul>{priorityWork.map(([value, label, path, level]) => <li className={`review-priority-item review-priority-item-${level}`} key={label}>
                        <Link to={path}><strong>{Number(value).toLocaleString("vi-VN")}</strong><span>{label}</span><small>Mở danh sách →</small></Link>
                    </li>)}</ul>
                </aside>
            </div>
        </>}
    </main>;
}
