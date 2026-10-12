import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { getCurrentUser, logout as requestLogout } from "../services/authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionGeneration = useRef(0);

  async function refresh() {
    const generation = ++sessionGeneration.current;
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
    setUser(null);
    setLoading(false);
  }

  const value = useMemo(() => ({ user, loading, refresh, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
