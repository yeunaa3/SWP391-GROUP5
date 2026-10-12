# Hướng dẫn cấu trúc project

Các thư mục cần tìm theo mục đích (không phải tất cả đều là source code):

```text
SWP391-GROUP5/
├── frontend/       Giao diện React chạy trên trình duyệt
├── backend/        REST API Spring Boot và nghiệp vụ hệ thống
├── database/       ERD, SQL nháp và dữ liệu mẫu của nhóm
├── docs/           Tài liệu SRS, SDS và mô tả API
├── scripts/        Công cụ kiểm tra máy đã cài đủ phần mềm hay chưa
├── deploy/         Cấu hình/chứng chỉ triển khai; không chứa logic màn hình
├── outputs/        Ảnh kiểm thử/tham chiếu, không phải source ứng dụng
├── compose.yaml    Khởi động MySQL local bằng Docker
└── README.md       Cách cài và chạy toàn bộ project
```

## Trong frontend

- `src/pages`: màn hình theo nhóm public, auth, premium, business; một số màn chưa triển khai riêng còn dùng ScreenWorkspacePage.
- `src/components`: nút, bảng, form, hộp thoại dùng lại ở nhiều màn hình.
- `src/layouts`: khung chung gồm header/sidebar cho từng nhóm người dùng.
- `src/routes`: địa chỉ trang và kiểm tra quyền truy cập.
- `src/services`: nơi React gọi REST API của Spring Boot.
- `src/hooks`: logic React có thể dùng lại.
- `src/store`: dữ liệu dùng chung giữa nhiều màn hình.
- `src/utils`: hàm nhỏ như định dạng ngày, tiền và kiểm tra file.
- `src/assets`: CSS, logo, icon và ảnh tĩnh của giao diện.
- `node_modules`: thư viện được `pnpm install` tải về; không sửa và không đẩy lên Git.

Khi mới code giao diện, thành viên chủ yếu làm việc trong `pages`, `components`, `layouts` và `services`.

## Trong backend

- `controller`: nhận request từ React và trả JSON.
- `service`: xử lý nghiệp vụ của use case/business flow.
- `repository`: hiện có UserRepository/RoleRepository dùng Spring Data JPA. Một số service nghiệp vụ vẫn gọi JdbcTemplate trực tiếp; chưa hoàn thành việc tách repository cho tất cả luồng.
- `entity`: lớp Java ánh xạ với bảng MySQL.
- `dto`: dữ liệu request/response của REST API.
- `security`: đăng nhập và phân quyền.
- `integration`: interface Payment, Email và Storage dự kiến kết nối sau; không đồng nghĩa đã có tích hợp thật.
- `scheduler`: package dự kiến tách job; RSS hiện chạy theo lịch trong RssImportService.
- `exception`: định dạng lỗi API thống nhất.
- `config`: cấu hình CORS và thành phần kỹ thuật.
- `util`: hàm kỹ thuật nhỏ dùng lại.

Kiến trúc mục tiêu: `Controller -> Service -> Repository -> MySQL`. Hiện trạng còn `Controller -> Service -> JdbcTemplate -> MySQL` ở các nghiệp vụ nội dung/Business. Không nên mô tả rằng đã hoàn toàn đạt kiến trúc mục tiêu.

## Tìm nhanh phần cần sửa

| Muốn sửa | Bắt đầu tại |
| --- | --- |
| Danh sách 53 màn hình, URL, BF/UC/role | `frontend/src/routes/screenCatalog.js` |
| Màn hình dùng component nào | `frontend/src/routes/AppRoutes.jsx` |
| Chọn gói, quyền lợi, checkout | `frontend/src/pages/premium/` |
| Tải gói Premium thật | `frontend/src/services/premiumService.js` và `frontend/src/hooks/usePremiumPlan.js` |
| Định dạng tiền/ngày Premium | `frontend/src/utils/premium.js` |
| QR tĩnh và thông tin nhận tiền | `frontend/src/data/paymentConfig.js`, `frontend/public/payments/` |
| Business: hồ sơ, booking, campaign | `frontend/src/pages/business/BusinessWorkspacePage.jsx` và backend `BusinessWorkspaceService` |
| Đăng nhập và đổi role | `frontend/src/store/AuthContext.jsx`, `frontend/src/utils/sessionRouting.js`, backend `security/` |
| Giao diện, chuyển động | `frontend/src/assets/`; thứ tự CSS chung ở `frontend/src/main.jsx` |
| Cấu trúc bảng đang áp dụng | `backend/src/main/resources/db/migration/` |

Các README một dòng trong src đã được gộp về hướng dẫn này. Không cần tạo một thư mục cho từng UC: UC là nghiệp vụ, màn hình là UI, service/repository có thể dùng chung.

## Những thư mục không đưa lên Git

- `frontend/node_modules`: thư viện cài trên máy.
- `frontend/dist`: kết quả build frontend.
- `backend/target`: kết quả build backend.
- `.pnpm-store`: cache tải thư viện.

Các thư mục này đều có thể tạo lại và đã được chặn trong `.gitignore`.

## Cách chạy ngắn gọn

1. MySQL phải chạy trước ở cổng `3306`.
2. Chạy backend: `powershell -ExecutionPolicy Bypass -File scripts/run-backend.ps1`.
3. Mở terminal khác và chạy frontend: `powershell -ExecutionPolicy Bypass -File scripts/run-frontend.ps1`.
4. Truy cập `http://localhost:5173`.

Hai script trên tự tìm Java, Maven và pnpm; bạn không cần nhớ đường dẫn dài.
