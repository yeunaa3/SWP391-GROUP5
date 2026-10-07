# Cập nhật trải nghiệm frontend — 06/10/2026

## Lịch đặt quảng cáo và Performance tương tác

- Thay BUS-06 bằng lịch theo tháng thực: slot từ catalog, khoảng đã đặt từ hợp đồng ACTIVE/PAID trong MySQL. Không tiết lộ công ty/hợp đồng của doanh nghiệp khác. Chọn start/end chỉ trên ngày trống, chặn khoảng đi qua ngày bận, truyền slot/ngày sang BUS-07. Lịch chỉ tham khảo, chưa giữ chỗ; gửi booking thực và chống đặt trùng vẫn cần API transaction.
- Thay BUS-18/BUS-19/ADM-10 bằng báo cáo dữ liệu theo ngày từ ad_metrics, giới hạn phía server theo company_id cho Business. Có bộ lọc chiến dịch/thời gian, tổng impressions/clicks/CTR/invalid clicks, line/bar chart, chọn ngày, donut phân bổ, bảng chi tiết, tải CSV và làm mới.
- Hiệu ứng: KPI đếm mượt, vẽ đường/cột, donut xuất hiện, hover; hỗ trợ reduced-motion. Không sinh số liệu hoặc tăng trưởng giả; dữ liệu DB hiện vẫn là seed thử nghiệm.
- Sửa CSRF client: lấy masked token từ endpoint trước mỗi yêu cầu ghi, thay vì raw cookie không khớp XOR handler Spring. Đã thử đăng nhập trên UI và thành công sau khi sửa lỗi 403.
- Frontend build thành công, 7 backend tests pass. Backend local đã được khởi động lại, PID 18632; phiên đăng nhập cũ cần đăng nhập lại.
- Kiểm tra API Business: 21 dòng performance, 3 khoảng giữ slot. Trên UI đã thử lọc NovaLearn, đổi clicks/cột, chuyển tháng, chọn 05–10/01/2027 (6 ngày), nút tiếp tục có đúng slotId/startDate/endDate. Hợp đồng seed hiện chiếm slot đến 04/01/2027, nên lịch tháng 10 trông đầy là đúng dữ liệu, không phải nút bị hỏng.
- Chưa triển khai toàn bộ các form CRUD, duyệt hợp đồng, thanh toán/refund, creative upload, ghi nhận impressions/clicks thật trong lần này. Các phần này vẫn theo danh sách việc còn lại; không coi trang prototype là nghiệp vụ hoàn thành.

## Nối màn hình và sửa vùng trắng

- Xác định khung banner `public-preview-top` dùng chung `.public-content` nên thừa min-height 680px. Bỏ min-height cho các khung này.
- Tin nổi bật không kéo cao theo sidebar; nội dung căn đầu thay vì căn giữa. Sửa ảnh thumbnail ở cột Tin mới về kích thước nhỏ do selector cũ ép link thành block.
- Hiệu ứng cuộn không còn làm nội dung opacity 0; chuyển động chỉ trang trí khi nội dung hiện.
- Menu quản lý nhóm theo feature, có vùng cuộn riêng và người dùng ghim cuối; bỏ số màn và mục kết quả thanh toán khỏi menu chính.
- Bổ sung điều hướng màn liên quan cho Business, Ad Manager, Premium; không sinh ID giả khi thiếu bản ghi. Thẻ chiến dịch dùng campaign ID thật từ API để mở chi tiết/creative/báo cáo.
- Nút Start booking request hoạt động; chọn gói/vị trí trong báo giá mang ID sang biểu mẫu đặt quảng cáo, danh sách chọn lấy từ catalog API.
- Form prototype chưa nối API ghi DB; thay thông báo lưu thành công giả bằng thông báo chưa lưu. Các liên kết chuyển màn không tự tạo/duyệt hợp đồng, thanh toán hoặc kích hoạt chiến dịch.
- Build thành công; kiểm tra trực quan menu có nhóm/cuộn, nội dung trang chủ hiện và thử nút báo giá → booking chuyển đúng URL.

## Xem thử nhiều vị trí quảng cáo

- Trong Vite development, bật mặc định chế độ quảng cáo mẫu cho trang tin của người không có vai trò Subscriber; có nút tắt để quay lại banner từ API/DB. Chế độ production không bật mặc định.
- Dùng 3 tài sản mẫu NovaLearn, GreenFarm, CloudDesk để minh họa xoay vòng 4 giây ở các vị trí; đây không phải bằng chứng các slot mới đã được đặt mua hoặc tồn tại trong DB.
- Trang bài viết có banner đầu trang, trước bài, sidebar, trong bài, cuối bài; nền hai bên chỉ hiển thị từ 1580px. Không có quảng cáo ở màn Login hoặc khu quản lý. Premium vẫn không hiện banner xem thử.
- Đã xác nhận banner tự chuyển từ NovaLearn sang GreenFarm trên trang bài viết; build thành công.
- Đã kiểm tra đăng nhập qua API có CSRF: reader.demo (READER), business.demo (BUSINESS), manager.demo (AD_MANAGER), admin.demo (ADMINISTRATOR), mật khẩu mẫu chung Demo@12345 đều đăng nhập thành công. Các tính năng chưa hoàn thiện vẫn theo giới hạn báo cáo trước.

## Đọc thành tiếng và nền trang báo

- Thêm bộ đọc dùng Speech Synthesis của trình duyệt, chọn giọng tiếng Việt, tốc độ 0.75–1.5×, tạm dừng/tiếp tục/dừng và tiến độ theo đoạn. Chuyển bài hoặc thay đổi quyền truy cập dừng âm thanh đang chờ.
- Bài Premium khóa chỉ đọc tiêu đề và summary; không đưa toàn văn khóa vào hàng đợi đọc.
- RSS vẫn chỉ cung cấp phần giới thiệu. Không thêm thu thập toàn văn nguồn báo hoặc vượt paywall trong thay đổi này. Để dùng toàn văn cần nguồn dữ liệu/giấy phép phù hợp.
- Nền có họa tiết điểm nhỏ và hai mảng màu nhạt; vùng đọc giữ nền sạch. Thêm chuyển động sóng âm khi phát, hiệu ứng thẻ tin và hover tin liên quan. Tôn trọng reduced-motion.
- Build frontend thành công. Kiểm tra trên trình duyệt trong ứng dụng: bộ nghe và nền hiển thị đúng nhưng môi trường này không cung cấp giọng tiếng Việt, nút phát bị vô hiệu hóa và hiển thị hướng dẫn. Chưa xác nhận phát âm thanh thực tế. Không khẳng định có giọng AI Nam/Bắc.

- Đồng bộ Segoe UI cho tiêu đề, nội dung và điều khiển. Phông có sẵn trên Windows và hỗ trợ tiếng Việt; nền tảng khác dùng phông hệ thống dự phòng.
- Xóa form tìm kiếm lớn trong trang Search. Thanh trên mở tìm kiếm nhanh (hoặc Ctrl/Cmd+K); Enter mở trang kết quả. Chỉ hiện bộ lọc chuyên mục khi có từ khóa.
- Bổ sung hộp tìm kiếm có gợi ý lấy từ API, đóng bằng Escape, điều khiển focus và khóa cuộn nền.
- Trang chủ thêm dải tin có tạm dừng, khu giới thiệu ấn bản, chọn nguồn báo cho khối tin và khu giới thiệu Premium.
- Trang bài viết có chỉnh cỡ chữ 16–26px, chế độ tập trung và phóng to ảnh. Giữ thông tin nguồn và liên kết đọc bài gốc; không biến RSS thành toàn văn.
- Giao diện sáng/tối ghi nhớ lựa chọn; thẻ tin có chuyển động hover. Tôn trọng thiết lập giảm chuyển động của thiết bị.
- Banner có chuyển mẫu tự động và nút chọn khi API trả nhiều mẫu trong cùng vị trí; dữ liệu hiện tại có thể chỉ có một mẫu nên không hiện nút xoay.

## Kiểm tra và giới hạn

- Frontend build thành công sau thay đổi bố cục/phông chữ, công cụ đọc và trang tin dạng ảnh.
- Đã kiểm tra trực quan trang chuyên mục Kinh doanh: form tìm kiếm lớn đã được bỏ, tiêu đề tiếng Việt dùng phông mới.
- Phiên kiểm tra trình duyệt bị ngắt nên chưa kiểm thử trọn chuỗi tìm nhanh → Enter → bộ lọc trong phiên này.
- Lưu bài vẫn đang hoàn thiện như thông báo trên giao diện. Chưa thêm ghi nhận impression/click thực cho banner trong lần sửa giao diện này.

## Bố cục trang báo có ảnh

- Trang Search/chuyên mục bỏ bảng quản lý, thay bằng một tin nổi bật ảnh lớn, hai tin phụ ảnh nhỏ và lưới bài có ảnh, tóm tắt, nguồn, ngày đăng.
- Ưu tiên các bài RSS thật trước bài mẫu. Không thu thập toàn văn hoặc toàn bộ thư viện ảnh nguồn báo; dùng thumbnail đã nhập qua RSS.
- Thêm ảnh nhỏ ở cột Tin mới và ảnh cho các khối chuyên mục trên trang chủ. Ảnh thiếu/lỗi có thông báo dự phòng, không gán ảnh không liên quan.
- Kiểm tra trực quan trang Kinh doanh: ảnh Leadvisors, đất bỏ hoang và hội nghị Tây Ninh đã tải và hiển thị trong bố cục ảnh lớn/nhỏ.
