package com.group5.premiumnews.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegistrationRequest(
        @NotBlank @Size(min = 3, max = 50) @Pattern(regexp = "^[A-Za-z0-9@.]+$", message = "Chỉ dùng chữ không dấu, số, @ và dấu chấm") String username,
        @NotBlank @Email @Size(max = 254) @Pattern(regexp = "^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,63}$", message = "Email không đúng định dạng") String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 100) @Pattern(regexp = "^[\\p{L}\\p{M}]+(?: [\\p{L}\\p{M}]+)*$", message = "Họ tên chỉ được chứa chữ và khoảng trắng") String fullName,
        @Size(max = 15) @Pattern(regexp = "^$|^[0-9]{8,15}$", message = "Số điện thoại chỉ được chứa 8–15 chữ số") String phoneNumber,
        @NotNull AccountType accountType,
        @NotBlank @Size(min = 8, max = 72) String confirmPassword,
        @NotNull @jakarta.validation.constraints.AssertTrue(message = "Bạn cần đồng ý điều khoản để đăng ký") Boolean acceptedTerms) {
    @jakarta.validation.constraints.AssertTrue(message = "Mật khẩu xác nhận không khớp")
    public boolean isPasswordConfirmed() { return password != null && password.equals(confirmPassword); }
}
