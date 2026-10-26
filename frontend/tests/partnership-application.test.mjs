import test from "node:test";
import assert from "node:assert/strict";
import { applicationSubmitBlockReason, legalDocumentError } from "../src/utils/partnershipApplication.js";

const company = { company_id: 3, application_status: "DRAFT", company_name: "Công ty thử nghiệm", tax_code: "1234567890", industry: "Công nghệ", contact_person: "Người liên hệ", email: "qa@example.com", phone: "0901234567", address: "Địa chỉ", billing_address: "Địa chỉ hóa đơn" };
const file = { name: "legal.png", type: "image/png", size: 1024 };

test("chỉ chọn tệp chưa được gửi, kể cả trước đó có tài liệu đã lưu", () => {
  assert.match(applicationSubmitBlockReason(company, [], file), /chưa tải lên/);
  assert.match(applicationSubmitBlockReason(company, [{document_id: 1}], file), /chưa tải lên/);
});
test("upload thành công và tải lại tài liệu thì mở gửi cho cả draft và revision", () => {
  assert.equal(applicationSubmitBlockReason(company, [{document_id: 2}], null), "");
  assert.equal(applicationSubmitBlockReason({...company, application_status: "NEEDS_REVISION"}, [{document_id: 2}], null), "");
  assert.match(applicationSubmitBlockReason(company, [], null), /Chưa có tài liệu/);
});
test("thông tin chưa lưu đủ được chỉ rõ thay vì cho gửi rồi mới lỗi", () => {
  assert.match(applicationSubmitBlockReason({...company, industry: " ", billing_address: ""}, [{document_id: 2}], null), /Ngành nghề, Địa chỉ xuất hóa đơn/);
  assert.match(applicationSubmitBlockReason({}, [], null), /lưu hồ sơ/);
});
test("không gửi lặp hoặc gửi khi hồ sơ đang duyệt/đã duyệt/bị từ chối", () => {
  assert.match(applicationSubmitBlockReason(company, [{document_id: 2}], null, true), /Đang xử lý/);
  for (const state of ["PENDING_REVIEW", "RESUBMITTED", "APPROVED", "REJECTED"]) {
    assert.notEqual(applicationSubmitBlockReason({...company, application_status: state}, [{document_id: 2}], null), "");
  }
});
test("file chỉ nhận PDF/PNG/JPEG, không rỗng và tối đa 8 MB", () => {
  for (const type of ["application/pdf", "image/png", "image/jpeg"]) assert.equal(legalDocumentError({...file, type}), "");
  assert.equal(legalDocumentError({...file, size: 8 * 1024 * 1024}), "");
  assert.match(legalDocumentError({...file, size: 8 * 1024 * 1024 + 1}), /8 MB/);
  assert.match(legalDocumentError({...file, size: 0}), /1 byte/);
  assert.match(legalDocumentError({...file, type: "video/mp4"}), /PDF, PNG hoặc JPEG/);
  assert.equal(legalDocumentError({...file, type: "", name: "legal.PDF"}), "");
  assert.match(legalDocumentError(null), /chọn tài liệu/);
});
