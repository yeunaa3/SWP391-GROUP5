import { useState, useEffect, useRef } from "react";
import { createPaymentQr, checkPaymentStatus } from "../services/paymentService.js";
import { paymentConfig } from "../data/paymentConfig.js";

const TOTAL_COOLDOWN_SECONDS = 300; // 5 phút

export default function AutoPaymentTimerCard({
  type = "PREMIUM",
  referenceId,
  amount,
  itemName,
  onSuccess,
}) {
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_COOLDOWN_SECONDS);
  const [isExpired, setIsExpired] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  const pollTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // Khởi tạo mã thanh toán và đồng hồ 5 phút
  const initPayment = async () => {
    setLoading(true);
    setError("");
    setIsExpired(false);
    setIsPaid(false);
    setTimeLeft(TOTAL_COOLDOWN_SECONDS);

    try {
      const res = await createPaymentQr({ type, referenceId });
      setQrData(res);
    } catch (err) {
      setError(err.message || "Không thể khởi tạo mã thanh toán VietQR.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (referenceId) {
      initPayment();
    }
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [type, referenceId]);

  // Bộ đếm lùi 5 phút (300 giây -> 0)
  useEffect(() => {
    if (loading || isPaid || isExpired || !qrData) return;

    countdownTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [loading, isPaid, isExpired, qrData]);

  // Tự động lắng nghe giao dịch (Auto-Polling) mỗi 2.5s từ PayOS / Ngân hàng
  useEffect(() => {
    if (loading || isPaid || isExpired || !qrData) return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await checkPaymentStatus(type, referenceId, qrData.orderCode);
        if (res && res.paid) {
          // Thanh toán thành công -> DỪNG NGAY đồng hồ và polling
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setIsPaid(true);
          if (typeof onSuccess === "function") {
            onSuccess(res);
          }
        }
      } catch (err) {
        // Bỏ qua lỗi kết nối tạm thời khi polling
      }
    }, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [loading, isPaid, isExpired, qrData, type, referenceId]);

  const copyToClipboard = (text, key) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 2000);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const progressPercent = Math.max(0, (timeLeft / TOTAL_COOLDOWN_SECONDS) * 100);

  const displayBankName = qrData?.bankCode || paymentConfig.bankName;
  const displayAccountName = qrData?.accountName || paymentConfig.accountName;
  const displayAccountNumber = qrData?.accountNumber || paymentConfig.accountNumber;
  const displayMemo = qrData?.memo || (type === "PREMIUM" ? `THEPLUSE SUB ${referenceId}` : `THEPLUSE CTR ${referenceId}`);
  const displayAmount = qrData?.amount != null ? Number(qrData.amount) : Number(amount || 0);

  const formatCurrency = (val) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  return (
    <div
      style={{
        background: "#ffffff",
        border: isPaid
          ? "2px solid #10b981"
          : isExpired
          ? "2px solid #ef4444"
          : "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "24px",
        marginBlock: "20px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.05)",
        transition: "all 0.3s ease",
      }}
    >
      {/* Banner Thành công */}
      {isPaid && (
        <div
          role="status"
          style={{
            background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
            border: "1px solid #10b981",
            color: "#065f46",
            padding: "16px 20px",
            borderRadius: "10px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontWeight: "700",
            fontSize: "16px",
          }}
        >
          <span style={{ fontSize: "24px" }}>🎉</span>
          <div>
            <div>Thanh toán thành công!</div>
            <div style={{ fontSize: "14px", fontWeight: "500", marginTop: "2px" }}>
              Hệ thống đã nhận được tiền từ PayOS / Ngân hàng và tự động kích hoạt quyền lợi của bạn.
            </div>
          </div>
        </div>
      )}

      {/* Banner Hết thời gian (Thất bại) */}
      {isExpired && !isPaid && (
        <div
          role="alert"
          style={{
            background: "#fef2f2",
            border: "1px solid #ef4444",
            color: "#991b1b",
            padding: "16px 20px",
            borderRadius: "10px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>❌</span>
            <div>
              <strong style={{ fontSize: "15px" }}>Hết thời gian thanh toán (5:00) — Giao dịch thất bại</strong>
              <div style={{ fontSize: "13px", marginTop: "2px", color: "#7f1d1d" }}>
                Mã QR đã hết hạn sử dụng để đảm bảo an toàn giao dịch. Vui lòng tạo mã mới để thử lại.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={initPayment}
            style={{
              background: "#ef4444",
              color: "#ffffff",
              border: "none",
              padding: "10px 18px",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(239, 68, 68, 0.3)",
            }}
          >
            <span>🔄</span> Tạo mã thanh toán mới
          </button>
        </div>
      )}

      {/* Thanh Cooldown Timer 5 Phút (Khi chưa xong và chưa hết hạn) */}
      {!isPaid && !isExpired && (
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>⏳</span>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#334155" }}>
                Thời gian hoàn tất thanh toán:
              </span>
              <strong
                style={{
                  fontSize: "18px",
                  fontFamily: "monospace",
                  color: timeLeft <= 60 ? "#dc2626" : "#0284c7",
                  background: timeLeft <= 60 ? "#fef2f2" : "#f0f9ff",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  border: `1px solid ${timeLeft <= 60 ? "#fecaca" : "#bae6fd"}`,
                }}
              >
                {formattedTime}
              </strong>
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Tự động nhận diện không cần bấm nút
            </div>
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "100%",
              height: "6px",
              background: "#e2e8f0",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background:
                  timeLeft <= 60
                    ? "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)"
                    : "linear-gradient(90deg, #0284c7 0%, #10b981 100%)",
                transition: "width 1s linear",
              }}
            />
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#f0fdf4",
              color: "#16a34a",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "600",
              border: "1px solid #bbf7d0",
              marginTop: "12px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#22c55e",
                display: "inline-block",
                boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.2)",
              }}
            />
            <span>Hệ thống đang tự động lắng nghe giao dịch chuyển khoản từ PayOS / Ngân hàng...</span>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>⌛</div>
          <p>Đang khởi tạo mã thanh toán VietQR và liên kết PayOS...</p>
        </div>
      ) : error ? (
        <div style={{ color: "#dc2626", background: "#fef2f2", padding: "16px", borderRadius: "8px" }}>
          {error}
          <div style={{ marginTop: "10px" }}>
            <button
              type="button"
              onClick={initPayment}
              style={{
                background: "#0284c7",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Thử lại
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {/* Cột QR Code */}
          <div style={{ position: "relative", width: "200px", minWidth: "200px", textAlign: "center" }}>
            <div
              style={{
                position: "relative",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                padding: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <img
                src={qrData?.qrUrl || paymentConfig.getDynamicQrUrl(displayAmount, displayMemo)}
                onError={(e) => {
                  e.currentTarget.src = paymentConfig.qrImage;
                }}
                alt="VietQR Napas"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  borderRadius: "8px",
                  filter: isExpired ? "grayscale(100%) blur(2px)" : "none",
                  opacity: isExpired ? 0.35 : 1,
                  transition: "all 0.3s ease",
                }}
              />

              {isExpired && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255, 255, 255, 0.75)",
                    color: "#b91c1c",
                    fontWeight: "800",
                    fontSize: "14px",
                    gap: "6px",
                    padding: "10px",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>⚠️</span>
                  <span>MÃ ĐÃ HẾT HẠN</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
              Quét bằng App Ngân hàng bất kỳ
            </div>

            {qrData?.checkoutUrl && !isExpired && (
              <a
                href={qrData.checkoutUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: "8px",
                  fontSize: "13px",
                  color: "#0284c7",
                  textDecoration: "underline",
                  fontWeight: "600",
                }}
              >
                Mở cổng thanh toán PayOS Web ↗
              </a>
            )}
          </div>

          {/* Cột Chi tiết chuyển khoản */}
          <div style={{ flex: 1, minWidth: "280px" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "17px", color: "#0f172a" }}>
              Quét mã VietQR để thanh toán {itemName ? `(${itemName})` : ""}
            </h3>

            <div
              style={{
                display: "grid",
                gap: "10px",
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                fontSize: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b" }}>Ngân hàng thụ hưởng:</span>
                <strong style={{ color: "#0f172a" }}>{displayBankName}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b" }}>Chủ tài khoản:</span>
                <strong style={{ color: "#0f172a" }}>{displayAccountName}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b" }}>Số tài khoản:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong style={{ color: "#0f172a", fontSize: "15px", fontFamily: "monospace" }}>
                    {displayAccountNumber}
                  </strong>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(displayAccountNumber, "account")}
                    style={{
                      background: copiedKey === "account" ? "#10b981" : "#e2e8f0",
                      color: copiedKey === "account" ? "#fff" : "#334155",
                      border: "none",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    {copiedKey === "account" ? "✓ Đã chép" : "Chép"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b" }}>Số tiền:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong style={{ color: "#059669", fontSize: "16px" }}>
                    {formatCurrency(displayAmount)}
                  </strong>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(String(displayAmount), "amount")}
                    style={{
                      background: copiedKey === "amount" ? "#10b981" : "#e2e8f0",
                      color: copiedKey === "amount" ? "#fff" : "#334155",
                      border: "none",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    {copiedKey === "amount" ? "✓ Đã chép" : "Chép"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px dashed #cbd5e1",
                  paddingTop: "10px",
                }}
              >
                <span style={{ color: "#64748b", fontWeight: "600" }}>Nội dung chuyển khoản:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong
                    style={{
                      color: "#4f46e5",
                      background: "#eef2ff",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontFamily: "monospace",
                      fontSize: "15px",
                      border: "1px solid #c7d2fe",
                    }}
                  >
                    {displayMemo}
                  </strong>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(displayMemo, "memo")}
                    style={{
                      background: copiedKey === "memo" ? "#10b981" : "#e2e8f0",
                      color: copiedKey === "memo" ? "#fff" : "#334155",
                      border: "none",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    {copiedKey === "memo" ? "✓ Đã chép" : "Chép"}
                  </button>
                </div>
              </div>
            </div>

            <p style={{ margin: "14px 0 0 0", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
              ⚡ <strong>Lưu ý:</strong> Vui lòng quét mã QR hoặc nhập chính xác{" "}
              <strong style={{ color: "#4f46e5" }}>nội dung chuyển khoản</strong> trên. Hệ thống PayOS
              sẽ tự động nhận diện và kích hoạt dịch vụ của bạn trong 5 phút mà không cần thao tác bấm
              nút xác nhận.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
