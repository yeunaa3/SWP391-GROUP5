import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../services/apiClient.js";
import { previewBanners, useAdPreview } from "../store/AdPreviewContext.jsx";
import { adsForPosition } from "../data/houseAds.js";
import { adFormat } from "../utils/adFormats.js";
import { useAuth } from "../store/AuthContext.jsx";
import useReaderPolicy from "../hooks/useReaderPolicy.js";
import { usePreferences } from "../store/PreferencesContext.jsx";
import "../assets/house-ads.css";

/**
 * ============================================================================
 * [BF-08][UC-31] AD BANNER COMPONENT & REAL-TIME EVENT TRACKER
 * Phụ trách: Cường (Ad Server Display, Impression Upsert, Click Tracking)
 * 
 * Nghiệp vụ cốt lõi:
 * 1. [BF-01][Ad-Free Reading]: Tự động ẩn hoàn toàn (return null) khi độc giả là SUBSCRIBER
 * 2. [BF-08][Ad Matching]: Gọi /api/advertising/banners?position={pos}&articleId={id} để lấy banner ACTIVE
 * 3. [BF-08][UC-31 Impression]: Ghi nhận 1 lượt hiển thị nguyên tử qua /events/impression (chuẩn IAB 50% / 1s)
 * 4. [BF-08][UC-31 Click & 302]: Click qua /api/advertising/click/{id} để tăng lượt click và 302 redirect
 * 5. Fallback Display: Hiển thị House Ad tự giới thiệu nếu vị trí chưa có đối tác mua
 * ============================================================================
 */
export default function AdBanner({ position = "HOME_HERO", compact = false, articleId }) {
  const [banners, setBanners] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const preview = useAdPreview();
  const { premiumLoading, loading } = useAuth();
  const { showAdvertising } = useReaderPolicy();
  const { t } = usePreferences();
  const format = adFormat(position);
  const house = !preview && !banners.length;
  const displayBanners = preview ? previewBanners : house ? adsForPosition(position) : banners;
  const trackedImpressions = useRef(new Set());
  const element = useRef(null);

  // [BF-08][UC-31] Tải danh sách banner quảng cáo phù hợp với vị trí và bài viết từ Ad Server
  useEffect(() => {
    if (!showAdvertising) return;
    let alive = true;

    const query = new URLSearchParams({ position });
    if (articleId) {
      query.append("articleId", articleId);
    }

    apiRequest(`/api/advertising/banners?${query.toString()}`)
      .then((data) => {
        if (alive) setBanners(data);
      })
      .catch(() => {
        if (alive) setBanners([]);
      });

    return () => {
      alive = false;
    };
  }, [position, showAdvertising, articleId]);

  useEffect(() => {
    setIndex(0);
  }, [position, preview]);

  // [BF-08] Cơ chế xoay vòng banner (Rotation Carousel) tự động sau 6.5 giây
  useEffect(() => {
    if (
      !showAdvertising ||
      paused ||
      displayBanners.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = setInterval(
      () => setIndex((current) => (current + 1) % displayBanners.length),
      preview ? 4000 : 6500
    );

    return () => clearInterval(timer);
  }, [displayBanners.length, paused, preview, showAdvertising]);

  const banner = displayBanners[index % Math.max(1, displayBanners.length)];

  // [BF-08][UC-31] Ghi nhận Impression khi banner thực tế được hiển thị trên màn hình
  // Chỉ ghi impression khi ít nhất 50% banner ở viewport liên tục 1 giây (chuẩn IAB); preview/house không ghi số liệu.
  useEffect(() => {
    if (
      !banner ||
      house ||
      preview ||
      !banner.id ||
      loading ||
      premiumLoading ||
      !showAdvertising ||
      !element.current
    ) {
      return;
    }

    const id = Number(banner.id);
    if (!Number.isFinite(id) || trackedImpressions.current.has(id)) {
      return;
    }

    let timer;
    const observer = new IntersectionObserver(
      (entries) => {
        clearTimeout(timer);
        if (entries[0]?.isIntersecting && entries[0].intersectionRatio >= 0.5) {
          timer = setTimeout(() => {
            if (document.visibilityState !== "visible") return;
            trackedImpressions.current.add(id);
            apiRequest("/api/advertising/events/impression", {
              method: "POST",
              body: JSON.stringify({ creativeId: id }),
            }).catch(() => trackedImpressions.current.delete(id));
          }, 1000);
        }
      },
      { threshold: [0, 0.5] }
    );

    observer.observe(element.current);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [banner, house, preview, loading, premiumLoading, showAdvertising]);

  // ==========================================================================
  // [BF-01][Ad-Free Check] NẾU LÀ SUBSCRIBER (showAdvertising === false)
  // HOẶC ĐANG TẢI GÓI -> KHÔNG HIỂN THỊ BẤT KỲ BIỂU NGỮ QUẢNG CÁO NÀO
  // ==========================================================================
  if (!banner || !showAdvertising || premiumLoading || loading) {
    return null;
  }

  const brandDetails = {
    "preview-nova": [
      "NOVA LEARN",
      "Kỹ năng mới. Cơ hội mới.",
      "Học công nghệ, dữ liệu và tư duy sáng tạo mỗi ngày.",
      "LEARN",
    ],
    "preview-farm": [
      "GREEN FARM",
      "Công nghệ xanh. Mùa vụ tốt hơn.",
      "Giải pháp thông minh cho một tương lai bền vững.",
      "GROW",
    ],
    "preview-cloud": [
      "CLOUD DESK",
      "Không gian mới. Ý tưởng lớn.",
      "Kết nối đội ngũ, làm việc linh hoạt và hiệu quả.",
      "CREATE",
    ],
  };

  const details = brandDetails[banner.id];
  const artwork = house ? (
    <div className={`house-ad-art tone-${banner.tone}`}>
      <div>
        <small>THE PLUSE · {t("KHÁM PHÁ CÙNG BẠN", "DISCOVER MORE")}</small>
        <strong>{banner.headline}</strong>
        <p>{banner.description}</p>
        <span>{banner.cta} ↗</span>
      </div>
      <b aria-hidden="true">{banner.symbol}</b>
      <i aria-hidden="true" />
    </div>
  ) : preview && details ? (
    <div className={`preview-ad-art ${banner.id}`}>
      <div>
        <small>{details[0]} · QUẢNG CÁO MẪU</small>
        <strong>{details[1]}</strong>
        <p>{details[2]}</p>
        <span>Khám phá ngay ↗</span>
      </div>
      <b aria-hidden="true">{details[3]}</b>
    </div>
  ) : banner.creativeType === "VIDEO" ? (
    <video
      src={banner.mediaUrl}
      muted
      autoPlay
      loop
      playsInline
      aria-label={banner.title}
    />
  ) : (
    <img src={banner.mediaUrl} alt={banner.title} />
  );

  // [BF-08][UC-31] Xử lý click: nếu là banner trả phí thì đi qua endpoint /api/advertising/click/{id}
  const isPaid = !house && !preview && banner.id && !isNaN(Number(banner.id));
  const clickUrl = isPaid ? `/api/advertising/click/${banner.id}` : banner.targetUrl;

  return (
    <aside
      ref={element}
      data-position={position}
      data-format={format.name}
      className={`live-ad ad-format-${format.name} ${compact ? "live-ad-compact" : ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="ad-disclosure">
        {house
          ? t("Tự giới thiệu · The Pluse", "House promotion · The Pluse")
          : preview
          ? `Quảng cáo · xem thử vị trí ${position}`
          : t("Quảng cáo", "Advertisement")}
      </div>

      {isPaid ? (
        <a
          href={clickUrl}
          target={banner.targetUrl?.startsWith("http") ? "_blank" : "_self"}
          rel="noopener noreferrer"
          aria-label={banner.title}
        >
          {artwork}
        </a>
      ) : banner.targetUrl?.startsWith("/") ? (
        <Link to={banner.targetUrl} aria-label={banner.title}>
          {artwork}
        </Link>
      ) : (
        <a
          href={banner.targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={banner.title}
        >
          {artwork}
        </a>
      )}

      {displayBanners.length > 1 && (
        <div className="banner-controls">
          {displayBanners.map((item, number) => (
            <button
              key={item.id}
              aria-label={`Xem quảng cáo ${number + 1}`}
              aria-pressed={number === index % displayBanners.length}
              onClick={() => setIndex(number)}
            >
              {number + 1}
            </button>
          ))}
          <button
            aria-label={paused ? "Tiếp tục xoay quảng cáo" : "Tạm dừng xoay quảng cáo"}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? "▶" : "Ⅱ"}
          </button>
        </div>
      )}
    </aside>
  );
}
