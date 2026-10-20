package com.group5.premiumnews.controller;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.AdvertisingDataService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * ============================================================================
 * [BF-08] ADVERTISING DATA & EVENT TRACKING CONTROLLER
 * Phụ trách: Cường (Ad Serving, Event Logging & Campaign Operations)
 * 
 * REST API Endpoints:
 * - GET  /api/advertising/banners               : [UC-31] Lấy banner quảng cáo hợp lệ (hỗ trợ targeting)
 * - POST /api/advertising/events/impression     : [UC-31] Ghi nhận lượt hiển thị Impression (chống gian lận)
 * - GET  /api/advertising/click/{creativeId}    : [UC-31] Ghi nhận Click & HTTP 302 Redirect
 * - GET  /api/advertising/campaign-data         : [ADM-09] Giám sát danh sách chiến dịch
 * - GET  /api/advertising/performance           : [ADM-09][BUS-18] Lấy chuỗi chỉ số báo cáo
 * - GET  /api/advertising/availability          : [UC-32] Tra cứu các slot đã được đặt chỗ
 * - POST /api/advertising/campaigns/{id}/toggle-status : [UC-39] Tạm dừng / Mở lại chiến dịch
 * ============================================================================
 */
@RestController
@RequestMapping("/api/advertising")
public class AdvertisingDataController {

    private final AdvertisingDataService service;

    public AdvertisingDataController(AdvertisingDataService service) {
        this.service = service;
    }

    /**
     * [BF-08][UC-31] Phân phối biểu ngữ quảng cáo cho độc giả chưa mua gói.
     * Tự động lọc ra tối đa 3 chiến dịch ACTIVE và banner APPROVED.
     * Hỗ trợ targeting theo vị trí (position), thiết bị (device), quốc gia (locale) và bài viết (articleId).
     */
    @GetMapping("/banners")
    public List<Map<String, Object>> banners(
            @RequestParam String position,
            @RequestParam(required = false) Long articleId,
            HttpServletRequest request
    ) {
        // Vùng được đọc từ ngôn ngữ trình duyệt, không suy diễn đó là vị trí GPS/IP đã xác minh.
        String agent = request.getHeader("User-Agent");
        agent = agent == null ? "" : agent.toLowerCase(java.util.Locale.ROOT);
        String device = (agent.contains("ipad") || agent.contains("tablet")) ? "TABLET"
                : (agent.contains("mobile") || agent.contains("android")) ? "MOBILE" : "DESKTOP";
        return service.banners(position, device, request.getLocale().getCountry(), articleId);
    }

    /**
     * [BF-08][ADM-09] Cung cấp danh sách chiến dịch kèm tổng lượt xem/click/CTR cho Ad Manager.
     */
    @GetMapping("/campaign-data")
    public List<Map<String, Object>> campaigns(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return service.campaigns(principal);
    }

    /**
     * [BF-08][BUS-18][ADM-09] Cung cấp chuỗi số liệu hiệu suất theo ngày để vẽ biểu đồ SVG Trend.
     */
    @GetMapping("/performance")
    public List<Map<String, Object>> performance(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return service.performance(principal);
    }

    /**
     * [BF-08][UC-32] Tra cứu các slot đã được đặt chỗ và thời gian bận.
     */
    @GetMapping("/availability")
    public List<Map<String, Object>> availability() {
        return service.availability();
    }

    /**
     * [BF-08][UC-31] Ghi nhận lượt hiển thị hợp lệ (Impression) khi banner xuất hiện trên màn hình.
     * Hỗ trợ chống trùng lặp / gian lận bằng session ID.
     */
    @PostMapping("/events/impression")
    public Map<String, Object> impression(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        Long creativeId = null;
        if (body != null && body.get("creativeId") != null) {
            try {
                creativeId = Long.valueOf(body.get("creativeId").toString());
            } catch (Exception ignored) {
                // Bỏ qua ID không hợp lệ để tránh lỗi runtime không đáng có
            }
        }
        service.recordEvent(creativeId, "IMPRESSION", request.getSession(true).getId());
        return Map.of("success", true);
    }

    /**
     * [BF-08][UC-31] Xử lý lượt click vào quảng cáo của độc giả.
     * Ghi nhận click vào cơ sở dữ liệu và chuyển hướng 302 sang trang web đích của đối tác.
     */
    @GetMapping("/click/{creativeId}")
    public void click(@PathVariable Long creativeId, HttpServletResponse response, HttpServletRequest request) throws IOException {
        String targetUrl = service.recordEvent(creativeId, "CLICK", request.getSession(true).getId());
        response.sendRedirect(targetUrl);
    }

    /**
     * [BF-08][UC-39] TÍNH NĂNG ĐINH CỦA CƯỜNG (Iteration 2): TẠM DỪNG / TIẾP TỤC CHIẾN DỊCH
     * Cho phép Ad Manager chuyển đổi trạng thái ACTIVE <=> PAUSED ngay lập tức trên màn hình ADM-09.
     */
    @PostMapping("/campaigns/{id}/toggle-status")
    @PreAuthorize("hasAnyRole('AD_MANAGER','ADMINISTRATOR')")
    public Map<String, Object> toggleStatus(@PathVariable Long id) {
        return service.toggleCampaignStatus(id);
    }
}
