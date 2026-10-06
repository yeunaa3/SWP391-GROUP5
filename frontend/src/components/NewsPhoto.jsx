import { useState } from "react";

export default function NewsPhoto({ article, eager = false, className = "" }) {
  const [failed, setFailed] = useState(false);
  return <div className={`editorial-photo ${className}`}>
    {article.thumbnailUrl && !failed ? <img src={article.thumbnailUrl} alt={article.title} loading={eager ? "eager" : "lazy"} referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
      : <div className="photo-unavailable"><span>THE PULSE</span><small>{failed ? "Ảnh nguồn tạm thời không tải được" : "Bài viết chưa có ảnh từ nguồn"}</small></div>}
    {article.premium && <span className="photo-premium">PREMIUM</span>}
  </div>;
}
