# ADM 01 02 03 Partnership Review

Phạm vi triển khai: BF-04, UC-19 và UC-20 theo SRS. Ba màn dùng dữ liệu MySQL thật và chỉ role `AD_MANAGER` được truy cập API.

## Luồng chính

1. Business lưu hồ sơ và tài liệu ở trạng thái nháp.
2. Khi gửi, backend tăng `application_version`, chụp thông tin công ty và danh sách tài liệu vào một phiên bản bất biến.
3. ADM-02 chỉ hiển thị `PENDING_REVIEW` và `RESUBMITTED`.
4. Ad Manager mở ADM-03, kiểm tra thông tin và tài liệu của đúng phiên bản rồi lưu ghi chú. Lưu ghi chú không đổi trạng thái.
5. Sau khi có ghi chú, Ad Manager chọn `APPROVED`, `REJECTED` hoặc `NEEDS_REVISION`.
6. Backend khóa bản ghi, kiểm tra lại version và trạng thái. Quyết định cũ, trùng hoặc sai version bị từ chối.
7. Quyết định được lưu vào `partnership_reviews`, ghi `audit_logs` và tạo thông báo in-app cùng email chờ gửi cho Business.

Phê duyệt chỉ thành công khi phiên bản hiện tại có ít nhất một tài liệu và mọi tệp đều còn mở được. Từ chối và yêu cầu sửa bắt buộc có lý do.

## API

- `GET /api/ad-manager/dashboard`: số hồ sơ hợp tác, booking, campaign, cảnh báo và hoạt động gần đây cho ADM-01.
- `GET /api/ad-manager/partnerships`: queue ADM-02. Bộ lọc gồm `q`, `status`, `priority`, `from`, `to`, `page`, `size`.
- `GET /api/ad-manager/partnerships/{companyId}`: snapshot, tài liệu, validation và lịch sử ADM-03.
- `PUT /api/ad-manager/partnerships/{companyId}/note`: lưu ghi chú cho `applicationVersion` hiện tại.
- `POST /api/ad-manager/partnerships/{companyId}/decision`: gửi quyết định cho `applicationVersion` hiện tại.

Ngày lọc được hiểu theo múi giờ Việt Nam. `page` bắt đầu từ 0, `size` từ 1 đến 100. Tìm kiếm dùng chuỗi literal nên `%` và `_` không trở thành ký tự đại diện SQL.

## Dữ liệu thử

Render demo giữ các doanh nghiệp `[TEST]` đã có. `business.pending.demo` có hồ sơ chờ xem xét nhưng không có tệp, dùng để thử validation chặn phê duyệt. `business.revision.demo` có thể sửa, tải tài liệu và gửi lại; sau đó hồ sơ xuất hiện ở ADM-02 dưới trạng thái `RESUBMITTED`.

Profile local tự tạo hai hồ sơ đọc thử: `DEMO-APP-002` ở `PENDING_REVIEW` và `DEMO-APP-003` ở `RESUBMITTED`. Đây là dữ liệu giả được đánh dấu rõ, không phải doanh nghiệp thật.

## Giới hạn

Hệ thống tạo bản ghi email ở trạng thái `PENDING`; dự án hiện chưa có worker gửi email thật. Priority được lưu trong database với ba mức `NORMAL`, `HIGH`, `URGENT`; hồ sơ gửi lại được đặt `HIGH`, hồ sơ mới mặc định `NORMAL`.
