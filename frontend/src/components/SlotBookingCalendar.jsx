import { useEffect, useRef, useState, useMemo } from "react";
import { apiRequest } from "../services/apiClient.js";
import { isoDay, addDays, dayCount, occupiedDay, validateRange, freeRanges } from "../utils/bookingCalendar.js";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** BUS-07: kiểm tra cả ngày nhập tay và ngày chọn; lỗi tải khóa xác nhận lịch. */
export default function SlotBookingCalendar({ slotId, packageId, slots = [], packages = [], startDate = "", endDate = "", focusDate = "", onSelectRange, onMonthChange, disabled = false, showSuccessMessage = true,}) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    if (!focusDate) return;
    const date = new Date(`${focusDate}T12:00:00`);
    if (Number.isNaN(date.getTime())) return;
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [focusDate]);

  const [windows, setWindows] = useState([]);
  const [state, setState] = useState("loading"); // "loading" | "ready" | "error"
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [cutoff, setCutoff] = useState("");

  const callbackRef = useRef(onSelectRange);
  callbackRef.current = onSelectRange;

  const today = useMemo(() => isoDay(new Date()), []);

  // Fetch dữ liệu lịch
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setError("");

    apiRequest("/api/advertising/availability", { signal: controller.signal })
      .then((rows) => {
        setWindows(rows);
        setState("ready");
        setCutoff(new Date().toLocaleString("vi-VN"));
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setState("error");
        }
      });

    return () => controller.abort();
  }, [retryCount]);

  // Tìm kiếm slot và package
  const slot = useMemo(() => slots.find(s => String(s.id) === String(slotId)), [slots, slotId]);
  const pack = useMemo(() => packages.find(p => String(p.id) === String(packageId)), [packages, packageId]);
  const duration = Number(pack?.durationDays || 0);

  // Validate khoảng thời gian
  const validation = useMemo(() => {
    return validateRange({ start: startDate, end: endDate, slot: slotId, duration, windows, ready: state === "ready" });
  }, [startDate, endDate, slotId, duration, windows, state]);

  // Đồng bộ callback ra ngoài
  useEffect(() => {
    callbackRef.current?.({ startDate, endDate, isValid: !validation, errorMessage: validation });
  }, [startDate, endDate, slotId, packageId, validation]);

  // Hàm chọn range
  function select(start, end) {
    const message = validateRange({ start, end, slot: slotId, duration, windows, ready: state === "ready" });
    callbackRef.current?.({ startDate: start, endDate: end, isValid: !message, errorMessage: message });
  }

  // Xử lý khi chọn ngày
  function choose(day) {
    if (!startDate || endDate || day < startDate) {
      const end = duration ? addDays(day, duration - 1) : "";
      const isValidEnd = end && !validateRange({ start: day, end, slot: slotId, duration, windows, ready: state === "ready" });
      select(day, isValidEnd ? end : "");
    } else {
      select(startDate, day);
    }
  }

  // Tính toán thông tin tháng
  const monthInfo = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const count = new Date(year, monthIndex + 1, 0).getDate();
    return { year, monthIndex, offset, count };
  }, [month]);

  // Gợi ý ngày trống
  const suggestions = useMemo(() => {
    if (state !== "ready" || !validation) return [];
    const validStart = startDate && startDate >= today ? startDate : today;
    return freeRanges(windows, slotId, duration, validStart);
  }, [state, validation, windows, slotId, duration, startDate, today]);

  if (!slotId || !packageId) {
    return <p className="info-note">Chọn vị trí và gói để kiểm tra lịch khả dụng.</p>;
  }

  const changeMonth = (delta) => {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(nextMonth);
    onMonthChange?.(isoDay(nextMonth));
  };

  return (
    <section className="dashboard-section">
      <h3>Lịch khả dụng · {slot?.name}</h3>
      <p>Gói {pack?.name} · tối đa {duration} ngày. Ngày kết thúc được bao gồm.</p>

      <div className="calendar-month">
        <button type="button" className="secondary-button" disabled={disabled} onClick={() => changeMonth(-1)}>
          ← Tháng trước
        </button>
        <strong>{month.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}</strong>
        <button type="button" className="secondary-button" disabled={disabled} onClick={() => changeMonth(1)}>
          Tháng sau →
        </button>
      </div>

      {state === "loading" && <p role="status">Đang kiểm tra lịch…</p>}

      {state === "error" && (
        <div role="alert" className="form-error">
          Không tải được lịch: {error}. Chưa thể xác nhận còn trống.{" "}
          <button type="button" onClick={() => setRetryCount(x => x + 1)}>Thử lại</button>
        </div>
      )}

      {state === "ready" && (
        <>
          <div className="slot-calendar">
            {WEEKDAYS.map(x => <strong key={x}>{x}</strong>)}
            {Array.from({ length: monthInfo.offset }, (_, i) => <span key={`blank${i}`} />)}
            {Array.from({ length: monthInfo.count }, (_, i) => {
              const day = isoDay(new Date(monthInfo.year, monthInfo.monthIndex, i + 1));
              const past = day < today;
              const busy = occupiedDay(windows, slotId, day);
              const chosen = startDate && day >= startDate && day <= (endDate || startDate);

              let className = "available";
              let statusText = "Trống";
              if (chosen) className = "selected";
              else if (past) { className = "past"; statusText = "Đã qua"; }
              else if (busy) { className = "occupied"; statusText = "Đã đặt"; }

              return (
                <button
                  type="button"
                  key={day}
                  disabled={disabled || past || busy}
                  className={className}
                  aria-label={`${day} ${statusText}`}
                  onClick={() => choose(day)}
                >
                  <span>{i + 1}</span>
                  <small>{statusText}</small>
                </button>
              );
            })}
          </div>
          <small>Cập nhật {cutoff} · lịch hợp đồng. Trống (xanh), đã đặt/giữ chỗ (đỏ), đã qua (xám). </small>
        </>
      )}

      {validation ? (
        <p className="info-note" role="status">{validation}</p>
      ) : (
        showSuccessMessage && (
          <p className="success-message">
            Lịch vừa kiểm tra: {dayCount(startDate, endDate)} ngày không xung đột.
          </p>
        )
      )}

      {!!suggestions.length && (
        <div>
          <h4>Gợi ý khoảng trống cùng gói</h4>
          {suggestions.map(s => (
            <button key={s.start} type="button" className="secondary-button" disabled={disabled} onClick={() => select(s.start, s.end)}>
              {s.start} → {s.end}
            </button>
          ))}
        </div>
      )}

      <small>Lịch chỉ tham khảo, chưa giữ chỗ. Server luôn kiểm tra lại khi lưu/gửi.</small>
    </section>
  );
}
