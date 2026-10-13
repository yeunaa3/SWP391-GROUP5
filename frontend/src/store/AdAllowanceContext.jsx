import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import { apiRequest } from "../services/apiClient.js";
import { allowanceState } from "../utils/adAllowance.js";

const Context = createContext({ adFreeActive: false, remainingSeconds: 0, allowanceError: false });
export function AdAllowanceProvider({ children }) {
  const { user, premiumActive } = useAuth();
  const { pathname } = useLocation();
  const newsPage = pathname === "/" || pathname === "/search" || pathname.startsWith("/articles/");
  const [grant, setGrant] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [allowanceError, setError] = useState(false);
  useEffect(() => {
    let alive = true, busy = false;
    setGrant(null); setError(false);
    if (!user || !premiumActive || !newsPage) return;
    async function reserve() {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const data = await apiRequest("/api/premium/ad-allowance", { method: "POST" });
        if (alive) { setGrant({ ...data, owner: user.id, receivedAt: Date.now() }); setError(false); }
      } catch { if (alive) { setGrant(null); setError(true); } }
      finally { busy = false; }
    }
    reserve();
    const poll = setInterval(reserve, 2000);
    document.addEventListener("visibilitychange", reserve);
    return () => { alive = false; clearInterval(poll); document.removeEventListener("visibilitychange", reserve); };
  }, [user?.id, premiumActive, newsPage]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(timer); }, []);
  const { remainingSeconds, adFreeActive } = allowanceState(grant, user?.id, premiumActive && newsPage, now);
  const allowanceLoading = premiumActive && newsPage && !grant && !allowanceError;
  return <Context.Provider value={{ adFreeActive, remainingSeconds, allowanceError, allowanceLoading }}>{children}</Context.Provider>;
}
export const useAdAllowance = () => useContext(Context);
