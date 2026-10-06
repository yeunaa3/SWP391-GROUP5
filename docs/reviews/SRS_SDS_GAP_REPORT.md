# Báo cáo rà soát SRS, SDS và nền móng source code

Ngày rà soát: 2026-10-04  
Phạm vi: SRS tab `t.0`, SDS tab `t.g95bnl3ff9ll`, bản `MySQL DB.txt` và thư mục `SWP391-GROUP5`.

## 1. Kết luận thẳng

Tám Business Flow hiện tại **không thiếu về mặt kể lại quy trình**, nhưng vẫn **sơ sài ở mức có thể bắt đầu lập trình an toàn**. Mỗi flow đã có trigger, precondition, main flow và alternative flow; phần còn thiếu chủ yếu là quy tắc trạng thái, xử lý đồng thời, tính bất biến của dữ liệu tài chính, idempotency và điều kiện lỗi cụ thể.

Kiến trúc React → REST API → Spring Boot → Spring Data JPA → MySQL là phù hợp với đề tài và đủ để triển khai. Vấn đề lớn nhất không phải đổi kiến trúc mà là làm cho SRS, SDS, database và source code dùng cùng một thuật ngữ, cùng trạng thái và cùng mô hình quan hệ.

## 2. Lỗi và phần thiếu trong SRS

### 2.1 Lỗi nhất quán phải sửa trước

1. Bảng tổng hợp Use Case ở mục 4.2 dừng tại UC-35, trong khi Requirement Specifications đã có UC-36, UC-37, UC-38 và UC-39. Cần bổ sung bốn UC này vào bảng tổng hợp, permission matrix và use-case diagram.
2. Dòng “System Functionalities” vẫn ghi `editorial workflows`, trái với phạm vi đã chốt là không có Editor/Reviewer và bài báo đã có sẵn trong database.
3. Mục Use Case Diagram còn câu `Generate final diagrams in mermaid.live using the following placeholders`. Đây là nội dung hướng dẫn/placeholder, không phải nội dung SRS cuối.
4. Nhiều UC có `Created By` và `Date Created` để trống; nhiều `Frequency of Use` dùng câu mẫu giống nhau và `Other Information` chỉ ghi “Supporting capability”. Cần thay bằng thông tin thật hoặc bỏ trường không dùng.
5. Tên UC trong bảng và phần chi tiết chưa đồng nhất hoàn toàn: UC-05 `Register Account`/`Register User Account`, UC-18 `Update and Resubmit`/`Track and Revise`, UC-25 `Create and Manage Ad Campaign`/`Create and Manage Campaign`, UC-33 có/không có từ `Base`.
6. SRS nói inventory có 53 màn hình và thực tế đúng 53, nhưng một số screen chưa có UC riêng: Notification Center, các Dashboard, Contract List/Invoice, Admin Dashboard. Có thể giữ là screen tổng hợp, nhưng cột mapping phải ghi rõ các UC nguồn thay vì để trống.

### 2.2 Quy tắc còn thiếu theo từng Main Flow

| Flow | Phần cần chốt để code |
| --- | --- |
| BF-01 | Quy tắc gia hạn khi gói hiện tại còn hạn; một user có được nhiều subscription ACTIVE không; giá/gói phải snapshot; webhook trùng; người dùng đóng trang nhưng gateway báo thành công; timeout và refund. |
| BF-02 | Thời điểm entitlement có hiệu lực; xử lý subscription vừa hết hạn; cache không được làm lộ full content; ghi view một lần hay mỗi request; quyền của Admin/Ad Manager đối với Premium content. |
| BF-03 | Business đăng ký tài khoản bình thường rồi mới nộp hồ sơ; danh sách loại giấy tờ bắt buộc; nhiều file và version thay thế; giới hạn MIME/size; tax code trùng; một account được đại diện bao nhiêu company. |
| BF-04 | Hai Ad Manager mở cùng hồ sơ; optimistic locking hoặc kiểm tra trạng thái trước khi quyết định; reason bắt buộc khi reject/request revision; quyền tải tài liệu; lịch sử các lần review không được ghi đè. |
| BF-05 | Giữ chỗ tạm bao lâu; chống hai doanh nghiệp đặt trùng slot; công thức giá; snapshot slot/package; thời hạn proposal; revision number; accept và payment phải idempotent; trạng thái hợp đồng đầy đủ. |
| BF-06 | Draft được sửa đến thời điểm nào; submitted version phải bất biến; tạo version creative mới khi sửa; kích thước chính xác theo slot; kiểm tra URL; quyền sở hữu contract/campaign; upload lỗi và orphan file cleanup. |
| BF-07 | Review campaign và review creative là hai quyết định riêng; điều kiện tổng hợp để Approve; ai được schedule; job activate phải kiểm tra lại contract/creative/quota; request revision phải chỉ rõ trường; replacement creative tạo version mới. |
| BF-08 | Thứ tự chọn quảng cáo; targeting theo category/tag; cap/quota khi nhiều request đồng thời; impression hợp lệ là gì; dedup click; bot/invalid click; redirect an toàn; asset lỗi; dừng chính xác khi hết hạn/quota; thời điểm chốt báo cáo. |

### 2.3 External API và Background Job còn thiếu

- Payment: chưa chốt provider giả lập, schema request/response, chữ ký webhook, retry, timeout, idempotency key, mapping trạng thái và cách đối soát callback đến muộn.
- Email: chưa chốt template, delivery status, retry/backoff, duplicate suppression và giới hạn số lần gửi.
- Cloud Storage/CDN: chưa chốt cơ chế upload trực tiếp hay qua backend, URL public/signed URL, MIME allowlist, virus/safety scan và xóa file rác.
- Scheduler: cần distributed lock hoặc cơ chế “claim record” để một job không xử lý trùng; mọi job phải idempotent, dùng UTC, có log số bản ghi thành công/thất bại và cách chạy lại thủ công.

## 3. Lỗi và phần thiếu trong SDS

### 3.1 Lỗi tài liệu rõ ràng

1. Phần Package Diagram còn câu kiến trúc cũ Jakarta Web: `controller, dao, model, filter, util` và `Controllers call DAO classes directly`. Cần thay bằng React + Controller → Service → Repository.
2. Detailed Code Design gần như chưa làm: còn `<Feature/Function Name1>`, `<Sequence Diagram Name2>`, `…` và ví dụ Add New User của template.
3. SDS mô tả 18 bảng nhưng physical database cần 30 bảng sau khi thêm junction/operational tables. Số bảng và table descriptions phải cập nhật.
4. SDS dùng `users.role_id`, trong khi database đúng là `user_roles` để hỗ trợ nhiều vai trò.
5. SDS mô tả Article có quan hệ trực tiếp đơn, trong khi database dùng `article_categories` và `article_tags`.
6. SDS mô tả targeting trực tiếp category/tag, trong khi database dùng `ad_targeting_categories` và `ad_targeting_tags`.
7. SDS còn nhắc `application.properties`; source thật dùng `application.yml` và `application-prod.yml`.
8. Cụm từ `token or session handling` chưa chốt phương án. Source đã chốt session cookie + CSRF; SDS phải ghi đúng một phương án.
9. Nhiều chữ `SDS_RAW` và nội dung lặp cần xóa; TOC, figure name và change log chưa hoàn thiện.

### 3.2 Thiết kế còn thiếu

- Chưa có API convention: base path, HTTP status, pagination, error JSON, validation error, idempotency key và versioning.
- Chưa có sequence diagram cho đăng nhập, Premium payment/webhook, contract payment/webhook, creative upload, campaign approval và ad delivery.
- Chưa có state diagram cho Company Application, Contract, Subscription, Transaction, Campaign và Creative.
- Chưa mô tả transaction boundary và concurrency control cho booking slot, payment callback, quota và activation job.
- Chưa có deployment diagram cho local và production; thiếu biến môi trường, HTTPS/reverse proxy, backup và migration strategy.
- Chưa có security design đủ chi tiết: session cookie, CSRF, BCrypt, RBAC, company isolation, rate limit, upload validation, audit và secret management.
- Chưa có test strategy: unit, repository, API integration, migration, frontend component, E2E và acceptance test theo BF.

## 4. Đánh giá database nhóm gửi

File tên `MySQL DB.txt` thực chất là cú pháp SQL Server: có `GO`, `IDENTITY`, `DATETIME2`, `NVARCHAR`, `GETDATE()`, `CLUSTERED`, `INCLUDE`, filtered index và `sys.indexes`. File đó không thể chạy trực tiếp trên MySQL.

Các vấn đề nghiệp vụ khác:

- Chưa có nhiều legal document/version cho một company.
- Chưa có nơi lưu gateway webhook event để chống callback trùng.
- `ad_metrics` chỉ là số tổng hợp, không đủ để kiểm tra/deduplicate impression và click thô.
- Chưa có currency và snapshot đầy đủ cho các giao dịch/gói đã bán.
- Trạng thái Contract thiếu các bước PROPOSED, REVISION_REQUESTED, ACCEPTED, PENDING_PAYMENT, PAYMENT_FAILED và CANCELLED.
- Ràng buộc `ad_reviews` chưa đảm bảo creative thuộc đúng campaign.
- Index không thể tự ngăn hai khoảng thời gian booking giao nhau; bắt buộc Service phải lock/check trong transaction.
- Cột `updated_at` kiểu SQL Server không tự cập nhật; MySQL migration phải dùng `ON UPDATE` hoặc code quản lý.

## 5. Các quyết định đã chốt trong source

1. Database chính thức là MySQL 8.4; schema được quản lý bằng Flyway, không dùng Hibernate tự tạo bảng.
2. Authentication dùng server-side session cookie HttpOnly; request thay đổi dữ liệu dùng CSRF token. Không lưu JWT trong localStorage.
3. Đăng ký tài khoản có hai loại Reader và Business. Business được tạo role BUSINESS ngay, nhưng chưa có company. Company và giấy tờ chỉ được tạo ở BF-03.
4. Không có Editor/Reviewer. Article, Category và Tag là dữ liệu có sẵn; website chỉ tìm kiếm, đọc và áp paywall.
5. Trạng thái Company, Contract, Campaign, Subscription và Payment có transition policy tập trung; Service phải gọi policy trước khi cập nhật.
6. Giá, currency, duration, quota và thông tin slot được snapshot khi tạo Subscription/Contract để lịch sử không đổi theo master data.
7. Bổ sung ba physical support table không cần xuất hiện như business entity chính trên conceptual ERD:
   - `company_documents`: nhiều tài liệu và version cho hồ sơ doanh nghiệp.
   - `payment_webhook_events`: chống xử lý callback thanh toán trùng.
   - `ad_events`: lưu event thô để xác thực/deduplicate trước khi tổng hợp `ad_metrics`.
8. Notification table có thêm trạng thái delivery/retry để Background Job gửi email có kiểm soát.

## 6. Những thay đổi đã thực hiện trong repository

| Khu vực | Thay đổi | Lý do |
| --- | --- | --- |
| Database | Tạo migration MySQL V2 gồm 30 bảng và V3 seed role/settings | Thay file SQL Server không chạy được; đưa schema vào version control. |
| Security | Session login/logout/me, CSRF cookie, BCrypt, role loading từ DB | Chốt cơ chế auth và khớp `credentials: include` của React. |
| Registration | API đăng ký Reader/Business, kiểm tra trùng username/email | Làm rõ account Business khác hồ sơ partnership. |
| Workflow | Enum + transition policy + unit test | Tránh mỗi thành viên tự đặt trạng thái khác nhau. |
| Frontend | Router/catalog đủ 53 screen, layout theo khu vực, role guard | Mỗi screen có route và mapping BF/UC để nhóm code song song. |
| UI foundation | Login và Registration là form thật; các route khác có implementation contract | Có điểm bắt đầu chạy được nhưng không giả vờ đã hoàn thiện 51 màn hình còn lại. |
| Documentation | Coding plan, graph 8 BF, traceability và gap report | Tạo nguồn tham chiếu chung khi chia việc và review. |

## 7. Việc còn phải làm trước khi gọi là “đã code hệ thống”

Ưu tiên P0:

1. Nhóm duyệt migration V2, đặc biệt trạng thái và ba support table mới.
2. Sửa SRS/SDS online theo các lỗi ở mục 2–3; không để source và tài liệu lệch nhau.
3. Chốt API contract theo `docs/planning/CODING_PLAN.md` trước khi frontend/backend của từng flow code riêng.
4. Chọn payment sandbox, email sandbox và storage provider hoặc viết Fake Adapter cho demo.
5. Tạo seed data bài báo/category/tag/package/slot và tài khoản demo cho từng role.

Ưu tiên P1:

6. Code feature theo thứ tự dependency và acceptance criteria của từng BF.
7. Thêm optimistic locking (`@Version`) cho Company/Contract/Campaign và transaction lock cho booking/quota.
8. Viết integration test chạy cùng MySQL container; hiện tại unit test không chứng minh migration chạy được nếu máy chưa có Docker/MySQL.
9. Thêm CI chạy backend test, frontend build và migration smoke test.
10. Hoàn thiện logging, metrics, backup và deployment profile trước khi deploy 24/7.

## 8. Mức độ sẵn sàng

- Kiến trúc tổng thể: **Đạt**.
- SRS về phạm vi và screen: **Khá đầy đủ**, cần sửa nhất quán và bổ sung quy tắc có thể code.
- SDS high-level: **Đạt**, nhưng Detailed Design hiện **chưa đạt** vì còn template.
- Database cũ: **Không chạy trên MySQL**; migration mới là bản dùng để review và phát triển.
- Source foundation: **Đã sẵn sàng để chia feature**, chưa phải sản phẩm hoàn chỉnh.

Nhóm có thể bắt đầu code sau khi duyệt các quyết định P0. Không nên tiếp tục bổ sung màn hình mới nếu không có UC hoặc giá trị nghiệp vụ rõ ràng.

## 9. Kết quả kiểm tra source

- Backend Maven: build thành công; 4/4 test pass.
- Frontend Vite: production build thành công.
- Screen catalog: 53 screen, 53 ID duy nhất, 53 route duy nhất.
- Migration static audit: 30 table, 90 named constraint, không có tên constraint trùng.
- `git diff --check`: không có whitespace error; cảnh báo LF/CRLF chỉ do cấu hình Windows.
- Chưa chạy Flyway thực tế trên MySQL vì máy hiện không có Docker Desktop hoặc MySQL 8.4 server. Đây là kiểm tra còn thiếu trước khi merge migration vào nhánh chung.
