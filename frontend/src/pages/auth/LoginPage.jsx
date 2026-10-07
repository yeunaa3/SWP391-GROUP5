import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { login } from "../../services/authService.js";
import { useAuth } from "../../store/AuthContext.jsx";
import AuthShell from "../../components/AuthShell.jsx";
import { usePreferences } from "../../store/PreferencesContext.jsx";

export default function LoginPage() {
  const {t}=usePreferences();
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
    <AuthShell code="AUTH-01" eyebrow={t("TRUY CẬP TÀI KHOẢN","Secure account access")} title={t("Đăng nhập","Login")} description={t("Chào mừng bạn trở lại. Đăng nhập để tiếp tục trải nghiệm The Pulse.","Welcome back. Sign in to continue your The Pulse experience.")}>
      <form className="pulse-form" onSubmit={submit}>
        <label>{t("Tên đăng nhập hoặc email","Username or email")}<input autoComplete="username" required value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} /></label>
        <label>{t("Mật khẩu","Password")}<input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <div className="form-row"><Link to="/forgot-password">{t("Quên mật khẩu?","Forgot password?")}</Link></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-button-row"><button type="submit" disabled={submitting}>{submitting ? t("Đang đăng nhập…","Signing in...") : t("Đăng nhập","Sign in")}</button><Link className="outline-button" to="/register">{t("Tạo tài khoản","Create account")}</Link></div>
        <p className="business-note"><strong>{t("Tài khoản doanh nghiệp?","Business account?")}</strong><br/>{t("Đăng nhập tại đây rồi mở khu quản lý dành cho doanh nghiệp.","Sign in here, then open your business workspace.")}</p>
      </form>
    </AuthShell>
  );
}
