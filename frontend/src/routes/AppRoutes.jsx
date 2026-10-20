import CampaignQueueDemoPage from "../pages/adManager/CampaignQueueDemoPage.jsx";
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
import BusinessCampaignPage from "../pages/business/BusinessCampaignPage.jsx";
import PackagesPage from "../pages/premium/PackagesPage.jsx";
import PackageDetailPage from "../pages/premium/PackageDetailPage.jsx";
import PremiumCheckoutPage from "../pages/premium/PremiumCheckoutPage.jsx";
import PremiumRequestsPage from "../pages/premium/PremiumRequestsPage.jsx";
import MySubscriptionPage from "../pages/premium/MySubscriptionPage.jsx";
import TransactionHistoryPage from "../pages/premium/TransactionHistoryPage.jsx";
import ReceiptDetailPage from "../pages/premium/ReceiptDetailPage.jsx";
import PremiumReviewPage from "../pages/premium/PremiumReviewPage.jsx";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage.jsx";
import NotificationsPage from "../pages/account/NotificationsPage.jsx";
import BookmarksPage from "../pages/account/BookmarksPage.jsx";
import ProfilePage from "../pages/account/ProfilePage.jsx";
import ArticlePage from "../pages/public/ArticlePage.jsx";
import HomePage from "../pages/public/HomePage.jsx";
import SearchPage from "../pages/public/SearchPage.jsx";
import AdvertisingDemoPage from "../pages/public/AdvertisingDemoPage.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import { screens } from "./screenCatalog.js";
import { BrowseNewsPage } from "../pages/public/SearchPage.jsx";
import AdManagerDashboardPage from "../pages/adManager/AdManagerDashboardPage.jsx";
import PartnershipQueuePage from "../pages/adManager/PartnershipQueuePage.jsx";
import PartnershipDetailPage from "../pages/adManager/PartnershipDetailPage.jsx";
import ActiveCampaignMonitorPage from "../pages/adManager/ActiveCampaignMonitorPage.jsx";
import CampaignReviewPage from "../pages/adManager/CampaignReviewPage.jsx";

const specialPages = {
  "ADM-01": <AdManagerDashboardPage />,
  "ADM-02": <PartnershipQueuePage />,
  "ADM-03": <PartnershipDetailPage />,
  "ADM-07": <CampaignReviewPage />,
  "ADM-08": <CampaignReviewPage />,
  "ADM-09": <ActiveCampaignMonitorPage />,
  "ACC-01": <ProfilePage />,
  "ACC-02": <NotificationsPage />,
  "ACC-03": <BookmarksPage />,
  "PUB-01": <HomePage />,
  "PUB-02": <SearchPage />,
  "PUB-03": <ArticlePage />,
  "AUTH-01": <LoginPage />,
  "AUTH-02": <RegisterPage />,
  "AUTH-03": <ForgotPasswordPage />,
  "AUTH-04": <ResetPasswordPage />,
  "PRE-01": <PackagesPage />,
  "PRE-02": <PackageDetailPage />,
  "PRE-03": <PremiumCheckoutPage />,
  "PRE-04": <PremiumRequestsPage />,
  "PRE-05": <MySubscriptionPage />,
  "PRE-06": <TransactionHistoryPage />,
  "PRE-07": <ReceiptDetailPage />,
  "CFG-03": <PremiumReviewPage />,
  "CFG-01": <AdminDashboardPage />,
  "BUS-05": <AdvertisingCatalogPage />,
  "BUS-06": <SlotCalendarPage />,
  "BUS-18": <PerformancePage />,
  "BUS-19": <PerformancePage />,
  "ADM-10": <PerformancePage />,
};
const publicAreas = new Set(["public"]);

function screenElement(screen) {
  const page = specialPages[screen.id] || (["BUS-01","BUS-02","BUS-13","BUS-14","BUS-15","BUS-16","BUS-17"].includes(screen.id)?<BusinessCampaignPage screen={screen}/>:screen.area === "business" ? <BusinessWorkspacePage screen={screen}/> : <ScreenWorkspacePage screen={screen} />);
  return screen.roles?.length ? <ProtectedRoute roles={screen.roles}>{page}</ProtectedRoute> : page;
}

export default function AppRoutes() {
  const workspaceAreas = ["account", "premium", "business", "adManager", "admin"];
  return (
    <Routes>
      {import.meta.env.DEV && <Route path="/demo/adm-07" element={<CampaignQueueDemoPage />} />}
      <Route element={<PublicLayout />}>
        <Route path="/news" element={<BrowseNewsPage />} />
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
