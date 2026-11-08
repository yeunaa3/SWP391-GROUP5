const time = value => value ? Date.parse(String(value).replace(" ", "T")) : NaN;

/** Snapshot checks are advisory; the server revalidates current data on confirmation. */
export function approvalWarnings(snapshot, now = Date.now()) {
  const c = snapshot?.campaign || {}, contract = snapshot?.contract || {};
  const start = time(c.scheduled_start_time), end = time(c.scheduled_end_time), warnings = [];
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) warnings.push("Lịch chạy không hợp lệ. Cần doanh nghiệp cập nhật trước khi phê duyệt.");
  else if (end <= now) warnings.push("Chiến dịch đã hết lịch chạy. Hãy yêu cầu doanh nghiệp điều chỉnh lịch và nộp lại.");
  if (contract.status && contract.status !== "ACTIVE") warnings.push("Hợp đồng trong phiên bản đã nộp không ở trạng thái có hiệu lực.");
  if (contract.payment_status && contract.payment_status !== "PAID") warnings.push("Hợp đồng trong phiên bản đã nộp chưa được thanh toán đầy đủ.");
  if (!reviewHref(c.target_url, false)) warnings.push("URL đích cần là địa chỉ HTTP/HTTPS đầy đủ, không chứa thông tin đăng nhập.");
  return warnings;
}

export function reviewHref(value, allowInternal = true) {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();
  if (allowInternal && /^\/(?![\\/])/.test(text) && !text.includes("\\")) return text;
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function reviewFormError(decision, reason, blocked = false) {
  if (!["APPROVED", "NEEDS_REVISION", "REJECTED"].includes(decision)) return "Hãy chọn một quyết định xét duyệt.";
  if (decision === "APPROVED" && blocked) return "Chưa thể phê duyệt. Hãy kiểm tra các cảnh báo hoặc chọn yêu cầu chỉnh sửa.";
  if (!reason.trim()) return "Vui lòng nhập nhận xét hoặc lý do để doanh nghiệp hiểu kết quả xét duyệt.";
  if (reason.length > 2000) return "Nhận xét không được vượt quá 2.000 ký tự.";
  return "";
}
