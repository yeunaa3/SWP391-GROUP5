package com.group5.premiumnews.controller;
import com.group5.premiumnews.service.BusinessFileService;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@RestController
public class BusinessFileController {
    private final BusinessFileService files;
    public BusinessFileController(BusinessFileService files){this.files=files;}
    @PostMapping("/api/business/documents") public Map<String,Object> document(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@RequestParam MultipartFile file) throws Exception{return files.document(user,file);}
    @PostMapping("/api/business/campaigns/{id}/creative") public Map<String,Object> creative(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable Long id,@RequestParam MultipartFile file,@RequestParam String targetUrl) throws Exception{return files.creative(user,id,file,targetUrl);}
    @GetMapping("/api/media/document/{id}") public ResponseEntity<Resource> document(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable Long id){return files.read("document",id,user);}
    @GetMapping("/api/media/creative/{id}") public ResponseEntity<Resource> creative(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable Long id){return files.read("creative",id,user);}
}
