# CẨM NANG VẤN ĐÁP CẤP TỐC - BÙI QUANG CƯỜNG (SWP391 - THE PULSE)
> **MỤC TIÊU DUY NHẤT:** Thầy hỏi đâu là mở được file và dòng code đó trong **1 ĐẾN 2 GIÂY**, không bao giờ bị rối hay mất thời gian tìm kiếm nữa!

---

## ⚡ PHÍM TẮT THẦN THÁNH MỞ FILE SIÊU TỐC
Trong VS Code hoặc IntelliJ IDEA:
* **VS Code:** Bấm tổ hợp phím **`Ctrl + P`**
* **IntelliJ:** Bấm liên tiếp **2 lần phím `Shift`** (Double Shift)

| Bạn muốn mở | Chỉ cần gõ vào ô tìm kiếm | Các file lập tức hiện ra |
| :--- | :--- | :--- |
| **Luồng 1 (Premium)** | **`BF1`** hoặc **`1`** | `BF1_PremiumController`, `BF1_PremiumService`, `BF1_PremiumRepository` |
| **Luồng 8 (Banner & Click tặc)** | **`BF8`** hoặc **`8`** | `BF8_AdServingController`, `BF8_AdServingService` |
| **Luồng 9 (Giám sát & Tự động)** | **`BF9`** hoặc **`9`** | `BF9_AdMonitorController`, `BF9_AdMonitorService`, `BF9_AdMetricsScheduler` |

---

## 1. LUỒNG 1 (BF-01): THUÊ BAO PREMIUM & DUYỆT GÓI (C2B)

### 📂 Bộ 3 file độc quyền của bạn:
1. **Controller (Tiếp nhận HTTP):** [`BF1_PremiumController.java`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/controller/BF1_PremiumController.java)
2. **Service (Xử lý nghiệp vụ):** [`BF1_PremiumService.java`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/service/BF1_PremiumService.java)
3. **Repository (Truy vấn DB):** [`BF1_PremiumRepository.java`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/repository/BF1_PremiumRepository.java)

### 🎯 Các điểm then chốt trả lời thầy:
* **Hỏi: "Khi khách bấm Mua gói, code chạy vào đâu?"**
  * **Mở:** `BF1_PremiumController.java` $\rightarrow$ hàm `submit()` (POST `/api/premium/requests`).
  * Gọi sang `BF1_PremiumService.java` $\rightarrow$ hàm `submit()`:
    1. Kiểm tra tài khoản có đang hoạt động không qua `repository.lockActiveUser(userId)`.
    2. Kiểm tra nếu đang có đơn `PENDING` cùng gói thì trả về ID cũ; nếu đổi gói khác thì tự động `cancel` đơn cũ để tạo đơn mới.
* **Hỏi: "Cơ chế chống spam bấm liên tục tạo nhiều đơn PENDING của em là gì?"**
  * **Mở:** `BF1_PremiumRepository.java` $\rightarrow$ hàm `create()`.
  * **Trả lời điểm 10:** Ở tầng DB, em tạo **cột ảo sinh tự động (Conditional Virtual Column)**:
    `pending_user_id GENERATED ALWAYS AS (CASE WHEN status = 'PENDING' THEN user_id ELSE NULL END) STORED` kết hợp `UNIQUE KEY (pending_user_id)`. Nhờ đó MySQL cưỡng chế tại tầng storage: mỗi user chỉ có thể tồn tại **duy nhất 1 bản ghi PENDING** cùng lúc. Dù spam 100 request/giây cũng không bao giờ bị duplicate!
* **Hỏi: "Admin duyệt gói ở đâu? Nếu khách mua tiếp khi gói cũ chưa hết hạn thì tính sao?"**
  * **Mở:** `BF1_PremiumService.java` $\rightarrow$ hàm `review()`.
  * **Logic nối hạn:** 
    ```java
    Instant previousEnd = repository.latestExpiry(request.userId());
    Instant start = (previousEnd != null && previousEnd.isAfter(now)) ? previousEnd : now;
    Instant end = start.plus(request.plan().days(), ChronoUnit.DAYS);
    ```
    Khách không bao giờ bị mất ngày cũ! Gói mới sẽ bắt đầu nối tiếp ngay thời điểm gói cũ hết hạn!
* **Hỏi: "Em khóa giao dịch thế nào để tránh 2 Admin cùng duyệt 1 đơn?"**
  * **Mở:** `BF1_PremiumRepository.java` $\rightarrow$ hàm `lockRequest()`:
    `SELECT * FROM premium_requests WHERE request_id=? FOR UPDATE`. Khóa bi quan hàng (row-level pessimistic lock).
* **Hỏi: "Admin quản lý danh mục gói cước (Thêm, Sửa, Bật/Tắt, Xóa) ở đâu?"**
  * **Mở:** `BF1_PremiumController.java` & `BF1_PremiumService.java` $\rightarrow$ các hàm:
    * `listAdminPackages()` (GET `/api/admin/packages`): Lấy toàn bộ gói
    * `createPackage()` (POST `/api/admin/packages`): Tạo gói mới
    * `updatePackage()` (PUT `/api/admin/packages/{id}`): Sửa giá, thời hạn, tên
    * `togglePackageStatus()` (PATCH `/api/admin/packages/{id}/toggle`): Bật/Tắt `ACTIVE` $\Leftrightarrow$ `INACTIVE`
    * `deletePackage()` (DELETE `/api/admin/packages/{id}`): **Xóa thông minh (Smart Delete)**
* **Hỏi: "Cơ chế Xóa thông minh (Smart Delete) của gói cước hoạt động ra sao?"**
  * **Mở:** `BF1_PremiumRepository.java` $\rightarrow$ hàm `deletePackage()`:
    * **Nếu gói test chưa có ai mua:** Chạy lệnh `DELETE FROM subscription_packages WHERE package_id = ?` (Xóa hẳn vĩnh viễn khỏi DB).
    * **Nếu gói đã có người mua trong lịch sử:** Chạy lệnh `UPDATE subscription_packages SET status = 'INACTIVE'` (Soft Delete) để bảo toàn khóa ngoại `ON DELETE RESTRICT` với bảng `subscriptions` và bảo toàn chứng từ kế toán.

---

## 2. LUỒNG 8 (BF-08): PHÂN PHỐI BANNER QUẢNG CÁO & CHỐNG CLICK TẶC

### 📂 Bộ 2 file độc quyền của bạn:
1. **Controller (Tiếp nhận HTTP):** [`BF8_AdServingController.java`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/controller/BF8_AdServingController.java)
2. **Service (Xử lý nghiệp vụ):** [`BF8_AdServingService.java`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/service/BF8_AdServingService.java)

### 🎯 Các điểm then chốt trả lời thầy:
* **Hỏi: "Banner quảng cáo được lấy ra như thế nào? Có targeting không?"**
  * **Mở:** `BF8_AdServingController.java` $\rightarrow$ hàm `banners()` (GET `/api/advertising/banners`).
  * Gọi sang `BF8_AdServingService.java` $\rightarrow$ hàm `banners(...)`:
    * Query lọc banner hợp lệ: `status = 'ACTIVE'`, hợp đồng `PAID`, thời gian nằm trong `[scheduled_start_time, scheduled_end_time]`.
    * Hỗ trợ targeting theo: Vị trí (`position`), Thiết bị (`DESKTOP/MOBILE/TABLET` qua User-Agent), Quốc gia (`country` qua Locale trình duyệt), Chuyên mục bài báo (`articleId`).
    * Có cơ chế tự động xoay vòng carousel 6.5s trên Frontend (`ArticleBannerCarousel.jsx`).
* **Hỏi: "Lượt xem (Impression) được tính khi nào? Có sợ gian lận không?"**
  * **Mở:** `BF8_AdServingController.java` $\rightarrow$ hàm `impression()` (POST `/api/advertising/events/impression`).
  * **Trả lời:** Tuân thủ chuẩn quốc tế **IAB**: Trên Frontend dùng `IntersectionObserver`, banner phải nhìn thấy ít nhất **50% diện tích** và duy trì liên tục trên **1 giây** thì mới gửi request ghi nhận.
* **Hỏi: "Click tặc (Click Fraud) được chống như thế nào?"**
  * **Mở:** `BF8_AdServingService.java` $\rightarrow$ hàm `recordEvent()`.
  * **Trả lời điểm 10:** 
    1. Sử dụng kỹ thuật **Băm vân tay (Fingerprint SHA-256)** kết hợp: `session + creativeId + time_bucket (cửa sổ 2 giây)`:
       ```java
       String fingerprint = hash(session + ":" + creativeId + ":" + (System.currentTimeMillis() / 2000));
       ```
    2. Nếu một người bấm liên tục trong 2 giây $\rightarrow$ hệ thống phát hiện trùng fingerprint:
       * Vẫn chuyển hướng trình duyệt của độc giả (để trải nghiệm mượt mà không lỗi).
       * Nhưng bản ghi trong `ad_events` được lưu là `is_valid = FALSE`, kèm lý do `invalid_reason = 'RAPID_CLICK_DUPLICATE'`.
       * Tăng chỉ số `invalid_clicks_count` trong bảng `ad_metrics`. Doanh nghiệp không bị trừ tiền oan!

---

## 3. LUỒNG 9 (BF-09): GIÁM SÁT HIỆU SUẤT & TỰ ĐỘNG HÓA SCHEDULER

### 📂 Bộ 3 file độc quyền của bạn:
1. **Controller (Tiếp nhận HTTP):** [`BF9_AdMonitorController.java`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/controller/BF9_AdMonitorController.java)
2. **Service (Xử lý nghiệp vụ):** [`BF9_AdMonitorService.java`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/service/BF9_AdMonitorService.java)
3. **Scheduler (Tự động hóa định kỳ):** [`BF9_AdMetricsScheduler.java`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/service/BF9_AdMetricsScheduler.java)

### 🎯 Các điểm then chốt trả lời thầy:
* **Hỏi: "Tính năng khẩn cấp UC-39 của em là gì? Nằm ở đâu?"**
  * **Mở:** `BF9_AdMonitorController.java` $\rightarrow$ hàm `toggleStatus()` (POST `/api/advertising/campaigns/{id}/toggle-status`).
  * Gọi sang `BF9_AdMonitorService.java` $\rightarrow$ hàm `toggleCampaignStatus()`:
    * Chuyển đổi trạng thái hai chiều: `ACTIVE` $\Leftrightarrow$ `PAUSED` ngay lập tức trên giao diện ADM-09 (`ActiveCampaignMonitorPage.jsx`).
    * Dùng khi có sự cố kỹ thuật, yêu cầu đối tác hoặc rà soát nội dung banner.
* **Hỏi: "Hệ thống tự động hóa cái gì trong phần của em?"**
  * **Mở:** `BF9_AdMetricsScheduler.java`.
  * Có 2 Job tự động định kỳ:
    1. **JOB-04 (`reconcileMetrics`):** Quét raw event `ad_events` đối soát và đẩy vào bảng tổng hợp `ad_metrics` bằng câu lệnh MySQL hiệu năng cao:
       ```sql
       INSERT INTO ad_metrics (...) VALUES (...)
       ON DUPLICATE KEY UPDATE 
           impressions_count = VALUES(impressions_count),
           clicks_count = VALUES(clicks_count),
           invalid_clicks_count = VALUES(invalid_clicks_count)
       ```
    2. **JOB-06 (`finalizeCompletedCampaigns`):** Tự động quét các chiến dịch đã hết hạn (`scheduled_end_time <= NOW`) hoặc đạt đủ số lượt xem mua theo hợp đồng (`total_impressions >= quota`):
       * Khóa dòng bằng `FOR UPDATE`.
       * Đổi trạng thái sang `COMPLETED`.
       * Sinh báo cáo kiểm toán bất biến vào `campaign_activity`.
       * Gửi thông báo hoàn tất tự động vào bảng `notifications` cho Doanh nghiệp.

---

## 4. TỔNG HỢP NHANH CÁC CÂU LỆNH SQL ĐỈNH CAO CỦA CƯỜNG

1. **Khóa bi quan chống tranh chấp tài nguyên (Pessimistic Locking):**
   * `SELECT * FROM premium_requests WHERE request_id=? FOR UPDATE` (Luồng 1)
   * `SELECT cr.target_url ... FROM ad_creatives ... FOR UPDATE` (Luồng 8)
   * `SELECT c.campaign_id ... FROM ad_campaigns ... FOR UPDATE` (Luồng 9)
2. **Xử lý xung đột ghi (Upsert):**
   * `INSERT INTO ad_metrics ... ON DUPLICATE KEY UPDATE impressions_count = impressions_count + VALUES(...)` (Luồng 8 & 9)
3. **Cột ảo Conditional Virtual Column + Unique Key chống spam duplicate:**
   * `pending_user_id GENERATED ALWAYS AS (CASE WHEN status = 'PENDING' THEN user_id ELSE NULL END) STORED` (Luồng 1)
