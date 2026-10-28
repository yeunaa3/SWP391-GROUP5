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
    /** Upload giấy tờ; service kiểm tra nội dung và tạo phiên bản, không nhận đường dẫn lưu từ client. */
    @PostMapping("/api/business/documents") public Map<String,Object> document(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@RequestParam MultipartFile file) throws Exception{return files.document(user,file);}
    /** Gỡ theo ID; service kiểm tra doanh nghiệp sở hữu và trạng thái cho phép sửa. */
    @DeleteMapping("/api/business/documents/{id}") public Map<String,Object> removeDocument(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable Long id){return files.removeDocument(user,id);}
    /** Nhận file và version đang xem; service kiểm tra lại quyền, trạng thái và chống ghi đè từ tab cũ. */
    @PostMapping("/api/business/campaigns/{id}/creative") public Map<String,Object> creative(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable Long id,@RequestParam MultipartFile file,@RequestParam String targetUrl,@RequestParam Integer editVersion) throws Exception{return files.creative(user,id,file,targetUrl,editVersion);}
    /** Mở giấy tờ theo ID với quyền owner/staff, kể cả khi tài liệu đã thuộc snapshot cũ. */
    @GetMapping("/api/media/document/{id}") public ResponseEntity<Resource> document(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable Long id){return files.read("document",id,user);}
    /** Creative nháp được bảo vệ; creative đã duyệt được phép đọc để hiển thị quảng cáo. */
    @GetMapping("/api/media/creative/{id}") public ResponseEntity<Resource> creative(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable Long id){return files.read("creative",id,user);}
}
