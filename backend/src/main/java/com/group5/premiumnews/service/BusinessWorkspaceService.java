package com.group5.premiumnews.service;

import com.group5.premiumnews.dto.BusinessRequests;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.exception.ConflictException;
import com.group5.premiumnews.exception.InvalidStateTransitionException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Statement;
import java.sql.Timestamp;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@PreAuthorize("hasRole('BUSINESS')")
public class BusinessWorkspaceService {
    private final JdbcTemplate jdbc;
    public BusinessWorkspaceService(JdbcTemplate jdbc) { this.jdbc=jdbc; }

    // Resolve membership from DB on every request: sessions created before company creation
    // must not retain a stale companyId. Never accept a companyId from the browser.
    public Long companyId(AuthenticatedUserPrincipal user) {
        return jdbc.queryForObject("SELECT company_id FROM users WHERE user_id=? AND status='ACTIVE'", Long.class,user.id());
    }
    public Map<String,Object> overview(AuthenticatedUserPrincipal user) {
        Long id=companyId(user);
        if(id==null) return Map.of("company",Map.of(),"documents",List.of(),"contracts",List.of(),"campaigns",List.of());
        Map<String,Object> company=jdbc.queryForMap("SELECT * FROM companies WHERE company_id=?",id);
        List<Map<String,Object>> documents=jdbc.queryForList("SELECT document_id,original_file_name,document_type,version_no,uploaded_at FROM company_documents WHERE company_id=? AND status='ACTIVE' ORDER BY uploaded_at DESC",id);
        List<Map<String,Object>> contracts=jdbc.queryForList("SELECT * FROM contracts WHERE company_id=? ORDER BY created_at DESC",id);
        List<Map<String,Object>> campaigns=jdbc.queryForList("""
            SELECT c.*,ct.contract_code,ct.slot_id,s.width_px,s.height_px,
                (SELECT cr.media_url FROM ad_creatives cr WHERE cr.campaign_id=c.campaign_id ORDER BY version_no DESC LIMIT 1) AS media_url,
                (SELECT cr.target_url FROM ad_creatives cr WHERE cr.campaign_id=c.campaign_id ORDER BY version_no DESC LIMIT 1) AS target_url,
                (SELECT cr.status FROM ad_creatives cr WHERE cr.campaign_id=c.campaign_id ORDER BY version_no DESC LIMIT 1) AS creative_status
            FROM ad_campaigns c JOIN contracts ct ON ct.contract_id=c.contract_id
            JOIN ad_slots s ON s.slot_id=ct.slot_id WHERE ct.company_id=? ORDER BY c.created_at DESC
            """,id);
        Map<String,Object> result=new HashMap<>();result.put("company",company);result.put("documents",documents);
        result.put("contracts",contracts);result.put("campaigns",campaigns);return result;
    }
    @Transactional
    public Map<String,Object> saveCompany(AuthenticatedUserPrincipal user,BusinessRequests.Company request) {
        Long id=jdbc.queryForObject("SELECT company_id FROM users WHERE user_id=? FOR UPDATE",Long.class,user.id());
        // Legacy demo sentinel is allowed only unchanged for its existing company.
        if(!request.taxCode().matches("[0-9]{10}(-[0-9]{3})?")) {
            String previous=id==null?null:jdbc.queryForObject("SELECT tax_code FROM companies WHERE company_id=?",String.class,id);
            if(!request.taxCode().equals(previous)) throw new InvalidStateTransitionException("Mã số thuế phải có 10 số hoặc 10 số-3 số.");
        }
        Long duplicate=jdbc.queryForObject("SELECT COUNT(*) FROM companies WHERE tax_code=? AND (? IS NULL OR company_id<>?)",Long.class,request.taxCode(),id,id);
        if(duplicate!=null && duplicate>0) throw new ConflictException("Mã số thuế đã thuộc một doanh nghiệp khác. Không thể tự nhận quyền truy cập.");
        if(id==null) {
            id=insert("INSERT INTO companies(company_name,tax_code,email,phone,address,billing_address,application_code) VALUES(?,?,?,?,?,?,?)",
                request.name().trim(),request.taxCode(),request.email().trim(),request.phone().trim(),request.address().trim(),request.billingAddress(),code("APP"));
            jdbc.update("UPDATE users SET company_id=? WHERE user_id=?",id,user.id());
        } else {
            Map<String,Object> company=jdbc.queryForMap("SELECT * FROM companies WHERE company_id=? FOR UPDATE",id);
            String state=(String)company.get("application_status");
            if(List.of("PENDING_REVIEW","RESUBMITTED").contains(state)) throw new InvalidStateTransitionException("Hồ sơ đang được duyệt; chưa thể chỉnh sửa.");
            if("APPROVED".equals(state) && (!request.taxCode().equals(company.get("tax_code")) || !request.name().trim().equals(company.get("company_name"))))
                throw new InvalidStateTransitionException("Doanh nghiệp đã duyệt: không được tự đổi tên pháp lý/mã số thuế. Bạn vẫn có thể sửa thông tin liên hệ.");
            jdbc.update("UPDATE companies SET company_name=?,tax_code=?,email=?,phone=?,address=?,billing_address=? WHERE company_id=?",
                request.name().trim(),request.taxCode(),request.email().trim(),request.phone().trim(),request.address().trim(),request.billingAddress(),id);
        }
        audit(user,"SAVE_COMPANY","COMPANY",id);
        return overview(user);
    }
    @Transactional
    public Map<String,Object> submitApplication(AuthenticatedUserPrincipal user) {
        Long id=requireCompany(user);Map<String,Object> c=jdbc.queryForMap("SELECT * FROM companies WHERE company_id=? FOR UPDATE",id);
        String state=(String)c.get("application_status");
        if(!List.of("DRAFT","NEEDS_REVISION").contains(state)) throw new InvalidStateTransitionException("Chỉ hồ sơ nháp hoặc cần chỉnh sửa mới được gửi duyệt.");
        Integer count=jdbc.queryForObject("SELECT COUNT(*) FROM company_documents WHERE company_id=? AND status='ACTIVE'",Integer.class,id);
        if(count==null || count==0) throw new InvalidStateTransitionException("Cần tải ít nhất một tài liệu doanh nghiệp trước khi gửi.");
        jdbc.update("UPDATE companies SET application_status=?,submitted_at=CURRENT_TIMESTAMP,review_note=NULL WHERE company_id=?",
            "NEEDS_REVISION".equals(state)?"RESUBMITTED":"PENDING_REVIEW",id);
        audit(user,"SUBMIT_APPLICATION","COMPANY",id);return overview(user);
    }
    @Transactional
    public Map<String,Object> createBooking(AuthenticatedUserPrincipal user,BusinessRequests.Booking request) {
        Long id=requireCompany(user);
        Map<String,Object> company=jdbc.queryForMap("SELECT * FROM companies WHERE company_id=? FOR UPDATE",id);
        if(!"APPROVED".equals(company.get("application_status"))) throw new InvalidStateTransitionException("Doanh nghiệp cần được duyệt hợp tác trước khi đặt quảng cáo.");
        long days=ChronoUnit.DAYS.between(request.startDate(),request.endDate())+1;
        if(request.startDate().isBefore(LocalDate.now()) || days<=0 || request.startDate().isAfter(LocalDate.now().plusYears(1)))
            throw new InvalidStateTransitionException("Ngày bắt đầu phải từ hôm nay, trong một năm tới; ngày kết thúc không được trước ngày bắt đầu.");
        Map<String,Object> slot=one("SELECT * FROM ad_slots WHERE slot_id=? AND status='ACTIVE' FOR UPDATE",request.slotId());
        Map<String,Object> pack=one("SELECT * FROM b2b_packages WHERE b2b_package_id=? AND status='ACTIVE'",request.packageId());
        if(days>((Number)pack.get("duration_days")).longValue()) throw new InvalidStateTransitionException("Khoảng chạy vượt thời hạn của gói quảng cáo.");
        LocalDateTime start=request.startDate().atStartOfDay(), end=request.endDate().plusDays(1).atStartOfDay();
        requireAvailable(request.slotId(),start,end);
        BigDecimal price=((BigDecimal)pack.get("price")).add(((BigDecimal)slot.get("base_price")).multiply(BigDecimal.valueOf(days)).divide(BigDecimal.valueOf(30),2,RoundingMode.HALF_UP));
        Long contract=insert("""
            INSERT INTO contracts(contract_code,contract_name,company_id,b2b_package_id,slot_id,
                package_code_snapshot,package_name_snapshot,package_price_snapshot,duration_days_snapshot,
                impressions_quota_snapshot,slot_name_snapshot,slot_position_snapshot,total_value,start_at,end_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,code("BOOK"),request.name().trim(),id,request.packageId(),request.slotId(),pack.get("code"),pack.get("name"),pack.get("price"),
            pack.get("duration_days"),pack.get("impressions_quota"),slot.get("slot_name"),slot.get("position_code"),price,start,end);
        audit(user,"SUBMIT_BOOKING_REQUEST","CONTRACT",contract);
        return Map.of("id",contract,"amount",price,"status","DRAFT");
    }
    @Transactional
    public Map<String,Object> saveCampaign(AuthenticatedUserPrincipal user,Long campaignId,BusinessRequests.Campaign request) {
        Long company=requireCompany(user);
        Map<String,Object> contract=one("SELECT * FROM contracts WHERE contract_id=? AND company_id=? FOR UPDATE",request.contractId(),company);
        if(!"ACTIVE".equals(contract.get("status")) || !"PAID".equals(contract.get("payment_status"))) throw new InvalidStateTransitionException("Cần hợp đồng đang hiệu lực và đã thanh toán.");
        LocalDateTime contractStart=dateTime(contract.get("start_at")), contractEnd=dateTime(contract.get("end_at"));
        validateCampaignDates(request.startTime(),request.endTime(),contractStart,contractEnd);
        Long id=campaignId;
        if(id==null) id=insert("INSERT INTO ad_campaigns(contract_id,campaign_name,description,scheduled_start_time,scheduled_end_time,created_by,impression_limit) VALUES(?,?,?,?,?,?,?)",
            request.contractId(),request.name().trim(),request.description(),request.startTime(),request.endTime(),user.id(),contract.get("impressions_quota_snapshot"));
        else {
            Map<String,Object> current=ownedCampaign(user,id,true);requireEditable(current);
            if(((Number)current.get("contract_id")).longValue()!=request.contractId()) throw new InvalidStateTransitionException("Không được đổi hợp đồng của chiến dịch đã tạo.");
            jdbc.update("UPDATE ad_campaigns SET campaign_name=?,description=?,scheduled_start_time=?,scheduled_end_time=? WHERE campaign_id=?",
                request.name().trim(),request.description(),request.startTime(),request.endTime(),id);
        }
        audit(user,"SAVE_CAMPAIGN","CAMPAIGN",id);return Map.of("id",id);
    }
    @Transactional
    public Map<String,Object> submitCampaign(AuthenticatedUserPrincipal user,Long id) {
        Map<String,Object> c=ownedCampaign(user,id,true);requireEditable(c);
        Map<String,Object> ct=one("SELECT * FROM contracts WHERE contract_id=? FOR UPDATE",c.get("contract_id"));
        if(!"ACTIVE".equals(ct.get("status")) || !"PAID".equals(ct.get("payment_status"))) throw new InvalidStateTransitionException("Hợp đồng không còn hợp lệ.");
        validateCampaignDates(dateTime(c.get("scheduled_start_time")),dateTime(c.get("scheduled_end_time")),
            dateTime(ct.get("start_at")),dateTime(ct.get("end_at")));
        List<Map<String,Object>> creatives=jdbc.queryForList("SELECT * FROM ad_creatives WHERE campaign_id=? ORDER BY version_no DESC LIMIT 1 FOR UPDATE",id);
        if(creatives.isEmpty() || !"DRAFT".equals(creatives.getFirst().get("status"))) throw new InvalidStateTransitionException("Cần tải phiên bản banner mới trước khi gửi duyệt.");
        jdbc.update("UPDATE ad_creatives SET status='PENDING_REVIEW',submitted_at=CURRENT_TIMESTAMP WHERE creative_id=?",creatives.getFirst().get("creative_id"));
        jdbc.update("UPDATE ad_campaigns SET status='PENDING_REVIEW',submitted_at=CURRENT_TIMESTAMP WHERE campaign_id=?",id);
        audit(user,"SUBMIT_CAMPAIGN","CAMPAIGN",id);return Map.of("id",id,"status","PENDING_REVIEW");
    }
    public Long requireCompany(AuthenticatedUserPrincipal user) {
        Long id=companyId(user);if(id==null) throw new InvalidStateTransitionException("Hãy lưu hồ sơ doanh nghiệp trước.");return id;
    }
    public Map<String,Object> ownedCampaign(AuthenticatedUserPrincipal user,Long id,boolean lock) {
        return one("SELECT c.* FROM ad_campaigns c JOIN contracts ct ON ct.contract_id=c.contract_id WHERE c.campaign_id=? AND ct.company_id=?"+(lock?" FOR UPDATE":""),id,requireCompany(user));
    }
    public void requireEditable(Map<String,Object> campaign) {
        if(!List.of("DRAFT","NEEDS_REVISION").contains(campaign.get("status"))) throw new InvalidStateTransitionException("Chỉ chiến dịch nháp/cần chỉnh sửa mới được sửa. Bản gửi duyệt đã khóa.");
    }
    public static void validateCampaignDates(LocalDateTime start,LocalDateTime end,LocalDateTime contractStart,LocalDateTime contractEnd) {
        if(!end.isAfter(start) || start.isBefore(contractStart) || end.isAfter(contractEnd) || !end.isAfter(LocalDateTime.now()))
            throw new InvalidStateTransitionException("Lịch chiến dịch phải nằm trong thời hạn hợp đồng, kết thúc sau bắt đầu và chưa hết hạn.");
    }
    static LocalDateTime dateTime(Object value) {
        if(value instanceof LocalDateTime date) return date;
        if(value instanceof Timestamp timestamp) return timestamp.toLocalDateTime();
        throw new IllegalStateException("Unsupported database date type");
    }
    private void requireAvailable(Long slot,LocalDateTime start,LocalDateTime end) {
        Integer count=jdbc.queryForObject("""
            SELECT COUNT(*) FROM contracts WHERE slot_id=? AND start_at<? AND end_at>?
                AND ((status='ACTIVE' AND payment_status='PAID') OR
                (status IN ('ACCEPTED','PENDING_PAYMENT') AND reservation_expires_at>CURRENT_TIMESTAMP))
            """,Integer.class,slot,end,start);
        if(count!=null && count>0) throw new ConflictException("Vị trí đã có hợp đồng/giữ chỗ trong khoảng ngày này. Hãy chọn thời gian khác.");
    }
    private Map<String,Object> one(String sql,Object... args) {
        List<Map<String,Object>> rows=jdbc.queryForList(sql,args);
        if(rows.isEmpty()) throw new InvalidStateTransitionException("Không tìm thấy bản ghi hoặc bạn không có quyền truy cập.");return rows.getFirst();
    }
    private Long insert(String sql,Object... args) {
        GeneratedKeyHolder keys=new GeneratedKeyHolder();jdbc.update(connection -> {
            var statement=connection.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS);
            for(int i=0;i<args.length;i++) statement.setObject(i+1,args[i]);return statement;
        },keys);return Objects.requireNonNull(keys.getKey()).longValue();
    }
    private String code(String prefix) { return prefix+"-"+UUID.randomUUID().toString().substring(0,18); }
    private void audit(AuthenticatedUserPrincipal user,String action,String type,Long id) {
        jdbc.update("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)",user.id(),action,type,String.valueOf(id));
    }
}
