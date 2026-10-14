import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext.jsx";
import { usePreferences } from "../store/PreferencesContext.jsx";
import { workspaceHome } from "../utils/sessionRouting.js";
import { accountInitials, accountRole } from "../utils/accountPresentation.js";
import "../assets/account-menu.css";

export function AccountAvatar({ user }) {
  return <span className="account-avatar" aria-hidden="true">{accountInitials(user)}<i/></span>;
}

export default function AccountMenu() {
  const { user, logout }=useAuth();
  const {t}=usePreferences();
  const navigate=useNavigate(), {pathname}=useLocation();
  const [open,setOpen]=useState(false), [busy,setBusy]=useState(false), [error,setError]=useState("");
  const root=useRef(null), trigger=useRef(null);
  useEffect(()=>{setOpen(false);setError("");},[pathname,user?.id]);
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};
    const escape=e=>{if(e.key==="Escape"){setOpen(false);trigger.current?.focus();}};
    document.addEventListener("pointerdown",outside); document.addEventListener("keydown",escape);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[open]);
  if(!user)return null;
  const name=user.fullName || user.username;
  async function signOut(){
    setBusy(true);setError("");
    try{await logout();navigate("/login",{replace:true});}
    catch{setError(t("Chưa đăng xuất được. Thử lại nhé.","Unable to sign out. Please retry."));}
    finally{setBusy(false);}
  }
  return <div className="compact-account" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
    <button ref={trigger} className="compact-account-trigger" aria-expanded={open} aria-label={`${t("Tài khoản","Account")}: ${name}`} onClick={()=>setOpen(value=>!value)}><AccountAvatar user={user}/><span className="account-caret" aria-hidden="true">⌄</span></button>
    {open&&<div className="compact-account-panel"><header><AccountAvatar user={user}/><div><strong>{name}</strong><small>{t(...accountRole(user.roles))}</small></div></header><nav aria-label={t("Tùy chọn tài khoản","Account options")}><Link to="/account/profile">{t("Hồ sơ và bảo mật","Profile and security")} <span>↗</span></Link><Link to="/account/notifications">{t("Thông báo","Notifications")} <span>↗</span></Link><Link to={workspaceHome(user)}>{t("Không gian làm việc","Workspace")} <span>↗</span></Link><Link to="/">{t("Về trang báo","Read the news")} <span>↗</span></Link></nav>{error&&<p role="alert">{error}</p>}<button className="account-signout" disabled={busy} onClick={signOut}>{busy?t("Đang đăng xuất…","Signing out…"):t("Đăng xuất","Sign out")}</button></div>}
  </div>;
}
