# Ghi chú để AI tiếp tục dự án The Pulse

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
