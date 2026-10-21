import { apiRequest } from "./apiClient.js";

/**
 * Tạo mã VietQR thanh toán tự động cho Premium Subscriptions hoặc Business Contracts
 * @param {Object} payload { type: "PREMIUM" | "CONTRACT", subscriptionId?: number, contractId?: number, packageId?: number }
 */
export const createPaymentQr = (payload) =>
  apiRequest("/api/payment/create-qr", {
    method: "POST",
    body: JSON.stringify(payload),
  });

/**
 * Tự động xác nhận thanh toán thành công (Phương án A - instant activation + real email)
 * @param {Object} payload { type: "PREMIUM" | "CONTRACT", subscriptionId?: number, contractId?: number }
 */
export const autoConfirmPayment = (payload) =>
  apiRequest("/api/payment/auto-confirm", {
    method: "POST",
    body: JSON.stringify(payload),
  });

/**
 * Kiểm tra trạng thái thanh toán tự động (Auto-Polling ngầm mỗi 2-3s)
 * @param {"PREMIUM" | "CONTRACT"} type
 * @param {number} id referenceId (subscriptionId hoặc contractId)
 * @param {number} [orderCode] mã orderCode của PayOS nếu có
 */
export const checkPaymentStatus = (type, id, orderCode) =>
  apiRequest(
    `/api/payment/status?type=${type}&id=${id}${
      orderCode ? `&orderCode=${orderCode}` : ""
    }`
  );
