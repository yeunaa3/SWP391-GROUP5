import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAdvertisingCatalog } from "../../services/contentService.js";
import { apiRequest } from "../../services/apiClient.js";
import { addDays, occupiedDay, freeRanges } from "../../utils/bookingCalendar.js";

const iso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

export default function SlotCalendarPage() {
  const [searchParams] = useSearchParams();
  const requestedPackageId = searchParams.get("packageId") || "";
  const requestedSlotId = searchParams.get("slotId") || "";
  const [offers, setOffers] = useState([]);
  const [packageId, setPackageId] = useState("");
  const [slots, setSlots] = useState([]);
  const [windows, setWindows] = useState([]);
  const [slot, setSlot] = useState("");
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;

    Promise.all([
      getAdvertisingCatalog(),
      apiRequest("/api/advertising/availability"),
    ])
      .then(([catalog, reserved]) => {
        if (!alive) return;
        const availableOffers = Array.isArray(catalog.offers)
          ? catalog.offers
          : [];
        const availableSlots = Array.isArray(catalog.slots)
          ? catalog.slots
          : [];

        setOffers(availableOffers);
        setSlots(availableSlots);

        const selectedOffer = availableOffers.find(
          (item) => String(item.id) === requestedPackageId,
        );
        const selectedSlot = availableSlots.find(
          (item) => String(item.id) === requestedSlotId,
        );

        setPackageId(selectedOffer ? String(selectedOffer.id) : "");
        setSlot(selectedSlot ? String(selectedSlot.id) : "");
        setWindows(Array.isArray(reserved) ? reserved : []);
        setState("ready");
      })

      .catch((e) => {
        if (alive) {
          setError(e.message);
          setState("error");
        }
      });

    return () => {
      alive = false;
    };
  }, [retry, requestedPackageId, requestedSlotId]);

  const occupied = (day) => occupiedDay(windows, slot, day);
  const today = iso(new Date());
  const chosenOffer = offers.find(
    (item) => String(item.id) === packageId,
  );
  const packageDuration = Number(chosenOffer?.durationDays);

  function choose(day) {
    if (!slot) {
      setError("Hãy chọn vị trí quảng cáo trước.");
      return;
    }

    if (packageId) {
      if (!Number.isInteger(packageDuration) || packageDuration <= 0) {
        setError("Gói đã chọn chưa có thời lượng hợp lệ.");
        return;
      }

      for (let offset = 0; offset < packageDuration; offset += 1) {
        if (occupied(addDays(day, offset))) {
          setStart("");
          setEnd("");
          setError(
            "Khoảng thời gian của gói có ngày đã được đặt. Hãy chọn ngày bắt đầu khác.",
          );
          return;
        }
      }

      setStart(day);
      setEnd(addDays(day, packageDuration - 1));
      setError("");
      return;
    }

    if (!start || end || day < start) {
      setStart(day);
      setEnd("");
      setError("");
      return;
    }

    const cursor = new Date(`${start}T12:00:00`);

    while (iso(cursor) <= day) {
      if (occupied(iso(cursor))) {
        setError(
          "Khoảng chọn đi qua ngày đã được đặt. Hãy chọn khoảng trống khác.",
        );
        return;
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    setError("");
    setEnd(day);
  }

  const offset = (month.getDay() + 6) % 7;
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const chosenSlot = slots.find((item) => String(item.id) === slot);
  const duration =
    start && end
      ? Math.round(
        (new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) /
        86400000,
      ) + 1
      : 0;

  if (state === "error") {
    return (
      <main className="page-content">
        <h1>Lịch vị trí quảng cáo</h1>
        <p role="alert" className="form-error">
          Không tải được lịch: {error}. Chưa xác định được khoảng trống.
        </p>
        <button
          onClick={() => {
            setState("loading");
            setRetry((x) => x + 1);
          }}
        >
          Thử lại
        </button>
      </main>
    );
  }

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BUS-06 LỊCH QUẢNG CÁO</p>
          <h1>Lịch vị trí quảng cáo</h1>
          <p className="page-subtitle">
            Chọn vị trí, ngày bắt đầu và ngày kết thúc để tiếp tục đặt chỗ.
          </p>
        </div>
        <Link className="outline-button" to="/business/advertising/prices">
          Xem báo giá
        </Link>
      </div>

      {state === "loading" ? (
        <p className="loading-card">Đang tải lịch từ MySQL…</p>
      ) : (
        <div className="calendar-layout">
          <section className="dashboard-section">
            <label className="calendar-slot">
              Gói quảng cáo
              <select
                value={packageId}
                onChange={(event) => {
                  setPackageId(event.target.value);
                  setStart("");
                  setEnd("");
                  setError("");
                }}
              >
                <option value="">Chọn gói quảng cáo</option>
                {offers.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.name || "Gói chưa có tên"} · {item.durationDays ?? "—"} ngày ·{" "}
                    {Number(item.price || 0).toLocaleString("vi-VN")}{" "}
                    {item.currency || "VND"}
                  </option>
                ))}
              </select>
            </label>

            <label className="calendar-slot">
              Vị trí quảng cáo
              <select
                value={slot}
                onChange={(e) => {
                  setSlot(e.target.value);
                  setStart("");
                  setEnd("");
                  setError("");
                }}
              >
                <option value="">Chọn vị trí quảng cáo</option>
                {slots.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.width} × {item.height}
                  </option>
                ))}
              </select>
            </label>

            <div className="calendar-month">
              <button
                className="secondary-button"
                aria-label="Tháng trước"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                ←
              </button>
              <h2>
                {month.toLocaleDateString("vi-VN", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                className="secondary-button"
                aria-label="Tháng sau"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                →
              </button>
            </div>

            <div className="slot-calendar" aria-label="Lịch khả dụng">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
                <strong key={day}>{day}</strong>
              ))}

              {Array.from({ length: offset }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}

              {Array.from({ length: count }, (_, i) => {
                const day = iso(
                  new Date(month.getFullYear(), month.getMonth(), i + 1),
                );
                const busy = occupied(day);
                const past = day < today;
                const selected =
                  start && day >= start && day <= (end || start);

                return (
                  <button
                    key={day}
                    disabled={!packageId || !slot || busy || past || state !== "ready"}
                    className={`${past ? "past" : busy ? "occupied" : "available"} ${selected ? "selected" : ""
                      } ${day === today ? "today" : ""}`}
                    aria-label={`${day} · ${busy ? "Đã đặt" : past ? "Đã qua" : "Trống"
                      }`}
                    aria-pressed={Boolean(selected)}
                    onClick={() => choose(day)}
                  >
                    <span>{i + 1}</span>
                    <small>
                      {busy ? "Đã đặt" : past ? "Đã qua" : "Trống"}
                    </small>
                  </button>
                );
              })}
            </div>

            <div
              className="calendar-legend"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "14px",
                marginTop: "16px",
                fontSize: "11px",
                fontWeight: "600",
              }}
            >
              <span style={{ color: "#9ca3af" }}>● Lịch đã qua (Xám)</span>
              <span style={{ color: "#059669" }}>● Được phép đặt (Xanh)</span>
              <span style={{ color: "#dc2626" }}>● Đã có người đặt (Đỏ)</span>
              <span style={{ color: "#991b1b" }}>● Đang chọn</span>
            </div>
          </section>

          <aside className="dashboard-section calendar-selection">
            <p className="eyebrow">KHOẢNG CHẠY QUẢNG CÁO</p>
            <h2>{chosenSlot?.name || "Chọn vị trí"}</h2>
            <p>
              Bấm ngày bắt đầu, sau đó bấm ngày kết thúc. Bấm lại để chọn
              khoảng mới.
            </p>

            <dl>
              <dt>Bắt đầu</dt>
              <dd>{start || "Chưa chọn"}</dd>
              <dt>Kết thúc</dt>
              <dd>{end || "Chưa chọn"}</dd>
              <dt>Thời lượng</dt>
              <dd>{duration ? `${duration} ngày` : "—"}</dd>
            </dl>

            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}

            {duration && state === "ready" ? (
              <Link
                className="button-link"
                to={`/business/bookings/new?packageId=${encodeURIComponent(packageId)}&slotId=${encodeURIComponent(slot)}&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`}
              >
                Tiếp tục đặt chỗ →
              </Link>
            ) : (
              <p className="info-note">
                Hãy chọn ngày bắt đầu để tiếp tục.
              </p>
            )}

            <small>
              Lịch dựa trên hợp đồng Active đã thanh toán. Đây là thông tin
              tham khảo, chưa giữ chỗ; khi gửi yêu cầu cần kiểm tra lại trên
              server.
            </small>
          </aside>
        </div>
      )}
    </main>
  );
}