/**
 * ============================================================================
 * [BF-01] TIỆN ÍCH KIỂM TRA QUYỀN SỞ HỮU GÓI CƯỚC (PREMIUM ACCESS UTILS)
 * ============================================================================
 */

/**
 * Tìm gói Premium đang có hiệu lực NGAY TẠI THỜI ĐIỂM HIỆN TẠI.
 * 
 * @param {Array} subscriptions Danh sách gói người dùng đã đăng ký (lấy từ backend)
 * @param {number} now Thời gian hiện tại dạng timestamp (mặc định Date.now())
 * @returns {Object|null} Trả về đối tượng gói đang hoạt động hoặc null nếu không có
 */
export function currentPremium(subscriptions = [], now = Date.now()) {
  if (!Array.isArray(subscriptions)) {
    return null;
  }

  return (
    subscriptions.find((item) => {
      const isActive = item.status === "ACTIVE";
      const hasStarted = Date.parse(item.startAt) <= now;
      const notExpired = Date.parse(item.endAt) > now;
      return isActive && hasStarted && notExpired;
    }) || null
  );
}

/**
 * Kiểm tra xem người dùng ĐÃ MUA GÓI NÀY CHƯA (theo packageId cụ thể).
 * Được dùng ở trang danh sách gói để đổi nút thành "✓ ĐÃ MUA GÓI NÀY" hoặc "Xem gói đã mua".
 * 
 * @param {Array} subscriptions Danh sách gói người dùng đã đăng ký
 * @param {number|string} packageId Mã gói cước cần kiểm tra (1, 2, 3, ...)
 * @param {number} now Thời gian hiện tại dạng timestamp
 * @returns {Object|null} Gói đã mua còn hạn, hoặc null nếu chưa mua / đã hết hạn
 */
export function ownedPremium(subscriptions = [], packageId, now = Date.now()) {
  if (!Array.isArray(subscriptions) || !packageId) {
    return null;
  }

  return (
    subscriptions.find((item) => {
      const matchPackage = Number(item.packageId) === Number(packageId);
      const isActive = item.status === "ACTIVE";
      const notExpired = Date.parse(item.endAt) > now;
      return matchPackage && isActive && notExpired;
    }) || null
  );
}
