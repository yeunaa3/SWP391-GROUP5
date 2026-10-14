import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { getCurrentUser, logout as requestLogout } from "../services/authService.js";
import { getPremiumAccess } from "../services/premiumService.js";
import { currentPremium } from "../utils/premiumAccess.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionGeneration = useRef(0);
  const premiumGeneration = useRef(0);
  const [access, setAccess] = useState(null);
  const [premiumError, setPremiumError] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const refreshPremium = useCallback(async () => {
    const generation = ++premiumGeneration.current;
    if (!user) { setAccess(null); setPremiumError(false); return; }
    try {
      const result = await getPremiumAccess();
      if (generation === premiumGeneration.current) { setAccess({ ...result, owner: user.id }); setPremiumError(false); setClock(Date.now()); }
    } catch {
      if (generation === premiumGeneration.current) { setAccess(null); setPremiumError(true); }
    }
  }, [user]);
  useEffect(() => {
    refreshPremium();
    const timer = setInterval(() => { setClock(Date.now()); refreshPremium(); }, 60000);
    window.addEventListener("focus", refreshPremium);
    return () => { clearInterval(timer); window.removeEventListener("focus", refreshPremium); premiumGeneration.current++; };
  }, [refreshPremium]);

  async function refresh() {
    // UC-06: gọi /me để xác nhận session, cập nhật user/loading và trả tài khoản hoặc null khi lỗi.
    const generation = ++sessionGeneration.current;
    // Invalidate the previous account while /me verifies the new session.
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

  useEffect(() => { refresh(); }, []);

  async function logout() {
    await requestLogout();
    sessionGeneration.current++;
    premiumGeneration.current++;
    setAccess(null);
    setUser(null);
    setLoading(false);
  }

  const premium = user && access?.owner === user.id ? access : null;
  const premiumActive = Boolean(currentPremium(premium?.subscriptions, clock));
  const value = useMemo(() => ({ user, loading, refresh, logout, premium, premiumActive, premiumError,
    premiumLoading: Boolean(user && !premium && !premiumError), refreshPremium }), [user, loading, premium, premiumActive, premiumError, refreshPremium]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
