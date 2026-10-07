import { Link } from "react-router-dom";
import { useState } from "react";
import { usePreferences } from "../store/PreferencesContext.jsx";

export default function AuthShell({ code, eyebrow, title, description, children }) {
  const {t}=usePreferences();
  const [paused, setPaused] = useState(false);
  return <main className="auth-split auth-editorial">
    <section className="auth-brand-panel">
      <Link to="/">← {t("Về trang báo","Back to the news")}</Link>
      <strong className="auth-logo">THE PLUSE<span>NEWS & PERSPECTIVES</span></strong>
      <div className="auth-editorial-content">
        <p className="auth-kicker">{t("TIN TỨC. GÓC NHÌN. KẾT NỐI.","NEWS. PERSPECTIVES. CONNECTIONS.")}</p>
        <h2>{t("Mỗi ngày,","Every day,")}<br/><em>{t("một góc nhìn mới.","a fresh perspective.")}</em></h2>
        <p className="auth-editorial-description">{t("Theo nhịp thời sự, đọc sâu câu chuyện bạn quan tâm. Tất cả bắt đầu tại The Pluse.","Follow the headlines. Go deeper into the stories that matter. It all starts at The Pluse.")}</p>
        <div className={`newspaper-scene${paused ? " is-paused" : ""}`} aria-hidden="true">
          <div className="newspaper-orbit" />
          <div className="newspaper-sheet newspaper-back"><span>THE PLUSE</span><div className="newspaper-back-columns" /></div>
          <div className="newspaper-sheet newspaper-front">
            <div className="newspaper-edition"><span>{t("ẤN BẢN MỖI NGÀY","DAILY EDITION")}</span><span>EST. 2026</span></div>
            <strong className="newspaper-masthead">THE PLUSE</strong>
            <div className="newspaper-sections">{t("THỜI SỰ · KINH DOANH · ĐỜI SỐNG","NEWS · BUSINESS · LIFE")}</div>
            <h3>{t("Thế giới chuyển động.","The world moves.")}<br/>{t("Góc nhìn ở lại.","Perspective stays.")}</h3>
            <div className="newspaper-story"><div className="newspaper-art"><span className="paper-sun"/><span className="paper-building b1"/><span className="paper-building b2"/><span className="paper-building b3"/><span className="paper-building b4"/><small>THE PLUSE / CITY STORIES</small></div><div className="newspaper-column"><b>{t("Đọc để hiểu hơn","Read to understand")}</b><p>{t("Những câu chuyện mở ra kết nối mới giữa con người và thế giới.","Stories that connect people with the world around them.")}</p><span>↗</span></div></div>
            <div className="newspaper-bottom"><span>01 / THE DAILY PERSPECTIVE</span><strong>{t("Khám phá điều đáng đọc.","Discover your next story.")}</strong></div>
            <span className="newspaper-fold"/>
          </div>
          <span className="newspaper-floating-tag">✦ {t("Góc nhìn mỗi ngày","A daily perspective")}</span>
        </div>
        <div className="auth-scene-caption"><span>{t("Câu chuyện mới. Cảm hứng mới.","New stories. Fresh inspiration.")}</span><button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? t("▶ Chuyển động","▶ Play motion") : t("Ⅱ Tạm dừng","Ⅱ Pause motion")}</button></div>
      </div>
      <p className="auth-brand-footnote">{t("Đọc tin · Khám phá Premium · Kết nối thương hiệu","Read · Explore Premium · Connect brands")}</p>
    </section>
    <section className="auth-form-panel"><div className="auth-form-wrap"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="auth-description">{description}</p>{children}</div><footer>© 2026 The Pluse</footer></section>
  </main>;
}
