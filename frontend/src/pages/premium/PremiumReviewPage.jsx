import { useEffect, useState } from "react";
import { getPremiumReviewQueue, reviewPremiumRequest } from "../../services/premiumService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { money } from "../../utils/premium.js";
import "../../assets/premium.css";

export default function PremiumReviewPage() {
  const { t } = usePreferences();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { setRows(await getPremiumReviewQueue()); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function decide(approve) {
    if (!selected || busy || (approve && !confirmed) || (!approve && !note.trim())) return;
    setBusy(true); setError("");
    try { await reviewPremiumRequest(selected.id, { approve, paymentConfirmed: confirmed, note: note.trim() }); setSelected(null); setNote(""); setConfirmed(false); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="page-content premium-page"><header className="premium-checkout-heading"><span className="premium-kicker">ADMIN · PREMIUM</span><h1>{t("Duyệt đăng ký Premium", "Review Premium requests")}</h1><p>{t("Đối chiếu giao dịch ngân hàng với nội dung chuyển khoản, tài khoản và số tiền trước khi duyệt. Hệ thống không tự xác nhận chuyển khoản.", "Check bank records against the transfer memo, account and amount. Transfers are not automatically verified.")}</p><button className="secondary-button" disabled={busy || loading} onClick={load}>{t("Tải lại", "Refresh")}</button></header>
    {error && <p className="error-message" role="alert">{error}</p>}{loading && <p role="status">{t("Đang tải…", "Loading…")}</p>}{!loading && !error && !rows.length && <p>{t("Chưa có yêu cầu.", "No requests yet.")}</p>}
    {selected && <section className="premium-panel"><h2>THE PLUSE {selected.username} PREMIUM {selected.id} · {selected.packageName}</h2><p>{selected.username} · {selected.email} · <strong>{money(selected.amount, selected.currency)}</strong></p>
      <label className="premium-consent"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>{t("Tôi đã kiểm tra và xác nhận nhận đủ tiền cho yêu cầu này.", "I verified receipt of the full payment for this request.")}</span></label>
      <label className="premium-review-note">{t("Ghi chú / lý do từ chối", "Note / rejection reason")}<textarea maxLength={500} disabled={busy} value={note} onChange={e => setNote(e.target.value)} /></label>
      <div className="premium-review-actions"><button disabled={busy || !confirmed} onClick={() => decide(true)}>{t("Xác nhận thanh toán & cấp gói", "Confirm payment & grant access")}</button><button className="secondary-button" disabled={busy || !note.trim()} onClick={() => decide(false)}>{t("Từ chối", "Reject")}</button><button className="secondary-button" disabled={busy} onClick={() => setSelected(null)}>{t("Đóng", "Close")}</button></div><small>{t("Từ chối không tự hoàn tiền. Nếu đã nhận tiền, cần đối soát/hoàn tiền ngoài hệ thống.", "Rejection does not issue refunds. Received funds require separate reconciliation.")}</small></section>}
    {rows.map(row => <article className="premium-panel" key={row.id}><div className="premium-request-heading"><div><span className="premium-kicker">THE PLUSE {row.username} PREMIUM {row.id} · {row.status}</span><h2>{row.packageName}</h2><p>{row.username} · {row.email}</p></div><strong>{money(row.amount, row.currency)}</strong></div><p>{row.durationDays} {t("ngày", "days")} · {String(row.submittedAt).replace("T", " ")}</p>{row.reviewNote && <p>{row.reviewNote}</p>}{row.status === "PENDING" && <button className="secondary-button" disabled={busy} onClick={() => { setSelected(row); setNote(""); setConfirmed(false); }}>{t("Kiểm tra & xử lý", "Review request")}</button>}</article>)}</main>;
}
