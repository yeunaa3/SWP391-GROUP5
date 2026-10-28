import test from "node:test";
import assert from "node:assert/strict";
import {sortCampaigns} from "../src/utils/campaignSort.js";

const rows=[
  {campaign_id:1,campaign_name:"Đầu năm",created_at:"2030-01-01 08:00:00",scheduled_start_time:"2030-03-01T00:00:00"},
  {campaign_id:2,campaign_name:"An tâm",created_at:"2030-02-01T08:00:00",scheduled_start_time:"2030-02-01T00:00:00"},
  {campaign_id:3,campaign_name:"Bình an",created_at:"2030-03-01T08:00:00",scheduled_start_time:"2030-01-01T00:00:00"},
];
const ids=(order,input=rows)=>sortCampaigns(input,order).map(x=>x.campaign_id);
test("tên theo bảng chữ cái tiếng Việt A–Z và Z–A, không đổi mảng nguồn",()=>{
  assert.deepEqual(ids("NAME_ASC"),[2,3,1]);assert.deepEqual(ids("NAME_DESC"),[1,3,2]);assert.deepEqual(rows.map(x=>x.campaign_id),[1,2,3]);
});
test("phân biệt thời gian tạo với lịch bắt đầu",()=>{
  assert.deepEqual(ids("CREATED_DESC"),[3,2,1]);assert.deepEqual(ids("CREATED_ASC"),[1,2,3]);
  assert.deepEqual(ids("START_ASC"),[3,2,1]);assert.deepEqual(ids("START_DESC"),[1,2,3]);
});
test("ngày thiếu luôn cuối; cùng tên/ngày dùng ID giảm dần",()=>{
  const missing={campaign_id:4,campaign_name:"An tâm",created_at:null};
  assert.equal(ids("CREATED_ASC",[missing,...rows]).at(-1),4);assert.equal(ids("CREATED_DESC",[missing,...rows]).at(-1),4);
  assert.deepEqual(ids("NAME_ASC",[rows[1],missing]),[4,2]);
});
