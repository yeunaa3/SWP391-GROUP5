package com.group5.premiumnews.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.group5.premiumnews.dto.BusinessRequests;
import com.group5.premiumnews.exception.ConflictException;
import com.group5.premiumnews.exception.InvalidStateTransitionException;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import java.net.URI;
import java.sql.Statement;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** BF-06: quản lý draft, targeting, snapshot bất biến và review đúng phiên bản. */
@Service
public class CampaignWorkflowService {
    private final JdbcTemplate jdbc;
    private final BusinessWorkspaceService business;
    private final BusinessFileService files;
    private final ObjectMapper mapper;

    /** Nhận adapter DB, quyền doanh nghiệp, tệp và JSON; service không giữ state riêng theo request. */
    public CampaignWorkflowService(JdbcTemplate jdbc, BusinessWorkspaceService business,
            BusinessFileService files, ObjectMapper mapper) {
        this.jdbc=jdbc; this.business=business; this.files=files; this.mapper=mapper;
    }

    /** Đọc danh mục và campaign của chính company; không nhận companyId do trình duyệt gửi. */
    @PreAuthorize("hasRole('BUSINESS')")
    @Transactional(readOnly=true)
    public Map<String,Object> workspace(AuthenticatedUserPrincipal user) {
        var result=new HashMap<>(business.overview(user));
        var campaigns=business.companyId(user)==null ? List.<Map<String,Object>>of() : jdbc.queryForList("""
            SELECT c.*,COALESCE(c.campaign_code,CONCAT('CMP-',c.campaign_id)) code,
                ct.contract_code,s.slot_name,s.width_px,s.height_px
            FROM ad_campaigns c JOIN contracts ct ON ct.contract_id=c.contract_id
            JOIN ad_slots s ON s.slot_id=ct.slot_id
            WHERE ct.company_id=? AND c.status<>'CANCELLED' ORDER BY c.campaign_id DESC
            """,business.companyId(user));
        @SuppressWarnings("unchecked") var company=(Map<String,Object>)result.get("company");
        result.put("campaigns","APPROVED".equals(company.get("application_status"))?campaigns:List.of());
        result.put("categories",jdbc.queryForList("SELECT category_id id,name FROM categories WHERE status='ACTIVE' ORDER BY name"));
        result.put("tags",jdbc.queryForList("SELECT tag_id id,name FROM tags WHERE status='ACTIVE' ORDER BY name"));
        result.put("notices",jdbc.queryForList("SELECT title,content,created_at FROM notifications WHERE user_id=? ORDER BY notification_id DESC LIMIT 5",user.id()));
        result.put("metrics",metrics(user));
        result.put("companyVersions",CompanyApplicationHistory.load(jdbc,company));
        return result;
    }

    /** Tổng hợp raw events thật; không trộn fixture ad_metrics vào dashboard/dự báo. */
    private Map<String,Object> metrics(AuthenticatedUserPrincipal user) {
        var m=new HashMap<>(jdbc.queryForMap("""
            SELECT COUNT(*) sampleCount, SUM(e.event_type='IMPRESSION') impressions,
                SUM(e.event_type='CLICK') clicks,MAX(e.occurred_at) cutoff
            FROM ad_events e JOIN contracts ct ON ct.slot_id=e.slot_id
                AND ct.contract_id=(SELECT contract_id FROM ad_campaigns WHERE campaign_id=e.campaign_id)
            WHERE e.is_valid=TRUE AND ct.company_id=(SELECT company_id FROM users WHERE user_id=?)
            """,user.id()));
        m.put("source","RAW_EVENTS"); return m;
    }

    /** Tạo/sửa nháp có optimistic version; requestKey giúp retry create không tạo campaign trùng. */
    @PreAuthorize("hasRole('BUSINESS')") @Transactional
    public Map<String,Object> save(AuthenticatedUserPrincipal user,Long id,BusinessRequests.Campaign r) {
        long company=business.requireApprovedPartnership(user);
        if(id==null&&(r.requestKey()==null||r.requestKey().isBlank()))fail("Cần mã thao tác để tạo nháp an toàn. Hãy tải lại form.");
        if(id==null && r.requestKey()!=null) {
            var prior=jdbc.queryForList("SELECT campaign_id id FROM ad_campaigns WHERE created_by=? AND client_request_key=?",user.id(),r.requestKey());
            if(!prior.isEmpty()) return prior.getFirst();
        }
        var ct=one("SELECT * FROM contracts WHERE contract_id=? AND company_id=? FOR UPDATE",r.contractId(),company);
        requireContract(ct);
        BusinessWorkspaceService.validateCampaignDates(r.startTime(),r.endTime(),date(ct.get("start_at")),date(ct.get("end_at")));
        if(r.targetUrl()!=null && !r.targetUrl().isBlank()) validateUrl(r.targetUrl());
        if(id==null) {
            id=insert("""
                INSERT INTO ad_campaigns(contract_id,campaign_code,campaign_name,description,target_url,
                    scheduled_start_time,scheduled_end_time,created_by,impression_limit,client_request_key)
                VALUES(?,?,?,?,?,?,?,?,?,?)
                """,r.contractId(),"CMP-"+UUID.randomUUID().toString().substring(0,18),r.name().trim(),r.description(),
                trim(r.targetUrl()),r.startTime(),r.endTime(),user.id(),ct.get("impressions_quota_snapshot"),r.requestKey());
        } else {
            var c=owned(user,id,true); business.requireEditable(c); requireVersion(c,r.editVersion());
            if(number(c.get("contract_id"))!=r.contractId()) fail("Không thể đổi hợp đồng của chiến dịch.");
            // Đổi URL tạo một phiên bản creative mới, không ghi đè URL của bản đã nộp trước đó.
            if(!Objects.equals(c.get("target_url"),trim(r.targetUrl()))) cloneCreativeForUrl(id,trim(r.targetUrl()));
            jdbc.update("""
                UPDATE ad_campaigns SET campaign_name=?,description=?,target_url=?,scheduled_start_time=?,
                    scheduled_end_time=?,status='DRAFT',edit_version=edit_version+1 WHERE campaign_id=?
                """,r.name().trim(),r.description(),trim(r.targetUrl()),r.startTime(),r.endTime(),id);
        }
        activity(user,id,"SAVE_DRAFT","Đã lưu thông tin nháp.");
        return Map.of("id",id);
    }

    /** Khóa company trước campaign để mọi mutation dùng cùng thứ tự lock. */
    private Map<String,Object> owned(AuthenticatedUserPrincipal user,long id,boolean lock) {
        long company=lock?business.requireApprovedPartnership(user):business.requireCompany(user);
        if(!lock)BusinessWorkspaceService.requireApprovedStatus(jdbc.queryForObject("SELECT application_status FROM companies WHERE company_id=?",String.class,company));
        return one("SELECT c.* FROM ad_campaigns c JOIN contracts ct ON ct.contract_id=c.contract_id WHERE c.campaign_id=? AND ct.company_id=?"+(lock?" FOR UPDATE":""),id,company);
    }

    /** Đọc chi tiết cùng creative/history và snapshot từng lần gửi; tách bản mới nhất khỏi bản đã duyệt. */
    @PreAuthorize("hasRole('BUSINESS')") @Transactional(readOnly=true)
    public Map<String,Object> detail(AuthenticatedUserPrincipal user,long id) {
        var c=owned(user,id,false); var result=new HashMap<String,Object>();
        result.put("campaign",c);
        result.put("contract",one("SELECT ct.*,s.width_px,s.height_px,s.slot_name,s.status slot_status FROM contracts ct JOIN ad_slots s ON s.slot_id=ct.slot_id WHERE ct.contract_id=?",c.get("contract_id")));
        result.put("creatives",jdbc.queryForList("SELECT * FROM ad_creatives WHERE campaign_id=? ORDER BY version_no DESC",id));
        result.put("targeting",targeting(id));
        result.put("submissions",submissions(id));
        result.put("history",jdbc.queryForList("SELECT a.*,COALESCE(u.full_name,'Hệ thống') actor_name FROM campaign_activity a LEFT JOIN users u ON u.user_id=a.actor_id WHERE campaign_id=? ORDER BY activity_id DESC",id));
        var delivery=new HashMap<>(jdbc.queryForMap("SELECT COUNT(*) impressions,MAX(occurred_at) cutoff FROM ad_events WHERE campaign_id=? AND event_type='IMPRESSION' AND is_valid=TRUE",id));
        delivery.put("contractImpressions",jdbc.queryForObject("SELECT COUNT(*) FROM ad_events e JOIN ad_campaigns c ON c.campaign_id=e.campaign_id WHERE c.contract_id=? AND e.event_type='IMPRESSION' AND e.is_valid=TRUE",Long.class,c.get("contract_id")));
        result.put("delivery",delivery);
        result.put("forecast",forecast(c));
        return result;
    }

    /** Lưu targeting sau khi kiểm tra catalog, quyền sở hữu và version để chống hai tab ghi đè. */
    @PreAuthorize("hasRole('BUSINESS')") @Transactional
    public Map<String,Object> saveTargeting(AuthenticatedUserPrincipal user,long id,BusinessRequests.Targeting r) {
        var c=owned(user,id,true); business.requireEditable(c); requireVersion(c,r.editVersion());
        var cats=validIds("categories","category_id",r.categoryIds());
        var tags=validIds("tags","tag_id",r.tagIds());
        jdbc.update("INSERT INTO ad_targeting(campaign_id,target_audience,geo_scope,device_type) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE target_audience=VALUES(target_audience),geo_scope=VALUES(geo_scope),device_type=VALUES(device_type)",id,trim(r.audience()),normalizeGeo(r.geoScope()),r.deviceType()==null?"ALL":r.deviceType());
        long target=number(one("SELECT target_id FROM ad_targeting WHERE campaign_id=?",id).get("target_id"));
        jdbc.update("DELETE FROM ad_targeting_categories WHERE target_id=?",target);
        jdbc.update("DELETE FROM ad_targeting_tags WHERE target_id=?",target);
        for(long cat:cats) jdbc.update("INSERT INTO ad_targeting_categories(target_id,category_id) VALUES(?,?)",target,cat);
        for(long tag:tags) jdbc.update("INSERT INTO ad_targeting_tags(target_id,tag_id) VALUES(?,?)",target,tag);
        jdbc.update("UPDATE ad_campaigns SET edit_version=edit_version+1 WHERE campaign_id=?",id);
        activity(user,id,"SAVE_TARGETING","Đã lưu đối tượng và phạm vi.");
        return targeting(id);
    }

    /** Checklist dùng chung với submit; GET chỉ đọc, POST sẽ khóa và kiểm tra lại cùng điều kiện. */
    @PreAuthorize("hasRole('BUSINESS')") @Transactional(readOnly=true)
    public List<Map<String,Object>> validation(AuthenticatedUserPrincipal user,long id) {
        return checks(owned(user,id,false));
    }

    /** Chốt đúng snapshot và creative trong một transaction; retry sau submit trả bản nộp hiện tại. */
    @PreAuthorize("hasRole('BUSINESS')") @Transactional
    public Map<String,Object> submit(AuthenticatedUserPrincipal user,long id,Integer editVersion) {
        var c=owned(user,id,true);
        if("PENDING_REVIEW".equals(c.get("status"))) return Map.of("id",id,"status","PENDING_REVIEW");
        business.requireEditable(c);
        requireVersion(c,editVersion);
        var ct=one("SELECT * FROM contracts WHERE contract_id=? FOR UPDATE",c.get("contract_id")); requireContract(ct);
        var rows=checks(c);
        if(rows.stream().anyMatch(x->!Boolean.TRUE.equals(x.get("valid")))) fail(rows.stream().filter(x->!Boolean.TRUE.equals(x.get("valid"))).map(x->String.valueOf(x.get("message"))).reduce((a,b)->a+"; "+b).orElse("Hồ sơ chưa hợp lệ."));
        var creative=latest(id); int version=jdbc.queryForObject("SELECT COALESCE(MAX(version_no),0)+1 FROM campaign_submissions WHERE campaign_id=?",Integer.class,id);
        var snapshot=new LinkedHashMap<String,Object>(); snapshot.put("campaign",c); snapshot.put("contract",ct);
        snapshot.put("targeting",targeting(id)); snapshot.put("creative",creative);
        long submission=insert("INSERT INTO campaign_submissions(campaign_id,version_no,creative_id,snapshot,submitted_by) VALUES(?,?,?,?,?)",id,version,creative.get("creative_id"),json(snapshot),user.id());
        jdbc.update("UPDATE ad_creatives SET status='PENDING_REVIEW',submitted_at=CURRENT_TIMESTAMP(6) WHERE creative_id=?",creative.get("creative_id"));
        jdbc.update("UPDATE ad_campaigns SET status='PENDING_REVIEW',submitted_at=CURRENT_TIMESTAMP(6),edit_version=edit_version+1 WHERE campaign_id=?",id);
        activity(user,id,"SUBMIT_CAMPAIGN","Đã nộp phiên bản v"+version);
        notifyReview(id,"Chiến dịch đã gửi duyệt", "Đã nộp v"+version+". Gửi duyệt chưa có nghĩa là quảng cáo đang chạy.");
        return Map.of("id",id,"submissionId",submission,"status","PENDING_REVIEW");
    }

    /** Chỉ xóa mềm draft chưa từng nộp; giữ FK, audit và tệp để không mất lịch sử. */
    @PreAuthorize("hasRole('BUSINESS')") @Transactional
    public void delete(AuthenticatedUserPrincipal user,long id) {
        var c=owned(user,id,true); if(!"DRAFT".equals(c.get("status")) || !submissions(id).isEmpty()) fail("Chỉ xóa bản nháp chưa từng gửi duyệt.");
        jdbc.update("UPDATE ad_campaigns SET status='CANCELLED',edit_version=edit_version+1 WHERE campaign_id=?",id);
        activity(user,id,"DELETE_DRAFT","Đã lưu trữ bản nháp không dùng.");
    }

    /** Nhân bản thành draft độc lập; yêu cầu đổi creative giữ campaign gốc đang chạy đến khi bản mới được duyệt. */
    @PreAuthorize("hasRole('BUSINESS')") @Transactional
    public Map<String,Object> copy(AuthenticatedUserPrincipal user,long id,boolean replacement) {
        var c=owned(user,id,true);
        if(replacement && !List.of("APPROVED","SCHEDULED","ACTIVE","PAUSED").contains(c.get("status"))) fail("Chỉ yêu cầu thay bản đã được duyệt.");
        if(replacement) {
            var existing=jdbc.queryForList("SELECT campaign_id id FROM ad_campaigns WHERE replaces_campaign_id=? AND status IN ('DRAFT','PENDING_REVIEW','NEEDS_REVISION')",id);
            if(!existing.isEmpty()) return existing.getFirst();
        }
        var ct=one("SELECT * FROM contracts WHERE contract_id=? FOR UPDATE",c.get("contract_id")); requireContract(ct);
        var start=date(c.get("scheduled_start_time")); var end=date(c.get("scheduled_end_time"));
        BusinessWorkspaceService.validateCampaignDates(start,end,date(ct.get("start_at")),date(ct.get("end_at")));
        long next=insert("INSERT INTO ad_campaigns(contract_id,campaign_code,campaign_name,description,target_url,scheduled_start_time,scheduled_end_time,created_by,impression_limit,replaces_campaign_id) VALUES(?,?,?,?,?,?,?,?,?,?)",c.get("contract_id"),"CMP-"+UUID.randomUUID().toString().substring(0,18),String.valueOf(c.get("campaign_name")).substring(0,Math.min(135,String.valueOf(c.get("campaign_name")).length()))+" (bản sao)",c.get("description"),c.get("target_url"),start,end,user.id(),ct.get("impressions_quota_snapshot"),replacement?id:null);
        jdbc.update("INSERT INTO ad_targeting(campaign_id,target_audience,geo_scope,device_type) SELECT ?,target_audience,geo_scope,device_type FROM ad_targeting WHERE campaign_id=?",next,id);
        for(String suffix:List.of("categories","tags")) {
            String key=suffix.equals("categories")?"category_id":"tag_id";
            jdbc.update("INSERT INTO ad_targeting_"+suffix+"(target_id,"+key+") SELECT n.target_id,x."+key+" FROM ad_targeting old JOIN ad_targeting_"+suffix+" x ON x.target_id=old.target_id JOIN ad_targeting n ON n.campaign_id=? WHERE old.campaign_id=?",next,id);
        }
        jdbc.update("""
            INSERT INTO ad_creatives(campaign_id,version_no,creative_type,title,media_url,media_object_key,target_url,mime_type,file_size,width_px,height_px,checksum_sha256)
            SELECT ?,1,creative_type,title,media_url,media_object_key,target_url,mime_type,file_size,width_px,height_px,checksum_sha256
            FROM ad_creatives WHERE campaign_id=? AND status<>'ARCHIVED' ORDER BY version_no DESC LIMIT 1
            """,next,id);
        // URL luôn đi qua endpoint quyền sở hữu của creative mới, không dùng ID của công ty khác.
        jdbc.update("UPDATE ad_creatives SET media_url=CONCAT('/api/media/creative/',creative_id) WHERE campaign_id=?",next);
        activity(user,next,replacement?"REQUEST_CREATIVE_CHANGE":"COPY_CAMPAIGN","Tạo từ chiến dịch #"+id+"; chưa được phê duyệt.");
        return Map.of("id",next);
    }

    /** Bỏ liên kết asset draft chưa từng nộp; không xóa tệp có thể đang được lịch sử/bản sao tham chiếu. */
    @PreAuthorize("hasRole('BUSINESS')") @Transactional
    public void removeCreative(AuthenticatedUserPrincipal user,long id,long creative) {
        var c=owned(user,id,true); business.requireEditable(c);
        var cr=one("SELECT * FROM ad_creatives WHERE creative_id=? AND campaign_id=? FOR UPDATE",creative,id);
        if(!"DRAFT".equals(cr.get("status"))) fail("Không thể bỏ creative đã nộp.");
        jdbc.update("UPDATE ad_creatives SET status='ARCHIVED' WHERE creative_id=?",creative);
        jdbc.update("UPDATE ad_campaigns SET edit_version=edit_version+1 WHERE campaign_id=?",id);
        activity(user,id,"REMOVE_CREATIVE","Bỏ banner nháp #"+creative);
    }

    /** Manager đọc đúng snapshot nộp, không lấy dữ liệu nháp có thể đã sửa. */
    @PreAuthorize("hasRole('AD_MANAGER')") @Transactional(readOnly=true)
    public List<Map<String,Object>> queue() {
        var rows=jdbc.queryForList("SELECT s.*,c.campaign_code,cp.company_name FROM campaign_submissions s JOIN ad_campaigns c ON c.campaign_id=s.campaign_id JOIN contracts ct ON ct.contract_id=c.contract_id JOIN companies cp ON cp.company_id=ct.company_id WHERE s.status='PENDING_REVIEW' ORDER BY s.submitted_at");
        rows.forEach(x->x.put("snapshot",parse(x.get("snapshot")))); return rows;
    }

    /** Review dùng submissionId và khóa trạng thái; thay thế chỉ dừng bản gốc khi phiên bản mới được duyệt. */
    @PreAuthorize("hasRole('AD_MANAGER')") @Transactional
    public void decide(AuthenticatedUserPrincipal reviewer,long id,BusinessRequests.CampaignDecision r) {
        var owner=one("SELECT ct.company_id FROM ad_campaigns c JOIN contracts ct ON ct.contract_id=c.contract_id WHERE c.campaign_id=?",id);
        one("SELECT company_id FROM companies WHERE company_id=? FOR UPDATE",owner.get("company_id"));
        var c=one("SELECT * FROM ad_campaigns WHERE campaign_id=? FOR UPDATE",id);
        var s=one("SELECT * FROM campaign_submissions WHERE submission_id=? AND campaign_id=? FOR UPDATE",r.submissionId(),id);
        if(!"PENDING_REVIEW".equals(s.get("status")) || !"PENDING_REVIEW".equals(c.get("status"))) throw new ConflictException("Phiên bản đã được xử lý. Hãy tải lại.");
        if("APPROVED".equals(r.decision())) {
            var ct=one("SELECT * FROM contracts WHERE contract_id=? FOR UPDATE",c.get("contract_id")); requireContract(ct);
            var check=checks(c); // Creative hiện đang PENDING_REVIEW, các kiểm tra nội dung khác vẫn phải hợp lệ.
            if(check.stream().filter(x->!"creativeState".equals(x.get("code"))).anyMatch(x->!Boolean.TRUE.equals(x.get("valid")))) fail("Điều kiện chiến dịch đã thay đổi; không thể duyệt.");
        }
        String next="APPROVED".equals(r.decision())?(date(c.get("scheduled_start_time")).isAfter(LocalDateTime.now())?"SCHEDULED":"ACTIVE"):r.decision();
        jdbc.update("UPDATE campaign_submissions SET status=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP(6),review_note=? WHERE submission_id=?",r.decision(),reviewer.id(),r.reason().trim(),r.submissionId());
        jdbc.update("UPDATE ad_creatives SET status=?,approved_at=IF(?='APPROVED',CURRENT_TIMESTAMP(6),NULL) WHERE creative_id=?",r.decision(),r.decision(),s.get("creative_id"));
        jdbc.update("UPDATE ad_campaigns SET status=?,approved_at=IF(?='APPROVED',CURRENT_TIMESTAMP(6),approved_at),edit_version=edit_version+1 WHERE campaign_id=?",next,r.decision(),id);
        if("ACTIVE".equals(next)) replaceOriginal(c);
        jdbc.update("INSERT INTO ad_reviews(campaign_id,creative_id,reviewer_id,review_type,decision,reason) VALUES(?,?,?,'CREATIVE',?,?)",id,s.get("creative_id"),reviewer.id(),r.decision(),r.reason().trim());
        activity(reviewer,id,r.decision(),r.reason().trim()); notifyReview(id,"Kết quả xét duyệt: "+r.decision(),r.reason().trim());
    }

    /** Checklist trả kết quả cho từng mục, cho phép UI dẫn người dùng tới đúng bước cần sửa. */
    private List<Map<String,Object>> checks(Map<String,Object> c) {
        long id=number(c.get("campaign_id")); var ct=one("SELECT ct.*,s.width_px,s.height_px,s.status slot_status FROM contracts ct JOIN ad_slots s ON s.slot_id=ct.slot_id WHERE ct.contract_id=?",c.get("contract_id"));
        var rows=new ArrayList<Map<String,Object>>();
        var cp=one("SELECT application_status FROM companies WHERE company_id=?",ct.get("company_id"));
        check(rows,"partnership","Hồ sơ doanh nghiệp","APPROVED".equals(cp.get("application_status")),"Hồ sơ hợp tác phải được duyệt.","company");
        check(rows,"contract","Hợp đồng","ACTIVE".equals(ct.get("status"))&&"PAID".equals(ct.get("payment_status")),"Hợp đồng phải đang hiệu lực và đã thanh toán.","edit");
        check(rows,"slot","Vị trí","ACTIVE".equals(ct.get("slot_status")),"Vị trí quảng cáo không còn hoạt động.","edit");
        boolean dates=true; try{BusinessWorkspaceService.validateCampaignDates(date(c.get("scheduled_start_time")),date(c.get("scheduled_end_time")),date(ct.get("start_at")),date(ct.get("end_at")));}catch(RuntimeException e){dates=false;}
        check(rows,"schedule","Lịch chạy",dates,"Lịch phải nằm trong hợp đồng và còn hạn.","edit");
        boolean url=true; try{validateUrl((String)c.get("target_url"));}catch(RuntimeException e){url=false;}
        check(rows,"url","URL đích",url,"Cần URL HTTP/HTTPS hợp lệ.","edit");
        var cr=latest(id); boolean asset=!cr.isEmpty()&&files.available((String)cr.get("media_object_key"));
        check(rows,"creative","Tệp quảng cáo",asset,"Cần tệp quảng cáo đã tải lên và còn khả dụng.","creative");
        check(rows,"dimensions","Kích thước",!cr.isEmpty()&&number(cr.get("width_px"))==number(ct.get("width_px"))&&number(cr.get("height_px"))==number(ct.get("height_px")),"Kích thước creative phải khớp vị trí hợp đồng.","creative");
        check(rows,"creativeState","Phiên bản creative",!cr.isEmpty()&&"DRAFT".equals(cr.get("status")),"Cần phiên bản creative nháp mới.","creative");
        check(rows,"creativeUrl","URL creative",!cr.isEmpty()&&Objects.equals(c.get("target_url"),cr.get("target_url")),"URL của campaign và creative phải khớp; hãy lưu lại creative.","creative");
        var target=targeting(id);boolean valid=!target.isEmpty();
        if(valid)try{validIds("categories","category_id",ids(target.get("categoryIds")));validIds("tags","tag_id",ids(target.get("tagIds")));normalizeGeo((String)target.get("geo_scope"));}catch(RuntimeException ex){valid=false;}
        check(rows,"targeting","Đối tượng",valid,"Hãy lưu đối tượng với chuyên mục/thẻ đang hoạt động và mã quốc gia hợp lệ.","creative");
        return rows;
    }

    /** Job gọi mỗi phút; khóa công ty/campaign, kiểm tra điều kiện hiện tại rồi đổi delivery state. */
    @Transactional
    public void advanceDelivery(long id) {
        var owner=one("SELECT ct.company_id FROM ad_campaigns c JOIN contracts ct ON ct.contract_id=c.contract_id WHERE c.campaign_id=?",id);
        var cp=one("SELECT application_status FROM companies WHERE company_id=? FOR UPDATE",owner.get("company_id"));
        var c=one("SELECT * FROM ad_campaigns WHERE campaign_id=? FOR UPDATE",id);
        String state=(String)c.get("status");if(!List.of("SCHEDULED","ACTIVE","PAUSED","APPROVED").contains(state))return;
        var now=LocalDateTime.now();String next=null;
        if(!date(c.get("scheduled_end_time")).isAfter(now))next="COMPLETED";
        else if(List.of("SCHEDULED","APPROVED").contains(state)&&!date(c.get("scheduled_start_time")).isAfter(now)) {
            var ct=one("SELECT ct.*,s.status slot_status FROM contracts ct JOIN ad_slots s ON s.slot_id=ct.slot_id WHERE ct.contract_id=?",c.get("contract_id"));
            if("APPROVED".equals(cp.get("application_status"))&&"ACTIVE".equals(ct.get("status"))&&"PAID".equals(ct.get("payment_status"))&&"ACTIVE".equals(ct.get("slot_status"))&&!date(ct.get("start_at")).isAfter(now)&&date(ct.get("end_at")).isAfter(now)&&!jdbc.queryForList("SELECT creative_id FROM ad_creatives WHERE campaign_id=? AND status='APPROVED'",id).isEmpty())next="ACTIVE";
        }
        if(next!=null){jdbc.update("UPDATE ad_campaigns SET status=?,activated_at=IF(?='ACTIVE',CURRENT_TIMESTAMP(6),activated_at),ended_at=IF(?='COMPLETED',CURRENT_TIMESTAMP(6),ended_at),edit_version=edit_version+1 WHERE campaign_id=?",next,next,next,id);
            if("ACTIVE".equals(next))replaceOriginal(c);
            jdbc.update("INSERT INTO campaign_activity(campaign_id,action,note) VALUES(?,'DELIVERY_SCHEDULE',?)",id,"Tự động chuyển sang "+next+" theo lịch và điều kiện phân phối.");
        }
    }

    /** Bản gốc chỉ ngừng khi bản mới thực sự ACTIVE, không ngừng từ lúc duyệt lịch tương lai. */
    private void replaceOriginal(Map<String,Object> replacement){if(replacement.get("replaces_campaign_id")!=null){jdbc.update("UPDATE ad_campaigns SET status='CANCELLED',ended_at=CURRENT_TIMESTAMP(6),edit_version=edit_version+1 WHERE campaign_id=? AND status IN ('ACTIVE','PAUSED','SCHEDULED','APPROVED')",replacement.get("replaces_campaign_id"));jdbc.update("INSERT INTO campaign_activity(campaign_id,action,note) VALUES(?,'REPLACED',?)",replacement.get("replaces_campaign_id"),"Đã thay bằng campaign #"+replacement.get("campaign_id"));}}

    /** Giữ cùng asset nhưng cấp version/ID mới khi URL thay đổi; snapshot cũ vẫn đọc đúng URL cũ. */
    private void cloneCreativeForUrl(long campaign,String url){
        if(url==null||url.isBlank())return;
        jdbc.update("""
            INSERT INTO ad_creatives(campaign_id,version_no,creative_type,title,media_url,media_object_key,target_url,mime_type,file_size,width_px,height_px,checksum_sha256)
            SELECT old.campaign_id,(SELECT COALESCE(MAX(v.version_no),0)+1 FROM ad_creatives v WHERE v.campaign_id=?),old.creative_type,old.title,'pending',old.media_object_key,?,old.mime_type,old.file_size,old.width_px,old.height_px,old.checksum_sha256
            FROM ad_creatives old WHERE old.campaign_id=? AND old.status<>'ARCHIVED' ORDER BY old.version_no DESC LIMIT 1
            """,campaign,url,campaign);
        jdbc.update("UPDATE ad_creatives SET media_url=CONCAT('/api/media/creative/',creative_id) WHERE campaign_id=? AND media_url='pending'",campaign);
    }

    /** Mã ISO 3166 hai chữ, ALL hoặc trống; chuẩn hóa trước khi snapshot và so khớp phân phối. */
    static String normalizeGeo(String value){if(value==null||value.isBlank()||"ALL".equalsIgnoreCase(value.trim()))return "ALL";var countries=Set.of(Locale.getISOCountries());var codes=Arrays.stream(value.toUpperCase(Locale.ROOT).split(",")).map(String::trim).distinct().sorted().toList();if(codes.isEmpty()||codes.stream().anyMatch(x->!countries.contains(x)))fail("Phạm vi phải là ALL hoặc mã quốc gia ISO như VN,US.");return String.join(",",codes);}
    /** Danh sách được tạo bằng JDBC Long.class trong targeting(), không lấy trực tiếp kiểu tùy ý của client. */
    @SuppressWarnings("unchecked") private List<Long> ids(Object value){return (List<Long>)value;}

    /** Dự báo dựa 7 ngày lịch hoàn chỉnh có raw impression, chỉ trả số khi đủ mẫu, không dùng fixture. */
    private Map<String,Object> forecast(Map<String,Object> c) {
        var stats=jdbc.queryForMap("""
            SELECT COUNT(DISTINCT DATE(e.occurred_at)) sampleDays,COUNT(*) impressions,MAX(e.occurred_at) cutoff
            FROM ad_events e JOIN contracts ct ON ct.slot_id=e.slot_id
            WHERE ct.contract_id=? AND e.event_type='IMPRESSION' AND e.is_valid=TRUE
                AND e.occurred_at>=CURRENT_DATE-INTERVAL 7 DAY AND e.occurred_at<CURRENT_DATE
            """,c.get("contract_id"));
        var result=new HashMap<>(stats); boolean enough=number(stats.get("sampleDays"))>=7 && number(stats.get("impressions"))>=100;
        result.put("available",enough); result.put("method","Trung bình 7 ngày hoàn chỉnh theo slot × số ngày chiến dịch; chưa điều chỉnh targeting, không cam kết phân phối.");
        if(enough) result.put("estimatedImpressions",Math.round(number(stats.get("impressions"))/7.0*Math.max(1,Duration.between(date(c.get("scheduled_start_time")),date(c.get("scheduled_end_time"))).toHours()/24.0)));
        return result;
    }

    /** Chuẩn hóa cấu hình để snapshot/API dùng cùng cấu trúc. */
    private Map<String,Object> targeting(long id) {
        var rows=jdbc.queryForList("SELECT * FROM ad_targeting WHERE campaign_id=?",id); if(rows.isEmpty())return Map.of();
        var t=rows.getFirst(); Object key=t.get("target_id");
        t.put("categoryIds",jdbc.queryForList("SELECT category_id FROM ad_targeting_categories WHERE target_id=?",Long.class,key));
        t.put("tagIds",jdbc.queryForList("SELECT tag_id FROM ad_targeting_tags WHERE target_id=?",Long.class,key)); return t;
    }

    /** Đọc lịch sử mới trước, giải mã JSON thành cấu trúc API; không cập nhật snapshot khi đọc. */
    private List<Map<String,Object>> submissions(long id) {
        var rows=jdbc.queryForList("SELECT * FROM campaign_submissions WHERE campaign_id=? ORDER BY version_no DESC",id);
        rows.forEach(x->x.put("snapshot",parse(x.get("snapshot")))); return rows;
    }
    /** Lấy creative chưa bỏ liên kết có version cao nhất; bản ARCHIVED không được dùng để gửi. */
    private Map<String,Object> latest(long id) {var r=jdbc.queryForList("SELECT * FROM ad_creatives WHERE campaign_id=? AND status<>'ARCHIVED' ORDER BY version_no DESC LIMIT 1",id);return r.isEmpty()?Map.of():r.getFirst();}
    /** Tên bảng/cột chỉ lấy từ hằng trong code; ID client luôn truyền qua tham số SQL. */
    private List<Long> validIds(String table,String key,List<Long> ids) {
        var unique=ids==null?List.<Long>of():ids.stream().distinct().toList(); if(unique.size()>50)fail("Chọn tối đa 50 mục.");
        for(Long id:unique) if(id==null || jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE "+key+"=? AND status='ACTIVE'",Integer.class,id)==0)fail("Danh mục đã thay đổi; hãy tải lại.");return unique;
    }
    /** Chỉ nhận HTTP/HTTPS có hostname, không có username/password nhúng và dài tối đa 1000 ký tự. */
    static void validateUrl(String value) {try{var u=URI.create(value==null?"":value);if(!List.of("http","https").contains(Objects.toString(u.getScheme(),"").toLowerCase(Locale.ROOT))||u.getHost()==null||u.getUserInfo()!=null||value.length()>1000)throw new IllegalArgumentException();}catch(RuntimeException e){throw new InvalidStateTransitionException("URL đích phải là HTTP/HTTPS hợp lệ.");}}
    /** So optimistic version trước ghi; client phải tải bản mới sau lỗi 409, không tự đè dữ liệu. */
    static void requireVersion(Map<String,Object> c,Integer v) {if(v==null||number(c.get("edit_version"))!=v)throw new ConflictException("Bản nháp đã thay đổi ở tab khác. Hãy tải lại trước khi lưu.");}
    /** Hợp đồng của đúng company phải vừa ACTIVE vừa PAID; lịch được kiểm tra riêng. */
    private void requireContract(Map<String,Object> ct){if(!"ACTIVE".equals(ct.get("status"))||!"PAID".equals(ct.get("payment_status")))fail("Hợp đồng phải ACTIVE và PAID.");}
    /** Ghi sự kiện hiển thị timeline và audit nghiệp vụ trong cùng transaction với mutation. */
    private void activity(AuthenticatedUserPrincipal user,long id,String action,String note){jdbc.update("INSERT INTO campaign_activity(campaign_id,actor_id,action,note) VALUES(?,?,?,?)",id,user.id(),action,note);jdbc.update("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id) VALUES(?,?,'CAMPAIGN',?)",user.id(),action,String.valueOf(id));}
    /** Thông báo trong ứng dụng cho chủ company và manager; không gửi email. */
    private void notifyReview(long id,String title,String body){jdbc.update("INSERT INTO notifications(user_id,title,content,notification_type,related_entity_type,related_entity_id,delivery_status,sent_at) SELECT DISTINCT u.user_id,?,?,'WORKFLOW','CAMPAIGN',?,'SENT',CURRENT_TIMESTAMP(6) FROM users u WHERE u.status='ACTIVE' AND (u.company_id=(SELECT ct.company_id FROM ad_campaigns c JOIN contracts ct ON ct.contract_id=c.contract_id WHERE c.campaign_id=?) OR EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id WHERE ur.user_id=u.user_id AND r.role_name='AD_MANAGER' AND r.status='ACTIVE'))",title,body,String.valueOf(id),id);}
    /** Chuẩn hóa một mục checklist kèm mã và màn đích để UI đưa người dùng tới đúng chỗ sửa. */
    private void check(List<Map<String,Object>> rows,String code,String label,boolean valid,String message,String step){rows.add(Map.of("code",code,"label",label,"valid",valid,"message",valid?"Đạt":message,"step",step));}
    /** Truy vấn đúng một record đã scope quyền; thiếu record trả lỗi trung tính không lộ company khác. */
    private Map<String,Object> one(String sql,Object... args){var r=jdbc.queryForList(sql,args);if(r.isEmpty())fail("Không tìm thấy bản ghi hoặc bạn không có quyền truy cập.");return r.getFirst();}
    /** PreparedStatement bind mọi giá trị, lấy khóa tự tăng để điều hướng hoặc tạo quan hệ FK. */
    private long insert(String sql,Object... args){var key=new GeneratedKeyHolder();jdbc.update(c->{var s=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS);for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]);return s;},key);return Objects.requireNonNull(key.getKey()).longValue();}
    /** Chụp dữ liệu thành JSON trước submit; lỗi serialization làm rollback thay vì nộp thiếu nội dung. */
    private String json(Object value){try{return mapper.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Không thể lưu snapshot.",e);}}
    /** MySQL driver có thể trả JSON dưới dạng String hoặc bytes, cả hai được đọc thống nhất. */
    private Object parse(Object value){try{return mapper.readValue(value instanceof byte[] bytes?new String(bytes,java.nio.charset.StandardCharsets.UTF_8):String.valueOf(value),new TypeReference<Map<String,Object>>(){});}catch(Exception e){throw new IllegalStateException("Snapshot không hợp lệ.",e);}}
    /** Chuyển kiểu Number từ JDBC sang long, dùng 0 cho dữ liệu không có số. */
    private static long number(Object v){return v instanceof Number n?n.longValue():0;}
    /** Adapter timestamp MySQL -> LocalDateTime dùng cùng validator lịch của business. */
    private static LocalDateTime date(Object v){return BusinessWorkspaceService.dateTime(v);}
    /** Chuẩn hóa khoảng trắng hai đầu, giữ null cho trường draft tùy chọn. */
    private static String trim(String v){return v==null?null:v.trim();}
    /** Lỗi nghiệp vụ trả 422 qua GlobalExceptionHandler, không tiếp tục mutation. */
    private static void fail(String m){throw new InvalidStateTransitionException(m);}
}
