export function allowanceState(grant, userId, premiumActive, now = Date.now()) {
  const valid = premiumActive && grant && grant.owner === userId;
  const remainingSeconds = valid ? Math.max(0, grant.remainingSeconds - Math.max(0, Math.floor((now - grant.receivedAt) / 1000))) : 0;
  return { remainingSeconds, adFreeActive: Boolean(valid && Date.parse(grant.leaseUntil) > now && remainingSeconds > 0) };
}
