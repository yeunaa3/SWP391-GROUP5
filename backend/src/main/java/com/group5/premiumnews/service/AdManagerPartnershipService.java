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
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

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
    public AdManagerDtos.BookingQueuePage bookingQueue(AdManagerDtos.BookingQueueFilter filter) {
        validateBookingQueueFilter(filter);
        validateDates(filter.from(), filter.to());
        String keyword = filter.q() == null ? "" : filter.q().trim();
        String status = filter.status() == null ? "" : filter.status();
        StringBuilder where = new StringBuilder(" WHERE ct.status='PENDING_REVIEW' ");
        List<Object> arguments = new ArrayList<>();
        if (!keyword.isEmpty()) {
            where.append(
                    " AND (LOCATE(?,ct.contract_code)>0 OR LOCATE(?,ct.contract_name)>0 OR LOCATE(?,c.company_name)>0)");
            arguments.add(keyword);
            arguments.add(keyword);
            arguments.add(keyword);
        }
        if (!status.isEmpty()) {
            where.append(" AND ct.status=?");
            arguments.add(status);
        }
        if (filter.from() != null) {
            where.append(" AND ct.updated_at>=?");
            arguments.add(Timestamp.from(filter.from().atStartOfDay(VIETNAM).toInstant()));
        }
        if (filter.to() != null) {
            where.append(" AND ct.updated_at<?");
            arguments.add(Timestamp.from(filter.to().plusDays(1).atStartOfDay(VIETNAM).toInstant()));
        }

        // updated_at advances when a draft is submitted and its status changes to
        // PENDING_REVIEW.
        String fromClause = " FROM contracts ct JOIN companies c ON c.company_id=ct.company_id" + where;
        long total = nullableCount("SELECT COUNT(*)" + fromClause, arguments.toArray());
        List<Object> pageArguments = new ArrayList<>(arguments);
        pageArguments.add(filter.size());
        pageArguments.add(filter.page() * filter.size());
        List<AdManagerDtos.BookingQueueItem> items = jdbc.query("""
                SELECT ct.contract_id, ct.contract_code, ct.contract_name, c.company_name,
                       ct.slot_name_snapshot, ct.start_at, ct.end_at, ct.total_value,
                       ct.currency, ct.status, ct.updated_at
                """ + fromClause + """
                ORDER BY ct.updated_at ASC, ct.contract_id ASC
                LIMIT ? OFFSET ?
                """, (rs, row) -> new AdManagerDtos.BookingQueueItem(
                rs.getLong("contract_id"), rs.getString("contract_code"),
                rs.getString("contract_name"), rs.getString("company_name"),
                rs.getString("slot_name_snapshot"), instant(rs.getTimestamp("start_at")),
                instant(rs.getTimestamp("end_at")), rs.getBigDecimal("total_value"),
                rs.getString("currency"), rs.getString("status"),
                instant(rs.getTimestamp("updated_at"))), pageArguments.toArray());

        int totalPages = total == 0 ? 0 : (int) ((total + filter.size() - 1) / filter.size());
        return new AdManagerDtos.BookingQueuePage(items, total, filter.page(), filter.size(), totalPages);
    }

    @Transactional(readOnly = true)
    public AdManagerDtos.BookingDetail bookingDetail(long contractId) {
        Map<String, Object> contract = bookingRow(contractId);
        String status = String.valueOf(contract.get("status"));

        if ("DRAFT".equals(status)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy booking đã gửi để xem xét.");
        }

        AdManagerDtos.ProposalSnapshot latest = latestProposal(contractId);

        LocalDateTime startAt = latest != null && "DRAFT".equals(latest.status())
                ? latest.proposedStartAt()
                : contractDateTime(contract.get("start_at"));

        LocalDateTime endAt = latest != null && "DRAFT".equals(latest.status())
                ? latest.proposedEndAt()
                : contractDateTime(contract.get("end_at"));

        List<AdManagerDtos.BookingConflict> conflicts = bookingConflicts(
                contractId,
                ((Number) contract.get("slot_id")).longValue(),
                startAt,
                endAt);

        List<String> allowedActions = new ArrayList<>();
        if ("PENDING_REVIEW".equals(status)) {
            allowedActions.add("SAVE_PROPOSAL");
            allowedActions.add("REQUEST_ANOTHER_PERIOD");

            if (latest != null
                    && "DRAFT".equals(latest.status())
                    && conflicts.isEmpty()
                    && latest.expiresAt().isAfter(LocalDateTime.now(VIETNAM))) {
                allowedActions.add("SEND_PROPOSAL");
            }
        }

        return new AdManagerDtos.BookingDetail(
                new AdManagerDtos.BookingSnapshot(
                        ((Number) contract.get("contract_id")).longValue(),
                        (String) contract.get("contract_code"),
                        (String) contract.get("contract_name"),
                        (String) contract.get("company_name"),
                        (String) contract.get("package_name_snapshot"),
                        (String) contract.get("slot_name_snapshot"),
                        (String) contract.get("slot_position_snapshot"),
                        contractDateTime(contract.get("start_at")),
                        contractDateTime(contract.get("end_at")),
                        (BigDecimal) contract.get("total_value"),
                        (String) contract.get("currency"),
                        status,
                        ((Number) contract.get("revision_no")).intValue()),
                conflicts,
                latest,
                allowedActions);
    }

    @Transactional
    public AdManagerDtos.BookingDetail saveProposal(
            long contractId,
            AuthenticatedUserPrincipal manager,
            AdManagerDtos.SaveProposalRequest request) {
        Map<String, Object> contract = lockedPendingBooking(contractId, request.expectedRevisionNo());

        LocalDateTime now = LocalDateTime.now(VIETNAM);
        if (request.expiresAt() == null || !request.expiresAt().isAfter(now)) {
            throw new InvalidStateTransitionException(
                    "Hạn đề xuất phải nằm trong tương lai.");
        }

        LocalDate startDate = request.proposedStartAt().toLocalDate();
        if (startDate.isBefore(LocalDate.now(VIETNAM))
                || startDate.isAfter(LocalDate.now(VIETNAM).plusYears(1))) {
            throw new InvalidStateTransitionException(
                    "Ngày bắt đầu phải từ hôm nay và không quá một năm tới.");
        }

        long slotId = ((Number) contract.get("slot_id")).longValue();
        lockActiveSlot(slotId);

        BigDecimal amount = calculateProposalAmount(
                contractId,
                contract,
                request.proposedStartAt(),
                request.proposedEndAt());

        if (!bookingConflicts(
                contractId,
                slotId,
                request.proposedStartAt(),
                request.proposedEndAt()).isEmpty()) {
            throw new ConflictException(
                    "Vị trí đã có hợp đồng hoặc giữ chỗ trong khoảng đề xuất. Hãy chọn kỳ khác.");
        }

        jdbc.update("""
                UPDATE contract_proposals
                SET status='SUPERSEDED'
                WHERE contract_id=? AND status='DRAFT'
                """, contractId);

        Integer proposalRevision = jdbc.queryForObject("""
                SELECT COALESCE(MAX(revision_no), 0) + 1
                FROM contract_proposals
                WHERE contract_id=?
                """, Integer.class, contractId);

        jdbc.update("""
                INSERT INTO contract_proposals(
                    contract_id, revision_no, status, commercial_terms,
                    proposed_amount, currency, proposed_start_at,
                    proposed_end_at, expires_at, created_by
                )
                VALUES(?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?)
                """,
                contractId,
                proposalRevision,
                request.commercialTerms().trim(),
                amount,
                contract.get("currency"),
                request.proposedStartAt(),
                request.proposedEndAt(),
                request.expiresAt(),
                manager.id());

        int oldRevision = ((Number) contract.get("revision_no")).intValue();
        int changed = jdbc.update("""
                UPDATE contracts
                SET revision_no=revision_no+1
                WHERE contract_id=?
                  AND revision_no=?
                  AND status='PENDING_REVIEW'
                """, contractId, oldRevision);

        if (changed != 1) {
            throw new ConflictException(
                    "Booking đã thay đổi. Hãy tải lại trước khi lưu proposal.");
        }

        auditContract(
                manager.id(),
                "SAVE_CONTRACT_PROPOSAL",
                contractId,
                "PENDING_REVIEW",
                "PENDING_REVIEW",
                oldRevision,
                oldRevision + 1,
                null);

        return bookingDetail(contractId);
    }

    @Transactional
    public AdManagerDtos.BookingDetail sendProposal(
            long contractId,
            AuthenticatedUserPrincipal manager,
            AdManagerDtos.SendProposalRequest request) {
        Map<String, Object> contract = lockedPendingBooking(contractId, request.expectedRevisionNo());

        List<Map<String, Object>> proposals = jdbc.queryForList("""
                SELECT *
                FROM contract_proposals
                WHERE contract_id=? AND status='DRAFT'
                ORDER BY revision_no DESC
                LIMIT 1
                FOR UPDATE
                """, contractId);

        if (proposals.isEmpty()) {
            throw new InvalidStateTransitionException(
                    "Hãy lưu proposal trước khi gửi.");
        }

        Map<String, Object> proposal = proposals.getFirst();
        LocalDateTime expiresAt = contractDateTime(proposal.get("expires_at"));

        if (!expiresAt.isAfter(LocalDateTime.now(VIETNAM))) {
            throw new InvalidStateTransitionException(
                    "Proposal đã hết hạn. Hãy cập nhật hạn trước khi gửi.");
        }

        long slotId = ((Number) contract.get("slot_id")).longValue();
        lockActiveSlot(slotId);

        LocalDateTime startAt = contractDateTime(proposal.get("proposed_start_at"));
        LocalDateTime endAt = contractDateTime(proposal.get("proposed_end_at"));

        if (!bookingConflicts(contractId, slotId, startAt, endAt).isEmpty()) {
            throw new ConflictException(
                    "Lịch proposal vừa có xung đột. Hãy tải lại và chọn kỳ khác.");
        }

        int proposalChanged = jdbc.update("""
                UPDATE contract_proposals
                SET status='SENT', sent_at=CURRENT_TIMESTAMP(6)
                WHERE proposal_id=? AND status='DRAFT'
                """, proposal.get("proposal_id"));

        if (proposalChanged != 1) {
            throw new ConflictException(
                    "Proposal đã được xử lý. Hãy tải lại booking.");
        }

        int oldRevision = ((Number) contract.get("revision_no")).intValue();
        int contractChanged = jdbc.update("""
                UPDATE contracts
                SET status='PROPOSED',
                    proposed_at=CURRENT_TIMESTAMP(6),
                    revision_no=revision_no+1
                WHERE contract_id=?
                  AND revision_no=?
                  AND status='PENDING_REVIEW'
                """, contractId, oldRevision);

        if (contractChanged != 1) {
            throw new ConflictException(
                    "Booking đã thay đổi. Hãy tải lại trước khi gửi proposal.");
        }

        auditContract(
                manager.id(),
                "SEND_CONTRACT_PROPOSAL",
                contractId,
                "PENDING_REVIEW",
                "PROPOSED",
                oldRevision,
                oldRevision + 1,
                null);

        notifyBusinessContract(
                ((Number) contract.get("company_id")).longValue(),
                contractId,
                "Đã nhận được đề xuất hợp đồng",
                "Ad Manager đã gửi đề xuất cho booking "
                        + contract.get("contract_code") + ".");

        return bookingDetail(contractId);
    }

    @Transactional
    public AdManagerDtos.BookingDetail requestAnotherPeriod(
            long contractId,
            AuthenticatedUserPrincipal manager,
            AdManagerDtos.RequestAnotherPeriodRequest request) {
        Map<String, Object> contract = lockedPendingBooking(contractId, request.expectedRevisionNo());

        String reason = request.reason().trim();
        if (reason.isBlank()) {
            throw new InvalidStateTransitionException(
                    "Cần nhập lý do yêu cầu đổi thời gian.");
        }

        int oldRevision = ((Number) contract.get("revision_no")).intValue();
        int changed = jdbc.update("""
                UPDATE contracts
                SET status='REVISION_REQUESTED',
                    revision_no=revision_no+1
                WHERE contract_id=?
                  AND revision_no=?
                  AND status='PENDING_REVIEW'
                """, contractId, oldRevision);

        if (changed != 1) {
            throw new ConflictException(
                    "Booking đã thay đổi. Hãy tải lại trước khi yêu cầu đổi thời gian.");
        }

        jdbc.update("""
                UPDATE contract_proposals
                SET status='SUPERSEDED'
                WHERE contract_id=? AND status='DRAFT'
                """, contractId);

        jdbc.update("""
                INSERT INTO audit_logs(
                    actor_id, action, entity_type, entity_id,
                    old_value, new_value, reason
                )
                VALUES(
                    ?, 'REQUEST_ANOTHER_PERIOD', 'CONTRACT', ?,
                    JSON_OBJECT(
                        'status', ?,
                        'revisionNo', ?,
                        'startAt', ?,
                        'endAt', ?
                    ),
                    JSON_OBJECT(
                        'status', 'REVISION_REQUESTED',
                        'revisionNo', ?
                    ),
                    ?
                )
                """,
                manager.id(),
                String.valueOf(contractId),
                "PENDING_REVIEW",
                oldRevision,
                contract.get("start_at"),
                contract.get("end_at"),
                oldRevision + 1,
                reason);

        notifyBusinessContract(
                ((Number) contract.get("company_id")).longValue(),
                contractId,
                "Booking cần chọn thời gian khác",
                "Lý do từ Ad Manager: " + reason);

        return bookingDetail(contractId);
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
            where.append(
                    " AND (LOCATE(?,c.application_code)>0 OR LOCATE(?,c.company_name)>0 OR LOCATE(?,c.tax_code)>0)");
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
                instant(rs.getTimestamp("submitted_at")), rs.getString("industry"), rs.getString("contact_person")),
                companyId);
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
        // Cùng storage adapter với Business: tài liệu cloud authenticated vẫn được kiểm
        // tra và mở qua API quyền hạn.
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

    private void notifyBusinessContract(
            long companyId,
            long contractId,
            String title,
            String content) {
        jdbc.update("""
                INSERT INTO notifications(
                    user_id, title, content, notification_type,
                    related_entity_type, related_entity_id,
                    delivery_channel, delivery_status, sent_at
                )
                SELECT user_id, ?, ?, 'WORKFLOW',
                       'CONTRACT', ?, 'IN_APP', 'SENT', CURRENT_TIMESTAMP(6)
                FROM users
                WHERE company_id=? AND status='ACTIVE'
                """,
                title,
                content,
                String.valueOf(contractId),
                companyId);
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

    private void validateBookingQueueFilter(AdManagerDtos.BookingQueueFilter filter) {
        String status = filter.status() == null ? "" : filter.status();
        if (filter.page() < 0 || filter.size() < 1 || filter.size() > 100
                || (filter.q() != null && filter.q().length() > 150)
                || !List.of("", "PENDING_REVIEW").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bộ lọc booking không hợp lệ.");
        }
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private Map<String, Object> lockedPendingBooking(
            long contractId,
            int expectedRevisionNo) {
        Map<String, Object> contract = bookingRow(contractId, true);

        if (!"PENDING_REVIEW".equals(contract.get("status"))) {
            throw new InvalidStateTransitionException(
                    "Booking không còn chờ Ad Manager xem xét.");
        }

        int currentRevision = ((Number) contract.get("revision_no")).intValue();
        if (currentRevision != expectedRevisionNo) {
            throw new ConflictException(
                    "Booking đã thay đổi. Hãy tải lại trước khi tiếp tục.");
        }

        return contract;
    }

    private void lockActiveSlot(long slotId) {
        List<Long> rows = jdbc.query("""
                SELECT slot_id
                FROM ad_slots
                WHERE slot_id=? AND status='ACTIVE'
                FOR UPDATE
                """, (rs, row) -> rs.getLong("slot_id"), slotId);

        if (rows.isEmpty()) {
            throw new InvalidStateTransitionException(
                    "Vị trí quảng cáo không còn hoạt động.");
        }
    }

    private Map<String, Object> bookingRow(long contractId) {
        return bookingRow(contractId, false);
    }

    private Map<String, Object> bookingRow(long contractId, boolean lock) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT ct.*, c.company_name
                FROM contracts ct
                JOIN companies c ON c.company_id=ct.company_id
                WHERE ct.contract_id=?
                """ + (lock ? " FOR UPDATE" : ""), contractId);

        if (rows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy booking.");
        }

        return rows.getFirst();
    }

    private AdManagerDtos.ProposalSnapshot latestProposal(long contractId) {
        List<AdManagerDtos.ProposalSnapshot> rows = jdbc.query("""
                SELECT proposal_id, revision_no, status, commercial_terms,
                       proposed_amount, currency, proposed_start_at, proposed_end_at,
                       expires_at, created_at, sent_at, accepted_at
                FROM contract_proposals
                WHERE contract_id=?
                ORDER BY revision_no DESC
                LIMIT 1
                """,
                (rs, row) -> new AdManagerDtos.ProposalSnapshot(
                        rs.getLong("proposal_id"),
                        rs.getInt("revision_no"),
                        rs.getString("status"),
                        rs.getString("commercial_terms"),
                        rs.getBigDecimal("proposed_amount"),
                        rs.getString("currency"),
                        contractDateTime(rs.getTimestamp("proposed_start_at")),
                        contractDateTime(rs.getTimestamp("proposed_end_at")),
                        contractDateTime(rs.getTimestamp("expires_at")),
                        contractDateTime(rs.getTimestamp("created_at")),
                        rs.getTimestamp("sent_at") == null
                                ? null
                                : contractDateTime(rs.getTimestamp("sent_at")),
                        rs.getTimestamp("accepted_at") == null
                                ? null
                                : contractDateTime(rs.getTimestamp("accepted_at"))),
                contractId);

        return rows.isEmpty() ? null : rows.getFirst();
    }

    private List<AdManagerDtos.BookingConflict> bookingConflicts(
            long contractId,
            long slotId,
            LocalDateTime startAt,
            LocalDateTime endAt) {
        return jdbc.query("""
                SELECT contract_code, start_at, end_at, status
                FROM contracts
                WHERE slot_id=?
                  AND contract_id<>?
                  AND start_at<?
                  AND end_at>?
                  AND (
                        (status='ACTIVE' AND payment_status='PAID')
                        OR (
                            status IN ('ACCEPTED','PENDING_PAYMENT')
                            AND reservation_expires_at>CURRENT_TIMESTAMP(6)
                        )
                  )
                ORDER BY start_at
                """,
                (rs, row) -> new AdManagerDtos.BookingConflict(
                        rs.getString("contract_code"),
                        contractDateTime(rs.getTimestamp("start_at")),
                        contractDateTime(rs.getTimestamp("end_at")),
                        rs.getString("status")),
                slotId, contractId, endAt, startAt);
    }

    private void auditContract(
            long actorId,
            String action,
            long contractId,
            String oldStatus,
            String newStatus,
            int oldRevision,
            int newRevision,
            String reason) {
        jdbc.update("""
                INSERT INTO audit_logs(
                    actor_id, action, entity_type, entity_id,
                    old_value, new_value, reason
                )
                VALUES(
                    ?, ?, 'CONTRACT', ?,
                    JSON_OBJECT('status', ?, 'revisionNo', ?),
                    JSON_OBJECT('status', ?, 'revisionNo', ?),
                    ?
                )
                """,
                actorId,
                action,
                String.valueOf(contractId),
                oldStatus,
                oldRevision,
                newStatus,
                newRevision,
                reason);
    }

    private BigDecimal slotMonthlyPriceSnapshot(
            long contractId,
            Map<String, Object> contract) {
        BigDecimal savedSnapshot = jdbc.queryForObject("""
                SELECT CAST(
                    JSON_UNQUOTE(JSON_EXTRACT(quote_snapshot, '$.slotMonthlyPrice'))
                    AS DECIMAL(18,2)
                )
                FROM contracts
                WHERE contract_id=?
                """, BigDecimal.class, contractId);

        if (savedSnapshot != null) {
            return savedSnapshot;
        }

        LocalDateTime originalStart = contractDateTime(contract.get("start_at"));
        LocalDateTime originalEnd = contractDateTime(contract.get("end_at"));
        long originalDays = ChronoUnit.DAYS.between(
                originalStart.toLocalDate(),
                originalEnd.toLocalDate());

        BigDecimal savedTotal = (BigDecimal) contract.get("total_value");
        BigDecimal packagePrice = (BigDecimal) contract.get("package_price_snapshot");
        BigDecimal originalSlotAmount = savedTotal.subtract(packagePrice);

        if (originalDays <= 0 || originalSlotAmount.signum() < 0) {
            throw new InvalidStateTransitionException(
                    "Không thể xác định giá vị trí đã lưu cho booking cũ.");
        }

        return originalSlotAmount
                .multiply(BigDecimal.valueOf(30))
                .divide(BigDecimal.valueOf(originalDays), 0, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateProposalAmount(
            long contractId,
            Map<String, Object> contract,
            LocalDateTime proposedStartAt,
            LocalDateTime proposedEndAt) {
        if (!LocalTime.MIDNIGHT.equals(proposedStartAt.toLocalTime())
                || !LocalTime.MIDNIGHT.equals(proposedEndAt.toLocalTime())
                || !proposedEndAt.isAfter(proposedStartAt)) {
            throw new InvalidStateTransitionException(
                    "Ngày kết thúc phải sau ngày bắt đầu; lịch quảng cáo dùng mốc 00:00.");
        }

        long proposedDays = ChronoUnit.DAYS.between(
                proposedStartAt.toLocalDate(),
                proposedEndAt.toLocalDate());

        long packageDuration = ((Number) contract.get("duration_days_snapshot")).longValue();
        if (proposedDays <= 0 || proposedDays > packageDuration) {
            throw new InvalidStateTransitionException(
                    "Khoảng đề xuất không hợp lệ hoặc vượt thời hạn của gói.");
        }

        BigDecimal packagePrice = (BigDecimal) contract.get("package_price_snapshot");
        BigDecimal slotMonthlyPrice = slotMonthlyPriceSnapshot(contractId, contract);
        BigDecimal slotAmount = slotMonthlyPrice
                .multiply(BigDecimal.valueOf(proposedDays))
                .divide(BigDecimal.valueOf(30), 2, RoundingMode.HALF_UP);

        return packagePrice.add(slotAmount).setScale(2, RoundingMode.HALF_UP);
    }

    private LocalDateTime contractDateTime(Object value) {
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime;
        }
        throw new IllegalStateException("Không đọc được ngày giờ của hợp đồng.");
    }
}
