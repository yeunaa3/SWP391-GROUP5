import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import DemoNotice from "../../components/DemoNotice.jsx";
import { getSubscriptionPackages } from "../../services/contentService.js";

function benefits(value) { try { return JSON.parse(value || "[]"); } catch { return []; } }

export default function PackagesPage() {
  const [state, setState] = useState({ packages: [], demo: false });
  useEffect(() => { getSubscriptionPackages().then(({ data, demo }) => setState({ packages: data, demo })); }, []);
  return <main className="page-content"><DemoNotice show={state.demo} /><div className="center-heading"><p className="eyebrow">PRE-01 · Premium subscription</p><h1>Choose the depth you need.</h1><p>Every plan includes full Premium access and a focused reading experience.</p></div><div className="pricing-grid">{state.packages.map((item, index) => <article className={`price-card ${index === 1 ? "recommended" : ""}`} key={item.id}>{index === 1 && <span className="recommend-label">Best value</span>}<p className="eyebrow">{item.code}</p><h2>{item.name}</h2><p>{item.description}</p><div className="price">{Number(item.price).toLocaleString("vi-VN")} <small>{item.currency}</small></div><span>{item.durationDays} days of access</span><ul>{benefits(item.benefits).map((benefit) => <li key={benefit}>✓ {benefit}</li>)}</ul><Link className="button-link" to={`/premium/checkout/${item.id}`}>Choose plan</Link></article>)}</div></main>;
}
