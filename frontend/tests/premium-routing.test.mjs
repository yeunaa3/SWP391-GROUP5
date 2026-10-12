import test from "node:test";
import assert from "node:assert/strict";
import { safeReturnTo, workspaceHome } from "../src/utils/sessionRouting.js";
import { packageBenefits, projectedExpiry, money } from "../src/pages/premium/premiumUtils.js";

test("new role cannot return to the previous role's workspace", () => {
  for (const [role, home] of [["READER", "/account/profile"], ["BUSINESS", "/business"], ["ADMINISTRATOR", "/admin"], ["AD_MANAGER", "/ad-manager"]]) {
    const user = { roles: [role] };
    assert.equal(workspaceHome(user), home);
    const oldPath = role === "BUSINESS" ? "/admin" : "/business/advertising/calendar";
    assert.equal(safeReturnTo(oldPath, user), home);
  }
});
test("authorized plan paths and safe query strings survive login", () => {
  assert.equal(safeReturnTo("/premium/checkout/2?source=detail", { roles: ["READER"] }), "/premium/checkout/2?source=detail");
  assert.equal(safeReturnTo("/premium/packages/2", { roles: ["SUBSCRIBER"] }), "/premium/packages/2");
});
test("external, login and unknown return targets are rejected", () => {
  for (const path of ["//example.com", "https://example.com", "/login", "/not-a-screen", null]) {
    assert.equal(safeReturnTo(path, { roles: ["BUSINESS"] }), "/business");
  }
});
test("package benefits tolerate malformed catalog JSON", () => {
  assert.deepEqual(packageBenefits({ benefits: '["Premium",1,null]' }), ["Premium"]);
  assert.deepEqual(packageBenefits({ benefits: "bad" }), []);
  assert.deepEqual(packageBenefits({ benefits: '{}' }), []);
});
test("expiry projection crosses month and year boundaries using duration days", () => {
  assert.equal(projectedExpiry("2026-12-15T00:00:00Z", 30).toISOString(), "2027-01-14T00:00:00.000Z");
  assert.equal(projectedExpiry("2026-01-01T00:00:00Z", 365).toISOString(), "2027-01-01T00:00:00.000Z");
  assert.match(money(79000), /79/);
});
