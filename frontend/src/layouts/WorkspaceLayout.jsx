import { Link, NavLink, Outlet, useLocation, matchPath, Navigate } from "react-router-dom";
import { workspaceHome } from "../utils/sessionRouting.js";
import { usePreferences } from "../store/PreferencesContext.jsx";
import { useEffect, useState } from "react";
import UiIcon from "../components/UiIcon.jsx";
import AccountMenu, { AccountAvatar } from "../components/AccountMenu.jsx";
import NotificationBell from "../components/NotificationBell.jsx";

import { screens } from "../routes/screenCatalog.js";
import { useAuth } from "../store/AuthContext.jsx";

const labels = { account: "My Account", premium: "Premium Workspace", business: "Business Portal", adManager: "Ad Manager Workspace", admin: "System Administration" };

export default function WorkspaceLayout({ area }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading, refreshPremium } = useAuth();
  const { t, tr } = usePreferences();
  const { pathname } = useLocation();
  useEffect(() => { if (area === "premium") refreshPremium(); }, [area, pathname, refreshPremium]);
  const current = screens.find(screen => screen.area === area && matchPath({ path: screen.path, end: true }, pathname));
  const navigation = screens.filter((screen) => screen.area === area && !screen.path.includes(":") && (!screen.roles?.length || screen.roles.some(role => user?.roles?.includes(role))));
  const navigationGroups = [...new Set(navigation.filter(screen => !["BUS-10", "PRE-04"].includes(screen.id)).map(screen => screen.feature))];
  const displayName = user?.fullName || user?.username || "Demo User";
  const iconFor = name => /Dashboard/.test(name) ? "grid" : /Calendar/.test(name) ? "calendar" : /Profile|Users|Roles/.test(name) ? "user" : /Performance|Report/.test(name) ? "chart" : /Campaign|Creative/.test(name) ? "campaign" : /Company|Partnership/.test(name) ? "company" : "document";
  if (loading) return <div className="route-state">{t("Đang kiểm tra phiên đăng nhập…", "Checking your session…")}</div>;
  if (!user) return <Navigate to="/login" replace state={{ returnTo: pathname }} />;
  if (current?.roles?.length && !current.roles.some(role => user.roles?.includes(role))) return <Navigate to={workspaceHome(user)} replace />;
  return <div className={`workspace-shell ${menuOpen ? "workspace-menu-open" : ""}`}>
    <button className="mobile-workspace-toggle" aria-label={t("Đóng/mở menu", "Toggle navigation")} aria-expanded={menuOpen} aria-controls="workspace-navigation" onClick={()=>setMenuOpen(value=>!value)}><UiIcon name="menu"/></button>
    {menuOpen && <button className="workspace-scrim" aria-label={t("Đóng menu", "Close navigation")} onClick={()=>setMenuOpen(false)}/>}
    <aside id="workspace-navigation" className="sidebar"><Link className="brand brand-light" to="/">THE PULSE<span className="workspace-brand-caption">PARTNER & READER SPACE</span></Link><div className="sidebar-rule" /><p className="workspace-name">{tr(labels[area])}</p><nav aria-label={`${tr(labels[area])} navigation`}>{navigationGroups.map(group => <section className="nav-group" key={group}><h2>{tr(group)}</h2>{navigation.filter(screen => screen.feature === group && !["BUS-10", "PRE-04"].includes(screen.id)).map(screen => <NavLink key={screen.id} to={screen.path} onClick={()=>setMenuOpen(false)} end><UiIcon name={iconFor(screen.name)}/><span>{tr(screen.name)}</span></NavLink>)}</section>)}</nav><div className="sidebar-user"><AccountAvatar user={user}/><div><strong>{displayName}</strong><Link to="/account/profile" onClick={()=>setMenuOpen(false)}>{tr("View account")}</Link></div></div></aside>
    <div className="workspace-main"><header className="workspace-topbar"><div className="workspace-breadcrumb"><Link to="/">The Pulse</Link><span>/</span><strong>{tr(current?.name || labels[area])}</strong></div><div className="workspace-tools"><NotificationBell/><AccountMenu/></div></header><Outlet /></div>
  </div>;
}
