import { Link, useParams } from "react-router-dom";
import { screenById } from "../routes/screenCatalog.js";

const routes = {
  "BUS-01": ["BUS-02","BUS-03","BUS-05","BUS-13"],
  "BUS-02": ["BUS-03","BUS-04"], "BUS-03": ["BUS-02","BUS-04"], "BUS-04": ["BUS-03","BUS-05"],
  "BUS-05": ["BUS-06","BUS-07"], "BUS-06": ["BUS-05","BUS-07"], "BUS-07": ["BUS-06","BUS-11"],
  "BUS-08": ["BUS-09","BUS-12"], "BUS-09": ["BUS-08","BUS-12"], "BUS-10": ["BUS-11"],
  "BUS-11": ["BUS-07","BUS-13"], "BUS-12": ["BUS-09","BUS-14","BUS-11"],
  "BUS-13": ["BUS-14","BUS-18"], "BUS-14": ["BUS-15","BUS-13"], "BUS-15": ["BUS-14","BUS-16"],
  "BUS-16": ["BUS-15","BUS-17"], "BUS-17": ["BUS-15","BUS-19","BUS-13"], "BUS-18": ["BUS-13"], "BUS-19": ["BUS-17","BUS-18"],
  "ADM-01": ["ADM-02","ADM-04","ADM-07","ADM-09"], "ADM-02": ["ADM-04"], "ADM-03": ["ADM-02"],
  "ADM-04": ["ADM-07"], "ADM-05": ["ADM-06","ADM-04"], "ADM-06": ["ADM-05","ADM-04"],
  "ADM-07": ["ADM-09"], "ADM-08": ["ADM-07","ADM-09"], "ADM-09": ["ADM-10"], "ADM-10": ["ADM-09"],
  "PRE-01": ["PRE-05","PRE-06"], "PRE-02": ["PRE-03","PRE-01"], "PRE-03": ["PRE-02","PRE-01"],
  "PRE-04": ["PRE-05","PRE-06"], "PRE-05": ["PRE-01","PRE-06"], "PRE-06": ["PRE-05"], "PRE-07": ["PRE-06"],
};

export default function ScreenConnections({ screen }) {
  const params = useParams();
  const targets = routes[screen.id];
  if (!targets) return null;
  return <section className="screen-connections" aria-label="Các màn hình liên quan"><div><strong>Thao tác liên quan</strong><small>Chuyển màn để tiếp tục xem; không tự duyệt hay thanh toán bản ghi.</small></div><div className="connection-actions">{targets.map(id => {
    const target = screenById[id];
    let missing = false;
    const path = target.path.replace(/\/:([\w]+)(\?)?/g, (_, key, optional) => {
      if (params[key]) return `/${encodeURIComponent(params[key])}`;
      if (optional) return "";
      missing = true; return "";
    });
    return missing ? <span key={id} className="connection-unavailable" title="Chọn bản ghi trong danh sách trước">{target.name} · cần chọn bản ghi</span> : <Link key={id} to={path}>{target.name} →</Link>;
  })}</div></section>;
}
