import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext.jsx";
import { usePreferences } from "../store/PreferencesContext.jsx";
import { apiRequest } from "../services/apiClient.js";

export default function NotificationBell(){
  const {user}=useAuth(), {t}=usePreferences();
  const [state,setState]=useState(null);
  useEffect(()=>{
    let alive=true,busy=false;
    if(!user){setState(null);return;}
    async function update(){
      if(busy||document.visibilityState!=="visible")return;
      busy=true;
      try{const data=await apiRequest("/api/notifications");if(alive)setState({owner:user.id,count:Number(data.unreadCount)||0});}
      catch{if(alive)setState(null);}
      finally{busy=false;}
    }
    update();const timer=setInterval(update,60000);
    window.addEventListener("focus",update);window.addEventListener("notifications-updated",update);
    return()=>{alive=false;clearInterval(timer);window.removeEventListener("focus",update);window.removeEventListener("notifications-updated",update);};
  },[user?.id]);
  if(!user)return null;
  const count=state?.owner===user.id?state.count:null;
  return <Link className="notification-bell" to="/account/notifications" aria-label={count===null?t("Mở thông báo","Open notifications"):`${t("Thông báo chưa đọc","Unread notifications")}: ${count}`} title={t("Thông báo","Notifications")}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{count>0&&<span className="notification-bell-count" aria-hidden="true">{count>99?"99+":count}</span>}</Link>;
}
