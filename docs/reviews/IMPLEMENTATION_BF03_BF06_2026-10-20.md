# Bàn giao phần bổ sung BF-03 / BF-06 và các ý tưởng booking

Ngày: 20/10/2026. Baseline: `f3dde8e` + thay đổi local chưa commit/push.

Người dùng yêu cầu triển khai backlog và các ý tưởng tham khảo đã ghi nhận, **loại trừ email xác nhận đăng ký và gửi lại email**. File này ghi implementation thực tế để tiếp tục hoàn thiện SRS/SDS/AI Report, không thay thế việc nghiệm thu của nhóm. SRS, SDS và Project Tracking gốc chưa sửa. Không deploy Render.

## 1. Những phần đã nối trong code

| Backlog / màn | Kết quả |
|---|---|
| I1-01, UC-05 AUTH-02 | Giữ validation Reader/Business, username/email unique không phân biệt hoa thường, phone theo quốc gia, confirm password và terms. Kiểm thử qua API thật. Không thêm email xác nhận/resend. |
| I1-02, UC-06 AUTH-01 | Lỗi mật khẩu sai/LOCKED/INACTIVE trả lỗi trung tính 401. Đổi session ID khi đăng nhập lại. Phân biệt CSRF 403 với thiếu quyền. Client chỉ retry một lần khi server trả `CSRF_INVALID`. |
| I1-03, UC-38 BUS-02 | Bổ sung Industry/Contact person thành tám field bắt buộc. Xác nhận lưu. Đổi legal name/tax code hoặc giấy tờ đã duyệt chuyển về NEEDS_REVISION; khóa chức năng quảng cáo cho đến khi được duyệt lại. Có lịch sử application snapshot. |
| I1-04, BUS-01 hỗ trợ UC-18 | Đếm campaign ACTIVE riêng tổng campaign; hợp đồng ACTIVE/PAID còn hạn; chờ review; impressions/clicks/CTR từ raw events thật; thông báo gần đây. Không cộng fixture aggregate vào các chỉ số này. |
| I1-05, UC-25 BUS-13 | Mã campaign, tìm mã/tên/hợp đồng, lọc review/delivery, phân trang, tiếp tục draft, nhân bản, xóa mềm nháp chưa từng gửi. Có lý do khi chưa có hợp đồng đủ điều kiện. |
| BF6-02, BUS-14 | URL đích cùng thông tin campaign; lưu nháp và thoát hoặc lưu và tiếp tục. Save trả ID thì điều hướng ngay, không đợi workspace cũ tải lại. Request key chống create trùng khi retry cùng thao tác; edit version chống ghi đè giữa hai tab. |
| BF6-03, UC-26 BUS-15 | Upload PNG/JPEG/MP4 ≤ 8 MB; MP4 tối đa 60 giây; kiểm nội dung và kích thước thật khớp slot. Targeting category/tag/geo/device lưu DB; catalog phải ACTIVE. Xem creative history, bỏ liên kết draft, UTM và preview desktop/mobile. Lưu riêng creative/targeting giữ thay đổi chưa lưu của phần kia. |
| BF6-04, UC-27 BUS-16 | Checklist từ backend: partnership, contract/payment, slot, schedule, URL, file, dimensions, creative state, URL khớp và targeting. Link sửa lỗi. Xác nhận/hủy. Submit kiểm lại trong transaction và kiểm editVersion người dùng vừa xem. |
| BF6-05, BUS-17 | Phản hồi xét duyệt, lịch sử từng submission, snapshot, timeline, creative đã duyệt tách bản mới nhất, yêu cầu thay quảng cáo. |
| Bàn giao sang BF-07 ADM-07/08 | Hàng đợi thật theo submission. Manager xem đúng snapshot và quyết định APPROVED/NEEDS_REVISION/REJECTED kèm lý do. Khóa submission chống hai người xử lý lại. Thông báo trong ứng dụng. |
| Delivery liên quan BF-07/08 | Đã duyệt lịch tương lai là SCHEDULED. Job mỗi phút kiểm điều kiện để ACTIVE, cuối lịch COMPLETED. Bản cũ chỉ CANCELLED khi bản thay thế thực sự ACTIVE. PAUSED không tự bật lại. Query phục vụ quảng cáo kiểm partnership, payment, lịch, targeting và quota. |
| UC-18, BUS-03/04 | Gửi/sửa/gửi lại tạo application version bất biến. Giấy tờ mới thay ACTIVE document trước bằng REPLACED, file và liên kết snapshot cũ vẫn giữ. Sau REJECTED có hành động mở hồ sơ mới DRAFT, mã mới, phải tải lại giấy tờ; lịch sử version tiếp tục tăng. |
| P0-03, BUS-06/07 | Lỗi availability có thông báo/thử lại và khóa xác nhận. Nhập tay và chọn lịch dùng chung validator. EndAt 00:00 là cuối khoảng không bao gồm, không tô bận thêm ngày. Booking draft/submission không tự giữ chỗ. |
| UX-07/08/09, BUS-05/06/07 | Thẻ vị trí có sơ đồ, kích thước, định dạng; so sánh tối đa ba gói. BUS-07 gợi ý ba khoảng trống phù hợp gói. Hiển thị giá gói + phần giá slot; gửi quotedAmount để server phát hiện giá thay đổi. Lưu quote_snapshot trên contract. Không tự thêm VAT/phí mới. |
| UX-12, sidebar campaign / báo cáo | Tiến độ campaign và quota hợp đồng dùng chung từ raw events. Dự báo chỉ có số khi đủ bảy ngày hoàn chỉnh và ≥100 impression theo slot; lấy trung bình × thời lượng, có cutoff và chú thích chưa điều chỉnh targeting/không cam kết. Thiếu mẫu hiển thị chưa đủ dữ liệu. |

UX-01 → UX-12 đều có phần tương ứng trong bảng trên. Preview là mô phỏng bố cục, không phải một quảng cáo được phân phối thật. Giữ đường dẫn đăng nhập thành công về trang tin `/` theo `sessionRouting.js` và test routing hiện có; workspace mở từ menu theo role. Khi sửa SRS cần ghi rõ lựa chọn này thay vì mô tả tự chuyển workspace.

## 2. Luồng class / hàm chính

```text
BusinessCampaignPage (BUS-01/02/13…17)
  → apiRequest (cookie + masked CSRF; xử lý 200 rỗng; không retry POST lỗi mạng)
  → BusinessWorkspaceController (role BUSINESS, DTO @Valid)
  → CampaignWorkflowService (ownership, state, version, checklist, transaction)
  → JdbcTemplate → MySQL

BUS-14 saveDraft
  → POST /api/business/campaigns hoặc PUT /api/business/campaigns/{id}
  → save: khóa company/contract, kiểm quyền + ACTIVE/PAID + lịch
  → INSERT draft + client_request_key hoặc UPDATE đúng edit_version
  → trả id → điều hướng BUS-15 ngay

BUS-15 upload
  → BusinessFileController.creative
  → BusinessFileService.creative: khóa owner/draft/version, đọc bytes/dimensions/duration
  → BusinessAssetStorage.put: local hoặc Cloudinary authenticated
  → INSERT ad_creatives version mới + UPDATE campaign URL/version + activity

BUS-15 targeting
  → saveTargeting: kiểm IDs ACTIVE, mã ISO quốc gia, device
  → ad_targeting + junction categories/tags + edit_version

BUS-16 submit
  → submit: khóa company/campaign/contract, kiểm editVersion và checks()
  → campaign_submissions.snapshot JSON + creative_id chính xác
  → campaign/creative PENDING_REVIEW + audit/activity/notifications

CampaignReviewPage (ADM-07/08)
  → CampaignReviewController
  → queue: đọc snapshot đã nộp
  → decide: khóa đúng submissionId, kiểm trạng thái và kiểm lại điều kiện khi approve
  → submission decision + creative state + campaign SCHEDULED/ACTIVE hoặc yêu cầu sửa/từ chối

CampaignDeliveryScheduler.tick
  → CampaignWorkflowService.advanceDelivery: một transaction mỗi campaign
  → ACTIVE đúng lịch, COMPLETED hết lịch; replaceOriginal chỉ khi bản mới ACTIVE

AdBanner / ArticlePage
  → AdvertisingDataController.banners → AdvertisingDataService.banners
  → chọn quảng cáo đủ lịch/payment/partnership/targeting/quota
  → IntersectionObserver: ≥50% ở viewport liên tục 1 giây mới gửi impression
  → recordEvent: recheck eligibility, khóa contract, dedupe 30 giây/session/creative/type
  → ad_events raw + ad_metrics aggregate tương thích báo cáo cũ
```

Campaign vẫn dùng JdbcTemplate; không có CampaignRepository JPA mới. Auth giữ UserRepository/RoleRepository và BCrypt. Các hàm liên quan đã có comment tiếng Việt về trách nhiệm, kiểm tra, snapshot, locking và hành vi khi lỗi.

## 3. API và quy tắc dữ liệu

- `GET /api/business/campaign-workspace`: company, contracts, campaign list được gate APPROVED, catalog targeting, notices, raw metrics, companyVersions.
- `GET /api/business/campaigns/{id}`: detail/creatives/targeting/submissions/activity/forecast/delivery; kiểm ownership và APPROVED.
- `GET /api/business/campaigns/{id}/validation`: checklist chỉ đọc, không bảo đảm kết quả vẫn còn đúng lúc submit.
- `POST /api/business/campaigns`: contractId, name, description?, startTime, endTime, targetUrl?, requestKey bắt buộc cho create.
- `PUT /api/business/campaigns/{id}`: thông tin nháp + editVersion. Contract không được đổi. Save metadata đưa về DRAFT. Đổi URL tạo creative draft version mới dùng cùng asset; không sửa URL của bản đã nộp.
- `POST /api/business/campaigns/{id}/creative`: multipart file/targetUrl/editVersion.
- `PUT /api/business/campaigns/{id}/targeting`: categoryIds/tagIds (tối đa 50 mỗi loại), geoScope, audience, deviceType, editVersion.
- `POST /api/business/campaigns/{id}/submit`: JSON `{ "editVersion": n }`. Retry khi đã pending không tạo submission thứ hai.
- `DELETE /api/business/campaigns/{id}`: chỉ DRAFT chưa có submission, xóa mềm thành CANCELLED.
- `DELETE /api/business/campaigns/{id}/creatives/{creativeId}`: chỉ creative DRAFT và campaign editable, chuyển ARCHIVED; giữ object đang được lịch sử/bản sao tham chiếu.
- `POST /api/business/campaigns/{id}/copy`: draft mới, không copy approval/review/metrics.
- `POST /api/business/campaigns/{id}/change-request`: draft thay thế có replaces_campaign_id, giữ bản gốc đang chạy tới khi thay thế thực sự ACTIVE.
- `GET /api/ad-manager/campaign-submissions`: manager queue.
- `POST /api/ad-manager/campaign-submissions/{id}/decision`: submissionId, decision, reason; AD_MANAGER, không cho business/admin tự duyệt qua route này.
- `POST /api/business/application/new`: mở vòng DRAFT sau REJECTED, không xóa lịch sử.
- `PUT /api/business/company`: tám field bắt buộc, gồm industry/contactPerson.
- Booking create/update có quotedAmount tùy chọn để so giá dự kiến; giá cuối luôn tính từ DB.

Lỗi điều kiện nghiệp vụ dùng 422; stale version/giá thay đổi/trùng thông tin dùng 409; DTO sai 400; thiếu/sai login 401; thiếu role/CSRF 403. Không cho client tự truyền companyId/reviewerId/snapshot để quyết định quyền.

## 4. DB design bổ sung

Migration mới: `V14__business_campaign_submission_workflow.sql` và `V15__import_legacy_pending_campaigns.sql`. Không sửa V1–V13. Đã fetch/fast-forward code chung trước khi chọn số 14. Trước khi tích hợp nhánh khác phải kiểm tra số migration mới trên nhánh chung; không tự sửa/đổi tên migration đã áp dụng trên DB chung.

| Bảng | Thay đổi / lý do |
|---|---|
| companies, company_application_versions | industry/contact_person ở profile và snapshot tại thời điểm nộp. |
| ad_campaigns | campaign_code unique; target_url; edit_version; client_request_key unique theo created_by; replaces_campaign_id self-FK. Legacy fixture có thể chưa có code, UI/API fallback CMP-id. |
| ad_targeting | device_type; category/tag dùng các junction đã có. |
| campaign_submissions | UNIQUE campaign/version; FK creative+campaign; snapshot JSON; submitted/reviewed actor/time/reason/status. Chỉ metadata review đổi sau nộp, snapshot không đổi. |
| campaign_activity | timeline theo campaign, actor nullable cho job hệ thống; audit user mutation vẫn ghi audit_logs. |
| contracts | quote_snapshot lưu packagePrice, slotMonthlyPrice, days, total, currency và thời điểm báo giá. |

Application và campaign dùng version riêng. Asset có version riêng. Không gộp ba loại version thành một con số. ID creative trong submission bảo đảm manager quyết định đúng bản nộp, dù phiên bản mới hơn tồn tại sau revision.

Khoảng booking trong DB là `[start_at,end_at)`; ngày kết thúc UI được bao gồm, DB lưu đầu ngày kế tiếp. Hai booking tiếp giáp không xung đột. Server khóa slot khi kiểm availability/lưu. Ngày giờ campaign phải trong hợp đồng và end > start, chưa hết hạn. Đầu hợp đồng có giây được làm tròn lên khi đưa vào ô nhập theo phút để tránh lưu sớm hơn hợp đồng. Cần vận hành JVM/DB theo cùng quy ước múi giờ; schema DATETIME hiện không mang timezone riêng.

V15 không tạo approval: campaign pending cũ có creative PENDING_REVIEW xác định được mới nhập một snapshot có nhãn legacyImported. Bản không xác định được creative được mở NEEDS_REVISION, có activity và thông báo để người dùng bổ sung. Việc này tránh yêu cầu cũ biến mất khỏi queue mới. Không suy đoán trạng thái đã duyệt của dữ liệu cũ.

## 5. Storage, targeting và metrics: phạm vi thực tế

Storage có hai provider:

1. Local: `ASSET_STORAGE_PROVIDER=local`, `UPLOAD_DIRECTORY` trỏ thư mục có quyền ghi. Render profile hiện dùng `APP_UPLOAD_DIRECTORY` cho cùng thuộc tính; cần persistent disk nếu dùng local trên Render.
2. Cloudinary: `ASSET_STORAGE_PROVIDER=cloudinary`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` đặt trên backend. Upload có chữ ký và delivery type authenticated; frontend chỉ nhận API media theo ID. Owner/staff mới xem được giấy tờ/nháp. Chỉ creative đã duyệt được đọc công khai.

Cloudinary đã có code adapter nhưng **chưa có credentials để chạy kiểm thử upload/download cloud thật**. Cần smoke test trên tài khoản storage của nhóm trước khi chọn provider đó trên deploy. Không đưa secret vào Git hoặc frontend.

Khi DB rollback, object mới được dọn theo transaction synchronization; upload có rollback cả checked exception. Bỏ creative hoặc thay giấy tờ không hard-delete asset còn thuộc lịch sử. Chưa có tác vụ quét toàn bộ kho cloud để xóa orphan do tiến trình chết giữa upload và DB commit; vận hành phải có retention/lifecycle phù hợp trên kho đã chọn.

Geo nhận ALL/trống hoặc danh sách ISO 3166 hai chữ. Hiện khớp theo **vùng trình duyệt từ Accept-Language**, không tự tuyên bố biết vị trí GPS/IP thật. Device dựa User-Agent; category/tag dựa articleId và junction của bài báo. Các lựa chọn cùng loại là OR, các nhóm category/tag/device/geo là AND. Audience là mô tả cho manager, không có hệ thống suy luận nhân khẩu học. Nếu SRS muốn định vị IP chính xác hoặc targeting nhân khẩu học, cần đặc tả nguồn dữ liệu/đồng ý sử dụng trước khi thêm.

Dự báo và dashboard/report đọc ad_events hợp lệ, có cutoff; fixture ad_metrics không được coi là lưu lượng thật. Anti-duplicate 30 giây theo hash session là bảo vệ đếm lặp cơ bản, chưa phải hệ thống chống gian lận quảng cáo toàn diện. Quota campaign và quota hợp đồng dùng chung được kiểm tra lại trước ghi impression.

## 6. Điều chỉnh cần đưa vào bản SRS/SDS cập nhật

Đây là nội dung để cập nhật bản tài liệu sau, chưa ghi đè file gốc:

- UC-05: giữ tạo ACTIVE và hai role mặc định; ghi rõ bỏ email xác nhận/resend theo phạm vi người dùng lần này. Validation frontend không thay thế validation backend/unique DB.
- UC-06: lỗi trung tính với locked/inactive; cookie session; CSRF; đổi session ID. Postcondition đăng nhập thành công về trang tin, workspace mở từ menu. Không mô tả tự chuyển role workspace khi code không làm vậy.
- UC-38: precondition cho phép tài khoản Business mới chưa có company tạo profile lần đầu. Tám field required; khóa PENDING_REVIEW/RESUBMITTED; legal-change/document-change cần re-review và giữ bản nộp cũ; thao tác lưu có xác nhận.
- UC-18: dashboard chỉ là màn hỗ trợ. Revision/resubmit nằm ở profile và application; mỗi lần gửi có application version, phản hồi manager, document IDs và thông báo. REJECTED mở vòng đăng ký mới DRAFT, không sửa/xóa lịch sử.
- UC-25: Draft có thể thiếu URL/creative/targeting; vẫn cần tên, contract ACTIVE/PAID của mình và lịch hợp lệ. Chỉ DRAFT/NEEDS_REVISION được sửa. Submit khác save. Xóa mềm nháp chưa từng gửi; copy không cấp approval; hai tab dùng edit_version và create dùng requestKey.
- UC-26: định dạng/kích thước/duration thực tế; targeting và ý nghĩa matching; phiên bản creative và unlink/retention; storage provider/config. URL là dữ liệu campaign đồng bộ sang creative version; không để hai URL khác nhau trong submission.
- UC-27: checklist có mã/lý do/màn sửa; xác nhận trước gửi; kiểm version và revalidate trong transaction. Pending khóa sửa. Snapshot không đổi sau nộp. Notification trong app không có nghĩa quảng cáo đã chạy.
- BF-07: manager quyết định theo submissionId; reason bắt buộc ở flow mới; SCHEDULED khác ACTIVE. Replacement chỉ dừng bản cũ khi bản mới ACTIVE.
- BF-05 liên quan: mô tả [start,end), lỗi availability, gợi ý lịch, giá phân bổ 30 ngày, quote snapshot và lỗi đổi giá. Không thêm thuế/phí không được quy định.
- BF-08 liên quan: nguồn raw events, cutoff, ngưỡng đủ mẫu, công thức dự báo, quota dùng chung và giới hạn dedupe.
- SDS: vẽ đúng service/JdbcTemplate hiện có, DTO/API path thực tế ở mục 3; thêm V14/V15, lock/order/version, rollback storage, snapshot và scheduler. Không vẽ CampaignRepository chưa có.

Phạm vi này không triển khai toàn bộ thương lượng hợp đồng/thanh toán BF-05 hoặc hệ thống chống fraud BF-08. Các phần đó khác với backlog/ý tưởng booking được giao lần này.

## 7. Bằng chứng kiểm thử và giới hạn nghiệm thu

- MySQL 8.4 riêng: `127.0.0.1:13306/pulse_workflow_qa`, data trong `.runtime/workflow-qa-mysql`. Chạy V1→V14 thành công trên schema trống; khởi động tiếp validate migration thành công. V15 được kiểm thử nâng cấp với hai campaign legacy: bản có creative pending được nhập đúng snapshot/creative, bản thiếu creative được mở NEEDS_REVISION và thông báo; checksum các snapshot đã có giữ nguyên. Không dùng DB thật hoặc DB Render.
- Backend QA: `:18080`, riêng upload root `.runtime/workflow-qa-uploads`, tắt news importer; scheduler dùng interval 1 giây chỉ khi QA, mặc định production code 60 giây.
- Java: 66 test được phát hiện, 65 pass, 1 live-article test chủ động skip; không lỗi/failure. Có test MP4 thật, >60 giây và fake header; URL/version/storage/path và không tự resume PAUSED.
- Frontend: 27 test pass; có test lịch tiếp giáp, nhập tay, lỗi availability, gợi ý, UTM, làm tròn timestamp, retry CSRF, không retry POST lỗi mạng và response 200 rỗng.
- API tích hợp: 15 kịch bản pass trong `scripts/qa_campaign_workflow.py`: registration/duplicates/terms/phone; locked/inactive/CSRF/session; idempotency/version; ownership và mọi partnership state; file lỗi/thiếu dữ liệu; revision/resubmit/snapshot; copy/delete/catalog; forecast thiếu mẫu; legal re-review; replacement activation; targeting/events/quota; booking quote/end-exclusive; document/application version và hồ sơ mới sau reject; forecast không lấy fixture aggregate; file mất chặn submit/approve.
- Frontend production build và backend package thành công. Vite còn cảnh báo bundle lớn; không phải lỗi build.
- Chưa kiểm tra giao diện trực quan/browser E2E vì Work đang tắt browser use. Chưa smoke test cloud thật hoặc Render. Không gọi kết quả QA là bằng chứng website đang chạy bản mới.

Chạy lại:

```text
backend: mvn test package (JDK 21)
frontend: node --test tests/*.test.mjs
frontend: node node_modules/vite/bin/vite.js build
QA API: RUN_WORKFLOW_QA=1 python scripts/qa_campaign_workflow.py
```

QA script chỉ hỗ trợ backend localhost :18080 và MySQL localhost :13306/schema pulse_workflow_qa. Nó tạo tài khoản/password ngẫu nhiên trong môi trường thử riêng; không sửa password demo và không ghi credentials vào report. Muốn chạy API QA phải khởi tạo database riêng và backend với DB_URL/DB_USERNAME/DB_PASSWORD/UPLOAD_DIRECTORY tương ứng; không trỏ script vào production.

## 8. Gợi ý mục AI Report

Rà soát cuối sau yêu cầu tiết kiệm usage: sửa việc chọn lại cùng khoảng ngày có thể làm nút booking bị khóa do effect không chạy lại; handler hiện kiểm tra ngay bằng validator chung. Chặn thay tài liệu khi thông tin company còn chưa lưu và hiển thị hướng dẫn lưu trước, tránh refresh upload làm mất nội dung đang nhập. Chạy lại 27 test frontend và production build đều đạt; backend/API không đổi trong lượt rà soát này.

Yêu cầu người dùng → backlog I1/BF6/P0/UX đã ghi → phân tích SRS/SDS và nguồn Google Ads/Ad Manager/Adslot/BuySellAds trong backlog → quyết định implementation → file/API/schema ở trên → test case và kết quả môi trường QA → giới hạn cloud/browser/Render. Ghi rõ AI tạo code và comment, người dùng cần review/nghiệm thu. Không ghi đã cập nhật tài liệu gốc hoặc đã deploy khi việc đó chưa xảy ra.

File nguồn chính: `BusinessCampaignPage.jsx`, `CampaignWorkflowService.java`, `BusinessFileService.java`, `BusinessAssetStorage.java`, `CampaignReviewPage.jsx`, `CampaignDeliveryScheduler.java`, `SlotBookingCalendar.jsx`, `bookingCalendar.js` và V14/V15. Không tự push/force-push hay thay đổi migration đã chạy trên DB chung.
