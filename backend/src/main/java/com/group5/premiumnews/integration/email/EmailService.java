package com.group5.premiumnews.integration.email;

import jakarta.mail.internet.MimeMessage;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String fromEmail;
    private final String mailUsername;

    public EmailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${EMAIL_FROM:${spring.mail.username:no-reply@thepluse.vn}}") String fromEmail,
            @Value("${spring.mail.username:}") String mailUsername) {
        this.mailSenderProvider = mailSenderProvider;
        this.fromEmail = fromEmail;
        this.mailUsername = mailUsername;
    }

    public void send(String recipient, String templateCode, Map<String, Object> variables) {
        sendReceiptEmail(recipient, String.valueOf(variables.getOrDefault("subject", "The Pluse - Thông báo thanh toán thành công")), variables);
    }

    /**
     * Gửi email biên lai/hóa đơn thanh toán tự động đến người dùng.
     * Chạy an toàn: nếu người dùng không có email hoặc chưa cấu hình SMTP thì ghi log, không làm fail transaction.
     */
    public void sendReceiptEmail(String recipient, String subject, Map<String, Object> data) {
        if (recipient == null || recipient.isBlank() || !recipient.contains("@")) {
            log.info("[EmailService] Bỏ qua gửi email: Người dùng không có địa chỉ email hợp lệ (recipient: '{}')", recipient);
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null || mailUsername == null || mailUsername.isBlank()) {
            log.warn("[EmailService] Chưa cấu hình MAIL_USERNAME/MAIL_PASSWORD trong môi trường. Mô phỏng gửi email thành công tới: {} (Tiêu đề: {})", recipient, subject);
            return;
        }

        try {
            if (mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl impl) {
                if (impl.getUsername() != null) {
                    impl.setUsername(impl.getUsername().trim());
                }
                if (impl.getPassword() != null) {
                    impl.setPassword(impl.getPassword().trim().replaceAll("\\s+", ""));
                }
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String effectiveFrom = (mailUsername != null && mailUsername.endsWith("@gmail.com")) ? mailUsername : (fromEmail.isBlank() ? mailUsername : fromEmail);
            helper.setFrom(effectiveFrom, "The Pluse Media");
            helper.setTo(recipient);
            helper.setSubject(subject);

            String htmlBody = buildHtmlBody(data);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("[EmailService] Đã gửi email xác nhận thanh toán thành công tới: {}", recipient);
        } catch (Exception e) {
            log.error("[EmailService] Lỗi khi gửi email tới {}: {}", recipient, e.getMessage());
        }
    }

    /**
     * Gửi email hướng dẫn đặt lại mật khẩu an toàn cho người dùng kèm liên kết dùng 1 lần.
     */
    public void sendPasswordResetEmail(String recipient, String recipientName, String resetUrl, int expiryMinutes) {
        if (recipient == null || recipient.isBlank() || !recipient.contains("@")) {
            log.info("[EmailService] Bỏ qua gửi email reset mật khẩu: Email không hợp lệ (recipient: '{}')", recipient);
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null || mailUsername == null || mailUsername.isBlank()) {
            log.warn("[EmailService] Chưa cấu hình MAIL_USERNAME/MAIL_PASSWORD trong môi trường. Mô phỏng gửi email đặt lại mật khẩu:");
            log.warn("[EmailService] Gửi tới: {} <{}> | Thời hạn: {} phút | Reset URL: {}", recipientName, recipient, expiryMinutes, resetUrl);
            return;
        }

        try {
            if (mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl impl) {
                if (impl.getUsername() != null) {
                    impl.setUsername(impl.getUsername().trim());
                }
                if (impl.getPassword() != null) {
                    impl.setPassword(impl.getPassword().trim().replaceAll("\\s+", ""));
                }
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String effectiveFrom = (mailUsername != null && mailUsername.endsWith("@gmail.com")) ? mailUsername : (fromEmail.isBlank() ? mailUsername : fromEmail);
            helper.setFrom(effectiveFrom, "The Pluse Media");
            helper.setTo(recipient);
            helper.setSubject("The Pluse - Hướng dẫn đặt lại mật khẩu tài khoản");

            String htmlBody = buildPasswordResetHtmlBody(recipientName, resetUrl, expiryMinutes);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("[EmailService] Đã gửi email đặt lại mật khẩu thành công tới: {}", recipient);
        } catch (Exception e) {
            log.error("[EmailService] Lỗi khi gửi email đặt lại mật khẩu tới {}: {}", recipient, e.getMessage());
        }
    }

    public boolean isConfigured() {
        return mailUsername != null && !mailUsername.isBlank();
    }

    public Map<String, Object> getDiagnostics() {
        Map<String, Object> diag = new java.util.HashMap<>();
        diag.put("configured", isConfigured());
        diag.put("username", mailUsername);
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl impl) {
            diag.put("host", impl.getHost());
            diag.put("port", impl.getPort());
            String pwd = impl.getPassword();
            if (pwd != null) {
                String cleanPwd = pwd.trim().replaceAll("\\s+", "");
                diag.put("hasPassword", true);
                diag.put("rawPasswordLength", pwd.length());
                diag.put("cleanPasswordLength", cleanPwd.length());
                diag.put("hasSpaces", pwd.contains(" "));
            } else {
                diag.put("hasPassword", false);
            }
        }
        return diag;
    }

    public String sendTestEmail(String recipient) {
        if (!isConfigured()) return "MAIL_USERNAME chưa được cấu hình";
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) return "JavaMailSender không khả dụng";
        try {
            if (mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl impl) {
                if (impl.getUsername() != null) {
                    impl.setUsername(impl.getUsername().trim());
                }
                if (impl.getPassword() != null) {
                    impl.setPassword(impl.getPassword().trim().replaceAll("\\s+", ""));
                }
            }
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            String effectiveFrom = (mailUsername != null && mailUsername.endsWith("@gmail.com")) ? mailUsername : (fromEmail.isBlank() ? mailUsername : fromEmail);
            helper.setFrom(effectiveFrom, "The Pluse Media");
            helper.setTo(recipient);
            helper.setSubject("The Pluse - Thử nghiệm gửi email hệ thống");
            helper.setText("<h3>Xin chào!</h3><p>Hệ thống gửi email The Pluse đang hoạt động chuẩn xác 100%.</p>", true);
            mailSender.send(message);
            return "SUCCESS";
        } catch (Exception ex) {
            String msg = ex.getMessage();
            if (ex.getCause() != null) {
                msg += " (Cause: " + ex.getCause().getMessage() + ")";
            }
            return "FAILED: " + msg;
        }
    }

    private String buildPasswordResetHtmlBody(String recipientName, String resetUrl, int expiryMinutes) {
        String safeName = (recipientName != null && !recipientName.isBlank()) ? recipientName : "Quý khách";

        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .header { background: #0f172a; padding: 32px 28px; text-align: center; color: #ffffff; }
                .header h1 { margin: 0 0 8px 0; font-size: 24px; letter-spacing: -0.5px; }
                .header p { margin: 0; font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
                .body { padding: 32px 28px; }
                .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
                .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
                .btn-container { text-align: center; margin: 32px 0; }
                .reset-btn { display: inline-block; background: #cf1322; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 6px; box-shadow: 0 2px 6px rgba(207,19,34,0.3); }
                .link-box { background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 24px; word-break: break-all; font-size: 13px; color: #0284c7; }
                .note { font-size: 13px; color: #64748b; line-height: 1.6; border-top: 1px dashed #cbd5e1; padding-top: 20px; margin-top: 24px; }
                .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <p>THE PLUSE MEDIA ECOSYSTEM</p>
                  <h1>KHÔI PHỤC MẬT KHẨU</h1>
                </div>
                <div class="body">
                  <div class="greeting">Xin chào %s,</div>
                  <div class="message">
                    Hệ thống The Pluse nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Để thiết lập mật khẩu mới an toàn, vui lòng nhấp vào nút bên dưới:
                  </div>
                  <div class="btn-container">
                    <a href="%s" class="reset-btn" target="_blank">ĐẶT LẠI MẬT KHẨU</a>
                  </div>
                  <div class="message" style="margin-bottom: 8px; font-size: 13px; color: #64748b;">
                    Hoặc sao chép đường dẫn trực tiếp dưới đây vào thanh địa chỉ của trình duyệt:
                  </div>
                  <div class="link-box">
                    <a href="%s" style="color: #0369a1; text-decoration: none;" target="_blank">%s</a>
                  </div>
                  <div class="note">
                    ⏱ <strong>Lưu ý bảo mật:</strong> Liên kết này có thời hạn sử dụng trong vòng <strong>%d phút</strong> và chỉ sử dụng được <strong>duy nhất một lần</strong>.<br><br>
                    Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Mật khẩu hiện tại của bạn vẫn an toàn tuyệt đối.
                  </div>
                </div>
                <div class="footer">
                  © 2026 The Pluse Media. Bản quyền thuộc về SWP391 Group 5.<br>
                  Email bảo mật được tạo tự động từ hệ thống tài khoản The Pluse.
                </div>
              </div>
            </body>
            </html>
            """.formatted(safeName, resetUrl, resetUrl, resetUrl, expiryMinutes);
    }

    private String buildHtmlBody(Map<String, Object> data) {
        String title = String.valueOf(data.getOrDefault("title", "XÁC NHẬN THANH TOÁN THÀNH CÔNG"));
        String customerName = String.valueOf(data.getOrDefault("customerName", "Quý khách"));
        String itemName = String.valueOf(data.getOrDefault("itemName", "Dịch vụ The Pluse"));
        String itemType = String.valueOf(data.getOrDefault("itemType", "Thuê bao Premium"));
        String txnRef = String.valueOf(data.getOrDefault("txnRef", "TXN-" + System.currentTimeMillis()));
        String amountFormatted = String.valueOf(data.getOrDefault("amount", "0 VND"));
        String effectiveDuration = String.valueOf(data.getOrDefault("effectiveDuration", "Kích hoạt ngay"));
        String paymentGateway = String.valueOf(data.getOrDefault("paymentGateway", "VietQR Napas"));

        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                .header { background: #0f172a; padding: 32px 28px; text-align: center; color: #ffffff; }
                .header h1 { margin: 0 0 8px 0; font-size: 24px; letter-spacing: -0.5px; }
                .header p { margin: 0; font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
                .body { padding: 32px 28px; }
                .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
                .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
                .invoice-card { background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 28px; }
                .invoice-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; font-size: 14px; }
                .invoice-row:last-child { border-bottom: none; font-weight: 700; font-size: 16px; color: #0f172a; padding-top: 12px; }
                .invoice-label { color: #64748b; }
                .invoice-value { font-weight: 600; text-align: right; }
                .badge { display: inline-block; background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 8px; border-radius: 4px; }
                .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <p>THE PLUSE MEDIA ECOSYSTEM</p>
                  <h1>%s</h1>
                  <span class="badge">ĐÃ THANH TOÁN THÀNH CÔNG</span>
                </div>
                <div class="body">
                  <div class="greeting">Kính gửi %s,</div>
                  <div class="message">
                    Hệ thống The Pluse xin trân trọng thông báo giao dịch thanh toán của bạn đã được ghi nhận và kích hoạt thành công trên hệ thống. Dưới đây là thông tin biên lai điện tử của bạn:
                  </div>
                  <div class="invoice-card">
                    <div class="invoice-row">
                      <span class="invoice-label">Mã giao dịch:</span>
                      <span class="invoice-value">%s</span>
                    </div>
                    <div class="invoice-row">
                      <span class="invoice-label">Loại dịch vụ:</span>
                      <span class="invoice-value">%s</span>
                    </div>
                    <div class="invoice-row">
                      <span class="invoice-label">Hạng mục:</span>
                      <span class="invoice-value">%s</span>
                    </div>
                    <div class="invoice-row">
                      <span class="invoice-label">Phương thức:</span>
                      <span class="invoice-value">%s</span>
                    </div>
                    <div class="invoice-row">
                      <span class="invoice-label">Thời hạn kích hoạt:</span>
                      <span class="invoice-value">%s</span>
                    </div>
                    <div class="invoice-row">
                      <span class="invoice-label">Tổng thanh toán:</span>
                      <span class="invoice-value">%s</span>
                    </div>
                  </div>
                  <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
                    Bạn có thể đăng nhập vào tài khoản trên The Pluse để bắt đầu trải nghiệm dịch vụ ngay lúc này. Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ bộ phận hỗ trợ của chúng tôi.
                  </p>
                </div>
                <div class="footer">
                  © 2026 The Pluse Media. Bản quyền thuộc về SWP391 Group 5.<br>
                  Email được gửi tự động từ hệ thống giao dịch The Pluse.
                </div>
              </div>
            </body>
            </html>
            """.formatted(title, customerName, txnRef, itemType, itemName, paymentGateway, effectiveDuration, amountFormatted);
    }
}
