const requiredFields = {
  company_name: "Tên pháp lý", tax_code: "Mã số thuế", industry: "Ngành nghề",
  contact_person: "Người liên hệ", email: "Email liên hệ", phone: "Điện thoại",
  address: "Địa chỉ", billing_address: "Địa chỉ xuất hóa đơn",
};

/** Dùng dữ liệu đã đọc từ DB, không coi field đang nhập ở màn khác là thông tin đã lưu. */
export function applicationSubmitBlockReason(company, documents, selectedFile, busy = false) {
  if (busy) return "Đang xử lý yêu cầu, vui lòng chờ.";
  if (!company?.company_id) return "Hãy lưu hồ sơ doanh nghiệp trước khi gửi đăng ký hợp tác.";
  if (!["DRAFT", "NEEDS_REVISION"].includes(company.application_status)) return "Chỉ hồ sơ bản nháp hoặc cần chỉnh sửa mới được gửi xét duyệt.";
  const missing = Object.entries(requiredFields).filter(([key]) => !String(company[key] ?? "").trim()).map(([, label]) => label);
  if (missing.length) return `Hồ sơ đã lưu còn thiếu: ${missing.join(", ")}. Vào Hồ sơ doanh nghiệp, lưu và xác nhận trước khi gửi.`;
  if (selectedFile) return "Tệp mới chỉ được chọn, chưa tải lên. Bấm Tải tài liệu lên và chờ thành công, hoặc bỏ tệp đã chọn để dùng tài liệu đã lưu.";
  if (!documents?.length) return "Chưa có tài liệu được lưu. Chọn tệp rồi bấm Tải tài liệu lên trước khi gửi đăng ký hợp tác.";
  if (documents.length > 5) return "Hồ sơ chỉ được gửi tối đa 5 tài liệu. Hãy gỡ tài liệu không dùng trước khi gửi.";
  return "";
}

/** Kiểm tra sớm định dạng/dung lượng; backend vẫn kiểm nội dung file thực trước khi lưu. */
export function legalDocumentError(file) {
  if (!file) return "Vui lòng chọn tài liệu để tải lên.";
  if (file.size <= 0 || file.size > 8 * 1024 * 1024) return "Tài liệu phải có dung lượng từ 1 byte đến 8 MB.";
  if (file.type ? !["application/pdf", "image/png", "image/jpeg"].includes(file.type) : !/\.(pdf|png|jpe?g)$/i.test(file.name)) return "Chỉ chấp nhận tài liệu PDF, PNG hoặc JPEG.";
  return "";
}
