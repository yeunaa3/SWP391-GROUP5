# Lịch sử trạng thái hồ sơ doanh nghiệp BUS-02

Yêu cầu: giữ trạng thái và kết quả các lần nộp, kể cả gửi lại hoặc đăng ký mới sau từ chối.

## Thay đổi

- CompanyApplicationHistory ghép snapshot theo company/version với quyết định trong partnership_reviews.
- Mỗi lần gửi mới lưu application_version, submission_status và application_code trong audit_logs.new_value,
  cùng transaction với snapshot. Không sửa nội dung snapshot cũ hoặc quyết định đã có.
- Không cần migration; dùng schema audit JSON và bảng review/version sẵn có.
- BUS-02 hiển thị trạng thái theo version, timeline nộp/gửi lại/quyết định, thời gian, người xét duyệt và phản hồi.
- Ghi chú NOTE làm việc của manager không được đưa vào timeline Business.
- Company mở DRAFT mới hoặc bị yêu cầu duyệt lại không đổi trạng thái lịch sử của bản cũ.
- Bản cũ thiếu audit nộp chỉ suy ra gửi lại khi có quyết định NEEDS_REVISION của version liền trước;
  thiếu kết quả đã lưu thì hiển thị rõ chưa có kết quả, không gán trạng thái company hiện tại cho bản cũ.

## Kiểm tra

- 7 CompanyApplicationHistoryTests và 2 AdManagerPartnershipServiceTests đạt.
- Frontend production build đạt, còn cảnh báo kích thước bundle.
- API/MySQL QA riêng: gửi lần 1, yêu cầu chỉnh sửa, gửi lại lần 2, từ chối, mở vòng DRAFT mới,
  gửi lần 3. Workspace vẫn giữ đúng NEEDS_REVISION và REJECTED cũ, lý do, RESUBMITTED của lần 2,
  và PENDING_REVIEW của lần 3. Không trả NOTE cho Business. Test đạt.
- Bộ kiểm thử rộng ban đầu có 2 lỗi booking cũ do fixture thiếu revision_no trong BusinessWorkspaceServiceTests;
  không thay booking hoặc fixture ngoài phạm vi yêu cầu này.
- Không kiểm thử giao diện trình duyệt hoặc ghi dữ liệu Render; chưa commit/push/deploy.

Chạy API QA: RUN_WORKFLOW_QA=1 python scripts/qa_campaign_workflow.py CampaignWorkflowQA.test_13_company_document_and_application_versions
