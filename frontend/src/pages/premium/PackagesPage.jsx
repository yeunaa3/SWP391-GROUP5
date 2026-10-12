import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getActivePremiumPlans } from "../../services/premiumService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";
import { money, packageBenefits } from "../../utils/premium.js";
import "../../assets/premium.css";

export default function PackagesPage() {
  const { t, language } = usePreferences();
  const [state, setState] = useState({ loading: true, packages: [], error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setState({ loading: true, packages: [], error: false });
    getActivePremiumPlans().then(packages => { if (alive) setState({ packages, loading: false, error: false }); })
      .catch(() => { if (alive) setState({ packages: [], loading: false, error: true }); });
    return () => { alive = false; };
  }, [attempt, language]);
  return <main className="page-content premium-page">
    <header className="premium-hero"><span className="premium-kicker">THE PLUSE PREMIUM</span><h1>{t("Đọc sâu hơn. Hiểu trọn hơn.", "More context. A clearer perspective.")}</h1><p>{t("Chọn thời hạn phù hợp và khám phá quyền lợi trước khi quyết định. Giá và gói được tải trực tiếp từ hệ thống.", "Explore plan benefits before you decide. Prices and plans come directly from our catalog.")}</p><div className="premium-assurance"><span>✓ {t("Giá rõ ràng", "Transparent pricing")}</span><span>✓ {t("Xem quyền lợi trước khi mua", "Review before buying")}</span><span>✓ {t("Không tự động gia hạn", "No automatic renewal")}</span></div></header>
    {state.loading && <p role="status">{t("Đang tải gói Premium…", "Loading Premium plans…")}</p>}
    {state.error && <div role="alert" className="premium-empty"><p>{t("Không tải được danh sách gói.", "Unable to load plans.")}</p><button onClick={() => setAttempt(value => value + 1)}>{t("Thử lại", "Retry")}</button></div>}
    {!state.loading && !state.error && !state.packages.length && <p className="premium-empty">{t("Chưa có gói Premium đang mở bán.", "No Premium plans are currently available.")}</p>}
    <div className="premium-plans">{state.packages.map(item => <article className="premium-plan" key={item.id}><span className="premium-kicker">{item.durationDays} {t("NGÀY TRẢI NGHIỆM", "DAYS OF ACCESS")}</span><h2>{item.name}</h2><p>{item.description}</p><strong className="premium-price">{money(item.price, item.currency)}</strong><small>{t("Thanh toán một lần cho toàn bộ thời hạn", "One payment for the full period")}</small><ul>{packageBenefits(item).map(benefit => <li key={benefit}><span>✓</span>{benefit}</li>)}</ul><Link className="button-link" to={`/premium/packages/${item.id}`}>{t("Khám phá quyền lợi", "Explore benefits")} →</Link></article>)}</div>
    <p className="premium-disclaimer">{t("Hệ thống đang thử nghiệm. Một số quyền lợi trong danh mục vẫn đang được phát triển. Chuyển khoản QR tĩnh cần xác minh thủ công; chưa tự động kích hoạt gói.", "Test system. Some catalog benefits remain in development. Static QR transfers require manual verification; activation is not automatic.")}</p>
  </main>;
}
