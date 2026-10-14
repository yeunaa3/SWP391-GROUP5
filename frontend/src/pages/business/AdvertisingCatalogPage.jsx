import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ScreenConnections from "../../components/ScreenConnections.jsx";

import DemoNotice from "../../components/DemoNotice.jsx";
import { getAdvertisingCatalog } from "../../services/contentService.js";

export default function AdvertisingCatalogPage() {
  const [state, setState] = useState({ offers: [], slots: [], demo: false });
  useEffect(() => { getAdvertisingCatalog().then(setState); }, []);
  return <main className="page-content"><DemoNotice show={state.demo}/>
    <div className="page-heading"><div><p className="eyebrow">BUS-05 · Giá quảng cáo</p><h1>Bảng giá quảng cáo</h1><p className="page-subtitle">Hãy so sánh các gói dịch vụ và vị trí trước khi gửi yêu cầu đặt chỗ.</p></div><Link className="button-link" to="/business/bookings/new">Bắt đầu yêu cầu đặt quảng cáo</Link></div>
    <ScreenConnections screen={{id:"BUS-05"}}/>
    <section className="dashboard-section"><div className="section-heading"><h2>Các gói chiến dịch quảng cáo</h2></div><div className="offer-grid">{state.offers.map(offer => <article className="offer-card" key={offer.id}><span>{offer.code}</span><h3>{offer.name}</h3><p>{offer.description}</p><strong>{Number(offer.price).toLocaleString("vi-VN")} {offer.currency}</strong><small>{offer.durationDays} days · {Number(offer.impressionsQuota).toLocaleString()} impressions</small><Link className="outline-button" to={`/business/bookings/new?packageId=${offer.id}`}>Chọn gói →</Link></article>)}</div></section>
    <section className="dashboard-section"><div className="section-heading"><h2>Các vị trí quảng cáo có sẵn</h2></div><div className="data-table"><div className="table-row table-head"><span>Placement</span><span>Scope</span><span>Dimensions</span><span>Base price</span></div>{state.slots.map(slot => <div className="table-row" key={slot.id}><strong>{slot.name}<Link className="slot-book-link" to={`/business/bookings/new?slotId=${slot.id}`}>Đặt vị trí này →</Link></strong><span>{slot.pageScope}</span><span>{slot.width} × {slot.height}</span><span>{Number(slot.basePrice).toLocaleString("vi-VN")} {slot.currency}</span></div>)}</div></section>
  </main>;
}
