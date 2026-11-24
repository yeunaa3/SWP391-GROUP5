# -*- coding: utf-8 -*-
import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

ARTIFACT_DIR = r"C:\Users\Dumpling\.gemini\antigravity\brain\25cb898c-114c-4530-8b6d-6378a1bc26ef"
OUTPUT_DESKTOP = r"C:\Users\Dumpling\Desktop\The_Pluse_Bai_Thuyet_Trinh_Nhom_SWP391.docx"
OUTPUT_DOCS = r"C:\Users\Dumpling\Desktop\SWP391-GROUP5\docs\BAI_THUYET_TRINH_THE_PLUSE_SWP391.docx"

def set_cell_background(cell, fill_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=80, bottom=80, left=120, right=120):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = parse_xml(f'<{m} {nsdecls("w")} w:w="{val}" w:type="dxa"/>')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_header_p(doc, text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold = True
    run.font.name = 'Arial'
    
    if level == 1:
        run.font.size = Pt(16)
        run.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A) # Deep Navy
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
    elif level == 2:
        run.font.size = Pt(13)
        run.font.color.rgb = RGBColor(0x1D, 0x4E, 0xD8) # Royal Blue
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
    elif level == 3:
        run.font.size = Pt(11.5)
        run.font.color.rgb = RGBColor(0x0F, 0x76, 0x6E) # Teal
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
    return p

def add_callout(doc, text, speaker="DIỄN GIẢ"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="1E3A8A"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    run_spk = p.add_run(f"🎤 LỜI THOẠI {speaker}:\n")
    run_spk.bold = True
    run_spk.font.name = "Arial"
    run_spk.font.size = Pt(10)
    run_spk.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
    
    run_txt = p.add_run(text)
    run_txt.italic = True
    run_txt.font.name = "Arial"
    run_txt.font.size = Pt(9.5)
    run_txt.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)
    
    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_after = Pt(4)

def format_table(tbl, col_widths, headers, data):
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    hdr_cells = tbl.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "1E3A8A")
        set_cell_margins(hdr_cells[i], top=80, bottom=80, left=100, right=100)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in p.runs:
            run.font.bold = True
            run.font.name = "Arial"
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            
    for r_idx, row_data in enumerate(data):
        row_cells = tbl.add_row().cells
        bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, cell_value in enumerate(row_data):
            row_cells[c_idx].text = cell_value
            set_cell_background(row_cells[c_idx], bg_color)
            set_cell_margins(row_cells[c_idx], top=60, bottom=60, left=100, right=100)
            p = row_cells[c_idx].paragraphs[0]
            for run in p.runs:
                run.font.name = "Arial"
                run.font.size = Pt(9.0)
                run.font.color.rgb = RGBColor(0x2D, 0x37, 0x48)
                
    for row in tbl.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = Inches(width)

    tblPr = tbl._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
            <w:left w:val="none"/>
            <w:bottom w:val="single" w:sz="8" w:space="0" w:color="94A3B8"/>
            <w:right w:val="none"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)

def build_presentation_docx():
    doc = Document()
    
    # Margin setup
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        s.page_width = Inches(8.5)
        s.page_height = Inches(11.0)
        
    normal = doc.styles['Normal']
    normal.font.name = 'Arial'
    normal.font.size = Pt(10)
    normal.font.color.rgb = RGBColor(0x37, 0x41, 0x51)
    normal.paragraph_format.line_spacing = 1.2
    normal.paragraph_format.space_after = Pt(5)

    # ------------------ COVER / TITLE ------------------
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_uni = p_title.add_run("TRƯỜNG ĐẠI HỌC FPT — KHOA CÔNG NGHỆ THÔNG TIN\n")
    r_uni.bold = True
    r_uni.font.size = Pt(12)
    r_uni.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
    
    r_main = p_title.add_run("KỊCH BẢN THUYẾT TRÌNH BẢO VỆ ĐỒ ÁN TOÀN DIỆN (SWP391)\n")
    r_main.bold = True
    r_main.font.size = Pt(18)
    r_main.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
    
    r_sub = p_title.add_run("HỆ THỐNG QUẢN LÝ BÁO CHÍ ĐIỆN TỬ & QUẢNG CÁO DOANH NGHIỆP THỜI GIAN THỰC\n<< THE PLUSE — GROUP 5 (SE2066-GAME) >>\n")
    r_sub.bold = True
    r_sub.font.size = Pt(13)
    r_sub.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)
    
    # Meta Box
    tbl_meta = doc.add_table(rows=1, cols=1)
    tbl_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_meta.columns[0].width = Inches(6.9)
    c_meta = tbl_meta.cell(0, 0)
    set_cell_background(c_meta, "F1F5F9")
    set_cell_margins(c_meta, top=100, bottom=100, left=150, right=150)
    p_m = c_meta.paragraphs[0]
    p_m.paragraph_format.line_spacing = 1.15
    p_m.add_run("• Giảng viên hướng dẫn: Thầy Bùi Đình Chiến\n").bold = True
    p_m.add_run("• Thành viên nhóm thực hiện:\n").bold = True
    p_m.add_run("  1. Bùi Quang Cường (Team Leader / Fullstack): Chịu trách nhiệm kiến trúc, BF-01 (Premium VietQR PayOS), BF-08 (Ad Serving, IAB Viewable Impression, Anti-fraud Debounce 2s), BF-09 (Performance Dashboard & Pause/Resume).\n")
    p_m.add_run("  2. Nguyễn Trung Nhật (Fullstack Developer): BF-03 (Nộp hồ sơ B2B & GPKD Cloudinary), BF-05 (Đặt slot quảng cáo & Hợp đồng B2B), Cấu hình bảng giá & slot.\n")
    p_m.add_run("  3. Tạ Quốc Việt (Fullstack Developer): BF-02 (Đọc báo & Server-side Paywall Truncation), BF-04 (Thẩm định hồ sơ đối tác), BF-06 (Tạo campaign & Upload banner), BF-07 (Kiểm duyệt banner Live Preview).\n")
    p_m.add_run("• Triển khai chính thức: ").bold = True
    p_m.add_run("Online Cloud Render (Web: https://swp391-group5-71mj.onrender.com | DB: Aiven MySQL 8.4) & Localhost (Port 8080 | MySQL 8.4 local).")

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ------------------ PHẦN 1 ------------------
    add_header_p(doc, "PHẦN 1: BỐI CẢNH NGHIỆP VỤ TÒA SOẠN & GIỚI THIỆU SẢN PHẨM", level=1)
    
    add_header_p(doc, "1.1 Khủng hoảng của Báo chí Truyền thống (The Problem & Industry Shift)", level=2)
    p = doc.add_paragraph()
    p.add_run("Trong kỷ nguyên số, các tòa soạn báo điện tử đang đối mặt với bài toán sống còn về mô hình tài chính:\n")
    p.add_run("1. Nạn chặn quảng cáo (AdBlock): ").bold = True
    p.add_run("Hơn 40% độc giả cài tiện ích chặn quảng cáo do quá mệt mỏi với các biểu ngữ nhấp nháy, pop-up che chữ và quảng cáo rác.\n")
    p.add_run("2. Phụ thuộc và bị ép giá bởi Mạng quảng cáo trung gian (Google AdSense, Ad Networks): ").bold = True
    p.add_run("Các nền tảng trung gian giữ lại từ 30% đến 40% doanh thu hoa hồng, trả về cho tòa soạn đơn giá CPM rất rẻ mạt, khiến tòa soạn không đủ chi phí duy trì đội ngũ phóng viên chất lượng cao.\n")
    p.add_run("3. Nạn sao chép tin tức & Đọc lướt (Free Riding): ").bold = True
    p.add_run("Nội dung báo chí chất lượng cao bị các trang tin lậu cào dữ liệu (crawl) tự động, độc giả đọc miễn phí không đem lại doanh thu bền vững.")

    add_header_p(doc, "1.2 Giải pháp Đột phá của The Pluse — Mô hình Doanh thu Kép (Dual-Revenue Engine)", level=2)
    p = doc.add_paragraph()
    p.add_run("The Pluse giải quyết triệt để cuộc khủng hoảng trên bằng cách trao cho Tòa soạn quyền tự chủ kinh tế tuyệt đối thông qua 2 Trụ cột cốt lõi:\n")
    p.add_run("• Trụ cột 1 — B2C (Độc giả / Reader Revenue - Paywall Đa tầng): ").bold = True
    p.add_run("Chuyển dịch từ việc 'câu view giật gân' sang bán nội dung chuyên sâu có bản quyền. Độc giả miễn phí được đọc bản Tóm tắt AI (Summary) và 20% đoạn mở đầu; Hội viên trả phí (The Pluse Premium) được mở khóa 100% bài viết đầy đủ, nghe Audio AI Podcast và tắt sạch 100% quảng cáo.\n")
    p.add_run("• Trụ cột 2 — B2B (Quảng cáo Trực tiếp / Direct Ad Server Operations): ").bold = True
    p.add_run("Tòa soạn tự xây dựng và vận hành máy chủ quảng cáo (Ad Server) nội bộ, ký kết hợp đồng trực tiếp với Doanh nghiệp đặt banner độc quyền (Homepage Hero, Article Sidebar), giữ trọn 100% doanh thu không chia sẻ cho trung gian, thanh toán tự động qua VietQR Napas 24/7 và cam kết đo lường số liệu thật theo chuẩn quốc tế IAB.")

    add_callout(doc, 
        "Kính thưa Thầy Cô và Hội đồng! Em xin đại diện Nhóm 5 trình bày đồ án The Pluse. Xuất phát từ thực tế các tòa soạn báo điện tử hiện nay đang bị sụt giảm doanh thu nghiêm trọng do độc giả dùng AdBlock và các mạng trung gian như Google AdSense cắt phế tới 40%, nhóm em đã phát triển nền tảng The Pluse với Mô hình Doanh thu Kép độc lập: Trụ cột thứ nhất là thu phí bạn đọc Premium qua cổng VietQR tự động để độc giả thưởng thức nội dung chuyên sâu sạch bóng quảng cáo; Trụ cột thứ hai là trao cho tòa soạn một Ad Server nội bộ để tự kết nối doanh nghiệp B2B, quản lý slot quảng cáo độc quyền và đo đếm từng lượt xem, lượt click thật 100% theo chuẩn quốc tế IAB. Sau đây, nhóm em xin trình bày chi tiết về kiến trúc công nghệ và 9 luồng nghiệp vụ của hệ thống.",
        speaker="TRƯỞNG NHÓM (MC)"
    )

    # ------------------ PHẦN 2 ------------------
    add_header_p(doc, "PHẦN 2: KIẾN TRÚC HỆ THỐNG & GIẢI MÃ CÔNG NGHỆ CHUYÊN SÂU", level=1)

    add_header_p(doc, "2.1 Ngăn xếp Công nghệ Hiện đại (Tech Stack)", level=2)
    tech_headers = ["Thành phần", "Công nghệ sử dụng", "Lý do lựa chọn & Giá trị mang lại"]
    tech_data = [
        ["Frontend UI", "React 18 SPA + Vite 5, TailwindCSS", "Ứng dụng web 1 trang tải siêu tốc, cơ chế HMR cập nhật tức thì khi code, Virtual DOM tối ưu render giao diện mượt mà không chớp giật."],
        ["Backend Core", "Java 17, Spring Boot 3, Spring Security", "Khung ứng dụng chuẩn doanh nghiệp, tính bảo mật cao, kiến trúc Stateless JWT phân quyền RBAC 5 vai trò chặt chẽ."],
        ["Cơ sở dữ liệu", "MySQL 8.4 chuẩn ACID, Flyway Migration", "Đảm bảo tính toàn vẹn dữ liệu tài chính (thanh toán gói, hợp đồng B2B), Flyway quản lý 23 phiên bản CSDL đồng bộ tự động 100% giữa Local và Cloud Aiven."],
        ["Cloud Storage", "Cloudinary Media CDN", "Lưu trữ tài liệu pháp lý GPKD và biểu ngữ quảng cáo đa kích thước trên mạng phân phối nội dung CDN an toàn, tải siêu nhanh."],
        ["Cổng thanh toán", "VietQR Napas 24/7 (PayOS Gateway)", "Tạo mã QR chuyển khoản động kèm đồng hồ đếm lùi 5 phút, xác thực Webhook IPN bằng chữ ký điện tử HMAC-SHA256, tự động kích hoạt tài khoản 24/7."]
    ]
    tbl_tech = doc.add_table(rows=1, cols=3)
    format_table(tbl_tech, [1.3, 1.8, 3.8], tech_headers, tech_data)

    add_header_p(doc, "2.2 Bảng Tra cứu Toàn bộ Thuật ngữ & Từ Viết tắt Kỹ thuật", level=2)
    glossary_headers = ["Thuật ngữ", "Tên đầy đủ", "Bản chất kỹ thuật & Ứng dụng trong The Pluse"]
    glossary_data = [
        ["SPA", "Single Page Application", "Ứng dụng web một trang. Trình duyệt tải 1 file HTML duy nhất lúc đầu; khi chuyển trang React vẽ lại giao diện bằng JavaScript mà không tải lại toàn bộ trang (No Full Page Reload), mượt như app di động."],
        ["HMR", "Hot Module Replacement", "Cơ chế cập nhật nóng module của Vite. Khi lập trình viên sửa code và lưu file, chỉ riêng component đó được nạp lại trong vài mili-giây mà không làm mất trạng thái (state) hiện tại của trang."],
        ["ACID", "Atomicity, Consistency, Isolation, Durability", "4 đặc tính vàng của MySQL: Nguyên tử (All-or-Nothing trong thanh toán), Nhất quán (ràng buộc khóa ngoại), Cô lập (chống tranh chấp đặt trùng slot quảng cáo), Bền vững (commit dữ liệu vĩnh viễn)."],
        ["RBAC", "Role-Based Access Control", "Kiểm soát truy cập dựa trên vai trò. Hệ thống chia 5 vai trò (Guest, Subscriber, Business, Ad Manager, Admin), bảo vệ nghiêm ngặt bằng @PreAuthorize ở backend."],
        ["CSRF", "Cross-Site Request Forgery", "Tấn công giả mạo yêu cầu từ website khác. The Pluse miễn nhiễm tự nhiên với CSRF vì dùng kiến trúc Stateless JWT (Bearer Token qua HTTP Header), không dùng Cookie lưu session."],
        ["XSS", "Cross-Site Scripting", "Tấn công tiêm mã JavaScript độc hại. React tự động HTML-escape tất cả dữ liệu biến trước khi render, triệt tiêu hoàn toàn nguy cơ thực thi mã độc trên trình duyệt."],
        ["Virtual DOM", "Virtual Document Object Model", "Mô hình DOM ảo trong RAM của React. Khi dữ liệu thay đổi, React dùng thuật toán Diffing so sánh DOM ảo và chỉ cập nhật đúng phần tử thay đổi trên DOM thật, tối ưu CPU."],
        ["RESTful API", "REST Architecture API", "Chuẩn giao tiếp HTTP giữa React và Spring Boot với dữ liệu JSON, đúng ngữ nghĩa HTTP Verbs (GET, POST, PUT, PATCH, DELETE) và mã phản hồi chuẩn (200, 201, 400, 401, 403, 409)."],
        ["Debounce", "Anti-fraud Click Debounce", "Kỹ thuật giới hạn tần suất. Khóa đệm 2 giây giữa các lần click banner, chặn đứng hành vi spam click vô tình hoặc click tặc để đảm bảo tỷ lệ CTR phản ánh 100% người dùng thật."],
        ["HMAC", "Hash-based Message Auth Code", "Mã xác thực tin nhắn dựa trên hàm băm mật mã học (SHA-256) và khóa bí mật. Dùng để xác thực tính toàn vẹn của Webhook PayOS bắn sang khi người dùng quét mã VietQR thành công."],
        ["IAB", "Interactive Advertising Bureau", "Tổ chức tiêu chuẩn quảng cáo số quốc tế. Quy định chuẩn Viewable Impression: Banner chỉ tính 1 lượt xem khi hiển thị tối thiểu >= 50% diện tích màn hình trong tối thiểu >= 1 giây liên tục."]
    ]
    tbl_glo = doc.add_table(rows=1, cols=3)
    format_table(tbl_glo, [1.0, 1.8, 4.1], glossary_headers, glossary_data)

    add_header_p(doc, "2.3 Cơ chế Kỹ thuật Trọng điểm Cần Nắm Vững", level=2)
    p = doc.add_paragraph()
    p.add_run("1. Cơ chế Cắt ngắn Nội dung Server-side (Server-side Paywall Truncation & Field Masking):\n").bold = True
    p.add_run("Khi người dùng gọi API lấy bài viết: Nếu chưa mua gói Premium, Backend chủ động cắt ngắn chuỗi `content` chỉ để lại bản tóm tắt AI `summary` và 20% đoạn mở đầu, đồng thời gán `audioUrl = null` và `isPaywalled = true`. Dù người dùng có mở F12 (Inspect Element) hay soi Network tab thì toàn văn bài viết hoàn toàn không tồn tại trong gói tin gửi về máy khách.\n\n")
    p.add_run("2. Cơ chế Quản lý CSDL Tự động với Flyway (V1 - V23):\n").bold = True
    p.add_run("Tương tự như Git quản lý phiên bản source code, Flyway quản lý 23 kịch bản di chuyển cấu trúc CSDL từ V1 đến V23. Mỗi khi backend khởi động, Flyway so sánh lịch sử trong bảng `flyway_schema_history` và tự động áp dụng các kịch bản chưa chạy, bảo đảm CSDL cục bộ của mọi lập trình viên và CSDL đám mây Aiven luôn đồng bộ cấu trúc 100%.\n\n")
    p.add_run("3. Nơi Lưu trữ Dữ liệu & Lưu trữ Ảnh:\n").bold = True
    p.add_run("• CSDL Online: Dùng Aiven Cloud MySQL 8.4 kết nối an toàn qua chứng chỉ SSL/TLS CA. CSDL Offline: Dùng MySQL 8.4 Server cục bộ (Port 3306).\n")
    p.add_run("• Nơi Lưu File/Ảnh Online: Dùng Cloudinary CDN lưu trữ giấy phép kinh doanh và banner quảng cáo; Bản Offline lưu tại thư mục cục bộ `storage/business`.")

    # ------------------ PHẦN 3 ------------------
    add_header_p(doc, "PHẦN 3: PHÂN TÍCH 4 PHÂN HỆ VÀ 5 NHÓM NGƯỜI DÙNG (ACTOR)", level=1)
    
    actor_headers = ["Nhóm Actor", "Vai trò & Phạm vi Quyền hạn", "Chức năng Nghiệp vụ Cốt lõi"]
    actor_data = [
        ["Guest (Độc giả Vãng lai)", "Người dùng chưa đăng nhập hệ thống", "Đọc tin tức miễn phí kèm quảng cáo chất lượng cao, xem tóm tắt AI và đoạn mở đầu 20% bài Premium, xem bảng giá gói hội viên."],
        ["Subscriber (Hội viên VIP)", "Độc giả có gói Premium còn hiệu lực", "Mở khóa 100% toàn văn bài báo chuyên sâu, nghe bài viết bằng Audio AI tùy chỉnh tốc độ, hệ thống tự động ẩn hoàn toàn 100% mọi khung quảng cáo."],
        ["Business Partner (Doanh nghiệp B2B)", "Đối tác quảng cáo đã xác minh", "Nộp hồ sơ pháp lý & GPKD lên Cloudinary, tra cứu lịch trống slot theo ngày, thương thảo hợp đồng, thanh toán VietQR, tạo chiến dịch và upload banner SVG/PNG/MP4, xem Dashboard CTR thời gian thực."],
        ["Ad Manager (Quản lý Quảng cáo)", "Trưởng ban vận hành quảng cáo tòa soạn", "Thẩm định hồ sơ đối tác (Duyệt / Yêu cầu sửa / Từ chối), soạn và gửi đề xuất hợp đồng, kiểm duyệt banner qua tính năng Live Preview, điều hành khẩn cấp Tạm dừng (PAUSE) hoặc Tiếp tục (RESUME) chiến dịch."],
        ["Administrator (Quản trị Hệ thống)", "Quản trị viên kỹ thuật cao nhất", "Quản lý tài khoản và phân quyền RBAC 5 vai trò, cấu hình bảng giá gói Premium và giá slot quảng cáo, giám sát nhật ký an ninh Audit Trail, đối soát giao dịch ngân hàng xử lý ngoại lệ."]
    ]
    tbl_actor = doc.add_table(rows=1, cols=3)
    format_table(tbl_actor, [1.3, 1.8, 3.8], actor_headers, actor_data)

    # ------------------ PHẦN 4 ------------------
    add_header_p(doc, "PHẦN 4: LỜI THOẠI THUYẾT TRÌNH CHI TIẾT 9 SƠ ĐỒ SWIMLANE (BF-01 ĐẾN BF-09)", level=1)

    flows = [
        {
            "code": "BF-01",
            "name": "Mua hoặc Gia hạn gói đọc báo Premium",
            "lanes": "Độc giả / Hội viên | Hệ thống The Pluse | Cổng thanh toán VietQR PayOS | Quản trị viên Admin | Dịch vụ Email",
            "goal": "Độc giả mua gói Premium tự động qua Napas VietQR 24/7, kích hoạt quyền đọc báo không quảng cáo; có nhánh xử lý ngoại lệ cho Admin đối soát khi chuyển khoản sai tiền.",
            "speech": "Kính thưa Thầy Cô, sơ đồ Swimlane BF-01 bắt đầu tại Làn 1 khi Độc giả truy cập trang Bảng giá và lựa chọn gói Premium mong muốn. Hệ thống tại Làn 2 sẽ truy vấn bảng subscription_packages để hiển thị rõ giá tiền, thời hạn và quyền lợi. Khi độc giả bấm Xác nhận thanh toán, hệ thống tạo đơn hàng ở trạng thái PENDING và gọi cổng PayOS tại Làn 3 để sinh mã quét Napas VietQR động kèm đồng hồ đếm lùi 5 phút. Độc giả dùng app ngân hàng quét mã và hoàn tất chuyển khoản. Ngay khi nhận được tiền, PayOS bắn Webhook IPN về cho hệ thống. Hệ thống tiếp nhận, xác thực chữ ký điện tử HMAC-SHA256 chuẩn mật mã học: nếu hợp lệ, hệ thống chuyển đơn hàng sang PAID, cộng hạn Premium vào bảng users, gửi email hóa đơn và lập tức mở khóa toàn văn bài báo sạch bóng quảng cáo. Nếu độc giả chuyển sai cú pháp, đơn chuyển sang Làn 4 để Admin đối soát sao kê và kích hoạt thủ công.",
            "img": os.path.join(ARTIFACT_DIR, "The_Pluse_BF01_Swimlane_Diagram.png")
        },
        {
            "code": "BF-02",
            "name": "Truy cập & Đọc nội dung bài viết (Kiểm soát Paywall)",
            "lanes": "Độc giả / Hội viên | Hệ thống The Pluse Engine | Cơ sở dữ liệu CSDL",
            "goal": "Phân tầng trải nghiệm đọc báo: Cắt ngắn nội dung 20% khi chưa có gói và mở khóa 100% toàn văn kèm Audio AI khi là Hội viên Premium.",
            "speech": "Tại sơ đồ BF-02, khi Độc giả bấm vào một bài viết có gắn nhãn PREMIUM trên trang chủ, yêu cầu gửi về Backend tại Làn 2. Middleware tiến hành giải mã JWT Token để kiểm tra hạn dùng Premium: Nếu người dùng là Hội viên hợp lệ, Backend truy vấn CSDL tại Làn 3 lấy 100% toàn văn bài báo gốc cùng link Audio AI và ra lệnh cho Frontend ẩn sạch 100% các khung banner quảng cáo. Ngược lại, nếu là độc giả miễn phí hoặc chưa đăng nhập, Backend kích hoạt cơ chế Server-side Truncation: cắt ngắn nội dung chỉ để lại phần Tóm tắt AI thông minh và 20% đoạn mở đầu, đồng thời hiển thị Thẻ Paywall mời nâng cấp gói. Khi độc giả bấm nâng cấp, hệ thống điều hướng trực tiếp sang luồng thanh toán BF-01.",
            "img": os.path.join(ARTIFACT_DIR, "The_Pluse_BF02_Swimlane_Diagram.png")
        },
        {
            "code": "BF-03",
            "name": "Nộp hồ sơ Đối tác Doanh nghiệp B2B (Đăng ký & Pháp lý)",
            "lanes": "Doanh nghiệp (Business) | Hệ thống The Pluse Engine | Kho lưu trữ Cloudinary & CSDL",
            "goal": "Thu thập hồ sơ năng lực pháp lý của doanh nghiệp quảng cáo, tải giấy phép kinh doanh lên Cloudinary CDN và thiết lập phiên bản hồ sơ.",
            "speech": "Luồng BF-03 bắt đầu khi đại diện Doanh nghiệp mở form đăng ký đối tác tại Làn 1, điền Mã số thuế, tên công ty, địa chỉ và tải lên Giấy phép kinh doanh dạng ảnh hoặc PDF. Hệ thống tại Làn 2 tiến hành kiểm tra tính hợp lệ: định dạng MST chuẩn, email công vụ và tệp đính kèm dưới 8MB. Nếu hợp lệ, hệ thống tải tài liệu lên Cloudinary CDN tại Làn 3, lưu thông tin vào bảng companies, tạo bản ghi phiên bản trong company_application_versions với trạng thái PENDING_REVIEW và đẩy hồ sơ vào hàng đợi xét duyệt của Ad Manager.",
            "img": os.path.join(ARTIFACT_DIR, "The_Pluse_BF03_Swimlane_Diagram.png")
        },
        {
            "code": "BF-04",
            "name": "Thẩm định & Phê duyệt hồ sơ Đối tác Doanh nghiệp",
            "lanes": "Quản lý quảng cáo (Ad Manager) | Hệ thống The Pluse Engine | Doanh nghiệp B2B | Dịch vụ Email",
            "goal": "Bảo đảm tính minh bạch và an toàn pháp lý của đối tác quảng cáo, phân luồng 3 quyết định thẩm định rõ ràng.",
            "speech": "Tại sơ đồ BF-04, Ad Manager mở danh sách hồ sơ chờ duyệt tại Làn 1, kiểm tra thông tin doanh nghiệp và xem trực tiếp bản scan GPKD. Tại đây có 3 ngã rẽ: Thứ nhất, nếu hồ sơ chuẩn chỉ, Ad Manager bấm PHÊ DUYỆT (APPROVED) -> Hệ thống mở quyền truy cập B2B Portal ở Làn 3 và gửi email chúc mừng ở Làn 4. Thứ hai, nếu giấy phép bị mờ hoặc thiếu dấu mộc, Ad Manager bấm YÊU CẦU SỬA ĐỔI (NEEDS_REVISION) kèm lý do -> Hệ thống chuyển trạng thái để doanh nghiệp nộp lại bản sửa đổi. Thứ ba, nếu phát hiện doanh nghiệp ma hoặc vi phạm pháp luật, Ad Manager bấm TỪ CHỐI (REJECTED) và hệ thống gửi thông báo nêu rõ căn cứ từ chối.",
            "img": os.path.join(ARTIFACT_DIR, "The_Pluse_BF04_Swimlane_Diagram.png")
        },
        {
            "code": "BF-05",
            "name": "Đặt slot quảng cáo & Ký kết hợp đồng B2B",
            "lanes": "Doanh nghiệp (Business) | Hệ thống The Pluse Engine | Quản lý quảng cáo (Ad Manager) | Cổng thanh toán VietQR",
            "goal": "Tra cứu lịch trống vị trí quảng cáo theo ngày, thương thảo hợp đồng, kích hoạt cơ chế khóa giữ chỗ tạm thời và thanh toán hợp đồng.",
            "speech": "Ở sơ đồ BF-05, Doanh nghiệp đã được duyệt hồ sơ sẽ vào tra cứu lịch trống các vị trí banner tại Làn 1 (như Header 728x90 hay Sidebar 300x250). Doanh nghiệp chọn khoảng thời gian và tạo hợp đồng nháp DRAFT. Ad Manager tại Làn 3 thẩm định tính khả thi và gửi lại Đề xuất hợp đồng chính thức kèm bảng giá. Khi Doanh nghiệp bấm Chấp thuận hợp đồng, Hệ thống tại Làn 2 kích hoạt cơ chế Khóa giữ chỗ tạm thời (Slot Reservation) để ngăn đối tác khác đặt trùng lịch, đồng thời sinh mã VietQR Napas PayOS tại Làn 4. Doanh nghiệp quét mã chuyển khoản thành công, hợp đồng chuyển sang trạng thái ACTIVE và vị trí quảng cáo được cấp quyền sử dụng độc quyền cho doanh nghiệp.",
            "img": os.path.join(ARTIFACT_DIR, "The_Pluse_BF05_Swimlane_Diagram.png")
        },
        {
            "code": "BF-06",
            "name": "Tạo chiến dịch & Nộp banner quảng cáo",
            "lanes": "Doanh nghiệp (Business) | Hệ thống The Pluse Engine | Lưu trữ Cloudinary & CSDL",
            "goal": "Cấu hình chiến dịch quảng cáo và tải lên tệp biểu ngữ ảnh SVG/PNG hoặc Video MP4 đúng kích thước pixel quy chuẩn.",
            "speech": "Tại sơ đồ BF-06, Doanh nghiệp mở hợp đồng đã thanh toán tại Làn 1 và bấm Tạo chiến dịch mới. Doanh nghiệp nhập tên chiến dịch, hạn mức lượt xem, link trang đích targetUrl và upload file banner. Hệ thống tại Làn 2 tự động kiểm tra kích thước pixel khớp với slot đã mua (ví dụ 728x90 pixel) và kiểm tra định dạng an toàn. Banner được tải lên Cloudinary CDN tại Làn 3, tạo bản ghi ad_creatives phiên bản v1 và đưa chiến dịch vào trạng thái PENDING_REVIEW chờ thẩm định nội dung.",
            "img": os.path.join(ARTIFACT_DIR, "The_Pluse_BF06_Swimlane_Diagram.png")
        },
        {
            "code": "BF-07",
            "name": "Kiểm duyệt & Kích hoạt chiến dịch quảng cáo",
            "lanes": "Quản lý quảng cáo (Ad Manager) | Hệ thống The Pluse Engine | Doanh nghiệp B2B | Dịch vụ Thông báo",
            "goal": "Bảo đảm chất lượng thẩm mỹ và tính an toàn mạng của banner trước khi phát sóng lên hệ thống báo chí.",
            "speech": "Sơ đồ BF-07 thể hiện khâu kiểm duyệt trước phát sóng. Ad Manager tại Làn 1 mở danh sách chiến dịch chờ duyệt, sử dụng tính năng Xem trước thời gian thực (Live Preview) để kiểm tra độ sắc nét của banner trên máy tính và điện thoại, đồng thời click thử link trang đích xem có an toàn hay không. Nếu đạt chuẩn, Ad Manager bấm PHÊ DUYỆT (APPROVED) -> Chiến dịch chuyển sang ACTIVE và tự động nạp vào bộ điều phối Ad Server. Nếu banner vi phạm thuần phong mỹ tục hoặc link lỗi, Ad Manager bấm YÊU CẦU CHỈNH SỬA -> Doanh nghiệp tại Làn 3 nhận thông báo để nộp banner phiên bản v2 duyệt lại.",
            "img": os.path.join(ARTIFACT_DIR, "The_Pluse_BF07_Swimlane_Diagram.png")
        },
        {
            "code": "BF-08",
            "name": "Phân phối quảng cáo & Ghi nhận sự kiện thời gian thực (Lượt xem & Click thật)",
            "lanes": "Độc giả đọc báo (Reader) | Động cơ phân phối (Ad Server Engine) | CSDL ad_metrics & ad_events | Doanh nghiệp & Ad Manager",
            "goal": "Trọng tâm kỹ thuật: Đo lường lượt xem chuẩn IAB (>=50% diện tích trong >=1s), ghi nhận click thật 100%, chống gian lận Debounce 2 giây, chuyển hướng an toàn HTTP 302.",
            "speech": "Kính thưa Hội đồng, đây là sơ đồ đinh BF-08 thể hiện công nghệ lõi Ad Server của The Pluse. Khi Độc giả vào đọc bài báo tại Làn 1: nếu là Hội viên Premium, Ad Server ẩn sạch quảng cáo; nếu là độc giả miễn phí, Ad Server tại Làn 2 lọc các chiến dịch ACTIVE để hiển thị xoay vòng banner. Khi banner lọt vào màn hình của độc giả đáp ứng chuẩn quốc tế IAB (diện tích >= 50% trong thời gian >= 1 giây liên tục đo bằng IntersectionObserver), trình duyệt mới gửi beacon ghi nhận 1 Lượt xem thật (Impression) vào bảng ad_metrics ở Làn 3. Khi độc giả click vào banner, request đi qua endpoint xử lý: hệ thống áp dụng cơ chế Anti-fraud Debounce 2 giây và băm session SHA-256 để chống spam double-click; hệ thống tăng chính xác 1 Lượt click thật vào CSDL, ghi nhật ký an ninh ad_events và chuyển hướng HTTP 302 đưa độc giả sang trang đích đối tác. Toàn bộ số liệu View, Click và tỷ lệ CTR được cập nhật tức thì lên Dashboard của Doanh nghiệp ở Làn 4.",
            "img": os.path.join(ARTIFACT_DIR, "The_Pluse_BF08_Swimlane_Diagram.png")
        },
        {
            "code": "BF-09",
            "name": "Giám sát hiệu suất & Quản lý vận hành chiến dịch quảng cáo",
            "lanes": "Doanh nghiệp (Business) | Quản lý quảng cáo (Ad Manager) | Hệ thống The Pluse Engine & Background Jobs",
            "goal": "Cung cấp Dashboard trực quan theo dõi CTR theo thời gian thực, xuất báo cáo đối soát CSV/PDF, hỗ trợ điều hành khẩn cấp PAUSE/RESUME và tự động kết thúc chiến dịch.",
            "speech": "Cuối cùng là sơ đồ BF-09. Doanh nghiệp tại Làn 1 và Ad Manager tại Làn 2 đều sở hữu màn hình Dashboard chuyên dụng đọc dữ liệu chuỗi thời gian từ bảng ad_metrics, hiển thị biểu đồ xu hướng trực quan và cho phép bấm Xuất báo cáo nghiệm thu ra file CSV để đối soát tài chính. Đặc biệt, khi có tình huống khẩn cấp (như sản phẩm của đối tác gặp sự cố cần tạm dừng truyền thông), Ad Manager có thể bấm nút TẠM DỪNG (PAUSE) -> Hệ thống lập tức cập nhật trạng thái trong CSDL và ngắt phân phối banner trên website ngay tức thì mà không cần khởi động lại server. Khi sự cố được khắc phục, Ad Manager bấm TIẾP TỤC (RESUME) để đưa banner trở lại vòng xoay. Ngoài ra, tiến trình Background Job tự động quét định kỳ: khi chiến dịch hết hạn hợp đồng hoặc đạt đủ giới hạn lượt xem, hệ thống tự động đổi trạng thái sang COMPLETED và giải phóng vị trí quảng cáo.",
            "img": os.path.join(ARTIFACT_DIR, "The_Pluse_BF09_Swimlane_Diagram.png")
        }
    ]

    for flow in flows:
        add_header_p(doc, f"4.{flow['code'][-2:]} Sơ đồ {flow['code']}: {flow['name']}", level=2)
        p = doc.add_paragraph()
        p.add_run("• Các làn trách nhiệm (Lanes): ").bold = True
        p.add_run(f"{flow['lanes']}\n")
        p.add_run("• Mục tiêu nghiệp vụ: ").bold = True
        p.add_run(f"{flow['goal']}")
        
        # Add Swimlane Image if exists
        if os.path.exists(flow['img']):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(6)
            p_img.paragraph_format.space_after = Pt(4)
            p_img.add_run().add_picture(flow['img'], width=Inches(6.5))
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r_cap = p_cap.add_run(f"Hình 4.{flow['code'][-2:]}: Sơ đồ Swimlane quy trình {flow['code']} — {flow['name']}")
            r_cap.italic = True
            r_cap.font.size = Pt(8.5)
            r_cap.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
            
        add_callout(doc, flow['speech'], speaker=f"THUYẾT MINH {flow['code']}")

    # ------------------ PHẦN 5 ------------------
    add_header_p(doc, "PHẦN 5: KỊCH BẢN THAO TÁC LIVE DEMO TRÊN WEBSITE", level=1)
    p = doc.add_paragraph()
    p.add_run("Để buổi thuyết trình đạt hiệu quả tối đa, nhóm phân công 2 thành viên phối hợp nhịp nhàng: ")
    p.add_run("Thành viên 1 ").bold = True
    p.add_run("trực tiếp thao tác máy chiếu (bản Online hoặc Local), ")
    p.add_run("Thành viên 2 ").bold = True
    p.add_run("thuyết minh theo đúng kịch bản phân đoạn dưới đây:")

    demo_headers = ["Phân đoạn", "Thao tác trên Màn hình (Người bấm máy)", "Lời thuyết minh đồng bộ (Người nói)"]
    demo_data = [
        [
            "Demo 1:\nĐộc giả Free &\nMua gói Premium\n(BF-01 & BF-02)",
            "1. Mở tab ẩn danh truy cập Trang chủ The Pluse.\n2. Bấm vào bài báo có gắn nhãn PREMIUM.\n3. Chỉ xem được Tóm tắt AI và 20% bài, xuất hiện Thẻ Paywall và banner quảng cáo.\n4. Bấm 'Khám phá các gói Premium', chọn Gói Tháng (79.000đ).\n5. Bấm Xác nhận -> Hệ thống sinh mã Napas VietQR PayOS.\n6. Dùng app ngân hàng quét mã chuyển khoản (hoặc xác nhận Webhook).\n7. Màn hình tự động cập nhật Thành công -> Quay lại bài báo.",
            "Kính thưa Thầy Cô, khi em là độc giả miễn phí vào đọc bài báo Premium, hệ thống chỉ cho phép em đọc bản Tóm tắt AI và 20% đoạn mở đầu, sau đó Thẻ Paywall xuất hiện ngăn chặn việc đọc trộm toàn văn. Bây giờ, em bấm nâng cấp gói, chọn Gói Tháng 79.000đ. Hệ thống lập tức sinh mã VietQR Napas của cổng PayOS với đồng hồ đếm lùi 5 phút. Khi tiền về tài khoản, Webhook IPN kích hoạt ngay lập tức và trang web tự động chuyển sang thông báo Thành công! Khi quay lại bài báo: 100% nội dung gốc được mở khóa, em có thể nghe Audio AI mượt mà, và đặc biệt là toàn bộ khung quảng cáo trên website đã biến mất hoàn toàn!"
        ],
        [
            "Demo 2:\nDoanh nghiệp B2B\nĐăng ký & Đặt slot\n(BF-03 & BF-05)",
            "1. Đăng nhập tài khoản doanh nghiệp business.demo.\n2. Vào B2B Portal -> Nộp hồ sơ đối tác tải ảnh GPKD lên Cloudinary.\n3. Mở chức năng 'Đặt chỗ quảng cáo'.\n4. Chọn vị trí Header Hero và chọn khoảng thời gian tháng tới trên lịch trực quan.\n5. Bấm 'Tạo hợp đồng nháp' DRAFT.",
            "Tiếp theo là phân hệ Doanh nghiệp B2B. Tại đây, doanh nghiệp nộp hồ sơ pháp lý kèm giấy phép kinh doanh được lưu trữ an toàn trên Cloudinary CDN. Sau đó, doanh nghiệp mở sơ đồ lịch trống trực quan của website, chọn vị trí Header Hero cho tháng tới. Hệ thống kiểm tra ngay lập tức để bảo đảm không bị trùng lịch với đối tác khác và khởi tạo một hợp đồng nháp DRAFT."
        ],
        [
            "Demo 3:\nAd Manager Duyệt hồ sơ\n& Kiểm duyệt Banner\n(BF-04 & BF-07)",
            "1. Đăng nhập tài khoản admanager.demo.\n2. Mở Hàng đợi duyệt hồ sơ B2B -> Bấm PHÊ DUYỆT (APPROVED).\n3. Mở Hàng đợi chiến dịch -> Bấm 'Xem trước (Live Preview)' kiểm tra banner và test link đích.\n4. Bấm 'Phê duyệt' (APPROVED) -> Kích hoạt chiến dịch ACTIVE.",
            "Bây giờ em chuyển sang vai trò Ad Manager. Em mở danh sách hồ sơ B2B chờ thẩm định và bấm Phê duyệt để cấp quyền cho đối tác. Khi doanh nghiệp hoàn tất hợp đồng và tải banner lên, Ad Manager sử dụng tính năng 'Live Preview' để xem trước banner hiển thị thực tế trên các màn hình và click thử link đích để bảo đảm an toàn. Em bấm 'Phê duyệt' -> Chiến dịch lập tức chuyển sang trạng thái ACTIVE và sẵn sàng phát sóng lên hệ thống báo chí."
        ],
        [
            "Demo 4:\nPhân phối Ads thật &\nĐo lường IAB, Click thật\n(BF-08)",
            "1. Mở tab ẩn danh mới vào Trang chủ The Pluse.\n2. Cuộn tới banner quảng cáo: Hệ thống xoay vòng 3 chiến dịch thật (The Pluse, On-Lies Game, Google Gemini).\n3. Dừng mắt nhìn banner > 1 giây (đáp ứng chuẩn IAB 50% / 1s).\n4. Click vào banner On-Lies Game -> Mở tab trang web game đích.\n5. Click liên tiếp 3 lần thử nghiệm chống spam.\n6. Đăng nhập lại B2B Dashboard để kiểm tra số liệu.",
            "Và đây là tính năng công nghệ lõi: Hệ thống hiện đang phân phối 3 chiến dịch thật: The Pluse, game On-Lies và Google Gemini. Khi em cuộn tới banner và nhìn trên 1 giây, IntersectionObserver kích hoạt ghi nhận đúng 1 lượt Impression theo chuẩn IAB quốc tế. Khi em click vào banner On-Lies Game, request chạy qua backend, kích hoạt thuật toán Anti-fraud Debounce 2 giây: dù em có click lia lịa thì hệ thống vẫn lọc sạch và chỉ ghi nhận đúng 1 click thật vào CSDL, sau đó chuyển hướng 302 sang trang web game của đối tác. Khi mở Dashboard: số liệu click tăng lên đúng 1 lượt thực tế, cam kết 100% không có số liệu ảo!"
        ],
        [
            "Demo 5:\nVận hành Khẩn cấp\nPAUSE & RESUME\n(BF-09)",
            "1. Tại màn hình Active Campaign Monitor của Ad Manager, bấm nút 'Tạm dừng' (PAUSE) chiến dịch On-Lies.\n2. Ra Trang chủ F5 tải lại trang -> Banner On-Lies biến mất khỏi vòng xoay.\n3. Quay lại bấm 'Tiếp tục' (RESUME) -> Banner xuất hiện trở lại ngay lập tức.\n4. Bấm nút 'Xuất báo cáo CSV' tải file nghiệm thu.",
            "Cuối cùng là năng lực phản ứng nhanh trong điều hành. Giả sử đối tác thông báo máy chủ game bảo trì đột xuất, Ad Manager chỉ cần bấm một nút 'Tạm dừng' (PAUSE). Hệ thống cập nhật CSDL và đưa trạng thái chiến dịch thành PAUSED ngay lập tức. Ra ngoài trang chủ tải lại trang: biểu ngữ này lập tức bị rút khỏi vòng xoay. Khi đối tác hoàn tất bảo trì, Ad Manager bấm 'Tiếp tục' (RESUME), banner tự động xuất hiện trở lại mà không cần khởi động lại máy chủ. Đồng thời, nút 'Xuất báo cáo CSV' cho phép tải ngay bảng đối soát số liệu lượt xem, lượt click theo từng ngày phục vụ thanh lý hợp đồng tài chính."
        ]
    ]
    tbl_demo = doc.add_table(rows=1, cols=3)
    format_table(tbl_demo, [1.3, 2.2, 3.4], demo_headers, demo_data)

    # ------------------ PHẦN 6 ------------------
    add_header_p(doc, "PHẦN 6: BỘ CÂU HỎI & TRẢ LỜI VẤN ĐÁP BẢO VỆ ĐỒ ÁN (HỎI XOÁY ĐÁP XOAY)", level=1)

    qa_list = [
        {
            "q": "Câu 1: Tại sao trong Spring Security các em lại cấu hình http.csrf(csrf -> csrf.disable())? Tắt CSRF như vậy có làm lộ hổng bảo mật không?",
            "a": "Dạ thưa Thầy Cô, nhóm em tắt CSRF là hoàn toàn có chủ đích và tuân thủ đúng chuẩn thiết kế bảo mật của Spring Security. Vì hệ thống The Pluse là kiến trúc RESTful API Stateless, xác thực người dùng bằng JWT Bearer Token truyền qua HTTP Header (Authorization: Bearer <token>) chứ không dùng Cookie lưu Session trên trình duyệt. Tấn công CSRF chỉ có thể xảy ra khi website dùng Cookie (do trình duyệt tự động đính kèm Cookie sang domain khác). Đối với Header Authorization, trình duyệt không thể tự động đính kèm từ một trang web thứ ba, do đó nguy cơ CSRF hoàn toàn bị triệt tiêu tự nhiên. Việc tắt CSRF giúp server giảm tải tính toán token CSRF không cần thiết."
        },
        {
            "q": "Câu 2: Cơ chế làm mờ bài báo Premium các em xử lý ở Frontend bằng CSS hay Backend? Nếu anh nhấn F12 Inspect Element xóa class làm mờ đi thì có đọc trộm được bài viết không?",
            "a": "Dạ thưa Thầy Cô, hệ thống bảo vệ nội dung bằng cơ chế Server-side Content Truncation & Field Masking ở tầng Backend, hoàn toàn không phụ thuộc vào CSS của Frontend. Khi gọi API GET /api/public/articles/{slug}, Backend giải mã JWT token để kiểm tra: nếu tài khoản không có gói Premium, Backend chủ động cắt ngắn chuỗi nội dung content, chỉ trả về phần Tóm tắt AI summary và 20% đoạn mở đầu, đồng thời gán audioUrl = null và isPaywalled = true. Vì vậy, dù người dùng có bấm F12, xóa CSS blur hay xem Network tab thì toàn văn bài báo hoàn toàn không tồn tại trong gói tin JSON gửi về máy khách."
        },
        {
            "q": "Câu 3: Chuẩn quốc tế IAB trong hệ thống các em đo lường như thế nào? Tại sao không tính lượt xem ngay khi tải trang?",
            "a": "Dạ thưa Thầy Cô, nếu tính lượt xem ngay khi tải trang (Raw Impression) thì các banner ở chân trang mà người dùng chưa cuộn tới cũng bị tính tiền, gây bất công cho doanh nghiệp. Chuẩn quốc tế IAB (Interactive Advertising Bureau) quy định một lượt hiển thị hợp lệ (Viewable Impression) phải thỏa mãn đồng thời 2 điều kiện: Banner phải lọt vào khung nhìn màn hình (viewport) tối thiểu >= 50% diện tích và người dùng phải dừng mắt tối thiểu liên tục >= 1 giây. Nhóm em cài đặt bằng IntersectionObserver API của trình duyệt với threshold = 0.5 kết hợp bộ đếm giờ 1 giây. Nếu người dùng lướt nhanh qua dưới 1 giây, bộ đếm bị hủy và không ghi nhận lượt xem. Điều này đảm bảo 100% số liệu báo cáo cho đối tác B2B là người thật nhìn thấy thật."
        },
        {
            "q": "Câu 4: Thuật toán chống click tặc / gian lận quảng cáo (Anti-fraud Debounce) hoạt động ra sao?",
            "a": "Dạ thưa Thầy Cô, nhóm em áp dụng cơ chế Debounce 2 giây và băm session SHA-256. Khi người dùng click vào banner, request đi qua endpoint backend. Hệ thống tạo một chuỗi fingerprint = hash(sessionId + ':' + creativeId + ':' + (currentTimeMillis / 2000)). Nếu phát hiện cùng một fingerprint trong vòng 2 giây (tức người dùng nhấp đúp hoặc cố tình spam click liên tiếp), hệ thống sẽ đánh dấu là RAPID_CLICK_DUPLICATE, ghi log vào bảng ad_events và tăng invalid_clicks_count, tuyệt đối không tăng số click hợp lệ trong ad_metrics. Nhờ đó, số click thật và tỷ lệ CTR luôn phản ánh chính xác 100%."
        },
        {
            "q": "Câu 5: Tại sao nhóm chọn cơ sở dữ liệu MySQL mà không chọn MongoDB hay NoSQL?",
            "a": "Dạ thưa Thầy Cô, nghiệp vụ của The Pluse đòi hỏi tính toàn vẹn dữ liệu tài chính cực kỳ khắt khe: từ việc thanh toán gói Premium, đối soát hóa đơn VietQR, ký kết hợp đồng quảng cáo, quản lý vị trí slot và tính tiền doanh nghiệp. CSDL quan hệ MySQL 8.4 tuân thủ đầy đủ 4 đặc tính ACID, chuẩn hóa quan hệ 3NF với các ràng buộc khóa ngoại chặt chẽ. Ngoài ra, MySQL hỗ trợ cơ chế khóa hàng SELECT ... FOR UPDATE giúp nhóm xử lý hoàn hảo bài toán chống tranh chấp đặt trùng vị trí quảng cáo trong cùng một khung giờ."
        },
        {
            "q": "Câu 6: Nếu hacker biết được đường link Webhook PayOS của hệ thống thì họ có thể tự gửi request giả mạo để nâng cấp Premium miễn phí không?",
            "a": "Dạ thưa Thầy Cô, hoàn toàn không thể làm được. Hệ thống The Pluse bảo mật cổng Webhook bằng chữ ký điện tử HMAC-SHA256. Cả PayOS và backend The Pluse cùng nắm giữ một chuỗi bí mật CHECKSUM_KEY giấu kín trong biến môi trường server. Khi PayOS bắn tín hiệu sang, PayOS dùng khóa bí mật này băm dữ liệu đơn hàng thành một chuỗi chữ ký điện tử. Khi backend nhận được request, nó tự tính lại chữ ký bằng chính CHECKSUM_KEY của mình. Nếu hacker tự gửi request bằng Postman hoặc sửa đổi dù chỉ 1 đồng tiền hay 1 ký tự, hai chữ ký sẽ không khớp nhau, backend lập tức từ chối và ném lỗi 400 Bad Request / Signature Mismatch."
        },
        {
            "q": "Câu 7: Flyway là gì và có vai trò như thế nào trong dự án của nhóm?",
            "a": "Dạ thưa Thầy Cô, nếu Git là công cụ quản lý phiên bản cho mã nguồn (source code) thì Flyway là công cụ quản lý phiên bản cho cấu trúc CSDL (Database Schema Migration). Dự án của nhóm có 23 kịch bản từ V1 đến V23. Mỗi khi backend khởi động, Flyway tự kiểm tra lịch sử trong bảng flyway_schema_history, file nào chưa chạy sẽ được tự động thực thi tuần tự. Nhờ có Flyway, cấu trúc CSDL giữa máy của 3 thành viên trong nhóm, máy của giảng viên khi chấm thi, và CSDL đám mây Aiven trên Render luôn đồng bộ 100%, không bao giờ bị lỗi thiếu bảng hay lệch cột."
        },
        {
            "q": "Câu 8: Tại sao nhóm lại sử dụng Cloudinary mà không lưu ảnh trực tiếp trên máy chủ backend?",
            "a": "Dạ thưa Thầy Cô, việc lưu trữ hình ảnh và tệp tài liệu trực tiếp trên máy chủ backend có 3 nhược điểm lớn: làm phình to dung lượng ổ cứng của server, khi triển khai lên đám mây như Render thì các file cục bộ sẽ bị mất trắng mỗi lần redeploy (Ephemerality), và máy chủ backend phải tốn tài nguyên băng thông để phục vụ tải ảnh. Nhóm sử dụng Cloudinary CDN để lưu trữ toàn bộ bản scan GPKD và banner quảng cáo đa kích thước. Cloudinary tự động tối ưu hóa dung lượng ảnh, cung cấp chứng chỉ HTTPS an toàn và phân phối qua mạng lưới CDN toàn cầu với độ trễ thấp."
        },
        {
            "q": "Câu 9: Cơ chế phân quyền RBAC được triển khai cụ thể như thế nào giữa Frontend và Backend?",
            "a": "Dạ thưa Thầy Cô, ở Frontend React, nhóm xây dựng component bọc ProtectedRoute kiểm tra mảng roles trong AuthContext: nếu người dùng không có role phù hợp thì tự động điều hướng về trang chủ hoặc trang 403 Forbidden. Tuy nhiên, bảo mật quyết định nằm ở Backend Spring Boot: tất cả các Controller nghiệp vụ đều được gắn annotation @PreAuthorize(\"hasRole('...')\") hoặc @PreAuthorize(\"hasAnyRole('...')\"). Bộ lọc JWT Token Filter trích xuất danh sách Claims GrantedAuthorities từ token của request. Nếu token bị giả mạo hoặc không đủ quyền, Spring Security lập tức chặn đứng với mã lỗi 403 Forbidden."
        },
        {
            "q": "Câu 10: Giả sử chiến dịch quảng cáo hết ngân sách hoặc hết hạn hợp đồng thì hệ thống làm sao để ngừng phát sóng?",
            "a": "Dạ thưa Thầy Cô, nhóm kết hợp 2 tầng bảo vệ: Tầng thứ nhất là điều kiện truy vấn trực tiếp trong câu lệnh SQL phân phối ad_serving: câu lệnh luôn có điều kiện kiểm tra ct.end_date >= CURRENT_DATE và c.scheduled_end_time > NOW() cùng c.status = 'ACTIVE'. Tầng thứ hai là nhóm xây dựng tiến trình chạy ngầm Spring Scheduled Background Job định kỳ quét kiểm tra: khi hợp đồng đến ngày kết thúc hoặc chiến dịch chạm ngưỡng impression_limit, hệ thống tự động cập nhật trạng thái hợp đồng thành COMPLETED và giải phóng slot quảng cáo trên website một cách hoàn toàn tự động."
        }
    ]

    for item in qa_list:
        p_q = doc.add_paragraph()
        p_q.paragraph_format.space_before = Pt(8)
        p_q.paragraph_format.space_after = Pt(2)
        r_q = p_q.add_run(item['q'])
        r_q.bold = True
        r_q.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
        
        p_a = doc.add_paragraph()
        p_a.paragraph_format.space_before = Pt(2)
        p_a.paragraph_format.space_after = Pt(6)
        r_lbl = p_a.add_run("👉 Trả lời: ")
        r_lbl.bold = True
        r_lbl.font.color.rgb = RGBColor(0x0F, 0x76, 0x6E)
        r_txt = p_a.add_run(item['a'])
        r_txt.font.color.rgb = RGBColor(0x37, 0x41, 0x51)

    # ------------------ PHẦN 7 ------------------
    add_header_p(doc, "PHẦN 7: LỜI KẾT BẢO VỆ ĐỒ ÁN", level=1)
    add_callout(doc,
        "Kính thưa Thầy Cô và Hội đồng phản biện! Qua bài thuyết trình và phần demo thực tế vừa rồi, Nhóm 5 đã chứng minh hệ thống The Pluse không chỉ hoàn thiện đầy đủ 100% các yêu cầu chức năng từ BF-01 đến BF-09 theo đúng hồ sơ SRS, mà còn được xây dựng với tư duy kỹ thuật chỉn chu: từ kiến trúc phân tầng chuẩn mực, giải pháp bảo mật Stateless JWT, xác thực chữ ký Webhook HMAC-SHA256, chuẩn đo lường quốc tế IAB cho đến cam kết 100% số liệu hiển thị và click thật minh bạch. Nhóm chúng em xin chân thành cảm ơn sự lắng nghe và chỉ dẫn tận tình của Thầy Bùi Đình Chiến cùng Quý Thầy Cô trong Hội đồng. Chúng em rất mong nhận được những nhận xét và câu hỏi phản biện đóng góp để dự án ngày càng hoàn thiện hơn nữa! Nhóm em xin chân thành cảm ơn!",
        speaker="KẾT THÚC BẢO VỆ"
    )

    # Save to both locations
    os.makedirs(os.path.dirname(OUTPUT_DOCS), exist_ok=True)
    doc.save(OUTPUT_DOCS)
    print(f"Saved: {OUTPUT_DOCS}")
    
    doc.save(OUTPUT_DESKTOP)
    print(f"Saved: {OUTPUT_DESKTOP}")

if __name__ == "__main__":
    build_presentation_docx()
