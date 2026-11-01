# Kiểm tra lại độc lập BUS-14 → BUS-15 → BUS-16 → BUS-17

Ngày: 01/11/2026. Thời điểm kiểm tra bổ sung: từ 09:01. Source: baseline `2377845` cùng working tree đang có; không commit/push/deploy.

## Kết luận

Trong phạm vi các testcase đã chạy ở lượt kiểm tra lại này, chưa tái hiện được lỗi chức năng của luồng chiến dịch. Đã chạy lại bằng fixture QA mới, không dựa vào campaign #168 của lượt trước. Không thay đổi product code trong lượt này; bổ sung bộ test API độc lập và ghi nhận bằng chứng UI/database.

Kết luận có phạm vi: không phải cam kết tất cả thiết bị/trình duyệt, tải cao, Cloudinary thật hoặc bản Render đã được kiểm thử cùng source. Các sửa BUS-03/comment JSX từ lượt trước vẫn còn trong working tree, chưa triển khai lên Render.

## Môi trường

- Frontend QA: `http://127.0.0.1:5173`, proxy tới backend QA `127.0.0.1:18080`.
- MySQL riêng: `127.0.0.1:13306/pulse_workflow_qa`.
- Storage local riêng: `.runtime/workflow-qa-uploads`.
- Dữ liệu UI lần này: campaign **175**, tên `QA Recheck Campaign 2026-11-01`, hợp đồng QA **55**, code `QA-58d46b8003`.
- Tài khoản có quyền Business, company APPROVED và hợp đồng ACTIVE/PAID là fixture QA. Test ownership dùng một company khác cũng đã APPROVED để không bị chặn sớm vì thiếu hồ sơ.
- Không đổi mật khẩu demo, không thanh toán thật và không sửa dữ liệu Render.

## Kết quả theo cấp độ

| Cấp độ | Test đã chạy lại | Đạt | Fail | Skip |
|---|---:|---:|---:|---:|
| Frontend unit: campaign-draft, campaign-sort, business-workflow | 14 | 14 | 0 | 0 |
| Backend unit: CampaignWorkflowService, BusinessCreativeVideo, BusinessPartnershipApproval, WorkflowPolicy | 14 | 14 | 0 | 0 |
| API/integration độc lập: qa_campaign_flow_recheck.py | 6 nhóm | 6 | 0 | 0 |
| System/UI qua bốn màn, kết hợp đối chiếu bản ghi QA | 10 nhóm ở bảng dưới | 10 | 0 | 0 |

Một nhóm API hoặc UI gồm nhiều thao tác/assertion; không cộng chúng với số unit test để tạo tỷ lệ hoàn thành toàn dự án. Không chạy lại toàn bộ regression ngoài phạm vi trong lượt này. Lỗi test Premium ngoài phạm vi ghi ở báo cáo trước chưa được xử lý hoặc tuyên bố đã hết.

## API/integration đã kiểm tra độc lập

| Nhóm | Điều kiện / điều cần chứng minh | Kết quả |
|---|---|---|
| A01 | Không cho tạo từ payment UNPAID/PENDING/FAILED/REFUNDED hoặc contract DRAFT/PROPOSED/CANCELLED/EXPIRED/COMPLETED; company khác dù APPROVED không được dùng hợp đồng này | Đạt |
| A02 | Tên rỗng, end ≤ start, lịch ngoài hợp đồng, JavaScript URL, URL chứa thông tin đăng nhập bị chặn; name/version đã lưu không bị thay một phần | Đạt |
| A03 | Upload v1/v2, bỏ nháp v2, gửi đúng creative v1 còn dùng; retry submit không tạo thêm submission và không thay snapshot | Đạt |
| A04 | Checklist vừa hợp lệ nhưng slot sau đó INACTIVE: POST submit kiểm lại, chặn gửi, không tạo submission; slot hoạt động lại thì gửi được | Đạt |
| A05 | Sau PENDING_REVIEW không sửa thông tin/upload/targeting/gỡ creative được; khách và company khác không đọc được media riêng | Đạt |
| A06 | Manager yêu cầu bổ sung → sửa URL → gửi lại; có hai submission, snapshot lần đầu giữ nguyên, lần sau chốt đúng URL mới | Đạt |

Script chỉ hỗ trợ QA cố định qua helper `qa_campaign_workflow.py`; không nhận URL production. Các thay đổi status/slot trong A01/A04 chỉ tác động fixture QA và được phục hồi trong `finally`.

## System test đã thực hiện qua giao diện

| Nhóm | Màn và thao tác thực tế | Kết quả |
|---|---|---|
| U01 | BUS-14 bấm Lưu và tiếp tục khi chưa nhập tên | Native validation chặn tên rỗng; không chuyển bước |
| U02 | Nhập tên/lịch, để URL trống, Lưu nháp và thoát; tìm đúng tên ở BUS-13 | Tạo DRAFT, về danh sách; giữ lịch 03/11/2026 09:00 → 06/11/2026 09:00, chưa phân phối |
| U03 | Mở Sửa bản nháp, đọc lại tên/lịch, thêm URL, Lưu và tiếp tục | Giữ record #175, tự chuyển đúng `/business/campaigns/175/creative` |
| U04 | Nhập Technology/VN/MOBILE nhưng chưa lưu targeting; tải banner 2 × 2 rồi banner 320 × 180 | Banner sai bị chặn và báo đúng kích thước; lỗi không mất geo đang nhập; upload đúng thành công vẫn giữ Technology/VN/MOBILE chưa lưu |
| U05 | Sửa URL chưa lưu, nhập geo ZZ, bấm Lưu đối tượng | Báo lỗi ISO; không xóa URL đang sửa và không báo thành công giả |
| U06 | Sửa geo về VN, lưu targeting rồi lưu riêng URL; reload | Lưu targeting vẫn giữ URL chưa lưu; lưu URL tạo creative v2; reload giữ URL mới, Technology/VN/MOBILE và hai version creative |
| U07 | BUS-16 xem checklist và tóm tắt | Đạt 10/10; URL `https://example.com/campaign-recheck?draft=1`, lịch 03–06/11, MOBILE, VN và preview đúng |
| U08 | Bấm Gửi → Hủy; mở BUS-17 | Hiện `Chưa gửi phiên bản nào`, còn nháp; không tạo submission từ thao tác Hủy |
| U09 | Quay lại BUS-16, Gửi → Xác nhận; reload BUS-17 | Tự sang đúng chi tiết #175; PENDING_REVIEW/Chờ duyệt, Chưa phân phối, một submission v1 và timeline thật |
| U10 | Sau gửi, mở lại BUS-14/BUS-15/BUS-16 | Tên, Lưu và tiếp tục, upload, Lưu đối tượng và Gửi chiến dịch đều disabled |

Datetime-local được nhập qua công cụ với thao tác phím để React nhận thay đổi; giá trị sau lưu đã được đối chiếu cả UI lẫn DB. Không coi DOM vừa được fill là bằng chứng database đã lưu.

## Đối chiếu database sau thao tác UI

Truy vấn chỉ đọc trên record QA #175 xác nhận:

| Giá trị | Dữ liệu đã lưu |
|---|---|
| Campaign status | PENDING_REVIEW |
| Start/end | 2026-11-03 09:00:00 → 2026-11-06 09:00:00 |
| Số submission | 1 |
| Submission version | 1 |
| Creative version trong submission | 2 |
| URL trong snapshot | https://example.com/campaign-recheck?draft=1 |
| Geo/device trong snapshot | VN / MOBILE |

Submission version và creative version là hai số độc lập. Việc nộp lần đầu dùng creative v2 là đúng vì URL đã được sửa trước khi gửi; không mô tả nhầm thành đã gửi hai lần.

## Thay đổi và bằng chứng

- Thêm `scripts/qa_campaign_flow_recheck.py`: sáu nhóm testcase độc lập và tạo fixture QA mới. Không sửa implementation hoặc migration.
- Cập nhật báo cáo này và liên kết trong AI_HANDOVER.md/báo cáo Iteration 2.
- Log: `.runtime/campaign-recheck-unit.log`, `.runtime/campaign-recheck-api.log`.
- UI: `.runtime/campaign-recheck-ui-evidence.txt`, `.runtime/campaign-recheck-result.png`.
- Tài khoản QA phục vụ UI chỉ lưu trong `.runtime/campaign-recheck-ui.json`, không đưa password vào báo cáo hoặc Git.

Kết quả frontend unit 14/14 được đọc trực tiếp từ lần chạy `node --test --test-reporter=spec frontend/tests/campaign-draft.test.mjs frontend/tests/campaign-sort.test.mjs frontend/tests/business-workflow.test.mjs` trong lượt này. Để chạy lại API, bật RUN_WORKFLOW_QA=1 và chạy `scripts/qa_campaign_flow_recheck.py` khi môi trường QA riêng đã sẵn sàng.
