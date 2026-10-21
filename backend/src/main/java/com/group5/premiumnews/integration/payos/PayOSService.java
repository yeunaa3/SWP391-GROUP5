package com.group5.premiumnews.integration.payos;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PayOSService {

    private static final Logger log = LoggerFactory.getLogger(PayOSService.class);
    private static final String PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";

    private final String clientId;
    private final String apiKey;
    private final String checksumKey;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public PayOSService(
            @Value("${app.payos.client-id:}") String clientId,
            @Value("${app.payos.api-key:}") String apiKey,
            @Value("${app.payos.checksum-key:}") String checksumKey,
            ObjectMapper objectMapper
    ) {
        this.clientId = clientId != null ? clientId.trim() : "";
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.checksumKey = checksumKey != null ? checksumKey.trim() : "";
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isConfigured() {
        return !clientId.isEmpty() && !apiKey.isEmpty() && !checksumKey.isEmpty();
    }

    public record PayOSPaymentLinkData(
            long orderCode,
            int amount,
            String description,
            String accountNumber,
            String accountName,
            String bin,
            String qrCode,
            String checkoutUrl,
            String status,
            String paymentLinkId
    ) {}

    /**
     * Tạo Payment Link PayOS tự động cho đơn hàng
     */
    public PayOSPaymentLinkData createPaymentLink(
            long orderCode,
            int amount,
            String description,
            String buyerName,
            String buyerEmail,
            String buyerPhone,
            String returnUrl,
            String cancelUrl
    ) {
        if (!isConfigured()) {
            throw new IllegalStateException("PayOS chưa được cấu hình Client ID, API Key hoặc Checksum Key.");
        }

        // Cắt description tối đa 25 ký tự theo quy định của PayOS
        String cleanDescription = description != null ? description.trim() : "THEPLUSE";
        if (cleanDescription.length() > 25) {
            cleanDescription = cleanDescription.substring(0, 25);
        }

        // Chuỗi ký theo chuẩn PayOS: amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}
        String dataToSign = String.format("amount=%d&cancelUrl=%s&description=%s&orderCode=%d&returnUrl=%s",
                amount, cancelUrl, cleanDescription, orderCode, returnUrl);
        String signature = hmacSha256(dataToSign, checksumKey);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("orderCode", orderCode);
        requestBody.put("amount", amount);
        requestBody.put("description", cleanDescription);
        requestBody.put("buyerName", buyerName != null ? buyerName : "Reader");
        requestBody.put("buyerEmail", buyerEmail != null ? buyerEmail : "");
        requestBody.put("buyerPhone", buyerPhone != null ? buyerPhone : "");
        requestBody.put("returnUrl", returnUrl);
        requestBody.put("cancelUrl", cancelUrl);
        requestBody.put("signature", signature);

        try {
            String jsonPayload = objectMapper.writeValueAsString(requestBody);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(PAYOS_API_URL))
                    .header("Content-Type", "application/json")
                    .header("x-client-id", clientId)
                    .header("x-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            log.info("PayOS create link response status: {}, body: {}", response.statusCode(), response.body());

            JsonNode root = objectMapper.readTree(response.body());
            String code = root.path("code").asText("");
            if (!"00".equals(code)) {
                String desc = root.path("desc").asText("Lỗi không xác định từ PayOS");
                throw new RuntimeException("PayOS trả về lỗi (" + code + "): " + desc);
            }

            JsonNode dataNode = root.path("data");
            return new PayOSPaymentLinkData(
                    dataNode.path("orderCode").asLong(orderCode),
                    dataNode.path("amount").asInt(amount),
                    dataNode.path("description").asText(cleanDescription),
                    dataNode.path("accountNumber").asText(""),
                    dataNode.path("accountName").asText(""),
                    dataNode.path("bin").asText(""),
                    dataNode.path("qrCode").asText(""),
                    dataNode.path("checkoutUrl").asText(""),
                    dataNode.path("status").asText("PENDING"),
                    dataNode.path("paymentLinkId").asText("")
            );
        } catch (Exception ex) {
            log.error("Lỗi khi gọi API tạo link PayOS", ex);
            throw new RuntimeException("Không thể tạo link thanh toán PayOS: " + ex.getMessage(), ex);
        }
    }

    /**
     * Lấy thông tin thanh toán từ PayOS theo orderCode
     */
    public String getPaymentStatus(long orderCode) {
        if (!isConfigured()) return "UNKNOWN";

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(PAYOS_API_URL + "/" + orderCode))
                    .header("x-client-id", clientId)
                    .header("x-api-key", apiKey)
                    .GET()
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            JsonNode root = objectMapper.readTree(response.body());
            if ("00".equals(root.path("code").asText(""))) {
                return root.path("data").path("status").asText("PENDING");
            }
        } catch (Exception ex) {
            log.warn("Không thể kiểm tra trạng thái PayOS cho orderCode {}: {}", orderCode, ex.getMessage());
        }
        return "PENDING";
    }

    /**
     * Xác thực Webhook chữ ký từ PayOS
     */
    public boolean verifyWebhook(Map<String, Object> webhookBody) {
        if (!isConfigured() || webhookBody == null) return false;

        String receivedSignature = String.valueOf(webhookBody.getOrDefault("signature", ""));
        Object dataObj = webhookBody.get("data");
        if (!(dataObj instanceof Map)) return false;

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) dataObj;

        // Sắp xếp các trường trong data theo thứ tự alphabet
        List<String> keys = new ArrayList<>(data.keySet());
        Collections.sort(keys);

        StringBuilder sb = new StringBuilder();
        for (String k : keys) {
            Object v = data.get(k);
            if (v != null) {
                if (!sb.isEmpty()) sb.append("&");
                sb.append(k).append("=").append(v);
            }
        }

        String calculatedSignature = hmacSha256(sb.toString(), checksumKey);
        return calculatedSignature.equalsIgnoreCase(receivedSignature);
    }

    private static String hmacSha256(String data, String key) {
        try {
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKey);
            byte[] hash = sha256Hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tính mã băm HMAC-SHA256", e);
        }
    }
}
