# Quy tắc làm việc do người dùng yêu cầu

## Kiểm thử sau mỗi lần sửa code

- Sau mỗi thay đổi code, tự kiểm thử từ thấp đến cao: unit test → kiểm thử component/API/quyền truy cập → integration test với database/storage → system test qua giao diện và luồng nghiệp vụ liên quan.
- Chọn testcase hợp lệ, không hợp lệ, giá trị biên, trạng thái không cho phép, quyền/ownership, lỗi lưu và việc đọc lại dữ liệu sau tải lại trang/đăng nhập lại khi phù hợp với phần sửa.
- Dùng database, tài khoản và file QA riêng cho các thử nghiệm có thay đổi dữ liệu. Không thay mật khẩu demo, không tạo giao dịch thanh toán thật, không sửa dữ liệu thật để mô phỏng testcase.
- Nếu testcase thất bại, xác định nguyên nhân ở code, testcase hoặc môi trường; sửa lỗi trong phạm vi được giao rồi chạy lại test liên quan và regression cần thiết. Không sửa kỳ vọng chỉ để che lỗi nghiệp vụ.
- Báo cáo phải liệt kê phần đã test, cấp độ test, môi trường, số đạt/thất bại/bỏ qua/chưa thực hiện, lỗi tìm thấy, thay đổi đã sửa và giới hạn còn lại. Không gọi một mức test là đạt nếu chưa chạy; kiểm thử local không chứng minh bản Render đã có cùng code.
- Không tự commit, push hoặc deploy khi chưa được yêu cầu.

## Migration SQL

- Mỗi số phiên bản Flyway chỉ dùng một lần trong `backend/src/main/resources/db/migration`.
- Không đổi tên hoặc nội dung migration đã chạy thành công trên database chung. Khi cần thay đổi tiếp, kiểm tra nhánh chung và dùng migration mới với số chưa dùng.

