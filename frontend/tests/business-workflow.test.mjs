import test from "node:test";
import assert from "node:assert/strict";
import {occupiedDay,validateRange,freeRanges,addDays} from "../src/utils/bookingCalendar.js";
import {withUtm,startInput,campaignStatuses} from "../src/utils/businessCampaign.js";
import {apiRequest} from "../src/services/apiClient.js";

test("booking liền kề: endAt 00:00 không chiếm thêm ngày",()=>{
  const windows=[{slotId:1,startAt:"2030-01-10T00:00:00",endAt:"2030-01-12T00:00:00"}];
  assert.equal(occupiedDay(windows,1,"2030-01-11"),true);
  assert.equal(occupiedDay(windows,1,"2030-01-12"),false);
  assert.equal(occupiedDay(windows,2,"2030-01-11"),false);
  assert.equal(occupiedDay([{slotId:1,startAt:"2030-01-11T12:00:00",endAt:"2030-01-12T07:00:00"}],1,"2030-01-12"),true);
});
test("ngày nhập tay phải qua cùng validator; lỗi tải lịch không báo hợp lệ",()=>{
  const args={slot:1,duration:7,ready:true,today:"2030-01-01",windows:[{slotId:1,startAt:"2030-01-03T00:00:00",endAt:"2030-01-05T00:00:00"}]};
  assert.equal(validateRange({...args,start:"2030-01-05",end:"2030-01-06"}),"");
  assert.match(validateRange({...args,start:"2030-01-02",end:"2030-01-04"}),/đã đặt/);
  assert.match(validateRange({...args,start:"2030-01-05",end:"2030-01-06",ready:false}),/Chưa kiểm tra/);
  assert.match(validateRange({...args,start:"2030-01-05",end:"2030-01-13"}),/thời hạn/);
  assert.match(validateRange({...args,start:"2029-12-31",end:"2030-01-01"}),/quá khứ/);
});
test("gợi ý đủ số ngày và không giao các lịch đã giữ",()=>{
  const today=new Date(),from=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const windows=[{slotId:1,startAt:from+"T00:00:00",endAt:addDays(from,2)+"T00:00:00"}];
  const rows=freeRanges(windows,1,3,from);
  assert.equal(rows.length,3);assert.equal(rows[0].start,addDays(from,2));assert.equal(rows[0].end,addDays(from,4));
});
test("UTM thay key đã có, giữ query/hash, chặn URL không phải HTTP",()=>{
  const url=new URL(withUtm("https://example.com?a=1&utm_source=old#part","new","display","chiến dịch"));
  assert.deepEqual(url.searchParams.getAll("utm_source"),["new"]);assert.equal(url.hash,"#part");assert.equal(url.searchParams.get("a"),"1");
  assert.throws(()=>withUtm("javascript:alert(1)","a","b","c"));
});
test("đầu hợp đồng có giây được làm tròn lên phút; review tách delivery",()=>{
  assert.equal(startInput("2030-01-01T08:30:23"),"2030-01-01T08:31");
  assert.equal(startInput("2030-01-01T08:30:00"),"2030-01-01T08:30");
  assert.deepEqual(campaignStatuses("SCHEDULED"),{review:"APPROVED",delivery:"SCHEDULED"});
  assert.deepEqual(campaignStatuses("PENDING_REVIEW"),{review:"PENDING_REVIEW",delivery:"NOT_RUNNING"});
});
test("API trả 200 rỗng sau review/delete vẫn thành công",async()=>{
  const original=global.fetch;
  try{global.fetch=async url=>url.endsWith("csrf")?new Response(JSON.stringify({token:"masked"})):new Response("");assert.equal(await apiRequest("/delete",{method:"DELETE"}),null);}finally{global.fetch=original;}
});
test("CSRF_INVALID retry đúng một lần; lỗi quyền hoặc lỗi mạng không tự gửi lại POST",async()=>{
  const original=global.fetch;let mutations=0,csrf=0;
  try{
    global.fetch=async url=>{if(url.endsWith("csrf")){csrf++;return new Response(JSON.stringify({token:"masked"}));}mutations++;return new Response(JSON.stringify({code:"CSRF_INVALID",message:"expired"}),{status:403});};
    await assert.rejects(()=>apiRequest("/save",{method:"POST"}),/expired/);assert.equal(mutations,2);assert.equal(csrf,2);
    mutations=0;global.fetch=async url=>url.endsWith("csrf")?new Response(JSON.stringify({token:"masked"})):(mutations++,new Response(JSON.stringify({code:"FORBIDDEN",message:"no role"}),{status:403}));
    await assert.rejects(()=>apiRequest("/save",{method:"POST"}),/no role/);assert.equal(mutations,1);
    mutations=0;global.fetch=async url=>{if(url.endsWith("csrf"))return new Response(JSON.stringify({token:"masked"}));mutations++;throw new Error("network result unknown");};
    await assert.rejects(()=>apiRequest("/save",{method:"POST"}),/network/);assert.equal(mutations,1);
  }finally{global.fetch=original;}
});
