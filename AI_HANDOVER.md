# Ghi chú để AI tiếp tục dự án The Pulse

## Hoàn thiện Iteration 3 — 01/11/2026

Đọc [ITER3_COMPLETION_AND_QA_2026-11-01.md](docs/reviews/ITER3_COMPLETION_AND_QA_2026-11-01.md) trước khi tiếp tục. Đã đối chiếu Project Tracking Functions dòng 63–68: BUS-16/UC-27, ACC-01/UC-08, CFG-02/UC-34, CFG-06/UC-37, JOB-01 và API-05. Không đồng nhất Iteration 3 chỉ với BUS-16/17.

CFG-02/CFG-06 đã thay prototype bằng trang/API thật. Bổ sung role_permissions, version và V19 mới (inventory origin/main đã kiểm tra đến V18); live DB authorization/session revocation; last-admin guard kể cả hai admin đồng thời; settings whitelist có consumer upload và audit/default/rollback. JOB-01 tách PremiumExpirationService tránh self-invocation transaction, mặc định 15 phút, expiry/audit/notification idempotent. ACC-01 có Unicode BCrypt byte validation; AuthContext silent refresh giữ form/filter/success sau save. Campaign preview có fallback/retry khi media thiếu. Giữ thay đổi Iteration 2 đang uncommitted; chưa commit/push/deploy, không sửa tài liệu gốc.

QA mới tách khỏi QA cũ: MySQL 13306/pulse_iteration3_qa, backend 18081, storage .runtime/iteration3-uploads; frontend 5173 hiện proxy 18081. Kết quả cuối: frontend 48/48; unit backend trực tiếp liên quan 25/25; toàn backend 99 = 97 pass + 1 fail ManualPremium đổi gói đã có trước + 1 live RSS skip; API Iteration 3 20/20 nhóm; regression BF-03/BF-06 22/22 nhóm; UI 13/13 nhóm. Không gọi toàn suite hoặc Render là xanh. Script scripts/qa_iteration3.py cố định QA; không commit .runtime/iter3-ui.json có credential giả lập. V19 chưa push, kiểm tra lại số với nhóm trước khi tích hợp. Catalog cài đặt hiện mở hai khóa creative size, trần HTTP 8MB; booking/dedup/currency chỉ xem vì không có consumer cấu hình động trong phạm vi này.

## Cập nhật kiểm thử 01/11/2026

Kiểm tra lại riêng BUS-14/15/16/17 từ 09:01: đọc [báo cáo kiểm tra lại luồng chiến dịch](docs/reviews/CAMPAIGN_FLOW_RECHECK_2026-11-01.md). Frontend unit 14/14, backend unit 14/14, sáu nhóm API độc lập và mười nhóm UI đạt. Fixture UI mới: campaign #175, một submission v1 chốt creative v2; đã đối chiếu URL/lịch/targeting trong DB, thử lưu riêng targeting và URL để không mất dữ liệu đang nhập, hủy gửi không tạo submission, gửi xong khóa cả ba form. Không sửa product code trong lượt kiểm tra lại; thêm scripts/qa_campaign_flow_recheck.py và báo cáo. Giới hạn cloud/Render/regression ngoài phạm vi vẫn giữ như báo cáo trước.

Đọc [báo cáo QA Iteration 2 BF-03/BF-06](docs/reviews/ITER2_QA_BF03_BF06_2026-11-01.md) và quy tắc mới trong [AGENTS.md](AGENTS.md) trước khi sửa tiếp. Người dùng yêu cầu sau mỗi sửa code phải test từ unit đến system, liệt kê cấp độ/kết quả, sửa lỗi trong phạm vi và test lại; không tính ca chưa chạy là đạt.

Baseline hiện tại `2377845`. Working tree có sửa BUS-03 để chặn gửi hồ sơ khi metadata còn nhưng file mất trên storage; đã tái hiện trước sửa và kiểm tra lại. Sửa hai comment JSX bị hiện chữ trên BUS-03/BUS-04. Có test regression và cập nhật fixture cũ theo quy tắc khóa hồ sơ/5 file/revision booking. Chưa commit/push/deploy; không sửa migration hoặc tài liệu gốc.

Kết quả: frontend 48/48; nhóm backend liên quan 43/43; API workflow 22/22 và persistence 1/1 trên QA riêng. Toàn bộ backend 87 ca: 85 pass, 1 fail thuộc test đổi gói ManualPremium ngoài phạm vi, 1 live RSS test skip. Browser đã xác nhận login, dashboard, khóa profile/application, timeline và tìm campaign theo mã trên Render. Bổ sung 08:53–08:58: UI QA đã hoàn tất lưu profile → reload → upload tài liệu → hủy/xác nhận gửi → BUS-04 chờ duyệt → khóa BUS-02; và BUS-14 lưu/chuyển bước → banner sai/đúng → targeting giữ sau reload → checklist 5 mục thiếu rồi 10/10 đạt → hủy/xác nhận → BUS-17 chờ duyệt → khóa các form. Campaign QA #168 và hồ sơ QA version 1 giữ lại để đối chiếu. Native confirm Làm mới ghi nhận theo người dùng xác nhận chạy đúng; AI chưa tự chạy nhánh Đồng ý. Cloudinary thật và persistence qua redeploy Render chưa xác nhận. Lượt bổ sung chỉ sửa báo cáo/dữ liệu QA, không sửa thêm implementation.

Các đoạn dưới là bối cảnh bàn giao ngày 20/10, không dùng các số test/trạng thái triển khai cũ làm kết quả hiện tại.

Ngày cập nhật: 20/10/2026.

Đọc trước: [Bàn giao implementation ngày 20/10/2026](docs/reviews/IMPLEMENTATION_BF03_BF06_2026-10-20.md).

Người dùng đã giao triển khai backlog BF-03/BF-06 và các ý tưởng booking, trừ email xác nhận/resend. Code đang ở working tree local, chưa commit/push/deploy. Baseline đã fast-forward từ `043ac14` lên `f3dde8e` trước khi làm. Kiểm tra `git status` trước khi tiếp tục; không reset/ghi đè thay đổi local.

[Backlog trước triển khai và nguồn tham khảo](docs/reviews/ITERATION1_BF03_BF06_BACKLOG_AND_IDEAS.md) giữ để traceability. Các câu “chưa có” ở baseline cũ phải đọc cùng báo cáo implementation mới.

Luồng mới: BusinessCampaignPage → apiRequest → BusinessWorkspaceController → CampaignWorkflowService → JdbcTemplate/MySQL. Upload qua BusinessFileService/BusinessAssetStorage. Manager review qua CampaignReviewPage/CampaignReviewController, xét đúng immutable submissionId. Job CampaignDeliveryScheduler chuyển SCHEDULED→ACTIVE/COMPLETED và chỉ thay bản gốc khi bản mới thực sự ACTIVE.

Đã có tám field company, legal re-review/history, dashboard raw metrics, campaign search/filter/code, stepper, draft save/continue/clone/delete, creative ảnh/MP4/version/preview/UTM, targeting, checklist/confirmation/snapshot/timeline và thông báo trong app. Booking có calendar fail-closed/manual validation/end-exclusive, free-range suggestions, package comparison/placement cards, quote snapshot và price-change check.

V14 mới bổ sung schema. V15 chuyển campaign pending cũ sang submission có nhãn legacyImported hoặc NEEDS_REVISION nếu không xác định được creative; không tự tạo approval. Không sửa V1–V13; mỗi số V chỉ một lần, không đổi tên/nội dung migration đã chạy trên DB chung. Cần đối chiếu lại migration nhánh chung trước khi tích hợp với công việc của người khác.

Kiểm thử: Java 66 test (65 pass, 1 live test skip); frontend 27 pass; API MySQL riêng 15 kịch bản. MySQL QA :13306/pulse_workflow_qa và backend QA :18080; dữ liệu QA trong `.runtime/`, không phải DB thật. Script `scripts/qa_campaign_workflow.py` không dùng mật khẩu demo. Đọc báo cáo để chạy lại.

Chưa smoke test Cloudinary thật vì chưa có credentials; adapter local/cloudinary đã có và cấu hình mẫu backend/.env.example. Geo hiện theo vùng trình duyệt Accept-Language, không GPS/IP xác minh. Browser E2E chưa chạy vì browser use bị tắt trong Work settings. Không suy ra website Render đã được cập nhật hoặc lỗi 403 Render cũ đã được tái hiện. Không tắt CSRF.

SRS/SDS/Project Tracking gốc chưa chỉnh sửa. Báo cáo mới có bảng màn hình/UC, API/DB design, điều chỉnh cần đưa vào tài liệu và giới hạn thực tế. Giữ login về homepage theo hành vi/test routing hiện có, workspace từ menu. Không tự triển khai toàn bộ payment/negotiation BF-05 hoặc anti-fraud BF-08 chỉ vì các ý tưởng có liên quan.
