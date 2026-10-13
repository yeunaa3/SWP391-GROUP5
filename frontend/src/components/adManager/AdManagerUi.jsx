export const statusLabels = {
    PENDING_REVIEW: "Chờ xem xét",
    RESUBMITTED: "Đã gửi lại",
    NEEDS_REVISION: "Cần chỉnh sửa",
    APPROVED: "Đã phê duyệt",
    REJECTED: "Đã từ chối",
};

export const priorityLabels = {
    NORMAL: "Bình thường",
    HIGH: "Cao",
    URGENT: "Khẩn cấp",
};

export function formatDateTime(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(value));
}

export function StatusBadge({ value }) {
    return <span className={`review-badge review-badge-${value.toLowerCase()}`}>
        {statusLabels[value] || value}
    </span>;
}

export function PriorityBadge({ value }) {
    return <span className={`review-priority review-priority-${value.toLowerCase()}`}>
        {priorityLabels[value] || value}
    </span>;
}

export function RequestState({ loading, error, onRetry }) {
    if (loading) return <div className="review-state" role="status">Đang tải dữ liệu…</div>;
    if (!error) return null;
    return <div className="review-state review-state-error" role="alert">
        <p>{error}</p>
        <button type="button" className="secondary-button" onClick={onRetry}>Thử lại</button>
    </div>;
}
