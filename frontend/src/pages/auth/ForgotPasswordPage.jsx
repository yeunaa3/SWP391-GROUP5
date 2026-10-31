import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../../components/AuthShell.jsx";
import { requestPasswordReset } from "../../services/authService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";

export default function ForgotPasswordPage() {
    const { t } = usePreferences();
    const [identifier, setIdentifier] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    async function submit(event) {
        event.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            await requestPasswordReset(identifier.trim());
            setSubmitted(true);
        } catch (err) {
            setError(err.message || t("Không thể gửi yêu cầu đặt lại mật khẩu lúc này. Vui lòng thử lại sau.", "Unable to send password reset request right now. Please try again later."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthShell
            code="AUTH-03"
            eyebrow={t("KHÔI PHỤC TÀI KHOẢN", "ACCOUNT RECOVERY")}
            title={t("Quên mật khẩu", "Forgot password")}
            description={t(
                "Nhập tên đăng nhập hoặc email bạn đã đăng ký. Hệ thống sẽ gửi liên kết bảo mật có thời hạn đến email của bạn.",
                "Enter your registered username or email address. We will send a time-limited secure link to your email."
            )}
        >
            {submitted ? (
                <div className="pulse-form" style={{ marginTop: "24px" }}>
                    <div className="info-note" role="status" style={{ borderLeftColor: "#16a34a", background: "#f0fdf4" }}>
                        <strong style={{ display: "block", color: "#166534", marginBottom: "6px", fontSize: "15px" }}>
                            ✓ {t("Yêu cầu đã được ghi nhận!", "Request recorded successfully!")}
                        </strong>
                        <p style={{ margin: 0, color: "#15803d", fontSize: "14px", lineHeight: 1.6 }}>
                            {t(
                                "Nếu thông tin khớp với tài khoản trên hệ thống The Pluse, email chứa liên kết đặt lại mật khẩu đã được gửi đến địa chỉ email đã đăng ký của bạn. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam/Quảng cáo).",
                                "If the details match an account in The Pluse, an email with a reset link has been dispatched to your registered address. Please check your inbox (and Spam/Promotions folder)."
                            )}
                        </p>
                    </div>

                    <div className="info-note" style={{ marginTop: "12px", borderLeftColor: "#475569", background: "#f8fafc" }}>
                        <p style={{ margin: 0, fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>
                            🔒 {t("Ràng buộc bảo mật: Chỉ người sở hữu địa chỉ email nhận được mã token liên kết mới có thể tiến hành đặt lại mật khẩu.", "Security constraint: Only the person who owns and accesses the email address receiving the token link can proceed with resetting the password.")}
                        </p>
                    </div>

                    <p style={{ fontSize: "13px", color: "#64748b", margin: "12px 0 6px" }}>
                        ⏱ {t("Liên kết chỉ có hiệu lực trong vòng 15 phút và chỉ được sử dụng một lần duy nhất.", "The link is valid for 15 minutes and can only be used once.")}
                    </p>

                    <div className="form-button-row" style={{ marginTop: "12px" }}>
                        <Link to="/login" className="outline-button" style={{ textAlign: "center", textDecoration: "none", flex: 1 }}>
                            {t("Quay lại đăng nhập", "Back to sign in")}
                        </Link>
                        <button
                            type="button"
                            className="outline-button"
                            onClick={() => {
                                setSubmitted(false);
                                setIdentifier("");
                            }}
                        >
                            {t("Thử tài khoản khác", "Try another account")}
                        </button>
                    </div>
                </div>
            ) : (
                <form className="pulse-form" onSubmit={submit}>
                    <label>
                        {t("Tên đăng nhập hoặc email", "Username or email")}
                        <input
                            type="text"
                            required
                            autoFocus
                            autoComplete="username"
                            value={identifier}
                            disabled={submitting}
                            onChange={(event) => setIdentifier(event.target.value)}
                            placeholder={t("Ví dụ: reader.demo hoặc email của bạn", "E.g. reader.demo or your email")}
                        />
                    </label>

                    {error && (
                        <p className="form-error" role="alert">
                            {error}
                        </p>
                    )}

                    <div className="form-button-row">
                        <button type="submit" disabled={submitting || !identifier.trim()}>
                            {submitting
                                ? t("Đang gửi yêu cầu…", "Sending request...")
                                : t("Gửi liên kết đặt lại mật khẩu", "Send reset link")}
                        </button>
                        <Link className="outline-button" to="/login" style={{ textAlign: "center", textDecoration: "none" }}>
                            {t("Hủy", "Cancel")}
                        </Link>
                    </div>

                    <p className="form-footer" style={{ marginTop: "16px" }}>
                        <Link to="/login">← {t("Quay lại đăng nhập", "Back to login")}</Link>
                    </p>
                </form>
            )}
        </AuthShell>
    );
}
