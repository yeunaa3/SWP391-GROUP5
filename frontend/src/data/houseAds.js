// House promotions fill unused placements; these are not paid campaigns or measured delivery.
export const houseAds = [
  { id: "pluse-daily", title: "The Pluse · Một góc nhìn mới mỗi ngày", headline: "Chạm vào tin mới. Mở rộng góc nhìn.", description: "Theo dõi thời sự, kinh doanh, công nghệ và nông nghiệp trong một không gian đọc.", cta: "Khám phá tin mới", targetUrl: "/search", symbol: "NEWS", tone: "ink" },
  { id: "pluse-premium", title: "The Pluse Premium", headline: "Đọc sâu hơn. Không bị ngắt mạch.", description: "Mở nội dung Premium của The Pluse và tận hưởng trang tin không quảng cáo khi gói còn hiệu lực.", cta: "Xem quyền lợi Premium", targetUrl: "/premium/packages", symbol: "✦", tone: "gold" },
  { id: "pluse-listen", title: "The Pluse · Không gian đọc của bạn", headline: "Tin tức theo nhịp sống của bạn.", description: "Chọn phông chữ, chỉnh cỡ chữ và bật đọc thành tiếng ngay trong bài. Giọng đọc tùy thiết bị.", cta: "Chọn một bài để trải nghiệm", targetUrl: "/search?category=technology", symbol: "Aa", tone: "violet" },
  { id: "pluse-business", title: "The Pluse · Đối tác quảng cáo", headline: "Đưa thương hiệu đến đúng không gian.", description: "Khám phá vị trí quảng cáo và bắt đầu hồ sơ hợp tác cùng The Pluse.", cta: "Trở thành đối tác", targetUrl: "/register", symbol: "↗", tone: "green" },
  { id: "pluse-account", title: "The Pluse · Cùng kết nối", headline: "Một tài khoản. Nhiều trải nghiệm.", description: "Tạo tài khoản độc giả để quản lý hồ sơ và đăng ký gói Premium theo nhu cầu.", cta: "Tạo tài khoản", targetUrl: "/register", symbol: "P", tone: "coral" },
];

export function adsForPosition(position) {
  const offsets = { HEADER_BANNER: 0, HOME_HERO: 1, ARTICLE_TOP: 2, ARTICLE_SIDEBAR: 3, IN_ARTICLE: 4, END_OF_ARTICLE: 0 };
  const offset = offsets[position] ?? 0;
  return [...houseAds.slice(offset), ...houseAds.slice(0, offset)];
}
