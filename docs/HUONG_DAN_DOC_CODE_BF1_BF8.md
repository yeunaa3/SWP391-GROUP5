# HƯỚNG DẪN ĐỌC HIỂU SOURCE CODE LUỒNG BF-01 VÀ BF-08
*(Dành riêng cho thành viên mới làm quen với React và Spring Boot)*

---

## LỜI NÓI ĐẦU: REACT VÀ SPRING BOOT "NÓI CHUYỆN" VỚI NHAU NHƯ THẾ NÀO?

Nếu bạn mới chuyển từ lập trình web truyền thống (như PHP thuần, JSP/Servlet) sang mô hình **React SPA + Spring Boot REST API**, hãy ghi nhớ mô hình 3 tầng giao tiếp sau:

```
[ TRÌNH DUYỆT (FRONTEND - REACT) ]
   │
   │ 1. Người dùng bấm nút / mở trang web
   │ 2. React Component kích hoạt useEffect hoặc hàm onClick
   │ 3. Gọi hàm fetch() qua file apiClient.js (kèm Cookie + CSRF token)
   ▼
[ INTERNET / MẠNG NỘI BỘ (HTTP JSON) ]
   │
   │ Endpoint: POST /api/premium/requests
   ▼
[ MÁY CHỦ (BACKEND - SPRING BOOT) ]
   │
   ├─► Controller  : Đón nhận request, kiểm tra quyền đăng nhập (@PreAuthorize)
   ├─► Service     : Xử lý quy tắc nghiệp vụ, tính toán logic (@Transactional)
   └─► Repository  : Viết câu lệnh SQL gửi xuống MySQL (JdbcTemplate)
   ▲
   │ Kết quả trả về (JSON)
[ CƠ SỞ DỮ LIỆU (MYSQL 8.4) ]
```

---

## PHẦN 1: CÁC KHÁI NIỆM CƠ BẢN CẦN BIẾT ĐỂ ĐỌC CODE

### 1. Phía React (Frontend)
- **Component (File `.jsx`)**: Là một khối giao diện web (như một trang, một form, một banner).
- **`useState`**: Biến lưu trạng thái của giao diện. Khi giá trị này thay đổi, React sẽ **tự động vẽ lại (re-render)** phần màn hình đó.
  ```javascript
  const [loading, setLoading] = useState(true); // Biến loading ban đầu = true
  ```
- **`useEffect`**: Đoạn code **tự động chạy** khi màn hình vừa mở lên (mount) hoặc khi một biến phụ thuộc thay đổi. Thường dùng để gọi API lấy dữ liệu ban đầu.
- **`useParams`**: Lấy tham số trên đường dẫn URL (ví dụ: `/premium/packages/:packageId` thì `packageId` lấy từ hook này).
- **`<Link to="...">`**: Thẻ chuyển trang của React Router, chuyển trang tức thì mà không cần load lại toàn bộ website.

### 2. Phía Spring Boot (Backend)
- **`@RestController`**: Đánh dấu class này là nơi tiếp nhận request từ bên ngoài và trả dữ liệu dạng JSON.
- **`@GetMapping` / `@PostMapping`**: Định nghĩa đường dẫn URL và phương thức HTTP tương ứng.
- **`@PreAuthorize("hasRole('...')")`**: Bộ lọc bảo vệ, chỉ cho phép tài khoản có quyền (role) tương ứng được gọi vào.
- **`@Transactional`**: Đảm bảo tất cả các câu lệnh SQL trong hàm chạy thành công 100%. Nếu có lỗi giữa chừng, hệ thống tự động hoàn tác (Rollback), không làm hỏng dữ liệu.
- **`JdbcTemplate`**: Công cụ của Spring giúp chạy câu lệnh SQL thuần (`SELECT`, `INSERT`, `UPDATE`) xuống cơ sở dữ liệu MySQL một cách an toàn và tối ưu hiệu năng.

---

## PHẦN 2: BẢN ĐỒ FILE NGUỒN CỦA 2 LUỒNG

### Luồng BF-01: Mua gói Premium & Kích hoạt Hội viên

| Phân tầng | Đường dẫn file | Vai trò chính |
| :--- | :--- | :--- |
| **FE Page** | `frontend/src/pages/premium/PackagesPage.jsx` | Màn hình `PRE-01`: Xem danh mục tất cả các gói |
| **FE Page** | `frontend/src/pages/premium/PackageDetailPage.jsx` | Màn hình `PRE-02`: Xem chi tiết quyền lợi gói được chọn |
| **FE Page** | `frontend/src/pages/premium/PremiumCheckoutPage.jsx` | Màn hình `PRE-03`: Form cam kết & bấm nút đặt mua |
| **FE Page** | `frontend/src/pages/premium/PremiumRequestsPage.jsx` | Màn hình `PRE-04`: Xem mã VietQR tự động để chuyển khoản |
| **FE Page** | `frontend/src/pages/premium/PremiumReviewPage.jsx` | Màn hình `CFG-03`: Bàn làm việc của Admin duyệt đơn |
| **FE Page** | `frontend/src/pages/premium/MySubscriptionPage.jsx` | Màn hình `PRE-05`: Quản lý gói của tôi, đếm ngược ngày |
| **FE Page** | `frontend/src/pages/premium/TransactionHistoryPage.jsx` | Màn hình `PRE-06`: Danh sách lịch sử giao dịch thanh toán |
| **FE Page** | `frontend/src/pages/premium/ReceiptDetailPage.jsx` | Màn hình `PRE-07`: Biên lai điện tử chi tiết, có nút in hóa đơn |
| **FE Service** | `frontend/src/services/premiumService.js` | Tập hợp các hàm gọi API gửi request sang Backend |
| **BE Controller** | `backend/.../controller/ManualPremiumController.java` | Tiếp nhận và điều phối các API của Premium |
| **BE Service** | `backend/.../service/ManualPremiumService.java` | Chứa logic: kiểm tra đơn trùng, tính ngày gia hạn nối tiếp |
| **BE Repo** | `backend/.../repository/PremiumRequestRepository.java` | Viết câu lệnh SQL thao tác với bảng `premium_requests`, `subscriptions`, `transactions` |
| **Database** | `backend/.../db/migration/V6__manual_premium_requests.sql` | Cấu trúc bảng lưu đơn đăng ký và khoá chống gửi đúp |

---

### Luồng BF-08: Phân phối Quảng cáo & Đo lường Hiệu quả

| Phân tầng | Đường dẫn file | Vai trò chính |
| :--- | :--- | :--- |
| **FE Component** | `frontend/src/components/AdBanner.jsx` | Component hiển thị quảng cáo, tự động đo Impression & Click |
| **FE Page** | `frontend/src/pages/business/PerformancePage.jsx` | Màn hình `BUS-18`, `BUS-19`, `ADM-10`: Xem biểu đồ & xuất CSV |
| **FE Page** | `frontend/src/pages/adManager/ActiveCampaignMonitorPage.jsx` | Màn hình `ADM-09`: Admin giám sát chiến dịch, nút Tạm dừng/Bật |
| **BE Controller** | `backend/.../controller/AdvertisingDataController.java` | Endpoint lấy banner, đếm view, đếm click, đổi trạng thái |
| **BE Service** | `backend/.../service/AdvertisingDataService.java` | Query SQL 5 bảng lọc banner chuẩn, ghi nhận UPSERT vào `ad_metrics` |
| **Database** | `backend/.../db/migration/V2__create_application_schema.sql` | Các bảng `ad_slots`, `ad_campaigns`, `ad_creatives`, `ad_metrics` |

---

## PHẦN 3: ĐỌC CHI TIẾT TỪNG FILE TRONG LUỒNG BF-01 (KÈM GIẢI THÍCH CODE)

### 1. Bước 1: Mở danh sách gói (`PackagesPage.jsx`)
- **Vị trí file**: `frontend/src/pages/premium/PackagesPage.jsx`
- **Cách thức hoạt động**:
  1. Khi mở trang `/premium/packages`, hàm `useEffect` (dòng 17) tự động kích hoạt:
     ```javascript
     getActivePremiumPlans().then(packages => { ... });
     ```
  2. Hàm `getActivePremiumPlans()` nằm trong file `frontend/src/services/premiumService.js` sẽ gọi:
     ```javascript
     apiRequest("/api/subscription-packages");
     ```
  3. Phía Backend, `PublicContentController.java` đón nhận tại `@GetMapping("/subscription-packages")` và gọi `PublicContentService.java` chạy SQL:
     ```sql
     SELECT package_id, code, name, description, price, currency, duration_days, benefits
     FROM subscription_packages WHERE status = 'ACTIVE' ORDER BY display_order;
     ```
  4. Dữ liệu mảng JSON các gói trả về được lưu vào `state.packages`.
  5. Khi render, code kiểm tra xem user hiện tại đã mua gói này chưa:
     ```javascript
     const owned = ownedPremium(premium?.subscriptions, item.id);
     const pending = Number(premium?.pendingPackageId) === Number(item.id);
     ```
     - Nếu `owned = true`: Thẻ hiển thị chữ `✓ ĐÃ MUA GÓI NÀY`.
     - Nếu `pending = true`: Thẻ hiển thị `◷ ĐANG CHỜ DUYỆT`.
  6. **Khi người dùng bấm vào nút trên thẻ**:
     Thẻ `<Link to={pending ? "/premium/payment-result" : "/premium/packages/" + item.id}>`:
     - Nếu chưa mua: Nhảy sang trang chi tiết gói `PRE-02` kèm `packageId` trên URL.

---

### 2. Bước 2: Xem chi tiết gói (`PackageDetailPage.jsx`)
- **Vị trí file**: `frontend/src/pages/premium/PackageDetailPage.jsx`
- **Cách thức hoạt động**:
  1. File sử dụng hook `usePremiumPlan()` (trong file `frontend/src/hooks/usePremiumPlan.js`). Hook này dùng `useParams()` để đọc `packageId` trên URL (ví dụ: số `1`), sau đó tìm gói tương ứng trong danh mục.
  2. Trang hiển thị các thông tin quyền lợi độc quyền (bằng hàm `readingBenefits()`), và tính ngày hết hạn ước tính nếu mua hôm nay (`projectedExpiry(new Date(), plan.durationDays)`).
  3. **Khi người dùng bấm nút "Tiếp tục thanh toán →"**:
     Thẻ `<Link to={"/premium/checkout/" + plan.id}>` kích hoạt, chuyển hướng người dùng sang trang `PRE-03`.

---

### 3. Bước 3: Đăng ký & Gửi yêu cầu mua (`PremiumCheckoutPage.jsx`)
- **Vị trí file**: `frontend/src/pages/premium/PremiumCheckoutPage.jsx`
- **Cách thức hoạt động**:
  1. Trang hiển thị bảng tóm tắt: Tên gói, giá tiền, họ tên và email của tài khoản đang đăng nhập (lấy từ hook `useAuth()`).
  2. Người dùng phải bấm vào checkbox cam kết:
     ```javascript
     <input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
     ```
     Biến `confirmed` chuyển thành `true`, nút gửi đơn mới sáng lên cho phép bấm.
  3. **Khi người dùng bấm nút "Gửi đăng ký — chờ admin duyệt"**:
     Form kích hoạt hàm `submit(event)` (dòng 24-31):
     ```javascript
     async function submit(event) {
       event.preventDefault(); // Chặn trình duyệt reload trang
       setBusy(true);          // Đổi nút thành "Đang gửi..."
       try {
         await submitPremiumRequest(plan.id); // 1. Gọi Backend tạo đơn
         await refreshPremium();              // 2. Cập nhật trạng thái auth của User
         navigate("/premium/payment-result"); // 3. Chuyển sang màn hình quét mã VietQR
       } catch (err) {
         setError(err.message);
       }
     }
     ```
  4. **Backend tiếp nhận thế nào?**
     - Tại `ManualPremiumController.java`:
       ```java
       @PostMapping("/premium/requests")
       public Map<String,Object> submit(@AuthenticationPrincipal user, @RequestBody Submit body) {
           return service.submit(user.id(), body.packageId());
       }
       ```
     - Tại `ManualPremiumService.java` (dòng 18-28):
       - Chạy lệnh `lockActiveUser(userId)` bằng SQL `SELECT ... FOR UPDATE` để tránh 1 user bấm gửi liên tiếp nhiều lần cùng lúc.
       - Kiểm tra nếu tài khoản đang có 1 đơn `PENDING` chưa duyệt thì chặn lại và báo lỗi `409 CONFLICT`.
       - Gọi `repository.create(userId, plan)`: Chèn 1 bản ghi vào bảng `premium_requests` với trạng thái `PENDING`. Đồng thời chèn 2 bản ghi vào bảng `notifications` để gửi chuông báo cho User và Admin.
     - BE trả về JSON: `{"id": 12, "status": "PENDING"}`.
     - Frontend nhận phản hồi, chạy `navigate("/premium/payment-result")`.

---

### 4. Bước 4: Màn hình kết quả & VietQR thanh toán (`PremiumRequestsPage.jsx`)
- **Vị trí file**: `frontend/src/pages/premium/PremiumRequestsPage.jsx`
- **Cách thức hoạt động**:
  1. `useEffect` gọi `getMyPremiumRequests()`, gửi `GET /api/premium/requests`.
  2. Backend trả về danh sách các đơn đăng ký của user này.
  3. **Tự động sinh mã VietQR chuẩn ngân hàng**:
     Tại dòng 30-47:
     ```javascript
     const transferMemo = `THE PLUSE ${row.username} PREMIUM ${row.id}`;
     const qrUrl = paymentConfig.getDynamicQrUrl(row.amount, transferMemo);
     ```
     Giao diện nhúng thẳng link ảnh QR của Napas/VietQR. Khi người dùng mở app ngân hàng quét mã, điện thoại sẽ tự điền sẵn:
     - Số tài khoản nhận
     - Ngân hàng thụ hưởng (MBBank)
     - Số tiền chính xác của gói
     - Nội dung chuyển khoản theo chuẩn `THE PLUSE <USER> PREMIUM <ID>`
  4. Người dùng bấm nút **"Cập nhật trạng thái"**: Giao diện gọi lại API kiểm tra xem Admin đã duyệt hay chưa.

---

### 5. Bước 5: Admin phê duyệt đơn (`PremiumReviewPage.jsx`)
- **Vị trí file**: `frontend/src/pages/premium/PremiumReviewPage.jsx`
- **Cách thức hoạt động**:
  1. Admin đăng nhập và vào đường dẫn `/admin/subscription-packages`.
  2. `useEffect` gọi `getPremiumReviewQueue()` (`GET /api/admin/premium-requests`). Backend lấy danh sách các đơn có trạng thái `PENDING` xếp lên trước.
  3. **Thao tác của Admin**:
     - Bấm nút **"Kiểm tra & xử lý"**: Mở hộp thoại chi tiết của đơn.
     - Admin kiểm tra sao kê ngân hàng xem đã nhận được đúng số tiền với nội dung chuyển khoản đó chưa.
     - Tích vào ô: *"Tôi đã kiểm tra và xác nhận nhận đủ tiền cho yêu cầu này"*.
     - Bấm nút **"Xác nhận thanh toán & cấp gói"**:
       Gọi hàm `reviewPremiumRequest(id, { approve: true, paymentConfirmed: true })`.
  4. **Backend xử lý nghiệp vụ duyệt gói (`ManualPremiumService.java` dòng 43-58)**:
     - Dùng `@Transactional`: Nếu có bất kỳ bước nào lỗi thì hủy toàn bộ, không cấp quyền sai.
     - Khóa bản ghi đơn bằng `FOR UPDATE`.
     - **Tính toán ngày gia hạn nối tiếp**:
       ```java
       Instant previousEnd = repository.latestExpiry(userId);
       Instant start = (previousEnd != null && previousEnd.isAfter(now)) ? previousEnd : now;
       Instant end = start.plus(days, ChronoUnit.DAYS);
       ```
       *Ý nghĩa*: Nếu độc giả đang có gói cũ còn hạn 10 ngày nữa mới hết, thì gói mới được cộng tiếp từ ngày thứ 10 trở đi, không bị mất ngày cũ!
     - Kích hoạt trong CSDL (`PremiumRequestRepository.java`):
       1. `INSERT INTO subscriptions`: Tạo gói mới có trạng thái `ACTIVE`.
       2. `INSERT INTO transactions`: Ghi nhận biên lai thanh toán thành công `SUCCESS`.
       3. `INSERT IGNORE INTO user_roles`: Cấp thêm quyền `ROLE_SUBSCRIBER` cho user.
       4. `UPDATE premium_requests`: Đổi trạng thái đơn thành `APPROVED`.
       5. `INSERT INTO notifications`: Gửi thông báo đến tài khoản độc giả: *"Gói Premium của bạn đã được kích hoạt"*.

---

### 6. Bước 6, 7, 8: Quản lý gói, Xem lịch sử và In biên lai
- **`MySubscriptionPage.jsx` (`PRE-05`)**:
  - Gọi `/api/premium/access`, tính toán số ngày còn lại bằng công thức:
    `daysLeft = Math.ceil((new Date(endAt) - new Date()) / (1000 * 60 * 60 * 24))`.
  - Hiển thị thông báo màu xanh `✓ Đang hoạt động`.
- **`TransactionHistoryPage.jsx` (`PRE-06`)**:
  - Gọi `GET /api/premium/transactions` để xem danh sách các lần trả tiền thành công.
  - Trên mỗi hàng có link `<Link to={"/premium/transactions/" + item.id}>Xem biên lai →</Link>`.
- **`ReceiptDetailPage.jsx` (`PRE-07`)**:
  - Dùng `useParams()` lấy `transactionId` từ đường dẫn URL.
  - Gọi `GET /api/premium/transactions/{id}` để hiển thị chi tiết biên lai thuế/dịch vụ điện tử.
  - Có nút **"In biên lai"**: Khi bấm sẽ chạy lệnh JavaScript chuẩn `window.print()` để mở hộp thoại in của trình duyệt.

---

## PHẦN 4: ĐỌC CHI TIẾT TỪNG FILE TRONG LUỒNG BF-08

### 1. Hiển thị Banner & Tự động tắt khi có Premium (`AdBanner.jsx`)
- **Vị trí file**: `frontend/src/components/AdBanner.jsx`
- **Cách thức hoạt động**:
  1. Component này được nhúng ở nhiều nơi:
     - Trang chủ: `<AdBanner position="HOME_HERO" />`
     - Chi tiết bài báo: `<AdBanner position="ARTICLE_TOP" />`, `<AdBanner position="IN_ARTICLE" />`
  2. **Cơ chế ẩn quảng cáo cho độc giả VIP**:
     Đầu file có đoạn code kiểm tra:
     ```javascript
     const { showAdvertising } = useReaderPolicy();
     if (!banner || !showAdvertising || premiumLoading || loading) return null;
     ```
     - Khi độc giả đã được duyệt Premium ở BF-01, biến `showAdvertising` sẽ mang giá trị `false`.
     - Lệnh `return null` khiến React dừng lại ngay lập tức, không vẽ thẻ quảng cáo, không tốn tài nguyên tải ảnh.
  3. **Lấy banner từ Backend**:
     `useEffect` gọi `GET /api/advertising/banners?position=HOME_HERO`.
     Tại `AdvertisingDataService.java`, câu lệnh SQL kiểm tra đồng thời 5 điều kiện:
     - Vị trí slot đang hoạt động (`s.status = 'ACTIVE'`).
     - Ảnh banner đã được duyệt (`cr.status = 'APPROVED'`).
     - Chiến dịch đang chạy (`c.status = 'ACTIVE'`).
     - Hợp đồng của công ty đã trả tiền (`ct.payment_status = 'PAID'`).
     - Ngày giờ hiện tại nằm đúng trong khoảng hợp đồng có hiệu lực.

---

### 2. Ghi nhận lượt xem (Impression) không bị đếm trùng
- **Vị trí file**: `frontend/src/components/AdBanner.jsx` (dòng 38-50)
- **Cách thức hoạt động**:
  - Để tránh việc 1 người xem bị hệ thống đếm thành nhiều lượt (do React re-render), lập trình viên dùng:
    ```javascript
    const trackedImpressions = useRef(new Set());
    ```
  - Khi banner hiển thị, hàm kiểm tra:
    ```javascript
    if (!trackedImpressions.current.has(creativeId)) {
      trackedImpressions.current.add(creativeId); // Đánh dấu ID này đã đếm rồi
      fetch("/api/advertising/events/impression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creativeId }),
      });
    }
    ```
  - Phía Backend (`AdvertisingDataService.java`), câu lệnh SQL sử dụng cơ chế **UPSERT nguyên tử**:
    ```sql
    INSERT INTO ad_metrics (creative_id, metric_date, impressions_count, clicks_count, invalid_clicks_count, delivery_errors_count)
    VALUES (?, CURRENT_DATE, 1, 0, 0, 0)
    ON DUPLICATE KEY UPDATE impressions_count = impressions_count + 1;
    ```
    - Nếu hôm nay chưa có dòng nào của banner này: Thêm mới với `impressions_count = 1`.
    - Nếu đã có dòng của ngày hôm nay: Cộng thêm 1 vào `impressions_count`.
    - Cách này giúp database chạy cực nhanh, không bao giờ bị lỗi khóa chết (deadlock) khi có hàng ngàn người đọc cùng lúc.

---

### 3. Click vào Banner & Chuyển hướng an toàn
- **Vị trí file**: `frontend/src/components/AdBanner.jsx` (dòng 62-75)
- **Cách thức hoạt động**:
  1. Thẻ `<a>` bọc ngoài banner có đường link trỏ về:
     ```javascript
     const clickUrl = `/api/advertising/click/${banner.id}`;
     <a href={clickUrl} target="_blank">...</a>
     ```
  2. Khi người dùng bấm chuột, trình duyệt gửi request `GET /api/advertising/click/{creativeId}` sang Backend.
  3. Phía Backend, `AdvertisingDataController.java` gọi `service.recordClickAndGetTargetUrl(creativeId)`:
     - Chạy lệnh SQL tăng `clicks_count = clicks_count + 1` trong bảng `ad_metrics`.
     - Tìm link website của nhà tài trợ: `SELECT target_url FROM ad_creatives WHERE creative_id = ?`.
     - Gửi lệnh điều hướng: `response.sendRedirect(targetUrl)`.
  4. Trình duyệt tự động mở website của khách hàng quảng cáo ở tab mới.

---

### 4. Màn hình Báo cáo & Xuất file CSV (`PerformancePage.jsx`)
- **Vị trí file**: `frontend/src/pages/business/PerformancePage.jsx`
- **Cách thức hoạt động**:
  1. Khi mở trang `/business/performance` hoặc `/ad-manager/reports`:
     `useEffect` gọi `GET /api/advertising/performance`.
  2. Backend kiểm tra:
     - Nếu người đăng nhập là Admin/Ad Manager: Cho phép xem số liệu của tất cả các chiến dịch trong hệ thống.
     - Nếu là Doanh nghiệp (Business): Bổ sung điều kiện SQL `WHERE ct.company_id = user.company_id`, tuyệt đối không cho công ty A nhìn thấy số liệu của công ty B.
  3. **Vẽ biểu đồ vector động (SVG)**:
     File không dùng thư viện nặng như Chart.js mà tự vẽ trực tiếp bằng thẻ `<svg>`, `<path>` và `<rect>`.
     - Người dùng bấm nút **"Biểu đồ cột"** hoặc **"Biểu đồ đường"**: State `type` đổi giữa `"bar"` và `"line"`, biểu đồ tự đổi dạng ngay lập tức.
     - Người dùng di chuột qua các ngày: State `hover` lưu vị trí ngày, ô thống kê cập nhật chi tiết số lượt xem và số click của ngày đó.
  4. **Nút "Xuất CSV" (Export CSV)**:
     Tại dòng 27-31:
     - Hàm gom toàn bộ mảng dữ liệu đang lọc trên màn hình thành chuỗi văn bản phân tách bằng dấu phẩy.
     - Chèn ký tự `\ufeff` ở đầu chuỗi (đây là mã UTF-8 BOM, giúp phần mềm Microsoft Excel nhận diện tiếng Việt có dấu, không bị lỗi font ô vuông hay ký tự lạ).
     - Tạo link ảo và tự động tải file `the-pulse-performance.csv` về máy tính người dùng.

---

### 5. Admin Giám sát & Bật/Tắt chiến dịch (`ActiveCampaignMonitorPage.jsx`)
- **Vị trí file**: `frontend/src/pages/adManager/ActiveCampaignMonitorPage.jsx`
- **Cách thức hoạt động**:
  1. Trang này dành riêng cho Ad Manager (`/ad-manager/campaign-monitor`).
  2. Hiển thị danh sách tất cả các chiến dịch kèm thanh đo tiến độ (% số lượt hiển thị thực tế so với Hạn mức Quota trong hợp đồng).
  3. **Nút "Tạm dừng" / "Kích hoạt lại"**:
     - Khi Ad Manager bấm nút, hàm `handleToggleStatus(campaign)` chạy:
       1. Bật cửa sổ xác nhận của trình duyệt: `window.confirm(...)`.
       2. Nếu chọn OK, gọi `POST /api/advertising/campaigns/{id}/toggle-status`.
     - Backend xử lý (`AdvertisingDataService.java` dòng 123-143):
       ```java
       if ("ACTIVE".equalsIgnoreCase(currentStatus)) nextStatus = "PAUSED";
       else if ("PAUSED".equalsIgnoreCase(currentStatus)) nextStatus = "ACTIVE";
       jdbc.update("UPDATE ad_campaigns SET status = ? WHERE campaign_id = ?", nextStatus, campaignId);
       ```
     - **Kết quả thực tế**: Ngay khi status chuyển thành `PAUSED`, câu SQL ở trang chủ sẽ tự động lọc bỏ banner này, quảng cáo lập tức biến mất khỏi trang tin mà không cần khởi động lại máy chủ!

---

## PHẦN 5: BÍ KÍP DEBUG KHI GẶP LỖI (DÀNH CHO NGƯỜI MỚI)

Khi bạn chạy thử nghiệm mà chức năng không chạy như ý, hãy kiểm tra theo thứ tự 3 bước sau:

### Bước 1: Mở F12 trên trình duyệt (Tab Network và Console)
- Bấm `F12` trên Chrome / Edge, chọn tab **Console**: Xem có lỗi màu đỏ liên quan đến React hoặc biến `undefined` không.
- Chọn tab **Network** -> chọn lọc **Fetch/XHR**:
  - Khi bạn bấm một nút (ví dụ nút "Gửi đăng ký"), kiểm tra xem có dòng request nào xuất hiện không.
  - Xem cột **Status**:
    - `200` hoặc `204`: Backend xử lý thành công.
    - `401 Unauthorized`: Chưa đăng nhập hoặc cookie phiên đã hết hạn.
    - `403 Forbidden`: Tài khoản không đủ quyền (ví dụ Reader cố gọi API của Admin, hoặc thiếu token CSRF).
    - `404 Not Found`: Sai đường dẫn URL endpoint.
    - `409 Conflict`: Vi phạm quy tắc nghiệp vụ (ví dụ đã có đơn chờ duyệt).
    - `500 Internal Server Error`: Lỗi sập code Java ở Backend.

### Bước 2: Xem chi tiết phản hồi của Backend
- Bấm thẳng vào dòng request bị lỗi trong tab **Network** -> Chọn tab con **Response**:
  Backend của dự án luôn trả về JSON chứa câu thông báo lỗi chi tiết bằng tiếng Việt, ví dụ:
  ```json
  {
    "status": 409,
    "message": "Bạn đã có yêu cầu chờ duyệt. Vui lòng đợi admin xử lý trước khi đổi gói."
  }
  ```

### Bước 3: Xem cửa sổ Terminal chạy Spring Boot
- Nếu gặp lỗi `500`, hãy nhìn vào màn hình console đang chạy `mvn spring-boot:run`:
  Spring Boot sẽ in ra toàn bộ cây báo lỗi (Stack Trace) và chỉ rõ chính xác lỗi ở file Java nào, dòng số bao nhiêu.

---

*Tài liệu này được biên soạn trực tiếp dựa trên mã nguồn thực tế của dự án SWP391-GROUP5. Bạn có thể mở đồng thời file hướng dẫn này và VS Code để vừa đọc vừa đối chiếu trực tiếp vào từng dòng code.*
