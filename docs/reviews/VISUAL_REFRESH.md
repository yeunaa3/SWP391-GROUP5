# Điều chỉnh giao diện — 07/10/2026

- Trang báo: nền giấy sáng, thẻ ảnh tràn mép, ảnh lớn/tít chính và cột tin mới rõ hơn; giữ lựa chọn phông chữ của độc giả.
- Banner xem thử: bố cục HTML/CSS thích ứng với từng vị trí, không còn nhét một ảnh ngang vào mọi khung; bỏ banner xem thử lặp ngay dưới banner đầu trang ở trang chủ. Quảng cáo DB vẫn dùng media đã lưu.
- Business: sidebar xanh than với icon, thẻ thống kê, khối giới thiệu, chiến dịch gần đây và lối tắt. Dữ liệu vẫn từ API, không thêm số liệu giả.
- Làm nhẹ khung nhập, bảng hợp đồng, badge trạng thái và thẻ chiến dịch; hỗ trợ giao diện tối trong khu Business.
- Menu khu quản lý trên màn hình nhỏ có nút mở/đóng, tự đóng khi chọn trang.
- Hiệu ứng hover/chuyển động nhẹ; tôn trọng prefers-reduced-motion và hiển thị viền focus bàn phím.

Xác minh: build frontend thành công; xem trực tiếp trang chủ và Business trên trình duyệt, kiểm tra bố cục Business ở 390 × 844 và thao tác menu đến Hồ sơ doanh nghiệp. Không thay backend, schema, thanh toán hay trạng thái dữ liệu nghiệp vụ.

Giới hạn: đây là lớp cải thiện thị giác chung + thiết kế lại trang chủ/dashboard Business; không có nghĩa toàn bộ 53 màn hình đều đã được thiết kế lại riêng. Các trang nghiệp vụ chưa nối API vẫn giữ giới hạn đã ghi trong báo cáo Business.
