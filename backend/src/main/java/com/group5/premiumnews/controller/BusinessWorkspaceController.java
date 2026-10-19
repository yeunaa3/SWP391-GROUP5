package com.group5.premiumnews.controller;

import com.group5.premiumnews.dto.BusinessRequests;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.BusinessWorkspaceService;
import com.group5.premiumnews.service.CampaignWorkflowService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/business")
@PreAuthorize("hasRole('BUSINESS')")// chỉ business mới được sử dụng
public class BusinessWorkspaceController {

    private final BusinessWorkspaceService service;
    private final CampaignWorkflowService campaigns;

    public BusinessWorkspaceController(BusinessWorkspaceService service, CampaignWorkflowService campaigns) {
        this.service = service;
        this.campaigns = campaigns;
    }

    // Lấy user từ session và trả workspace của chính công ty gắn với user đó.
    @GetMapping("/workspace")
    public Map<String, Object> overview(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return service.overview(user);
    }

    // UC-38: @Valid kiểm tra Company DTO; quyền BUSINESS được kiểm tra ở cấp class.
    @PutMapping("/company")
    public Map<String, Object> company(@AuthenticationPrincipal AuthenticatedUserPrincipal user, @Valid @RequestBody BusinessRequests.Company request) {
        return service.saveCompany(user, request);
    }

    @PostMapping("/application/submit")
    public Map<String, Object> application(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return service.submitApplication(user);
    }

    /** Mở hồ sơ mới sau từ chối; không xóa các phiên bản và quyết định đã có. */
    @PostMapping("/application/new")
    public Object newApplication(@AuthenticationPrincipal AuthenticatedUserPrincipal user){return service.newApplication(user);}

    @PostMapping("/bookings")
    public Map<String, Object> booking(@AuthenticationPrincipal AuthenticatedUserPrincipal user, @Valid @RequestBody BusinessRequests.Booking request) {
        return service.createBooking(user, request);
    }

    @PostMapping("/bookings/{id}/submit")
    public Map<String, Object> submitBooking(@AuthenticationPrincipal AuthenticatedUserPrincipal user, @PathVariable Long id) {
        return service.submitBooking(user, id);
    }

    @PostMapping("/bookings/drafts")
    public Map<String, Object> draft(@AuthenticationPrincipal AuthenticatedUserPrincipal user, @Valid @RequestBody BusinessRequests.Booking request) {
        return service.saveBooking(user, null, request, false);
    }

    @PutMapping("/bookings/{id}")
    public Map<String, Object> updateBooking(@AuthenticationPrincipal AuthenticatedUserPrincipal user, @PathVariable Long id, @Valid @RequestBody BusinessRequests.Booking request) {
        return service.saveBooking(user, id, request, false);
    }

    @DeleteMapping("/bookings/{id}")
    public Map<String, Object> deleteBooking(@AuthenticationPrincipal AuthenticatedUserPrincipal user, @PathVariable Long id) {
        return service.deleteBooking(user, id);
    }

    @PostMapping("/campaigns")
    public Map<String, Object> create(@AuthenticationPrincipal AuthenticatedUserPrincipal user, @Valid @RequestBody BusinessRequests.Campaign request) {
        return campaigns.save(user, null, request);
    }

    @PutMapping("/campaigns/{id}")
    public Map<String, Object> update(@AuthenticationPrincipal AuthenticatedUserPrincipal user, @PathVariable Long id, @Valid @RequestBody BusinessRequests.Campaign request) {
        return campaigns.save(user, id, request);
    }

    @PostMapping("/campaigns/{id}/submit")
    public Map<String, Object> submit(@AuthenticationPrincipal AuthenticatedUserPrincipal user, @PathVariable Long id,@Valid @RequestBody BusinessRequests.CampaignSubmit request) {
        return campaigns.submit(user, id,request.editVersion());
    }

    /** Workspace dùng dữ liệu thật, catalog targeting, metrics và thông báo theo người đăng nhập. */
    @GetMapping("/campaign-workspace")
    public Map<String,Object> campaignWorkspace(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {return campaigns.workspace(user);}
    /** Đọc detail/history/snapshot được kiểm tra company ownership ở service. */
    @GetMapping("/campaigns/{id}")
    public Map<String,Object> detail(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable long id){return campaigns.detail(user,id);}
    /** Checklist chỉ xem trước; submit luôn kiểm tra lại trong transaction. */
    @GetMapping("/campaigns/{id}/validation")
    public Object validation(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable long id){return campaigns.validation(user,id);}
    /** Lưu Category/Tags/Geo/Device và chống stale tab bằng editVersion. */
    @PutMapping("/campaigns/{id}/targeting")
    public Object targeting(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable long id,@Valid @RequestBody BusinessRequests.Targeting request){return campaigns.saveTargeting(user,id,request);}
    @DeleteMapping("/campaigns/{id}")
    /** Xóa mềm nháp chưa nộp; giữ lịch sử và quan hệ FK. */
    public void remove(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable long id){campaigns.delete(user,id);}
    @PostMapping("/campaigns/{id}/copy")
    /** Nhân bản thành nháp, không sao chép quyền phê duyệt hoặc metrics. */
    public Object copy(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable long id){return campaigns.copy(user,id,false);}
    @PostMapping("/campaigns/{id}/change-request")
    /** Tạo nháp thay thế cho campaign đã duyệt, chưa làm ngừng bản đang chạy. */
    public Object change(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable long id){return campaigns.copy(user,id,true);}
    @DeleteMapping("/campaigns/{id}/creatives/{creativeId}")
    /** Bỏ liên kết creative nháp, giữ file nếu các phiên bản khác còn tham chiếu. */
    public void removeCreative(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable long id,@PathVariable long creativeId){campaigns.removeCreative(user,id,creativeId);}
}
