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

    private final JdbcTemplate jdbc;// dùng để viết với SQL trực tiếp

    public BusinessWorkspaceService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Resolve membership from DB on every request: sessions created before company
    // creation
    // must not retain a stale companyId. Never accept a companyId from the browser.
    public Long companyId(AuthenticatedUserPrincipal user) {
        // UC-38: lấy công ty gắn với user từ DB, không nhận company_id do trình duyệt
        // tự gửi.
        return jdbc.queryForObject("SELECT company_id FROM users WHERE user_id=? AND status='ACTIVE'", Long.class,
                user.id());
    }

    public Map<String, Object> overview(AuthenticatedUserPrincipal user) {
        // BUS-01: tổng hợp dữ liệu theo công ty của user để hiển thị chỉ số và chiến
        // dịch gần đây.
        // Nạp workspace theo công ty của user; BUS-02 dùng phần company để điền form
        // hiện tại.
        Long id = companyId(user);
        if (id == null) {
            return Map.of("company", Map.of(), "documents", List.of(), "contracts", List.of(), "campaigns", List.of());
        }
        Map<String, Object> company = jdbc.queryForMap("SELECT * FROM companies WHERE company_id=?", id);
        List<Map<String, Object>> documents = jdbc.queryForList(
                "SELECT document_id,original_file_name,document_type,version_no,uploaded_at FROM company_documents WHERE company_id=? AND status='ACTIVE' ORDER BY uploaded_at DESC",
                id);
        List<Map<String, Object>> contracts = jdbc
                .queryForList("SELECT * FROM contracts WHERE company_id=? ORDER BY created_at DESC", id);
        List<Map<String, Object>> campaigns = jdbc.queryForList(
                """
                        SELECT c.*,ct.contract_code,ct.slot_id,s.width_px,s.height_px,
                            (SELECT cr.media_url FROM ad_creatives cr WHERE cr.campaign_id=c.campaign_id ORDER BY version_no DESC LIMIT 1) AS media_url,
                            (SELECT cr.target_url FROM ad_creatives cr WHERE cr.campaign_id=c.campaign_id ORDER BY version_no DESC LIMIT 1) AS target_url,
                            (SELECT cr.status FROM ad_creatives cr WHERE cr.campaign_id=c.campaign_id ORDER BY version_no DESC LIMIT 1) AS creative_status
                        FROM ad_campaigns c JOIN contracts ct ON ct.contract_id=c.contract_id
                        JOIN ad_slots s ON s.slot_id=ct.slot_id WHERE ct.company_id=? ORDER BY c.created_at DESC
                        """,
                id);
        Map<String, Object> result = new HashMap<>();
        result.put("company", company);
        result.put("documents", documents);
        // BUS-13: không trả danh sách chiến dịch khi hồ sơ hợp tác chưa được phê duyệt.
        result.put("contracts", contracts);
        result.put("campaigns", "APPROVED".equals(company.get("application_status")) ? campaigns : List.of());
        return result;
    }

    @Transactional
    public Map<String, Object> saveCompany(AuthenticatedUserPrincipal user, BusinessRequests.Company request) {
        // UC-38/BUS-02: khóa liên kết user, kiểm tra dữ liệu và tạo/cập nhật công ty
        // trong transaction.
        Long id = jdbc.queryForObject("SELECT company_id FROM users WHERE user_id=? FOR UPDATE", Long.class, user.id());
        // Legacy demo sentinel is allowed only unchanged for its existing company.
        if (!request.taxCode().matches("[0-9]{10}(-[0-9]{3})?")) {
            String previous = id == null ? null
                    : jdbc.queryForObject("SELECT tax_code FROM companies WHERE company_id=?", String.class, id);
            if (!request.taxCode().equals(previous)) {
                throw new InvalidStateTransitionException("Mã số thuế phải có 10 số hoặc 10 số-3 số.");
            }
        }
        Long duplicate = jdbc.queryForObject(
                "SELECT COUNT(*) FROM companies WHERE tax_code=? AND (? IS NULL OR company_id<>?)", Long.class,
                request.taxCode(), id, id);
        if (duplicate != null && duplicate > 0) {
            throw new ConflictException("Mã số thuế đã thuộc một doanh nghiệp khác. Không thể tự nhận quyền truy cập.");
        }
        if (id == null) {
            // Tài khoản Business chưa có công ty: tạo hồ sơ và gắn company_id vào đúng user
            // đăng nhập.
            id = insert(
                    "INSERT INTO companies(company_name,tax_code,email,phone,address,billing_address,application_code) VALUES(?,?,?,?,?,?,?)",
                    request.name().trim(), request.taxCode(), request.email().trim(), request.phone().trim(),
                    request.address().trim(), request.billingAddress(), code("APP"));
            jdbc.update("UPDATE users SET company_id=? WHERE user_id=?", id, user.id());
        } else {
            // Công ty đã tồn tại: kiểm tra trạng thái duyệt trước khi cho sửa thông tin.
            Map<String, Object> company = jdbc.queryForMap("SELECT * FROM companies WHERE company_id=? FOR UPDATE", id);
            String state = (String) company.get("application_status");
            // BUS-02 chỉ sửa bản nháp hoặc hồ sơ được yêu cầu bổ sung; không tự mở lại hồ sơ đã duyệt.
            if (!List.of("DRAFT", "NEEDS_REVISION").contains(state)) {
                throw new InvalidStateTransitionException("Hồ sơ đã gửi hoặc đã xét duyệt bị khóa. Chỉ được sửa bản nháp hoặc khi quản lý yêu cầu bổ sung.");
            }
            jdbc.update(
                    "UPDATE companies SET company_name=?,tax_code=?,email=?,phone=?,address=?,billing_address=? WHERE company_id=?",
                    request.name().trim(), request.taxCode(), request.email().trim(), request.phone().trim(),
                    request.address().trim(), request.billingAddress(), id);
        }
        jdbc.update("UPDATE companies SET industry=?,contact_person=? WHERE company_id=?", request.industry().trim(),
                request.contactPerson().trim(), id);
        audit(user, "SAVE_COMPANY", "COMPANY", id);
        // Trả workspace mới sau khi lưu; frontend còn gọi refresh để đồng bộ dữ liệu
        // đang hiển thị.
        return overview(user);
    }

    /**
     * Chốt hồ sơ và các ID tài liệu vào một application version; bản đã nộp không
     * bị sửa theo profile mới.
     */
    @Transactional
    public Map<String, Object> submitApplication(AuthenticatedUserPrincipal user) {
        Long id = requireCompany(user);
        Map<String, Object> c = jdbc.queryForMap("SELECT * FROM companies WHERE company_id=? FOR UPDATE", id);
        String state = (String) c.get("application_status");
        if (!List.of("DRAFT", "NEEDS_REVISION").contains(state)) {
            throw new InvalidStateTransitionException("Chỉ hồ sơ nháp hoặc cần chỉnh sửa mới được gửi duyệt.");
        }
        // Gửi duyệt không được bỏ qua các field bắt buộc bằng cách gọi API trực tiếp.
        for (String field : List.of("company_name", "tax_code", "email", "phone", "address", "billing_address",
                "industry", "contact_person")) {
            if (c.get(field) == null || String.valueOf(c.get(field)).isBlank())
                throw new InvalidStateTransitionException(
                        "Hãy hoàn thiện thông tin doanh nghiệp, ngành nghề và người liên hệ trước khi gửi.");
        }
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM company_documents WHERE company_id=? AND status='ACTIVE'", Integer.class, id);
        if (count == null || count == 0) {
            throw new InvalidStateTransitionException("Cần tải ít nhất một tài liệu doanh nghiệp trước khi gửi.");
        }
        if (count > 5) {
            throw new InvalidStateTransitionException("Hồ sơ chỉ được gửi tối đa 5 tài liệu. Vui lòng gỡ tài liệu không dùng.");
        }
        int nextVersion = ((Number) c.get("application_version")).intValue() + 1;
        String nextStatus = "NEEDS_REVISION".equals(state) ? "RESUBMITTED" : "PENDING_REVIEW";
        String priority = "NEEDS_REVISION".equals(state) ? "HIGH" : "NORMAL";
        jdbc.update("""
                UPDATE companies SET application_status=?,application_version=?,review_priority=?,
                    submitted_at=CURRENT_TIMESTAMP(6),review_note=NULL,reviewed_by=NULL,reviewed_at=NULL
                WHERE company_id=?
                """, nextStatus, nextVersion, priority, id);
        jdbc.update("""
                INSERT INTO company_application_versions(company_id,application_version,company_name,
                    tax_code,email,phone,address,billing_address,submitted_at)
                SELECT company_id,application_version,company_name,tax_code,email,phone,address,
                    billing_address,submitted_at FROM companies WHERE company_id=?
                """, id);
        jdbc.update("""
                INSERT INTO company_application_version_documents(company_id,application_version,document_id)
                SELECT company_id,?,document_id FROM company_documents
                WHERE company_id=? AND status='ACTIVE'
                """, nextVersion, id);
        jdbc.update(
                "UPDATE company_application_versions v JOIN companies c ON c.company_id=v.company_id SET v.industry=c.industry,v.contact_person=c.contact_person WHERE v.company_id=? AND v.application_version=?",
                id, nextVersion);
        audit(user, "SUBMIT_APPLICATION", "COMPANY", id);
        return overview(user);
    }

    /**
     * Hồ sơ bị từ chối mở vòng đăng ký mới; giữ snapshot/review cũ, yêu cầu tải lại
     * giấy tờ.
     */
    @Transactional
    public Map<String, Object> newApplication(AuthenticatedUserPrincipal user) {
        Long id = requireCompany(user);
        var company = jdbc.queryForMap("SELECT * FROM companies WHERE company_id=? FOR UPDATE", id);
        if (!"REJECTED".equals(company.get("application_status")))
            throw new InvalidStateTransitionException("Chỉ hồ sơ bị từ chối mới tạo vòng đăng ký mới.");
        jdbc.update(
                "UPDATE companies SET application_status='DRAFT',application_code=?,review_note=NULL,reviewed_at=NULL,reviewed_by=NULL,submitted_at=NULL,review_priority='NORMAL' WHERE company_id=?",
                code("APP"), id);
        jdbc.update("UPDATE company_documents SET status='REPLACED' WHERE company_id=? AND status='ACTIVE'", id);
        audit(user, "NEW_PARTNERSHIP_APPLICATION", "COMPANY", id);
        return overview(user);
    }

    @Transactional
    public Map<String, Object> createBooking(AuthenticatedUserPrincipal user, BusinessRequests.Booking request) {
        return saveBooking(user, null, request, true);
    }

    /**
     * Khóa slot/company, kiểm lịch [start,end), tính lại giá và lưu snapshot báo
     * giá; draft không giữ chỗ.
     */
    @Transactional
    public Map<String, Object> saveBooking(AuthenticatedUserPrincipal user, Long bookingId,
            BusinessRequests.Booking request, boolean submit) {
        Long id = requireCompany(user);
        Map<String, Object> company = jdbc.queryForMap("SELECT * FROM companies WHERE company_id=? FOR UPDATE", id);
        requireApprovedStatus((String) company.get("application_status"));
        long days = ChronoUnit.DAYS.between(request.startDate(), request.endDate()) + 1;
        if (request.startDate().isBefore(LocalDate.now()) || days <= 0
                || request.startDate().isAfter(LocalDate.now().plusYears(1))) {
            throw new InvalidStateTransitionException(
                    "Ngày bắt đầu phải từ hôm nay, trong một năm tới; ngày kết thúc không được trước ngày bắt đầu.");
        }
        Map<String, Object> slot = one("SELECT * FROM ad_slots WHERE slot_id=? AND status='ACTIVE' FOR UPDATE",
                request.slotId());
        Map<String, Object> pack = one("SELECT * FROM b2b_packages WHERE b2b_package_id=? AND status='ACTIVE'",
                request.packageId());
        if (days > ((Number) pack.get("duration_days")).longValue()) {
            throw new InvalidStateTransitionException("Khoảng chạy vượt thời hạn của gói quảng cáo.");
        }
        LocalDateTime start = request.startDate().atStartOfDay(), end = request.endDate().plusDays(1).atStartOfDay();
        requireAvailable(request.slotId(), start, end);
        BigDecimal price = ((BigDecimal) pack.get("price")).add(((BigDecimal) slot.get("base_price"))
                .multiply(BigDecimal.valueOf(days)).divide(BigDecimal.valueOf(30), 2, RoundingMode.HALF_UP));
        // Báo giá UI không có quyền quyết định giá; nếu giá catalog đổi thì yêu cầu xác
        // nhận lại.
        if (request.quotedAmount() != null
                && price.subtract(request.quotedAmount()).abs().compareTo(new BigDecimal("0.01")) > 0)
            throw new ConflictException("Giá đã thay đổi. Hãy tải lại báo giá và xác nhận số tiền mới trước khi lưu.");
        Map<String, Object> existingBooking = null;
        if (bookingId != null) {
            existingBooking = requireEditableBooking(user, bookingId);

            int currentRevision = ((Number) existingBooking.get("revision_no")).intValue();

            if (request.expectedRevisionNo() == null
                    || request.expectedRevisionNo() != currentRevision) {
                throw new ConflictException(
                        "Booking đã thay đổi. Hãy tải lại trước khi lưu.");
            }

            if ("REVISION_REQUESTED".equals(existingBooking.get("status"))) {
                LocalDateTime previousStart = dateTime(existingBooking.get("start_at"));
                LocalDateTime previousEnd = dateTime(existingBooking.get("end_at"));

                if (start.equals(previousStart) && end.equals(previousEnd)) {
                    throw new InvalidStateTransitionException(
                            "Hãy chọn khoảng thời gian mới trước khi lưu booking.");
                }
            }
        }
        Long contract = bookingId;
        if (contract == null) {
            contract = insert(
                    """
                            INSERT INTO contracts(contract_code,contract_name,company_id,b2b_package_id,slot_id,
                                package_code_snapshot,package_name_snapshot,package_price_snapshot,duration_days_snapshot,
                                impressions_quota_snapshot,slot_name_snapshot,slot_position_snapshot,total_value,start_at,end_at)
                            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                            """,
                    code("BOOK"), request.name().trim(), id, request.packageId(), request.slotId(), pack.get("code"),
                    pack.get("name"), pack.get("price"),
                    pack.get("duration_days"), pack.get("impressions_quota"), slot.get("slot_name"),
                    slot.get("position_code"), price, start, end);
        } else {
            int changed = jdbc.update("""
                    UPDATE contracts
                    SET contract_name=?,
                        b2b_package_id=?,
                        slot_id=?,
                        package_code_snapshot=?,
                        package_name_snapshot=?,
                        package_price_snapshot=?,
                        duration_days_snapshot=?,
                        impressions_quota_snapshot=?,
                        slot_name_snapshot=?,
                        slot_position_snapshot=?,
                        total_value=?,
                        start_at=?,
                        end_at=?,
                        revision_no=revision_no+1
                    WHERE contract_id=? AND revision_no=?
                    """,
                    request.name().trim(),
                    request.packageId(),
                    request.slotId(),
                    pack.get("code"),
                    pack.get("name"),
                    pack.get("price"),
                    pack.get("duration_days"),
                    pack.get("impressions_quota"),
                    slot.get("slot_name"),
                    slot.get("position_code"),
                    price,
                    start,
                    end,
                    contract,
                    request.expectedRevisionNo());

            if (changed != 1) {
                throw new ConflictException(
                        "Booking đã thay đổi. Hãy tải lại trước khi lưu.");
            }
        }
        audit(user, "SAVE_BOOKING_DRAFT", "CONTRACT", contract);
        jdbc.update(
                "UPDATE contracts SET quote_snapshot=JSON_OBJECT('packagePrice',?,'slotMonthlyPrice',?,'days',?,'total',?,'currency',?,'quotedAt',CURRENT_TIMESTAMP(6)) WHERE contract_id=?",
                pack.get("price"), slot.get("base_price"), days, price, slot.get("currency"), contract);
        if (submit) {
            submitBooking(user, contract);
        }
        String resultStatus = submit
                ? "PENDING_REVIEW"
                : existingBooking == null
                        ? "DRAFT"
                        : (String) existingBooking.get("status");

        int savedRevision = existingBooking == null
                ? 1
                : ((Number) existingBooking.get("revision_no")).intValue() + 1;

        return Map.of(
                "id", contract,
                "amount", price,
                "status", resultStatus,
                "revisionNo", savedRevision);
    }

    @Transactional
    public Map<String, Object> submitBooking(
            AuthenticatedUserPrincipal user,
            Long id) {
        return submitBooking(user, id, null);
    }

    @Transactional
    public Map<String, Object> submitBooking(
            AuthenticatedUserPrincipal user,
            Long id,
            Integer expectedRevisionNo) {
        Long company = requireCompany(user);
        Map<String, Object> profile = one("SELECT * FROM companies WHERE company_id=? FOR UPDATE", company);
        Map<String, Object> contract = one(
                "SELECT * FROM contracts WHERE contract_id=? AND company_id=? FOR UPDATE",
                id,
                company);

        String currentStatus = (String) contract.get("status");
        int currentRevision = ((Number) contract.get("revision_no")).intValue();

        if (!List.of("DRAFT", "REVISION_REQUESTED").contains(currentStatus)) {
            throw new InvalidStateTransitionException(
                    "Booking không còn ở trạng thái có thể gửi.");
        }

        if ("REVISION_REQUESTED".equals(currentStatus)
                && expectedRevisionNo == null) {
            throw new ConflictException(
                    "Hãy tải lại booking trước khi gửi lại.");
        }

        if (expectedRevisionNo != null
                && expectedRevisionNo != currentRevision) {
            throw new ConflictException(
                    "Booking đã thay đổi. Hãy tải lại trước khi gửi.");
        }

        requireApprovedStatus((String) profile.get("application_status"));

        LocalDateTime start = dateTime(contract.get("start_at"));
        LocalDateTime end = dateTime(contract.get("end_at"));

        if (start.toLocalDate().isBefore(LocalDate.now()) || !end.isAfter(start)) {
            throw new InvalidStateTransitionException(
                    "Lịch quảng cáo đã hết hạn hoặc không hợp lệ. Hãy chọn lịch mới.");
        }

        if ("REVISION_REQUESTED".equals(currentStatus)) {
            requireDifferentFromRequestedPeriod(id, start, end);
        }

        one("SELECT * FROM ad_slots WHERE slot_id=? AND status='ACTIVE' FOR UPDATE",
                contract.get("slot_id"));
        one("SELECT * FROM b2b_packages WHERE b2b_package_id=? AND status='ACTIVE'",
                contract.get("b2b_package_id"));

        requireAvailable(
                ((Number) contract.get("slot_id")).longValue(),
                start,
                end);

        int changed = jdbc.update("""
                UPDATE contracts
                SET status='PENDING_REVIEW'
                WHERE contract_id=?
                  AND revision_no=?
                  AND status IN ('DRAFT','REVISION_REQUESTED')
                """,
                id,
                currentRevision);

        if (changed != 1) {
            throw new ConflictException(
                    "Booking đã thay đổi hoặc đã được gửi. Hãy tải lại trạng thái.");
        }

        audit(user, "SUBMIT_BOOKING_REQUEST", "CONTRACT", id);

        return Map.of(
                "id", id,
                "status", "PENDING_REVIEW",
                "revisionNo", currentRevision);
    }

    private Map<String, Object> requireDraftBooking(AuthenticatedUserPrincipal user, Long id) {
        Map<String, Object> booking = one("SELECT * FROM contracts WHERE contract_id=? AND company_id=? FOR UPDATE", id,
                requireCompany(user));
        if (!"DRAFT".equals(booking.get("status"))) {
            throw new InvalidStateTransitionException("Chỉ bản nháp mới được sửa hoặc xóa.");
        }
        Integer campaigns = jdbc.queryForObject("SELECT COUNT(*) FROM ad_campaigns WHERE contract_id=?", Integer.class,
                id);
        if (campaigns != null && campaigns > 0) {
            throw new InvalidStateTransitionException("Hợp đồng có chiến dịch liên kết không thể sửa hoặc xóa.");
        }
        return booking;
    }

    private void requireDifferentFromRequestedPeriod(
            Long contractId,
            LocalDateTime currentStart,
            LocalDateTime currentEnd) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT
                    CAST(JSON_UNQUOTE(JSON_EXTRACT(old_value, '$.startAt')) AS DATETIME(6))
                        AS previous_start,
                    CAST(JSON_UNQUOTE(JSON_EXTRACT(old_value, '$.endAt')) AS DATETIME(6))
                        AS previous_end
                FROM audit_logs
                WHERE entity_type='CONTRACT'
                  AND entity_id=?
                  AND action='REQUEST_ANOTHER_PERIOD'
                ORDER BY audit_log_id DESC
                LIMIT 1
                """, String.valueOf(contractId));

        if (rows.isEmpty()) {
            throw new InvalidStateTransitionException(
                    "Không tìm thấy yêu cầu đổi thời gian. Hãy tải lại booking.");
        }

        LocalDateTime previousStart = dateTime(rows.getFirst().get("previous_start"));
        LocalDateTime previousEnd = dateTime(rows.getFirst().get("previous_end"));

        if (currentStart.equals(previousStart) && currentEnd.equals(previousEnd)) {
            throw new InvalidStateTransitionException(
                    "Booking cần có khoảng thời gian mới trước khi gửi lại.");
        }
    }

    private Map<String, Object> requireEditableBooking(
            AuthenticatedUserPrincipal user,
            Long id) {
        Map<String, Object> booking = one(
                "SELECT * FROM contracts WHERE contract_id=? AND company_id=? FOR UPDATE",
                id,
                requireCompany(user));

        if (!List.of("DRAFT", "REVISION_REQUESTED").contains(booking.get("status"))) {
            throw new InvalidStateTransitionException(
                    "Chỉ booking nháp hoặc được yêu cầu đổi thời gian mới có thể sửa.");
        }

        Integer campaigns = jdbc.queryForObject(
                "SELECT COUNT(*) FROM ad_campaigns WHERE contract_id=?",
                Integer.class,
                id);

        if (campaigns != null && campaigns > 0) {
            throw new InvalidStateTransitionException(
                    "Hợp đồng có chiến dịch liên kết không thể sửa.");
        }

        return booking;
    }

    @Transactional
    public Map<String, Object> deleteBooking(AuthenticatedUserPrincipal user, Long id) {
        requireDraftBooking(user, id);
        jdbc.update("DELETE FROM contracts WHERE contract_id=?", id);
        audit(user, "DELETE_BOOKING_DRAFT", "CONTRACT", id);
        return Map.of("id", id);
    }

    // Toàn bộ mutation campaign chuyển sang CampaignWorkflowService để dùng chung
    // checklist/snapshot/version.
    /**
     * Đọc company membership mới nhất từ users; không tin companyId đã cũ trong
     * session hoặc client.
     */
    public Long requireCompany(AuthenticatedUserPrincipal user) {
        Long id = companyId(user);
        if (id == null) {
            throw new InvalidStateTransitionException("Hãy lưu hồ sơ doanh nghiệp trước.");
        }
        return id;
    }

    /**
     * Ownership cho upload creative: company phải APPROVED và sở hữu contract của
     * campaign.
     */
    public Map<String, Object> ownedCampaign(AuthenticatedUserPrincipal user, Long id, boolean lock) {
        return one(
                "SELECT c.* FROM ad_campaigns c JOIN contracts ct ON ct.contract_id=c.contract_id WHERE c.campaign_id=? AND ct.company_id=?"
                        + (lock ? " FOR UPDATE" : ""),
                id, requireApprovedPartnership(user));
    }

    /**
     * UC-25: kiểm tra trạng thái hồ sơ mới nhất từ DB trước khi dùng chiến
     * dịch.
     */
    public Long requireApprovedPartnership(AuthenticatedUserPrincipal user) {
        Long company = requireCompany(user);
        String state = jdbc.queryForObject("SELECT application_status FROM companies WHERE company_id=? FOR UPDATE",
                String.class, company);
        requireApprovedStatus(state);
        return company;
    }

    /**
     * Chỉ APPROVED được đặt quảng cáo/tạo chiến dịch; các trạng thái còn lại có
     * hướng dẫn riêng.
     */
    static void requireApprovedStatus(String state) {
        if ("APPROVED".equals(state)) {
            return;
        }
        String message = switch (state == null ? "" : state) {
            case "PENDING_REVIEW", "RESUBMITTED" ->
                "Hồ sơ hợp tác đã gửi yêu cầu, vui lòng chờ được phê duyệt để đặt quảng cáo và sử dụng chiến dịch.";
            case "REJECTED" ->
                "Hồ sơ hợp tác bị từ chối. Vui lòng tạo Partnership Application mới và chờ phê duyệt.";
            case "NEEDS_REVISION" ->
                "Hồ sơ hợp tác cần chỉnh sửa. Vui lòng sửa, gửi lại và chờ phê duyệt.";
            default ->
                "Vui lòng gửi Partnership Application và chờ phê duyệt trước khi đặt quảng cáo hoặc sử dụng chiến dịch.";
        };
        throw new InvalidStateTransitionException(message);
    }

    public void requireEditable(Map<String, Object> campaign) {
        if (!List.of("DRAFT", "NEEDS_REVISION").contains(campaign.get("status"))) {
            throw new InvalidStateTransitionException(
                    "Chỉ chiến dịch nháp/cần chỉnh sửa mới được sửa. Bản gửi duyệt đã khóa.");
        }
    }

    public static void validateCampaignDates(LocalDateTime start, LocalDateTime end, LocalDateTime contractStart,
            LocalDateTime contractEnd) {
        if (!end.isAfter(start) || start.isBefore(contractStart) || end.isAfter(contractEnd)
                || !end.isAfter(LocalDateTime.now())) {
            throw new InvalidStateTransitionException(
                    "Lịch chiến dịch phải nằm trong thời hạn hợp đồng, kết thúc sau bắt đầu và chưa hết hạn.");
        }
    }

    static LocalDateTime dateTime(Object value) {
        if (value instanceof LocalDateTime date) {
            return date;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        throw new IllegalStateException("Unsupported database date type");
    }

    private void requireAvailable(Long slot, LocalDateTime start, LocalDateTime end) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM contracts WHERE slot_id=? AND start_at<? AND end_at>?
                    AND ((status='ACTIVE' AND payment_status='PAID') OR
                    (status IN ('ACCEPTED','PENDING_PAYMENT') AND reservation_expires_at>CURRENT_TIMESTAMP))
                """, Integer.class, slot, end, start);
        if (count != null && count > 0) {
            throw new ConflictException(
                    "Vị trí đã có hợp đồng/giữ chỗ trong khoảng ngày này. Hãy chọn thời gian khác.");
        }
    }

    private Map<String, Object> one(String sql, Object... args) {
        List<Map<String, Object>> rows = jdbc.queryForList(sql, args);
        if (rows.isEmpty()) {
            throw new InvalidStateTransitionException("Không tìm thấy bản ghi hoặc bạn không có quyền truy cập.");
        }
        return rows.getFirst();
    }

    private Long insert(String sql, Object... args) {
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < args.length; i++) {
                statement.setObject(i + 1, args[i]);
            }
            return statement;
        }, keys);
        return Objects.requireNonNull(keys.getKey()).longValue();
    }

    private String code(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 18);
    }

    private void audit(AuthenticatedUserPrincipal user, String action, String type, Long id) {
        if ("SUBMIT_APPLICATION".equals(action)) {
            // Lưu trạng thái lúc nộp theo version; mở vòng mới/reset company sau này không làm mất dấu gửi lại.
            jdbc.update("""
                INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,new_value)
                SELECT ?,?,?,?,JSON_OBJECT('application_version',application_version,
                    'submission_status',application_status,'application_code',application_code)
                FROM companies WHERE company_id=?
                """,user.id(),action,type,String.valueOf(id),id);
        } else {
            jdbc.update("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)", user.id(), action,
                    type, String.valueOf(id));
        }
        String title = switch (action) {
            case "SUBMIT_APPLICATION" ->
                "Hồ sơ hợp tác đã được gửi duyệt";
            case "SUBMIT_BOOKING_REQUEST" ->
                "Yêu cầu đặt quảng cáo đã được gửi";
            case "SUBMIT_CAMPAIGN" ->
                "Chiến dịch đã được gửi duyệt";
            default ->
                null;
        };
        if (title != null) {
            jdbc.update(
                    """
                            INSERT INTO notifications(user_id,title,content,notification_type,related_entity_type,related_entity_id,delivery_status,sent_at)
                            VALUES (?,?,?,'WORKFLOW',?,?,'SENT',CURRENT_TIMESTAMP(6))
                            """,
                    user.id(), title,
                    "Bản ghi #" + id
                            + " đã được gửi tới quản lý quảng cáo. Mở trang liên quan để theo dõi trạng thái; gửi duyệt chưa có nghĩa là đã được chấp nhận.",
                    type, String.valueOf(id));
            jdbc.update(
                    """
                            INSERT INTO notifications(user_id,title,content,notification_type,related_entity_type,related_entity_id,delivery_status,sent_at)
                            SELECT DISTINCT u.user_id,?,?,'WORKFLOW',?,?,'SENT',CURRENT_TIMESTAMP(6)
                            FROM users u JOIN user_roles ur ON ur.user_id=u.user_id JOIN roles r ON r.role_id=ur.role_id
                            WHERE r.role_name='AD_MANAGER' AND r.status='ACTIVE' AND u.status='ACTIVE'
                            """,
                    "Có bản gửi cần kiểm tra: " + title,
                    "Bản ghi #" + id
                            + " đang chờ xem xét. Mở trang liên quan để kiểm tra hồ sơ trước khi đưa ra quyết định.",
                    type, String.valueOf(id));
        }
    }
}
