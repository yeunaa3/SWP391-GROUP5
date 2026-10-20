import { useAuth } from "../store/AuthContext.jsx";
import { readerPolicy } from "../utils/readerPolicy.js";

/**
 * ============================================================================
 * [BF-01][BF-08] useReaderPolicy React Hook
 * Phụ trách: Cường (Hook theo dõi quyền đọc báo và trạng thái hiển thị quảng cáo)
 * ============================================================================
 */
export default function useReaderPolicy() {
  const { user, premiumActive, premiumLoading, loading } = useAuth();
  const policy = readerPolicy(user, premiumActive);

  return {
    ...policy,
    // Tránh chớp nháy quảng cáo trong khi hệ thống đang xác thực session hoặc tải trạng thái Premium
    showAdvertising: policy.showAdvertising && !loading && !premiumLoading,
  };
}
