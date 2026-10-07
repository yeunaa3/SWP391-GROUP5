import { useCallback,useState } from "react";
import { Link } from "react-router-dom";
import ModalShell from "./ModalShell.jsx";
import { usePreferences } from "../store/PreferencesContext.jsx";

export default function SupportChat(){
  const {t}=usePreferences();const [open,setOpen]=useState(false);const [draft,setDraft]=useState("");const close=useCallback(()=>setOpen(false),[]);
  return <><button className="support-chat-trigger" aria-label={t("Mở khung hỗ trợ","Open support chat")} onClick={()=>setOpen(true)}><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 11.5a9 9 0 0 1-9 9c-1.6 0-3.1-.4-4.4-1L3 21l1.4-4.6A9 9 0 1 1 21 11.5Z"/><path d="M8 11h8m-8 4h5"/></svg><span>{t("Hỗ trợ","Support")}</span></button>
    {open && <ModalShell title="The Pulse Assistant" onClose={close} className="chat-modal"><div className="chat-coming-soon"><span>✦</span><h2>{t("Xin chào, mình là Pulse!","Hi, I'm Pulse!")}</h2><p>{t("Khung chat đã sẵn sàng. Tính năng trò chuyện tự động sẽ được bổ sung sau.","The chat interface is ready. Automated conversations are coming later.")}</p><small>{t("Chưa kết nối AI hoặc nhân viên hỗ trợ","Not connected to AI or a support agent")}</small></div><div className="chat-shortcuts"><Link to="/search" onClick={close}>{t("Khám phá tin tức","Explore the news")} →</Link><Link to="/premium/packages" onClick={close}>{t("Gói Premium","Premium packages")} →</Link><Link to="/login" onClick={close}>{t("Đăng nhập tài khoản","Account login")} →</Link></div><label className="chat-draft-label">{t("Tin nhắn nháp (chưa gửi)","Message draft (not sent)")}<textarea rows="2" value={draft} onChange={e=>setDraft(e.target.value)} placeholder={t("Bạn cần hỗ trợ điều gì?","What can we help you with?")}/></label><button className="chat-send" disabled>{t("Gửi — sắp có","Send — coming soon")}</button></ModalShell>}
  </>;
}
