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
import BusinessDashboardPage from "../pages/business/BusinessDashboardPage.jsx";
import PackagesPage from "../pages/premium/PackagesPage.jsx";
import PackageDetailPage from "../pages/premium/PackageDetailPage.jsx";
import PremiumCheckoutPage from "../pages/premium/PremiumCheckoutPage.jsx";
import PremiumRequestsPage from "../pages/premium/PremiumRequestsPage.jsx";
import MySubscriptionPage from "../pages/premium/MySubscriptionPage.jsx";
import TransactionHistoryPage from "../pages/premium/TransactionHistoryPage.jsx";
import ReceiptDetailPage from "../pages/premium/ReceiptDetailPage.jsx";

import AdminDashboardPage from "../pages/admin/AdminDashboardPage.jsx";
import AccessManagementPage from "../pages/admin/AccessManagementPage.jsx";
import SystemSettingsPage from "../pages/admin/SystemSettingsPage.jsx";
import SubscriptionPackagesPage from "../pages/admin/SubscriptionPackagesPage.jsx";
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
import AdManagerBookingQueuePage from "../pages/adManager/AdManagerBookingQueuePage.jsx";
import AdManagerBookingProposalPage from "../pages/adManager/AdManagerBookingProposalPage.jsx";
import AdManagerPaymentTrackingPage from "../pages/adManager/AdManagerPaymentTrackingPage.jsx";
import AdSlotManagementPage from "../pages/admin/AdSlotManagementPage.jsx";
import B2bPackageManagementPage from "../pages/admin/B2bPackageManagementPage.jsx";

const specialPages = {
  "ADM-01": <AdManagerDashboardPage />,
  "ADM-02": <PartnershipQueuePage />,
  "ADM-03": <PartnershipDetailPage />,
  "ADM-04": <AdManagerBookingQueuePage />,
  "ADM-05": <AdManagerBookingProposalPage />,
  "ADM-06": <AdManagerPaymentTrackingPage />,
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
  "CFG-03": <SubscriptionPackagesPage />,
  "CFG-04": <AdSlotManagementPage />,
  "CFG-05": <B2bPackageManagementPage />,
  "CFG-01": <AdminDashboardPage />,
  "CFG-02": <AccessManagementPage />,
  "CFG-06": <SystemSettingsPage />,
  "BUS-01": <BusinessDashboardPage />,
  "BUS-05": <AdvertisingCatalogPage />,
  "BUS-06": <SlotCalendarPage />,
  "BUS-18": <PerformancePage />,
  "BUS-19": <PerformancePage />,
  "ADM-10": <PerformancePage />,
};
const publicAreas = new Set(["public"]);

/**
 * Hàm quyết định màn hình tương ứng cho từng screen:
 * Thay vì viết dồn các toán tử 3 ngôi (ternary) lồng nhau trên 1 dòng,
 * chúng ta tách ra thành các nhánh if...else rõ ràng, có chú thích bằng tiếng Việt.
 */
function screenElement(screen) {
  let pageComponent = null;

  // 1. Nếu màn hình này có trang chuyên biệt đã được khai báo trong specialPages
  if (specialPages[screen.id]) {
    pageComponent = specialPages[screen.id];
  } 
  // 2. Các trang chỉnh sửa và nộp chiến dịch quảng cáo của doanh nghiệp
  else if (["BUS-02", "BUS-13", "BUS-14", "BUS-15", "BUS-16", "BUS-17"].includes(screen.id)) {
    pageComponent = <BusinessCampaignPage screen={screen} />;
  } 
  // 3. Không gian làm việc chung của doanh nghiệp
  else if (screen.area === "business") {
    pageComponent = <BusinessWorkspacePage screen={screen} />;
  } 
  // 4. Màn hình mặc định mẫu chuẩn (specification)
  else {
    pageComponent = <ScreenWorkspacePage screen={screen} />;
  }

  // 5. Kiểm tra phân quyền: Nếu màn hình này yêu cầu Roles thì bọc qua ProtectedRoute
  if (screen.roles && screen.roles.length > 0) {
    return <ProtectedRoute roles={screen.roles}>{pageComponent}</ProtectedRoute>;
  }

  // Nếu là màn công khai (không cần role) thì trả về component trực tiếp
  return pageComponent;
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
          {screens
            .filter((screen) => screen.area === area)
            .map((screen) => (
              <Route
                key={screen.id}
                path={screen.path}
                element={screenElement(screen)}
              />
            ))}

          {area === "adManager" && (
            <Route
              path="/ad-manager/contracts/:contractId"
              element={screenElement(screens.find((screen) => screen.id === "ADM-06"))}
            />
          )}

          {area === "admin" && (
            <Route
              path="/admin/packages"
              element={
                <ProtectedRoute roles={["ADMINISTRATOR"]}>
                  <SubscriptionPackagesPage />
                </ProtectedRoute>
              }
            />
          )}
        </Route>
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
