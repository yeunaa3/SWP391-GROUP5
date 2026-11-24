import docx

sds_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_SDS.docx'
doc = docx.Document(sds_path)

# 1. Update Paragraphs 1, 3, 4, 6
doc.paragraphs[1].text = "Thiết kế chi tiết toàn bộ 9 luồng nghiệp vụ từ BF-01 đến BF-09"
doc.paragraphs[3].text = "Tài liệu tổng hợp chín bộ thiết kế theo thứ tự luồng nghiệp vụ chuẩn (BF-01 đến BF-09). Mỗi bộ gồm trách nhiệm class và method, Class Diagram, Sequence Diagram cùng điều kiện kiểm tra, nhánh lỗi và tác động dữ liệu. Các phần mô tả bám theo source code và sản phẩm web thực tế đang vận hành."
doc.paragraphs[4].text = "Sơ đồ dùng class và function component thực tế; các lời gọi được rút gọn tham số để dễ đọc. Spring JDBC, MySQL 8.4 (3NF 18 bảng, 23 Flyway migrations), browser và Cloudinary là thành phần tích hợp. Các chương đối chiếu source, database, quyền truy cập và kiểm thử được tập hợp sau BF-09."
doc.paragraphs[6].text = "Project root: c:/Users/Dumpling/Desktop/SWP391-GROUP5 (triển khai đám mây trên Render Cloud). Backend dùng Spring Security session cookie (HttpOnly JSESSIONID), AuthenticatedUserPrincipal và quyền method; không dùng JWT trong localStorage. Client apiRequest gửi credentials include và CSRF token (header X-CSRF-TOKEN) cho mọi mutation (POST/PUT/DELETE); webhook thanh toán PayOS HMAC-SHA256 và event quảng cáo thuộc các route được cấu hình ngoại lệ CSRF. Cơ sở dữ liệu MySQL 8.4 chuẩn 3NF gồm 18 bảng cốt lõi quản lý bằng 23 bản migrations Flyway (V1 đến V23). Lưu trữ hồ sơ doanh nghiệp và asset banner quảng cáo trên nền tảng Cloudinary."

# 2. Update Table 0 (Add row for BF 09)
t0 = doc.tables[0]
t0.rows[8].cells[0].text = "BF 08"
t0.rows[8].cells[1].text = "Deliver Ads and Real-Time Event Tracking"
t0.rows[8].cells[2].text = "Phân phối banner theo slot/targeting, ghi nhận Impression IAB (50% 1s), Click debounce 30s bucket và bảo vệ CSRF"

row_bf09 = t0.add_row()
row_bf09.cells[0].text = "BF 09"
row_bf09.cells[1].text = "Monitor Campaign Performance and Operational Management"
row_bf09.cells[2].text = "Bảng điều khiển KPI trực quan (CTR, View, Click, Spend), biểu đồ SVG, xuất CSV/PDF, toggle Tạm dừng/Tiếp tục (UC-39) và hoàn tất giải phóng slot tự động (JOB-06)"

# 3. Update Chapter 8 and 9
doc.paragraphs[217].text = "8 Deliver Ads and Real-Time Event Tracking (BF-08)"
doc.paragraphs[218].text = "BF 08 / PUB 01, PUB 03; UC 30, UC 31. Chọn banner quảng cáo đủ điều kiện theo vị trí slot, kiểm tra targeting (danh mục/tag/thiết bị/địa lý), phân phối tới độc giả trên trang chủ và trang đọc bài, ghi nhận hiển thị chuẩn IAB (50% diện tích trong tối thiểu 1 giây) và click với cơ chế debounce 30 giây."
doc.paragraphs[220].text = "8.1 Class Diagram - Deliver Ads and Event Tracking Engine"
doc.paragraphs[223].text = "8.2 Select and Display Eligible Banner (UC-30)"
doc.paragraphs[229].text = "8.3 Record Impression and Click (UC-31)"

# Chapter 9
doc.paragraphs[235].style = 'Heading 1'
doc.paragraphs[235].text = "9 Monitor Campaign Performance and Operational Management (BF-09)"
doc.paragraphs[236].text = "BF 09 / BUS 18–19, ADM 09–10; UC 32, UC 39, JOB-04, JOB-06. Cung cấp bảng điều khiển hiệu suất thời gian thực cho Doanh nghiệp và Ad Manager, trực quan hóa KPI (Lượt xem, Click, CTR, Chi phí), xuất báo cáo nghiệm thu CSV/PDF, hỗ trợ nút Tạm dừng khẩn cấp (PAUSE/RESUME) và chu trình hoàn tất chiến dịch, giải phóng slot tự động."

# Update UC-39 description
doc.paragraphs[239].text = "Xử lý Tạm dừng / Tiếp tục (UC-39): Endpoint POST /api/advertising/campaigns/{id}/toggle-status cho phép Ad Manager hoặc Doanh nghiệp đổi trạng thái tức thì giữa ACTIVE và PAUSED. Hệ thống cập nhật bảng ad_campaigns, ghi audit log kiểm toán và Ad Server ngừng/tiếp tục phân phối banner ngay lập tức. Trang PerformancePage và ActiveCampaignMonitorPage cung cấp nút toggle trạng thái kèm xác nhận thao tác."

# 9.2 Reconcile Metrics and Finalize Campaign
doc.paragraphs[241].text = "9.2 Reconcile Metrics and Finalize Campaign (JOB-04, JOB-06)"

# 4. Update Table 13 (Add row for BF 09)
t13 = doc.tables[13]
t13.rows[6].cells[0].text = "08"
t13.rows[6].cells[1].text = "Banner matching theo slot & targeting, delivery engine, raw ad_events, viewability IAB 50% 1s, debounce click 30s bucket, bảo vệ CSRF."
t13.rows[6].cells[2].text = "Ad-free thực thi tại giao diện độc giả dựa trên trạng thái gói; ghi nhận viewability phía client dựa trên Intersection Observer API."

row_t13_09 = t13.add_row()
row_t13_09.cells[0].text = "09"
row_t13_09.cells[1].text = "Performance dashboard, dynamic KPI cards (Impressions, Clicks, CTR, Spend), biểu đồ SVG, Share of Voice, xuất CSV/PDF, toggle Tạm dừng/Tiếp tục (UC-39), và job tự động hoàn tất giải phóng slot (JOB-06)."
row_t13_09.cells[2].text = "Toggle trạng thái ACTIVE <=> PAUSED cập nhật tức thì CSDL và đồng bộ Ad Server; job định kỳ quét giới hạn ngân sách và thời hạn hợp đồng để hoàn tất tự động."

# 5. Heading for Screen Mapping
doc.paragraphs[252].text = "Đối chiếu screen và source cho BF 05, BF 06, BF 07, BF 08, BF 09"

doc.save(sds_path)
print("Updated SDS successfully!")
