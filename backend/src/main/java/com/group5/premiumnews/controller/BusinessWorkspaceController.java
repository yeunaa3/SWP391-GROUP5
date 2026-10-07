package com.group5.premiumnews.controller;

import com.group5.premiumnews.dto.BusinessRequests;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.BusinessWorkspaceService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/business")
@PreAuthorize("hasRole('BUSINESS')")
public class BusinessWorkspaceController {
    private final BusinessWorkspaceService service;
    public BusinessWorkspaceController(BusinessWorkspaceService service){this.service=service;}
    @GetMapping("/workspace") public Map<String,Object> overview(@AuthenticationPrincipal AuthenticatedUserPrincipal user){return service.overview(user);}
    @PutMapping("/company") public Map<String,Object> company(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@Valid @RequestBody BusinessRequests.Company request){return service.saveCompany(user,request);}
    @PostMapping("/application/submit") public Map<String,Object> application(@AuthenticationPrincipal AuthenticatedUserPrincipal user){return service.submitApplication(user);}
    @PostMapping("/bookings") public Map<String,Object> booking(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@Valid @RequestBody BusinessRequests.Booking request){return service.createBooking(user,request);}
    @PostMapping("/campaigns") public Map<String,Object> create(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@Valid @RequestBody BusinessRequests.Campaign request){return service.saveCampaign(user,null,request);}
    @PutMapping("/campaigns/{id}") public Map<String,Object> update(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable Long id,@Valid @RequestBody BusinessRequests.Campaign request){return service.saveCampaign(user,id,request);}
    @PostMapping("/campaigns/{id}/submit") public Map<String,Object> submit(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable Long id){return service.submitCampaign(user,id);}
}
