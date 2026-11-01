/**
 * ============================================================================
 * [BF-01][BF-08] CHÍNH SÁCH ĐỌC BÁO & QUY TẮC HIỂN THỊ QUẢNG CÁO
 * Phụ trách: Cường (Phân quyền trải nghiệm đọc báo & Tắt quảng cáo khi mua VIP)
 * ============================================================================
 */
export function readerPolicy(user, premiumActive = false) {
  const roles = user?.roles || [];

  // 1. Kiểm tra xem người này có phải là nhân viên nội bộ tòa soạn không:
  const isWorkplaceStaff = roles.some((role) =>
    role === "ADMINISTRATOR" || role === "AD_MANAGER" || role === "BUSINESS"
  );

  // 2. Kiểm tra xem có phải là độc giả không:
  // - Khách vãng lai (chưa đăng nhập: !user)
  // - Tài khoản có vai trò READER hoặc SUBSCRIBER
  const isReader = !user || roles.includes("READER") || roles.includes("SUBSCRIBER");

  // 3. Menu điều hướng công cộng dành cho độc giả:
  const readerNavigation = !isWorkplaceStaff && isReader;

  // 4. QUY TẮC CỐT LÕI: CÓ HIỂN THỊ QUẢNG CÁO KHÔNG?
  // - Nếu là nhân viên tòa soạn: KHÔNG hiện quảng cáo
  // - Nếu là độc giả ĐÃ MUA GÓI VIP (premiumActive = true): KHÔNG hiện quảng cáo (Đặc quyền đọc sạch!)
  // - Chỉ hiển thị khi là Độc giả thường và CHƯA có gói VIP còn hạn:
  let showAdvertising = false;
  if (!isWorkplaceStaff && isReader && !premiumActive) {
    showAdvertising = true;
  }

  return {
    readerNavigation,
    showAdvertising,
  };
}
