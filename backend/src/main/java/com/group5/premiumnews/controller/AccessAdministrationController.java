package com.group5.premiumnews.controller;
import com.group5.premiumnews.service.AccessAdministrationService;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/admin/access") @PreAuthorize("hasRole('ADMINISTRATOR')")
public class AccessAdministrationController {
    private final AccessAdministrationService service;
    public AccessAdministrationController(AccessAdministrationService service){this.service=service;}
    /** Chỉ bind bộ lọc và chuyển service; không đọc/sửa user theo dữ liệu mẫu frontend. */
    @GetMapping public Map<String,Object> list(@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="") String status,@RequestParam(defaultValue="") String role,@RequestParam(defaultValue="0") int page){return service.list(query,status,role,page);}
    @PutMapping("/users/{id}") public void user(@AuthenticationPrincipal AuthenticatedUserPrincipal actor,@PathVariable long id,@Valid @RequestBody AccessAdministrationService.UserChange body){service.updateUser(actor,id,body);}
    @PostMapping("/roles") public void createRole(@AuthenticationPrincipal AuthenticatedUserPrincipal actor,@Valid @RequestBody AccessAdministrationService.RoleChange body){service.saveRole(actor,null,body);}
    @PutMapping("/roles/{id}") public void role(@AuthenticationPrincipal AuthenticatedUserPrincipal actor,@PathVariable long id,@Valid @RequestBody AccessAdministrationService.RoleChange body){service.saveRole(actor,id,body);}
}
