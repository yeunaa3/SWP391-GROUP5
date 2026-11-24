import docx

srs_path = r'C:\Users\Dumpling\Desktop\Document\Document\The_Pluse_SRS_Updated.docx'
doc = docx.Document(srs_path)

# Update paragraphs 195-203
doc.paragraphs[195].text = "1. Doanh nghiệp hoặc Ad Manager truy cập trang quản trị hiệu suất chiến dịch (PerformancePage / ActiveCampaignMonitor) - Điểm bắt đầu luồng giám sát."
doc.paragraphs[196].text = "2. Hệ thống truy vấn CSDL, tự động tổng hợp số liệu thực tế (Lượt hiển thị, Click, CTR, Tỷ trọng hiển thị và Chi phí phát sinh) và hiển thị bảng điều khiển trực quan với các thẻ KPI động cùng biểu đồ xu hướng SVG."
doc.paragraphs[197].text = "3. Người dùng theo dõi các chỉ số vận hành, lọc số liệu linh hoạt theo khoảng thời gian (7 ngày, 30 ngày, tất cả) hoặc theo từng chiến dịch cụ thể [BUS-18]."
doc.paragraphs[198].text = "4. Người dùng xuất báo cáo nghiệm thu chi tiết ra file CSV hoặc In / Xuất PDF có mã đối soát để phục vụ lưu trữ nội bộ hoặc thanh lý hợp đồng [UC-32]."
doc.paragraphs[199].text = "5. Khi có yêu cầu nghiệp vụ khẩn cấp (thay đổi thông điệp marketing hoặc sự cố kỹ thuật), người dùng bấm nút Tạm dừng (PAUSE) hoặc Kích hoạt lại (RESUME) chiến dịch [UC-39]."
doc.paragraphs[200].text = "6. Hệ thống cập nhật trạng thái chiến dịch trong CSDL (ACTIVE <-> PAUSED) theo thời gian thực, ghi nhật ký kiểm toán (Audit Log) và đồng bộ tức thì sang máy chủ Ad Server để dừng hoặc tiếp tục phân phối banner."
doc.paragraphs[201].text = "7. Scheduler định kỳ (JOB-06) kiểm tra giới hạn: khi chiến dịch hết hạn hợp đồng hoặc chạm ngưỡng ngân sách cam kết, hệ thống tự động chuyển trạng thái sang HOÀN THÀNH (COMPLETED)."
doc.paragraphs[202].text = "8. Hệ thống tự động giải phóng vị trí slot quảng cáo trên website để sẵn sàng cho các chiến dịch tiếp theo và gửi thông báo hoàn tất nghiệm thu thanh lý hợp đồng cho đối tác."
doc.paragraphs[203].text = "9. Đối với chiến dịch chưa đến kỳ kết thúc và ngân sách còn hiệu lực, hệ thống duy trì trạng thái ĐANG CHẠY (ACTIVE) để tiếp tục phân phối và kết thúc phiên giám sát."

doc.save(srs_path)
print("Updated SRS section 2.9 successfully!")
