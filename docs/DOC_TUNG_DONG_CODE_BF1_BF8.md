# GIÁO TRÌNH ĐỌC TỪNG DÒNG CODE CHI TIẾT (A ĐẾN Z) - LUỒNG BF-01 VÀ BF-08
*(Tài liệu "vỡ lòng": Đi qua từng dòng code, giải thích từng từ khóa như đang học một ngôn ngữ mới)*

---

# TỪ ĐIỂN NHANH DÀNH CHO NGƯỜI MỚI BẮT ĐẦU

Trước khi vào từng dòng code, bạn hãy coi đây là bảng chữ cái:

### 1. Phía React (JavaScript):
- `import A from "B"`: Mượn tính năng tên là `A` từ thư viện hoặc file `B`.
- `export default function C()`: Xuất hàm `C` này ra để các file khác trong dự án có thể gọi tới.
- `const`: Khai báo một hằng số (biến có giá trị cố định, không được gán lại bằng dấu `=` khác).
- `let`: Khai báo một biến có thể thay đổi giá trị (như `let alive = true; alive = false;`).
- `() => {}` (Arrow Function - Hàm mũi tên): Cách viết hàm ngắn gọn của JavaScript hiện đại.
- `async / await`: Dùng khi làm việc với mạng (gọi API). `await` nghĩa là: *"Hãy đợi máy chủ trả lời xong rồi mới chạy tiếp dòng bên dưới, không được chạy vội"*.
- `try { ... } catch (e) { ... }`: Thử làm việc trong `try`. Nếu mạng mất hoặc máy chủ lỗi thì nhảy vào `catch` để xử lý, không làm sập chương trình.
- `return ( ... )`: Trong React, sau chữ `return` chính là giao diện HTML (JSX) được vẽ ra màn hình.

### 2. Phía Spring Boot (Java):
- `package ...`: Địa chỉ thư mục chứa file Java này.
- `@RestController`: Đánh dấu class này là nơi tiếp nhận request từ Web gửi lên và trả về dữ liệu JSON.
- `@RequestMapping("/api")`: Tiền tố đường dẫn chung cho tất cả các hàm trong file này.
- `public record TenClass(...) {}`: Khuôn mẫu tạo class chứa dữ liệu siêu ngắn gọn (chỉ 1 dòng) từ Java 14 trở lên.
- `@Transactional`: Đảm bảo an toàn CSDL: nếu trong hàm có 5 câu lệnh SQL mà câu thứ 5 bị lỗi thì 4 câu trước tự động hủy (Rollback), không làm hỏng dữ liệu.
- `var`: Java tự động đoán kiểu dữ liệu của biến dựa vào giá trị gán phía sau.

---

# PHẦN 1: MỔ XẺ TỪNG DÒNG CODE LUỒNG BF-01 (MUA PREMIUM)

Chúng ta sẽ chọn 3 file trái tim của luồng BF-01 và đi qua **TỪNG DÒNG MỘT (Line by Line)**:
1. Frontend: [`PremiumCheckoutPage.jsx`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/frontend/src/pages/premium/PremiumCheckoutPage.jsx) (Màn hình đặt mua)
2. Backend Controller: [`ManualPremiumController.java`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/controller/ManualPremiumController.java) (Đón request)
3. Backend Service: [`ManualPremiumService.java`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/service/ManualPremiumService.java) (Xử lý nghiệp vụ & CSDL)

---

## TẬP 1: FILE FRONTEND - `PremiumCheckoutPage.jsx`

File này nằm tại `frontend/src/pages/premium/PremiumCheckoutPage.jsx`.

```javascript
1: import { useState } from "react";
```
- **Giải thích**: Mượn hàm `useState` từ thư viện `react` để tạo bộ nhớ lưu trạng thái cho màn hình này.

```javascript
2: import { Link, useNavigate } from "react-router-dom";
```
- **`Link`**: Thẻ chuyển trang (thay thế thẻ `<a href>`).
- **`useNavigate`**: Chiếc "vô lăng" giúp chuyển hướng trang web bằng code (ví dụ: gửi đơn xong thì tự nhảy trang).

```javascript
3: import { useAuth } from "../../store/AuthContext.jsx";
```
- **Giải thích**: Mượn hàm `useAuth` để lấy thông tin: ai đang đăng nhập, email là gì.

```javascript
4: import { usePreferences } from "../../store/PreferencesContext.jsx";
```
- **Giải thích**: Lấy ngôn ngữ hiển thị (tiếng Việt hay tiếng Anh).

```javascript
5: import { submitPremiumRequest } from "../../services/premiumService.js";
```
- **Giải thích**: Mượn hàm gửi request `POST` sang Backend.

```javascript
6: import { PlanState } from "./PackageDetailPage.jsx";
7: import PremiumMembership from "../../components/PremiumMembership.jsx";
8: import { ownedPremium } from "../../utils/premiumAccess.js";
9: import usePremiumPlan from "../../hooks/usePremiumPlan.js";
10: import { money } from "../../utils/premium.js";
11: import "../../assets/premium.css";
```
- **Dòng 6-11**: Nạp các Component con, hàm format tiền tệ VNĐ `money()`, hook lấy chi tiết gói `usePremiumPlan`, và file giao diện CSS.

```javascript
13: export default function PremiumCheckoutPage() {
```
- **Giải thích**: Bắt đầu định nghĩa Component màn hình Checkout.

```javascript
14:   const state = usePremiumPlan();
```
- **Giải thích**: Đọc `packageId` trên thanh URL (ví dụ: `/premium/checkout/1`) và lấy thông tin gói số 1 lưu vào biến `state`.

```javascript
15:   const { user, premium, premiumLoading, premiumError, refreshPremium } = useAuth();
```
- **Giải thích**: Bóc tách dữ liệu từ `useAuth()`: lấy `user` (người dùng), `premium` (gói hiện tại), `refreshPremium` (hàm làm mới dữ liệu).

```javascript
16:   const { t } = usePreferences();
```
- **Giải thích**: Lấy hàm dịch đa ngôn ngữ `t()`.

```javascript
17:   const navigate = useNavigate();
```
- **Giải thích**: Khởi tạo chiếc "vô lăng" chuyển trang vào biến `navigate`.

```javascript
18:   const [confirmed, setConfirmed] = useState(false);
```
- **Giải thích**: Tạo biến nhớ `confirmed`. Ban đầu là `false` (người dùng chưa tích vào ô đồng ý điều khoản).

```javascript
19:   const [busy, setBusy] = useState(false);
```
- **Giải thích**: Tạo biến nhớ `busy` (bận). Ban đầu là `false`. Khi bấm gửi sẽ đổi thành `true` để khóa nút lại, chống bấm 2 lần.

```javascript
20:   const [error, setError] = useState("");
```
- **Giải thích**: Tạo biến nhớ `error` để chứa câu chữ báo lỗi nếu Backend trả về lỗi.

```javascript
21:   if (!state.plan) return <PlanState {...state} />;
```
- **Giải thích**: Nếu chưa tìm thấy gói (đang tải hoặc gói không tồn tại) thì vẽ màn hình chờ `PlanState`.

```javascript
22:   const { plan } = state;
```
- **Giải thích**: Lấy thông tin gói cước ra biến `plan` để dùng cho tiện.

```javascript
23:   const owned = ownedPremium(premium?.subscriptions, plan.id);
```
- **Giải thích**: Kiểm tra xem tài khoản này đã từng mua gói này và còn hạn hay không.

```javascript
24:   async function submit(event) {
```
- **Giải thích**: Bắt đầu định nghĩa hàm `submit` xử lý khi người dùng ấn nút đặt mua. Chữ `async` báo hiệu bên trong có thao tác mạng.

```javascript
25:     event.preventDefault();
```
- **Giải thích**: Chặn trình duyệt không được tự tiện reload (tải lại) trang web.

```javascript
26:     if (!confirmed || busy || premiumLoading || premiumError || premium?.pendingPackageId) return;
```
- **Giải thích**: Vòng bảo vệ an toàn: Nếu chưa tích checkbox (`!confirmed`), hoặc đang bận gửi (`busy`), hoặc đang có đơn chờ duyệt $\rightarrow$ Dừng lại ngay (`return`), không làm gì cả.

```javascript
27:     setBusy(true); setError("");
```
- **Giải thích**: Bật trạng thái bận lên (`busy = true`), xóa sạch câu báo lỗi cũ.

```javascript
28:     try { await submitPremiumRequest(plan.id); await refreshPremium(); navigate("/premium/payment-result"); }
```
- **Giải thích cực kỳ quan trọng**:
  - `await submitPremiumRequest(plan.id)`: Bắn gói tin HTTP `POST /api/premium/requests` sang Backend và **đứng chờ** Backend trả lời.
  - `await refreshPremium()`: Backend trả lời xong, bắt `AuthContext` cập nhật lại thông tin mới.
  - `navigate("/premium/payment-result")`: Lập tức bẻ lái chuyển hướng màn hình sang trang xem mã VietQR (`PRE-04`)!

```javascript
29:     catch (failure) { setError(failure.message); }
```
- **Giải thích**: Nếu Backend báo lỗi (ví dụ lỗi 409 do đã có đơn), lưu câu báo lỗi vào biến `error`.

```javascript
30:     finally { setBusy(false); }
31:   }
```
- **Giải thích**: Dù thành công hay thất bại thì cuối cùng cũng tắt trạng thái bận (`busy = false`).

---

## TẬP 2: FILE BACKEND CONTROLLER - `ManualPremiumController.java`

File này nằm tại `backend/src/main/java/com/group5/premiumnews/controller/ManualPremiumController.java`.

```java
1: package com.group5.premiumnews.controller;
```
- **Giải thích**: Khai báo địa chỉ thư mục của file.

```java
15: @RestController
```
- **Giải thích**: Báo cho Spring Boot biết class này chuyên tiếp nhận request từ Frontend và trả về dữ liệu dạng JSON.

```java
16: @RequestMapping("/api")
```
- **Giải thích**: Mọi đường dẫn trong file này đều bắt đầu bằng chữ `/api`.

```java
17: public class ManualPremiumController {
```
- **Giải thích**: Bắt đầu định nghĩa class Controller quản lý Premium thủ công.

```java
18:     public record Submit(@NotNull @Positive Long packageId) {}
```
- **Giải thích**: Tạo khuôn mẫu dữ liệu hứng từ React: phải có `packageId`, không được rỗng (`@NotNull`) và phải là số dương (`@Positive`).

```java
19:     public record Review(boolean approve, boolean paymentConfirmed, @Size(max = 500) String note) {}
```
- **Giải thích**: Khuôn mẫu dữ liệu khi Admin duyệt: cờ đồng ý (`approve`), cờ xác nhận tiền đã về (`paymentConfirmed`), ghi chú tối đa 500 ký tự.

```java
20:     private final ManualPremiumService service;
21:     public ManualPremiumController(ManualPremiumService service) { this.service = service; }
```
- **Giải thích**: Tiêm (Inject) lớp `ManualPremiumService` vào để tí nữa giao việc xử lý.

```java
27:     @PostMapping("/premium/requests")
```
- **Giải thích**: Đón nhận request gửi bằng phương thức `POST` tại đường dẫn `/api/premium/requests` (chính là request mà file React gửi sang ở dòng 28 ở trên!).

```java
28:     @PreAuthorize("hasAnyRole('READER','SUBSCRIBER')")
```
- **Giải thích**: Vòng bảo vệ an ninh: Chỉ ai có vai trò `READER` (Độc giả) hoặc `SUBSCRIBER` (Hội viên) mới được phép gọi vào đây. Hacker hay khách vãng lai gọi vào sẽ bị Spring chặn đứng với mã lỗi 403 Forbidden.

```java
29:     public Map<String,Object> submit(@AuthenticationPrincipal AuthenticatedUserPrincipal user, @Valid @RequestBody Submit body) {
```
- **Giải thích**:
  - `@AuthenticationPrincipal user`: Spring tự động móc thông tin tài khoản đang đăng nhập từ Session ra đưa vào biến `user`.
  - `@RequestBody Submit body`: Đọc nội dung gói tin JSON gửi lên (ví dụ `{ "packageId": 1 }`) nạp vào biến `body`.

```java
30:         return service.submit(user.id(), body.packageId());
31:     }
```
- **Giải thích**: Gọi hàm `submit` của tầng Service, truyền vào ID của user và ID của gói cước, rồi trả kết quả về cho React.

---

## TẬP 3: FILE BACKEND SERVICE - `ManualPremiumService.java`

File này nằm tại `backend/src/main/java/com/group5/premiumnews/service/ManualPremiumService.java`. Đây là "bộ não" điều khiển logic.

```java
18:     @Transactional
```
- **Giải thích**: Bật chế độ giao dịch toàn vẹn. Nếu có lỗi, CSDL tự động hoàn tác (rollback).

```java
19:     public Map<String, Object> submit(long userId, long packageId) {
```
- **Giải thích**: Định nghĩa hàm xử lý tạo đơn đăng ký gói.

```java
20:         if (!repository.lockActiveUser(userId)) throw error(HttpStatus.FORBIDDEN, "Tài khoản không hoạt động.");
```
- **Giải thích**: Chạy SQL `SELECT ... FOR UPDATE` để khóa tài khoản trong CSDL. Nếu tài khoản bị khóa/banned thì ném lỗi 403 cấm mua.

```java
21:         var pending = repository.pending(userId);
```
- **Giải thích**: Tra CSDL xem người này có đơn nào đang ở trạng thái `PENDING` (chờ duyệt) hay không.

```java
22:         if (pending.isPresent()) {
23:             if (pending.get().plan().id() != packageId) throw error(HttpStatus.CONFLICT, "Bạn đã có yêu cầu chờ duyệt. Vui lòng đợi admin xử lý trước khi đổi gói.");
24:             return Map.of("id", pending.get().id(), "status", "PENDING");
25:         }
```
- **Giải thích**:
  - Nếu đã có đơn đang chờ duyệt mà lại bấm mua gói khác $\rightarrow$ ném lỗi 409 CONFLICT chặn lại ngay!
  - Nếu bấm lại đúng gói đang chờ $\rightarrow$ trả lại ID đơn cũ, không tạo đơn rác.

```java
26:         var plan = repository.activePlan(packageId).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Gói không còn mở bán."));
```
- **Giải thích**: Tìm gói cước trong CSDL. Nếu gói bị admin ẩn đi rồi thì báo lỗi 404 Not Found.

```java
27:         return Map.of("id", repository.create(userId, plan), "status", "PENDING");
28:     }
```
- **Giải thích**: Gọi Repository chạy lệnh SQL `INSERT INTO premium_requests` để tạo đơn mới với trạng thái `PENDING`, đồng thời tạo thông báo chuông, rồi trả về ID đơn cho Frontend.

---

# PHẦN 2: MỔ XẺ TỪNG DÒNG CODE LUỒNG BF-08 (QUẢNG CÁO & TRACKING)

Chúng ta chọn 3 file cốt lõi của luồng BF-08:
1. Frontend: [`AdBanner.jsx`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/frontend/src/components/AdBanner.jsx) (Hiển thị banner, đo view & click)
2. Backend Controller: [`AdvertisingDataController.java`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/controller/AdvertisingDataController.java) (Đón request click & view)
3. Backend Service: [`AdvertisingDataService.java`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/service/AdvertisingDataService.java) (Ghi nhận số liệu vào CSDL)

---

## TẬP 1: FILE FRONTEND - `AdBanner.jsx`

File này nằm tại `frontend/src/components/AdBanner.jsx`.

```javascript
12: export default function AdBanner({ position = "HOME_HERO", compact = false }) {
```
- **Giải thích**: Nhận vào 2 tham số Props: `position` (vị trí quảng cáo, mặc định là đầu trang chủ `HOME_HERO`), và `compact` (giao diện thu nhỏ hay không).

```javascript
13:   const [banners, setBanners] = useState([]);
```
- **Giải thích**: Tạo biến state `banners` chứa danh sách các banner lấy từ Backend về (ban đầu là mảng rỗng `[]`).

```javascript
14:   const [index, setIndex] = useState(0);
```
- **Giải thích**: Tạo biến `index` chỉ vị trí banner đang hiển thị (nếu có 3 banner thì sẽ xoay vòng index 0, 1, 2).

```javascript
17:   const { premiumLoading, loading } = useAuth();
18:   const { showAdvertising } = useReaderPolicy();
```
- **Giải thích**: Hook `useReaderPolicy()` kiểm tra quyền: Nếu người dùng đã mua gói Premium thành công ở BF-01 thì biến `showAdvertising` sẽ mang giá trị **`false`**!

```javascript
23:   const trackedImpressions = useRef(new Set());
```
- **Giải thích**: Dùng `useRef` tạo một chiếc túi `Set` để lưu danh sách các ID banner đã được tính tiền lượt xem (Impression). `Set` đảm bảo mỗi ID chỉ xuất hiện đúng 1 lần duy nhất, không bao giờ bị trùng.

```javascript
25:   useEffect(() => { if (!showAdvertising) return; let alive = true; apiRequest(`/api/advertising/banners?position=${encodeURIComponent(position)}`)
26:     .then(data => { if (alive) setBanners(data); }).catch(() => { if (alive) setBanners([]); });
27:     return () => { alive = false; }; }, [position, showAdvertising]);
```
- **Giải thích**:
  - `if (!showAdvertising) return;`: Nếu là tài khoản VIP Premium $\rightarrow$ Dừng lại ngay, không tốn công gọi API lấy quảng cáo làm gì!
  - Ngược lại: Gửi `GET /api/advertising/banners?position=...` sang Backend để lấy các banner đang chạy.

```javascript
38:   useEffect(() => {
39:     if (banner && !house && !preview && banner.id && !isNaN(Number(banner.id))) {
40:       const creativeId = Number(banner.id);
41:       if (!trackedImpressions.current.has(creativeId)) {
42:         trackedImpressions.current.add(creativeId);
43:         fetch("/api/advertising/events/impression", {
44:           method: "POST",
45:           headers: { "Content-Type": "application/json" },
46:           body: JSON.stringify({ creativeId }),
47:         }).catch(() => {});
48:       }
49:     }
50:   }, [banner, house, preview]);
```
- **Giải thích cơ chế đếm lượt xem (Impression)**:
  - Dòng 41: Kiểm tra xem ID của banner này đã nằm trong chiếc túi `trackedImpressions` chưa?
  - Dòng 42: Nếu CHƯA CÓ $\rightarrow$ Thêm ID vào túi ngay lập tức.
  - Dòng 43-47: Bắn ngầm một request `POST /api/advertising/events/impression` gửi lên Backend kèm `creativeId` để CSDL cộng thêm 1 lượt xem. Nhờ chiếc túi này, nếu màn hình có vẽ lại 10 lần thì quảng cáo cũng **chỉ bị đếm đúng 1 lần duy nhất**!

```javascript
52:   if (!banner || !showAdvertising || premiumLoading || loading) return null;
```
- **Giải thích**: Nếu không có banner hoặc tài khoản là Premium VIP (`showAdvertising = false`) $\rightarrow$ `return null` (không vẽ gì cả, màn hình sạch bóng quảng cáo).

```javascript
62:   const isPaid = !house && !preview && banner.id && !isNaN(Number(banner.id));
63:   const clickUrl = isPaid ? `/api/advertising/click/${banner.id}` : banner.targetUrl;
```
- **Giải thích**:
  - Nếu là banner trả phí thật (`isPaid = true`): Đường link bọc quanh ảnh sẽ trỏ về Backend: `/api/advertising/click/{id}` để Backend đếm số click trước khi chuyển trang.

```javascript
67:   return (
68:     <a href={clickUrl} target="_blank" rel="noopener noreferrer">
69:       <img src={banner.mediaUrl} alt={banner.title} />
70:     </a>
71:   );
```
- **Giải thích**: Vẽ thẻ `<a>` chứa ảnh banner ra màn hình. Khi người dùng click, trình duyệt sẽ nhảy vào đường link `clickUrl`.

---

## TẬP 2: FILE BACKEND CONTROLLER - `AdvertisingDataController.java`

File này nằm tại `backend/src/main/java/com/group5/premiumnews/controller/AdvertisingDataController.java`.

```java
31:     @PostMapping("/events/impression")
32:     public Map<String, Object> impression(@RequestBody(required = false) Map<String, Object> body) {
33:         Long creativeId = Long.valueOf(body.get("creativeId").toString());
34:         service.recordImpression(creativeId);
35:         return Map.of("success", true);
36:     }
```
- **Giải thích**: Hứng gói tin đếm lượt xem từ file `AdBanner.jsx` gửi lên, đọc `creativeId` và gọi xuống Service ghi nhận.

```java
44:     @GetMapping("/click/{creativeId}")
45:     public void click(@PathVariable Long creativeId, HttpServletResponse response) throws IOException {
46:         String targetUrl = service.recordClickAndGetTargetUrl(creativeId);
47:         response.sendRedirect(targetUrl);
48:     }
```
- **Giải thích cơ chế đếm Click và Chuyển hướng (Redirect)**:
  - Dòng 44: Đón nhận cú click chuột của độc giả khi click vào link `/api/advertising/click/{creativeId}`.
  - Dòng 46: Gọi tầng Service cộng thêm 1 lượt click vào CSDL, đồng thời lấy ra link website gốc của nhà tài trợ (`targetUrl`).
  - Dòng 47: `response.sendRedirect(targetUrl)`: Bắn lệnh HTTP 302 chuyển hướng trình duyệt của độc giả bay thẳng sang website đối tác!

---

## TẬP 3: FILE BACKEND SERVICE - `AdvertisingDataService.java`

File này nằm tại `backend/src/main/java/com/group5/premiumnews/service/AdvertisingDataService.java`.

```java
91:     public void recordImpression(Long creativeId) {
92:         if (creativeId == null) return;
93:         jdbc.update("""
94:             INSERT INTO ad_metrics (creative_id, metric_date, impressions_count, clicks_count, invalid_clicks_count, delivery_errors_count)
95:             VALUES (?, CURRENT_DATE, 1, 0, 0, 0)
96:             ON DUPLICATE KEY UPDATE impressions_count = impressions_count + 1
97:             """, creativeId);
98:     }
```
- **Giải thích câu lệnh SQL đếm View**:
  - Dùng cú pháp `ON DUPLICATE KEY UPDATE`: Nếu hôm nay đã có dòng số liệu của banner này rồi thì tự động tăng `impressions_count = impressions_count + 1`. Không bao giờ bị lỗi khóa chết dữ liệu dù có triệu người xem cùng lúc.

```java
102:     public String recordClickAndGetTargetUrl(Long creativeId) {
103:         if (creativeId == null) return "/";
104:         List<String> urls = jdbc.queryForList(
105:             "SELECT target_url FROM ad_creatives WHERE creative_id = ?",
106:             String.class, creativeId
107:         );
108:         if (urls.isEmpty() || urls.get(0) == null) return "/";
```
- **Dòng 104-108**: Tìm website của đối tác trong bảng `ad_creatives` theo mã `creativeId`.

```java
114:         jdbc.update("""
115:             INSERT INTO ad_metrics (creative_id, metric_date, impressions_count, clicks_count, invalid_clicks_count, delivery_errors_count)
116:             VALUES (?, CURRENT_DATE, 0, 1, 0, 0)
117:             ON DUPLICATE KEY UPDATE clicks_count = clicks_count + 1
118:             """, creativeId);
119:         return urls.get(0);
120:     }
```
- **Dòng 114-119**: Tăng số `clicks_count` lên 1 đơn vị trong CSDL, sau đó trả đường link website về cho Controller để chuyển hướng người dùng đi.

---

### TỔNG KẾT
Toàn bộ tài liệu trên đã được lưu trực tiếp vào file:
👉 **[`docs/DOC_TUNG_DONG_CODE_BF1_BF8.md`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/docs/DOC_TUNG_DONG_CODE_BF1_BF8.md)**

Bây giờ bạn có thể mở song song file code trong VS Code và tài liệu này để đọc đối chiếu từng dòng một. Bất cứ khi nào gặp một dòng code khó hiểu, bạn chỉ cần nhìn vào số dòng tương ứng trong tài liệu là sẽ hiểu ngay lý do tại sao nó lại được viết như vậy!
