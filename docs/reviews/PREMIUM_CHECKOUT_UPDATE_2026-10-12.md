# Premium checkout update 12 October 2026

- PRE-01 now loads real active catalog data without a silent sample fallback and opens PRE-02.
- PRE-02 displays the selected catalog plan, benefits, limitations, projected new-purchase dates and terms. Projected expiry is not an issued subscription expiry.
- PRE-03 uses a read-only order summary, signed-in recipient account, payment-method selection and consent. No repeated package/summary/terms text inputs.
- The owner-supplied static QR is a public receiving asset. It has no unique order or amount embedded by this application. Never automatically activate access based on a client click or a reported transfer.
- Card and wallet choices are visibly unavailable until providers are integrated.
- Static transfer reference is only a suggestion, not a unique order identifier. No server payment order or reconciliation request is written by this UI yet.
- Temporary receiving configuration is in frontend/src/data/paymentConfig.js. Administrator-managed methods, QR upload, beneficiary details, audit history, immutable payment-order snapshots, reconciliation, transaction status and entitlement activation remain to implement. Keep credentials and provider secrets server-side.
- Workspace layout now verifies session and screen roles before rendering navigation. Login validates returnTo against the new user's roles. Successful logout redirects to login; failed logout retains the session and displays an error.

## Acceptance checks

1. Real packages load; errors and empty lists do not become fabricated offers.
2. Both package cards open their own detail then checkout. Invalid/inactive IDs cannot continue.
3. Selected plan and price cannot be entered/edited by the customer. Consent is required before displaying QR.
4. Static QR is unchanged. Confirm recipient and amount manually. The transfer button never records success or grants Premium.
5. Card/wallet remain disabled. No card, bank-password or OTP collection.
6. Business -> logout -> reader/admin/manager login renders only authorized workspace. Back navigation cannot expose the previous role's sidebar.
7. Verify narrow viewport, VI/EN, keyboard navigation and reduced motion.
