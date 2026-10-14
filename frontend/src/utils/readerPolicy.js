export function readerPolicy(user, premiumActive = false) {
  const roles = user?.roles || [];
  const workplaceRole = roles.some(role => ["ADMINISTRATOR", "AD_MANAGER", "BUSINESS"].includes(role));
  const reader = !user || roles.some(role => ["READER", "SUBSCRIBER"].includes(role));
  return {
    readerNavigation: !workplaceRole && reader,
    showAdvertising: !workplaceRole && reader && !premiumActive,
  };
}
