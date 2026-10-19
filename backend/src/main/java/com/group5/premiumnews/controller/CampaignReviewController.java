package com.group5.premiumnews.controller;

import com.group5.premiumnews.dto.BusinessRequests;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.CampaignWorkflowService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Cầu nối BF-06 sang BF-07: manager xét đúng immutable submissionId. */
@RestController @RequestMapping("/api/ad-manager/campaign-submissions")
@PreAuthorize("hasRole('AD_MANAGER')")
public class CampaignReviewController {
    private final CampaignWorkflowService campaigns;
    public CampaignReviewController(CampaignWorkflowService campaigns){this.campaigns=campaigns;}
    /** Queue chỉ trả các snapshot đang chờ, không lấy mẫu giả từ UI. */
    @GetMapping public Object queue(){return campaigns.queue();}
    /** Quyết định có lý do bắt buộc; service khóa và ngăn xử lý lại phiên bản cũ. */
    @PostMapping("/{id}/decision")
    public void decide(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable long id,@Valid @RequestBody BusinessRequests.CampaignDecision request){campaigns.decide(user,id,request);}
}
