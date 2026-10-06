import { Link, useSearchParams } from "react-router-dom";

export default function AdvertisingDemoPage() {
  const [params] = useSearchParams();
  const brands = { novalearn: ["NovaLearn", "Học kỹ năng mới cho một thế giới đang thay đổi", "Công nghệ · Phân tích dữ liệu · Thiết kế sản phẩm"],
    greenfarm: ["GreenFarm", "Cùng xây dựng nông nghiệp bền vững", "Canh tác thông minh · Theo dõi mùa vụ · Tiết kiệm tài nguyên"],
    clouddesk: ["CloudDesk", "Không gian làm việc cho ý tưởng lớn", "Linh hoạt · Kết nối · Sáng tạo"] };
  const brand = brands[params.get("brand")] || brands.novalearn;
  return <main className="public-content demo-landing"><p className="eyebrow">Trang đích quảng cáo · Dữ liệu giả lập</p><h1>{brand[0]}</h1>
    <h2>{brand[1]}</h2><p>{brand[2]}</p><p>Thương hiệu này được tạo để nhóm thử banner và điều hướng quảng cáo. Đây không phải doanh nghiệp hay chương trình khuyến mại thật.</p>
    <Link className="button-link pulse-button" to="/">Quay lại đọc báo</Link></main>;
}
