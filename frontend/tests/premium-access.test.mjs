import test from "node:test";
import assert from "node:assert/strict";
import { currentPremium, ownedPremium } from "../src/utils/premiumAccess.js";
import { adsForPosition, houseAds } from "../src/data/houseAds.js";

const now = Date.parse("2026-10-12T12:00:00Z");
const active = { packageId: 2, status: "ACTIVE", startAt: "2026-10-01T00:00:00Z", endAt: "2026-11-01T00:00:00Z" };
test("entitlement comes from a valid period, not a permanent role", () => {
  assert.equal(currentPremium([active], now), active);
  assert.equal(currentPremium([{ ...active, status: "CANCELLED" }], now), null);
  assert.equal(currentPremium([{ ...active, endAt: "2026-10-12T12:00:00Z" }], now), null);
  assert.equal(currentPremium([{ ...active, startAt: "2026-10-13T12:00:00Z" }], now), null);
  assert.equal(currentPremium(undefined, now), null);
});
test("purchased future renewal is owned but does not grant early access", () => {
  const future = { ...active, startAt: "2026-10-20T00:00:00Z" };
  assert.equal(ownedPremium([future], "2", now), future);
  assert.equal(currentPremium([future], now), null);
  assert.equal(ownedPremium([active], 3, now), null);
});
test("all six content placements get five unique internal house promotions", () => {
  assert.equal(houseAds.length, 5);
  for (const position of ["HEADER_BANNER", "HOME_HERO", "ARTICLE_TOP", "ARTICLE_SIDEBAR", "IN_ARTICLE", "END_OF_ARTICLE"]) {
    const ads = adsForPosition(position);
    assert.equal(new Set(ads.map(ad => ad.id)).size, 5);
    assert.ok(ads.every(ad => ad.targetUrl.startsWith("/") && ad.headline && ad.cta));
  }
  assert.notEqual(adsForPosition("HEADER_BANNER")[0].id, adsForPosition("IN_ARTICLE")[0].id);
});
