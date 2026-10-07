import { useCallback,useState } from "react";
import ModalShell from "./ModalShell.jsx";
import { readerFonts,usePreferences } from "../store/PreferencesContext.jsx";

export default function ReaderSettings(){
  const [open,setOpen]=useState(false);const close=useCallback(()=>setOpen(false),[]);
  const {language,setLanguage,font,setFont,t}=usePreferences();
  return <><button className="reader-settings-trigger" onClick={()=>setOpen(true)} aria-label={t("Cài đặt ngôn ngữ và phông chữ","Language and font settings")} title={t("Cài đặt đọc báo","Reading settings")}>⚙ <span>{language==="vi" ? "VI" : "EN"}</span></button>
    {open && <ModalShell title={t("Cài đặt trải nghiệm đọc","Reading preferences")} onClose={close} className="reader-settings-modal">
      <fieldset><legend>{t("Ngôn ngữ giao diện","Interface language")}</legend><div className="language-options">{[["vi","Tiếng Việt"],["en","English"]].map(([id,label])=><button key={id} aria-pressed={language===id} onClick={()=>setLanguage(id)}>{label} {language===id && "✓"}</button>)}</div><small>{t("Đổi ngôn ngữ giao diện; nội dung bài báo vẫn giữ ngôn ngữ nguồn.","Changes the interface language; articles retain their original language.")}</small></fieldset>
      <fieldset><legend>{t("Phông chữ đọc báo","Reading font")}</legend><div className="font-options">{readerFonts.map(item=><button key={item.id} aria-pressed={font===item.id} style={{fontFamily:item.family}} onClick={()=>setFont(item.id)}><strong>{item.name}</strong><small>{item.description[language==="vi" ? 0 : 1]}</small><span>{font===item.id ? "✓" : "Aa"}</span></button>)}</div></fieldset>
      <div className="reading-font-preview" style={{fontFamily:readerFonts.find(item=>item.id===font).family}}><small>{t("XEM TRƯỚC","PREVIEW")}</small><h2>{t("Một góc nhìn mới mỗi ngày","A fresh perspective every day")}</h2><p>{t("Đọc chậm một chút, hiểu thế giới nhiều hơn. Tiếng Việt: ă â ê ô ơ ư đ — dấu sắc, huyền, hỏi, ngã, nặng.","Take your time. Discover stories and perspectives that matter to you.")}</p></div>
      <p className="settings-note">{t("Tự lưu trên trình duyệt này. Phông áp dụng cho vùng tin và bài đọc, không đổi phông menu quản lý. Nếu máy không có phông, trình duyệt dùng phông dự phòng.","Saved automatically in this browser. Fonts apply to news and article text, not workspace menus. A fallback is used if the selected font is unavailable.")}</p>
      <button className="settings-reset" onClick={()=>{setFont("segoe");setLanguage("vi");}}>{t("Khôi phục mặc định","Reset preferences")}</button>
    </ModalShell>}
  </>;
}
