export function currentPremium(subscriptions = [], now = Date.now()) {
  return subscriptions.find(item => item.status === "ACTIVE" && Date.parse(item.startAt) <= now && Date.parse(item.endAt) > now) || null;
}

export function ownedPremium(subscriptions = [], packageId, now = Date.now()) {
  return subscriptions.find(item => Number(item.packageId) === Number(packageId) && item.status === "ACTIVE" && Date.parse(item.endAt) > now) || null;
}
