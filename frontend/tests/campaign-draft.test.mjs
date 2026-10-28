import test from "node:test";
import assert from "node:assert/strict";
import { prepareCampaignDraft } from "../src/utils/campaignDraft.js";

const contract={contract_id:3,status:"ACTIVE",payment_status:"PAID",start_at:"2035-01-01T08:30:23",end_at:"2035-02-01T00:00:00"};
const form={contractId:"3",name:"  Chiến dịch thử  ",description:"  Mô tả  ",startTime:"2035-01-01T08:31",endTime:"2035-01-31T23:59",targetUrl:""};
const now=new Date("2034-01-01T00:00:00");
test("nháp chưa có URL vẫn được lưu, chuẩn hóa không sửa form gốc",()=>{
  const result=prepareCampaignDraft(form,contract,now);
  assert.equal(result.name,"Chiến dịch thử");assert.equal(result.description,"Mô tả");assert.equal(result.contractId,3);assert.equal(result.targetUrl,"");assert.equal(form.name,"  Chiến dịch thử  ");
});
test("tên rỗng và hợp đồng không thuộc lựa chọn hoặc chưa thanh toán bị chặn",()=>{
  assert.throws(()=>prepareCampaignDraft({...form,name:"  "},contract,now),/Tên chiến dịch/);
  assert.throws(()=>prepareCampaignDraft({...form,contractId:"4"},contract,now),/chọn hợp đồng/);
  assert.throws(()=>prepareCampaignDraft(form,{...contract,payment_status:"PENDING"},now),/đã thanh toán/);
});
test("lịch phải có đủ ngày, đúng thứ tự, trong hợp đồng và chưa kết thúc",()=>{
  for(const patch of [{startTime:""},{endTime:form.startTime},{startTime:"2035-01-01T08:30"},{endTime:"2035-02-02T00:00"}]) assert.throws(()=>prepareCampaignDraft({...form,...patch},contract,now));
  assert.throws(()=>prepareCampaignDraft(form,contract,new Date("2036-01-01")),/hết hạn/);
});
test("URL tùy chọn nhưng khi có phải đúng giao thức và không chứa mật khẩu",()=>{
  for(const targetUrl of ["javascript:alert(1)","https://user:password@example.com","sai-url"]) assert.throws(()=>prepareCampaignDraft({...form,targetUrl},contract,now),/URL/);
  assert.equal(prepareCampaignDraft({...form,targetUrl:" https://example.com/?a=1#banner "},contract,now).targetUrl,"https://example.com/?a=1#banner");
});
