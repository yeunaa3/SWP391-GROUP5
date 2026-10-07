import { Navigate, Route, Routes } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout.jsx";
import WorkspaceLayout from "../layouts/WorkspaceLayout.jsx";
import ScreenWorkspacePage from "../pages/ScreenWorkspacePage.jsx";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage.jsx";
import LoginPage from "../pages/auth/LoginPage.jsx";
import RegisterPage from "../pages/auth/RegisterPage.jsx";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage.jsx";
import AdvertisingCatalogPage from "../pages/business/AdvertisingCatalogPage.jsx";
import SlotCalendarPage from "../pages/business/SlotCalendarPage.jsx";
import PerformancePage from "../pages/business/PerformancePage.jsx";
import BusinessWorkspacePage from "../pages/business/BusinessWorkspacePage.jsx";
import PackagesPage from "../pages/premium/PackagesPage.jsx";
import ArticlePage from "../pages/public/ArticlePage.jsx";
import HomePage from "../pages/public/HomePage.jsx";
import SearchPage from "../pages/public/SearchPage.jsx";
import AdvertisingDemoPage from "../pages/public/AdvertisingDemoPage.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import { screens } from "./screenCatalog.js";

const specialPages = {
  "PUB-01": <HomePage />,
  "PUB-02": <SearchPage />,
  "PUB-03": <ArticlePage />,
  "AUTH-01": <LoginPage />,
  "AUTH-02": <RegisterPage />,
  "AUTH-03": <ForgotPasswordPage />,
  "AUTH-04": <ResetPasswordPage />,
  "PRE-01": <PackagesPage />,
  "BUS-05": <AdvertisingCatalogPage />,
  "BUS-06": <SlotCalendarPage />,
  "BUS-18": <PerformancePage />,
  "BUS-19": <PerformancePage />,
  "ADM-10": <PerformancePage />,
};
const publicAreas = new Set(["public"]);

function screenElement(screen) {
  const page = specialPages[screen.id] || (screen.area === "business" ? <BusinessWorkspacePage screen={screen}/> : <ScreenWorkspacePage screen={screen} />);
  return screen.roles?.length ? <ProtectedRoute roles={screen.roles}>{page}</ProtectedRoute> : page;
}

export default function AppRoutes() {
  const workspaceAreas = ["account", "premium", "business", "adManager", "admin"];
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/advertising-demo" element={<AdvertisingDemoPage />} />
        {screens.filter((screen) => publicAreas.has(screen.area)).map((screen) => <Route key={screen.id} path={screen.path} element={screenElement(screen)} />)}
      </Route>
      {screens.filter((screen) => screen.area === "auth").map((screen) => <Route key={screen.id} path={screen.path} element={screenElement(screen)} />)}
      {workspaceAreas.map((area) => (
        <Route key={area} element={<WorkspaceLayout area={area} />}>
          {screens.filter((screen) => screen.area === area).map((screen) => <Route key={screen.id} path={screen.path} element={screenElement(screen)} />)}
        </Route>
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
