package com.group5.premiumnews.controller;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.BF9_AdMonitorService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ============================================================================
 * [BF-09] LUỒNG 9: GIÁM SÁT HIỆU SUẤT & ĐIỀU HÀNH CHIẾN DỊCH (REST API CONTROLLER)
 * Phụ trách: Cường (Ad Performance Monitoring & Operations)
 * 
 * REST API Endpoints:
 * - GET  /api/advertising/campaign-data         : [ADM-09] Giám sát danh sách chiến dịch, tổng view/click/CTR
 * - GET  /api/advertising/performance           : [ADM-09][BUS-18] Lấy chuỗi chỉ số báo cáo vẽ biểu đồ xu hướng
 * - POST /api/advertising/campaigns/{id}/toggle-status : [UC-39] Nút khẩn cấp Tạm dừng / Tiếp tục chiến dịch
 * ============================================================================
 */
@RestController
@RequestMapping("/api/advertising")
public class BF9_AdMonitorController {

    private final BF9_AdMonitorService service;

    public BF9_AdMonitorController(BF9_AdMonitorService service) {
        this.service = service;
    }

    /**
     * [BF-09][ADM-09] Cung cấp danh sách chiến dịch kèm tổng lượt xem/click/CTR cho Ad Manager.
     */
    @GetMapping("/campaign-data")
    public List<Map<String, Object>> campaigns(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return service.campaigns(principal);
    }

    /**
     * [BF-09][BUS-18][ADM-09] Cung cấp chuỗi số liệu hiệu suất theo ngày để vẽ biểu đồ SVG Trend.
     */
    @GetMapping("/performance")
    public List<Map<String, Object>> performance(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return service.performance(principal);
    }

    /**
     * [BF-09][UC-39] TÍNH NĂNG ĐINH CỦA CƯỜNG: NÚT TẠM DỪNG / TIẾP TỤC KHẨN CẤP
     * Cho phép Ad Manager chuyển đổi trạng thái ACTIVE <=> PAUSED ngay lập tức trên màn hình ADM-09.
     */
    @PostMapping("/campaigns/{id}/toggle-status")
    @PreAuthorize("hasAnyRole('AD_MANAGER','ADMINISTRATOR')")
    public Map<String, Object> toggleStatus(@PathVariable Long id) {
        return service.toggleCampaignStatus(id);
    }
}
