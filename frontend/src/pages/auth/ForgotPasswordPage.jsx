/**
 * =================================================================================================
 * PAGE: FORGOT PASSWORD PAGE (TRANG YÊU CẦU KHÔI PHỤC MẬT KHẨU)
 * =================================================================================================
 * 
 * Mã màn hình: AUTH-03 (Ca sử dụng UC-07 trong đặc tả SRS).
 * 
 * Luồng hoạt động:
 * 1. Người dùng nhập tên đăng nhập (username) hoặc địa chỉ email đã đăng ký tài khoản.
 * 2. Khi bấm gửi, component gọi hàm `requestPasswordReset(identifier)` tới API `/api/auth/forgot-password`.
 * 3. Backend sinh token ngẫu nhiên bảo mật 32-byte, lưu băm SHA-256 vào database và gửi email tới người dùng.
 * 4. Hiển thị thông báo hướng dẫn người dùng kiểm tra hộp thư đến (inbox) hoặc thư mục Spam trong 15 phút.
 * 5. Tuân thủ bảo mật: Không tiết lộ tài khoản có tồn tại hay không, không hiển thị token trên client.
 * 6. Hỗ trợ song ngữ (Tiếng Việt & English) thông qua hook `usePreferences()`.
 * =================================================================================================
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../../components/AuthShell.jsx";
import { requestPasswordReset } from "../../services/authService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";

export default function ForgotPasswordPage() {
    // Hook cung cấp hàm dịch đa ngôn ngữ: t("Tiếng Việt", "English")
    const { t } = usePreferences();

    // State quản lý giá trị ô nhập tên đăng nhập hoặc email
    const [identifier, setIdentifier] = useState("");

    // State quản lý trạng thái đang gửi request lên server (hiển thị loading spinner / disable nút)
    const [submitting, setSubmitting] = useState(false);

    // State xác nhận đã gửi yêu cầu thành công để chuyển đổi giao diện sang màn hình hướng dẫn
    const [submitted, setSubmitted] = useState(false);

    // State lưu trữ thông báo lỗi khi API trả về mã lỗi HTTP
    const [error, setError] = useState("");

    /**
     * Xử lý sự kiện gửi form yêu cầu đặt lại mật khẩu.
     */
    async function submit(event) {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            // Gọi API gửi yêu cầu khôi phục mật khẩu
            await requestPasswordReset(identifier.trim());
            setSubmitted(true);
        } catch (err) {
            // Hiển thị thông báo lỗi chi tiết từ Backend (ví dụ: máy chủ mail gặp sự cố kết nối)
            setError(err.message || t(
                "Không thể gửi yêu cầu đặt lại mật khẩu lúc này. Vui lòng thử lại sau.",
                "Unable to send password reset request right now. Please try again later."
            ));
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
            {/* TRƯỜNG HỢP 1: ĐÃ GỬI YÊU CẦU THÀNH CÔNG -> HIỂN THỊ HƯỚNG DẪN KIỂM TRA HỘP THƯ */}
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
                            🔒 {t(
                                "Ràng buộc bảo mật: Chỉ người sở hữu địa chỉ email nhận được mã token liên kết mới có thể tiến hành đặt lại mật khẩu.",
                                "Security constraint: Only the person who owns and accesses the email address receiving the token link can proceed with resetting the password."
                            )}
                        </p>
                    </div>

                    <p style={{ fontSize: "13px", color: "#64748b", margin: "12px 0 6px" }}>
                        ⏱ {t(
                            "Liên kết chỉ có hiệu lực trong vòng 15 phút và chỉ được sử dụng một lần duy nhất.",
                            "The link is valid for 15 minutes and can only be used once."
                        )}
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
                /* TRƯỜNG HỢP 2: FORM NHẬP TÊN ĐĂNG NHẬP / EMAIL ĐỂ TIẾP NHẬN YÊU CẦU */
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

                    {/* Hiển thị lỗi nếu quá trình gửi thất bại */}
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
