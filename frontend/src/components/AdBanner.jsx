import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../services/apiClient.js";
import { previewBanners, useAdPreview } from "../store/AdPreviewContext.jsx";

export default function AdBanner({ position = "HOME_HERO", compact = false }) {
  const [banners, setBanners] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const preview = useAdPreview();
  const displayBanners = preview ? previewBanners : banners;
  useEffect(() => { let alive = true; apiRequest(`/api/advertising/banners?position=${encodeURIComponent(position)}`)
    .then(data => { if (alive) setBanners(data); }).catch(() => { if (alive) setBanners([]); });
    return () => { alive = false; }; }, [position]);
  useEffect(() => { setIndex(0); }, [position, preview]);
  useEffect(() => {
    if (paused || displayBanners.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex(current => (current + 1) % displayBanners.length), preview ? 4000 : 6500);
    return () => clearInterval(timer);
  }, [displayBanners.length, paused, preview]);
  const banner = displayBanners[index % Math.max(1, displayBanners.length)];
  if (!banner) return null;
  const brandDetails = {
    "preview-nova": ["NOVA LEARN", "Kỹ năng mới. Cơ hội mới.", "Học công nghệ, dữ liệu và tư duy sáng tạo mỗi ngày.", "LEARN"],
    "preview-farm": ["GREEN FARM", "Công nghệ xanh. Mùa vụ tốt hơn.", "Giải pháp thông minh cho một tương lai bền vững.", "GROW"],
    "preview-cloud": ["CLOUD DESK", "Không gian mới. Ý tưởng lớn.", "Kết nối đội ngũ, làm việc linh hoạt và hiệu quả.", "CREATE"],
  };
  const details = brandDetails[banner.id];
  const artwork = preview && details ? <div className={`preview-ad-art ${banner.id}`}><div><small>{details[0]} · QUẢNG CÁO MẪU</small><strong>{details[1]}</strong><p>{details[2]}</p><span>Khám phá ngay ↗</span></div><b aria-hidden="true">{details[3]}</b></div> : <img src={banner.mediaUrl} alt={banner.title} />;
  return <aside data-position={position} className={`live-ad ${compact ? "live-ad-compact" : ""}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <div className="ad-disclosure">Quảng cáo · {preview ? `xem thử vị trí ${position}` : "chiến dịch mẫu"}</div>
    {banner.targetUrl.startsWith("/") ? <Link to={banner.targetUrl} aria-label={banner.title}>{artwork}</Link>
      : <a href={banner.targetUrl} target="_blank" rel="noopener noreferrer" aria-label={banner.title}>{artwork}</a>}
    {displayBanners.length > 1 && <div className="banner-controls">{displayBanners.map((item, number) => <button key={item.id} aria-label={`Xem quảng cáo ${number + 1}`} aria-pressed={number === index} onClick={() => setIndex(number)}>{number + 1}</button>)}<button aria-label={paused ? "Tiếp tục xoay quảng cáo" : "Tạm dừng xoay quảng cáo"} onClick={() => setPaused(value => !value)}>{paused ? "▶" : "Ⅱ"}</button></div>}
  </aside>;
}
