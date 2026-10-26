# UC-38: xác minh lưu hồ sơ doanh nghiệp

## Phản ánh và bằng chứng

Người dùng báo mất thông tin khi lưu/xác nhận, chuyển trang và quay lại trên Render.
Đã đọc bundle công khai và API bằng tài khoản demo được cấp: bản deploy có confirm lưu;
hồ sơ business.revision.demo còn trống industry/contact_person/billing_address.
Chưa xác định nguyên nhân của lần thao tác người dùng báo: không có Network/log của request đó.
Kiểm thử PUT production bị automatic approval review từ chối; không thay đổi dữ liệu Render.

## Thay đổi local

- Chụp và trim đủ tám field khi mở xác nhận, báo rõ field chỉ có khoảng trắng.
- PUT xong phải GET workspace với cache no-store và đối chiếu đủ tám field mới báo thành công.
- Khi lỗi lưu/xác minh, giữ dialog, dữ liệu nhập và dirty; lỗi hiển thị ngay trong dialog.
- Phân biệt PUT thất bại với PUT thành công nhưng GET kiểm chứng thất bại.
- Bỏ kết quả GET cũ nếu đã có lần tải mới hoặc bắt đầu lưu, tránh ghi đè dữ liệu vừa lưu.
- Không dùng localStorage thay cho lưu DB; không thay validation/phân quyền backend hay migration.

## Kiểm thử

- Năm test frontend mới đều pass: snapshot, đọc lại, PUT lỗi, response không khớp, GET lỗi sau PUT.
- Production build thành công (cảnh báo kích thước bundle).
- API integration trên backend jar local sẵn có :18080/MySQL QA :13306: tạo Business QA,
  tạo company, cập nhật tám trường, đọc lại hai workspace, đăng nhập session mới và đọc lại;
  thử dữ liệu không hợp lệ và xác nhận DB không bị sửa. Pass.
- Bộ frontend tổng có một test cũ thất bại vì regex bắt buộc khoảng trắng quanh `{ replace: true }`
  trong LoginPage đã được formatter đổi thành `{replace: true}`; không thay file ngoài scope.
- Chưa kiểm thử UI trình duyệt. Chưa deploy/push. Chưa xác nhận hết lỗi trên Render;
  cần deploy thay đổi và ghi nhận request/response thực tế nếu vẫn lỗi.

Lệnh QA: RUN_WORKFLOW_QA=1 python scripts/qa_company_profile.py (chỉ localhost QA).
