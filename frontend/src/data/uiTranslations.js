// Exact UI translations. Keep identifiers, source article text and database values unchanged.
const pairs = `
My Account|Tài khoản của tôi
Premium Workspace|Không gian Premium
Business Portal|Cổng doanh nghiệp
Ad Manager Workspace|Quản lý quảng cáo
System Administration|Quản trị hệ thống
View account|Xem tài khoản
Business Dashboard|Tổng quan doanh nghiệp
Company Profile|Hồ sơ doanh nghiệp
Partnership Application|Đăng ký hợp tác
Partnership Application Status|Trạng thái đăng ký hợp tác
Advertising Price List|Bảng giá quảng cáo
Slot Availability Calendar|Lịch vị trí quảng cáo
Booking Request|Yêu cầu đặt quảng cáo
Booking and Contract Proposal|Đề xuất đặt chỗ và hợp đồng
Advertising Checkout|Thanh toán quảng cáo
Advertising Payment Result|Kết quả thanh toán quảng cáo
Contract List|Danh sách hợp đồng
Contract Detail and Invoice|Chi tiết hợp đồng và hóa đơn
Campaign List|Danh sách chiến dịch
Campaign Create and Edit|Tạo và chỉnh sửa chiến dịch
Creative and Targeting|Nội dung quảng cáo và nhắm đối tượng
Campaign Submission Review|Kiểm tra trước khi gửi duyệt
Campaign Status and Detail|Chi tiết và trạng thái chiến dịch
Campaign Performance Overview|Tổng quan hiệu quả chiến dịch
Campaign Metrics and Final Report|Số liệu và báo cáo chiến dịch
Ad Manager Dashboard|Tổng quan quản lý quảng cáo
Partnership Review Queue|Danh sách đăng ký chờ duyệt
Partnership Review Detail|Chi tiết xét duyệt hợp tác
Booking Review Queue|Danh sách đặt quảng cáo chờ duyệt
Booking Availability and Proposal|Kiểm tra vị trí và lập đề xuất
Contract Revision and Payment Status|Chỉnh sửa hợp đồng và trạng thái thanh toán
Campaign Review Queue|Danh sách chiến dịch chờ duyệt
Campaign and Creative Review|Duyệt chiến dịch và nội dung quảng cáo
Active Campaign Monitor|Theo dõi chiến dịch đang chạy
Advertising Performance Report|Báo cáo hiệu quả quảng cáo
Administration Dashboard|Tổng quan quản trị
User and Role Management|Quản lý người dùng và vai trò
Subscription Package Management|Quản lý gói Premium
Advertising Slot Management|Quản lý vị trí quảng cáo
B2B Package and Pricing Management|Quản lý gói quảng cáo và giá
System Settings|Cài đặt hệ thống
Profile and Security|Hồ sơ và bảo mật
Notification Center|Thông báo
Bookmarked Articles|Bài viết đã lưu
Subscription Packages|Các gói Premium
Package Detail|Chi tiết gói
Premium Checkout|Thanh toán Premium
Premium Payment Result|Kết quả thanh toán Premium
My Subscription|Gói đọc báo của tôi
Premium Transaction History|Lịch sử giao dịch Premium
Premium Receipt Detail|Chi tiết biên nhận Premium
Business Partnership|Hợp tác doanh nghiệp
Booking and Contract|Đặt quảng cáo và hợp đồng
Campaign|Chiến dịch
Campaign Performance|Hiệu quả chiến dịch
Ad Manager|Quản lý quảng cáo
Partnership Review|Xét duyệt hợp tác
Contract Review|Xét duyệt hợp đồng
Campaign Review|Xét duyệt chiến dịch
Campaign Operations|Vận hành chiến dịch
Administration|Quản trị
Account|Tài khoản
Premium Subscription|Đăng ký Premium
Records|Danh sách dữ liệu
Details|Thông tin chi tiết
Open details|Xem chi tiết
Apply|Áp dụng
Save draft|Lưu bản nháp
Save changes|Lưu thay đổi
Open selected|Mở mục đã chọn
Showing 3 sample records|Đang hiển thị 3 bản ghi mẫu
Search, filter and open an authorized record.|Tìm kiếm, lọc và xem dữ liệu trong quyền truy cập.
Fields and validation follow the SRS screen specification.|Điền các thông tin theo yêu cầu của biểu mẫu.
Manage personal settings and account activity.|Quản lý thông tin cá nhân và hoạt động tài khoản.
Review subscription, payment and entitlement information.|Xem gói đăng ký, thanh toán và quyền đọc báo.
Manage the company partnership, contracts, campaigns and performance.|Quản lý hợp tác, hợp đồng, chiến dịch và hiệu quả quảng cáo.
Review partnership, contract and campaign work submitted by businesses.|Xét duyệt hồ sơ hợp tác, hợp đồng và chiến dịch của doanh nghiệp.
Configure master data, access control and operational settings.|Quản lý dữ liệu cấu hình, quyền truy cập và vận hành.
Browse news and Premium coverage.|Khám phá tin tức và nội dung Premium.
Performance trend|Xu hướng hiệu quả
Daily values shown for the selected reporting period.|Số liệu từng ngày trong khoảng báo cáo đã chọn.
Last 30 days|30 ngày gần nhất
Last 7 days|7 ngày gần nhất
Attention required|Cần chú ý
records await review|bản ghi chờ duyệt
delivery warning|cảnh báo phân phối
payments pending|thanh toán đang chờ
Updated today|Cập nhật hôm nay
+8.4% this period|+8,4% trong kỳ này
Pending review|Chờ duyệt
Active|Đang hoạt động
Needs revision|Cần chỉnh sửa
Submitted record requiring review|Bản ghi đã gửi, đang chờ duyệt
Approved record with valid configuration|Bản ghi đã duyệt, cấu hình hợp lệ
Updated record awaiting confirmation|Bản ghi đã cập nhật, chờ xác nhận
Search and filters|Tìm kiếm và bộ lọc
Reference|Mã tham chiếu
Description|Mô tả
Status|Trạng thái
Application number|Mã đăng ký
Current status|Trạng thái hiện tại
Submitted time|Thời gian gửi
Review reason|Lý do xét duyệt
Fields requiring revision|Thông tin cần chỉnh sửa
Edit and resubmit|Chỉnh sửa và gửi lại
Partnership status|Trạng thái hợp tác
Active contracts|Hợp đồng đang hiệu lực
Active campaigns|Chiến dịch đang chạy
Impressions|Lượt hiển thị
Clicks|Lượt nhấp
CTR|Tỷ lệ nhấp (CTR)
Recent notices|Thông báo gần đây
Company name|Tên doanh nghiệp
Tax code|Mã số thuế
Industry|Ngành nghề
Billing address|Địa chỉ xuất hóa đơn
Contact person|Người liên hệ
Contact email|Email liên hệ
Phone number|Số điện thoại
Company summary|Giới thiệu doanh nghiệp
Advertising objective|Mục tiêu quảng cáo
Expected needs|Nhu cầu dự kiến
Document type|Loại tài liệu
Document upload|Tải tài liệu lên
Declaration|Cam kết
Submit application|Gửi hồ sơ
Slot position|Vị trí quảng cáo
Dimensions|Kích thước
Base price|Giá cơ bản
B2B package|Gói quảng cáo doanh nghiệp
Duration|Thời hạn
Impression quota|Hạn mức hiển thị
Availability shortcut|Xem lịch vị trí
Slot selector|Chọn vị trí
Month navigation|Chọn tháng
Availability calendar|Lịch vị trí trống
Status legend|Chú thích trạng thái
Start date|Ngày bắt đầu
End date|Ngày kết thúc
Continue|Tiếp tục
Selected slot|Vị trí đã chọn
Campaign requirement|Yêu cầu chiến dịch
Estimated amount|Chi phí dự kiến
Submit booking|Gửi yêu cầu đặt quảng cáo
Booking status|Trạng thái đặt chỗ
Slot and period|Vị trí và thời gian
Proposed amount|Giá đề xuất
Commercial terms|Điều khoản thương mại
Proposal expiry|Hạn đề xuất
Revision request|Yêu cầu chỉnh sửa
Accept proposal|Chấp nhận đề xuất
Contract code|Mã hợp đồng
Order summary|Tóm tắt đơn hàng
Payable amount|Số tiền cần thanh toán
Payment method|Phương thức thanh toán
Payment deadline|Hạn thanh toán
Pay|Thanh toán
Payment status|Trạng thái thanh toán
Transaction reference|Mã giao dịch
Amount|Số tiền
Processed time|Thời gian xử lý
Status filter|Lọc trạng thái
Contract period|Thời gian hợp đồng
Total amount|Tổng tiền
Contract status|Trạng thái hợp đồng
Contract summary|Tóm tắt hợp đồng
Linked campaigns|Chiến dịch liên quan
Invoice information|Thông tin hóa đơn
Download invoice|Tải hóa đơn
Create campaign|Tạo chiến dịch
Campaign code|Mã chiến dịch
Campaign name|Tên chiến dịch
Contract|Hợp đồng
Schedule|Lịch chạy
Review status|Trạng thái xét duyệt
Delivery status|Trạng thái phân phối
Active contract|Hợp đồng đang hiệu lực
Start time|Thời gian bắt đầu
End time|Thời gian kết thúc
Target URL|Đường dẫn đích
Creative file|Tệp quảng cáo
Creative preview|Xem trước quảng cáo
Creative type|Loại quảng cáo
Category|Chuyên mục
Tags|Thẻ
Geographic area|Khu vực địa lý
Device type|Loại thiết bị
Campaign summary|Tóm tắt chiến dịch
Contract check|Kiểm tra hợp đồng
Schedule check|Kiểm tra lịch chạy
Target URL check|Kiểm tra đường dẫn đích
Creative check|Kiểm tra nội dung quảng cáo
Targeting check|Kiểm tra đối tượng
Edit links|Chỉnh sửa thông tin
Submit for review|Gửi duyệt
Campaign status|Trạng thái chiến dịch
Approved creative|Nội dung quảng cáo đã duyệt
Slot and schedule|Vị trí và lịch chạy
Status timeline|Lịch sử trạng thái
Request creative change|Yêu cầu thay đổi quảng cáo
Campaign selector|Chọn chiến dịch
Date range|Khoảng thời gian
Quota progress|Tiến độ hạn mức
Daily trend|Xu hướng từng ngày
View daily report|Xem báo cáo từng ngày
Date filter|Lọc ngày
Daily impressions|Lượt hiển thị từng ngày
Daily clicks|Lượt nhấp từng ngày
Daily CTR|CTR từng ngày
Final totals|Tổng kết
Completion status|Trạng thái hoàn thành
Export report|Xuất báo cáo
Pending partnerships|Hồ sơ hợp tác chờ duyệt
Pending bookings|Yêu cầu đặt chỗ chờ duyệt
Pending campaigns|Chiến dịch chờ duyệt
Delivery alerts|Cảnh báo phân phối
Payment alerts|Cảnh báo thanh toán
Recent activity|Hoạt động gần đây
Company|Doanh nghiệp
Priority|Độ ưu tiên
Open review|Mở xét duyệt
Company information|Thông tin doanh nghiệp
Tax and contact information|Thông tin thuế và liên hệ
Application content|Nội dung đăng ký
Legal document preview|Xem tài liệu pháp lý
Validation summary|Kết quả kiểm tra
Decision|Quyết định
Reason|Lý do
Submit decision|Gửi quyết định
Booking number|Mã đặt chỗ
Slot|Vị trí
Requested period|Thời gian yêu cầu
Open booking|Mở yêu cầu đặt chỗ
Booking summary|Tóm tắt đặt chỗ
Conflict list|Danh sách trùng lịch
Calculated price|Giá đã tính
Send proposal|Gửi đề xuất
Requested revision|Nội dung yêu cầu chỉnh sửa
Manager response|Phản hồi của quản lý
Revision status|Trạng thái chỉnh sửa
Reminder|Nhắc nhở
Close booking|Đóng yêu cầu đặt chỗ
Creative status|Trạng thái nội dung quảng cáo
Campaign and contract summary|Tóm tắt chiến dịch và hợp đồng
Schedule and slot|Lịch chạy và vị trí
Targeting summary|Tóm tắt đối tượng
Technical checks|Kiểm tra kỹ thuật
Last delivery|Lần phân phối gần nhất
Operational alert|Cảnh báo vận hành
Company and campaign filters|Lọc doanh nghiệp và chiến dịch
Delivery trend|Xu hướng phân phối
Campaign comparison|So sánh chiến dịch
Active users|Người dùng đang hoạt động
Active Premium packages|Gói Premium đang hoạt động
Active ad slots|Vị trí quảng cáo đang hoạt động
Active B2B packages|Gói quảng cáo đang hoạt động
Failed jobs|Tác vụ lỗi
System warnings|Cảnh báo hệ thống
Recent administration activity|Hoạt động quản trị gần đây
User identity|Thông tin người dùng
Email|Email
Role|Vai trò
Account status|Trạng thái tài khoản
Permissions|Quyền truy cập
Package code|Mã gói
Package name|Tên gói
Price|Giá
Duration days|Thời hạn (ngày)
Benefits|Quyền lợi
Display priority|Thứ tự hiển thị
Save package|Lưu gói
Slot code|Mã vị trí
Slot name|Tên vị trí
Position|Vị trí
Width|Chiều rộng
Height|Chiều cao
Save slot|Lưu vị trí
Setting group|Nhóm cài đặt
Setting name|Tên cài đặt
Setting value|Giá trị cài đặt
Last updated by|Người cập nhật gần nhất
Full name|Họ và tên
Current password|Mật khẩu hiện tại
New password|Mật khẩu mới
Confirm new password|Xác nhận mật khẩu mới
Unread filter|Lọc chưa đọc
Notification type|Loại thông báo
Notification message|Nội dung thông báo
Created time|Thời gian tạo
Read status|Trạng thái đã đọc
Related-record|Bản ghi liên quan
Article title|Tiêu đề bài viết
Saved time|Thời gian lưu
Premium label|Nhãn Premium
Open article|Mở bài viết
Remove bookmark|Bỏ lưu bài viết
Current-package label|Gói đang dùng
View-details|Xem chi tiết
Renewal terms|Điều khoản gia hạn
Continue-to-checkout|Tiếp tục thanh toán
Selected package|Gói đã chọn
Billing summary|Tóm tắt thanh toán
Terms confirmation|Xác nhận điều khoản
Cancel|Hủy
Retry or continue|Thử lại hoặc tiếp tục
Current package|Gói hiện tại
Subscription status|Trạng thái đăng ký
Renewal status|Trạng thái gia hạn
Renew|Gia hạn
Transaction-history|Lịch sử giao dịch
Package|Gói
Receipt|Biên nhận
Receipt number|Mã biên nhận
Payment time|Thời gian thanh toán
Download receipt|Tải biên nhận
I confirm this information is correct.|Tôi xác nhận thông tin này là chính xác.
`;
export const uiTranslations = Object.fromEntries(pairs.trim().split('\n').map(line => line.split('|')));
export function translateUi(text, language) {
  if (language !== 'vi' || typeof text !== 'string') return text;
  if (uiTranslations[text]) return uiTranslations[text];
  const plain = text.replace(/ button| link| action/gi, '');
  return uiTranslations[plain] || text;
}
