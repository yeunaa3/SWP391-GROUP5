package com.group5.premiumnews.service;

import com.group5.premiumnews.dto.AdManagerDtos;
import com.group5.premiumnews.exception.ConflictException;
import com.group5.premiumnews.exception.InvalidStateTransitionException;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@PreAuthorize("hasRole('AD_MANAGER')")
public class AdManagerPartnershipService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final List<String> REVIEWABLE = List.of("PENDING_REVIEW", "RESUBMITTED");

    private final JdbcTemplate jdbc;
    private final BusinessAssetStorage storage;

    public AdManagerPartnershipService(
            JdbcTemplate jdbc,
            BusinessAssetStorage storage) {
        this.jdbc = jdbc;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public AdManagerDtos.Dashboard dashboard() {
        List<AdManagerDtos.Activity> activity = jdbc.query("""
                SELECT a.action, a.entity_type, a.entity_id,
                       COALESCE(u.full_name, u.username, 'Hệ thống') actor_name,
                       a.created_at
                FROM audit_logs a
                LEFT JOIN users u ON u.user_id = a.actor_id
                WHERE a.entity_type IN ('COMPANY', 'CONTRACT', 'CAMPAIGN')
                ORDER BY a.audit_log_id DESC
                LIMIT 8
                """, (rs, row) -> new AdManagerDtos.Activity(
                rs.getString("action"), rs.getString("entity_type"), rs.getString("entity_id"),
                rs.getString("actor_name"), instant(rs.getTimestamp("created_at"))));

        return new AdManagerDtos.Dashboard(
                count("SELECT COUNT(*) FROM companies WHERE status='ACTIVE' AND application_status IN ('PENDING_REVIEW','RESUBMITTED')"),
                count("SELECT COUNT(*) FROM contracts WHERE status='PENDING_REVIEW'"),
                count("SELECT COUNT(*) FROM ad_campaigns WHERE status='PENDING_REVIEW'"),
                count("SELECT COUNT(*) FROM ad_campaigns WHERE status='ACTIVE'"),
                count("""
                        SELECT COUNT(*) FROM ad_campaigns c
                        WHERE c.status IN ('ACTIVE','SCHEDULED')
                          AND (c.scheduled_end_time <= CURRENT_TIMESTAMP(6)
                               OR NOT EXISTS (SELECT 1 FROM ad_creatives cr
                                   WHERE cr.campaign_id=c.campaign_id AND cr.status='APPROVED'))
                        """),
                count("SELECT COUNT(*) FROM contracts WHERE payment_status='FAILED' OR status='PAYMENT_FAILED'"),
                activity);
    }

    @Transactional(readOnly = true)
    public AdManagerDtos.QueuePage queue(AdManagerDtos.QueueFilter filter) {
        validateFilter(filter);
        validateDates(filter.from(), filter.to());
        String keyword = filter.q() == null ? "" : filter.q().trim();
        String status = filter.status() == null ? "" : filter.status();
        String priority = filter.priority() == null ? "" : filter.priority();

        StringBuilder where = new StringBuilder("""
                WHERE c.status='ACTIVE'
                  AND c.application_status IN ('PENDING_REVIEW','RESUBMITTED')
                """);
        List<Object> arguments = new ArrayList<>();
        if (!keyword.isEmpty()) {
            where.append(" AND (LOCATE(?,c.application_code)>0 OR LOCATE(?,c.company_name)>0 OR LOCATE(?,c.tax_code)>0)");
            arguments.add(keyword);
            arguments.add(keyword);
            arguments.add(keyword);
        }
        if (!status.isEmpty()) {
            where.append(" AND c.application_status=?");
            arguments.add(status);
        }
        if (!priority.isEmpty()) {
            where.append(" AND c.review_priority=?");
            arguments.add(priority);
        }
        if (filter.from() != null) {
            where.append(" AND c.submitted_at>=?");
            arguments.add(Timestamp.from(filter.from().atStartOfDay(VIETNAM).toInstant()));
        }
        if (filter.to() != null) {
            where.append(" AND c.submitted_at<?");
            arguments.add(Timestamp.from(filter.to().plusDays(1).atStartOfDay(VIETNAM).toInstant()));
        }

        long total = nullableCount("SELECT COUNT(*) FROM companies c " + where, arguments.toArray());
        List<Object> pageArguments = new ArrayList<>(arguments);
        pageArguments.add(filter.size());
        pageArguments.add(filter.page() * filter.size());
        List<AdManagerDtos.QueueItem> items = jdbc.query("""
                SELECT c.company_id, c.application_code, c.company_name, c.tax_code,
                       c.application_version, c.submitted_at, c.application_status,
                       c.review_priority,
                       (SELECT COUNT(*) FROM company_application_version_documents vd
                        WHERE vd.company_id=c.company_id
                          AND vd.application_version=c.application_version) document_count
                FROM companies c
                """ + where + """
                ORDER BY FIELD(c.review_priority,'URGENT','HIGH','NORMAL'),
                         c.submitted_at ASC, c.company_id ASC
                LIMIT ? OFFSET ?
                """, (rs, row) -> new AdManagerDtos.QueueItem(
                rs.getLong("company_id"), rs.getString("application_code"),
                rs.getString("company_name"), rs.getString("tax_code"),
                rs.getInt("application_version"), instant(rs.getTimestamp("submitted_at")),
                rs.getString("application_status"), rs.getString("review_priority"),
                rs.getLong("document_count")), pageArguments.toArray());

        int totalPages = total == 0 ? 0 : (int) ((total + filter.size() - 1) / filter.size());
        return new AdManagerDtos.QueuePage(items, total, filter.page(), filter.size(), totalPages);
    }

    @Transactional(readOnly = true)
    public AdManagerDtos.PartnershipDetail detail(long companyId) {
        List<AdManagerDtos.CompanySnapshot> companies = jdbc.query("""
                SELECT c.company_id, c.application_code, c.application_version,
                       c.application_status, c.review_priority,
                       v.company_name, v.tax_code, v.email, v.phone, v.address,
                       v.billing_address, v.submitted_at,v.industry,v.contact_person
                FROM companies c
                JOIN company_application_versions v
                  ON v.company_id=c.company_id AND v.application_version=c.application_version
                WHERE c.company_id=? AND c.status='ACTIVE' AND c.application_status<>'DRAFT'
                """, (rs, row) -> new AdManagerDtos.CompanySnapshot(
                rs.getLong("company_id"), rs.getString("application_code"),
                rs.getInt("application_version"), rs.getString("application_status"),
                rs.getString("review_priority"), rs.getString("company_name"),
                rs.getString("tax_code"), rs.getString("email"), rs.getString("phone"),
                rs.getString("address"), rs.getString("billing_address"),
                instant(rs.getTimestamp("submitted_at")),rs.getString("industry"),rs.getString("contact_person")), companyId);
        if (companies.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiên bản hồ sơ đã gửi.");
        }
        AdManagerDtos.CompanySnapshot company = companies.getFirst();
        List<AdManagerDtos.DocumentItem> documents = loadDocuments(companyId, company.applicationVersion());
        List<AdManagerDtos.ReviewEvent> history = jdbc.query("""
                SELECT r.decision, r.review_note,
                       COALESCE(u.full_name,u.username) reviewer_name, r.created_at
                FROM partnership_reviews r
                JOIN users u ON u.user_id=r.reviewer_id
                WHERE r.company_id=?
                ORDER BY r.partnership_review_id DESC
                """, (rs, row) -> new AdManagerDtos.ReviewEvent(
                rs.getString("decision"), rs.getString("review_note"),
                rs.getString("reviewer_name"), instant(rs.getTimestamp("created_at"))), companyId);
        String savedNote = latestNote(companyId, company.applicationVersion());
        int available = (int) documents.stream().filter(AdManagerDtos.DocumentItem::available).count();
        boolean canApprove = !documents.isEmpty() && available == documents.size();
        String validationMessage = documents.isEmpty()
                ? "Hồ sơ chưa có tài liệu pháp lý trong phiên bản này."
                : canApprove ? "Tất cả tài liệu trong phiên bản hiện tại đều có thể mở."
                : "Có tài liệu không còn khả dụng. Không thể phê duyệt cho đến khi Business gửi lại tài liệu.";
        return new AdManagerDtos.PartnershipDetail(
                company, documents, history, savedNote, !savedNote.isBlank(),
                new AdManagerDtos.ValidationSummary(documents.size(), available, canApprove, validationMessage));
    }

    @Transactional
    public AdManagerDtos.PartnershipDetail saveNote(long companyId,
            AuthenticatedUserPrincipal reviewer, AdManagerDtos.ReviewNoteRequest request) {
        Map<String, Object> company = reviewableCompany(companyId, request.applicationVersion());
        String note = request.note().trim();
        jdbc.update("""
                INSERT INTO partnership_reviews(company_id,application_version,reviewer_id,decision,review_note)
                VALUES(?,?,?,'NOTE',?)
                """, companyId, request.applicationVersion(), reviewer.id(), note);
        jdbc.update("""
                UPDATE companies SET reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP(6),review_note=?
                WHERE company_id=?
                """, reviewer.id(), note, companyId);
        audit(reviewer.id(), "REVIEW_PARTNERSHIP", companyId,
                (String) company.get("application_status"), (String) company.get("application_status"), note);
        return detail(companyId);
    }

    @Transactional
    public AdManagerDtos.PartnershipDetail decide(long companyId,
            AuthenticatedUserPrincipal reviewer, AdManagerDtos.DecisionRequest request) {
        Map<String, Object> company = reviewableCompany(companyId, request.applicationVersion());
        String decision = request.decision();
        String savedNote = latestNote(companyId, request.applicationVersion());
        if (savedNote.isBlank()) {
            throw new InvalidStateTransitionException("Hãy lưu ghi chú xem xét trước khi ra quyết định.");
        }
        String reason = request.reason() == null ? "" : request.reason().trim();
        if (!"APPROVED".equals(decision) && reason.isBlank()) {
            throw new InvalidStateTransitionException("Từ chối hoặc yêu cầu chỉnh sửa phải có lý do.");
        }
        if ("APPROVED".equals(decision)) {
            requireAvailableDocuments(companyId, request.applicationVersion());
        }

        String previousStatus = (String) company.get("application_status");
        String finalNote = "APPROVED".equals(decision) ? savedNote : reason;
        int changed = jdbc.update("""
                UPDATE companies
                SET application_status=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP(6),review_note=?
                WHERE company_id=? AND application_version=?
                  AND application_status IN ('PENDING_REVIEW','RESUBMITTED')
                """, decision, reviewer.id(), finalNote, companyId, request.applicationVersion());
        if (changed != 1) {
            throw new ConflictException("Hồ sơ đã thay đổi. Hãy tải lại trước khi quyết định.");
        }
        jdbc.update("""
                INSERT INTO partnership_reviews(company_id,application_version,reviewer_id,decision,review_note)
                VALUES(?,?,?,?,?)
                """, companyId, request.applicationVersion(), reviewer.id(), decision, finalNote);
        audit(reviewer.id(), "DECIDE_PARTNERSHIP", companyId, previousStatus, decision, finalNote);
        notifyBusiness(companyId, decision, finalNote);
        return detail(companyId);
    }

    private Map<String, Object> reviewableCompany(long companyId, int expectedVersion) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT company_id,application_version,application_status
                FROM companies WHERE company_id=? AND status='ACTIVE' FOR UPDATE
                """, companyId);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ doanh nghiệp.");
        }
        Map<String, Object> company = rows.getFirst();
        int currentVersion = ((Number) company.get("application_version")).intValue();
        if (currentVersion != expectedVersion) {
            throw new ConflictException("Business đã gửi phiên bản mới. Hãy tải lại hồ sơ.");
        }
        if (!REVIEWABLE.contains(company.get("application_status"))) {
            throw new InvalidStateTransitionException("Hồ sơ không còn ở trạng thái chờ xem xét.");
        }
        return company;
    }

    private List<AdManagerDtos.DocumentItem> loadDocuments(long companyId, int version) {
        return jdbc.query("""
                SELECT d.document_id,d.original_file_name,d.document_type,d.version_no,
                       d.status,d.uploaded_at,d.storage_object_key
                FROM company_application_version_documents vd
                JOIN company_documents d ON d.document_id=vd.document_id
                WHERE vd.company_id=? AND vd.application_version=?
                ORDER BY d.document_type,d.version_no DESC,d.document_id DESC
                """, (rs, row) -> {
            long documentId = rs.getLong("document_id");
            boolean available = fileAvailable(rs.getString("storage_object_key"));
            return new AdManagerDtos.DocumentItem(
                    documentId, rs.getString("original_file_name"), rs.getString("document_type"),
                    rs.getInt("version_no"), rs.getString("status"),
                    instant(rs.getTimestamp("uploaded_at")), available,
                    available ? "/api/media/document/" + documentId : null);
        }, companyId, version);
    }

    private void requireAvailableDocuments(long companyId, int version) {
        List<AdManagerDtos.DocumentItem> documents = loadDocuments(companyId, version);
        if (documents.isEmpty() || documents.stream().anyMatch(document -> !document.available())) {
            throw new InvalidStateTransitionException(
                    "Không thể phê duyệt: phiên bản hiện tại thiếu tài liệu pháp lý có thể mở.");
        }
    }

    private boolean fileAvailable(String objectKey) {
        // Cùng storage adapter với Business: tài liệu cloud authenticated vẫn được kiểm tra và mở qua API quyền hạn.
        return storage.available(objectKey);
    }

    private String latestNote(long companyId, int version) {
        List<String> notes = jdbc.query("""
                SELECT review_note FROM partnership_reviews
                WHERE company_id=? AND application_version=? AND decision='NOTE'
                ORDER BY partnership_review_id DESC LIMIT 1
                """, (rs, row) -> rs.getString(1), companyId, version);
        return notes.isEmpty() ? "" : notes.getFirst();
    }

    private void notifyBusiness(long companyId, String decision, String note) {
        String title = switch (decision) {
            case "APPROVED" -> "Hồ sơ hợp tác đã được phê duyệt";
            case "REJECTED" -> "Hồ sơ hợp tác đã bị từ chối";
            default -> "Hồ sơ hợp tác cần chỉnh sửa";
        };
        String content = title + ". " + note;
        for (String channel : List.of("IN_APP", "EMAIL")) {
            jdbc.update("""
                    INSERT INTO notifications(user_id,title,content,notification_type,
                        related_entity_type,related_entity_id,delivery_channel,delivery_status,sent_at)
                    SELECT user_id,?,?, 'PARTNERSHIP','COMPANY',?, ?,
                           IF(?='IN_APP','SENT','PENDING'),
                           IF(?='IN_APP',CURRENT_TIMESTAMP(6),NULL)
                    FROM users WHERE company_id=? AND status='ACTIVE'
                    """, title, content, String.valueOf(companyId), channel, channel, channel, companyId);
        }
    }

    private void audit(long reviewerId, String action, long companyId,
            String oldStatus, String newStatus, String reason) {
        jdbc.update("""
                INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,old_value,new_value,reason)
                VALUES(?,?,'COMPANY',?,JSON_OBJECT('status',?),JSON_OBJECT('status',?),?)
                """, reviewerId, action, String.valueOf(companyId), oldStatus, newStatus, reason);
    }

    private long count(String sql) {
        return nullableCount(sql);
    }

    private long nullableCount(String sql, Object... arguments) {
        Long value = jdbc.queryForObject(sql, Long.class, arguments);
        return value == null ? 0 : value;
    }

    private void validateDates(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ngày bắt đầu không được sau ngày kết thúc.");
        }
    }

    private void validateFilter(AdManagerDtos.QueueFilter filter) {
        String status = filter.status() == null ? "" : filter.status();
        String priority = filter.priority() == null ? "" : filter.priority();
        if (filter.page() < 0 || filter.size() < 1 || filter.size() > 100
                || (filter.q() != null && filter.q().length() > 150)
                || !List.of("", "PENDING_REVIEW", "RESUBMITTED").contains(status)
                || !List.of("", "NORMAL", "HIGH", "URGENT").contains(priority)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bộ lọc hồ sơ không hợp lệ.");
        }
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }
}
