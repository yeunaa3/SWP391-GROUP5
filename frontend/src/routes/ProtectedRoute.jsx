import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../store/AuthContext.jsx";

export default function ProtectedRoute({ roles = [], children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="route-state">Checking your session...</div>;
  if (!user) return <Navigate to="/login" replace state={{ returnTo: location.pathname }} />;
  if (roles.length && !roles.some((role) => user.roles.includes(role))) {
    return <div className="route-state">You do not have permission to open this screen.</div>;
  }
  return children;
}
