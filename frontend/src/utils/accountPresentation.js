export function accountInitials(user) {
  const name = (user?.fullName || user?.username || "").trim();
  const words = name.split(/\s+/).filter(Boolean);
  return words.length ? words.slice(-2).map(word=>Array.from(word)[0]).join("").toLocaleUpperCase() : "U";
}
export function accountRole(roles = []) {
  if(roles.includes("ADMINISTRATOR")) return ["Quản trị viên","Administrator"];
  if(roles.includes("AD_MANAGER")) return ["Quản lý quảng cáo","Ad manager"];
  if(roles.includes("BUSINESS")) return ["Doanh nghiệp","Business"];
  return ["Độc giả","Reader"];
}
