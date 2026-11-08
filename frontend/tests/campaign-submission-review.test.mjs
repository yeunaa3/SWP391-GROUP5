import test from "node:test";
import assert from "node:assert/strict";
import { approvalWarnings, reviewHref, reviewFormError } from "../src/utils/campaignSubmissionReview.js";
const now = new Date("2030-01-02T00:00:00").getTime();
const snapshot = { campaign: { scheduled_start_time: "2030-01-03 00:00:00", scheduled_end_time: "2030-01-04T00:00:00", target_url: "https://example.com/landing" }, contract: { status: "ACTIVE", payment_status: "PAID" } };
test("future and already started campaigns can be reviewed while end remains in future", () => {
  assert.deepEqual(approvalWarnings(snapshot, now), []);
  assert.deepEqual(approvalWarnings({ ...snapshot, campaign: { ...snapshot.campaign, scheduled_start_time: "2030-01-01T00:00:00" } }, now), []);
});
test("end boundary, invalid dates, reversed schedule and unpaid/inactive contract block approval", () => {
  for (const end of ["2030-01-02T00:00:00", "2029-12-31T00:00:00", "invalid", null]) assert.ok(approvalWarnings({ ...snapshot, campaign: { ...snapshot.campaign, scheduled_end_time: end } }, now).length);
  assert.equal(approvalWarnings({ ...snapshot, contract: { status: "EXPIRED", payment_status: "UNPAID" } }, now).length, 2);
});
test("legacy internal landing URL is viewable but approval needs complete HTTP URL", () => {
  assert.equal(reviewHref("/advertising-demo"), "/advertising-demo");
  assert.equal(approvalWarnings({ ...snapshot, campaign: { ...snapshot.campaign, target_url: "/advertising-demo" } }, now).length, 1);
});
test("destination links reject executable, protocol-relative, credentials and backslash paths", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,bad", "//example.com", "/\\example.com", "https://user:secret@example.com", ""]) assert.equal(reviewHref(value), null);
  assert.equal(reviewHref("https://example.com/a?q=1#part"), "https://example.com/a?q=1#part");
});
test("explicit decision and nonblank reason required; original length capped at 2000", () => {
  assert.match(reviewFormError("", "Valid reason"), /chọn/); assert.match(reviewFormError("ACTIVE", "Valid reason"), /chọn/);
  assert.match(reviewFormError("APPROVED", " \n "), /nhập/);
  assert.equal(reviewFormError("APPROVED", "a".repeat(2000)), ""); assert.match(reviewFormError("APPROVED", "a".repeat(2001)), /2.000/);
});
test("blocked approval still allows revision and rejection", () => {
  assert.match(reviewFormError("APPROVED", "Reason", true), /Chưa thể/);
  assert.equal(reviewFormError("NEEDS_REVISION", "Please adjust schedule", true), ""); assert.equal(reviewFormError("REJECTED", "Inappropriate content", true), "");
});
