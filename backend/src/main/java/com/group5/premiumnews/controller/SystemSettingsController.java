package com.group5.premiumnews.controller;
import com.group5.premiumnews.service.SystemSettingsService;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/admin/settings") @PreAuthorize("hasRole('ADMINISTRATOR')")
public class SystemSettingsController {
    private final SystemSettingsService service;
    public SystemSettingsController(SystemSettingsService service){this.service=service;}
    @GetMapping public Map<String,Object> catalog(){return service.catalog();}
    /** Không nhận default/type/rule từ client; server đọc catalog và kiểm tra trước khi lưu. */
    @PutMapping("/{key}") public void update(@AuthenticationPrincipal AuthenticatedUserPrincipal actor,@PathVariable String key,@Valid @RequestBody SystemSettingsService.Change body){service.update(actor,key,body);}
}
