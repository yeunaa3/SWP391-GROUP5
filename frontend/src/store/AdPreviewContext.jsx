import { createContext, useContext } from "react";

export const AdPreviewContext = createContext(false);
export const useAdPreview = () => useContext(AdPreviewContext);

export const previewBanners = [
  { id: "preview-thepluse", title: "The Pluse — Báo chí chất lượng cao", mediaUrl: "/ads/thepluse.svg", targetUrl: "/premium/packages" },
  { id: "preview-onlies", title: "On-Lies Game — Trò chơi trực tuyến", mediaUrl: "/ads/onliesgame.svg", targetUrl: "https://on-lies-game.onrender.com/" },
  { id: "preview-gemini", title: "Google Gemini — Trợ lý AI thế hệ mới", mediaUrl: "/ads/gemini.svg", targetUrl: "https://gemini.google.com/" },
];
