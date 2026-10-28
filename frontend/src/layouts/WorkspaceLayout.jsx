import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, matchPath, Navigate } from "react-router-dom";
import { workspaceHome } from "../utils/sessionRouting.js";
import { usePreferences } from "../store/PreferencesContext.jsx";
import UiIcon from "../components/UiIcon.jsx";
import AccountMenu, { AccountAvatar } from "../components/AccountMenu.jsx";
import NotificationBell from "../components/NotificationBell.jsx";
import { screens } from "../routes/screenCatalog.js";
import { useAuth } from "../store/AuthContext.jsx";

const labels = {
  account: "My Account",
  premium: "Premium Workspace",
  business: "Business Portal",
  adManager: "Ad Manager Workspace",
  admin: "System Administration",
};

/**
 * ============================================================================
 * KHUNG GIAO DIỆN CHUNG CHO CÁC KHÔNG GIAN LÀM VIỆC (WORKSPACE LAYOUT)
 * - Chứa Sidebar bên trái (Navigation menu)
 * - Chứa Topbar bên trên (Breadcrumb, Bell, Avatar)
 * - Chứa <Outlet />: Vị trí cắm động các trang con (PackagesPage, MySubscriptionPage, ...)
 * ============================================================================
 */
export default function WorkspaceLayout({ area }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading, refreshPremium } = useAuth();
  const { t, tr } = usePreferences();
  const { pathname } = useLocation();

  // Khi người dùng chuyển qua lại các trang thuộc khu vực premium, tự động refresh gói
  useEffect(() => {
    if (area === "premium") {
      refreshPremium();
    }
  }, [area, pathname, refreshPremium]);

  // Tìm màn hình hiện tại đang khớp với URL trên trình duyệt
  const current = screens.find(
    (screen) => screen.area === area && matchPath({ path: screen.path, end: true }, pathname)
  );

  // Lọc các mục menu phù hợp với role của user đang đăng nhập
  const navigation = screens.filter(
    (screen) =>
      screen.area === area && screen.id !== "BUS-04" &&
      !screen.path.includes(":") &&
      (!screen.roles?.length || screen.roles.some((role) => user?.roles?.includes(role)))
  );

  const navigationGroups = [
    ...new Set(
      navigation
        .filter((screen) => !["BUS-10", "PRE-04"].includes(screen.id))
        .map((screen) => screen.feature)
    ),
  ];

  const displayName = user?.fullName || user?.username || "Demo User";

  const iconFor = (name) =>
    /Dashboard/.test(name)
      ? "grid"
      : /Calendar/.test(name)
      ? "calendar"
      : /Profile|Users|Roles/.test(name)
      ? "user"
      : /Performance|Report/.test(name)
      ? "chart"
      : /Campaign|Creative/.test(name)
      ? "campaign"
      : /Company|Partnership/.test(name)
      ? "company"
      : "document";

  // 1. Đang kiểm tra token / session
  if (loading) {
    return (
      <div className="route-state">
        {t("Đang kiểm tra phiên đăng nhập…", "Checking your session…")}
      </div>
    );
  }

  // 2. Chưa đăng nhập -> Chuyển hướng sang trang Login
  if (!user) {
    return <Navigate to="/login" replace state={{ returnTo: pathname }} />;
  }

  // 3. Sai quyền (role) -> Chuyển về trang chủ của role đó
  if (current?.roles?.length && !current.roles.some((role) => user.roles?.includes(role))) {
    return <Navigate to={workspaceHome(user)} replace />;
  }

  // 4. Render Layout hoàn chỉnh
  return (
    <div className={`workspace-shell ${menuOpen ? "workspace-menu-open" : ""}`}>
      {/* Nút bấm mở menu trên điện thoại */}
      <button
        className="mobile-workspace-toggle"
        aria-label={t("Đóng/mở menu", "Toggle navigation")}
        aria-expanded={menuOpen}
        aria-controls="workspace-navigation"
        onClick={() => setMenuOpen((value) => !value)}
      >
        <UiIcon name="menu" />
      </button>

      {menuOpen && (
        <button
          className="workspace-scrim"
          aria-label={t("Đóng menu", "Close navigation")}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* CỘT SIDEBAR BÊN TRÁI */}
      <aside id="workspace-navigation" className="sidebar">
        <Link className="brand brand-light" to="/">
          THE PULSE
          <span className="workspace-brand-caption">PARTNER & READER SPACE</span>
        </Link>
        <div className="sidebar-rule" />
        <p className="workspace-name">{tr(labels[area])}</p>

        {/* Danh sách link điều hướng */}
        <nav aria-label={`${tr(labels[area])} navigation`}>
          {navigationGroups.map((group) => (
            <section className="nav-group" key={group}>
              <h2>{tr(group)}</h2>
              {navigation
                .filter(
                  (screen) => screen.feature === group && !["BUS-10", "PRE-04"].includes(screen.id)
                )
                .map((screen) => (
                  <NavLink
                    key={screen.id}
                    className={screen.id === "BUS-03" && pathname === "/business/partnership/status" ? "active" : undefined}
                    to={screen.path}
                    onClick={() => setMenuOpen(false)}
                    end
                  >
                    <UiIcon name={iconFor(screen.name)} />
                    <span>{tr(screen.name)}</span>
                  </NavLink>
                ))}
            </section>
          ))}
        </nav>

        {/* Thông tin user ở góc dưới sidebar */}
        <div className="sidebar-user">
          <AccountAvatar user={user} />
          <div>
            <strong>{displayName}</strong>
            <Link to="/account/profile" onClick={() => setMenuOpen(false)}>
              {tr("View account")}
            </Link>
          </div>
        </div>
      </aside>

      {/* VÙNG NỘI DUNG CHÍNH BÊN PHẢI */}
      <div className="workspace-main">
        {/* Topbar: Breadcrumb đường dẫn + Chuông thông báo + Menu người dùng */}
        <header className="workspace-topbar">
          <div className="workspace-breadcrumb">
            <Link to="/">The Pulse</Link>
            <span>/</span>
            <strong>{tr(current?.name || labels[area])}</strong>
          </div>
          <div className="workspace-tools">
            <NotificationBell />
            <AccountMenu />
          </div>
        </header>

        {/* <Outlet /> CHÍNH LÀ NƠI TRANG CON (VÍ DỤ PackagesPage) ĐƯỢC BƠM VÀO ĐÂY! */}
        <Outlet />
      </div>
    </div>
  );
}
