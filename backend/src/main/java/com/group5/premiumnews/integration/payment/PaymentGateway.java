package com.group5.premiumnews.integration.payment;

import java.math.BigDecimal;

public interface PaymentGateway {

    PaymentSession createSession(PaymentRequest request);

    boolean verifyWebhook(String rawPayload, String signature);

    record PaymentRequest(String transactionReference, BigDecimal amount, String currency, String returnUrl) {
    }

    record PaymentSession(String providerSessionId, String checkoutUrl) {
    }
}
