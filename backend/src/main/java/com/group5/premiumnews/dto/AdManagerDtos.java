package com.group5.premiumnews.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDateTime;

public final class AdManagerDtos {
        private AdManagerDtos() {
        }

        public record Dashboard(
                        long pendingPartnerships,
                        long pendingBookings,
                        long pendingCampaigns,
                        long activeCampaigns,
                        long deliveryAlerts,
                        long paymentAlerts,
                        List<Activity> recentActivity) {
        }

        public record Activity(String action, String entityType, String entityId,
                        String actorName, Instant createdAt) {
        }

        public record QueuePage(List<QueueItem> items, long total, int page, int size, int totalPages) {
        }

        public record QueueItem(long companyId, String applicationCode, String companyName,
                        String taxCode, int applicationVersion, Instant submittedAt, String status,
                        String priority, long documentCount) {
        }

        public record BookingQueuePage(List<BookingQueueItem> items, long total, int page, int size, int totalPages) {
        }

        public record BookingQueueItem(long contractId, String contractCode, String contractName,
                        String companyName, String slotName, Instant startAt, Instant endAt,
                        BigDecimal totalValue, String currency, String status, Instant submittedAt) {
        }

        public record BookingDetail(
                        BookingSnapshot booking,
                        List<BookingConflict> conflicts,
                        ProposalSnapshot latestProposal,
                        List<String> allowedActions) {
        }

        public record BookingSnapshot(
                        long contractId,
                        String contractCode,
                        String contractName,
                        String companyName,
                        String packageName,
                        String slotName,
                        String slotPosition,
                        LocalDateTime startAt,
                        LocalDateTime endAt,
                        BigDecimal totalValue,
                        BigDecimal calculatedProposalAmount,
                        String currency,
                        String status,
                        int revisionNo) {
        }

        public record BookingConflict(
                        String contractCode,
                        LocalDateTime startAt,
                        LocalDateTime endAt,
                        String status) {
        }

        public record ProposalSnapshot(
                        long proposalId,
                        int revisionNo,
                        String status,
                        String businessResponseReason,
                        String commercialTerms,
                        BigDecimal proposedAmount,
                        String currency,
                        LocalDateTime proposedStartAt,
                        LocalDateTime proposedEndAt,
                        LocalDateTime expiresAt,
                        LocalDateTime createdAt,
                        LocalDateTime sentAt,
                        LocalDateTime acceptedAt) {
        }

        public record SaveProposalRequest(
                        @NotNull @Min(1) Integer expectedRevisionNo,
                        @NotBlank @Size(max = 10000) String commercialTerms,
                        @NotNull LocalDateTime proposedStartAt,
                        @NotNull LocalDateTime proposedEndAt,
                        @NotNull LocalDateTime expiresAt) {
        }

        public record SendProposalRequest(
                        @NotNull @Min(1) Integer expectedRevisionNo) {
        }

        public record RequestAnotherPeriodRequest(
                        @NotNull @Min(1) Integer expectedRevisionNo,
                        @NotBlank @Size(max = 500) String reason) {
        }

        public record BookingQueueFilter(
                        @Size(max = 150) String q,
                        @Pattern(regexp = "|PENDING_REVIEW") String status,
                        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                        @Min(0) int page,
                        @Min(1) @Max(100) int size) {
        }

        public record PartnershipDetail(
                        CompanySnapshot company,
                        List<DocumentItem> documents,
                        List<ReviewEvent> history,
                        String savedNote,
                        boolean reviewReady,
                        ValidationSummary validation) {
        }

        public record CompanySnapshot(long companyId, String applicationCode, int applicationVersion,
                        String status, String priority, String companyName, String taxCode, String email,
                        String phone, String address, String billingAddress, Instant submittedAt,
                        String industry, String contactPerson) {
        }

        public record DocumentItem(long documentId, String fileName, String documentType,
                        int version, String status, Instant uploadedAt, boolean available, String viewUrl) {
        }

        public record ReviewEvent(String decision, String note, String reviewerName, Instant createdAt) {
        }

        public record ValidationSummary(int totalDocuments, int availableDocuments,
                        boolean canApprove, String message) {
        }

        public record ReviewNoteRequest(
                        @NotNull @Min(1) Integer applicationVersion,
                        @NotBlank @Size(max = 2000) String note) {
        }

        public record DecisionRequest(
                        @NotNull @Min(1) Integer applicationVersion,
                        @NotBlank @Pattern(regexp = "APPROVED|REJECTED|NEEDS_REVISION") String decision,
                        @Size(max = 2000) String reason) {
        }

        public record QueueFilter(
                        @Size(max = 150) String q,
                        @Pattern(regexp = "|PENDING_REVIEW|RESUBMITTED") String status,
                        @Pattern(regexp = "|NORMAL|HIGH|URGENT") String priority,
                        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                        @Min(0) int page,
                        @Min(1) @Max(100) int size) {
        }
}
