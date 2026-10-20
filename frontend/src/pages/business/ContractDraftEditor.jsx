import { useState } from "react";
import SlotBookingCalendar from "../../components/SlotBookingCalendar.jsx";
import { addDays, dayCount } from "../../utils/bookingCalendar.js";

/** Chỉnh trên bản sao; chỉ gửi API khi người dùng xác nhận, hủy sẽ bỏ toàn bộ thay đổi. */
export default function ContractDraftEditor({ contract, catalog, busy, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    name: contract.contract_name || "", slotId: String(contract.slot_id),
    packageId: String(contract.b2b_package_id), startDate: String(contract.start_at).slice(0, 10),
    endDate: addDays(String(contract.end_at).slice(0, 10), -1),
  }));
  const [calendar, setCalendar] = useState({ valid: false, error: "" });
  const [confirmation, setConfirmation] = useState(null);
  const slot = catalog?.slots?.find(item => String(item.id) === form.slotId);
  const pack = catalog?.offers?.find(item => String(item.id) === form.packageId);
  const days = form.startDate && form.endDate ? dayCount(form.startDate, form.endDate) : 0;
  const price = slot && pack && days > 0
    ? Math.round((Number(pack.price) + Number(slot.base_price ?? slot.basePrice ?? 0) * days / 30) * 100) / 100 : 0;
  const valid = Boolean(form.name.trim() && slot && pack && days > 0 && calendar.valid && !calendar.error && Number.isFinite(price));
  const locked = busy || Boolean(confirmation);
  // Đổi vị trí/gói/ngày phải kiểm tra lại lịch trước khi được lưu.
  function change(key, value) {
    setForm(previous => ({ ...previous, [key]: value }));
    if (key !== "name") setCalendar({ valid: false, error: "" });
  }
  // Chụp dữ liệu đã kiểm tra; bước này chưa ghi gì vào database.
  function requestSave(event) {
    event.preventDefault();
    if (valid && !locked) setConfirmation({ ...form, name: form.name.trim(), slotId: Number(form.slotId), packageId: Number(form.packageId), quotedAmount: price });
  }
  return <form onSubmit={requestSave}>
    <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div className="business-form-grid">
        <label className="business-field"><span>Tên yêu cầu</span><input required maxLength={200} value={form.name} onChange={e => change("name", e.target.value)}/></label>
        <label className="business-field"><span>Vị trí quảng cáo</span><select required value={form.slotId} onChange={e => change("slotId", e.target.value)}><option value="">Chọn vị trí</option>{catalog?.slots?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="business-field"><span>Gói quảng cáo</span><select required value={form.packageId} onChange={e => change("packageId", e.target.value)}><option value="">Chọn gói</option>{catalog?.offers?.map(item => <option key={item.id} value={item.id}>{item.name} · {Number(item.price).toLocaleString("vi-VN")} ₫ · {item.durationDays} ngày</option>)}</select></label>
        {[["startDate", "Ngày bắt đầu"], ["endDate", "Ngày kết thúc (bao gồm)"]].map(([key, label]) => <label className="business-field" key={key}><span>{label}</span><input required type="date" value={form[key]} onChange={e => change(key, e.target.value)}/></label>)}
      </div>
      <SlotBookingCalendar slotId={form.slotId} packageId={form.packageId} slots={catalog?.slots || []} packages={catalog?.offers || []} startDate={form.startDate} endDate={form.endDate} onSelectRange={({ startDate, endDate, isValid, errorMessage }) => {
        setForm(previous => previous.startDate === startDate && previous.endDate === endDate ? previous : { ...previous, startDate, endDate });
        setCalendar({ valid: isValid, error: errorMessage });
      }}/>
      <p className="info-note">Giá dự kiến: {price.toLocaleString("vi-VN")} ₫ · {Math.max(0, days)} ngày. Giá được kiểm tra lại khi lưu. Lưu bản nháp chưa gửi yêu cầu và chưa giữ chỗ.</p>
    </fieldset>
    {confirmation ? <section className="info-note" role="dialog" aria-modal="false" aria-label="Xác nhận lưu bản nháp">
      <p>Lưu các thay đổi cho bản nháp “{confirmation.name}”? Chọn Không để trở về thông tin bản nháp đã lưu trước đó.</p>
      <div className="form-actions"><button type="button" disabled={busy} onClick={() => onSave(confirmation)}>Có, lưu thay đổi</button><button type="button" className="outline-button" disabled={busy} onClick={onCancel}>Không, giữ bản nháp cũ</button></div>
    </section> : <div className="form-actions"><button disabled={busy || !valid}>Lưu bản nháp</button><button type="button" className="outline-button" disabled={busy} onClick={onCancel}>Hủy chỉnh sửa</button></div>}
  </form>;
}
