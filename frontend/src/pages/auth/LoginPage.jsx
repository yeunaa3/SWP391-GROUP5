import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login } from "../../services/authService.js";
import { useAuth } from "../../store/AuthContext.jsx";
import AuthShell from "../../components/AuthShell.jsx";
import { LOGIN_SUCCESS_PATH } from "../../utils/sessionRouting.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";

export default function LoginPage() {
    const {t} = usePreferences();
    const [form, setForm] = useState({login: "", password: ""});
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const {refresh} = useAuth();
    const navigate = useNavigate();

    async function submit(event) {
        // UC-06: verify the new session, then always open the public news homepage.
        event.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            // 1. Gửi thông tin đăng nhập lên Backend (POST /api/auth/login)
            await login(form);

            // 2. Gọi hàm refresh() trong AuthContext để lấy thông tin user và lưu vào State
            const current = await refresh();
            if (!current) {
                throw new Error(t("Không thể xác nhận phiên đăng nhập. Vui lòng thử lại.", "Unable to verify your session. Please try again."));
            }

            // 3. Đăng nhập thành công -> Chuyển về trang chủ (LOGIN_SUCCESS_PATH = "/")
            navigate(LOGIN_SUCCESS_PATH, { replace: true });
        } catch (requestError) {
            // Tách rõ ràng thông báo lỗi bằng if...else thay vì dùng toán tử 3 ngôi
            if (requestError.message === "Invalid username/email or password") {
                setError(t("Tên đăng nhập hoặc mật khẩu chưa đúng. Vui lòng kiểm tra và thử lại.", "Incorrect username or password. Please check and try again."));
            } else {
                setError(requestError.message);
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
            <AuthShell code="AUTH-01" eyebrow={t("CHÀO MỪNG BẠN TRỞ LẠI", "WELCOME BACK")} title={t("Đăng nhập", "Sign in")} description={t("Tiếp tục những câu chuyện bạn đang quan tâm cùng The Pluse.", "Pick up the stories that matter to you with The Pluse.")}>
                <form className="pulse-form" onSubmit={submit}>
                    <label>{t("Tên đăng nhập hoặc email", "Username or email")}<input autoComplete="username" required value={form.login} onChange={(e) => setForm({...form, login: e.target.value})} /></label>
                    <label>{t("Mật khẩu", "Password")}<input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} /></label>
                    <div className="form-row"><Link to="/forgot-password">{t("Quên mật khẩu?", "Forgot password?")}</Link></div>
                    {error && <p className="form-error" role="alert">{error}</p>}
                    <div className="form-button-row"><button type="submit" disabled={submitting}>{submitting ? t("Đang đăng nhập…", "Signing in...") : t("Đăng nhập", "Sign in")}</button><Link className="outline-button" to="/register">{t("Tạo tài khoản", "Create account")}</Link></div>
                    <p className="business-note"><strong>{t("Tài khoản doanh nghiệp?", "Business account?")}</strong><br/>{t("Đăng nhập tại đây rồi mở khu quản lý dành cho doanh nghiệp.", "Sign in here, then open your business workspace.")}</p>
                </form>
            </AuthShell>
            );
}
