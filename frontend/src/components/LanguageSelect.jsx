import { usePreferences } from "../store/PreferencesContext.jsx";
export default function LanguageSelect(){const {language,setLanguage,t}=usePreferences();return <select className="language-select" aria-label={t("Ngôn ngữ giao diện","Interface language")} value={language} onChange={e=>setLanguage(e.target.value)}><option value="vi">VI</option><option value="en">EN</option></select>;}
