/**
 * =================================================================================================
 * PAGE: RESET PASSWORD PAGE (TRANG THIẾT LẬP MẬT KHẨU MỚI TỪ LIÊN KẾT EMAIL)
 * =================================================================================================
 * 
 * Mã màn hình: AUTH-04 (Ca sử dụng UC-07 trong đặc tả SRS).
 * 
 * Luồng hoạt động:
 * 1. Trích xuất mã token bí mật từ query parameter của URL: `/reset-password?token={rawToken}`.
 * 2. Ngay khi component được tải (useEffect mount), tự động gọi API `verifyResetToken(token)`:
 *    - Nếu token thiếu hoặc không hợp lệ -> Chuyển trạng thái `missing` hoặc `invalid` và báo lỗi rõ ràng.
 *    - Nếu token hợp lệ -> Chuyển trạng thái `valid` và hiển thị địa chỉ email đã che giấu (maskedEmail).
 * 3. Người dùng nhập Mật khẩu mới và Xác nhận mật khẩu mới.
 * 4. Kiểm tra hợp lệ phía client:
 *    - Độ dài từ 8 đến 64 ký tự (theo quy chuẩn bảo mật SRS).
 *    - Mật khẩu xác nhận phải trùng khớp tuyệt đối với mật khẩu mới.
 * 5. Khi bấm "Xác nhận đặt lại mật khẩu", gọi API `resetPassword({ token, newPassword })`.
 * 6. Khi thành công, chuyển sang trạng thái `success`, hiển thị thông báo thành công và nút chuyển
 *    hướng sang trang Đăng nhập (`/login`).
 * 7. Hỗ trợ đầy đủ song ngữ (Tiếng Việt & English) thông qua hook `usePreferences()`.
 * =================================================================================================
 */

import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthShell from "../../components/AuthShell.jsx";
import { verifyResetToken, resetPassword } from "../../services/authService.js";
import { usePreferences } from "../../store/PreferencesContext.jsx";

export default function ResetPasswordPage() {
    // Hook cung cấp hàm dịch đa ngôn ngữ
    const { t } = usePreferences();

    // Hook đọc query parameters từ URL trình duyệt
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";

    /**
     * State quản lý trạng thái của trang:
     * - 'checking': Đang gửi request kiểm tra token lên server
     * - 'valid': Token hợp lệ, sẵn sàng hiển thị form đổi mật khẩu
     * - 'invalid': Token không tồn tại, đã hết hạn 15 phút hoặc đã dùng trước đó
     * - 'missing': Không tìm thấy query param ?token= trên URL
     * - 'success': Đã đổi mật khẩu thành công vào cơ sở dữ liệu
     */
    const [status, setStatus] = useState("checking");

    // Địa chỉ email đã được che giấu một phần (ví dụ: b***6@gmail.com) do server trả về
    const [maskedEmail, setMaskedEmail] = useState("");

    // Thông điệp trạng thái chi tiết (dùng khi token bị lỗi/hết hạn)
    const [statusMessage, setStatusMessage] = useState("");

    // Form dữ liệu mật khẩu mới và xác nhận mật khẩu
    const [form, setForm] = useState({ password: "", confirmation: "" });

    // Thông báo lỗi validation hoặc lỗi từ API
    const [formError, setFormError] = useState("");

    // Trạng thái đang gửi yêu cầu lưu mật khẩu
    const [submitting, setSubmitting] = useState(false);

    /**
     * Tự động xác thực token với Backend ngay khi vừa mở trang.
     */
    useEffect(() => {
        let isMounted = true;

        // Nếu URL không có tham số token
        if (!token.trim()) {
            setStatus("missing");
            setStatusMessage(t(
                "Thiếu mã đặt lại mật khẩu trong đường dẫn liên kết.",
                "Password reset token is missing from the link URL."
            ));
            return;
        }

        // Gọi API kiểm tra tính hợp lệ của token
        verifyResetToken(token.trim())
            .then((res) => {
                if (!isMounted) return;
                if (res && res.valid) {
                    setStatus("valid");
                    setMaskedEmail(res.maskedEmail || "");
                } else {
                    setStatus("invalid");
                    setStatusMessage(res?.message || t(
                        "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
                        "This password reset link is invalid or has expired."
                    ));
                }
            })
            .catch((err) => {
                if (!isMounted) return;
                setStatus("invalid");
                setStatusMessage(err.message || t(
                    "Không thể xác thực liên kết đặt lại mật khẩu. Vui lòng thử lại sau.",
                    "Unable to verify password reset link. Please try again later."
                ));
            });

        return () => {
            isMounted = false;
        };
    }, [token, t]);

    /**
     * Xử lý gửi form cập nhật mật khẩu mới.
     */
    async function submit(event) {
        event.preventDefault();
        setFormError("");

        // 1. Kiểm tra độ dài tối thiểu 8 ký tự
        if (!form.password || form.password.length < 8) {
            setFormError(t(
                "Mật khẩu mới phải có ít nhất 8 ký tự.",
                "New password must be at least 8 characters long."
            ));
            return;
        }

        // 2. Kiểm tra độ dài tối đa 64 ký tự
        if (form.password.length > 64) {
            setFormError(t(
                "Mật khẩu không được vượt quá 64 ký tự.",
                "Password cannot exceed 64 characters."
            ));
            return;
        }

        // 3. Kiểm tra mật khẩu xác nhận trùng khớp
        if (form.password !== form.confirmation) {
            setFormError(t(
                "Mật khẩu xác nhận không khớp.",
                "Password confirmation does not match."
            ));
            return;
        }

        setSubmitting(true);
        try {
            // Gửi mật khẩu mới kèm token lên Backend để băm BCrypt và cập nhật
            await resetPassword({
                token: token.trim(),
                newPassword: form.password
            });
            setStatus("success");
        } catch (err) {
            setFormError(err.message || t(
                "Không thể đặt lại mật khẩu. Vui lòng thử lại hoặc yêu cầu liên kết mới.",
                "Failed to reset password. Please try again or request a new link."
            ));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthShell
            code="AUTH-04"
            eyebrow={t("KHÔI PHỤC TÀI KHOẢN", "ACCOUNT RECOVERY")}
            title={t("Đặt lại mật khẩu mới", "Set new password")}
            description={t(
                "Tạo mật khẩu mới an toàn cho tài khoản của bạn để tiếp tục trải nghiệm trên The Pluse.",
                "Create a new secure password for your account to continue on The Pluse."
            )}
        >
            {/* TRƯỜNG HỢP 1: ĐANG KIỂM TRA TÍNH HỢP LỆ CỦA TOKEN */}
            {status === "checking" && (
                <div className="pulse-form" style={{ marginTop: "24px", textAlign: "center" }}>
                    <div className="info-note" role="status">
                        <p style={{ margin: 0 }}>
                            {t("Đang kiểm tra tính hợp lệ của liên kết bảo mật…", "Verifying the security reset link...")}
                        </p>
                    </div>
                </div>
            )}

            {/* TRƯỜNG HỢP 2: TOKEN BỊ THIẾU, HẾT HẠN HOẶC ĐÃ SỬ DỤNG */}
            {(status === "missing" || status === "invalid") && (
                <div className="pulse-form" style={{ marginTop: "24px" }}>
                    <p className="form-error" role="alert" style={{ marginBottom: "16px" }}>
                        {statusMessage}
                    </p>
                    <div className="info-note" style={{ marginBottom: "16px" }}>
                        <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6 }}>
                            {t(
                                "Mỗi liên kết đặt lại mật khẩu chỉ có hiệu lực trong vòng 15 phút và sẽ bị vô hiệu ngay sau lần sử dụng đầu tiên. Hãy yêu cầu một liên kết mới để tiếp tục.",
                                "Each reset link is valid for 15 minutes only and is invalidated after its first use. Please request a new link to proceed."
                            )}
                        </p>
                    </div>
                    <div className="form-button-row">
                        <Link to="/forgot-password" className="button" style={{ textAlign: "center", textDecoration: "none", flex: 1 }}>
                            {t("Yêu cầu liên kết mới", "Request a new link")}
                        </Link>
                        <Link to="/login" className="outline-button" style={{ textAlign: "center", textDecoration: "none" }}>
                            {t("Về đăng nhập", "Back to sign in")}
                        </Link>
                    </div>
                </div>
            )}

            {/* TRƯỜNG HỢP 3: ĐẶT LẠI MẬT KHẨU THÀNH CÔNG */}
            {status === "success" && (
                <div className="pulse-form" style={{ marginTop: "24px" }}>
                    <div className="info-note" role="status" style={{ borderLeftColor: "#16a34a", background: "#f0fdf4" }}>
                        <strong style={{ display: "block", color: "#166534", marginBottom: "8px", fontSize: "16px" }}>
                            ✓ {t("Đặt lại mật khẩu thành công!", "Password reset successfully!")}
                        </strong>
                        <p style={{ margin: 0, color: "#15803d", fontSize: "14px", lineHeight: 1.6 }}>
                            {t(
                                "Mật khẩu của bạn đã được cập nhật thành công. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới để tiếp tục.",
                                "Your account password has been updated. You can now sign in using your new credentials."
                            )}
                        </p>
                    </div>
                    <div className="form-button-row" style={{ marginTop: "20px" }}>
                        <Link to="/login" className="button" style={{ textAlign: "center", textDecoration: "none", width: "100%" }}>
                            {t("Đăng nhập ngay", "Sign in now")}
                        </Link>
                    </div>
                </div>
            )}

            {/* TRƯỜNG HỢP 4: TOKEN HỢP LỆ -> HIỂN THỊ FORM NHẬP MẬT KHẨU MỚI */}
            {status === "valid" && (
                <form className="pulse-form" onSubmit={submit}>
                    {maskedEmail && (
                        <div className="info-note" style={{ marginBottom: "8px" }}>
                            <span style={{ fontSize: "13px", color: "#475569" }}>
                                {t("Đang đặt lại mật khẩu cho tài khoản liên kết với: ", "Resetting password for account linked to: ")}
                                <strong>{maskedEmail}</strong>
                            </span>
                        </div>
                    )}

                    <label>
                        {t("Mật khẩu mới", "New password")}
                        <input
                            type="password"
                            minLength={8}
                            maxLength={64}
                            required
                            autoFocus
                            autoComplete="new-password"
                            disabled={submitting}
                            value={form.password}
                            onChange={(event) => setForm({ ...form, password: event.target.value })}
                            placeholder={t("Nhập ít nhất 8 ký tự", "Enter at least 8 characters")}
                        />
                    </label>

                    <label>
                        {t("Xác nhận mật khẩu mới", "Confirm new password")}
                        <input
                            type="password"
                            minLength={8}
                            maxLength={64}
                            required
                            autoComplete="new-password"
                            disabled={submitting}
                            value={form.confirmation}
                            onChange={(event) => setForm({ ...form, confirmation: event.target.value })}
                            placeholder={t("Nhập lại mật khẩu mới", "Re-enter new password")}
                        />
                    </label>

                    <p className="password-rule">
                        {t(
                            "Mật khẩu phải từ 8 đến 64 ký tự. Nên kết hợp chữ, số và ký tự đặc biệt để an toàn hơn.",
                            "Password must be 8–64 characters. Combine letters, numbers, and symbols for better security."
                        )}
                    </p>

                    {formError && (
                        <p className="form-error" role="alert">
                            {formError}
                        </p>
                    )}

                    <div className="form-button-row">
                        <button type="submit" disabled={submitting || !form.password || !form.confirmation}>
                            {submitting
                                ? t("Đang cập nhật…", "Updating...")
                                : t("Xác nhận đặt lại mật khẩu", "Confirm reset password")}
                        </button>
                    </div>

                    <p className="form-footer" style={{ marginTop: "16px" }}>
                        <Link to="/forgot-password">{t("Yêu cầu gửi lại liên kết", "Request a new link")}</Link>
                    </p>
                </form>
            )}
        </AuthShell>
    );
}
