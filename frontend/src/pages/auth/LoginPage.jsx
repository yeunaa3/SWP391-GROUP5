import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { login } from "../../services/authService.js";
import { useAuth } from "../../store/AuthContext.jsx";
import AuthShell from "../../components/AuthShell.jsx";

export default function LoginPage() {
  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form);
      await refresh();
      navigate(location.state?.returnTo || "/", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell code="AUTH-01" eyebrow="Secure account access" title="Login" description="Authenticate an existing account and route it to the correct workspace.">
      <form className="pulse-form" onSubmit={submit}>
        <label>Username or email<input autoComplete="username" required value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <div className="form-row"><label className="check"><input type="checkbox" /> Remember me</label><Link to="/forgot-password">Forgot password?</Link></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-button-row"><button type="submit" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</button><Link className="outline-button" to="/register">Create account</Link></div>
        <p className="business-note"><strong>Business account?</strong><br />Use the same login. Approved companies are routed to the Business Portal automatically.</p>
      </form>
    </AuthShell>
  );
}
