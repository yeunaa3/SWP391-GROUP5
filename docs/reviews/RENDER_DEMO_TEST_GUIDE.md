# The Pluse - bo tai khoan va du lieu kiem thu Render

## Bat du lieu

Push code moi len GitHub. Trong Render Environment them `RENDER_DEMO_ENABLED=true` va `RENDER_DEMO_PASSWORD` la mat khau rieng ngau nhien it nhat 16 ky tu. Khong dung mat khau local cong khai. Deploy lai. Khong bat profile local tren Internet.

Tat ca tai khoan duoc tao moi dung mat khau do; tai khoan da ton tai khong bi reset. Sau khi tao xong, doi `RENDER_DEMO_ENABLED=false`, xoa bien mat khau va deploy lai. Tai khoan/du lieu van con; truoc khi dung that phai vo hieu hoa tai khoan demo co quyen cao.

## Tai khoan va kich ban

Neu dang nhap that bai: dung mat khau RENDER_DEMO_PASSWORD tai lan tai khoan DUOC TAO, khong phai Demo@12345 cua local. Doi bien mat khau sau do khong reset tai khoan cu. Trong Aiven/Workbench (ket noi Aiven) kiem tra bang cau lenh chi doc `SELECT username,status FROM premium_news_ad.users WHERE username LIKE '%.demo';`. Khong chia se cot hashed_password. Sau khi deploy ban co log chan doan, Render Logs hien `The Pluse demo: created ...` hoac `already exists; password unchanged`. Neu khong co log, kiem tra deploy commit moi, profile prod,render va RENDER_DEMO_ENABLED=true. Khong ket luan sai mat khau khi chua kiem tra account co trong Aiven.

| Tai khoan | Kich ban |
|---|---|
| reader.demo | Doc bai free, xem paywall, luu bai |
| premium.demo | Doc bai Premium voi subscription test 30 ngay; khong co giao dich that |
| business.new.demo | Chua gan doanh nghiep: tao ho so, tai giay to, gui don tu dau |
| business.demo | Doanh nghiep da duyet; dat slot, xem hop dong, tao/sua campaign, tai banner, gui duyet |
| business.pending.demo | Ho so cho duyet; kiem tra chan chinh sua khi dang duyet |
| business.revision.demo | Ho so can bo sung; sua, tai giay to va gui lai |
| business.rejected.demo | Ho so bi tu choi; xem trang thai va kiem tra gioi han dat quang cao |
| manager.demo | Vai tro quan ly quang cao; chi thao tac nao da co API moi hoat dong that |
| admin.demo | Vai tro quan tri; khong mac dinh cac man prototype da noi database |

## Du lieu doanh nghiep

4 doanh nghiep gia lap co ten `[TEST] The Pluse ...`, ma `TEST-PLUSE-*`, MST gia lap 0000000001..4, dia chi/email/so dien thoai khong phai phap nhan that. Cac ho so pending/revision/rejected la fixture trang thai; chua co tep phap ly dinh kem. Tu upload file test truoc khi test luong xu ly tai lieu.

Doanh nghiep `business.demo` co 5 hop dong: ACTIVE/PAID, DRAFT/UNPAID, PROPOSED/UNPAID, PENDING_PAYMENT/PENDING, PAYMENT_FAILED/FAILED. Hop dong PAID la du lieu gia lap, khong chung minh da thanh toan hay co hoa don hop le. Khong dua vao bao cao doanh thu that.

6 campaign: DRAFT, PENDING_REVIEW, NEEDS_REVISION, ACTIVE, PAUSED, SCHEDULED. Moi campaign co creative mau; banner SVG duoc dong goi cung web de khong mat khi restart. Campaign SCHEDULED bat dau ngay tiep theo; chua cam ket scheduler tu kich hoat. 7 ngay impression/click gia lap cho ACTIVE va PAUSED, khong phai tracking that. Banner upload moi can PNG/JPEG dung kich thuoc slot; SVG fixture khong phai file upload hop le.

Test tao booking: hop dong ACTIVE giu HOME_HERO trong 30 ngay, nen chon ARTICLE_TOP/ARTICLE_SIDEBAR hoac khoang sau khi het hop dong de test thanh cong. Test campaign: chon hop dong TEST-PLUSE-CT-ACTIVE; ngay campaign phai nam trong thoi han hop dong.

## Gioi han

- Chua push hay ket noi/ghi truc tiep Aiven tu may nay; du lieu chi duoc tao sau khi code moi deploy va bat co.
- Tao account va fixture trong 2 transaction rieng; neu fixture loi, account van co the da tao. Fix va restart de thu lai; khong import file nay thu cong khi chua co account.
- Seed khong xoa, reset mat khau hay ghi de trang thai da sua. Chi bat mot lan de tranh bo sung lai fixture da doi ten; khong phai cong cu reset database.
- API duyet cua staff, thuong luong hop dong, payment/invoice, scheduler va tracking that can kiem tra/hoan thien rieng. Co mau du lieu KHONG co nghia test end-to-end duoc het 39 UC.
- Tep upload tren Render Free co the mat khi restart/redeploy; du lieu mau SVG di kem source khong bi anh huong.
- Can kiem tra thuc te tren Aiven sau deploy; unit test khong thay the viec chay SQL fixture tren MySQL.
