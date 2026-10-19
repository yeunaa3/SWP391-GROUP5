# Đối chiếu phần thiếu và ý tưởng phát triển The Pulse

> Cập nhật sau triển khai 20/10/2026: người dùng đã giao thực hiện backlog/ý tưởng, trừ email xác nhận/resend. Đọc [bàn giao implementation](IMPLEMENTATION_BF03_BF06_2026-10-20.md) để biết code và kết quả kiểm thử mới nhất. Nội dung bên dưới giữ nguyên bối cảnh đánh giá trước triển khai ở baseline cũ.

Ngày ghi nhận: 20/10/2026. Baseline code: `043ac14` trên `main`.

Mục đích: lưu các nhận xét đã trao đổi với người dùng để phục vụ phát triển tiếp, cập nhật SRS, SDS và AI Report. File này là ghi chú backlog và đề xuất; không phải bằng chứng nghiệm thu, không thay thế đặc tả được nhóm duyệt. Người dùng yêu cầu ghi nhớ các điểm thiếu và tham khảo nền tảng quảng cáo thực tế. Chưa yêu cầu triển khai toàn bộ ý tưởng.

## 1. Phân biệt phạm vi và mức độ chứng minh

- Đã có code: kiểm tra được implementation trong repository. Không đồng nghĩa đã kiểm thử thành công trên Render.
- Thiếu theo đặc tả: có yêu cầu trong SRS/SDS nhưng implementation chưa đầy đủ.
- Ý tưởng mở rộng: tham khảo sản phẩm khác hoặc đề xuất của AI; chưa phải yêu cầu đã được người dùng duyệt.
- Vấn đề cần kiểm chứng: có dấu hiệu trong code hoặc lỗi người dùng báo nhưng chưa có kiểm thử tái hiện/Network/log xác định nguyên nhân.
- P0: xử lý luồng bị chặn hoặc độ đúng dữ liệu trước. P1: bổ sung để khớp đặc tả. P2: cải thiện trải nghiệm. P3: mở rộng sau.

Không tự gán tỷ lệ hoàn thành. Không đánh dấu Done chỉ vì đã có giao diện. Không tự sửa file SRS/SDS gốc, Project Tracking hoặc đẩy Git từ yêu cầu ghi nhớ này.

## 2. Tài liệu và nguồn code

Tài liệu gốc người dùng cung cấp:

- `C:/Users/ADMIN/OneDrive/Desktop/Updated_2026-10-11/Updated_2026-10-11/The_Pluse_SRS.docx`
- `C:/Users/ADMIN/OneDrive/Desktop/Updated_2026-10-11/Updated_2026-10-11/The_Pluse_SDS.docx`
- `C:/Users/ADMIN/OneDrive/Desktop/Updated_2026-10-11/Updated_2026-10-11/The_Pluse_ProjectTracking.xlsx`

Project Tracking, sheet Functions, dòng 53–57: Iteration 1 của Duc Ngoc gồm UC-38/BUS-02, UC-18/BUS-01, UC-25/BUS-13, UC-05/AUTH-02, UC-06/AUTH-01. Các dòng đang ghi In Progress trong bản workbook đã đọc. BUS-03/BUS-04/BUS-14/BUS-15 thuộc Iteration 2; BUS-16 thuộc Iteration 3. BUS-17 có liên hệ BF-06/BF-07; không suy ra quyền sở hữu màn này chỉ từ việc đang phân tích BF-06.

Các file cần đọc khi tiếp tục:

- `frontend/src/pages/auth/RegisterPage.jsx`, `LoginPage.jsx`
- `frontend/src/pages/business/BusinessWorkspacePage.jsx`
- `frontend/src/components/SlotBookingCalendar.jsx`
- `frontend/src/services/apiClient.js`
- `frontend/src/routes/screenCatalog.js`
- `backend/src/main/java/com/group5/premiumnews/service/AuthenticationService.java`
- `backend/src/main/java/com/group5/premiumnews/service/BusinessWorkspaceService.java`
- `backend/src/main/java/com/group5/premiumnews/service/BusinessFileService.java`
- `backend/src/main/java/com/group5/premiumnews/service/AdvertisingDataService.java`
- `backend/src/main/java/com/group5/premiumnews/dto/BusinessRequests.java`
- `backend/src/main/resources/db/migration/`

## 3. Backlog Iteration 1 đối chiếu SRS

| ID ghi chú | UC và screen | Đã có code | Thiếu hoặc cần thống nhất | Ưu tiên |
|---|---|---|---|---|
| I1-01 | UC-05 AUTH-02 | Reader/Business, format validation, username/email unique, phone normalization, confirm password, terms, BCrypt, default role | Email xác nhận, trạng thái lỗi gửi và resend theo SRS. Không nhầm email xác nhận đăng ký với yêu cầu bắt buộc kích hoạt qua email: SRS hiện mô tả tài khoản ACTIVE khi tạo. | P1 |
| I1-02 | UC-06 AUTH-01 | Username/email login, BCrypt, session, `/me`, RBAC, account status | Kiểm thử locked/inactive, retry và lỗi trung tính. Code hiện login về homepage; SRS nói trang/workspace phù hợp. Cần thống nhất hành vi hoặc sửa tài liệu, không tự đổi routing khi chưa xác nhận quyết định sản phẩm. | P1 |
| I1-03 | UC-38 BUS-02 | Sáu field required, tax code format/unique, email, ownership, khóa pending/resubmitted, khóa legal name/tax khi approved, audit | Industry, Contact person; xác nhận lưu; legal-change re-review, version/history theo SRS. Profile hiện còn cho tạo company lần đầu nên cần mô tả precondition phù hợp. | P1 |
| I1-04 | UC-18 gắn BUS-01 | Partnership status, active contract count, total campaign count, pending campaign count, recent campaign cards, shortcuts | Impressions, Clicks, CTR, Recent notices; Active campaigns khác tổng campaign. Cần chỉ rõ dashboard là phần hiển thị hỗ trợ UC-18, không đồng nghĩa hoàn tất revision/resubmit của cả UC. | P1 |
| I1-05 | UC-25 BUS-13 | Campaign list, name, contract, schedule, status, preview, detail/edit/report links; partnership gate | Search, filters, campaign code, phân biệt review/delivery status theo screen spec. Tạo campaign phải kiểm tra điều kiện hợp đồng tại màn đích/backend; nên giải thích lý do chưa thể tạo ngay ở danh sách. | P1 |

Kiểm thử nghiệm thu chung: đăng ký Reader/Business rồi login; trùng username/email kể cả khác hoa thường; sai format; thiếu terms; sai password confirmation; locked/inactive; company/campaign của doanh nghiệp khác; mọi partnership state; lưu thất bại giữ dữ liệu; refresh/logout/login không mất dữ liệu đã lưu.

## 4. BF-06 theo từng màn hình

Luồng mục tiêu: partnership APPROVED + contract ACTIVE/PAID còn hạn → BUS-13 danh sách → BUS-14 draft → BUS-15 creative/targeting → BUS-16 kiểm tra/xác nhận → PENDING_REVIEW + phiên bản nộp được bảo toàn + thông báo manager → BUS-17 trạng thái/chi tiết. Duyệt và kích hoạt thuộc BF-07; hiệu quả phân phối thuộc BF-08.

| ID | Screen | Khoảng thiếu theo đặc tả | Ghi chú triển khai sau |
|---|---|---|---|
| BF6-01 | BUS-13 | Search/filter/code/review status/delivery status | Phân trang nếu cần theo khối lượng; phân trang là đề xuất, không tự gọi là yêu cầu SRS screen hiện tại. |
| BF6-02 | BUS-14 | Target URL đặt ở BUS-14 theo screen spec nhưng code ở BUS-15; chưa hiển thị mục thiếu để submit; chưa xóa unused draft theo UC-25 | Thống nhất URL thuộc campaign hay creative và màn nhập chính. Không tạo hai giá trị URL không đồng bộ. Tách Lưu nháp và Lưu và tiếp tục là đề xuất UX. |
| BF6-03 | BUS-15 | Category, Tags, Geo, Device type; video; Cloud Storage/CDN; remove/unlink unused draft asset | DB đã có ad_targeting và bảng category/tag, nhưng chưa có luồng lưu targeting. Device type cần thiết kế rõ. Có version_no creative nhưng chưa có UI xem lịch sử. |
| BF6-04 | BUS-16 | Checklist contract/slot/schedule/URL/creative/targeting; xác nhận/hủy; immutable submitted snapshot | Hiện submit đổi campaign/creative sang PENDING_REVIEW. Chưa snapshot đầy đủ campaign + targeting và liên kết đúng creative theo từng submission. |
| BF6-05 | BUS-17 | Review reason, status timeline, history, approved creative, request creative change | Query hiện lấy creative mới nhất. Phải phân biệt bản đang chạy đã duyệt với bản sửa mới chờ duyệt. Phần review/activation cần phối hợp người phụ trách BF-07. |

Các rule đã có: BUSINESS role; company lấy từ user đăng nhập; partnership APPROVED; contract owner + ACTIVE/PAID; schedule trong contract; chỉ sửa DRAFT/NEEDS_REVISION; không đổi contract khi edit; PNG/JPEG ≤ 8 MB, kiểm tra nội dung ảnh/dimension; HTTP/HTTPS target URL; tăng creative version; transaction/row lock; audit submit và notification cho Business lẫn Ad Manager.

Các điểm logic cần hoàn thiện:

- `saveCampaign` giữ NEEDS_REVISION khi lưu, trong khi UC-25 nói kết quả lưu Draft. Chốt lại state model trước khi sửa.
- `submitCampaign` cần dùng một validator chung kiểm tra lại cả slot, targeting và asset trước khi nhận submission. Không chỉ tin trạng thái DRAFT của creative.
- Mỗi submission cần giữ campaign data, targeting, contract/slot reference cần thiết và creative_id chính xác; không ghi đè bản cũ khi sửa/resubmit.
- Notification đã có; không ghi trong AI Report rằng toàn bộ thông báo submit còn thiếu. Notification chưa thay thế việc kết nối hàng đợi review đọc đúng submission.
- Storage hiện là local filesystem; trên Render cần kiểm tra persistence. Nếu giảm scope chỉ hỗ trợ image/local storage, phải ghi là quyết định thay đổi phạm vi và cập nhật SRS/SDS sau khi nhóm duyệt.

## 5. Vấn đề cần kiểm chứng trước khi thêm chức năng

### P0-01 Lỗi 403 khi lưu campaign

Người dùng đã báo 403 trên BUS-14. Chưa có bằng chứng Network/log chốt nguyên nhân. Code hiện đã lấy token từ `/api/auth/csrf` trước mutation và dùng session cookie. Không được khẳng định handler CSRF mặc định chắc chắn sai hay tắt CSRF để né lỗi. Cần xem request nào lỗi, session/role, token/header/cookie, CORS và commit Render thực sự đang chạy.

Bản sửa raw-token handler, 3 campaign draft và helper navigate từng tạo trong chat trước không còn ở baseline `043ac14`. Không ghi nhận chúng là chức năng đã hoàn thành.

### P0-02 Lưu thành công nhưng chưa chuyển bước

BUS-14 hiện gọi `action`: save → refresh workspace → callback navigate BUS-15. Nếu save thành công mà refresh lỗi, callback không chạy và người dùng có thể bấm lại tạo thêm campaign. Cần kiểm thử trường hợp này; đề xuất điều hướng theo ID đã trả từ save, có cơ chế đồng bộ dữ liệu màn đích và chống tạo trùng khi retry.

### P0-03 Lịch booking BUS-06/BUS-07

Đây là phần liên quan BF-05, cần phối hợp người sở hữu và chỉ sửa khi được giao:

- `SlotBookingCalendar` bắt lỗi availability rồi chỉ console.error; UI có thể trông như không có lịch bận. Cần hiển thị lỗi tải lịch và hành động thử lại, không báo khoảng trống đã được xác minh.
- Ô ngày nhập tay xóa calendarError nhưng chưa gọi lại kiểm tra xung đột của calendar; thông báo hợp lệ phía UI có thể chưa chính xác. Server vẫn có kiểm tra availability, không được nhầm là DB đã cho booking trùng.
- Calendar so sánh đến ngày endAt theo kiểu inclusive; backend booking lưu endAt là đầu ngày tiếp theo theo khoảng [start,end). Cần kiểm thử hai booking liền kề để tránh tô bận thêm một ngày.
- Availability có ACTIVE/PAID và hold ACCEPTED/PENDING_PAYMENT chưa hết hạn. Không giữ chỗ chỉ vì người dùng mới mở form hoặc lưu draft.

## 6. Tham khảo nền tảng thực tế

Chỉ sử dụng tài liệu công khai chính thức; không đăng nhập dashboard của bên thứ ba. Ngày tra cứu 20/10/2026. Các quan sát này gợi ý UX, không tự thay đổi mô hình nghiệp vụ The Pulse.

| Nguồn | Điểm được nguồn hỗ trợ | Cách áp dụng cho The Pulse |
|---|---|---|
| Google Ads campaign creation [R1] | Điều hướng giữa bước, chỉ báo vấn đề, draft và trang review trước publish | Thanh tiến độ, tiếp tục draft, checklist có liên kết sửa lỗi. |
| Adslot Storefront [R2] | Rate card, gói inventory, availability và kiểm soát advertiser/creative | Thẻ vị trí có giá/kích thước, lịch trống và trạng thái đủ điều kiện đặt. |
| BuySellAds advertiser API [R3] | Line item có placement, lịch, mục tiêu/đơn vị, chi phí và trạng thái phê chuẩn | Tóm tắt đơn/hợp đồng và campaign tách rõ tên vị trí, thời gian, giá trị, chỉ tiêu, trạng thái. |
| Google Ad Manager availability [R4] | Kiểm tra inventory trước booking và dự báo khả năng đạt mục tiêu | Giai đoạn đầu chỉ xác minh lịch khả dụng. Forecast impressions để sau, khi có dữ liệu thực. |
| Google Ads status [R5] | Có trạng thái xét duyệt và giải thích lý do không đủ điều kiện | Hiển thị reason cạnh status và hành động tiếp theo; phân biệt đã duyệt với đang phân phối. |

Nguồn:

- [R1] https://support.google.com/google-ads/answer/11052121?hl=en
- [R2] https://www.adslot.com/publisher-storefront/
- [R3] https://www.buysellads.com/docs/advertiser-api/endpoints
- [R4] https://support.google.com/admanager/answer/82234?hl=en
- [R5] https://support.google.com/google-ads/answer/1722129?hl=en

## 7. Ý tưởng UX mở rộng và mức ưu tiên

| ID | Ý tưởng đề xuất | Screen/phạm vi | Ưu tiên và tiêu chí chấp nhận gợi ý |
|---|---|---|---|
| UX-01 | Thanh bước Thông tin → Banner và đối tượng → Kiểm tra → Chờ duyệt | BUS-14/15/16/17 | P2. Cho quay lại bước đã lưu; bước chưa đủ chỉ rõ item thiếu. |
| UX-02 | Lưu nháp và thoát; tiếp tục nháp; cảnh báo chưa lưu | BUS-13/14/15 | P2. Sau reload/login vẫn đọc draft server; chỉ điều hướng tiếp khi save trả ID hợp lệ. Nếu autosave, thêm chống ghi đè khi hai tab. |
| UX-03 | Preview quảng cáo trong bố cục báo thật | BUS-15 | P2. Desktop/mobile và vị trí đã chọn; phân biệt preview với quảng cáo đang phát. Không tự crop làm sai kích thước bắt buộc. |
| UX-04 | Checklist trước gửi có nút sửa từng mục | BUS-16 | P1 cho phần check theo SRS; cách trình bày là đề xuất. Backend trả kết quả field/code/message; không báo đạt khi chưa kiểm tra. |
| UX-05 | Bảng bên cạnh tóm tắt hợp đồng, slot, lịch và quota | BUS-14/15/16; BUS-07 nếu được giao | P2. Số liệu đọc từ contract; BF-06 không tính lại/phát sinh thanh toán cho hợp đồng đã Paid. |
| UX-06 | Timeline và hướng dẫn hành động theo status | BUS-17, BUS-01 | P1 cho phần status/history theo SRS. Ví dụ Needs Revision có lý do, thời điểm, phiên bản và nút sửa đúng phần. |
| UX-07 | Thẻ vị trí và so sánh gói | BUS-05/06/07, BF-05 | P2, phối hợp chủ sở hữu. Có ảnh vị trí, kích thước, loại file, thời lượng, đơn giá và phần bao gồm. |
| UX-08 | Gợi ý khoảng ngày trống thay thế | BUS-06/07, BF-05 | P2, phối hợp. Gợi ý phải tính từ dữ liệu mới, không tự gửi booking thay user. |
| UX-09 | Snapshot báo giá, thông báo giá thay đổi, hiển thị thuế/phí nếu có | BUS-07/hợp đồng, BF-05 | P2. Chốt quy tắc tính phí trước; không tự thêm VAT/phí không có đặc tả. Server tính giá cuối cùng. |
| UX-10 | Nhân bản campaign thành Draft | BUS-13 | P3. Không copy approval/payment/status/metrics; validate lại contract, schedule và creative eligibility. |
| UX-11 | Link chiến dịch có UTM | BUS-15 | P3. User xem được URL cuối, không tạo UTM lặp; URL vẫn qua validation. |
| UX-12 | Dự báo impressions và tiến độ quota | BUS-14/19, BF-08 liên quan | P3. Chỉ triển khai khi có dữ liệu đủ và phương pháp; ghi rõ ước tính, khoảng thời gian và độ mới. Không lấy số demo làm cam kết. |

Gói đề xuất phù hợp để làm trước: I1-03/04/05 cho Iteration 1; sau đó UX-01/03/04/06 và phần targeting bắt buộc để hoàn thiện BF-06. Không mở rộng sang đấu giá realtime hay tối ưu bằng AI ở giai đoạn này nếu chưa có yêu cầu riêng.

## 8. Gợi ý cập nhật SRS sau khi chốt phạm vi

Các ID dưới đây chỉ là nhãn backlog tạm, không ghi đè BR hiện có:

- RULE-PROP-01: Chỉ user BUSINESS có company APPROVED và sở hữu hợp đồng ACTIVE/PAID hợp lệ mới tạo/gửi campaign.
- RULE-PROP-02: Save Draft và Submit là hai thao tác khác nhau; draft được phép thiếu mục nào phải ghi rõ. Không tự nới validation chỉ từ ý tưởng autosave.
- RULE-PROP-03: Đơn gửi/nháp không đồng nghĩa đã giữ chỗ hay đã thanh toán. Giữ chỗ có điều kiện và thời hạn được BF-05 quy định.
- RULE-PROP-04: Mỗi lần submit tạo submission version riêng, gắn đúng creative và targeting; review phải xét đúng version.
- RULE-PROP-05: Đổi nội dung đã duyệt tạo bản đề nghị mới; bản đang chạy chỉ thay sau khi version mới được duyệt và thỏa điều kiện phát.
- RULE-PROP-06: Availability thất bại không được hiển thị như kết quả xác minh còn trống; submit kiểm tra lại server.
- RULE-PROP-07: Phân biệt review status, delivery status và lý do chưa chạy; bổ sung state/action matrix cho từng role.
- RULE-PROP-08: Khi save thất bại giữ dữ liệu nhập; khi save thành công nhưng màn tiếp theo tải lỗi phải cho retry, tránh tạo trùng.

Mỗi UC cập nhật đủ actor, trigger, pre/postcondition, normal/alternative/exception flow, BR, field validation và permission. Chốt URL ở BUS-14 hay BUS-15; image/video và cloud/local storage; legal re-review; login destination; Industry/Contact person trước khi sửa tài liệu.

## 9. Gợi ý cập nhật SDS sau khi thiết kế được duyệt

- Giữ controller mỏng, DTO rõ field và error; service thực thi ownership/state/transaction. Các module business hiện dùng JdbcTemplate, không vẽ CampaignRepository là class đã có.
- Dùng một campaign validator chung cho pre-submit và submit, nhưng submit luôn revalidate trong transaction; checklist trước đó không là bằng chứng còn hợp lệ.
- Đề xuất endpoint pre-submit validation, API targeting, delete/unlink draft và submission history. Tên/path mới là thiết kế dự kiến; code hiện dùng `/api/business/campaigns`, khác path mẫu SDS `/api/campaigns`.
- Đề xuất bảng submission/snapshot hoặc immutable version tương đương, FK creative, targeting snapshot, reviewer/version binding; cấu trúc cuối cần thống nhất nhóm. Không chỉ thêm version_no vào campaign rồi tiếp tục ghi đè data.
- Thiết kế storage adapter có thể dùng local/dev và persistent cloud khi deploy; lifecycle dọn orphan/retention; không xóa asset còn thuộc submission/hợp đồng lịch sử.
- Xác định khoảng thời gian booking [start,end), múi giờ, cách hiển thị ngày kết thúc inclusive; khóa/unique/idempotency cho request gửi lại và cập nhật đồng thời.
- Metrics phải có cutoff và trạng thái chưa có dữ liệu; không hiển thị 0 nếu chưa tải được/không có bằng chứng thống kê.
- Migration: mỗi V dùng một lần; không sửa migration đã chạy; cập nhật code chung và thống nhất số mới trước khi tạo.

## 10. Ghi vào AI Report thế nào

Mỗi thay đổi tương lai ghi: yêu cầu người dùng → nguồn đặc tả → gợi ý AI/nguồn tham khảo → quyết định nhóm → code thực tế → test/evidence → giới hạn còn lại.

- File này: AI hỗ trợ đọc code, đối chiếu backlog và nghiên cứu UX. Không có thay đổi runtime, schema, môi trường Render hay tài liệu gốc.
- Không đưa ý tưởng trong mục 7 thành chức năng đã triển khai hoặc yêu cầu đã được chấp thuận.
- Không ghi sửa 403 thành công khi chỉ đổi code mà chưa tái hiện và kiểm thử trên môi trường liên quan.
- Không ghi gửi notification là đã hoàn tất BF-07.
- Khi cập nhật tài liệu ghi version/ngày và lý do đổi phạm vi; nếu khác SRS cũ, thể hiện quyết định và traceability.
- Evidence nên gồm commit, ảnh trước/sau, test case, kết quả thực tế, DB submission/notification đúng version và môi trường chạy; không đưa password/token/cookie vào report.

## 11. Bước tiếp theo khi người dùng yêu cầu triển khai

1. Đọc `git status`, commit và tài liệu mới nhất; không tự khôi phục patch cũ.
2. Chốt scope Iteration 1 hay toàn BF-06; booking BF-05 cần phối hợp.
3. Reproduce luồng create → upload → submit và lỗi 403 nếu còn.
4. Hoàn thiện phần thiếu đã chốt, kiểm thử theo từng screen và permission/state matrix.
5. Sau khi implementation/test được xác nhận, cập nhật bản SRS/SDS/AI Report được người dùng chỉ định. Giữ nguyên bản gốc cho tới khi có yêu cầu sửa.
