/**
 * ============================================================================
 * [BF-01][BF-08] READER ACCESS & ADVERTISING POLICY
 * Phụ trách: Cường (Chính sách phân quyền trải nghiệm đọc báo & Tắt quảng cáo)
 * 
 * Quy tắc nghiệp vụ cốt lõi:
 * 1. Độc giả Miễn phí (Free Reader / Guest):
 *    - showAdvertising = true: Hiển thị các banner quảng cáo [BF-08][UC-31]
 *    - Đọc bản tóm tắt nội dung chính; nội dung bài báo gốc bị khóa
 * 2. Độc giả Thuê bao Premium (SUBSCRIBER, premiumActive = true):
 *    - showAdvertising = false: HOÀN TOÀN KHÔNG HIỂN THỊ QUẢNG CÁO (Đặc quyền đọc sạch)
 *    - Mở khóa toàn văn 100% bài báo gốc, mở tính năng Đọc tập trung và Nghe đọc AI
 * 3. Tài khoản nội bộ tòa soạn (ADMINISTRATOR, AD_MANAGER, BUSINESS):
 *    - Không hiển thị quảng cáo thương mại của độc giả, mở thanh điều hướng chuyên biệt
 * ============================================================================
 */
export function readerPolicy(user, premiumActive = false) {
  const roles = user?.roles || [];
  const workplaceRole = roles.some((role) =>
    ["ADMINISTRATOR", "AD_MANAGER", "BUSINESS"].includes(role)
  );
  const reader = !user || roles.some((role) => ["READER", "SUBSCRIBER"].includes(role));

  return {
    readerNavigation: !workplaceRole && reader,
    // [BF-01][Ad-Free Check]: Chỉ hiển thị quảng cáo khi là độc giả và CHƯA có gói Premium còn hạn
    showAdvertising: !workplaceRole && reader && !premiumActive,
  };
}
