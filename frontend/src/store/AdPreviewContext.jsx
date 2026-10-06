import { createContext, useContext } from "react";

export const AdPreviewContext = createContext(false);
export const useAdPreview = () => useContext(AdPreviewContext);

export const previewBanners = [
  { id: "preview-nova", title: "NovaLearn — Học kỹ năng số", mediaUrl: "/ads/novalearn.svg", targetUrl: "/advertising-demo?brand=novalearn" },
  { id: "preview-farm", title: "GreenFarm — Nông nghiệp thông minh", mediaUrl: "/ads/greenfarm.svg", targetUrl: "/advertising-demo?brand=greenfarm" },
  { id: "preview-cloud", title: "CloudDesk — Không gian làm việc", mediaUrl: "/ads/clouddesk.svg", targetUrl: "/advertising-demo?brand=clouddesk" },
];
