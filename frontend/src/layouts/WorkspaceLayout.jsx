import { Link, NavLink, Outlet, useLocation, matchPath } from "react-router-dom";
import { usePreferences } from "../store/PreferencesContext.jsx";
import { useState } from "react";
import UiIcon from "../components/UiIcon.jsx";

import { screens } from "../routes/screenCatalog.js";
import { useAuth } from "../store/AuthContext.jsx";

const labels = { account: "My Account", premium: "Premium Workspace", business: "Business Portal", adManager: "Ad Manager Workspace", admin: "System Administration" };
const initials = { account: "AC", premium: "PR", business: "BP", adManager: "AM", admin: "SA" };

function shortLabel(name) {
  return name.replace("Management", "").replace("Advertising", "Ad").replace("Partnership Application", "Partnership");
}

export default function WorkspaceLayout({ area }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { t, tr } = usePreferences();
  const { pathname } = useLocation();
  const current = screens.find(screen => screen.area === area && matchPath({ path: screen.path, end: true }, pathname));
  const navigation = screens.filter((screen) => screen.area === area && !screen.path.includes(":"));
  const navigationGroups = [...new Set(navigation.filter(screen => !["BUS-10", "PRE-04"].includes(screen.id)).map(screen => screen.feature))];
  const displayName = user?.fullName || user?.username || "Demo User";
  const iconFor = name => /Dashboard/.test(name) ? "grid" : /Calendar/.test(name) ? "calendar" : /Profile|Users|Roles/.test(name) ? "user" : /Performance|Report/.test(name) ? "chart" : /Campaign|Creative/.test(name) ? "campaign" : /Company|Partnership/.test(name) ? "company" : "document";
  return <div className={`workspace-shell ${menuOpen ? "workspace-menu-open" : ""}`}>
    <button className="mobile-workspace-toggle" aria-label={t("Đóng/mở menu", "Toggle navigation")} aria-expanded={menuOpen} aria-controls="workspace-navigation" onClick={()=>setMenuOpen(value=>!value)}><UiIcon name="menu"/></button>
    {menuOpen && <button className="workspace-scrim" aria-label={t("Đóng menu", "Close navigation")} onClick={()=>setMenuOpen(false)}/>}
    <aside id="workspace-navigation" className="sidebar"><Link className="brand brand-light" to="/">THE PULSE<span className="workspace-brand-caption">PARTNER & READER SPACE</span></Link><div className="sidebar-rule" /><p className="workspace-name">{tr(labels[area])}</p><nav aria-label={`${tr(labels[area])} navigation`}>{navigationGroups.map(group => <section className="nav-group" key={group}><h2>{tr(group)}</h2>{navigation.filter(screen => screen.feature === group && !["BUS-10", "PRE-04"].includes(screen.id)).map(screen => <NavLink key={screen.id} to={screen.path} onClick={()=>setMenuOpen(false)} end><UiIcon name={iconFor(screen.name)}/><span>{tr(screen.name)}</span></NavLink>)}</section>)}</nav><div className="sidebar-user"><span className="avatar">{initials[area]}</span><div><strong>{displayName}</strong><Link to="/account/profile" onClick={()=>setMenuOpen(false)}>{tr("View account")}</Link></div></div></aside>
    <div className="workspace-main"><header className="workspace-topbar"><div className="workspace-breadcrumb"><Link to="/">The Pulse</Link><span>/</span><strong>{tr(current?.name || labels[area])}</strong></div><div className="workspace-tools"><details className="account-menu"><summary><span className="avatar">{initials[area]}</span><span className="account-name">{displayName}</span><span className="menu-chevron">⌄</span></summary><div className="account-dropdown"><small>{tr(labels[area])}</small><Link to="/account/profile" onClick={event => event.currentTarget.closest('details').removeAttribute('open')}>{t("Tài khoản của tôi", "My account")}</Link><Link to="/" onClick={event => event.currentTarget.closest('details').removeAttribute('open')}>{t("Về trang báo", "Read the news")}</Link><button type="button" onClick={logout}>{t("Đăng xuất", "Sign out")}</button></div></details></div></header><Outlet /></div>
  </div>;
}
