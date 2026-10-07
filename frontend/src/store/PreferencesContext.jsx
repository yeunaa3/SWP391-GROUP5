import { createContext, useContext, useEffect, useState } from "react";
import { translateUi } from "../data/uiTranslations.js";

export const readerFonts = [
  {id:"segoe",name:"Segoe UI",family:'"Segoe UI",system-ui,sans-serif',description:["Gọn, dễ đọc · mặc định","Clean and readable · default"]},
  {id:"arial",name:"Arial",family:'Arial,Helvetica,sans-serif',description:["Không chân, quen thuộc","Familiar sans-serif"]},
  {id:"georgia",name:"Georgia",family:'Georgia,"Times New Roman",serif',description:["Có chân, phong cách báo chí","Serif with an editorial feel"]},
  {id:"times",name:"Times New Roman",family:'"Times New Roman",Times,serif',description:["Có chân, cổ điển","Classic serif"]},
];
const PreferencesContext=createContext(null);
function stored(key,fallback) {try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
export function PreferencesProvider({children}) {
  const [language,setLanguage]=useState(()=>stored("pulse-language","vi")==="en" ? "en" : "vi");
  const [font,setFont]=useState(()=>{const saved=stored("pulse-reader-font","segoe");return readerFonts.some(item=>item.id===saved) ? saved : "segoe";});
  useEffect(()=>{document.documentElement.lang=language;document.documentElement.style.setProperty("--reader-font",readerFonts.find(item=>item.id===font).family);try{localStorage.setItem("pulse-language",language);localStorage.setItem("pulse-reader-font",font);}catch{/* Works for this session even without storage. */}},[language,font]);
  const t=(vi,en)=>language==="en" ? en || vi : vi;
  const tr = text => translateUi(text, language);
  return <PreferencesContext.Provider value={{language,setLanguage,font,setFont,t,tr}}>{children}</PreferencesContext.Provider>;
}
export function usePreferences(){return useContext(PreferencesContext);}
