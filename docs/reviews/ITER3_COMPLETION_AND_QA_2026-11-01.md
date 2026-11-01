# Iteration 3 — đối chiếu phạm vi, triển khai và kiểm thử

Ngày: 01/11/2026, Asia/Saigon. Baseline source: `2377845`. Thay đổi đang ở working tree, chưa commit/push/deploy.

## 1. Phạm vi đúng theo Project Tracking

Nguồn: `The_Pluse_ProjectTracking.xlsx`, sheet Functions, dòng 63–68; owner **Duc Ngoc**, Primary BF-06. Đọc đối chiếu SRS ngày 11/10/2026. Không sửa workbook/SRS/SDS gốc.

| Dòng | UC | Screen/function | Trước lượt này | Kết quả trên local/QA |
|---|---|---|---|---|
| 63 | UC-27 | BUS-16 Campaign Submission Review | Đã làm cùng Iteration 2: checklist, confirm, immutable submission, chuyển BUS-17 | Giữ implementation; kiểm thử lại thiếu tệp, sửa điều kiện, cancel, submit, khóa, retry, rollback và snapshot |
| 64 | UC-08 | ACC-01 Profile and Security | Đã nối API; có validation/confirm/password | Sửa mất thông báo sau save do refresh session; kiểm tra BCrypt Unicode theo byte; xác minh lưu DB/relogin và rollback |
| 65 | UC-34 | CFG-02 User and Role Management | Generic prototype, chưa có API ghi | Màn thật và API: tìm/filter/phân trang, role/status, nhóm quyền tùy chỉnh, capability catalog, version, audit, last-admin guard, quyền session cập nhật theo DB |
| 66 | UC-37 | CFG-06 System Settings | Generic prototype; dữ liệu mẫu | Catalog thật, xem/sửa khóa được phép, xác nhận/hủy/default, validation, version, audit before/after, áp dụng upload mới |
| 67 | UC-14 | JOB-01 Expire Premium Subscriptions | Đã có scheduler nhưng self-invocation làm `@Transactional` không qua proxy; thiếu audit expiry | Worker transaction riêng theo user, khóa đúng thứ tự, expiry + notification + audit + revoke role, idempotent; mặc định 15 phút theo SRS |
| 68 | UC-02 | API-05 Retrieve Media Asset | Đã có read endpoint và phân quyền/storage adapter | Kiểm thử owner/staff/guest/approved/missing; thêm fallback và retry ở màn campaign thay ảnh/video lỗi |

BUS-17 dùng để xác minh postcondition UC-27, không tự đổi phân công màn này thành một mục Iteration 3 mới.

## 2. Những thay đổi thực tế

### CFG-02 / UC-34

- `frontend/src/pages/admin/AccessManagementPage.jsx`: dữ liệu thật; tìm username/email/full name, filter role/status, 20 tài khoản/trang; xem company, role và năng lực; chỉnh status/role; tạo/sửa nhóm quyền; xem lại đề xuất và xác nhận với lý do.
- `AccessAdministrationController` → `AccessAdministrationService` → `JdbcTemplate` → users/roles/user_roles/role_permissions/audit_logs. Company chỉ đọc; không chuyển ownership doanh nghiệp hoặc sửa mật khẩu qua màn quản trị này.
- Capability catalog gồm các vùng quyền đang tồn tại: READER, SUBSCRIBER, BUSINESS, AD_MANAGER, ADMINISTRATOR. Nhóm tùy chỉnh ánh xạ đến các capability này, không nhận chuỗi authority tùy ý. Quyền SUBSCRIBER không thay việc kiểm tra thuê bao; BUSINESS không bỏ gate hồ sơ/hợp đồng/ownership.
- Role hệ thống giữ nguyên tên/capability; có thể sửa mô tả/trạng thái trong giới hạn last-admin guard. Nhóm mới có tên/mô tả/status/capability được kiểm tra. Không xóa lịch sử user/company.
- Mọi mutation khóa cùng catalog role trước, rồi khóa user/role cần sửa. Sau mutation phải còn ít nhất một user ACTIVE có role ACTIVE cấp ADMINISTRATOR; nếu không, rollback. Đã test hai admin đồng thời loại bỏ quyền/trạng thái của hai tài khoản: chỉ một thao tác thành công.
- User dùng `access_version`, role dùng `edit_version`; form cũ nhận 409. Sửa role cũng tăng version của các user đang được gán role đó.
- `LiveAccountAccess` đọc status/hash/quyền hiện tại bằng truy vấn DB; `LiveAccountAccessFilter` chạy trước AuthorizationFilter. Khóa/xóa user/đổi hash thu hồi session ở request tiếp theo; đổi role/capability có hiệu lực mà không chờ đăng nhập lại.
- `DatabaseUserDetailsService` dùng cùng nguồn quyền khi login, nên nhóm tùy chỉnh không chỉ tồn tại trên giao diện quản trị.

### CFG-06 / UC-37

- `SystemSettingsPage` → `SystemSettingsController` → `SystemSettingsService` → system_settings + audit_logs.
- Catalog runtime v1 sử dụng khóa đã seed ở V3, chỉ mở chỉnh sửa khi đã có consumer thực tế:

| Khóa | Kiểu, default, validation | Cách áp dụng |
|---|---|---|
| creative.max.image.bytes | INTEGER; default 10485760; 1..52428800 | Upload creative ảnh mới đọc ngay giá trị DB; hiệu lực thực tế `min(value, 8388608)` byte |
| creative.max.video.bytes | INTEGER; default 104857600; 1..524288000 | Upload creative video mới đọc ngay giá trị DB; hiệu lực thực tế `min(value, 8388608)` byte |
| booking.hold.minutes | Giá trị legacy V3; chỉ xem | Chưa nối consumer động; không thay quy tắc hold/payment 48 giờ của BF-05 |
| ad.click.dedup.seconds | Giá trị legacy V3; chỉ xem | Chưa nối consumer động; không thay thuật toán BF-08 |
| payment.currency | STRING, VND; chỉ xem | Khóa không editable; không đổi đơn vị tiền/giao dịch lịch sử |

- Trần HTTP multipart hiện tại vẫn là 8 MB. Catalog hiển thị cả configured value và effective bytes; không hứa nhận file 10/100 MB khi HTTP chưa cho phép. Tệp pháp lý vẫn dùng quy tắc riêng. Tệp đã lưu không bị xóa hay thay đổi khi giảm cấu hình.
- Chỉ value/version/restoreDefault/reason được nhận từ client. Type/default/rule/key whitelist đọc từ server. Số âm, 0, decimal, exponent, overflow và khóa chỉ xem đều bị chặn.
- Xem lại trước→sau, xác nhận/hủy; restore default vẫn cần xác nhận. Row lock + edit_version chống ghi đè; update và audit JSON before/after cùng transaction. Đã mô phỏng audit DB lỗi, giá trị/version cũ vẫn nguyên.
- Đây là catalog giới hạn có chủ đích. Không tự mở thêm tham số thanh toán, delivery, SMTP, secret hoặc scheduler tùy ý. Nếu nhóm mở rộng catalog, phải bổ sung consumer và testcase tương ứng; không chỉ thêm ô input.

### ACC-01 / UC-08

- GET lấy dữ liệu thật của user hiện tại. PUT chỉ có fullName/email/phone/currentPassword/newPassword/confirmNewPassword; role/status/company không nằm trong DTO cho tự sửa.
- Mật khẩu hiện tại bắt buộc và được so với hash DB; hai trường mật khẩu mới có thể cùng trống khi chỉ sửa profile. Nếu đổi, phải khớp nhau, khác hiện tại, 8–72 ký tự và không vượt 72 byte UTF-8 của BCrypt. Unicode quá giới hạn trả lỗi validation, không để encoder gây 500.
- Email trùng trả 409; tên/email/phone không hợp lệ bị chặn. Có xác nhận lần nữa; hủy không ghi. Hash mật khẩu không được trả về frontend.
- `AuthContext.refresh({silent:true})` giữ trang/form/bộ lọc/thông báo trong lúc cập nhật identity sau save. Luồng login/đổi tài khoản vẫn dùng refresh đầy đủ; xác thực thất bại vẫn xóa user. Hai màn ProfilePage và AccessManagementPage dùng chế độ này.
- Đổi mật khẩu chỉ được test qua API với tài khoản QA phụ. Không đổi mật khẩu demo. Browser test chỉ nhập mật khẩu hiện tại để xác nhận profile; không tự nhập mật khẩu mới qua browser.

### JOB-01

- `PremiumSubscriptionScheduler` chỉ điều phối; worker `PremiumExpirationService.expireUser` là bean khác có transaction thật. Không đặt hy vọng vào gọi nội bộ method `@Transactional` trong chính scheduler.
- Chu kỳ mặc định 900000 ms (15 phút), delay khởi động 15 giây; QA rút xuống 1 giây. Mỗi user: khóa users → đọc lại subscriptions hết hạn → EXPIRED → notification/audit. Một user lỗi rollback và được thử lại ở vòng sau; không chặn các user khác.
- Chỉ thu hồi role SUBSCRIBER nếu không còn subscription ACTIVE với `start_at <= now < end_at`. Giữ role khác. Gói chưa tới ngày bắt đầu hoặc còn hạn không bị expire. Không tạo thông báo/audit trùng sau khi chạy lại.
- Giữ chức năng dọn premium_requests PENDING quá 24 giờ đã có của BF-01, chuyển sang worker transaction riêng. Không thay luồng chọn/đổi gói Premium của thành viên khác.

### API-05

- Endpoint giữ nguyên: `/api/media/document/{id}` và `/api/media/creative/{id}`; ID được resolve bằng DB, không nhận đường dẫn file từ browser.
- Legal document: owner/staff; không public. Creative nháp: owner/staff; creative APPROVED: có thể public. Metadata không tồn tại, không đúng quyền hoặc storage mất trả phản hồi kiểm soát, không đọc đường dẫn tùy ý.
- `CreativeMedia.jsx` cho campaign preview: ảnh/video tải lỗi hiển thị hướng dẫn và nút thử lại; không tự chuyển sang cloud URL công khai để lách quyền.
- Đã test file mất thật trong storage QA: BUS-16 còn 9/10 và khóa gửi; khôi phục file, retry thấy ảnh thật rộng 320 px, làm mới được 10/10.

## 3. Database / migration

Thêm **V19__iteration3_access_and_settings.sql**. Trước khi tạo đã đọc inventory nhánh `main` qua GitHub: V1–V18, chưa có V19. Không chỉnh nội dung/tên V1–V18. Chưa push; khi tích hợp nhóm phải kiểm tra lại số V19 chưa bị một thành viên khác sử dụng.

- users.access_version, roles.edit_version, system_settings.edit_version: BIGINT mặc định 0.
- role_permissions: PK (role_id, permission_code), FK đến roles; CHECK whitelist 5 capability; seed mỗi role hệ thống với capability vốn có.
- users ↔ user_roles ↔ roles ↔ role_permissions; companies liên kết users.company_id, không đổi từ UC-34/UC-08.
- system_settings.updated_by → users; audit_logs.actor_id → users, old_value/new_value JSON.
- JOB đọc/ghi subscriptions, user_roles, notifications và audit_logs. Không sửa subscription package, giá hoặc dữ liệu hợp đồng.
- BUS-16 giữ thiết kế campaign_submissions immutable snapshot + creative_id + version; không thêm migration cho campaign trong lượt này.
- Flyway trên schema QA mới chạy thành công V1→V19; Hibernate validate thành công. DB xác nhận V19 success=1; trigger mô phỏng lỗi còn lại **0**.

## 4. Kiểm thử và kết quả cuối

Môi trường riêng: MySQL 127.0.0.1:13306/**pulse_iteration3_qa**; backend **18081**, Spring profile qa; frontend **5173** proxy 18081; storage `.runtime/iteration3-uploads`. Không dùng dữ liệu production, không đổi password demo, không thanh toán thật. Credential fixture chỉ nằm trong `.runtime/iter3-ui.json`, không ghi vào report/commit.

| Cấp độ / nhóm | Đã chạy | Đạt | Thất bại cuối | Bỏ qua |
|---|---:|---:|---:|---:|
| Unit frontend toàn bộ hiện có | 48 | 48 | 0 | 0 |
| Unit backend trực tiếp liên quan (*) | 25 | 25 | 0 | 0 |
| Backend toàn bộ (bao gồm 25 ở trên, không cộng trùng) | 99 | 97 | 1 | 1 |
| API + authorization + DB/storage Iteration 3 | 20 nhóm | 20 | 0 | 0 |
| Regression API BF-03/BF-06 trên cùng QA mới | 22 nhóm | 22 | 0 | 0 |
| System/UI (thao tác browser, không phải runner tự động riêng) | 13 nhóm | 13 | 0 | 0 |

(*) IterationThreePolicyTests 4; LiveAccountAccessFilterTests 4; PremiumExpirationServiceTests 3; AccountProfileServiceTests 4; CampaignWorkflowServiceTests 6; BusinessCreativeVideoTests 3; MigrationInventoryTests 1. Tổng 25, failures/errors/skips = 0.

Frontend production build và backend package thành công. `git diff --check` đạt. Frontend còn cảnh báo chunk JS >500 kB đã có trước.

### 20 nhóm API/integration Iteration 3

1. Guest/Reader/Business không vào admin; CSRF bắt buộc.
2. Search/filter/page, không lộ password/hash; page biên.
3. Khóa account thu hồi session; login bị chặn; unlock đăng nhập lại được.
4. Stale user version bị chặn; không khóa hoặc bỏ role của admin cuối cùng; rollback.
5. Role tùy chỉnh/duplicate/capability; áp dụng quyền cho session đang mở; role hệ thống bảo vệ; stale role version.
6. Settings invalid, boundary, readonly, save, stale version, default, audit.
7. Audit settings lỗi → rollback cả value và version.
8. Giảm upload limit áp dụng ngay; tệp cũ vẫn đọc; upload bị chặn không tăng metadata/version.
9. Profile sai current password/tên/email/phone; trùng email; new password mismatch/same/Unicode quá byte; lưu và fresh login đọc đúng.
10. Đổi password QA phụ: phiên khác bị thu hồi, phiên vừa đổi vẫn dùng được, mật khẩu cũ không login được.
11. Hết hạn đúng biên end_at; role thu hồi; notification/audit đúng một lần.
12. Có gói chồng lấp còn hạn giữ entitlement; gói tương lai không bị expire.
13. Audit expiry lỗi → rollback trạng thái/notification; gỡ lỗi thì job xử lý lại được.
14. Creative owner/manager/admin/guest; APPROVED public; missing ID/storage trả 404.
15. Legal document owner/staff; guest/company khác bị chặn.
16. BUS-16 thiếu dữ liệu bị chặn; đủ điều kiện gửi; retry không tạo thêm submission.
17. Hai admin sửa đồng thời: một thành công, một bị chặn; luôn còn admin.
18. Audit access lỗi → rollback status, membership và version.
19. Không tự cấp role/company qua profile; lỗi ghi audit profile giữ dữ liệu trước đó.
20. Gửi campaign lỗi ghi DB → giữ DRAFT/edit_version/creative DRAFT, không tạo submission dở dang; retry sau gỡ lỗi thành công.

### 13 nhóm system/UI đã thực hiện

1. CFG-02 load dữ liệu thật, tìm đúng một account QA.
2. Xem lại trạng thái/role, hủy dialog → reload giữ trạng thái cũ.
3. Xác nhận khóa và khôi phục QA account; đọc lại được, không mất filter/success message.
4. Tạo nhóm QA_UI_READER_20261101 chỉ cấp READER, save, reload, mở lại thấy đúng capability/mô tả.
5. CFG-06 propose rồi hủy → giá trị DB cũ vẫn giữ.
6. Save image limit 2048 → reload đúng 2048; restore default có confirm; history có before/after.
7. ACC-01 current password sai → lỗi thật từ server, giữ thông tin nhập.
8. ACC-01 cancel confirm → reload vẫn tên cũ.
9. ACC-01 confirm save → success còn trên màn; password fields rỗng; reload đúng tên mới.
10. Reader mở route admin bị chuyển về profile; không thấy bảng admin.
11. Mất creative file → fallback, checklist 9/10, nút gửi disabled; restore/retry tải ảnh thật, refresh 10/10.
12. BUS-16 cancel → BUS-17 còn Draft/“Chưa gửi phiên bản nào”.
13. BUS-16 confirm → tự sang BUS-17 PENDING_REVIEW, reload còn v1; BUS-14 name/save, BUS-15 upload/targeting và BUS-16 submit đều disabled.

Evidence DB cho UI: campaign **4**, code **CMP-7583b9a4-526a-4b58**, status PENDING_REVIEW, đúng một submission v1, creative_id **3**, URL snapshot `https://example.com/landing`. Không phát quảng cáo thật.

### Lỗi phát hiện / xử lý trong quá trình test

- Sửa product: scheduler self-invocation/transaction và thiếu audit expiry; mất filter/success message khi refresh session; Unicode password vượt giới hạn byte gây lỗi encoder; thiếu fallback preview khi media lỗi; CFG-02/CFG-06 còn prototype được nối thành chức năng thật.
- Lượt đầu script mới: endpoint review/checklist sai và trigger SQL thiếu delimiter; sửa harness theo source/API thực tế. Không nới điều kiện nghiệp vụ để che lỗi.
- Regression harness cũ hardcode storage của QA 18080; lần chạy chuyển sang schema mới có 2 ca không tìm thấy fixture. Tách UPLOAD_ROOT và bind đúng môi trường; chạy lại **22/22** đạt. Standalone QA cũ giữ default cũ.
- Các response 500 từ trigger cố tình chặn audit là **expected fault injection**, không phải lỗi còn tồn tại. Trigger được gỡ trong finally; kiểm tra DB cuối có 0 trigger QA.

### Regression toàn backend chưa xanh

- `ManualPremiumServiceTests.differentPlanCannotBypassPendingRequest`: expected 409, actual 404. Đây là lỗi test/behavior đổi gói Premium đã được ghi nhận trước lượt này: service hiện hủy đơn pending khi đổi gói, còn test cũ kỳ vọng chặn. Không sửa luồng của thành viên khác trong task Iteration 3.
- `PublicArticleLiveTests` skip do chưa bật external RSS smoke opt-in. Không ghi test này là đạt.

## 5. Evidence và tái chạy

- `.runtime/iter3-frontend-unit.log`, `.runtime/iter3-frontend-build.log`.
- `.runtime/iter3-backend-all.log`, `backend/target/surefire-reports/TEST-*.xml`, `.runtime/iter3-backend-package.log`.
- `.runtime/iter3-api-tests.log` (20/20), `.runtime/iter3-campaign-regression.log` (22/22).
- `.runtime/iter3-access-ui.png`, `iter3-settings-ui.png`, `iter3-profile-ui.png`, `iter3-media-fallback-ui.png`, `iter3-campaign-submitted-ui.png`.
- Script chính `scripts/qa_iteration3.py`: đặt RUN_ITERATION3_QA=1, chạy với Python có sẵn sau khi backend QA/database riêng hoạt động. Script cố định endpoint/schema/storage QA, không nhận production URL.
- Regression cùng môi trường: import qa_iteration3 trước để bind BASE/sql/UPLOAD_ROOT, rồi unittest loader chạy qa.CampaignWorkflowQA. Không chạy script cũ standalone khi muốn dùng backend 18081.
- Không commit `.runtime` hoặc thông tin đăng nhập QA. Với dev thông thường, khởi chạy lại frontend với proxy/port backend bạn chọn; phiên QA hiện dùng 18081, không phải backend 8080.

## 6. Giới hạn và tài liệu cần cập nhật sau khi nhóm chốt

- Kết quả chứng minh source local/QA. **Chưa commit/push/deploy; Render chưa được chứng minh có code này.**
- Cloudinary thật, persistence qua Render redeploy, test tải lớn, nhiều thiết bị/trình duyệt chưa chạy trong lượt này. Không ghi đã đạt.
- Không triển khai email xác nhận/gửi lại email trong phạm vi này.
- SRS cần bỏ ghi chú prototype cũ cho CFG-02/CFG-06, cập nhật UC-34 capability catalog/role hệ thống/version/last-admin/revocation, UC-37 catalog và hiệu lực trần HTTP, UC-08 password-byte limit/silent session refresh, JOB-01 15 phút và transaction/audit/idempotency, API-05 quyền/fallback.
- SDS cần bổ sung role_permissions và các cột version; class/sequence của controller→service→JdbcTemplate, LiveAccountAccessFilter, PremiumExpirationService; không vẽ repository không tồn tại. Chi tiết class/method trong mục 2 là nguồn đối chiếu source.
- AI report: tách phần đã có từ Iteration 2, phần product mới, sửa test harness, evidence QA và lỗi ngoài scope. Không ghi toàn bộ backend hoặc Render đã đạt.
