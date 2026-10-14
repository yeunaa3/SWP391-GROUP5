export function money(value, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(Number(value));
}
export function packageBenefits(plan) {
  try { const value = typeof plan.benefits === "string" ? JSON.parse(plan.benefits) : plan.benefits; return Array.isArray(value) ? value.filter(item => typeof item === "string") : []; }
  catch { return []; }
}
export function projectedExpiry(start, durationDays) {
  return new Date(new Date(start).getTime() + Number(durationDays) * 86400000);
}
export function readingBenefits(language = "vi") {
  return language === "vi" ? ["Đọc tập trung · Chỉ Premium", "Đọc thành tiếng · Cần giọng tiếng Việt", "Không quảng cáo khi gói còn hiệu lực", "Đọc nội dung Premium của The Pluse"]
    : ["Focus reading · Premium only", "Read aloud · Vietnamese voice required", "Ad-free while membership is active", "The Pluse Premium content"];
}
