# Rà soát và dọn source — 12/10/2026

## Phạm vi và Git

Đã đối chiếu source với Desktop/Document/Updated_2026-10-11/The_Pluse_SDS.docx. Lần này chỉ sửa trên máy, không commit, push hay deploy. Trước lần dọn, working tree sạch. Hai commit trước là d3d759f và 93dfcf7 đã được push phục vụ cập nhật web; không có thao tác Git ghi mới trong lần dọn này.

## Có đúng SDS không?

Đúng ở stack React → REST → Spring Boot → MySQL, phân nhóm package, session/CSRF và triển khai cùng origin. Chưa hoàn toàn đúng kiến trúc phân lớp mục tiêu: User/Role dùng JPA repository; các service nội dung, quảng cáo, Business, file và RSS còn truy cập JdbcTemplate trực tiếp. SDS có ghi nhận hiện trạng này. Tách repository là refactor riêng cần kiểm thử nghiệp vụ, không phải xóa file.

Một số màn còn dùng ScreenWorkspacePage với dữ liệu/biểu mẫu minh họa; có route không có nghĩa chức năng đã hoàn tất. Các gateway Payment/Email/Storage là interface chờ tích hợp. Scheduler hiện chưa gom riêng, lịch RSS nằm trong RssImportService. CSS còn các lớp bổ sung; lần này không đảo thứ tự hay gộp tùy tiện để tránh thay đổi giao diện.

## Đã dọn

- Bỏ 3 module FE không nằm trong cây import từ main.jsx: LanguageSelect, healthService, ArticleCard. Ngôn ngữ vẫn chọn trong ReaderSettings; backend health API vẫn giữ. Xóa các selector riêng của ArticleCard cũ, giữ style dùng chung.
- Bỏ 7 README một dòng trong src; nội dung tìm kiếm được gộp vào HUONG_DAN_CAU_TRUC.md ở gốc project.
- Chuyển usePremiumPlan vào hooks, premiumUtils thành utils/premium.js, premium.css vào assets. Cập nhật import và test tương ứng.
- Tách API lấy gói thật vào services/premiumService.js. Không đổi sang dữ liệu dự phòng khi API thanh toán lỗi.
- Bỏ nhánh BUS-07 và các điều kiện Business/ADM-10 không thể chạy trong ScreenWorkspacePage: AppRoutes đã chuyển các màn đó sang BusinessWorkspacePage/PerformancePage.
- Bỏ PremiumNewsApplicationTests: đây chỉ là một test rỗng, không chạy Spring context và không có assertion. Giữ nguyên các test có kiểm tra hành vi.
- Sửa hướng dẫn cấu trúc để phân biệt hiện trạng với kiến trúc mục tiêu, thêm bảng tìm nhanh màn hình/API/DB/phân quyền.

## Không xóa

Không thay schema, migrations, dữ liệu, file môi trường, chứng chỉ triển khai, QR, ảnh tham chiếu, lịch sử tài liệu, dependency hay upload. Giữ gateway interfaces, workflow policy, enum và DTO dự kiến theo SDS. Không đổi tên package/module kỹ thuật hàng loạt vì dễ tác động build/deploy. Không tự dừng web/DB đang chạy.

## Kiểm tra

- Frontend: build production thành công sau lần sửa cuối; 5/5 test Premium/routing đạt.
- Inventory: 53 màn, 53 ID khác nhau. Import graph sau chuyển file không có đường dẫn hỏng; module không được gọi duy nhất là ArticleCard và đã loại bỏ sau đó.
- Git diff --check: không có lỗi whitespace (chỉ cảnh báo chuyển LF/CRLF trên Windows).
- Backend: Maven offline test thành công, 18/18 test đạt, không skipped. Lỗi ban đầu do 10 bản sao resource trong target bị ReadOnly; đã bỏ thuộc tính chỉ đọc trên đúng các file build tự sinh rồi chạy lại thành công. Không thay nội dung/quyền cấu hình gốc. Bộ test dùng mock/focused test, không chứng minh tích hợp MySQL đầy đủ.
- Chưa kiểm thử UI tương tác bằng trình duyệt hoặc DB tích hợp trong lần dọn này; web Render chưa thay đổi.

## Khôi phục

Bản sao trước khi dọn FE và test rỗng đã lưu ngoài project:
`C:/Users/Dumpling/Documents/Codex/2026-09-13/new-chat/work/source-cleanup-20261012/`.
Các file vốn đã tracked cũng có thể khôi phục theo lịch sử Git khi người dùng yêu cầu; lần dọn không xóa lịch sử Git.

## Phần còn cần cải tổ, không được coi là đã xong

1. Tách SQL khỏi service thành repository theo từng nghiệp vụ, có integration test MySQL trước khi chuyển.
2. Tách BusinessWorkspacePage và generic ScreenWorkspacePage theo feature khi triển khai thật; không tạo hàng chục file trống chỉ để đủ tên màn.
3. Chuẩn hóa CSS theo component/layout, đối chiếu ảnh trước/sau ở các kích thước màn hình để loại các override an toàn.
4. Bổ sung test HTTP/session/authorization, nghiệp vụ và DB; build thành công không chứng minh các flow đã hoạt động đầy đủ.
