# Business: chức năng đã nối và cách test

Cập nhật: 07/10/2026. React → REST API Spring Boot → MySQL; tệp tải lên lưu tại `backend/storage/business`.

## Đã làm được

- BUS-01: tổng quan lấy số hợp đồng/chiến dịch thực của doanh nghiệp.
- BUS-02: tạo/lưu hồ sơ công ty, kiểm tra mã số thuế, không cho nhận công ty khác chỉ bằng mã số thuế. Hồ sơ đã duyệt khóa tên pháp lý/mã số thuế; hồ sơ đang chờ duyệt khóa sửa.
- BUS-03/04: tải tài liệu PDF/PNG/JPEG tối đa 8 MB, lưu phiên bản và gửi đăng ký hợp tác. Có phản hồi trạng thái thực; không tự duyệt.
- BUS-07/11/12: gửi yêu cầu đặt quảng cáo, kiểm tra lịch hợp đồng đã giữ chỗ, lưu yêu cầu và xem danh sách/chi tiết của công ty. Gửi yêu cầu chưa giữ chỗ, chưa thanh toán.
- BUS-13/14: tạo và sửa chiến dịch nháp trong khoảng thời gian của hợp đồng đã thanh toán còn hiệu lực.
- BUS-15/16/17: tải PNG/JPEG đúng kích thước slot, lưu từng phiên bản banner, xem trước, gửi cả chiến dịch và phiên bản banner mới nhất vào trạng thái chờ duyệt. Bản đã gửi khóa sửa.
- BUS-18/19: tiếp tục dùng báo cáo hiệu quả hiện có. Chiến dịch mới chưa chạy sẽ chưa có số liệu; số liệu chiến dịch demo là dữ liệu mẫu, không phải lượt xem thật vừa phát sinh.

Không thêm migration/bảng ở đợt này; dùng schema hiện có. Đã sửa cách đọc ngày giờ JDBC (MySQL có thể trả LocalDateTime hoặc Timestamp) và lấy công ty từ DB thay vì thông tin cũ trong phiên đăng nhập.

## Test nhanh trên web

1. Mở http://localhost:5173/login, đăng nhập `business.demo` / `Demo@12345`.
2. Vào Hồ sơ doanh nghiệp, sửa thông tin liên hệ rồi Lưu hồ sơ. Tải lại trang để kiểm tra.
3. Vào Danh sách chiến dịch → Tạo chiến dịch. Chọn hợp đồng mẫu đã thanh toán, nhập tên/ngày chạy trong thời hạn hợp đồng → Lưu nháp và tiếp tục.
4. Nếu chọn DEMO-AD-003 / Article Sidebar, dùng banner 300 × 600 trong `outputs/business-test/20261007025241-banner.png`. Nhập URL đích → Tải và lưu banner → Kiểm tra và gửi duyệt → Gửi chiến dịch và banner để duyệt.
5. Trang chi tiết phải hiện Chờ xét duyệt và không còn thao tác sửa bản đã gửi.
6. Muốn test hồ sơ hợp tác từ đầu, đăng ký tài khoản loại Doanh nghiệp mới → lưu hồ sơ → tải tài liệu giả lập → gửi đăng ký. Tài khoản demo đã được duyệt nên không gửi đăng ký lại.
7. Yêu cầu đặt quảng cáo: chọn thời gian trống trên lịch, nhập tên/gói và gửi. Có thể xem yêu cầu vừa lưu ở Danh sách hợp đồng. Khoảng trùng hợp đồng đã giữ chỗ sẽ bị từ chối.

## Xác minh

- Build frontend thành công (92 modules).
- 12 unit tests backend thành công.
- 19 bước kiểm thử tích hợp API/MySQL thành công: lưu công ty, đặt trùng lịch bị chặn, lưu yêu cầu, tạo/sửa chiến dịch, chặn gửi thiếu banner, chặn banner sai kích thước, tải banner, gửi đúng phiên bản, khóa sửa sau gửi, phân quyền Reader, tạo hồ sơ công ty với cùng phiên đăng nhập, chặn truy cập dữ liệu riêng của công ty khác, tải tài liệu và gửi hợp tác.
- Kiểm thử trực tiếp giao diện: sửa chiến dịch QA #5 → lưu nháp → tải banner → gửi duyệt → trang chi tiết hiện cả chiến dịch và banner Chờ xét duyệt.
- Bản ghi QA được giữ để xem lại, không xóa dữ liệu cũ. Script `scripts/test-business-local.ps1` tạo thêm dữ liệu mỗi lần chạy, chỉ dùng cho local.

## Chưa hoàn thiện / cần làm tiếp

- Ad Manager duyệt hồ sơ, thương lượng/đề xuất hợp đồng, thanh toán hợp đồng, hóa đơn, duyệt chiến dịch, tự lên lịch/kích hoạt chưa nối API. Không thể chạy toàn bộ vòng đời bằng tài khoản mới; hợp đồng demo được nạp sẵn để test tạo chiến dịch.
- Targeting, video, yêu cầu đổi quảng cáo đang chạy chưa thực hiện.
- Ghi impression/click thực tế và đối soát doanh thu chưa nằm trong đợt này.
- Công thức giá tạm: giá gói + giá vị trí × số ngày / 30; phải thống nhất lại trước triển khai chính thức. Yêu cầu nháp không giữ chỗ; cần kiểm tra/giữ chỗ nguyên tử ở bước chấp nhận hoặc thanh toán.
- Kho tệp local chưa có quét mã độc, lưu trữ cloud hay cơ chế dọn tệp mồ côi nếu máy dừng lúc commit. Chỉ dùng tài liệu giả lập, không tải giấy tờ thật lên môi trường thử nghiệm.
- Nhãn của các màn Business mới ưu tiên tiếng Việt; chưa hoàn tất bản tiếng Anh.

Tài khoản demo và mật khẩu công khai chỉ dành cho local, không dùng khi deploy.
