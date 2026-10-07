# Deploy The Pulse lên Render

## Phương án đã chuẩn bị

Một Docker Web Service trên Render: React được build rồi phục vụ bởi Spring Boot. Trình duyệt dùng cùng địa chỉ HTTPS cho trang web, `/api` và ảnh banner; không cần tách hai domain hoặc đổi cookie sang cross-site. MySQL online là dịch vụ riêng; MySQL trên máy vẫn dùng cho local.

Đã thêm Dockerfile, `.dockerignore`, `render.yaml`, profile `render` và điều hướng React khi mở trực tiếp URL con. Không tự push GitHub, tạo dịch vụ, thanh toán hay deploy.

## Còn cần trước khi deploy

1. Một MySQL **8.x online**, có database riêng trống, user/password và kết nối TLS theo nhà cung cấp. Không dùng `localhost` và không mở cổng MySQL máy cá nhân ra Internet. Render không có managed MySQL miễn phí giống MongoDB Atlas; tự chạy MySQL trên Render cần lưu trữ bền vững và cấu hình riêng.
2. Kiểm tra thay đổi rồi commit/push lên repository GitHub của nhóm. Không push `.env`, password, thư mục upload hoặc dữ liệu cá nhân. Bản đang sửa có nhiều thay đổi chưa commit.
3. Chốt nơi giữ tài liệu/banner tải lên. Gói free không có ổ lưu trữ bền vững: tệp upload ở `/tmp` sẽ mất khi restart/redeploy. DB còn metadata nhưng tệp có thể mất. Chỉ dùng demo giả lập cho đến khi có cloud storage hoặc disk phù hợp.

## Các bước Render

### Aiven của nhóm

- Database riêng: `premium_news_ad` (đã yêu cầu tạo trên Aiven; kiểm tra lại trước khi deploy).
- Chứng chỉ công khai: `deploy/certs/aiven-ca.pem`. Dockerfile nhập CA này vào Java truststore; không thay thế các CA mặc định.
- `DB_URL`: `jdbc:mysql://the-pulse-db-swp391-group5.b.aivencloud.com:27887/premium_news_ad?sslMode=VERIFY_IDENTITY&serverTimezone=UTC`
- `DB_USERNAME`: `avnadmin`. Nhập `DB_PASSWORD` trực tiếp trên Render, không lưu vào Git.
- Có thể chọn New → Web Service thay Blueprint: Docker, root directory để trống, Dockerfile `./Dockerfile`, plan Free, health check `/actuator/health`.
- Khi tạo Web Service thủ công, thêm `SPRING_PROFILES_ACTIVE=prod,render`, `APP_UPLOAD_DIRECTORY=/tmp/the-pulse-uploads`, `NEWS_IMPORT_ENABLED=true` nếu muốn nhập tin RSS, cùng ba biến DB phía trên.

1. Đăng nhập Render → New → Blueprint → kết nối repository `SWP391-GROUP5` → chọn đúng branch nhóm đã push.
2. Render đọc `render.yaml`; kiểm tra dịch vụ `the-pulse-group5`, Docker, plan Free. Không tạo thêm DB PostgreSQL vì dự án dùng MySQL.
3. Nhập ba biến bí mật trong Render (không gửi password vào chat):

| Biến | Giá trị |
|---|---|
| `DB_URL` | `jdbc:mysql://HOST:PORT/DATABASE?sslMode=VERIFY_IDENTITY&serverTimezone=UTC` — điều chỉnh chứng chỉ/TLS theo nhà cung cấp |
| `DB_USERNAME` | Username MySQL online |
| `DB_PASSWORD` | Password MySQL online |

4. Deploy. Flyway tự tạo schema theo migrations có sẵn trên database riêng trống. Không trỏ nhầm DB đang có dữ liệu hoặc import schema thủ công trước khi chạy Flyway.
5. Profile `prod,render` không tạo các tài khoản demo local hay hợp đồng demo. Đăng ký Reader/Business bằng giao diện; tài khoản quản lý cần được cấp qua quy trình quản trị riêng. Không bật profile `local` để lấy các tài khoản có mật khẩu công khai lên Internet.
6. Mở URL Render, kiểm tra `/actuator/health`, trang chủ, đăng nhập/đăng ký, refresh URL `/business/campaigns`. API bảo vệ vẫn phải từ chối người chưa đăng nhập.
7. RSS online mặc định tắt. Chỉ bật `NEWS_IMPORT_ENABLED=true` sau khi thống nhất dữ liệu nguồn và kiểm tra môi trường. Dữ liệu local không tự xuất hiện trong DB online.

## Lưu ý vận hành

- Bản Free ngủ sau 15 phút không có truy cập; không phải máy chủ chạy liên tục 24/24. Mở lại có độ trễ khởi động và phiên đăng nhập trong bộ nhớ có thể mất.
- RAM Free hạn chế; đã giới hạn heap theo RAM và pool DB 5 kết nối. Chưa đo tải/khởi động container thực tế.
- Cookie đăng nhập ở prod dùng HTTPS. Local vẫn chạy bằng `scripts/run-backend.ps1` và Vite như trước; không dùng profile prod cho HTTP local.
- Các nghiệp vụ chưa hoàn thiện không tự hoạt động chỉ vì deploy. Xem báo cáo Business để biết giới hạn.
- Docker image chưa được build/publish và Blueprint chưa được xác minh trên tài khoản Render. Cần MySQL online và thao tác tài khoản để hoàn thành deploy.

Tham khảo: https://render.com/docs/docker, https://render.com/docs/blueprint-spec, https://render.com/docs/free, https://render.com/docs/deploy-mysql
