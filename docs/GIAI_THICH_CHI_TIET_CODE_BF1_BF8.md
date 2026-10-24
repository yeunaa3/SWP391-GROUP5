# GIẢI MÃ CHI TIẾT TỪNG FILE CODE VÀ Ý NGHĨA CÂU LỆNH (BF-01 & BF-08)
*(Tài liệu giải thích cặn kẽ từng cú pháp cho người mới học React & Spring Boot)*

---

# PHẦN 1: GIẢI MÃ CÁC KHÁI NIỆM & CÚ PHÁP "LẠ MẮT" TRONG CODE

Trước khi đọc từng file code, bạn hãy đọc kỹ phần này. Đây là những cú pháp xuất hiện liên tục trong dự án khiến người mới học thường bị bối rối:

---

### 1. `state.packages` hay `state.plan` thực chất là gì?
Trong React, **State** là bộ nhớ riêng của một màn hình (component). Khi dữ liệu trong State thay đổi, React sẽ **tự động vẽ lại (re-render)** giao diện mà bạn không cần phải tự tay gõ lệnh cập nhật DOM như JavaScript thuần.

Ví dụ trong [`PackagesPage.jsx`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/frontend/src/pages/premium/PackagesPage.jsx):
```javascript
const [state, setState] = useState({ loading: true, packages: [], error: false });
```
- Ở đây, lập trình viên tạo ra một biến tên là `state`. Biến này là một Object chứa 3 thuộc tính:
  1. `state.loading`: Đang tải dữ liệu hay chưa? (ban đầu là `true`).
  2. `state.packages`: Danh sách các gói Premium lấy từ Backend về (ban đầu là mảng rỗng `[]`).
  3. `state.error`: Có bị lỗi kết nối không? (ban đầu là `false`).
- Khi Backend trả về danh sách các gói, code sẽ gọi:
  ```javascript
  setState({ packages: dataTuBackend, loading: false, error: false });
  ```
  Lúc này `state.packages` không còn rỗng nữa mà chứa danh sách gói. Khi giao diện chạy đến đoạn:
  ```javascript
  state.packages.map(item => ...)
  ```
  Nó sẽ duyệt qua từng gói trong `state.packages` để vẽ thành các ô vuông thẻ giá trên màn hình!

---

### 2. Cú pháp bóc tách dữ liệu (Destructuring Assignment)
Thay vì phải viết dài dòng:
```javascript
const user = authContext.user;
const premium = authContext.premium;
```
Trong React người ta viết ngắn gọn:
```javascript
const { user, premium } = useAuth();
```
Ý nghĩa: "Lấy thẳng thuộc tính `user` và `premium` từ bên trong đối tượng trả về của `useAuth()` và gán vào 2 biến cùng tên".

Tương tự:
```javascript
const { plan } = state; // Lấy thuộc tính plan nằm trong biến state
```

---

### 3. Dấu chấm hỏi kèm dấu chấm `?.` (Optional Chaining)
Bạn sẽ thấy rất nhiều dòng code như:
```javascript
const owned = ownedPremium(premium?.subscriptions, item.id);
user?.roles?.includes("BUSINESS")
```
- **Tại sao không viết `premium.subscriptions` mà phải thêm dấu `?`?**
  - Trong React, khi trang vừa mở lên, dữ liệu từ Backend **chưa kịp tải về**, biến `premium` hoặc `user` có thể đang là `null` hoặc `undefined`.
  - Nếu viết `premium.subscriptions`, JavaScript sẽ sập ngay lập tức với lỗi kinh điển: `Cannot read properties of null (reading 'subscriptions')` và làm trắng toát cả trang web!
  - Thêm dấu `?.` có nghĩa là: *"Nếu `premium` có giá trị thì lấy tiếp `.subscriptions`. Còn nếu `premium` đang là `null` thì dừng lại và trả về `undefined`, tuyệt đối không làm sập trang web"*.

---

### 4. Props trong Component React là gì?
Ví dụ bạn thấy dòng code:
```javascript
<AdBanner position="HOME_HERO" compact={true} />
```
- `AdBanner` là một Component con được viết sẵn trong file `AdBanner.jsx`.
- `position="HOME_HERO"` và `compact={true}` được gọi là **Props** (tham số truyền vào Component con).
- Bên trong file `AdBanner.jsx`, hàm sẽ nhận tham số như sau:
  ```javascript
  export default function AdBanner({ position = "HOME_HERO", compact = false }) { ... }
  ```
  Nhờ có Props, cùng một file `AdBanner.jsx` nhưng khi gắn ở đầu trang chủ thì truyền `position="HOME_HERO"`, gắn ở bài viết thì truyền `position="ARTICLE_TOP"`. Component sẽ dựa vào tham số này để hỏi Backend banner tương ứng.

---

### 5. `useRef` kết hợp `new Set()` trong đo lường quảng cáo
Tại [`AdBanner.jsx#L23`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/frontend/src/components/AdBanner.jsx#L23):
```javascript
const trackedImpressions = useRef(new Set());
```
- **`Set`**: Là một tập hợp trong JavaScript chỉ lưu các phần tử **không trùng nhau**.
- **`useRef`**: Giống như một chiếc túi giữ đồ. Giá trị trong `useRef` sẽ được giữ nguyên qua các lần màn hình vẽ lại (re-render), và quan trọng nhất: **khi thay đổi giá trị trong `useRef`, React KHÔNG re-render lại màn hình** (khác với `useState`).
- *Tại sao dùng ở đây?*
  Khi người dùng nhìn thấy quảng cáo có ID = `5`, code thêm số 5 vào `trackedImpressions.current.add(5)` và gửi báo cáo view về Backend. Lần sau nếu màn hình có vẽ lại vì lý do khác, code kiểm tra `if (!trackedImpressions.current.has(5))` thấy số 5 đã có rồi nên sẽ **bỏ qua**, không gửi request view trùng lần 2!

---

### 6. Template String (Dấu huyền `` `...` ``)
Thay vì nối chuỗi kiểu cũ `"/api/premium/transactions/" + id`, trong React người ta dùng:
```javascript
`/api/premium/transactions/${id}`
```
Dấu này nằm dưới nút `Esc` trên bàn phím máy tính. Bất kỳ biểu thức nào nằm trong `${...}` đều sẽ được tự động tính toán và thay thế vào chuỗi.

---

### 7. Phía Spring Boot (Java): `record` là gì?
Trong [`ManualPremiumController.java#L18-L19`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/controller/ManualPremiumController.java#L18-L19):
```java
public record Submit(@NotNull @Positive Long packageId) {}
public record Review(boolean approve, boolean paymentConfirmed, @Size(max = 500) String note) {}
```
- Từ Java 14 trở lên, `record` là một cú pháp hiện đại để tạo class chứa dữ liệu (DTO) chỉ với **1 dòng duy nhất**.
- Bạn không cần phải tự gõ getter, setter, constructor, `equals()`, `hashCode()`, hay `toString()`. Java sẽ tự động tạo hết ngầm bên dưới cho bạn.

---

### 8. `@AuthenticationPrincipal` lấy user ở đâu ra?
```java
public Map<String,Object> submit(@AuthenticationPrincipal AuthenticatedUserPrincipal user, ...)
```
- Khi người dùng đăng nhập thành công, Spring Security sẽ tạo ra một phiên làm việc (Session) và lưu thông tin người dùng trong bộ nhớ máy chủ.
- Khi người dùng gửi bất kỳ request nào lên, Spring Security sẽ tự động kiểm tra cookie phiên, tìm ra người này là ai và tự động "bơm" (inject) đối tượng `user` vào hàm này. Bạn không cần phải tự query tìm lại user từ token hay session nữa.

---

### 9. Khóa bi quan `SELECT ... FOR UPDATE` trong SQL
Tại [`PremiumRequestRepository.java#L34`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/repository/PremiumRequestRepository.java#L34):
```sql
SELECT user_id FROM users WHERE user_id = ? AND status = 'ACTIVE' FOR UPDATE;
```
- Bình thường câu `SELECT` chỉ để đọc. Nhưng khi thêm `FOR UPDATE`, MySQL sẽ **khóa chặt bản ghi của người dùng này lại**.
- Nếu độc giả cố tình bấm nút "Gửi đăng ký" 2 lần thật nhanh (hoặc mở 2 tab trình duyệt bấm cùng 1 giây), request thứ hai đến nơi sẽ **phải đứng đợi** cho đến khi request thứ nhất hoàn thành xong. Điều này triệt tiêu hoàn toàn lỗi gửi trùng hoặc lỗi trừ tiền 2 lần.

---

### 10. Lệnh `INSERT ... ON DUPLICATE KEY UPDATE`
Tại [`AdvertisingDataService.java#L96-L99`](file:///c:/Users/Dumpling/Desktop/SWP391-GROUP5/backend/src/main/java/com/group5/premiumnews/service/AdvertisingDataService.java#L96-L99):
```sql
INSERT INTO ad_metrics (creative_id, metric_date, impressions_count, clicks_count, invalid_clicks_count, delivery_errors_count)
VALUES (?, CURRENT_DATE, 1, 0, 0, 0)
ON DUPLICATE KEY UPDATE impressions_count = impressions_count + 1;
```
- Bảng `ad_metrics` có khóa chính phức hợp gồm `(creative_id, metric_date)`. Mỗi banner trong 1 ngày chỉ được có đúng 1 dòng.
- Lệnh này nói với MySQL: *"Hãy chèn dòng mới cho ngày hôm nay với số lượt xem = 1. Nhưng nếu dòng của ngày hôm nay ĐÃ TỒN TẠI RỒI (Duplicate Key), thì đừng báo lỗi, mà hãy tự động cộng thêm 1 vào cột `impressions_count`"*.
- Đây là bí quyết của các hệ thống lớn để đếm triệu lượt xem/click mà không làm nghẽn CSDL.

---

# PHẦN 2: MỔ XẺ CHI TIẾT TỪNG DÒNG CODE LUỒNG BF-01 (PREMIUM)

---

## 1. File `PackagesPage.jsx` (Màn hình PRE-01: Danh sách gói)
*Đường dẫn: `frontend/src/pages/premium/PackagesPage.jsx`*

```javascript
// DÒNG 14-15:
const { premium } = useAuth(); // Lấy thông tin gói hiện tại của user từ Context toàn cục
const [state, setState] = useState({ loading: true, packages: [], error: false }); // Bộ nhớ lưu danh sách gói
const [attempt, setAttempt] = useState(0); // Biến đếm số lần bấm "Thử lại" nếu bị mất mạng

// DÒNG 17-23: TỰ ĐỘNG CHẠY KHI MỞ MÀN HÌNH
useEffect(() => {
  let alive = true; // Biến cờ chống rò rỉ bộ nhớ nếu người dùng chuyển trang quá nhanh
  setState({ loading: true, packages: [], error: false }); // Bật trạng thái xoay vòng tròn đang tải
  
  // Gọi hàm trong premiumService.js để lấy dữ liệu từ Backend
  getActivePremiumPlans()
    .then(packages => { 
      if (alive) setState({ packages, loading: false, error: false }); // Thành công: lưu danh sách gói vào state
    })
    .catch(() => { 
      if (alive) setState({ packages: [], loading: false, error: true }); // Thất bại: bật cờ báo lỗi
    });
    
  return () => { alive = false; }; // Dọn dẹp khi rời khỏi trang
}, [attempt, language]); // Khi attempt hoặc language thay đổi -> tự động tải lại
```

**Đoạn code render kiểm tra gói đã mua hay đang chờ duyệt:**
```javascript
// DÒNG 30-34:
{state.packages.map(item => {
  // Kiểm tra gói này đã được mua và còn hạn sử dụng hay chưa
  const owned = ownedPremium(premium?.subscriptions, item.id);
  
  // Kiểm tra user có đơn đăng ký gói này nhưng đang chờ admin duyệt hay không
  const pending = Number(premium?.pendingPackageId) === Number(item.id);

  return (
    <article className={`premium-plan ${owned ? "is-owned" : ""}`} key={item.id}>
      <span className="premium-kicker">
        {owned ? "✓ ĐÃ MUA GÓI NÀY" : pending ? "◷ ĐANG CHỜ DUYỆT" : `${item.durationDays} NGÀY TRẢI NGHIỆM`}
      </span>
      <h2>{item.name}</h2>
      <strong className="premium-price">{money(item.price, item.currency)}</strong>
      
      {/* Nút bấm chuyển hướng thông minh dựa vào trạng thái gói: */}
      <Link className="button-link" to={pending ? "/premium/payment-result" : `/premium/packages/${item.id}`}>
        {owned ? "Xem gói đã mua" : pending ? "Xem trạng thái duyệt" : "Khám phá quyền lợi →"}
      </Link>
    </article>
  );
})}
```

---

## 2. File `PackageDetailPage.jsx` (Màn hình PRE-02: Chi tiết gói)
*Đường dẫn: `frontend/src/pages/premium/PackageDetailPage.jsx`*

```javascript
// DÒNG 16: Dùng custom hook usePremiumPlan để lấy gói theo ID trên thanh địa chỉ URL
const state = usePremiumPlan(); 
const { plan } = state; // Bóc tách lấy đối tượng gói: { id: 1, name: "Gói 1 tháng", price: 50000, durationDays: 30 }

// DÒNG 27: TÍNH NGÀY HẾT HẠN DỰ KIẾN
// Gọi hàm projectedExpiry(ngày hiện tại, 30 ngày) để hiển thị cho người đọc biết trước
<dd>{formatDate(projectedExpiry(new Date(), plan.durationDays))}</dd>

// DÒNG 28: NÚT BẤM TIẾP TỤC SANG MÀN HÌNH THANH TOÁN
<Link className="button-link" to={premium?.pendingPackageId ? "/premium/payment-result" : `/premium/checkout/${plan.id}`}>
  {owned ? "Đã mua · Gia hạn thêm" : "Tiếp tục thanh toán →"}
</Link>
```

---

## 3. File `PremiumCheckoutPage.jsx` (Màn hình PRE-03: Xác nhận đơn & Bấm gửi)
*Đường dẫn: `frontend/src/pages/premium/PremiumCheckoutPage.jsx`*

```javascript
// DÒNG 18-20: CÁC BIẾN QUẢN LÝ FORM
const [confirmed, setConfirmed] = useState(false); // Checkbox người dùng đã tích đồng ý điều khoản chưa
const [busy, setBusy] = useState(false);           // Có đang trong quá trình gửi request không (chặn spam click)
const [error, setError] = useState("");            // Chuỗi lưu câu thông báo lỗi nếu Backend trả về lỗi

// DÒNG 24-31: HÀM XỬ LÝ KHI BẤM NÚT SUBMIT FORM
async function submit(event) {
  event.preventDefault(); // Rất quan trọng! Ngăn không cho trình duyệt tự reload trang theo kiểu form HTML cũ
  
  // Kiểm tra điều kiện: Chưa tích checkbox hoặc đang bận gửi thì không làm gì cả
  if (!confirmed || busy || premium?.pendingPackageId) return;
  
  setBusy(true);  // Đổi trạng thái sang bận, nút bấm sẽ đổi chữ thành "Đang gửi…" và bị vô hiệu hóa
  setError("");
  
  try { 
    // 1. Gửi request POST /api/premium/requests sang Backend
    await submitPremiumRequest(plan.id); 
    
    // 2. Kích hoạt AuthContext tải lại dữ liệu để nhận biết user vừa có đơn chờ duyệt
    await refreshPremium(); 
    
    // 3. Chuyển người dùng sang màn hình PRE-04 để quét mã VietQR
    navigate("/premium/payment-result"); 
  }
  catch (failure) { 
    // Nếu Backend ném lỗi (ví dụ 409 do đã có đơn), lưu câu chữ báo lỗi vào biến error để hiển thị lên màn hình
    setError(failure.message); 
  }
  finally { 
    setBusy(false); 
  }
}
```

---

## 4. File `ManualPremiumController.java` (Backend đón nhận request tạo đơn)
*Đường dẫn: `backend/src/main/java/com/group5/premiumnews/controller/ManualPremiumController.java`*

```java
// DÒNG 27-31: TIẾP NHẬN YÊU CẦU ĐẶT MUA TỪ REACT
@PostMapping("/premium/requests")
@PreAuthorize("hasAnyRole('READER','SUBSCRIBER')") // Chỉ độc giả hoặc người đã có gói mới được gọi vào đây
public Map<String,Object> submit(
    @AuthenticationPrincipal AuthenticatedUserPrincipal user, // Lấy tài khoản đang đăng nhập từ Session
    @Valid @RequestBody Submit body                          // Đọc gói JSON gửi lên: { "packageId": 1 }
) {
    // Chuyển việc cho lớp Service xử lý nghiệp vụ
    return service.submit(user.id(), body.packageId());
}
```

---

## 5. File `ManualPremiumService.java` (Trọng tâm logic nghiệp vụ)
*Đường dẫn: `backend/src/main/java/com/group5/premiumnews/service/ManualPremiumService.java`*

### A. Hàm tạo yêu cầu mua gói (`submit`):
```java
@Transactional // Đảm bảo toàn vẹn: nếu lỗi thì rollback toàn bộ
public Map<String, Object> submit(long userId, long packageId) {
    // 1. Khóa tài khoản trong CSDL để chống bấm đúp gửi 2 request song song
    if (!repository.lockActiveUser(userId)) 
        throw error(HttpStatus.FORBIDDEN, "Tài khoản không hoạt động.");
        
    // 2. Kiểm tra xem người này có đơn nào đang PENDING chưa
    var pending = repository.pending(userId);
    if (pending.isPresent()) {
        // Đã có đơn PENDING mà lại chọn mua gói khác -> Chặn lại báo lỗi 409 CONFLICT!
        if (pending.get().plan().id() != packageId) 
            throw error(HttpStatus.CONFLICT, "Bạn đã có yêu cầu chờ duyệt. Vui lòng đợi admin xử lý trước khi đổi gói.");
        return Map.of("id", pending.get().id(), "status", "PENDING");
    }
    
    // 3. Tìm thông tin gói trong CSDL
    var plan = repository.activePlan(packageId)
        .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Gói không còn mở bán."));
        
    // 4. Tạo bản ghi mới vào bảng premium_requests và gửi thông báo
    return Map.of("id", repository.create(userId, plan), "status", "PENDING");
}
```

### B. Hàm phê duyệt đơn của Admin (`review`):
```java
@Transactional
public void review(long adminId, long id, boolean approve, boolean paymentConfirmed, String note) {
    // Khóa dòng đơn hàng trong CSDL bằng câu lệnh SELECT ... FOR UPDATE
    var request = repository.lockRequest(id)
        .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu."));
        
    if (!"PENDING".equals(request.status())) 
        throw error(HttpStatus.CONFLICT, "Yêu cầu đã được xử lý. Không kích hoạt lại.");
        
    Long subscription = null;
    if (approve) {
        // Bắt buộc Admin phải tích vào ô xác nhận đã nhận tiền thì mới cho duyệt
        if (!paymentConfirmed) 
            throw error(HttpStatus.BAD_REQUEST, "Admin phải xác nhận đã kiểm tra thanh toán trước khi duyệt.");
            
        Instant now = Instant.now();
        // Kiểm tra xem user này có gói nào đang active không và ngày hết hạn gần nhất là khi nào
        Instant previousEnd = repository.latestExpiry(request.userId());
        
        // THUẬT TOÁN GIA HẠN THÔNG MINH:
        // Nếu gói cũ vẫn còn hạn (previousEnd > now): Ngày bắt đầu gói mới tính từ ngày hết hạn của gói cũ!
        // Nếu chưa có gói hoặc gói cũ đã hết hạn: Ngày bắt đầu tính từ ngay bây giờ (now).
        Instant start = previousEnd != null && previousEnd.isAfter(now) ? previousEnd : now;
        Instant end = start.plus(request.plan().days(), ChronoUnit.DAYS);
        
        // Kích hoạt: Insert vào bảng subscriptions và transactions
        subscription = repository.activate(request, start, end);
    } else {
        if (note == null || note.isBlank()) throw error(HttpStatus.BAD_REQUEST, "Cần nhập lý do từ chối.");
    }
    
    // Cập nhật trạng thái đơn thành APPROVED hoặc REJECTED và gửi thông báo cho user
    repository.review(id, adminId, approve ? "APPROVED" : "REJECTED", note, subscription);
}
```

---

## 6. File `PremiumRequestsPage.jsx` (Màn hình PRE-04: Sinh mã VietQR tự động)
*Đường dẫn: `frontend/src/pages/premium/PremiumRequestsPage.jsx`*

```javascript
// DÒNG 29-48: TỰ ĐỘNG SINH ẢNH VIETQR KHI ĐƠN Ở TRẠNG THÁI PENDING
{row.status === "PENDING" && (() => {
  // Cú pháp nội dung chuyển khoản thống nhất toàn hệ thống
  const transferMemo = `THE PLUSE ${row.username || "USER"} PREMIUM ${row.id}`;
  
  return (
    <div className="premium-manual-transfer">
      {/* Gọi hàm lấy link ảnh VietQR động: tự động điền sẵn STK, Ngân hàng, Số tiền và Nội dung! */}
      <img
        className="premium-bank-qr"
        src={paymentConfig.getDynamicQrUrl(row.amount, transferMemo)}
        alt="QR chuyển khoản"
      />
      <div>
        <p>Ngân hàng: <strong>{paymentConfig.bankName}</strong></p>
        <p>Số tài khoản: <strong>{paymentConfig.accountNumber}</strong></p>
        <p>Số tiền: <strong>{money(row.amount, row.currency)}</strong></p>
        <p>Nội dung chuyển khoản: <strong className="highlight-text">{transferMemo}</strong></p>
      </div>
    </div>
  );
})()}
```

---

# PHẦN 3: MỔ XẺ CHI TIẾT TỪNG DÒNG CODE LUỒNG BF-08 (QUẢNG CÁO)

---

## 1. File `AdBanner.jsx` (Component hiển thị Banner & Đo lường)
*Đường dẫn: `frontend/src/components/AdBanner.jsx`*

```javascript
// DÒNG 17-23: KHỞI TẠO STATE VÀ THEO DÕI ĐỘC GIẢ
const { premiumLoading, loading } = useAuth();
const { showAdvertising } = useReaderPolicy(); // Hook kiểm tra quyền: Nếu đã có Premium thì showAdvertising = false!
const trackedImpressions = useRef(new Set());  // Tập hợp lưu các ID banner đã được đếm view để không đếm trùng

// DÒNG 25-27: LẤY BANNER TỪ BACKEND
useEffect(() => { 
  if (!showAdvertising) return; // Nếu là tài khoản Premium thì không cần gọi API lấy quảng cáo làm gì
  let alive = true; 
  apiRequest(`/api/advertising/banners?position=${encodeURIComponent(position)}`)
    .then(data => { if (alive) setBanners(data); })
    .catch(() => { if (alive) setBanners([]); });
  return () => { alive = false; }; 
}, [position, showAdvertising]);

// DÒNG 38-50: GHI NHẬN LƯỢT XEM THỰC TẾ (IMPRESSION TRACKING)
useEffect(() => {
  // Chỉ ghi nhận khi có banner thật (không phải banner nội bộ mặc định house ads)
  if (banner && !house && !preview && banner.id && !isNaN(Number(banner.id))) {
    const creativeId = Number(banner.id);
    // Kiểm tra trong Set xem ID này đã được bắn sự kiện chưa:
    if (!trackedImpressions.current.has(creativeId)) {
      trackedImpressions.current.add(creativeId); // Thêm vào Set ngay
      
      // Bắn request ngầm gửi lên Backend ghi nhận 1 lượt hiển thị
      fetch("/api/advertising/events/impression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creativeId }),
      }).catch(() => {});
    }
  }
}, [banner, house, preview]);

// DÒNG 52: NẾU LÀ TÀI KHOẢN PREMIUM THÌ DỪNG LẠI, KHÔNG RENDER GÌ CẢ
if (!banner || !showAdvertising || premiumLoading || loading) return null;

// DÒNG 61-75: BỌC LINK ĐỂ ĐẾM LƯỢT CLICK VÀ CHUYỂN HƯỚNG
const isPaid = !house && !preview && banner.id && !isNaN(Number(banner.id));
// Nếu là quảng cáo có trả phí: Trỏ link về Backend để đếm click trước khi chuyển trang
const clickUrl = isPaid ? `/api/advertising/click/${banner.id}` : banner.targetUrl;

return (
  <aside className="live-ad">
    <a href={clickUrl} target="_blank" rel="noopener noreferrer">
      <img src={banner.mediaUrl} alt={banner.title} />
    </a>
  </aside>
);
```

---

## 2. File `AdvertisingDataService.java` (Backend lọc banner & Đếm chỉ số)
*Đường dẫn: `backend/src/main/java/com/group5/premiumnews/service/AdvertisingDataService.java`*

### A. Câu lệnh SQL lọc banner chuẩn để phân phối:
```sql
SELECT cr.creative_id AS id, cr.title, cr.media_url AS mediaUrl, cr.target_url AS targetUrl,
       s.position_code AS position, c.campaign_name AS campaignName
FROM ad_creatives cr 
JOIN ad_campaigns c ON c.campaign_id = cr.campaign_id
JOIN contracts ct ON ct.contract_id = c.contract_id 
JOIN ad_slots s ON s.slot_id = ct.slot_id
WHERE s.position_code = ?                         -- Đúng vị trí cần lấy (ví dụ HOME_HERO)
  AND s.status = 'ACTIVE'                         -- Vị trí slot đang hoạt động
  AND cr.status = 'APPROVED'                      -- Ảnh banner đã được duyệt
  AND c.status = 'ACTIVE'                         -- Chiến dịch đang chạy (không bị PAUSED)
  AND ct.status = 'ACTIVE'                        -- Hợp đồng đang chạy
  AND ct.payment_status = 'PAID'                  -- Hợp đồng ĐÃ THANH TOÁN
  AND c.scheduled_start_time <= CURRENT_TIMESTAMP -- Thời gian hiện tại nằm trong lịch chiến dịch
  AND c.scheduled_end_time > CURRENT_TIMESTAMP
  AND ct.start_at <= CURRENT_TIMESTAMP            -- Thời gian hiện tại nằm trong lịch hợp đồng
  AND ct.end_at > CURRENT_TIMESTAMP
  -- Chỉ lấy phiên bản ảnh mới nhất đã duyệt của chiến dịch đó:
  AND cr.version_no = (SELECT MAX(v.version_no) FROM ad_creatives v
                       WHERE v.campaign_id = c.campaign_id AND v.status = 'APPROVED')
ORDER BY cr.creative_id LIMIT 3;
```

### B. Hàm đếm Click và chuyển hướng an toàn:
```java
public String recordClickAndGetTargetUrl(Long creativeId) {
    if (creativeId == null) return "/";
    
    // 1. Tìm đường link website của nhà quảng cáo trong database
    List<String> urls = jdbc.queryForList(
        "SELECT target_url FROM ad_creatives WHERE creative_id = ?", String.class, creativeId
    );
    if (urls.isEmpty() || urls.get(0) == null) return "/";
    
    // 2. Chạy lệnh UPSERT: Tăng clicks_count lên 1 trong bảng ad_metrics
    jdbc.update("""
        INSERT INTO ad_metrics (creative_id, metric_date, impressions_count, clicks_count, invalid_clicks_count, delivery_errors_count)
        VALUES (?, CURRENT_DATE, 0, 1, 0, 0)
        ON DUPLICATE KEY UPDATE clicks_count = clicks_count + 1
        """, creativeId);
        
    // 3. Trả về link đích để Controller chạy lệnh response.sendRedirect(...)
    return urls.get(0);
}
```

---

## 3. File `PerformancePage.jsx` (Màn hình BUS-18 / ADM-10: Báo cáo & Xuất CSV)
*Đường dẫn: `frontend/src/pages/business/PerformancePage.jsx`*

```javascript
// DÒNG 21: TÍNH TOÁN CÁC CHỈ SỐ KPI TỔNG TRONG KHOẢNG THỜI GIAN ĐƯỢC CHỌN
const totals = filtered.reduce((acc, row) => ({
  impressions: acc.impressions + Number(row.impressions), // Cộng dồn số lượt xem
  clicks: acc.clicks + Number(row.clicks),                // Cộng dồn số click
  invalidClicks: acc.invalidClicks + Number(row.invalidClicks) // Cộng dồn click ảo/spam
}), { impressions: 0, clicks: 0, invalidClicks: 0 });

// DÒNG 27-31: HÀM XUẤT BÁO CÁO RA FILE CSV MỞ BẰNG EXCEL KHÔNG BỊ LỖI FONT
function exportCsv() {
  // Hàm bảo vệ chống lỗi CSV Injection (nếu dữ liệu bắt đầu bằng dấu = + - @ thì chèn thêm dấu nháy đơn)
  const safe = value => `"${String(value).replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
  
  // '\ufeff' là mã UTF-8 BOM, bắt buộc phải có để Excel hiển thị đúng tiếng Việt có dấu
  const csv = "\ufeff" + [
    ["Ngày", "Chiến dịch", "Impressions", "Clicks", "Invalid clicks"],
    ...filtered.map(row => [
      String(row.metricDate).slice(0, 10),
      row.campaignName,
      row.impressions,
      row.clicks,
      row.invalidClicks
    ])
  ].map(row => row.map(safe).join(",")).join("\r\n");

  // Tạo liên kết ảo trên bộ nhớ trình duyệt và kích hoạt tải về máy
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "the-pulse-performance.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // Giải phóng bộ nhớ RAM
}
```

---

## 4. File `ActiveCampaignMonitorPage.jsx` (Màn hình ADM-09: Tạm dừng / Tiếp tục)
*Đường dẫn: `frontend/src/pages/adManager/ActiveCampaignMonitorPage.jsx`*

```javascript
// DÒNG 87-115: HÀM BẬT / TẮT CHIẾN DỊCH QUẢNG CÁO
const handleToggleStatus = async (campaign) => {
  const isPausing = campaign.status === "ACTIVE";
  // Bật hộp thoại hỏi người dùng xác nhận
  const confirmMessage = isPausing
    ? `Bạn có chắc muốn TẠM DỪNG chiến dịch "${campaign.name}"? Quảng cáo sẽ tạm dừng hiển thị tới độc giả.`
    : `Bạn có muốn KÍCH HOẠT LẠI chiến dịch "${campaign.name}"? Banner sẽ tiếp tục phân phối bình thường.`;

  if (!window.confirm(confirmMessage)) return; // Người dùng ấn Cancel thì hủy bỏ

  setActionLoading(campaign.id); // Hiện hiệu ứng xoay đang xử lý tại nút bấm của dòng đó
  try {
    // Gửi request POST lên Backend để cập nhật trạng thái trong database
    const res = await apiRequest(`/api/advertising/campaigns/${campaign.id}/toggle-status`, {
      method: "POST"
    });
    
    // Cập nhật lại trạng thái mới (ACTIVE hoặc PAUSED) vào state để giao diện đổi màu badge ngay lập tức
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: res.status } : c));
  } catch (err) {
    setError(err.message);
  } finally {
    setActionLoading(null);
  }
};
```

---

# TỔNG KẾT: QUY TRÌNH HỌC TẬP HIỆU QUẢ DÀNH CHO BẠN

Khi nhìn vào một chức năng mới trong dự án, bạn hãy đi theo 4 câu hỏi này:
1. **Giao diện này nằm ở file `.jsx` nào?**
   *(Mở `frontend/src/routes/AppRoutes.jsx` tìm đường dẫn URL để biết tên file Page)*.
2. **Dữ liệu trên màn hình lấy từ đâu?**
   *(Tìm hook `useEffect` trong file Page đó, xem nó gọi hàm Service nào)*.
3. **API Backend nào xử lý yêu cầu đó?**
   *(Mở file Service xem đường dẫn API, sau đó tìm `@GetMapping` hoặc `@PostMapping` tương ứng trong thư mục `backend/.../controller`)*.
4. **Dữ liệu được lưu hoặc lấy từ bảng CSDL nào?**
   *(Xem hàm Service gọi sang Repository nào, mở file Repository xem câu lệnh SQL thuần chạy xuống MySQL)*.

---
*Tài liệu được tạo tự động để hỗ trợ nhóm phát triển dự án SWP391-GROUP5 làm quen với kiến trúc React + Spring Boot.*
