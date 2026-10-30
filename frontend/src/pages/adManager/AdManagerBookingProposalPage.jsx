import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getBookingDetail, saveBookingProposal, sendBookingProposal, requestAnotherBookingPeriod } from "../../services/adManagerService.js";

function showDate(value) {
    return value ? String(value).slice(0, 10) : "—";
}

function showMoney(value, currency = "VND") {
    if (value == null) return "—";

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(Number(value));
}


function defaultExpiryValue() {
    const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}

export default function AdManagerBookingProposalPage() {
    const { contractId } = useParams();
    const [searchParams] = useSearchParams();
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [proposalForm, setProposalForm] = useState({
        startDate: "",
        endDate: "",
        commercialTerms: "",
        expiresAt: "",
    });
    const [saving, setSaving] = useState(false);
    const [sendingProposal, setSendingProposal] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [periodReason, setPeriodReason] = useState("");
    const [showPeriodRequest, setShowPeriodRequest] = useState(false);
    const [requestingPeriod, setRequestingPeriod] = useState(false);
    const [periodFeedback, setPeriodFeedback] = useState("");

    const requestedReturnTo = searchParams.get("returnTo");
    const returnTo = requestedReturnTo?.startsWith("/ad-manager/bookings")
        ? requestedReturnTo
        : "/ad-manager/bookings";

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        setError("");

        getBookingDetail(contractId, controller.signal)
            .then((data) => {
                setDetail(data);
                const latest = data.latestProposal;
                const draft = latest?.status === "DRAFT" ? latest : null;
                const editableProposal =
                    ["DRAFT", "REVISION_REQUESTED"].includes(latest?.status)
                        ? latest
                        : null;

                setProposalForm({
                    startDate: String(
                        editableProposal?.proposedStartAt ?? data.booking.startAt,
                    ).slice(0, 10),
                    endDate: String(
                        editableProposal?.proposedEndAt ?? data.booking.endAt,
                    ).slice(0, 10),
                    commercialTerms: editableProposal?.commercialTerms ?? "",
                    expiresAt: String(
                        draft?.expiresAt ?? defaultExpiryValue(),
                    ).slice(0, 16),
                });
                setLoading(false);
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) {
                    setError(requestError.message);
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [contractId, attempt]);

    const booking = detail?.booking;

    async function saveProposal(event) {
        event.preventDefault();
        setSaving(true);
        setFeedback("");

        try {
            const updated = await saveBookingProposal(contractId, {
                expectedRevisionNo: booking.revisionNo,
                commercialTerms: proposalForm.commercialTerms,
                proposedStartAt: `${proposalForm.startDate}T00:00:00`,
                proposedEndAt: `${proposalForm.endDate}T00:00:00`,
                expiresAt: `${proposalForm.expiresAt}:00`,
            });

            setDetail(updated);
            setFeedback("Đã lưu đề xuất.");
        } catch (requestError) {
            setFeedback(requestError.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleSendProposal() {
        setSendingProposal(true);
        setFeedback("");

        try {
            const updated = await sendBookingProposal(
                contractId,
                booking.revisionNo,
            );

            setDetail(updated);
            setFeedback("Đã gửi đề xuất cho Business.");
        } catch (requestError) {
            setFeedback(requestError.message);
        } finally {
            setSendingProposal(false);
        }
    }

    async function handleRequestAnotherPeriod() {
        const reason = periodReason.trim();
        if (!reason || !booking) return;

        setRequestingPeriod(true);
        setPeriodFeedback("");

        try {
            const updated = await requestAnotherBookingPeriod(
                contractId,
                booking.revisionNo,
                reason,
            );

            setDetail(updated);
            setPeriodReason("");
            setPeriodFeedback("Đã gửi yêu cầu Business chọn kỳ khác.");
        } catch (requestError) {
            setPeriodFeedback(requestError.message);
        } finally {
            setRequestingPeriod(false);
        }
    }

    return (
        <main className="page-content ad-manager-page">
            <header className="page-heading">
                <div>
                    <p className="eyebrow">ADM-05 · ĐỀ XUẤT ĐẶT QUẢNG CÁO</p>
                    <h1>Kiểm tra booking và lập đề xuất</h1>
                    <p className="page-subtitle">
                        Kiểm tra lịch, giá và điều khoản trước khi gửi đề xuất cho Business.
                    </p>
                </div>
                <Link className="secondary-button" to={returnTo}>
                    Quay lại hàng chờ
                </Link>
            </header>

            {loading && <p role="status">Đang tải thông tin booking…</p>}

            {!loading && error && (
                <section className="info-note" role="alert">
                    <p>{error}</p>
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setAttempt((value) => value + 1)}
                    >
                        Tải lại
                    </button>
                </section>
            )}

            {!loading && !error && booking && (
                <>
                    <section className="dashboard-section">
                        <h2>Thông tin booking</h2>
                        <dl className="business-details">
                            <div>
                                <dt>Mã booking</dt>
                                <dd>{booking.contractCode}</dd>
                            </div>
                            <div>
                                <dt>Giá đề xuất theo snapshot</dt>
                                <dd>{showMoney(booking.calculatedProposalAmount, booking.currency)}</dd>
                            </div>
                            <div>
                                <dt>Tên yêu cầu</dt>
                                <dd>{booking.contractName}</dd>
                            </div>
                            <div>
                                <dt>Doanh nghiệp</dt>
                                <dd>{booking.companyName}</dd>
                            </div>
                            <div>
                                <dt>Gói quảng cáo</dt>
                                <dd>{booking.packageName}</dd>
                            </div>
                            <div>
                                <dt>Vị trí</dt>
                                <dd>{booking.slotName} · {booking.slotPosition}</dd>
                            </div>
                            <div>
                                <dt>Thời gian yêu cầu</dt>
                                <dd>
                                    {showDate(booking.startAt)} đến {showDate(booking.endAt)}
                                </dd>
                            </div>
                            <div>
                                <dt>Giá booking hiện tại</dt>
                                <dd>{showMoney(booking.totalValue, booking.currency)}</dd>
                            </div>
                            <div>
                                <dt>Trạng thái</dt>
                                <dd>{booking.status}</dd>
                            </div>
                        </dl>
                    </section>

                    {detail.latestProposal?.status === "REVISION_REQUESTED" && (
                        <section className="dashboard-section">
                            <h2>Yêu cầu sửa điều khoản từ Business</h2>
                            <p style={{ whiteSpace: "pre-wrap" }}>
                                {detail.latestProposal.businessResponseReason
                                    || "Business chưa ghi rõ lý do."}
                            </p>
                        </section>
                    )}

                    <section className="dashboard-section">
                        <h2>Xung đột lịch</h2>

                        {detail.conflicts.length === 0 ? (
                            <p role="status">Không phát hiện booking trùng lịch.</p>
                        ) : (
                            <>
                                <ul>
                                    {detail.conflicts.map((conflict, index) => (
                                        <li key={`${conflict.contractCode}-${index}`}>
                                            {conflict.contractCode}: {showDate(conflict.startAt)}
                                            {" đến "}
                                            {showDate(conflict.endAt)} · {conflict.status}
                                        </li>
                                    ))}
                                </ul>

                                {detail.allowedActions.includes("REQUEST_ANOTHER_PERIOD") && (
                                    <>
                                        <button
                                            type="button"
                                            className="secondary-button"
                                            onClick={() => setShowPeriodRequest((current) => !current)}
                                        >
                                            {showPeriodRequest
                                                ? "Ẩn phần yêu cầu"
                                                : "Yêu cầu Business chọn kỳ khác"}
                                        </button>

                                        {showPeriodRequest && (
                                            <div>
                                                <label className="business-field">
                                                    <span>Lý do yêu cầu</span>
                                                    <textarea
                                                        maxLength={500}
                                                        rows={3}
                                                        value={periodReason}
                                                        onChange={(event) => setPeriodReason(event.target.value)}
                                                        placeholder="Nêu booking bị trùng và yêu cầu Business chọn thời gian khác."
                                                    />
                                                </label>

                                                <button
                                                    type="button"
                                                    disabled={requestingPeriod || !periodReason.trim()}
                                                    onClick={handleRequestAnotherPeriod}
                                                >
                                                    {requestingPeriod ? "Đang gửi…" : "Gửi yêu cầu"}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {periodFeedback && (
                            <p className="info-note" role="status">
                                {periodFeedback}
                            </p>
                        )}
                    </section>

                    {feedback && (
                        <p className="info-note" role="status">
                            {feedback}
                        </p>
                    )}

                    {detail.allowedActions.includes("SAVE_PROPOSAL") && (
                        <section className="dashboard-section">
                            <h2>Điều khoản đề xuất</h2>

                            <form onSubmit={saveProposal}>
                                <div className="business-form-grid">
                                    <label className="business-field">
                                        <span>Ngày bắt đầu</span>
                                        <input
                                            type="date"
                                            required
                                            value={proposalForm.startDate}
                                            onChange={(event) =>
                                                setProposalForm((current) => ({
                                                    ...current,
                                                    startDate: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>

                                    <label className="business-field">
                                        <span>Ngày kết thúc (bao gồm)</span>
                                        <input
                                            type="date"
                                            required
                                            min={proposalForm.startDate}
                                            value={proposalForm.endDate}
                                            onChange={(event) =>
                                                setProposalForm((current) => ({
                                                    ...current,
                                                    endDate: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>

                                    <label className="business-field">
                                        <span>Hạn đề xuất</span>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={proposalForm.expiresAt}
                                            onChange={(event) =>
                                                setProposalForm((current) => ({
                                                    ...current,
                                                    expiresAt: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>

                                    <label className="business-field">
                                        <span>Điều khoản thương mại</span>
                                        <textarea
                                            required
                                            maxLength={10000}
                                            rows={5}
                                            value={proposalForm.commercialTerms}
                                            onChange={(event) =>
                                                setProposalForm((current) => ({
                                                    ...current,
                                                    commercialTerms: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>
                                </div>

                                <p>
                                    Giá đề xuất:{" "}
                                    {showMoney(
                                        detail.latestProposal?.status === "DRAFT"
                                            ? detail.latestProposal.proposedAmount
                                            : booking.calculatedProposalAmount,
                                        booking.currency,
                                    )}
                                </p>


                                <div className="form-actions">
                                    <button type="submit" disabled={saving || sendingProposal}>
                                        {saving ? "Đang lưu…" : "Lưu đề xuất"}
                                    </button>

                                    {detail.allowedActions.includes("SEND_PROPOSAL") && (
                                        <button
                                            type="button"
                                            disabled={saving || sendingProposal}
                                            onClick={handleSendProposal}
                                        >
                                            {sendingProposal ? "Đang gửi…" : "Gửi đề xuất cho Business"}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </section>
                    )}
                </>
            )}
        </main>
    );
}