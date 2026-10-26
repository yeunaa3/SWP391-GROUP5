package com.group5.premiumnews.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class BusinessRequests {
        private BusinessRequests() {
        }

        // UC-38: tám trường hồ sơ bắt buộc, bao gồm ngành nghề/người liên hệ; giới hạn
        // kiểm tra ở cả API.
        public record Company(@NotBlank @Size(max = 150) String name,
                        @NotBlank @Size(max = 50) String taxCode,
                        @NotBlank @Email @Size(max = 254) String email,
                        @NotBlank @Size(max = 30) String phone,
                        @NotBlank @Size(max = 500) String address,
                        @NotBlank @Size(max = 500) String billingAddress,
                        @NotBlank @Size(max = 150) String industry,
                        @NotBlank @Size(max = 150) String contactPerson) {
        }

        public record Booking(
                        @NotNull @Positive Long slotId,
                        @NotNull @Positive Long packageId,
                        @NotNull LocalDate startDate,
                        @NotNull LocalDate endDate,
                        @NotBlank @Size(max = 200) String name,
                        java.math.BigDecimal quotedAmount,
                        @Positive Integer expectedRevisionNo) {
        }

        public record BookingSubmissionRequest(
                        @NotNull @Positive Integer expectedRevisionNo) {
        }

        public record Campaign(@NotNull @Positive Long contractId,
                        @NotBlank @Size(max = 150) String name, @Size(max = 2000) String description,
                        @NotNull LocalDateTime startTime, @NotNull LocalDateTime endTime,
                        @Size(max = 1000) String targetUrl, Integer editVersion,
                        @Pattern(regexp = "[A-Za-z0-9-]{8,80}") String requestKey) {
        }

        /**
         * UC-26: danh sách ID là dữ liệu catalog; service kiểm tra tồn tại và lưu trong
         * transaction.
         */
        public record Targeting(@Size(max = 50) java.util.List<Long> categoryIds,
                        @Size(max = 50) java.util.List<Long> tagIds,
                        @Size(max = 255) String geoScope, @Size(max = 500) String audience,
                        @Pattern(regexp = "ALL|DESKTOP|MOBILE|TABLET") String deviceType,
                        @NotNull Integer editVersion) {
        }

        /** Version người dùng vừa kiểm tra phải khớp DB trước khi chốt submission. */
        public record CampaignSubmit(@NotNull @Positive Integer editVersion) {
        }

        /**
         * Quyết định chỉ áp dụng cho đúng submission đang chờ, không nhận nội dung
         * snapshot từ client.
         */
        public record CampaignDecision(@NotNull Long submissionId,
                        @NotBlank @Pattern(regexp = "APPROVED|NEEDS_REVISION|REJECTED") String decision,
                        @NotBlank @Size(max = 2000) String reason) {
        }
}
