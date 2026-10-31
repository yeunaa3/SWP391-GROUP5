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
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    async function submit(event) {
        event.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            const res = await requestPasswordReset(identifier.trim());
            setResult(res);
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
                "Nhập tên đăng nhập hoặc email bạn đã đăng ký. Hệ thống sẽ gửi liên kết bảo mật để bạn thiết lập lại mật khẩu.",
                "Enter your registered username or email address. We will send you a secure link to reset your password."
            )}
        >
            {submitted ? (
                <div className="pulse-form" style={{ marginTop: "24px" }}>
                    {result && result.userFound === false ? (
                        <div className="info-note" role="alert" style={{ borderLeftColor: "#dc2626", background: "#fef2f2" }}>
                            <strong style={{ display: "block", color: "#991b1b", marginBottom: "6px", fontSize: "15px" }}>
                                ⚠ {t("Không tìm thấy tài khoản!", "Account not found!")}
                            </strong>
                            <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px", lineHeight: 1.6 }}>
                                {t(
                                    "Không tìm thấy tài khoản nào khớp với tên đăng nhập hoặc email bạn đã nhập. Vui lòng kiểm tra lại chính xác username hoặc email bạn đã đăng ký.",
                                    "No account was found matching the username or email you entered. Please double check the credentials you used to register."
                                )}
                            </p>
                        </div>
                    ) : (
                        <div className="info-note" role="status" style={{ borderLeftColor: "#16a34a", background: "#f0fdf4" }}>
                            <strong style={{ display: "block", color: "#166534", marginBottom: "6px", fontSize: "15px" }}>
                                ✓ {t("Yêu cầu đã được tạo thành công!", "Request created successfully!")}
                            </strong>
                            <p style={{ margin: 0, color: "#15803d", fontSize: "14px", lineHeight: 1.6 }}>
                                {t(
                                    "Hệ thống đã tạo liên kết đặt lại mật khẩu cho tài khoản của bạn.",
                                    "The system has generated a password reset link for your account."
                                )}
                            </p>
                        </div>
                    )}

                    {result?.resetUrl && (
                        <div className="info-note" style={{ borderLeftColor: "#2563eb", background: "#eff6ff", marginTop: "12px" }}>
                            <strong style={{ display: "block", color: "#1e40af", marginBottom: "6px", fontSize: "14px" }}>
                                🔗 {t("Đường dẫn đặt lại mật khẩu trực tiếp:", "Direct password reset link:")}
                            </strong>
                            <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#1e3a8a", lineHeight: 1.5 }}>
                                {t(
                                    "Nếu email chưa đến hộp thư (do máy chủ đám mây Render chặn cổng SMTP ra ngoài port 587/465), bạn có thể nhấp trực tiếp vào nút dưới đây để đổi mật khẩu ngay lập tức:",
                                    "If the email has not arrived (due to Render cloud firewall blocking SMTP ports 587/465), you can click directly below to set your new password now:"
                                )}
                            </p>
                            <a
                                href={result.resetUrl}
                                className="button"
                                style={{ display: "inline-block", textAlign: "center", textDecoration: "none", width: "100%", padding: "10px 16px" }}
                            >
                                {t("👉 Đặt lại mật khẩu ngay tại đây", "👉 Reset password now")}
                            </a>
                        </div>
                    )}

                    <p style={{ fontSize: "13px", color: "#64748b", margin: "12px 0 6px" }}>
                        ⏱ {t("Liên kết chỉ có hiệu lực trong vòng 15 phút và dùng một lần duy nhất.", "The link is valid for 15 minutes and can only be used once.")}
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
                                setResult(null);
                                setIdentifier("");
                            }}
                        >
                            {t("Thử lại tài khoản khác", "Try another account")}
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
