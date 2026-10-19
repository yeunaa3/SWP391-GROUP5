import { useEffect, useState } from "react";
import { apiRequest } from "../services/apiClient.js";

/**
 * Hàm định dạng đối tượng Date thành chuỗi chuẩn ISO: "YYYY-MM-DD"
 */
const toIsoString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * Component Bảng lịch kiểm tra tình trạng khả dụng và chọn ngày đặt quảng cáo (BUS-06 / BUS-07).
 * - Hiển thị trạng thái của từng ngày theo màu sắc:
 *   + Màu xám: Lịch đã qua (quá khứ, không cho chọn)
 *   + Màu xanh lá: Lịch trống, được phép đặt
 *   + Màu đỏ/cam nhạt: Đã có doanh nghiệp khác đặt hoặc đang giữ chỗ (không cho chọn)
 *   + Màu đỏ đậm The Pluse: Khoảng ngày khách đang chọn
 * 
 * @param {string|number} slotId - ID vị trí quảng cáo đang chọn
 * @param {string|number} packageId - ID gói B2B đang chọn
 * @param {Array} slots - Danh mục các vị trí quảng cáo
 * @param {Array} packages - Danh mục các gói quảng cáo
 * @param {string} startDate - Ngày bắt đầu ("YYYY-MM-DD")
 * @param {string} endDate - Ngày kết thúc ("YYYY-MM-DD")
 * @param {Function} onSelectRange - Callback trả về ({ startDate, endDate, isValid, errorMessage })
 */
export default function SlotBookingCalendar({
  slotId,
  packageId,
  slots = [],
  packages = [],
  startDate = "",
  endDate = "",
  onSelectRange,
}) {
  // Tháng đang xem trên bảng lịch (mặc định là ngày 1 của tháng hiện tại)
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  // Danh sách các khoảng thời gian đã bị đặt từ backend (/api/advertising/availability)
  const [busyWindows, setBusyWindows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  const todayStr = toIsoString(new Date());

  // Tìm thông tin vị trí và gói quảng cáo hiện tại được chọn
  const chosenSlot = slots.find((s) => String(s.id) === String(slotId));
  const chosenPackage = packages.find((p) => String(p.id) === String(packageId));
  const packageDuration = Number(chosenPackage?.durationDays || 0);

  // Tải danh sách các ngày đã được đặt từ server
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    apiRequest("/api/advertising/availability")
      .then((data) => {
        if (isMounted) {
          setBusyWindows(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Không thể tải lịch khả dụng:", err);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Kiểm tra một ngày cụ thể có bị trùng lịch đã đặt của vị trí này hay không (Màu Đỏ)
   */
  const isOccupiedDay = (dayStr) => {
    if (!slotId) return false;
    return busyWindows.some((item) => {
      if (String(item.slotId) !== String(slotId)) return false;
      const start = String(item.startAt).slice(0, 10);
      const end = String(item.endAt).slice(0, 10);
      return dayStr >= start && dayStr <= end;
    });
  };

  /**
   * Kiểm tra xem toàn bộ các ngày giữa 2 mốc có bị dính ngày đỏ (đã đặt) không
   */
  const checkRangeConflict = (startStr, endStr) => {
    if (!startStr || !endStr) return false;
    const start = new Date(`${startStr}T12:00:00`);
    const end = new Date(`${endStr}T12:00:00`);
    const cursor = new Date(start);
    while (cursor <= end) {
      const current = toIsoString(cursor);
      if (isOccupiedDay(current)) {
        return true; // Có xung đột với ngày đã đặt
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return false;
  };

  /**
   * Xử lý khi khách hàng click vào một ngày trên bảng lịch
   */
  const handleDayClick = (dayStr) => {
    // 1. Không cho phép click vào ngày trong quá khứ
    if (dayStr < todayStr) return;

    // 2. Không cho phép click vào ngày đã có người đặt (Màu đỏ)
    if (isOccupiedDay(dayStr)) {
      setValidationError("Ngày này đã có doanh nghiệp khác đặt. Vui lòng chọn ngày trống (màu xanh).");
      return;
    }

    // 3. Nếu chưa chọn ngày bắt đầu, hoặc đã chọn cả 2 ngày, hoặc click ngày trước ngày bắt đầu:
    //    -> Bắt đầu chọn mốc Ngày bắt đầu mới
    if (!startDate || endDate || dayStr < startDate) {
      setValidationError("");

      // Nếu đã chọn gói quảng cáo và biết số ngày của gói: tự động tính ngày kết thúc gợi ý
      if (packageDuration > 0) {
        const targetEnd = new Date(`${dayStr}T12:00:00`);
        targetEnd.setDate(targetEnd.getDate() + (packageDuration - 1));
        const suggestedEndStr = toIsoString(targetEnd);

        // Kiểm tra xem khoảng gợi ý từ dayStr đến suggestedEndStr có bị vướng ngày đỏ nào không
        const hasConflict = checkRangeConflict(dayStr, suggestedEndStr);
        if (!hasConflict) {
          // Hoàn toàn hợp lệ: Tự động gán cả ngày bắt đầu và kết thúc khớp thời hạn gói
          setValidationError("");
          onSelectRange?.({
            startDate: dayStr,
            endDate: suggestedEndStr,
            isValid: true,
            errorMessage: "",
          });
          return;
        } else {
          // Bị vướng lịch bận: Chỉ gán ngày bắt đầu, yêu cầu khách chọn lại hoặc chọn ngày kết thúc thủ công
          setValidationError(
            `Gói "${chosenPackage?.name}" cần ${packageDuration} ngày nhưng khoảng tiếp theo bị vướng ngày đã đặt. Hãy chọn ngày kết thúc thủ công hoặc chọn ngày bắt đầu khác.`
          );
          onSelectRange?.({
            startDate: dayStr,
            endDate: "",
            isValid: false,
            errorMessage: "Khoảng ngày gợi ý bị vướng lịch đã đặt.",
          });
          return;
        }
      }

      // Chưa chọn gói hoặc gói chưa có duration: Chỉ ghi nhận ngày bắt đầu
      onSelectRange?.({
        startDate: dayStr,
        endDate: "",
        isValid: false,
        errorMessage: "Vui lòng chọn tiếp ngày kết thúc.",
      });
      return;
    }

    // 4. Nếu đã có ngày bắt đầu và đang click chọn ngày kết thúc:
    const targetEndStr = dayStr;

    // Kiểm tra xem khoảng chọn có dính ngày đã đặt (màu đỏ) không
    if (checkRangeConflict(startDate, targetEndStr)) {
      setValidationError("Khoảng ngày đã chọn đi qua ngày đã được đặt. Vui lòng chọn khoảng ngày trống khác.");
      onSelectRange?.({
        startDate,
        endDate: "",
        isValid: false,
        errorMessage: "Khoảng ngày chọn bị vướng lịch đã đặt.",
      });
      return;
    }

    // Tính tổng số ngày được chọn
    const startDt = new Date(`${startDate}T12:00:00`);
    const endDt = new Date(`${targetEndStr}T12:00:00`);
    const totalSelectedDays = Math.round((endDt - startDt) / 86400000) + 1;

    // Kiểm tra số ngày so với thời hạn của gói quảng cáo
    if (packageDuration > 0 && totalSelectedDays > packageDuration) {
      setValidationError(
        `Khoảng ngày đã chọn là ${totalSelectedDays} ngày, vượt quá thời hạn cho phép của gói (${packageDuration} ngày).`
      );
      onSelectRange?.({
        startDate,
        endDate: "",
        isValid: false,
        errorMessage: `Khoảng ngày vượt quá thời hạn gói (${packageDuration} ngày).`,
      });
      return;
    }

    // Thỏa mãn mọi điều kiện hợp lệ
    setValidationError("");
    onSelectRange?.({
      startDate,
      endDate: targetEndStr,
      isValid: true,
      errorMessage: "",
    });
  };

  // Tính toán số ô trống và số ngày trong tháng đang xem
  const firstDayOffset = (currentMonth.getDay() + 6) % 7; // Thứ 2 = 0
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  // Tính số ngày đã chọn hiện tại
  const selectedDaysCount =
    startDate && endDate
      ? Math.round(
          (new Date(`${endDate}T12:00:00`) - new Date(`${startDate}T12:00:00`)) / 86400000
        ) + 1
      : 0;

  // Nếu khách chưa chọn cả Vị trí và Gói quảng cáo -> Hiển thị hộp hướng dẫn
  if (!slotId || !packageId) {
    return (
      <div className="slot-calendar-wrapper p-4 bg-amber-50/70 border border-amber-200 rounded-xl my-4 text-sm text-amber-800">
        <p className="font-semibold flex items-center gap-2">
          <span>ℹ️</span> Vui lòng chọn Vị trí quảng cáo và Gói quảng cáo ở trên để hiển thị bảng lịch khả dụng.
        </p>
      </div>
    );
  }

  return (
    <div className="slot-calendar-container border border-gray-200 rounded-xl p-5 bg-white my-5 shadow-sm">
      <div className="calendar-header-bar flex flex-wrap justify-between items-center pb-3 border-b border-gray-100 gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 m-0">
            Bảng lịch khả dụng: {chosenSlot?.name || "Vị trí đã chọn"}
          </h3>
          <p className="text-xs text-gray-500 mt-1 m-0">
            {chosenPackage
              ? `Gói "${chosenPackage.name}" · Thời hạn tối đa: ${chosenPackage.durationDays} ngày`
              : "Chọn khoảng ngày bắt đầu và kết thúc phù hợp."}
          </p>
        </div>

        {/* Chú thích màu sắc (Legend) */}
        <div className="calendar-legend-box flex flex-wrap gap-3 text-xs font-medium">
          <span className="legend-item flex items-center gap-1.5 text-gray-500">
            <span className="w-3.5 h-3.5 rounded bg-gray-100 border border-gray-300 inline-block" /> Lịch đã qua (Xám)
          </span>
          <span className="legend-item flex items-center gap-1.5 text-red-600">
            <span className="w-3.5 h-3.5 rounded bg-red-100 border border-red-300 inline-block" /> Đã có người đặt (Đỏ)
          </span>
          <span className="legend-item flex items-center gap-1.5 text-emerald-700">
            <span className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-300 inline-block" /> Được phép đặt (Xanh)
          </span>
          <span className="legend-item flex items-center gap-1.5 text-red-800 font-bold">
            <span className="w-3.5 h-3.5 rounded bg-red-800 inline-block" /> Đang chọn
          </span>
        </div>
      </div>

      {/* Điều khiển chuyển tháng */}
      <div className="calendar-month-controls flex items-center justify-between my-4">
        <button
          type="button"
          className="secondary-button !py-1 !px-3 text-sm"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          title="Tháng trước"
        >
          ← Tháng trước
        </button>
        <span className="text-base font-bold text-gray-800 capitalize">
          {currentMonth.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          className="secondary-button !py-1 !px-3 text-sm"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
          title="Tháng sau"
        >
          Tháng sau →
        </button>
      </div>

      {loading ? (
        <p className="loading-card text-center py-6 text-sm text-gray-500">Đang kiểm tra lịch trống từ cơ sở dữ liệu...</p>
      ) : (
        /* Lưới 7 cột biểu diễn các ngày trong tuần */
        <div className="slot-calendar" aria-label="Lịch khả dụng vị trí quảng cáo">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((dayName) => (
            <strong key={dayName} className="text-center text-xs text-gray-400 py-1">
              {dayName}
            </strong>
          ))}

          {/* Các ô trống trước ngày mùng 1 đầu tháng */}
          {Array.from({ length: firstDayOffset }, (_, i) => (
            <span key={`blank-${i}`} className="calendar-blank-cell" />
          ))}

          {/* Danh sách các ngày trong tháng */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
            const dayStr = toIsoString(dateObj);

            const isPast = dayStr < todayStr;
            const isBusy = isOccupiedDay(dayStr);
            const isAvailable = !isPast && !isBusy;
            const isSelected = startDate && dayStr >= startDate && dayStr <= (endDate || startDate);
            const isToday = dayStr === todayStr;

            // Xác định class màu sắc cho ô lịch
            let statusClass = "available";
            let label = "Trống";
            if (isPast) {
              statusClass = "past";
              label = "Đã qua";
            } else if (isBusy) {
              statusClass = "occupied";
              label = "Đã đặt";
            }

            if (isSelected) {
              statusClass = "selected";
              label = "Đang chọn";
            }

            return (
              <button
                key={dayStr}
                type="button"
                disabled={isPast || isBusy}
                onClick={() => handleDayClick(dayStr)}
                className={`${statusClass} ${isToday ? "today" : ""}`}
                title={
                  isPast
                    ? `${dayStr}: Ngày đã qua`
                    : isBusy
                    ? `${dayStr}: Đã có doanh nghiệp khác đặt`
                    : `${dayStr}: Ngày trống, bấm để chọn`
                }
              >
                <span>{i + 1}</span>
                <small>{label}</small>
              </button>
            );
          })}
        </div>
      )}

      {/* Hiển thị thông tin khoảng ngày đã chọn & Cảnh báo lỗi */}
      <div className="calendar-selected-summary mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <span>
            <strong>Bắt đầu:</strong> {startDate || <em className="text-gray-400">Chưa chọn</em>}
          </span>
          <span>
            <strong>Kết thúc:</strong> {endDate || <em className="text-gray-400">Chưa chọn</em>}
          </span>
          {selectedDaysCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200">
              Tổng {selectedDaysCount} ngày
            </span>
          )}
        </div>

        {validationError ? (
          <p role="alert" className="form-error !m-0 !py-1.5 !px-3 text-xs text-red-700 font-medium">
            ⚠️ {validationError}
          </p>
        ) : startDate && endDate ? (
          <p className="text-xs text-emerald-700 font-medium m-0">
            ✓ Khoảng ngày hợp lệ, không có xung đột. Bạn có thể lưu nháp hoặc gửi yêu cầu.
          </p>
        ) : (
          <p className="text-xs text-gray-500 m-0">
            Nhấp chuột vào ngày màu xanh để bắt đầu chọn lịch.
          </p>
        )}
      </div>
    </div>
  );
}
