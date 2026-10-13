export function notificationCategory(item) {
  const type = `${item.type || ""} ${item.entityType || ""}`.toUpperCase();
  if (/PREMIUM|SUBSCRIPTION/.test(type)) return "premium";
  if (/COMPANY|PARTNERSHIP|APPLICATION/.test(type)) return "partnership";
  if (/CONTRACT|BOOKING|PAYMENT|TRANSACTION/.test(type)) return "payment";
  if (/CAMPAIGN|CREATIVE|ADVERT/.test(type)) return "campaign";
  if (/SECURITY|ACCOUNT|USER|ROLE/.test(type)) return "account";
  return "system";
}

// Build only known app routes; never trust an arbitrary URL from notification text.
export function notificationDestination(item, roles = []) {
  const type = (item.entityType || "").toUpperCase();
  const id = /^\d+$/.test(String(item.entityId || "")) ? String(item.entityId) : null;
  const admin = roles.includes("ADMINISTRATOR"), manager = roles.includes("AD_MANAGER"), business = roles.includes("BUSINESS");
  if (/PREMIUM_REQUEST|SUBSCRIPTION/.test(type)) return admin ? "/admin/subscription-packages" : roles.some(r => ["READER","SUBSCRIBER"].includes(r)) ? "/premium/my-subscription" : null;
  if (/COMPANY|PARTNERSHIP/.test(type)) return manager ? (id ? `/ad-manager/partnerships/${id}` : "/ad-manager/partnerships") : business ? "/business/partnership/status" : null;
  if (/CONTRACT|BOOKING/.test(type)) return manager ? (id ? `/ad-manager/contracts/${id}` : "/ad-manager/bookings") : business ? (id ? `/business/contracts/${id}` : "/business/contracts") : null;
  if (/CAMPAIGN|CREATIVE/.test(type)) return manager ? (id ? `/ad-manager/campaigns/${id}/review` : "/ad-manager/campaigns") : business ? (id ? `/business/campaigns/${id}` : "/business/campaigns") : null;
  if (/USER|ACCOUNT|SECURITY/.test(type)) return "/account/profile";
  return null;
}

export function filterNotifications(items, { state = "all", category = "all", query = "" }) {
  const search = query.trim().toLocaleLowerCase();
  return items.filter(item => (state === "all" || (state === "read" ? item.read : !item.read))
    && (category === "all" || notificationCategory(item) === category)
    && (!search || `${item.title} ${item.content}`.toLocaleLowerCase().includes(search)));
}
