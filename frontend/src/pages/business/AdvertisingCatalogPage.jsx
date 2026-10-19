
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient.js";
import "./AdvertisingCatalogPage.css";

const money = (value, currency = "VND") => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Chưa có giá";
  return `${amount.toLocaleString("vi-VN")} ${currency || "VND"}`;
};

const number = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString("vi-VN") : "—";
};

const getRows = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

function CatalogState({ loading, error, empty, onRetry }) {
  if (loading) {
    return (
      <div className="bus05-state" role="status">
        <span className="bus05-spinner" aria-hidden="true" />
        <strong>Đang tải dữ liệu</strong>
        <p>Vui lòng chờ trong giây lát.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bus05-state bus05-state-error" role="alert">
        <span className="bus05-state-icon" aria-hidden="true">!</span>
        <strong>Không thể tải danh mục</strong>
        <p>{error}</p>
        <button className="bus05-button bus05-button-secondary" onClick={onRetry}>
          Thử tải lại
        </button>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="bus05-state">
        <span className="bus05-state-icon" aria-hidden="true">—</span>
        <strong>Chưa có dữ liệu phù hợp</strong>
        <p>Hãy thử thay đổi từ khóa hoặc bộ lọc.</p>
      </div>
    );
  }

  return null;
}

export default function AdvertisingCatalogPage() {
  const [offers, setOffers] = useState({
    items: [], loading: true, error: "",
  });
  const [slots, setSlots] = useState({
    items: [], loading: true, error: "",
  });

  const [offerQuery, setOfferQuery] = useState("");
  const [compare,setCompare]=useState([]);
  const [offerSort, setOfferSort] = useState("price-asc");
  const [slotQuery, setSlotQuery] = useState("");
  const [slotScope, setSlotScope] = useState("ALL");
  const [slotSort, setSlotSort] = useState("name-asc");
  const [expandedOffers, setExpandedOffers] = useState([]);

  const loadOffers = useCallback(async () => {
    setOffers((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await apiRequest("/api/advertising/offers");
      setOffers({ items: getRows(response), loading: false, error: "" });
    } catch (error) {
      setOffers({
        items: [],
        loading: false,
        error: error?.message || "Đã xảy ra lỗi khi tải gói quảng cáo.",
      });
    }
  }, []);

  const loadSlots = useCallback(async () => {
    setSlots((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await apiRequest("/api/advertising/slots");
      setSlots({ items: getRows(response), loading: false, error: "" });
    } catch (error) {
      setSlots({
        items: [],
        loading: false,
        error: error?.message || "Đã xảy ra lỗi khi tải vị trí quảng cáo.",
      });
    }
  }, []);

  useEffect(() => {
    loadOffers();
    loadSlots();
  }, [loadOffers, loadSlots]);

  const visibleOffers = useMemo(() => {
    const query = offerQuery.trim().toLocaleLowerCase("vi");
    return [...offers.items]
      .filter((offer) =>
        `${offer.name || ""} ${offer.code || ""} ${offer.description || ""}`
          .toLocaleLowerCase("vi")
          .includes(query),
      )
      .sort((a, b) => {
        if (offerSort === "name-asc") {
          return String(a.name || "").localeCompare(String(b.name || ""), "vi");
        }
        if (offerSort === "duration-asc") {
          return Number(a.durationDays || 0) - Number(b.durationDays || 0);
        }
        if (offerSort === "duration-desc") {
          return Number(b.durationDays || 0) - Number(a.durationDays || 0);
        }
        if (offerSort === "price-desc") {
          return Number(b.price || 0) - Number(a.price || 0);
        }
        return Number(a.price || 0) - Number(b.price || 0);
      });
  }, [offers.items, offerQuery, offerSort]);

  const visibleSlots = useMemo(() => {
    const query = slotQuery.trim().toLocaleLowerCase("vi");
    return [...slots.items]
      .filter((slot) => {
        const matchesQuery =
          `${slot.name || ""} ${slot.positionCode || ""}`
            .toLocaleLowerCase("vi")
            .includes(query);
        const matchesScope =
          slotScope === "ALL" || slot.pageScope === slotScope;
        return matchesQuery && matchesScope;
      })
      .sort((a, b) => {
        if (slotSort === "price-asc") {
          return Number(a.basePrice || 0) - Number(b.basePrice || 0);
        }
        if (slotSort === "price-desc") {
          return Number(b.basePrice || 0) - Number(a.basePrice || 0);
        }
        return String(a.name || "").localeCompare(String(b.name || ""), "vi");
      });
  }, [slots.items, slotQuery, slotScope, slotSort]);

  const scopes = useMemo(
    () => [...new Set(slots.items.map((slot) => slot.pageScope).filter(Boolean))].sort(),
    [slots.items],
  );

  const toggleDescription = (id) => {
    setExpandedOffers((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return (
    <main className="page-content bus05-page">
      <header className="bus05-hero">
        <div className="bus05-hero-copy">
          <p className="bus05-eyebrow">BUS-05 · TRUNG TÂM QUẢNG CÁO</p>
          <h1>Bảng giá quảng cáo</h1>
          <p>
            Khám phá các gói chiến dịch và vị trí quảng cáo để lựa chọn
            phương án phù hợp với mục tiêu của doanh nghiệp.
          </p>
        </div>
        <Link className="bus05-button bus05-button-primary" to="/business/bookings/new">
          Bắt đầu đặt quảng cáo <span aria-hidden="true">→</span>
        </Link>
      </header>

      

      <section className="dashboard-section bus05-section">
        <div className="bus05-section-heading">
          <div>
            <p className="bus05-section-kicker">01 · CAMPAIGN PACKAGES</p>
            <h2>Gói chiến dịch quảng cáo</h2>
            <p>So sánh ngân sách, thời lượng và lượng hiển thị dự kiến.</p>
          </div>
          <span className="bus05-count">
            {offers.loading ? "Đang tải…" : `${visibleOffers.length} gói`}
          </span>
        </div>

        <div className="bus05-toolbar">
          <label className="bus05-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={offerQuery}
              onChange={(event) => setOfferQuery(event.target.value)}
              placeholder="Tìm theo tên, mã hoặc mô tả gói…"
              aria-label="Tìm gói quảng cáo"
            />
          </label>
          <label className="bus05-sort">
            <span>Sắp xếp</span>
            <select value={offerSort} onChange={(event) => setOfferSort(event.target.value)}>
              <option value="price-asc">Giá: thấp đến cao</option>
              <option value="price-desc">Giá: cao đến thấp</option>
              <option value="name-asc">Tên: A–Z</option>
              <option value="duration-asc">Thời lượng: ngắn đến dài</option>
              <option value="duration-desc">Thời lượng: dài đến ngắn</option>
            </select>
          </label>
        </div>

        {!offers.loading && !offers.error && offers.items.length === 0 ? (
          <CatalogState empty />
        ) : (
          <>
            <CatalogState
              loading={offers.loading}
              error={offers.error}
              onRetry={loadOffers}
            />
            {!offers.loading && !offers.error && visibleOffers.length === 0 && (
              <CatalogState empty />
            )}
            {!offers.loading && !offers.error && visibleOffers.length > 0 && (
              <div className="bus05-offer-grid">
                {visibleOffers.map((offer) => {
                  const expanded = expandedOffers.includes(offer.id);
                  return (
                    <article className="bus05-offer-card" key={offer.id}>
                      <div className="bus05-card-topline">
                        <span className="bus05-code">{offer.code || "GÓI QUẢNG CÁO"}</span>
                        <span className="bus05-status">
                          <span /> Đang hoạt động
                        </span>
                      </div>
                      <h3>{offer.name || "Gói chưa có tên"}</h3>
                      <label><input type="checkbox" checked={compare.includes(offer.id)} disabled={!compare.includes(offer.id)&&compare.length>=3} onChange={()=>setCompare(ids=>ids.includes(offer.id)?ids.filter(id=>id!==offer.id):[...ids,offer.id])}/> So sánh gói (tối đa 3)</label>
                      <p className={`bus05-description${expanded ? " is-expanded" : ""}`}>
                        {offer.description || "Chưa có mô tả cho gói quảng cáo này."}
                      </p>
                      {offer.description && offer.description.length > 100 && (
                        <button
                          type="button"
                          className="bus05-text-button"
                          onClick={() => toggleDescription(offer.id)}
                          aria-expanded={expanded}
                        >
                          {expanded ? "Thu gọn mô tả" : "Xem thêm mô tả"}
                        </button>
                      )}

                      <div className="bus05-price-block">
                        <span>Giá gói tham khảo</span>
                        <strong>{money(offer.price, offer.currency)}</strong>
                      </div>

                      <div className="bus05-offer-metrics">
                        <div>
                          <span>Thời lượng</span>
                          <strong>{offer.durationDays ?? "—"} ngày</strong>
                        </div>
                        <div>
                          <span>Lượt hiển thị</span>
                          <strong>{number(offer.impressionsQuota)}</strong>
                        </div>
                      </div>

                      <Link
                        className="bus05-button bus05-button-secondary bus05-card-action"
                        to={`/business/bookings/new?packageId=${encodeURIComponent(offer.id)}`}
                      >
                        Chọn gói này <span aria-hidden="true">→</span>
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
        <p className="bus05-footnote">
          Giá hiển thị là giá tham khảo do hệ thống cung cấp; hãy xác nhận
          thông tin trước khi gửi yêu cầu đặt quảng cáo.
        </p>
        {compare.length>0&&<div className="bus05-table-wrap"><h3>So sánh gói đã chọn</h3><table className="bus05-table"><thead><tr><th>Gói</th><th>Giá gói</th><th>Thời hạn tối đa</th><th>Quota</th></tr></thead><tbody>{offers.items.filter(x=>compare.includes(x.id)).map(x=><tr key={x.id}><td>{x.name}</td><td>{money(x.price,x.currency)}</td><td>{x.durationDays} ngày</td><td>{number(x.impressionsQuota)}</td></tr>)}</tbody></table><p>Chưa gồm giá vị trí phân bổ theo số ngày. Quota là chỉ tiêu gói, không phải dự báo lưu lượng.</p></div>}
      </section>

      <section className="dashboard-section bus05-section">
        <div className="bus05-section-heading">
          <div>
            <p className="bus05-section-kicker">02 · AD PLACEMENTS</p>
            <h2>Vị trí quảng cáo</h2>
            <p>Tìm vị trí theo tên, mã vị trí hoặc phạm vi trang.</p>
          </div>
          <span className="bus05-count">
            {slots.loading ? "Đang tải…" : `${visibleSlots.length} vị trí`}
          </span>
        </div>

        <div className="bus05-toolbar">
          <label className="bus05-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={slotQuery}
              onChange={(event) => setSlotQuery(event.target.value)}
              placeholder="Tìm tên hoặc mã vị trí…"
              aria-label="Tìm vị trí quảng cáo"
            />
          </label>
          <div className="bus05-filters">
            <label className="bus05-sort">
              <span>Phạm vi</span>
              <select value={slotScope} onChange={(event) => setSlotScope(event.target.value)}>
                <option value="ALL">Tất cả phạm vi</option>
                {scopes.map((scope) => (
                  <option value={scope} key={scope}>{scope}</option>
                ))}
              </select>
            </label>
            <label className="bus05-sort">
              <span>Sắp xếp</span>
              <select value={slotSort} onChange={(event) => setSlotSort(event.target.value)}>
                <option value="name-asc">Tên: A–Z</option>
                <option value="price-asc">Giá: thấp đến cao</option>
                <option value="price-desc">Giá: cao đến thấp</option>
              </select>
            </label>
          </div>
        </div>

        {!slots.loading && !slots.error && slots.items.length === 0 ? (
          <CatalogState empty />
        ) : (
          <>
            <CatalogState
              loading={slots.loading}
              error={slots.error}
              onRetry={loadSlots}
            />
            {!slots.loading && !slots.error && visibleSlots.length === 0 && (
              <CatalogState empty />
            )}
            {!slots.loading && !slots.error && visibleSlots.length > 0 && (
              <div className="bus05-placement-grid">{visibleSlots.map(slot=><article className="bus05-offer-card" key={slot.id}><div className={`bus05-placement-sketch ${slot.positionCode?.includes("SIDEBAR")?"sidebar":"banner"}`} aria-label={`Sơ đồ vị trí ${slot.name}`}><span>THE PULSE</span><i/><b>{slot.positionCode?.includes("SIDEBAR")?"▥":"▰"}</b><i/></div><h3>{slot.name}</h3><p>{slot.width} × {slot.height} px · PNG/JPEG/MP4 ≤ 60 giây · tối đa 8 MB</p><p>{money(slot.basePrice,slot.currency)} / 30 ngày, cộng giá gói.</p><Link className="bus05-row-link" to={`/business/bookings/new?slotId=${slot.id}`}>Chọn vị trí →</Link><small>Sơ đồ minh họa, chưa xác nhận lịch trống.</small></article>)}</div>
            )}
            {!slots.loading && !slots.error && visibleSlots.length > 0 && (
              <div className="bus05-table-wrap">
                <table className="bus05-table">
                  <thead>
                    <tr>
                      <th>Vị trí quảng cáo</th>
                      <th>Phạm vi</th>
                      <th>Kích thước</th>
                      <th>Giá tham khảo</th>
                      <th><span className="bus05-visually-hidden">Thao tác</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSlots.map((slot) => (
                      <tr key={slot.id}>
                        <td>
                          <strong>{slot.name || "Vị trí chưa có tên"}</strong>
                          <span className="bus05-slot-code">{slot.positionCode || "—"}</span>
                        </td>
                        <td><span className="bus05-scope">{slot.pageScope || "—"}</span></td>
                        <td>
                          {slot.width && slot.height
                            ? `${slot.width} × ${slot.height} px`
                            : "—"}
                        </td>
                        <td><strong>{money(slot.basePrice, slot.currency)}</strong></td>
                        <td>
                          <Link
                            className="bus05-row-link"
                            to={`/business/bookings/new?slotId=${encodeURIComponent(slot.id)}`}
                          >
                            Chọn vị trí →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <p className="bus05-footnote">
          Giá vị trí là giá cơ sở theo 30 ngày, phân bổ theo số ngày thực tế và cộng giá gói.
          Vị trí đang hoạt động không đồng nghĩa với việc
          vị trí đó chắc chắn còn trống trong lịch.
        </p>
      </section>
    </main>
  );
}
