import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getBookingDetail, saveBookingProposal, sendBookingProposal, requestAnotherBookingPeriod } from "../../services/adManagerService.js";
import { getAdvertisingCatalog } from "../../services/contentService.js";
import SlotBookingCalendar from "../../components/SlotBookingCalendar.jsx";
import { addDays } from "../../utils/bookingCalendar.js";

function showDate(value) {
    return value ? String(value).slice(0, 10) : "—";
}

function inclusiveEndDate(value) {
    const date = showDate(value);
    return date === "—" ? "" : addDays(date, -1);
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
    const date = new Date(Date.now() + 12 * 60 * 60 * 1000);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}

export default function AdManagerBookingProposalPage() {
    const { contractId } = useParams();
    const [searchParams] = useSearchParams();
    const [detail, setDetail] = useState(null);
    const [catalog, setCatalog] = useState(null);
    const [catalogError, setCatalogError] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [proposalForm, setProposalForm] = useState({
        startDate: "",
        endDate: "",
        commercialTerms: "",
        expiresAt: "",
        packageId: "",
        slotId: "",
    });
    const [calendarFocusDate, setCalendarFocusDate] = useState("");
    const [saving, setSaving] = useState(false);
    const [sendingProposal, setSendingProposal] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [requestingPeriod, setRequestingPeriod] = useState(false);
    const [periodFeedback, setPeriodFeedback] = useState("");
    const [calendarCheck, setCalendarCheck] = useState({ valid: false, error: "Chọn đủ vị trí và khoảng ngày." });

    useEffect(() => {
        getAdvertisingCatalog()
            .then(setCatalog)
            .catch((requestError) => setCatalogError(requestError.message));
    }, []);

    const requestedReturnTo = searchParams.get("returnTo");
    const returnTo = requestedReturnTo?.startsWith("/ad-manager/bookings")
        ? requestedReturnTo
        : "/ad-manager/bookings";

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        setError("");
        setCalendarCheck({ valid: false, error: "Đang kiểm tra lịch…" });

        getBookingDetail(contractId, controller.signal)
            .then((data) => {
                setDetail(data);
                const latest = data.latestProposal;
                const draft = latest?.status === "DRAFT" ? latest : null;
                const editableProposal =
                    ["DRAFT", "REVISION_REQUESTED"].includes(latest?.status)
                        ? latest
                        : null;
                const startDate = String(
                    editableProposal?.proposedStartAt ?? data.booking.startAt,
                ).slice(0, 10);

                setProposalForm({
                    startDate,
                    endDate: inclusiveEndDate(
                        editableProposal?.proposedEndAt ?? data.booking.endAt,
                    ),
                    commercialTerms: editableProposal?.commercialTerms ?? "",
                    expiresAt: String(
                        draft?.expiresAt ?? defaultExpiryValue(),
                    ).slice(0, 16),
                    packageId: String(editableProposal?.proposedPackageId ?? data.booking.packageId),
                    slotId: String(editableProposal?.proposedSlotId ?? data.booking.slotId),
                });
                setCalendarFocusDate(startDate);
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
    const requestToChangeContract = ["REVISION_REQUESTED", "DRAFT"].includes(detail?.latestProposal?.status)
        && detail.latestProposal.businessResponseType === "CONTRACT_INFO";
    const selectedPackage = catalog?.offers?.find((item) => String(item.id) === proposalForm.packageId);
    const selectedSlot = catalog?.slots?.find((item) => String(item.id) === proposalForm.slotId);
    const proposalAmount = requestToChangeContract
        ? selectedPackage && selectedSlot
            ? Number(selectedPackage.price)
            + Number(selectedSlot.basePrice ?? selectedSlot.base_price ?? 0)
            : null
        : detail?.latestProposal?.status === "DRAFT"
            ? detail.latestProposal.proposedAmount
            : booking?.calculatedProposalAmount;

    async function saveProposal(event) {
        event.preventDefault();
        if (!calendarCheck.valid || calendarCheck.error) {
            setFeedback(calendarCheck.error || "Chọn lịch còn trống trước khi lưu.");
            return;
        }
        setSaving(true);
        setFeedback("");

        try {
            const updated = await saveBookingProposal(contractId, {
                expectedRevisionNo: booking.revisionNo,
                commercialTerms: proposalForm.commercialTerms,
                proposedStartAt: `${proposalForm.startDate}T00:00:00`,
                proposedEndAt: `${addDays(proposalForm.endDate, 1)}T00:00:00`,
                expiresAt: `${proposalForm.expiresAt}:00`,
                packageId: Number(proposalForm.packageId),
                slotId: Number(proposalForm.slotId),
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
        if (!booking) return;

        setRequestingPeriod(true);
        setPeriodFeedback("");

        try {
            const updated = await requestAnotherBookingPeriod(
                contractId,
                booking.revisionNo,
            );

            setDetail(updated);
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
                <div className="form-actions">
                    {contractId && (
                        <Link className="secondary-button" to={`/ad-manager/contracts/${contractId}`}>
                            Theo dõi hợp đồng · ADM-06
                        </Link>
                    )}
                    <Link className="secondary-button" to={returnTo}>
                        Quay lại hàng chờ
                    </Link>
                </div>
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
                                    {showDate(booking.startAt)} đến {inclusiveEndDate(booking.endAt)}
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

                    {detail.latestProposal
                        && ["DRAFT", "SENT", "REVISION_REQUESTED", "ACCEPTED"].includes(detail.latestProposal.status) && (
                            <section className="dashboard-section">
                                <h2>
                                    Proposal gần nhất · phiên bản {detail.latestProposal.revisionNo}
                                    {detail.latestProposal.status === "DRAFT" ? " · bản nháp chưa gửi" : ""}
                                </h2>
                                <dl className="business-details">
                                    <div>
                                        <dt>Trạng thái proposal</dt>
                                        <dd>{detail.latestProposal.status}</dd>
                                    </div>
                                    <div>
                                        <dt>Package đề xuất</dt>
                                        <dd>{detail.latestProposal.proposedPackageName || booking.packageName}</dd>
                                    </div>
                                    <div>
                                        <dt>Ad slot đề xuất</dt>
                                        <dd>{detail.latestProposal.proposedSlotName || booking.slotName}</dd>
                                    </div>
                                    <div>
                                        <dt>Thời gian đề xuất</dt>
                                        <dd>
                                            {showDate(detail.latestProposal.proposedStartAt)} đến {inclusiveEndDate(detail.latestProposal.proposedEndAt)}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Giá đề xuất</dt>
                                        <dd>{showMoney(detail.latestProposal.proposedAmount, detail.latestProposal.currency || booking.currency)}</dd>
                                    </div>
                                    <div>
                                        <dt>Hạn phản hồi</dt>
                                        <dd>{detail.latestProposal.expiresAt ? String(detail.latestProposal.expiresAt).replace("T", " ").slice(0, 16) : "—"}</dd>
                                    </div>
                                </dl>
                                <p><strong>Điều khoản thương mại</strong></p>
                                <p style={{ whiteSpace: "pre-wrap" }}>
                                    {detail.latestProposal.commercialTerms || "Chưa có điều khoản."}
                                </p>
                            </section>
                        )}

                    {detail.conflicts.length > 0 && (
                        <section className="dashboard-section">
                            <h2>Xung đột lịch</h2>
                                <ul>
                                    {detail.conflicts.map((conflict, index) => (
                                        <li key={`${conflict.contractCode}-${index}`}>
                                            {conflict.contractCode}: {showDate(conflict.startAt)}
                                            {" đến "}
                                            {inclusiveEndDate(conflict.endAt)} · {conflict.status}
                                        </li>
                                    ))}
                                </ul>

                                {detail.allowedActions.includes("REQUEST_ANOTHER_PERIOD") && (
                                    <button
                                        type="button"
                                        className="secondary-button"
                                        disabled={requestingPeriod}
                                        onClick={handleRequestAnotherPeriod}
                                    >
                                        {requestingPeriod ? "Đang gửi…" : "Yêu cầu Business đổi thông tin booking"}
                                    </button>
                                )}
                            {periodFeedback && (
                                <p className="info-note" role="status">
                                    {periodFeedback}
                                </p>
                            )}
                        </section>
                    )}
                    {periodFeedback && detail.conflicts.length === 0 && (
                        <p className="info-note" role="status">{periodFeedback}</p>
                    )}

                    {detail.latestProposal?.businessResponseType && (
                        <section className="dashboard-section">
                            <h2>
                                {detail.latestProposal.businessResponseType === "CONTRACT_INFO"
                                    ? "Yêu cầu đổi thông tin hợp đồng từ Doanh nghiệp"
                                    : "Yêu cầu sửa điều khoản từ Doanh nghiệp"}
                            </h2>
                            <p style={{ whiteSpace: "pre-wrap" }}>
                                {detail.latestProposal.businessResponseReason
                                    || "Business chưa ghi rõ lý do."}
                            </p>
                        </section>
                    )}

                    {feedback && (
                        <p className="info-note" role="status">
                            {feedback}
                        </p>
                    )}

                    {detail.allowedActions.includes("SAVE_PROPOSAL") && (
                        <form onSubmit={saveProposal}>
                            <section className="dashboard-section">
                                <h2>Package, ad slot và lịch đề xuất</h2>
                                {catalogError && <p role="alert" className="info-note">{catalogError}</p>}
                                <div className="business-form-grid">
                                    <label className="business-field">
                                        <span>Gói quảng cáo B2B</span>
                                        <select
                                            required
                                            disabled={!requestToChangeContract || !catalog}
                                            value={proposalForm.packageId}
                                            onChange={(event) => {
                                                setProposalForm((current) => ({
                                                    ...current,
                                                    packageId: event.target.value,
                                                    startDate: "",
                                                    endDate: "",
                                                }));
                                                setCalendarFocusDate((current) => current || showDate(booking.startAt));
                                                setCalendarCheck({ valid: false, error: "Chọn lại ngày bắt đầu và khoảng ngày trên lịch." });
                                            }}
                                        >
                                            {catalog?.offers?.map((offer) => (
                                                <option key={offer.id} value={offer.id}>
                                                    {offer.name} · {showMoney(offer.price, offer.currency)} · Thời hạn: {offer.durationDays} ngày
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="business-field">
                                        <span>Vị trí quảng cáo</span>
                                        <select
                                            required
                                            disabled={!requestToChangeContract || !catalog}
                                            value={proposalForm.slotId}
                                            onChange={(event) => {
                                                setProposalForm((current) => ({
                                                    ...current,
                                                    slotId: event.target.value,
                                                    startDate: "",
                                                    endDate: "",
                                                }));
                                                setCalendarFocusDate((current) => current || showDate(booking.startAt));
                                                setCalendarCheck({ valid: false, error: "Chọn lại ngày bắt đầu và khoảng ngày trên lịch." });
                                            }}
                                        >
                                            {catalog?.slots?.map((slot) => (
                                                <option key={slot.id} value={slot.id}>
                                                    {slot.name} · {slot.width} × {slot.height} px · {showMoney(slot.basePrice, slot.currency)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="business-field">
                                        <span>Ngày bắt đầu</span>
                                        <input
                                            type="date"
                                            required
                                            disabled={!requestToChangeContract}
                                            value={proposalForm.startDate}
                                            onChange={(event) => {
                                                setProposalForm((current) => ({ ...current, startDate: event.target.value }));
                                                setCalendarFocusDate(event.target.value);
                                                setCalendarCheck({ valid: false, error: "Đang kiểm tra lịch…" });
                                            }}
                                        />
                                    </label>
                                    <label className="business-field">
                                        <span>Ngày kết thúc (bao gồm)</span>
                                        <input
                                            type="text"
                                            value={proposalForm.endDate
                                                ? new Date(`${proposalForm.endDate}T12:00:00`).toLocaleDateString("vi-VN")
                                                : ""}
                                            placeholder="Ngày kết thúc được chọn trên lịch"
                                            readOnly
                                            aria-readonly="true"
                                        />
                                    </label>
                                </div>

                                <SlotBookingCalendar
                                    showSuccessMessage={false}
                                    focusDate={proposalForm.startDate || calendarFocusDate || showDate(booking.startAt)}
                                    onMonthChange={setCalendarFocusDate}
                                    slotId={proposalForm.slotId}
                                    packageId={proposalForm.packageId}
                                    slots={catalog?.slots || []}
                                    packages={catalog?.offers || []}
                                    startDate={proposalForm.startDate}
                                    endDate={proposalForm.endDate}
                                    disabled={!requestToChangeContract}
                                    onSelectRange={({ startDate, endDate, isValid, errorMessage }) => {
                                        setProposalForm((current) => ({ ...current, startDate, endDate }));
                                        if (startDate) setCalendarFocusDate(startDate);
                                        setCalendarCheck({ valid: isValid, error: errorMessage || "" });
                                    }}
                                />
                                <p>Giá đề xuất: {showMoney(proposalAmount, booking.currency)}</p>
                            </section>

                            <section className="dashboard-section">
                                <h2>Điều khoản đề xuất</h2>
                                <div className="business-form-grid">
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
                                        <span>Yêu cầu thay đổi Điều khoản thương mại</span>
                                        <textarea
                                            required
                                            maxLength={10000}
                                            rows={5}
                                            readOnly={requestToChangeContract}
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
                                <div className="form-actions">
                                    <button type="submit" disabled={saving || sendingProposal || !calendarCheck.valid || Boolean(calendarCheck.error)}>
                                        {saving ? "Đang lưu…" : "Lưu đề xuất"}
                                    </button>
                                    {detail.allowedActions.includes("SEND_PROPOSAL") && (
                                        <button
                                            type="button"
                                            disabled={saving || sendingProposal || !calendarCheck.valid || Boolean(calendarCheck.error)}
                                            onClick={handleSendProposal}
                                        >
                                            {sendingProposal ? "Đang gửi…" : "Gửi đề xuất cho Business"}
                                        </button>
                                    )}
                                </div>
                            </section>
                        </form>
                    )}
                </>
            )}
        </main>
    );
}
