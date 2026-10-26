import { apiRequest } from "./apiClient.js";

export const companyFields = {
  name: "company_name", taxCode: "tax_code", industry: "industry", contactPerson: "contact_person",
  email: "email", phone: "phone", address: "address", billingAddress: "billing_address",
};
const fieldLabels = { name: "Tên pháp lý", taxCode: "Mã số thuế", industry: "Ngành nghề", contactPerson: "Người liên hệ", email: "Email liên hệ", phone: "Điện thoại", address: "Địa chỉ", billingAddress: "Địa chỉ xuất hóa đơn" };

/** Chụp dữ liệu tại lúc mở xác nhận; không gửi chuỗi chỉ có khoảng trắng cho các field bắt buộc. */
export function prepareCompanyProfile(form) {
  const payload = Object.fromEntries(Object.keys(companyFields).map(key => [key, String(form[key] ?? "").trim()]));
  const missing = Object.keys(companyFields).filter(key => !payload[key]);
  if (missing.length) throw new Error(`Vui lòng điền: ${missing.map(key => fieldLabels[key]).join(", ")}. Hồ sơ chưa được lưu.`);
  return payload;
}

/** Chỉ xác nhận thành công sau PUT và một GET mới từ server; không dùng state/localStorage làm bằng chứng đã lưu. */
export async function saveAndVerifyCompany(payload, request = apiRequest) {
  await request("/api/business/company", { method: "PUT", body: JSON.stringify(payload) });
  let workspace;
  try {
    workspace = await request("/api/business/workspace", { cache: "no-store" });
  } catch {
    throw new Error("Yêu cầu lưu đã thành công nhưng chưa đọc lại được hồ sơ. Dữ liệu nhập vẫn được giữ; hãy kiểm tra kết nối và bấm Làm mới trước khi lưu lại.");
  }
  if (!workspace?.company?.company_id || Object.entries(companyFields).some(([key, column]) => String(workspace.company[column] ?? "").trim() !== payload[key])) {
    throw new Error("Thông tin đọc lại từ máy chủ chưa khớp với nội dung vừa lưu. Chưa thể xác nhận đã lưu đầy đủ; dữ liệu nhập vẫn được giữ. Vui lòng thử lại hoặc kiểm tra bản deploy.");
  }
  return workspace;
}
