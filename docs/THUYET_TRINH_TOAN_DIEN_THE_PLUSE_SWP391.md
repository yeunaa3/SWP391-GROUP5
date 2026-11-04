# BÀI THUYẾT TRÌNH BẢO VỆ ĐỒ ÁN TOÀN DIỆN CHO CẢ NHÓM (SWP391 — GROUP 5)

> **Dự án**: The Pluse — Nền tảng Báo chí Điện tử & Quản lý Quảng cáo Doanh nghiệp Thời gian thực  
> **Mã dự án**: SWP391_G5_THEPLUSE  
> **Thành viên nhóm**:
> - **Bùi Quang Cường** (Lead: BF-01 Premium 100%, BF-08 Đo lường sự kiện & BF-09 Giám sát hiệu suất)
> - **Tạ Việt** (Lead: BF-02 Đọc báo & Paywall, BF-04 Thẩm định hồ sơ đối tác, BF-07 Kiểm duyệt chiến dịch)
> - **Trần Đức Ngọc** (Lead: BF-03 Đăng ký đối tác, BF-06 Tạo chiến dịch & Creative Asset, Quản trị hệ thống)
> - **Đoàn Trung Nhật** (Lead: BF-05 Đặt chỗ vị trí quảng cáo & Hợp đồng B2B, Cấu hình bảng giá & Slot)
>
> **Tài liệu Word đính kèm đã tạo trên Desktop**:  
> - `C:\Users\Dumpling\Desktop\The_Pluse_Bai_Thuyet_Trinh_Nhom_SWP391.docx` (Bản in Word chuyên nghiệp nhúng đủ 9 sơ đồ Swimlane)  
> - `C:\Users\Dumpling\Desktop\The_Pluse_System_Test_Report.xlsx` (Bản System Test Report 72 testcases chuẩn mẫu)  
> - `C:\Users\Dumpling\Desktop\The_Pluse_Integration_Test_Report.xlsx` (Bản Integration Test Report 68 testcases chuẩn mẫu)  
> - `C:\Users\Dumpling\Desktop\The_Pluse_ProjectTracking_Updated.xlsx` (Bản theo dõi tiến độ cập nhật 100%)

---

## MỤC LỤC BÀI THUYẾT TRÌNH

1. [Phần 1: Tổng quan Hệ thống The Pluse (Project Overview)](#phần-1-tổng-quan-hệ-thống-the-pluse)
2. [Phần 2: Phân tích Hệ thống theo Actor & Use Case](#phần-2-phân-tích-hệ-thống-theo-actor--use-case)
3. [Phần 3: Lời thoại Thuyết trình Chi tiết 9 Sơ đồ Swimlane (BF-01 đến BF-09)](#phần-3-lời-thoại-thuyết-trình-chi-tiết-9-sơ-đồ-swimlane)
4. [Phần 4: Kịch bản Thuyết trình Demo Thực tế trên Website (Live Demo Script)](#phần-4-kịch-bản-thuyết-trình-demo-thực-tế-trên-website)
5. [Phần 5: Giải thích Chi tiết Source Code & Quá trình Chạy Code Tuần tự](#phần-5-giải-thích-chi-tiết-source-code--quá-trình-chạy-code-tuần-tự)
6. [Đánh giá Chi tiết Tài liệu SDS (Software Design Specification)](#đánh-giá-chi-tiết-tài-liệu-sds)
7. [Lời kết Bảo vệ Đồ án](#lời-kết-bảo-vệ-đồ-án)

---

## PHẦN 1: TỔNG QUAN HỆ THỐNG THE PLUSE

### 1. Bối cảnh & Bài toán Thực tiễn
Thị trường báo chí điện tử hiện nay đang gặp phải khủng hoảng niềm tin kép:
- **Phía Độc giả**: Bị làm phiền bởi quảng cáo rác (clickbait, pop-up che chữ, banner lừa đảo), tin tức thiếu kiểm chứng, trải nghiệm đọc bị phân mảnh.
- **Phía Doanh nghiệp Quảng cáo**: Bị lãng phí ngân sách bởi nạn click tặc, bot ảo, và thiếu các công cụ đo lường minh bạch, dẫn đến việc không biết tiền quảng cáo của mình đi về đâu.

### 2. Mô hình Kinh doanh Hai Mũi Nhọn (Dual-Engine Monetization)
The Pluse tiên phong kết hợp hai mô hình:
1. **B2C (Reader Monetization - Freemium & Premium Subscription)**:
   - Độc giả đại chúng đọc tin tức thời sự miễn phí kèm quảng cáo chất lượng cao.
   - Độc giả cao cấp mua gói Hội viên **The Pluse Premium** (Gói tháng 79.000đ, Gói năm 790.000đ) để nhận 3 đặc quyền:
     + Đọc toàn văn 100% các bài báo chuyên sâu có bản quyền.
     + Nghe bài báo bằng giọng đọc Audio AI mượt mà, tùy chỉnh tốc độ.
     + Trải nghiệm đọc tập trung (Distraction-Free) và **hệ thống tự động ẩn hoàn toàn 100% mọi biểu ngữ quảng cáo**.
2. **B2B (Enterprise Advertising & Real-Time Analytics Engine)**:
   - Các doanh nghiệp nộp hồ sơ pháp lý minh bạch để trở thành đối tác chính thức.
   - Đặt mua các vị trí biểu ngữ độc quyền: `HOME_HERO` (1200x300px), `ARTICLE_TOP` (970x250px), `ARTICLE_SIDEBAR` (300x600px).
   - Hệ thống đo lường Lượt xem theo **chuẩn quốc tế IAB** (>= 50% diện tích hiển thị liên tục >= 1 giây) và **Lượt click thật 100%** qua cơ chế băm session SHA-256 chống double-click trong cửa sổ 2 giây.

### 3. Kiến trúc Công nghệ
- **Backend**: Java 21 / 17, Spring Boot 3.5.7, Spring Security JWT & Session, Spring Data JPA & JDBC Template, Flyway Migration (V1 đến V23).
- **Frontend**: React 18 SPA, Vite 5, Tailwind CSS & CSS Variables, hỗ trợ Dark Mode và i18n Song ngữ (Việt - Anh).
- **Database**: MySQL 8.0 chuẩn ACID, khóa hàng `SELECT ... FOR UPDATE` chống xung đột đặt trùng vị trí quảng cáo.
- **Payment Gateway**: Napas 24/7 VietQR kết hợp cổng PayOS với Webhook IPN bảo mật chữ ký số HMAC-SHA256.

> 🎤 **LỜI THOẠI MỞ ĐẦU (Leader / MC Nhóm):**  
> *"Kính thưa Hội đồng phản biện và Thầy Cô! Em xin đại diện Nhóm 5 trình bày đồ án The Pluse. Xuất phát từ thực tế người dùng ngày càng mệt mỏi với tin tức giật gân và quảng cáo che khuất màn hình, nhóm em đã xây dựng The Pluse với triết lý: Đưa độc giả trở về với giá trị cốt lõi của nội dung có bản quyền, đồng thời đem lại cho các doanh nghiệp một kênh truyền thông chuẩn mực, minh bạch với từng lượt xem và từng lượt bấm thật 100%. Sau đây, nhóm em xin đi sâu vào cấu trúc Actor và các Use Case của hệ thống."*

---

## PHẦN 2: PHÂN TÍCH HỆ THỐNG THEO ACTOR & USE CASE

Hệ thống The Pluse phân định trách nhiệm rõ ràng cho 6 nhóm tác nhân (Actors):

| STT | Actor | Vai trò & Đặc trưng | Các Use Case Tiêu biểu |
|:---:|:---|:---|:---|
| 1 | **Guest** (Độc giả vãng lai) | Người dùng chưa đăng nhập | `UC-01` Tìm kiếm bài viết; `UC-02` Lọc chuyên mục; `UC-03` Xem thử bài Premium (bị Paywall chặn ở mức 20%); `PUB-01..04` Xem banner xoay vòng và bấm quảng cáo. |
| 2 | **Registered User** (Độc giả có tài khoản) | Đã đăng ký tài khoản độc giả | `UC-07/08` Đăng nhập/Đăng xuất; `UC-09/10` Đổi/Quên mật khẩu; `UC-11` Xem bảng giá Premium; `UC-12/13` Tạo đơn và quét mã Napas VietQR PayOS; `UC-14` Xem lịch sử gói. |
| 3 | **Subscriber** (Hội viên VIP còn hạn) | Có gói Premium còn hiệu lực | `UC-04` Đọc toàn văn bài báo Premium; `UC-05` Nghe Audio AI; `UC-06` Bật chế độ đọc tập trung; **Hệ thống tự động loại bỏ 100% khung quảng cáo**. |
| 4 | **Business** (Doanh nghiệp B2B) | Đối tác quảng cáo đã đăng ký | `UC-33` Nộp hồ sơ pháp lý & GPKD; `UC-34` Nộp lại hồ sơ sửa đổi; `UC-35` Tra cứu lịch trống slot; `UC-36` Chấp thuận & Thanh toán hợp đồng; `UC-25/26` Tạo campaign & Upload banner SVG/MP4; `UC-32` Xem Dashboard số liệu thật & Xuất CSV đối soát. |
| 5 | **Ad Manager** (Quản lý quảng cáo) | Trưởng ban vận hành quảng cáo | `UC-37` Thẩm định hồ sơ đối tác (Duyệt/Sửa/Từ chối); `UC-38` Soạn thảo & Gửi đề xuất hợp đồng; `UC-28/29` Kiểm duyệt banner qua Live Preview; `UC-39` Tạm dừng (PAUSE) hoặc Tiếp tục (RESUME) chiến dịch khẩn cấp; `ADM-09` Giám sát tiến độ phân phối. |
| 6 | **Administrator** (Quản trị viên) | Toàn quyền cấu hình hệ thống | Quản trị tài khoản & phân quyền Role; Cấu hình đơn giá slot và gói B2B/Premium (`CFG-01..06`); Đối soát sao kê ngân hàng giải quyết khiếu nại lệch tiền (`BF-01 Exception Handling`). |

---

## PHẦN 3: LỜI THOẠI THUYẾT TRÌNH CHI TIẾT 9 SƠ ĐỒ SWIMLANE

### 1. BF-01: Mua hoặc Gia hạn gói đọc báo Premium (Xử lý đối soát Admin)
- **Các làn Swimlane**: `Độc giả / Hội viên` | `Hệ thống The Pluse` | `Cổng thanh toán VietQR / PayOS` | `Quản trị viên Admin` | `Dịch vụ Email`.
- **Mục tiêu nghiệp vụ**: Độc giả thanh toán mua gói tự động qua Napas VietQR, kích hoạt quyền lợi đọc báo không quảng cáo; có nhánh xử lý ngoại lệ cho Admin đối soát khi chuyển khoản sai tiền.

> 🎤 **LỜI THOẠI THUYẾT MINH BF-01:**  
> *"Kính thưa Thầy Cô, em xin thuyết minh sơ đồ Swimlane BF-01. Luồng bắt đầu tại Làn 1 khi Độc giả truy cập trang Premium và chọn gói đọc báo mong muốn. Hệ thống tại Làn 2 sẽ truy vấn bảng `b2b_packages` để hiển thị rõ giá tiền, thời hạn và các quyền lợi đi kèm. Khi Độc giả bấm Xác nhận đăng ký, Hệ thống sẽ tạo một đơn hàng ở trạng thái PENDING và gọi API cổng thanh toán PayOS tại Làn 3 để sinh mã quét Napas VietQR thời gian thực.*  
> *Độc giả mở ứng dụng ngân hàng quét mã và hoàn tất chuyển khoản. Ngay khi nhận được tiền, PayOS sẽ bắn Webhook IPN về cho Hệ thống. Hệ thống tiếp nhận, xác thực chữ ký số HMAC an toàn và kiểm tra điều kiện rẽ nhánh: Nếu thanh toán hợp lệ, Hệ thống cập nhật trạng thái đơn thành PAID, kích hoạt hạn dùng Premium trong bảng `users`, gửi email hóa đơn biên lai cho Độc giả và mở khóa giao diện đọc báo hoàn toàn không quảng cáo.*  
> *Trong trường hợp có sự cố chuyển khoản sai cú pháp hoặc lệch tiền, đơn hàng sẽ chuyển sang Làn 4 cho Admin đối soát sao kê ngân hàng và bấm duyệt thủ công, bảo đảm quyền lợi tối đa cho độc giả."*

---

### 2. BF-02: Truy cập & Đọc nội dung Premium (Kiểm soát Paywall)
- **Các làn Swimlane**: `Độc giả / Hội viên` | `Hệ thống The Pluse Engine` | `Cơ sở dữ liệu nội dung`.
- **Mục tiêu nghiệp vụ**: Phân quyền đọc báo bản quyền, cắt ngắn nội dung 20% khi chưa mua gói và mở khóa toàn văn kèm Audio AI cho Hội viên.

> 🎤 **LỜI THOẠI THUYẾT MINH BF-02:**  
> *"Ở sơ đồ BF-02, khi Độc giả bấm vào một bài báo có nhãn PREMIUM trên trang chủ, yêu cầu sẽ được chuyển đến Hệ thống ở Làn 2. Tại đây, Middleware sẽ trích xuất JWT Token để kiểm tra: Tài khoản này có gói Premium còn hiệu lực hay không?*  
> *- Nếu ĐÚNG (là Hội viên VIP): Hệ thống truy vấn CSDL ở Làn 3 để lấy toàn văn bài viết và link file Audio giọng đọc AI, đồng thời tắt bỏ toàn bộ các vị trí banner quảng cáo trên màn hình.*  
> *- Nếu SAI (là độc giả vãng lai hoặc gói đã hết hạn): Hệ thống sẽ kích hoạt Paywall, cắt ngắn nội dung chỉ cho xem 20% phần mở đầu và hiển thị hộp thông báo kèm nút Mua gói Premium. Nếu độc giả đồng ý nâng cấp, hệ thống sẽ điều hướng trực tiếp sang luồng thanh toán BF-01 một cách liền mạch."*

---

### 3. BF-03: Nộp hồ sơ đối tác doanh nghiệp B2B (Hồ sơ đăng ký & Pháp lý)
- **Các làn Swimlane**: `Doanh nghiệp (Business)` | `Hệ thống The Pluse Engine` | `Kho lưu trữ CSDL & Storage`.
- **Mục tiêu nghiệp vụ**: Tiếp nhận hồ sơ doanh nghiệp, lưu trữ giấy phép kinh doanh an toàn và tạo phiên bản theo dõi.

> 🎤 **LỜI THOẠI THUYẾT MINH BF-03:**  
> *"Đối với luồng BF-03, đại diện Doanh nghiệp mở biểu mẫu đăng ký đối tác tại Làn 1, điền đầy đủ Mã số thuế, tên công ty, địa chỉ trụ sở và tải lên Giấy phép kinh doanh định dạng PDF hoặc hình ảnh. Hệ thống ở Làn 2 sẽ tiến hành kiểm tra tính hợp lệ: định dạng MST chuẩn, email hợp lệ và file đính kèm dưới 8MB. Nếu dữ liệu không hợp lệ, hệ thống báo lỗi ngay tại form để doanh nghiệp sửa lại.*  
> *Khi dữ liệu đã hợp lệ, Hệ thống sẽ lưu thông tin vào bảng `companies`, lưu file tài liệu vào kho Storage, đồng thời tạo một bản ghi lịch sử trong `company_application_versions` với trạng thái PENDING_REVIEW và đẩy hồ sơ vào hàng đợi xét duyệt của Ad Manager."*

---

### 4. BF-04: Thẩm định & Phê duyệt hồ sơ đối tác doanh nghiệp B2B
- **Các làn Swimlane**: `Quản lý quảng cáo (Ad Manager)` | `Hệ thống The Pluse Engine` | `Doanh nghiệp (Business)` | `Dịch vụ Email`.
- **Mục tiêu nghiệp vụ**: Đảm bảo tính minh bạch pháp lý của đối tác quảng cáo, phân luồng 3 quyết định thẩm định.

> 🎤 **LỜI THOẠI THUYẾT MINH BF-04:**  
> *"Sơ đồ BF-04 thể hiện quy trình thẩm định. Ad Manager đăng nhập vào Làn 1, mở danh sách các hồ sơ đang chờ xét duyệt và xem chi tiết thông tin pháp lý cùng bản scan Giấy phép kinh doanh. Tại đây có 3 ngã rẽ quyết định:*  
> *1. Nếu hồ sơ chuẩn chỉ, Ad Manager bấm PHÊ DUYỆT (APPROVED) -> Hệ thống mở khóa quyền truy cập B2B Workspace cho Doanh nghiệp ở Làn 3 và gửi email chúc mừng ở Làn 4.*  
> *2. Nếu hồ sơ cần làm rõ thêm, Ad Manager bấm YÊU CẦU SỬA ĐỔI (NEEDS_REVISION) kèm ghi chú giải thích -> Hệ thống chuyển trạng thái RESUBMITTED và gửi email hướng dẫn doanh nghiệp nộp bổ sung.*  
> *3. Nếu hồ sơ có dấu hiệu vi phạm hoặc giả mạo, Ad Manager bấm TỪ CHỐI (REJECTED) -> Hệ thống khóa hồ sơ và gửi email nêu rõ lý do từ chối."*

---

### 5. BF-05: Đặt chỗ vị trí quảng cáo & Hoàn tất hợp đồng B2B
- **Các làn Swimlane**: `Doanh nghiệp (Business)` | `Hệ thống The Pluse Engine` | `Quản lý quảng cáo (Ad Manager)` | `Cổng thanh toán VietQR/PayOS`.
- **Mục tiêu nghiệp vụ**: Tra cứu lịch trống, thương thảo hợp đồng, giữ chỗ độc quyền 48h và thanh toán VietQR.

> 🎤 **LỜI THOẠI THUYẾT MINH BF-05:**  
> *"Tại sơ đồ BF-05, sau khi doanh nghiệp được duyệt hồ sơ, họ sẽ vào xem lịch trống của các vị trí quảng cáo ở Làn 1 để chọn vị trí mong muốn như Trang chủ Hero hay Bài viết Sidebar. Doanh nghiệp gửi yêu cầu đặt chỗ, tạo hợp đồng nháp DRAFT. Ad Manager ở Làn 3 sẽ xem xét khả năng đáp ứng và gửi lại Đề xuất hợp đồng chính thức kèm đơn giá.*  
> *Khi Doanh nghiệp bấm Chấp thuận điều khoản (ACCEPTED), Hệ thống ở Làn 2 sẽ áp dụng cơ chế Khóa giữ chỗ tạm thời (Slot Reservation) để tránh việc đối tác khác đặt trùng lịch, đồng thời gọi cổng PayOS ở Làn 4 sinh mã Napas VietQR thanh toán hợp đồng. Khi doanh nghiệp hoàn tất chuyển khoản, hợp đồng lập tức chuyển sang trạng thái ACTIVE, thanh toán PAID, và vị trí quảng cáo chính thức được cấp quyền độc quyền cho doanh nghiệp."*

---

### 6. BF-06: Tạo chiến dịch & Nộp banner/video quảng cáo
- **Các làn Swimlane**: `Doanh nghiệp (Business)` | `Hệ thống The Pluse Engine` | `Lưu trữ Media & CSDL`.
- **Mục tiêu nghiệp vụ**: Cấu hình chiến dịch quảng cáo và tải lên banner SVG/PNG/Video MP4 chuẩn kích thước pixel.

> 🎤 **LỜI THOẠI THUYẾT MINH BF-06:**  
> *"Ở sơ đồ BF-06, Doanh nghiệp mở hợp đồng đã thanh toán và bấm Tạo chiến dịch mới tại Làn 1. Họ nhập tên chiến dịch, thời hạn phân phối, hạn mức lượt xem và đường dẫn trang đích (targetUrl), sau đó tải lên banner ảnh SVG, PNG hoặc video MP4.*  
> *Hệ thống ở Làn 2 sẽ tự động phân tích kỹ thuật: kiểm tra MIME-type, độ phân giải pixel khớp chính xác với kích thước slot đã mua (ví dụ 1200x300 pixel) và kiểm tra tính an toàn của URL đích. Nếu hợp lệ, tệp tài sản được lưu vào kho lưu trữ ở Làn 3, tạo bản ghi `ad_creatives` phiên bản v1, và chiến dịch được chuyển sang trạng thái PENDING_REVIEW để chuyển sang khâu kiểm duyệt nội dung."*

---

### 7. BF-07: Thẩm định, phê duyệt & Kích hoạt chiến dịch quảng cáo
- **Các làn Swimlane**: `Quản lý quảng cáo (Ad Manager)` | `Hệ thống The Pluse Engine` | `Doanh nghiệp (Business)` | `Dịch vụ thông báo`.
- **Mục tiêu nghiệp vụ**: Đảm bảo chất lượng thẩm mỹ và an toàn mạng của banner trước khi phát sóng lên website.

> 🎤 **LỜI THOẠI THUYẾT MINH BF-07:**  
> *"Sơ đồ BF-07 mô tả khâu kiểm duyệt chiến dịch. Ad Manager tại Làn 1 mở danh sách chiến dịch chờ duyệt, sử dụng tính năng Xem trước thời gian thực (Live Preview) để kiểm tra giao diện banner hiển thị thực tế trên các kích cỡ màn hình và bấm thử URL đích để kiểm tra độ an toàn.*  
> *Nếu đạt chuẩn, Ad Manager bấm PHÊ DUYỆT -> Creative chuyển thành APPROVED, chiến dịch chuyển sang ACTIVE và tự động lên lịch phân phối lên hệ thống Ad Server. Nếu banner bị mờ hoặc link lỗi, Ad Manager bấm YÊU CẦU CHỈNH SỬA -> Doanh nghiệp ở Làn 3 sẽ nhận thông báo góp ý để tải lên banner phiên bản mới (version_no + 1) để duyệt lại."*

---

### 8. BF-08: Phân phối quảng cáo & Ghi nhận sự kiện thời gian thực (Lượt xem & Click thật)
- **Các làn Swimlane**: `Độc giả đọc báo (Reader)` | `Động cơ phân phối (Ad Server Engine)` | `CSDL Events & Metrics` | `Doanh nghiệp & Quản lý quảng cáo`.
- **Mục tiêu nghiệp vụ**: Tính năng trọng tâm kỹ thuật: Đo lường lượt xem chuẩn IAB, tính click thật 100%, chống gian lận băm session 2s, loại bỏ hoàn toàn số liệu ảo.

> 🎤 **LỜI THOẠI THUYẾT MINH BF-08:**  
> *"Kính thưa Hội đồng, đây là sơ đồ đinh BF-08 thể hiện cơ chế phân phối và đo lường thời gian thực. Khi Độc giả truy cập bài báo tại Làn 1, Động cơ Ad Server ở Làn 2 kiểm tra: nếu độc giả là Hội viên Premium thì ẩn sạch quảng cáo. Nếu là độc giả phổ thông, Ad Server lọc các chiến dịch đang ACTIVE và banner APPROVED (như chiến dịch The Pluse, game On-Lies và Google Gemini) để hiển thị xoay vòng mỗi 6.5 giây.*  
> *Khi banner lọt vào màn hình của độc giả đáp ứng chuẩn IAB quốc tế (diện tích >= 50% trong thời gian >= 1 giây), trình duyệt gửi request ghi nhận 1 Lượt xem thật (Impression) vào bảng `ad_metrics` ở Làn 3.*  
> *Khi độc giả nhấp chuột vào banner, request đi qua endpoint `/api/advertising/click/{creativeId}`. Tại đây, thuật toán băm SHA-256 session với cửa sổ 2 giây được kích hoạt để chống spam double-click vô tình; hệ thống tăng chính xác 1 Lượt click thật vào bảng `ad_metrics`, ghi log `ad_events` và chuyển hướng HTTP 302 đưa người dùng sang trang web đích.*  
> *Toàn bộ số liệu lượt xem, lượt click và tỷ lệ chuyển đổi CTR được cập nhật tức thì lên Dashboard của Doanh nghiệp và Ad Manager ở Làn 4 mà không có bất kỳ số liệu ảo nào."*

---

### 9. BF-09: Giám sát hiệu suất & Quản lý vận hành chiến dịch quảng cáo
- **Các làn Swimlane**: `Doanh nghiệp (Business)` | `Quản lý quảng cáo (Ad Manager)` | `Hệ thống The Pluse Engine & Background Jobs`.
- **Mục tiêu nghiệp vụ**: Cung cấp Dashboard phân tích trực quan, xuất báo cáo CSV/PDF nghiệm thu và hỗ trợ điều hành khẩn cấp (PAUSE/RESUME).

> 🎤 **LỜI THOẠI THUYẾT MINH BF-09:**  
> *"Cuối cùng là sơ đồ BF-09. Cả Doanh nghiệp ở Làn 1 và Ad Manager ở Làn 2 đều có màn hình Dashboard chuyên dụng. Hệ thống ở Làn 3 đọc dữ liệu chuỗi thời gian từ bảng `ad_metrics` và vẽ biểu đồ xu hướng SVG tương tác cao. Người dùng có thể lọc số liệu theo ngày hoặc bấm Xuất báo cáo nghiệm thu ra file CSV/PDF có mã kiểm toán để đối soát tài chính.*  
> *Đặc biệt, khi có yêu cầu khẩn cấp (như phát hiện sản phẩm có sự cố ngoài thị trường), Ad Manager có thể bấm nút TẠM DỪNG (PAUSE) -> Hệ thống lập tức cập nhật trạng thái trong CSDL và ngắt phân phối banner trên website ngay tức thì. Khi giải quyết xong, Ad Manager bấm TIẾP TỤC (RESUME) để đưa banner trở lại vòng xoay.*  
> *Ngoài ra, tiến trình Background Job định kỳ kiểm tra: khi chiến dịch hết ngân sách hoặc hết hạn hợp đồng, hệ thống sẽ tự động chuyển trạng thái COMPLETED và giải phóng slot quảng cáo trên website một cách hoàn toàn tự động."*

---

## PHẦN 4: KỊCH BẢN THUYẾT TRÌNH DEMO THỰC TẾ TRÊN WEBSITE

| Phân đoạn | Thao tác của Người điều khiển máy chiếu | Lời thoại thuyết trình của Người nói |
|:---|:---|:---|
| **Demo 1: Độc giả Freemium & Mua gói Premium** | 1. Mở Chrome ẩn danh, vào trang chủ The Pluse.<br>2. Bấm vào bài báo có nhãn PREMIUM.<br>3. Xem Paywall 20% và banner quảng cáo.<br>4. Bấm 'Khám phá các gói Premium', chọn Gói Tháng.<br>5. Quét mã VietQR PayOS chuyển khoản.<br>6. Quay lại bài báo: xem nội dung mở khóa 100%, nghe Audio AI, sạch quảng cáo. | *"Kính thưa Thầy Cô, khi em là một độc giả thông thường truy cập vào bài báo Premium, hệ thống cho phép em đọc 20% đoạn mở đầu và sau đó xuất hiện Paywall yêu cầu nâng cấp gói. Bây giờ, em bấm vào nút 'Khám phá các gói Premium', chọn Gói Tháng và bấm Xác nhận. Hệ thống lập tức sinh mã Napas VietQR của PayOS kèm số tiền 79.000đ. Sau khi thực hiện chuyển khoản, Webhook IPN nhận tín hiệu và trang web tự động chuyển sang thông báo Thành công! Giờ quay lại bài báo: toàn bộ nội dung chuyên sâu đã được mở khóa 100%, em có thể nghe Audio AI, và đặc biệt là toàn bộ banner quảng cáo trên website đã hoàn toàn biến mất!"* |
| **Demo 2: Doanh nghiệp nộp hồ sơ & Đặt chỗ slot** | 1. Đăng nhập tài khoản `business.demo`.<br>2. Vào B2B Workspace -> Đăng ký đối tác.<br>3. Mở mục 'Đặt chỗ quảng cáo', chọn slot Homepage Hero cho tháng tới.<br>4. Bấm 'Tạo đề xuất hợp đồng' DRAFT. | *"Tiếp theo là luồng doanh nghiệp B2B. Tại giao diện B2B Workspace, em vào mục 'Đặt chỗ quảng cáo': màn hình trực quan hiển thị sơ đồ website và lịch trống của từng slot như Homepage Hero (1200x300px). Em chọn vị trí Homepage Hero cho tháng tới. Hệ thống kiểm tra ngay lập tức để bảo đảm không bị trùng lịch với đối tác khác và tạo hợp đồng nháp DRAFT."* |
| **Demo 3: Kiểm duyệt Hợp đồng & Banner của Ad Manager** | 1. Đăng nhập tài khoản `admanager.demo`.<br>2. Vào Booking Review Queue gửi đề xuất hợp đồng.<br>3. Vào Campaign Review Queue, bấm 'Xem trước (Live Preview)' và bấm thử link đích.<br>4. Bấm 'Phê duyệt' (APPROVED). | *"Bây giờ em chuyển sang vai trò Ad Manager. Em mở danh sách hợp đồng chờ xử lý để gửi đề xuất hợp đồng chính thức cho đối tác. Khi đối tác thanh toán hợp đồng qua VietQR, doanh nghiệp sẽ nộp banner lên. Ở màn hình kiểm duyệt chiến dịch, Ad Manager sử dụng tính năng 'Live Preview' để xem trước banner thực tế và kiểm tra link đích. Em bấm 'Phê duyệt' -> Chiến dịch lập tức chuyển sang trạng thái ACTIVE và sẵn sàng phát sóng."* |
| **Demo 4: Phân phối 3 Ads thật & Tính Click thật** | 1. Mở tab ẩn danh vào Trang chủ The Pluse.<br>2. Thấy banner xoay vòng: The Pluse, On-Lies Game, Gemini.<br>3. Bấm vào banner On-Lies Game -> Mở tab `https://on-lies-game.onrender.com`.<br>4. Quay lại Dashboard B2B kiểm tra số liệu click. | *"Và đây là tính năng trọng tâm: Nền tảng hiện phân phối 3 chiến dịch thật: The Pluse, game On-Lies của người dùng, và Trợ lý AI Google Gemini. Hệ thống đã được làm sạch toàn bộ 4.000 click ảo giả lập cũ. Khi em cuộn tới banner nhìn trong 1s, hệ thống ghi nhận 1 Impression thật. Khi em bấm chuột vào banner On-Lies Game, request chạy qua backend `/api/advertising/click/{id}`, kiểm tra cơ chế chống double-click 2s, ghi nhận đúng 1 lượt click thật vào CSDL và chuyển hướng 302 sang trang web game của đối tác. Khi quay lại Dashboard: số liệu click tăng lên đúng 1 click thực tế!"* |
| **Demo 5: Vận hành khẩn cấp PAUSE & RESUME** | 1. Tại Active Campaign Monitor của Ad Manager, bấm nút 'Tạm dừng' (PAUSE) chiến dịch On-Lies.<br>2. Ra trang chủ F5 -> Banner ngừng phát sóng.<br>3. Quay lại bấm 'Tiếp tục' (RESUME) -> Banner xuất hiện lại.<br>4. Bấm 'Xuất báo cáo CSV'. | *"Cuối cùng là năng lực phản ứng nhanh trong vận hành. Giả sử đối tác thông báo bảo trì máy chủ game đột xuất, Ad Manager chỉ cần bấm một nút 'Tạm dừng' ngay trên màn hình giám sát. Hệ thống cập nhật CSDL và đưa trạng thái chiến dịch thành PAUSED ngay lập tức. Ra ngoài trang chủ tải lại trang: biểu ngữ này lập tức rút khỏi vòng xoay phân phối. Khi đối tác bảo trì xong, Ad Manager bấm 'Tiếp tục', banner tự động quay trở lại. Đồng thời, nút 'Xuất báo cáo CSV' cho phép tải ngay bảng đối soát lượt xem và lượt click theo từng ngày phục vụ thanh lý hợp đồng."* |

---

## PHẦN 5: GIẢI THÍCH CHI TIẾT SOURCE CODE & QUÁ TRÌNH CHẠY CODE TUẦN TỰ

### 1. Luồng Thanh toán Premium & Kích hoạt Hội viên tự động
- **Frontend**: `frontend/src/pages/public/PricingPage.jsx` gọi `POST /api/payment/create-order` kèm `{ packageId, billingCycle }`.
- **Backend Controller**: `PaymentController.java` tiếp nhận tại `@PostMapping("/create-order")`, trích xuất `AuthenticatedUserPrincipal`.
- **Backend Service**: `PaymentService.java` kiểm tra gói cước trong bảng `subscription_packages`, tạo mã giao dịch duy nhất `txnRef = "ORD-" + System.currentTimeMillis()`, gọi SDK PayOS tạo liên kết thanh toán VietQR.
- **Webhook IPN**: Khi tiền vào tài khoản, PayOS gửi `POST /api/payment/payos-webhook`. Hàm `verifyWebhookData()` kiểm tra chữ ký điện tử HMAC-SHA256 với `CHECKSUM_KEY`. Khi hợp lệ, thực hiện câu lệnh:
  ```sql
  UPDATE users 
  SET subscription_status = 'ACTIVE', 
      subscription_expires_at = CURRENT_TIMESTAMP + INTERVAL ? DAY 
  WHERE user_id = ?;
  ```
- **Client Sync**: State người dùng trong `AuthContext.jsx` chuyển thành `ACTIVE`, giao diện tự động ẩn sạch toàn bộ banner quảng cáo.

### 2. Luồng Kiểm soát Paywall & Phân quyền Đọc báo bản quyền
- **Backend Controller**: `PublicContentController.java` tại `@GetMapping("/articles/{slug}")`.
- **Backend Service**: `PublicContentService.java` gọi hàm `hasActiveSubscription(userId)`:
  ```sql
  SELECT COUNT(*) FROM user_subscriptions 
  WHERE user_id = ? AND status = 'ACTIVE' AND end_at > CURRENT_TIMESTAMP;
  ```
- **Server-Side Security Truncation**: Nếu bài viết là `is_premium = true` mà người dùng không có gói, Server chủ động cắt ngắn nội dung:
  ```java
  article.setContent(article.getContent().substring(0, previewLength));
  article.setPaywalled(true);
  ```
  Điều này bảo đảm dù người dùng có F12 xem DOM hay Inspect Network thì cũng không bao giờ lấy được nội dung bản quyền.
- **Render UI**: `ArticlePage.jsx` kiểm tra cờ `isPaywalled`, hiển thị component `PaywallNotice.jsx` với nút nâng cấp gói.

### 3. Luồng Động cơ Phân phối Banner (Ad Matching Engine)
- **Frontend Component**: `frontend/src/components/AdBanner.jsx` gọi `GET /api/advertising/banners?position={pos}`. Nếu là SUBSCRIBER, hook `useReaderPolicy` trả về `showAdvertising = false` -> Component lập tức `return null`.
- **Backend Service**: `AdvertisingDataService.banners(position, device, country, articleId)`:
  ```sql
  SELECT cr.creative_id AS id, cr.title, cr.media_url AS mediaUrl, cr.target_url AS targetUrl, ...
  FROM ad_creatives cr 
  JOIN ad_campaigns c ON c.campaign_id = cr.campaign_id
  JOIN contracts ct ON ct.contract_id = c.contract_id 
  JOIN ad_slots s ON s.slot_id = ct.slot_id
  JOIN companies cp ON cp.company_id = ct.company_id
  WHERE s.position_code = ? AND s.status = 'ACTIVE' AND cr.status = 'APPROVED'
    AND cp.application_status = 'APPROVED' AND c.status = 'ACTIVE' AND ct.status = 'ACTIVE'
    AND ct.payment_status = 'PAID' AND c.scheduled_start_time <= NOW() AND c.scheduled_end_time > NOW();
  ```
- **Cơ chế Fallback thông minh**: Nếu một vị trí chưa có hợp đồng mua riêng lẻ, phương thức tự động fallback truy vấn 3 chiến dịch thật đang ACTIVE của hệ thống (The Pluse, On-Lies Game, Google Gemini), bảo đảm mọi vị trí đều hiển thị banner thực tế và có `creative_id` thực để tính lượt xem và lượt click thật 100%.

### 4. Luồng Đo lường Lượt xem chuẩn IAB & Lượt Click thật chống Gian lận
- **Đo lường Lượt xem IAB (50% / 1s)**:
  Trong `AdBanner.jsx`, một `IntersectionObserver` được cấu hình với `threshold: [0, 0.5]`. Khi banner xuất hiện ít nhất 50% diện tích trong viewport liên tục đủ 1000ms (1 giây), sự kiện mới được kích hoạt: gọi `POST /api/advertising/events/impression` gửi `creativeId`.
- **Xử lý Click & Chuyển hướng 302**:
  Thẻ banner có đường dẫn trỏ tới `/api/advertising/click/{creativeId}`. Trình duyệt gửi GET request tới `AdvertisingDataController.click()`.
- **Thuật toán Anti-Fraud Debounce 2 giây**:
  Trong `AdvertisingDataService.recordEvent()`:
  ```java
  String fingerprint = hash(session + ":" + creativeId + ":" + (System.currentTimeMillis() / 2000));
  ```
  Nếu phát hiện cùng 1 fingerprint trong vòng 2 giây, request được ghi nhận là `RAPID_CLICK_DUPLICATE` vào `ad_events` và chỉ tăng `invalid_clicks_count` trong `ad_metrics`, tuyệt đối không tăng ảo số click thật.
- **Ghi nhận Số liệu thật**:
  ```sql
  INSERT INTO ad_metrics (creative_id, metric_date, impressions_count, clicks_count) 
  VALUES (?, CURRENT_DATE, 0, 1) 
  ON DUPLICATE KEY UPDATE clicks_count = clicks_count + 1;
  ```
- **Chuyển hướng an toàn**:
  Hàm `CampaignWorkflowService.validateUrl(url)` kiểm tra độ an toàn của trang đích, sau đó gọi `response.sendRedirect(targetUrl)` trả về mã HTTP 302 đưa độc giả tới đúng trang web của đối tác (`https://on-lies-game.onrender.com` hoặc `https://gemini.google.com`).

### 5. Luồng Vận hành Khẩn cấp: Tạm dừng / Tiếp tục Chiến dịch (UC-39)
- **Quyền hạn truy cập**: Endpoint `@PostMapping("/api/advertising/campaigns/{id}/toggle-status")` được bảo vệ bởi `@PreAuthorize("hasAnyRole('AD_MANAGER','ADMINISTRATOR')")`.
- **Xử lý đảo trạng thái**:
  ```java
  String nextStatus = "ACTIVE".equalsIgnoreCase(currentStatus) ? "PAUSED" : "ACTIVE";
  jdbc.update("UPDATE ad_campaigns SET status = ? WHERE campaign_id = ?", nextStatus, campaignId);
  ```
  Vì câu lệnh phân phối `banners()` luôn có điều kiện `c.status = 'ACTIVE'`, ngay khi trạng thái đổi thành `PAUSED`, banner lập tức bị loại khỏi vòng xoay phân phối trên website mà không cần khởi động lại máy chủ.

---

## ĐÁNH GIÁ CHI TIẾT TÀI LIỆU SDS (SOFTWARE DESIGN SPECIFICATION)

### 1. Điểm mạnh và Độ hợp lý của tài liệu SDS hiện tại (`The_Pluse_SDS.docx`)
1. **Kiến trúc phân tầng chuẩn mực**: Tài liệu mô tả rất mạch lạc luồng đi từ Giao diện (Screen/Page) -> Controller -> Service -> CSDL (SQL/Table), phân tách rõ trách nhiệm giữa các lớp.
2. **Bảng đối chiếu Source Code cực kỳ chi tiết**: Ở cuối tài liệu có bảng ánh xạ chính xác tên file React trong `frontend/src/` và class Java trong `backend/src/main/java/com/group5/premiumnews/`, kèm tên các method quan trọng.
3. **Mô tả bảo mật sâu sát**: Tài liệu nêu rõ các cơ chế bảo vệ: băm session SHA-256, xác thực chữ ký Webhook HMAC-SHA256, kiểm tra quyền sở hữu `ct.company_id = users.company_id` chống lỗi IDOR, và không lưu trữ IP/Session thô vào CSDL.
4. **Bao phủ trọn vẹn các Use Case cốt lõi**: Từ mua gói Premium, đọc báo bản quyền, nộp hồ sơ đối tác, đặt chỗ slot, tạo chiến dịch cho đến phân phối và đối soát nghiệm thu.

### 2. Các điểm khuyến nghị cập nhật để SDS đạt điểm tuyệt đối
1. **Đồng bộ thông số Anti-fraud Debounce (Mục 8.3)**: Trong bản thảo cũ của SDS ghi nhận cửa sổ băm session là 30 giây (`/ 30000`). Nay mã nguồn đã được tối ưu xuống 2 giây (`/ 2000`) để phản hồi tức thì cho các lượt click thử nghiệm thực tế của người dùng mà vẫn ngăn chặn được spam click. Cần cập nhật thông số này thành 2 giây trong SDS.
2. **Bổ sung Cơ chế Fallback Banners (Mục 8.2)**: Cần bổ sung mô tả thuật toán fallback trong `AdvertisingDataService.banners()`: khi một slot chưa có hợp đồng mua riêng lẻ, hệ thống tự động phân phối 3 chiến dịch thật của hệ thống (The Pluse, On-Lies Game, Gemini) để đảm bảo không trả về mảng rỗng và luôn đo lường được lượt xem/click thật.
3. **Làm nổi bật ranh giới giữa BF-08 và BF-09**: Trong SRS, BF-08 là Phân phối & Đo lường sự kiện, còn BF-09 là Giám sát hiệu suất & Quản lý vận hành (Dashboard, Pause/Resume). Trong SDS, hai phần này đang nằm chung trong Chương 8 (mục 8.2-8.3 là BF-08; mục 8.4-8.5 là BF-09). Nên bổ sung ghi chú tiêu đề rõ ràng để hội đồng phản biện dễ theo dõi sự tương ứng 1-1 với SRS.
4. **Cập nhật 3 Chiến dịch Thực tế**: Thay thế tên các thương hiệu mẫu cũ (NovaLearn, GreenFarm, CloudDesk) bằng 3 thương hiệu thật hiện tại: **The Pluse**, **On-Lies Game** (`https://on-lies-game.onrender.com/`), và **Google Gemini** (`https://gemini.google.com/`).

---

## LỜI KẾT BẢO VỆ ĐỒ ÁN

> 🎤 **LỜI THOẠI KẾT THÚC (Leader / Đại diện Nhóm):**  
> *"Kính thưa Hội đồng phản biện và Thầy Cô! Qua phần trình bày và demo thực tế vừa rồi, Nhóm 5 đã chứng minh hệ thống The Pluse không chỉ hoàn thiện đầy đủ 100% các yêu cầu chức năng từ BF-01 đến BF-09 theo đúng tài liệu SRS, mà còn được xây dựng với tư duy kỹ thuật chỉn chu: từ việc xử lý tranh chấp dữ liệu bằng SQL FOR UPDATE, bảo mật thanh toán qua chữ ký điện tử HMAC-SHA256, chuẩn đo lường IAB quốc tế, cho tới việc cam kết 100% số liệu hiển thị và click thật minh bạch.*  
> *Nhóm chúng em xin chân thành cảm ơn sự lắng nghe và chỉ dẫn tận tình của Thầy Cô, và rất mong nhận được những câu hỏi phản biện đóng góp để dự án ngày càng hoàn thiện hơn nữa! Nhóm em xin chân thành cảm ơn!"*
