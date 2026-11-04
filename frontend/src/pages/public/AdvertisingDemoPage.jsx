import { Link, useSearchParams } from "react-router-dom";

export default function AdvertisingDemoPage() {
  const [params] = useSearchParams();
  const brands = {
    thepluse: [
      "The Pluse",
      "Đọc báo tập trung. Không quảng cáo.",
      "Cập nhật tin tức thời sự, kinh doanh, công nghệ 24/7 cùng gói hội viên chất lượng cao.",
      "/premium/packages"
    ],
    onlies: [
      "On-Lies Game",
      "Sự thật hay Dối trá? Bạn có dám thử thách?",
      "Trò chơi đấu trí trực tuyến kịch tính, lật ngược tình thế cùng người chơi trên toàn quốc.",
      "https://on-lies-game.onrender.com/"
    ],
    gemini: [
      "Google Gemini",
      "Trí tuệ nhân tạo Gemini — Bứt phá sáng tạo",
      "Trợ lý AI đa phương thức hỗ trợ bạn lập trình, viết lách, phân tích dữ liệu và học tập thông minh.",
      "https://gemini.google.com/"
    ],
    novalearn: [
      "The Pluse",
      "Đọc báo tập trung. Không quảng cáo.",
      "Cập nhật tin tức thời sự, kinh doanh, công nghệ 24/7 cùng gói hội viên chất lượng cao.",
      "/premium/packages"
    ],
    greenfarm: [
      "On-Lies Game",
      "Sự thật hay Dối trá? Bạn có dám thử thách?",
      "Trò chơi đấu trí trực tuyến kịch tính, lật ngược tình thế cùng người chơi trên toàn quốc.",
      "https://on-lies-game.onrender.com/"
    ],
    clouddesk: [
      "Google Gemini",
      "Trí tuệ nhân tạo Gemini — Bứt phá sáng tạo",
      "Trợ lý AI đa phương thức hỗ trợ bạn lập trình, viết lách, phân tích dữ liệu và học tập thông minh.",
      "https://gemini.google.com/"
    ]
  };

  const key = params.get("brand") || "thepluse";
  const brand = brands[key] || brands.thepluse;
  const isExternal = brand[3]?.startsWith("http");

  return (
    <main className="public-content demo-landing">
      <p className="eyebrow">Quảng cáo đối tác · The Pluse Network</p>
      <h1>{brand[0]}</h1>
      <h2>{brand[1]}</h2>
      <p>{brand[2]}</p>
      <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
        {isExternal ? (
          <a className="button-link pulse-button" href={brand[3]} target="_blank" rel="noopener noreferrer">
            Truy cập trang web →
          </a>
        ) : (
          <Link className="button-link pulse-button" to={brand[3]}>
            Khám phá dịch vụ →
          </Link>
        )}
        <Link className="button-link" style={{ background: "transparent", color: "inherit", border: "1px solid currentColor" }} to="/">
          Quay lại đọc báo
        </Link>
      </div>
    </main>
  );
}
