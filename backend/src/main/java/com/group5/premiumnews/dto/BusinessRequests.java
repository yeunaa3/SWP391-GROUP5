package com.group5.premiumnews.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class BusinessRequests {
    private BusinessRequests() {}
    public record Company(@NotBlank @Size(max=150) String name,
            @NotBlank @Size(max=50) String taxCode,
            @NotBlank @Email @Size(max=254) String email,
            @NotBlank @Size(max=30) String phone,
            @NotBlank @Size(max=500) String address,
            @Size(max=500) String billingAddress) {}
    public record Booking(@NotNull @Positive Long slotId, @NotNull @Positive Long packageId,
            @NotNull LocalDate startDate, @NotNull LocalDate endDate,
            @NotBlank @Size(max=200) String name) {}
    public record Campaign(@NotNull @Positive Long contractId,
            @NotBlank @Size(max=150) String name, @Size(max=2000) String description,
            @NotNull LocalDateTime startTime, @NotNull LocalDateTime endTime) {}
}
