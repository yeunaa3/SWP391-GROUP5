import test from "node:test";
import assert from "node:assert/strict";
import { companyFields, prepareCompanyProfile, saveAndVerifyCompany } from "../src/services/companyProfileService.js";

const form = { name: "Công ty QA", taxCode: "9876543210", industry: "Công nghệ", contactPerson: "Người liên hệ QA", email: "qa@example.com", phone: "0901234567", address: "Địa chỉ QA", billingAddress: "Địa chỉ hóa đơn QA" };
const record = payload => ({ company_id: 12, ...Object.fromEntries(Object.entries(companyFields).map(([key, column]) => [column, payload[key]])) });

test("snapshot xác nhận chuẩn hóa đủ tám field và không thay đổi form đang nhập", () => {
  const input = { ...form, address: "  Địa chỉ mới  " };
  const payload = prepareCompanyProfile(input);
  input.address = "Sửa sau khi xác nhận";
  assert.equal(payload.address, "Địa chỉ mới");
  assert.throws(() => prepareCompanyProfile({ ...form, industry: "  ", contactPerson: "" }), /Ngành nghề, Người liên hệ/);
});

test("lưu rồi đọc mới từ backend, giữ đủ tám field khi quay lại trang", async () => {
  let database = record(form);
  const calls = [];
  const request = async (path, options) => {
    calls.push({ path, options });
    if (options.method === "PUT") { database = record(JSON.parse(options.body)); return { company: database }; }
    return { company: structuredClone(database) };
  };
  const payload = prepareCompanyProfile({ ...form, address: "Địa chỉ sau sửa", contactPerson: "Liên hệ mới" });
  const saved = await saveAndVerifyCompany(payload, request);
  assert.equal(calls[0].options.method, "PUT");
  assert.equal(calls[1].options.cache, "no-store");
  const reopened = await request("/api/business/workspace", {});
  for (const [key, column] of Object.entries(companyFields)) assert.equal(reopened.company[column], payload[key]);
  assert.deepEqual(reopened.company, saved.company);
});

test("PUT lỗi không báo thành công và không đọc đè dữ liệu nhập", async () => {
  let calls = 0;
  await assert.rejects(saveAndVerifyCompany(form, async () => { calls++; throw new Error("Mã số thuế đã được sử dụng"); }), /Mã số thuế/);
  assert.equal(calls, 1);
});

test("server trả thành công nhưng không lưu đủ dữ liệu thì chặn thông báo thành công", async () => {
  await assert.rejects(saveAndVerifyCompany(form, async (_, options) => options.method === "PUT" ? {} : { company: { ...record(form), industry: "" } }), /chưa khớp/);
});

test("PUT thành công nhưng tải lại lỗi có thông báo phân biệt, không ghi lại lần hai", async () => {
  let writes = 0;
  await assert.rejects(saveAndVerifyCompany(form, async (_, options) => {
    if (options.method === "PUT") { writes++; return {}; }
    throw new Error("Network unavailable");
  }), /Yêu cầu lưu đã thành công nhưng chưa đọc lại/);
  assert.equal(writes, 1);
});
