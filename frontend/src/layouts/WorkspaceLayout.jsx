import { Link, NavLink, Outlet } from "react-router-dom";

import { screens } from "../routes/screenCatalog.js";
import { useAuth } from "../store/AuthContext.jsx";

const labels = { account: "My Account", premium: "Premium Workspace", business: "Business Portal", adManager: "Ad Manager Workspace", admin: "System Administration" };
const initials = { account: "AC", premium: "PR", business: "BP", adManager: "AM", admin: "SA" };

function shortLabel(name) {
  return name.replace("Management", "").replace("Advertising", "Ad").replace("Partnership Application", "Partnership");
}

export default function WorkspaceLayout({ area }) {
  const { user, logout } = useAuth();
  const navigation = screens.filter((screen) => screen.area === area && !screen.path.includes(":"));
  const navigationGroups = [...new Set(navigation.filter(screen => !["BUS-10", "PRE-04"].includes(screen.id)).map(screen => screen.feature))];
  const displayName = user?.fullName || user?.username || "Demo User";
  return <div className="workspace-shell">
    <aside className="sidebar"><Link className="brand brand-light" to="/">THE PULSE</Link><div className="sidebar-rule" /><p className="workspace-name">{labels[area]}</p><nav aria-label={`${labels[area]} navigation`}>{navigationGroups.map(group => <section className="nav-group" key={group}><h2>{group}</h2>{navigation.filter(screen => screen.feature === group && !["BUS-10", "PRE-04"].includes(screen.id)).map(screen => <NavLink key={screen.id} to={screen.path} end><span className="nav-dot"/>{shortLabel(screen.name)}</NavLink>)}</section>)}</nav><div className="sidebar-user"><span className="avatar">{initials[area]}</span><div><strong>{displayName}</strong><Link to="/account/profile">View account</Link></div></div></aside>
    <div className="workspace-main"><header className="workspace-topbar"><strong>{labels[area]}</strong><div className="workspace-tools"><input placeholder="Search records, contracts and campaigns" /><button className="icon-button" type="button">?</button><button className="icon-button notification-button" type="button">N<span>4</span></button><span className="avatar">{initials[area]}</span><div className="user-meta"><strong>{displayName}</strong><span>Online</span></div><button className="signout-link" type="button" onClick={logout}>Sign out</button></div></header><Outlet /></div>
  </div>;
}
