// Payment receiving configuration for The Pluse
// Uses MBBank + VietQR dynamic QR code with static fallback
export const paymentConfig = {
  bankCode: "MB",
  bankName: "MBBank (Ngân hàng TMCP Quân Đội)",
  accountName: "BUI QUANG CUONG",
  accountNumber: "08882626999",
  qrImage: "/payments/bank-qr.png",
  reconciliation: "MANUAL",
  getDynamicQrUrl: (amount, reference) => {
    const cleanAmount = Math.round(Number(amount) || 0);
    const memo = reference ? encodeURIComponent(reference) : "";
    const name = encodeURIComponent("BUI QUANG CUONG");
    return `https://img.vietqr.io/image/MB-08882626999-compact2.png?amount=${cleanAmount}&addInfo=${memo}&accountName=${name}`;
  },
};
