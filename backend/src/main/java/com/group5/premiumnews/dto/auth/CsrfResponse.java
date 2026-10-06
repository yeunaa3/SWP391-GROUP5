package com.group5.premiumnews.dto.auth;

public record CsrfResponse(String headerName, String parameterName, String token) {
}
