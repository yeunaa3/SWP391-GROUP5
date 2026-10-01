# Hướng dẫn cấu trúc project

Project hiện chỉ có 5 phần chính cần quan tâm:

```text
SWP391-GROUP5/
├── frontend/       Giao diện React chạy trên trình duyệt
├── backend/        REST API Spring Boot và nghiệp vụ hệ thống
├── database/       ERD, SQL nháp và dữ liệu mẫu của nhóm
├── docs/           Tài liệu SRS, SDS và mô tả API
├── scripts/        Công cụ kiểm tra máy đã cài đủ phần mềm hay chưa
├── compose.yaml    Khởi động MySQL local bằng Docker
└── README.md       Cách cài và chạy toàn bộ project
```

## Trong frontend

- `src/pages`: mỗi file là một màn hình hoàn chỉnh trong Screen Inventory.
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
- `repository`: đọc và ghi dữ liệu MySQL bằng Spring Data JPA.
- `entity`: lớp Java ánh xạ với bảng MySQL.
- `dto`: dữ liệu request/response của REST API.
- `security`: đăng nhập và phân quyền.
- `integration`: kết nối Payment, Email và Cloud Storage/CDN.
- `scheduler`: job tự chạy theo lịch.
- `exception`: định dạng lỗi API thống nhất.
- `config`: cấu hình CORS và thành phần kỹ thuật.
- `util`: hàm kỹ thuật nhỏ dùng lại.

Quy tắc đi dữ liệu: `Controller -> Service -> Repository -> MySQL`. Không gọi Repository trực tiếp từ Controller.

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
