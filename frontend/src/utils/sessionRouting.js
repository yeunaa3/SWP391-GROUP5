import { matchPath } from "react-router-dom";
import { screens } from "../routes/screenCatalog.js";

export function workspaceHome(user) {
  const roles = user?.roles || [];
  if (roles.includes("ADMINISTRATOR")) return "/admin";
  if (roles.includes("AD_MANAGER")) return "/ad-manager";
  if (roles.includes("BUSINESS")) return "/business";
  return "/account/profile";
}

export function safeReturnTo(path, user) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return workspaceHome(user);
  const screen = screens.find(item => matchPath({ path: item.path, end: true }, path.split(/[?#]/)[0]));
  if (!screen || screen.area === "auth") return workspaceHome(user);
  return !screen.roles?.length || screen.roles.some(role => user?.roles?.includes(role)) ? path : workspaceHome(user);
}
