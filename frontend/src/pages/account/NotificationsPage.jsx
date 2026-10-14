import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../store/AuthContext.jsx";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { apiRequest } from "../../services/apiClient.js";
import { filterNotifications, notificationCategory, notificationDestination } from "../../utils/notifications.js";
import "../../assets/notifications.css";
import { workspaceHome } from "../../utils/sessionRouting.js";

const categories = {
  all:["Tất cả chủ đề","All topics","◎"], premium:["Premium","Premium","✦"], partnership:["Hồ sơ doanh nghiệp","Partnership","▣"],
  payment:["Hợp đồng & thanh toán","Contracts & payments","↔"], campaign:["Chiến dịch","Campaigns","↗"], account:["Tài khoản & bảo mật","Account & security","◇"], system:["Hệ thống","System","◉"],
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const account = useRef(user?.id);
  account.current = user?.id;
  const { t, language } = usePreferences();
  const [inbox, setInbox] = useState({items:[],unreadCount:0,nextCursor:null});
  const [loading,setLoading] = useState(true), [error,setError] = useState(""), [busy,setBusy] = useState(false);
  const [state,setState] = useState("all"), [category,setCategory] = useState("all"), [query,setQuery] = useState("");
  const [selected,setSelected] = useState(null), [attempt,setAttempt] = useState(0);
  const [feedback,setFeedback] = useState("");
  const detailRef = useRef(null), feedRef = useRef(null);
  function selectNotice(id) {
    setSelected(id);
    if (window.matchMedia("(max-width:760px)").matches) requestAnimationFrame(() => detailRef.current?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth",block:"start"}));
  }
  const roles=user?.roles || [];
  useEffect(() => {
    let alive=true;
    setLoading(true); setBusy(false); setError(""); setFeedback(""); setInbox({items:[],unreadCount:0,nextCursor:null}); setSelected(null);
    apiRequest("/api/notifications").then(data => { if(alive) setInbox(data); })
      .catch(() => { if(alive) setError(t("Không tải được thông báo. Vui lòng thử lại.","Unable to load notifications. Please retry.")); })
      .finally(() => { if(alive) setLoading(false); });
    return () => { alive=false; };
  },[user?.id,attempt,language]);
  const filtered=filterNotifications(inbox.items,{state,category,query});
  const active=filtered.find(n=>n.id===selected) || filtered[0];
  const destination=active ? notificationDestination(active,roles) : null;
  const roleLabel=roles.includes("ADMINISTRATOR") ? t("Quản trị viên","Administrator") : roles.includes("AD_MANAGER") ? t("Quản lý quảng cáo","Ad manager") : roles.includes("BUSINESS") ? t("Doanh nghiệp","Business") : t("Độc giả","Reader");
  const date=value => new Date(value).toLocaleString(language === "vi" ? "vi-VN" : "en-GB",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
  async function mark(item,read) {
    const owner = user.id;
    setBusy(true); setFeedback("");
    try { await apiRequest(`/api/notifications/${item.id}/read`,{method:"PATCH",body:JSON.stringify({read})}); if(account.current!==owner) return;
      setInbox(prev=>({...prev,items:prev.items.map(n=>n.id===item.id?{...n,read}:n),unreadCount:Math.max(0,prev.unreadCount+(item.read===read?0:read?-1:1))}));
      window.dispatchEvent(new Event("notifications-updated"));
      setFeedback(read?t("Đã đánh dấu là đã đọc.","Marked as read."):t("Đã đánh dấu là chưa đọc.","Marked as unread."));
    } catch { if(account.current===owner) setFeedback(t("Chưa lưu được trạng thái. Hãy thử lại.","Unable to save read status. Retry.")); }
    finally { if(account.current===owner) setBusy(false); }
  }
  async function allRead() {
    const owner = user.id;
    setBusy(true);
    try { await apiRequest("/api/notifications/read-all",{method:"POST"}); if(account.current!==owner) return; setInbox(prev=>({...prev,unreadCount:0,items:prev.items.map(n=>({...n,read:true}))})); window.dispatchEvent(new Event("notifications-updated")); setFeedback(t("Đã đánh dấu tất cả là đã đọc.","All notifications marked as read.")); }
    catch { if(account.current===owner) setFeedback(t("Chưa cập nhật được. Vui lòng thử lại.","Update failed. Please retry.")); }
    finally { if(account.current===owner) setBusy(false); }
  }
  async function loadMore() {
    const owner = user.id;
    setBusy(true);
    try { const next=await apiRequest(`/api/notifications?before=${inbox.nextCursor}`); if(account.current!==owner) return; setInbox(prev=>({...next,items:[...prev.items,...next.items.filter(n=>!prev.items.some(old=>old.id===n.id))]})); }
    catch { if(account.current===owner) setFeedback(t("Chưa tải được thông báo cũ hơn.","Unable to load older notifications.")); }
    finally { if(account.current===owner) setBusy(false); }
  }
  return <main className="page-content notification-page">
    <header className="notification-hero"><div><span className="notification-eyebrow">ACC-02 · {roleLabel}</span><h1>{t("Điều quan trọng, ở một nơi.","Everything important, in one place.")}</h1><p>{t("Theo dõi cập nhật dành riêng cho bạn. Chọn thông báo để đọc chi tiết và mở công việc liên quan.","Follow your updates. Select a notification to read details and open the related task.")}</p><Link className="notification-back" to={workspaceHome(user)}>← {t("Về không gian của bạn","Back to your workspace")}</Link></div><div className="notification-total"><span aria-hidden="true">◉</span><strong>{inbox.unreadCount}</strong><small>{t("thông báo chưa đọc","unread notifications")}</small></div></header>
    <div className="notification-actionbar"><div className="notification-tabs" aria-label={t("Trạng thái thông báo","Read status")}>{[["all","Tất cả","All"],["unread","Chưa đọc","Unread"],["read","Đã đọc","Read"]].map(([key,vi,en])=><button key={key} aria-pressed={state===key} onClick={()=>setState(key)}>{t(vi,en)}{key==="unread" && <span>{inbox.unreadCount}</span>}</button>)}</div><div><button className="secondary-button" disabled={loading||busy} onClick={()=>setAttempt(a=>a+1)}>↻ {t("Làm mới","Refresh")}</button><button className="secondary-button" disabled={!inbox.unreadCount||busy||loading} onClick={allRead}>✓ {t("Đánh dấu tất cả đã đọc","Mark all read")}</button></div></div>
    {feedback && <p className="notification-feedback" role="status">{feedback}</p>}
    <div className="notification-layout"><aside className="notification-topics"><h2>{t("CHỦ ĐỀ","TOPICS")}</h2>{Object.entries(categories).filter(([key])=>key==="all"||key==="system"||key==="account"||inbox.items.some(n=>notificationCategory(n)===key)||(roles.includes("BUSINESS")||roles.includes("AD_MANAGER")?["partnership","payment","campaign"].includes(key):roles.includes("ADMINISTRATOR")||key==="premium")).map(([key,[vi,en,symbol]])=><button key={key} aria-pressed={category===key} onClick={()=>setCategory(key)}><span aria-hidden="true">{symbol}</span>{t(vi,en)}<small>{key==="all"?inbox.items.length:inbox.items.filter(n=>notificationCategory(n)===key).length}</small></button>)}<div className="notification-tip"><strong>{t("Cách sử dụng","How it works")}</strong><p>{t("1. Lọc chủ đề hoặc tìm nội dung.\n2. Chọn một thông báo.\n3. Đánh dấu đã đọc hoặc mở trang liên quan.","1. Filter or search.\n2. Select a notification.\n3. Mark it read or open the related page.")}</p><small>{t("Đã đọc không có nghĩa là công việc đã hoàn thành.","Read does not mean the task is completed.")}</small></div></aside>
    <section ref={feedRef} className="notification-feed" aria-label={t("Danh sách thông báo","Notification list")}><label className="notification-search"><span>⌕</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t("Tìm trong thông báo…","Search notifications…")} aria-label={t("Tìm trong thông báo","Search notifications")}/></label><div className="notification-list-caption"><strong>{t("HỘP THƯ CỦA BẠN","YOUR INBOX")}</strong><span>{filtered.length} {t("kết quả đã tải","loaded results")}</span></div>
      {loading?<div className="notification-empty" role="status">{t("Đang tải thông báo…","Loading notifications…")}</div>:error?<div className="notification-empty" role="alert"><h2>{t("Chưa kết nối được hộp thư","Inbox unavailable")}</h2><p>{error}</p><button onClick={()=>setAttempt(a=>a+1)}>{t("Thử lại","Retry")}</button></div>:!filtered.length?<div className="notification-empty"><span aria-hidden="true">✓</span><h2>{inbox.items.length?t("Không có thông báo phù hợp","No matching notifications"):t("Bạn đang bắt đầu một hộp thư mới","Your inbox is ready")}</h2><p>{inbox.items.length?t("Thử đổi bộ lọc hoặc từ khóa.","Try another filter or search."):t("Khi có cập nhật về tài khoản hoặc nghiệp vụ, thông báo sẽ xuất hiện tại đây. Không có dữ liệu mẫu được hiển thị như thông báo thật.","Account and workflow updates will appear here. No sample records are shown as real notifications.")}</p>{inbox.items.length>0&&<button onClick={()=>{setState("all");setCategory("all");setQuery("");}}>{t("Xóa bộ lọc","Clear filters")}</button>}</div>:<div className="notification-list">{filtered.map(item=><button key={item.id} className={`notification-item ${!item.read?"is-unread":""} ${active?.id===item.id?"is-selected":""}`} aria-pressed={active?.id===item.id} onClick={()=>selectNotice(item.id)}><span className={`notice-icon type-${notificationCategory(item)}`} aria-hidden="true">{categories[notificationCategory(item)][2]}</span><span className="notice-preview"><span className="notice-meta">{t(...categories[notificationCategory(item)].slice(0,2))}<span>{item.read?t("Đã đọc","Read"):t("Chưa đọc","Unread")}</span></span><strong>{item.title}</strong><span className="notice-excerpt">{item.content}</span><time dateTime={item.createdAt}>{date(item.createdAt)}</time></span>{!item.read&&<i className="notice-dot" aria-label={t("Chưa đọc","Unread")}/>}</button>)}</div>}
      {inbox.nextCursor&&!loading&&<button className="notification-load-more secondary-button" disabled={busy} onClick={loadMore}>{t("Tải thông báo cũ hơn","Load older notifications")}</button>}</section>
    <section ref={detailRef} className="notification-detail" aria-label={t("Chi tiết thông báo","Notification details")}>{active&&!loading&&!error?<><button className="notification-back-to-list secondary-button" onClick={()=>feedRef.current?.scrollIntoView({block:"start"})}>← {t("Về danh sách","Back to list")}</button><div className="notification-detail-top"><span className={`notice-icon type-${notificationCategory(active)}`} aria-hidden="true">{categories[notificationCategory(active)][2]}</span><span>{t(...categories[notificationCategory(active)].slice(0,2))}</span><small>{active.read?t("Đã đọc","Read"):t("Chưa đọc","Unread")}</small></div><h2>{active.title}</h2><time dateTime={active.createdAt}>{date(active.createdAt)}</time><p className="notification-body">{active.content}</p>{active.entityId&&<div className="notification-record">{t("Mã tham chiếu","Reference")} <strong>#{active.entityId}</strong></div>}<div className="notification-detail-actions">{destination?<Link className="button-link" to={destination}>{t("Mở trang liên quan","Open related page")} ↗</Link>:<p>{t("Thông báo này không cần mở trang khác.","No related page is required for this notification.")}</p>}<button className="secondary-button" disabled={busy} onClick={()=>mark(active,!active.read)}>{active.read?t("Đánh dấu chưa đọc","Mark unread"):t("Đánh dấu đã đọc","Mark read")}</button></div><small className="notification-privacy">{t("Chỉ bạn nhìn thấy hộp thư này. Mở trang liên quan không tự duyệt, thanh toán hay thay đổi hồ sơ.","This inbox is private. Opening a page does not approve, pay or modify a record.")}</small></>:<div className="notification-detail-placeholder"><span aria-hidden="true">◇</span><h2>{t("Đọc rõ. Thao tác đúng.","Read clearly. Act confidently.")}</h2><p>{t("Nội dung đầy đủ và thao tác sẽ hiện ở đây khi bạn chọn một thông báo.","Select a notification to see its full message and actions.")}</p></div>}</section></div>
  </main>;
}
