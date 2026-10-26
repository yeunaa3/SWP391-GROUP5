import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getCurrentUser, logout as requestLogout } from "../services/authService.js";
import { getPremiumAccess } from "../services/premiumService.js";
import { currentPremium } from "../utils/premiumAccess.js";

// Khởi tạo Context để chia sẻ trạng thái người dùng & gói Premium trên toàn bộ ứng dụng
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Thông tin user hiện tại (null nếu chưa đăng nhập)
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Biến đếm thế hệ (generation) để tránh xung đột dữ liệu bất đồng bộ (race condition)
  const sessionGeneration = useRef(0);
  const premiumGeneration = useRef(0);

  // Lưu trữ dữ liệu gói cước trả về từ API Backend (/api/premium/access)
  // Gồm: { hasAccess: true/false, subscriptions: [...], pendingPackageId: ... }
  const [access, setAccess] = useState(null);
  const [premiumError, setPremiumError] = useState(false);
  const [clock, setClock] = useState(Date.now());

  /**
   * Hàm gọi API backend để lấy thông tin gói Premium mới nhất
   */
  const refreshPremium = useCallback(async () => {
    const generation = ++premiumGeneration.current;

    // Nếu chưa đăng nhập thì không gọi API gói
    if (!user) {
      setAccess(null);
      setPremiumError(false);
      return;
    }

    try {
      // 1. Gọi backend: GET /api/premium/access
      const result = await getPremiumAccess();

      // 2. Kiểm tra xem request này có phải là mới nhất không
      if (generation === premiumGeneration.current) {
        // Gắn thêm owner: user.id để đảm bảo gói đúng của user này
        setAccess({ ...result, owner: user.id });
        setPremiumError(false);
        setClock(Date.now());
      }
    } catch {
      if (generation === premiumGeneration.current) {
        setAccess(null);
        setPremiumError(true);
      }
    }
  }, [user]);

  // Tự động kiểm tra lại gói mỗi 60 giây hoặc khi người dùng quay lại tab (focus)
  useEffect(() => {
    refreshPremium();

    const timer = setInterval(() => {
      setClock(Date.now());
      refreshPremium();
    }, 60000);

    window.addEventListener("focus", refreshPremium);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshPremium);
      premiumGeneration.current++;
    };
  }, [refreshPremium]);

  /**
   * UC-06: Xác nhận phiên đăng nhập từ cookie / token
   */
  async function refresh() {
    const generation = ++sessionGeneration.current;
    premiumGeneration.current++;

    setUser(null);
    setAccess(null);
    setPremiumError(false);
    setLoading(true);

    try {
      const current = await getCurrentUser();
      if (generation !== sessionGeneration.current) return null;
      setUser(current);
      return current;
    } catch {
      if (generation === sessionGeneration.current) setUser(null);
      return null;
    } finally {
      if (generation === sessionGeneration.current) setLoading(false);
    }
  }

  // Chạy 1 lần khi load trang để kiểm tra phiên đăng nhập
  useEffect(() => {
    refresh();
  }, []);

  /**
   * Đăng xuất người dùng
   */
  async function logout() {
    await requestLogout();
    sessionGeneration.current++;
    premiumGeneration.current++;
    setAccess(null);
    setUser(null);
    setLoading(false);
  }

  // Biến `premium`: Chỉ lấy dữ liệu access khi đúng là của user đang đăng nhập
  const premium = user && access?.owner === user.id ? access : null;

  // Biến `premiumActive`: Kiểm tra xem có gói nào còn hạn sử dụng tại thời điểm này không (true/false)
  const premiumActive = Boolean(currentPremium(premium?.subscriptions, clock));

  // Biến `premiumLoading`: Đang chờ API tải xong dữ liệu gói
  const premiumLoading = Boolean(user && !premium && !premiumError);

  // Đóng gói tất cả biến và hàm cần dùng vào `value` để các component con lấy ra sử dụng
  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      logout,
      premium,          // Chứa { hasAccess, subscriptions: [...] }
      premiumActive,    // boolean: có đang active gói không
      premiumError,     // boolean: có lỗi tải gói không
      premiumLoading,   // boolean: đang tải gói
      refreshPremium,   // hàm gọi lại API kiểm tra gói
    }),
    [user, loading, premium, premiumActive, premiumError, premiumLoading, refreshPremium]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom Hook: useAuth
 * Cho phép bất kỳ Component nào trong ứng dụng lấy thông tin người dùng và gói Premium:
 * const { user, premium, premiumActive } = useAuth();
 */
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
