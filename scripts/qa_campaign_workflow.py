"""Integration QA trên MySQL riêng 127.0.0.1:13306/pulse_workflow_qa và backend :18080.
Tạo tài khoản/dữ liệu QA mới, không dùng mật khẩu demo hoặc DB thật.
Chạy với RUN_WORKFLOW_QA=1 sau khi khởi tạo môi trường riêng (xem tài liệu bàn giao).
"""
import datetime as dt
import http.cookiejar
import json
import os
from pathlib import Path
import struct
import subprocess
import unittest
import urllib.error
import urllib.request
import uuid
import zlib

BASE = "http://127.0.0.1:18080"
UPLOAD_ROOT = Path(__file__).resolve().parents[1]/".runtime/workflow-qa-uploads"
MYSQL = r"C:/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe"


def sql(statement):
    """Chỉ được chạy trên schema QA/cổng riêng; không nhận URL database từ tham số bên ngoài."""
    if os.getenv("RUN_WORKFLOW_QA") != "1":
        raise RuntimeError("Cần RUN_WORKFLOW_QA=1; tuyệt đối không trỏ tới DB thật")
    return subprocess.check_output([MYSQL, "--no-defaults", "--host=127.0.0.1", "--port=13306",
        "--user=root", "--batch", "--skip-column-names", "pulse_workflow_qa", "--execute="+statement],
        encoding="utf-8", errors="replace").strip()


class Client:
    """Giữ cookie phiên; mỗi mutation lấy masked CSRF giống frontend thật."""
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def call(self, path, method="GET", body=None, csrf=True, headers=None):
        hdr = {"Accept": "application/json", **(headers or {})}
        if method != "GET" and csrf:
            hdr["X-XSRF-TOKEN"] = self.call("/api/auth/csrf")[1]["token"]
        data = body
        if body is not None and not isinstance(body, bytes):
            data = json.dumps(body).encode()
            hdr["Content-Type"] = "application/json"
        request = urllib.request.Request(BASE+path, method=method, data=data, headers=hdr)
        try:
            response = self.opener.open(request, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        raw = response.read()
        try:
            result = json.loads(raw) if raw else None
        except ValueError:
            result = raw
        return response.status, result

    def upload(self, campaign, data, width_wrong=False, version=None):
        """Gửi multipart thật để kiểm tra controller, storage và transaction."""
        detail = self.call(f"/api/business/campaigns/{campaign}")[1]
        version = detail["campaign"]["edit_version"] if version is None else version
        fields = {"targetUrl": "https://example.com/landing", "editVersion": str(version)}
        boundary = "pulse-qa-multipart"
        parts = []
        for key, value in fields.items():
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
        parts += [f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="qa.png"\r\nContent-Type: image/png\r\n\r\n'.encode(), data,
                  f'\r\n--{boundary}--\r\n'.encode()]
        return self.call(f"/api/business/campaigns/{campaign}/creative", "POST", b"".join(parts),
                         headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})

    def document(self,data):
        boundary="pulse-qa-document"
        body=f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="legal.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+data+f'\r\n--{boundary}--\r\n'.encode()
        return self.call("/api/business/documents","POST",body,headers={"Content-Type":f"multipart/form-data; boundary={boundary}"})


def png(width, height):
    """Ảnh PNG test đúng kích thước thật, không dựa tên tệp/MIME khai báo."""
    def chunk(name, value):
        return struct.pack("!I", len(value))+name+value+struct.pack("!I", zlib.crc32(name+value)&0xffffffff)
    scan = (b"\x00"+b"\x90\x30\x50"*width)*height
    return b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR",struct.pack("!2I5B",width,height,8,2,0,0,0))+chunk(b"IDAT",zlib.compress(scan))+chunk(b"IEND",b"")


@unittest.skipUnless(os.getenv("RUN_WORKFLOW_QA") == "1", "MySQL/backend QA riêng chưa bật")
class CampaignWorkflowQA(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.suffix = uuid.uuid4().hex[:10]
        cls.password = uuid.uuid4().hex+"Aa1!"
        cls.business, cls.other, cls.manager, cls.reader = Client(), Client(), Client(), Client()
        cls.accounts = []
        for i, (client, account_type) in enumerate([(cls.business,"BUSINESS"),(cls.other,"BUSINESS"),(cls.manager,"READER"),(cls.reader,"READER")]):
            name = f"qa.{cls.suffix}.{i}"
            payload = dict(username=name, email=name+"@example.com", fullName="Kiểm Thử Luồng", phoneNumber="0901234567", password=cls.password,
                           confirmPassword=cls.password, acceptedTerms=True, accountType=account_type)
            status, user = client.call("/api/auth/register", "POST", payload)
            if status != 201: raise AssertionError((status,user))
            cls.accounts.append((name,user["id"]))
            if i == 2: sql(f"INSERT INTO user_roles(user_id,role_id) SELECT {int(user['id'])},role_id FROM roles WHERE role_name='AD_MANAGER'")
            status, result = client.call("/api/auth/login", "POST", dict(login=name,password=cls.password))
            if status != 200: raise AssertionError((status,result))
        cls.company_form = dict(name="QA Workflow Company", taxCode=str(int(cls.suffix,16)%9000000000+1000000000), industry="Công nghệ", contactPerson="Nguyễn Kiểm Thử",
            email=f"company.{cls.suffix}@example.com",phone="0901234567",address="Hồ Chí Minh",billingAddress="Hồ Chí Minh")
        status, workspace = cls.business.call("/api/business/company","PUT",cls.company_form)
        if status != 200: raise AssertionError((status,workspace))
        cls.company_id = int(workspace["company"]["company_id"])
        sql(f"UPDATE companies SET application_status='APPROVED' WHERE company_id={cls.company_id}")
        cls.position="QA_POSITION_"+cls.suffix
        sql(f"INSERT INTO ad_slots(slot_name,position_code,width_px,height_px,base_price) VALUES('QA placement','{cls.position}',320,180,3000000)")
        cls.slot = next(s for s in cls.business.call("/api/advertising/slots")[1] if s["positionCode"]==cls.position)
        slot = int(cls.slot["id"])
        code="QA-"+cls.suffix
        sql(f"""INSERT INTO contracts(contract_code,contract_name,company_id,b2b_package_id,slot_id,package_code_snapshot,package_name_snapshot,package_price_snapshot,duration_days_snapshot,impressions_quota_snapshot,slot_name_snapshot,slot_position_snapshot,total_value,start_at,end_at,payment_status,status)
            SELECT '{code}','QA contract',{cls.company_id},p.b2b_package_id,s.slot_id,p.code,p.name,p.price,90,100000,s.slot_name,s.position_code,p.price,NOW()-INTERVAL 1 DAY,NOW()+INTERVAL 100 DAY,'PAID','ACTIVE'
            FROM b2b_packages p JOIN ad_slots s ON s.slot_id={slot} WHERE p.status='ACTIVE' LIMIT 1""")
        cls.contract = int(sql(f"SELECT contract_id FROM contracts WHERE contract_code='{code}'"))
        cls.asset = png(int(cls.slot["width"]),int(cls.slot["height"]))

    def draft(self):
        """Tạo campaign mới trong từng test để kiểm tra không phụ thuộc thứ tự chạy."""
        now=dt.datetime.now().replace(second=0,microsecond=0)
        payload=dict(contractId=self.contract,name="QA campaign",description="Integration test",startTime=(now+dt.timedelta(days=2)).isoformat(),
            endTime=(now+dt.timedelta(days=5)).isoformat(),targetUrl="https://example.com/landing",requestKey=uuid.uuid4().hex)
        code,data=self.business.call("/api/business/campaigns","POST",payload)
        self.assertEqual(200,code,data)
        return int(data["id"]),payload

    def submit(self,path):
        version=self.business.call(path)[1]["campaign"]["edit_version"]
        return self.business.call(path+"/submit","POST",dict(editVersion=version))

    def ready(self):
        campaign,payload=self.draft()
        code,result=self.business.upload(campaign,self.asset)
        self.assertEqual(200,code,result)
        version=self.business.call(f"/api/business/campaigns/{campaign}")[1]["campaign"]["edit_version"]
        code,result=self.business.call(f"/api/business/campaigns/{campaign}/targeting","PUT",dict(categoryIds=[],tagIds=[],geoScope="VN,US",deviceType="ALL",audience="QA",editVersion=version))
        self.assertEqual(200,code,result)
        return campaign,payload

    def test_01_register_duplicate_and_validation(self):
        name=self.accounts[0][0]
        body=dict(username=name.upper(),email=(name+"@example.com").upper(),password=self.password,confirmPassword=self.password,fullName="Kiểm Thử",acceptedTerms=True,accountType="READER")
        code,result=Client().call("/api/auth/register","POST",body)
        self.assertEqual(409,code,result);self.assertIn("username khác",result["message"]);self.assertIn("email khác",result["message"])
        for change in [dict(acceptedTerms=False),dict(confirmPassword="DifferentAa12"),dict(fullName="Sai@ Tên"),dict(email="bad..mail@example.com"),dict(phoneNumber="091")]:
            code,result=Client().call("/api/auth/register","POST",{**body,**change})
            self.assertEqual(400,code,result)

    def test_02_auth_status_neutral_and_csrf(self):
        client=Client();name,user=self.accounts[3]
        for status in ["LOCKED","INACTIVE"]:
            sql(f"UPDATE users SET status='{status}' WHERE user_id={int(user)}")
            code,result=client.call("/api/auth/login","POST",dict(login=name,password=self.password))
            self.assertEqual(401,code,result)
        sql(f"UPDATE users SET status='ACTIVE' WHERE user_id={int(user)}")
        self.assertEqual(401,client.call("/api/auth/login","POST",dict(login=name,password="wrongpassword"))[0])
        code,error=client.call("/api/auth/login","POST",dict(login=name,password=self.password),csrf=False)
        self.assertEqual(403,code,error);self.assertEqual("CSRF_INVALID",error["code"])
        self.assertEqual(200,client.call("/api/auth/login","POST",dict(login=name,password=self.password))[0])
        self.assertEqual(200,client.call("/api/auth/me")[0])

    def test_03_draft_idempotent_and_optimistic_lock(self):
        campaign,payload=self.draft()
        code,same=self.business.call("/api/business/campaigns","POST",payload)
        self.assertEqual(200,code,same);self.assertEqual(campaign,same["id"])
        data={**payload,"name":"Tên đã sửa","editVersion":1}
        self.assertEqual(200,self.business.call(f"/api/business/campaigns/{campaign}","PUT",data)[0])
        self.assertEqual(409,self.business.call(f"/api/business/campaigns/{campaign}","PUT",data)[0])
        self.assertEqual("Tên đã sửa",self.business.call(f"/api/business/campaigns/{campaign}")[1]["campaign"]["campaign_name"])

    def test_04_access_and_partnership_gates(self):
        campaign,payload=self.draft()
        self.assertIn(self.other.call(f"/api/business/campaigns/{campaign}")[0],[403,404,422])
        self.assertEqual(403,self.reader.call("/api/business/campaigns","POST",payload)[0])
        self.assertEqual(403,self.business.call("/api/ad-manager/campaign-submissions")[0])
        try:
            for status in ["DRAFT","PENDING_REVIEW","RESUBMITTED","NEEDS_REVISION","REJECTED"]:
                sql(f"UPDATE companies SET application_status='{status}' WHERE company_id={self.company_id}")
                code,error=self.business.call("/api/business/campaigns","POST",{**payload,"requestKey":uuid.uuid4().hex})
                self.assertEqual(422,code,error)
                self.assertEqual([],self.business.call("/api/business/campaign-workspace")[1]["campaigns"])
                self.assertEqual(422,self.business.call(f"/api/business/campaigns/{campaign}")[0])
        finally: sql(f"UPDATE companies SET application_status='APPROVED' WHERE company_id={self.company_id}")

    def test_05_incomplete_and_invalid_uploads(self):
        campaign,_=self.draft()
        checklist=self.business.call(f"/api/business/campaigns/{campaign}/validation")[1]
        self.assertTrue(any(not x["valid"] for x in checklist))
        self.assertEqual(422,self.submit(f"/api/business/campaigns/{campaign}")[0])
        self.assertEqual(409,self.business.call(f"/api/business/campaigns/{campaign}/submit","POST",dict(editVersion=999))[0])
        for bad in [b"fake image",png(2,2)]: self.assertEqual(422,self.business.upload(campaign,bad)[0])
        self.assertEqual(409,self.business.upload(campaign,self.asset,version=999)[0])

    def test_06_submit_review_revision_snapshot(self):
        campaign,payload=self.ready();path=f"/api/business/campaigns/{campaign}"
        code,submitted=self.submit(path);self.assertEqual(200,code,submitted)
        sid=submitted["submissionId"]
        self.assertEqual(200,self.submit(path)[0])
        self.assertEqual(422,self.business.call(path,"PUT",{**payload,"editVersion":3})[0])
        first=self.business.call(path)[1]["submissions"][0]["snapshot"]
        review=f"/api/ad-manager/campaign-submissions/{campaign}/decision"
        code,result=self.manager.call(review,"POST",dict(submissionId=sid,decision="NEEDS_REVISION",reason="Cần cập nhật URL"));self.assertEqual(200,code,result)
        detail=self.business.call(path)[1]
        revised={**payload,"targetUrl":"https://example.com/revised","editVersion":detail["campaign"]["edit_version"]}
        self.assertEqual(200,self.business.call(path,"PUT",revised)[0])
        self.assertEqual(200,self.submit(path)[0])
        detail=self.business.call(path)[1]
        self.assertEqual(2,len(detail["submissions"]))
        self.assertEqual(first,detail["submissions"][1]["snapshot"])
        self.assertEqual("https://example.com/revised",detail["submissions"][0]["snapshot"]["creative"]["target_url"])
        decision=dict(submissionId=detail["submissions"][0]["submission_id"],decision="APPROVED",reason="Đủ điều kiện")
        self.assertEqual(200,self.manager.call(review,"POST",decision)[0])
        self.assertEqual(409,self.manager.call(review,"POST",decision)[0])
        self.assertEqual("SCHEDULED",self.business.call(path)[1]["campaign"]["status"])
        self.assertGreater(int(sql(f"SELECT COUNT(*) FROM notifications WHERE related_entity_type='CAMPAIGN' AND related_entity_id='{campaign}'")),0)

    def test_07_delete_copy_target_catalog(self):
        campaign,payload=self.ready();path=f"/api/business/campaigns/{campaign}"
        version=self.business.call(path)[1]["campaign"]["edit_version"]
        self.assertEqual(422,self.business.call(path+"/targeting","PUT",dict(categoryIds=[99999999],tagIds=[],geoScope="VN",deviceType="ALL",editVersion=version))[0])
        self.assertEqual(422,self.business.call(path+"/targeting","PUT",dict(categoryIds=[],tagIds=[],geoScope="ZZ",deviceType="ALL",editVersion=version))[0])
        code,copy=self.business.call(path+"/copy","POST");self.assertEqual(200,code,copy)
        cloned=self.business.call(f"/api/business/campaigns/{copy['id']}")[1]
        self.assertEqual("DRAFT",cloned["campaign"]["status"]);self.assertEqual([],cloned["submissions"])
        self.assertEqual(200,self.business.call(path,"DELETE")[0])
        self.assertNotIn(campaign,[c["campaign_id"] for c in self.business.call("/api/business/campaign-workspace")[1]["campaigns"]])
        other,_=self.ready();p=f"/api/business/campaigns/{other}";self.submit(p)
        self.assertEqual(422,self.business.call(p,"DELETE")[0])

    def test_08_forecast_raw_samples(self):
        campaign,_=self.ready();detail=self.business.call(f"/api/business/campaigns/{campaign}")[1]
        self.assertFalse(detail["forecast"]["available"])
        self.assertEqual(0,detail["delivery"]["impressions"])

    def test_09_approved_company_is_locked(self):
        # Quy tắc BUS-02 mới: đã duyệt cũng khóa sửa; không tự chuyển hồ sơ về NEEDS_REVISION.
        form={**self.company_form,"name":"QA Legal Revision"}
        code,data=self.business.call("/api/business/company","PUT",form);self.assertEqual(422,code,data)
        persisted=self.business.call("/api/business/workspace")[1]["company"]
        self.assertEqual("APPROVED",persisted["application_status"])
        self.assertEqual(self.company_form["name"],persisted["company_name"])

    def test_10_replacement_keeps_original_until_activation(self):
        original,_=self.ready()
        sql(f"UPDATE ad_campaigns SET status='ACTIVE',scheduled_start_time=NOW()-INTERVAL 1 HOUR WHERE campaign_id={original}; UPDATE ad_creatives SET status='APPROVED' WHERE campaign_id={original}")
        code,new=self.business.call(f"/api/business/campaigns/{original}/change-request","POST");self.assertEqual(200,code,new)
        new_id=int(new["id"]);path=f"/api/business/campaigns/{new_id}"
        detail=self.business.call(path)[1];now=dt.datetime.now().replace(second=0,microsecond=0)
        payload=dict(contractId=self.contract,name="QA replacement",startTime=(now+dt.timedelta(days=1)).isoformat(),endTime=(now+dt.timedelta(days=3)).isoformat(),targetUrl="https://example.com/landing",editVersion=detail["campaign"]["edit_version"])
        self.assertEqual(200,self.business.call(path,"PUT",payload)[0])
        code,s=self.submit(path);self.assertEqual(200,code,s)
        self.assertEqual(200,self.manager.call(f"/api/ad-manager/campaign-submissions/{new_id}/decision","POST",dict(submissionId=s["submissionId"],decision="APPROVED",reason="Duyệt thay thế"))[0])
        self.assertEqual("ACTIVE",sql(f"SELECT status FROM ad_campaigns WHERE campaign_id={original}"))
        self.assertEqual("SCHEDULED",sql(f"SELECT status FROM ad_campaigns WHERE campaign_id={new_id}"))
        # Chỉ đổi lịch trong fixture QA để job đến hạn ngay; không sửa snapshot đã nộp.
        sql(f"UPDATE ad_campaigns SET scheduled_start_time=NOW()-INTERVAL 1 MINUTE WHERE campaign_id={new_id}")
        import time
        deadline=time.monotonic()+70
        while time.monotonic()<deadline and sql(f"SELECT status FROM ad_campaigns WHERE campaign_id={new_id}")!="ACTIVE":time.sleep(1)
        self.assertEqual("ACTIVE",sql(f"SELECT status FROM ad_campaigns WHERE campaign_id={new_id}"))
        self.assertEqual("CANCELLED",sql(f"SELECT status FROM ad_campaigns WHERE campaign_id={original}"))
        sql(f"UPDATE ad_campaigns SET status='PAUSED' WHERE campaign_id={new_id}")

    def test_11_delivery_targeting_events_and_quota(self):
        campaign,_=self.ready()
        sql(f"UPDATE ad_campaigns SET status='ACTIVE',scheduled_start_time=NOW()-INTERVAL 1 HOUR,impression_limit=1 WHERE campaign_id={campaign}; UPDATE ad_creatives SET status='APPROVED' WHERE campaign_id={campaign}; UPDATE ad_targeting SET geo_scope='VN',device_type='DESKTOP' WHERE campaign_id={campaign}")
        creative=int(sql(f"SELECT creative_id FROM ad_creatives WHERE campaign_id={campaign} ORDER BY version_no DESC LIMIT 1"))
        headers={"Accept-Language":"vi-VN","User-Agent":"QA Desktop Browser"}
        path="/api/advertising/banners?position="+self.position
        status,rows=Client().call(path,headers=headers);self.assertEqual(200,status,rows);self.assertIn(creative,[r["id"] for r in rows])
        status,rows=Client().call(path,headers={**headers,"Accept-Language":"en-US"});self.assertEqual(200,status,rows);self.assertNotIn(creative,[r["id"] for r in rows])
        status,rows=Client().call(path,headers={**headers,"User-Agent":"Android Mobile"});self.assertEqual(200,status,rows);self.assertNotIn(creative,[r["id"] for r in rows])
        visitor=Client()
        for _ in range(2):self.assertEqual(200,visitor.call("/api/advertising/events/impression","POST",dict(creativeId=creative))[0])
        self.assertEqual("1",sql(f"SELECT COUNT(*) FROM ad_events WHERE creative_id={creative}"))
        self.assertNotIn(creative,[r["id"] for r in Client().call(path,headers=headers)[1]])
        rows=self.business.call("/api/advertising/performance")[1]
        self.assertEqual(1,sum(int(r["impressions"]) for r in rows if r["campaignId"]==campaign))

    def test_12_booking_quote_and_adjacent_dates(self):
        from decimal import Decimal
        pack=next(p for p in self.business.call("/api/advertising/offers")[1] if int(p["durationDays"])>=3)
        start=dt.date.today()+dt.timedelta(days=105);end=start+dt.timedelta(days=2)
        # Công thức báo giá hiện hành của nhóm: giá gói + giá vị trí, không chia theo ngày.
        quoted=Decimal(str(pack["price"]))+Decimal(str(self.slot["basePrice"]))
        payload=dict(slotId=self.slot["id"],packageId=pack["id"],name="QA booking",startDate=start.isoformat(),endDate=end.isoformat(),quotedAmount=0)
        code,result=self.business.call("/api/business/bookings/drafts","POST",payload);self.assertEqual(409,code,result)
        code,result=self.business.call("/api/business/bookings/drafts","POST",{**payload,"quotedAmount":float(quoted)});self.assertEqual(200,code,result)
        booking=int(result["id"])
        self.assertEqual(end.__add__(dt.timedelta(days=1)).isoformat(),sql(f"SELECT DATE(end_at) FROM contracts WHERE contract_id={booking}"))
        self.assertEqual("3",sql(f"SELECT JSON_EXTRACT(quote_snapshot,'$.days') FROM contracts WHERE contract_id={booking}"))
        self.assertEqual(200,self.business.call(f"/api/business/bookings/{booking}/submit","POST")[0])
        self.assertEqual("PENDING_REVIEW",sql(f"SELECT status FROM contracts WHERE contract_id={booking}"))
        self.assertEqual("NULL",sql(f"SELECT reservation_expires_at FROM contracts WHERE contract_id={booking}"))

    def test_13_company_document_and_application_versions(self):
        company=self.company_id
        # Chỉ fixture QA: bắt đầu vòng hồ sơ nháp; không upload vào hồ sơ đã được duyệt.
        sql(f"UPDATE companies SET application_status='DRAFT' WHERE company_id={company}")
        code,doc1=self.business.document(self.asset);self.assertEqual(200,code,doc1)
        code,result=self.business.call("/api/business/application/submit","POST");self.assertEqual(200,code,result)
        first=result["company"]["application_version"]
        path=f"/api/ad-manager/partnerships/{company}"
        code,review=self.manager.call(path);self.assertEqual(200,code,review)
        self.assertEqual("Công nghệ",review["company"]["industry"])
        self.assertEqual(200,self.manager.call(path+"/note","PUT",dict(applicationVersion=first,note="Đã xem hồ sơ QA"))[0])
        code,result=self.manager.call(path+"/decision","POST",dict(applicationVersion=first,decision="NEEDS_REVISION",reason="Cần bổ sung tài liệu"));self.assertEqual(200,code,result)
        # Upload giờ thêm vào bộ tối đa 5 tệp. Gỡ chủ động nếu muốn thay tệp; snapshot cũ vẫn giữ.
        self.assertEqual(200,self.business.call(f"/api/business/documents/{doc1['id']}","DELETE")[0])
        code,doc2=self.business.document(png(int(self.slot["width"]),int(self.slot["height"])));self.assertEqual(200,code,doc2)
        self.assertNotEqual(doc1["id"],doc2["id"])
        code,result=self.business.call("/api/business/application/submit","POST");self.assertEqual(200,code,result)
        second=result["company"]["application_version"]
        self.assertEqual(first+1,second)
        self.assertEqual(str(doc1["id"]),sql(f"SELECT document_id FROM company_application_version_documents WHERE company_id={company} AND application_version={first}"))
        self.assertEqual(str(doc2["id"]),sql(f"SELECT document_id FROM company_application_version_documents WHERE company_id={company} AND application_version={second}"))
        self.assertEqual(200,self.business.call(doc1["url"])[0])
        self.assertEqual(200,self.manager.call(path+"/note","PUT",dict(applicationVersion=second,note="Đã xem lại hồ sơ QA"))[0])
        code,result=self.manager.call(path+"/decision","POST",dict(applicationVersion=second,decision="REJECTED",reason="Không đáp ứng yêu cầu"));self.assertEqual(200,code,result)
        self.assertEqual(200,self.business.call("/api/business/application/new","POST")[0])
        self.assertEqual("DRAFT",sql(f"SELECT application_status FROM companies WHERE company_id={company}"))
        self.assertEqual("2",sql(f"SELECT COUNT(*) FROM company_application_versions WHERE company_id={company}"))
        self.assertEqual(422,self.business.call("/api/business/application/submit","POST")[0])
        # BUS-02: mở hồ sơ mới không được mất kết quả từng version hoặc biến tất cả thành DRAFT.
        history=self.business.call("/api/business/campaign-workspace")[1]["companyVersions"]
        by_version={int(v["application_version"]):v for v in history}
        self.assertEqual("NEEDS_REVISION",by_version[first]["history_status"])
        self.assertEqual("REJECTED",by_version[second]["history_status"])
        self.assertEqual("RESUBMITTED",by_version[second]["submission_status"])
        self.assertEqual("Không đáp ứng yêu cầu",by_version[second]["history_events"][-1]["note"])
        self.assertNotIn("NOTE",[e["status"] for v in history for e in v["history_events"]])
        # Nộp vòng mới: có record chờ duyệt mới, bản đã từ chối vẫn giữ nguyên.
        self.assertEqual(200,self.business.document(self.asset)[0])
        code,result=self.business.call("/api/business/application/submit","POST");self.assertEqual(200,code,result)
        third=result["company"]["application_version"]
        history=self.business.call("/api/business/campaign-workspace")[1]["companyVersions"]
        by_version={int(v["application_version"]):v for v in history}
        self.assertEqual("PENDING_REVIEW",by_version[third]["submission_status"])
        self.assertEqual("REJECTED",by_version[second]["history_status"])
        sql(f"UPDATE companies SET application_status='APPROVED' WHERE company_id={company}")

    def test_14_forecast_excludes_aggregate_fixtures(self):
        # Fixture chỉ tồn tại trong DB QA riêng để xác minh công thức/cutoff, không seed vào app/deploy.
        campaign,_=self.ready();creative=int(sql(f"SELECT creative_id FROM ad_creatives WHERE campaign_id={campaign} ORDER BY version_no DESC LIMIT 1"))
        days=" UNION ALL ".join(f"SELECT {i} d" for i in range(1,8))
        samples=" UNION ALL ".join(f"SELECT {i} n" for i in range(20))
        sql(f"INSERT INTO ad_events(event_type,campaign_id,creative_id,slot_id,request_fingerprint,occurred_at) SELECT 'IMPRESSION',{campaign},{creative},{int(self.slot['id'])},SHA2(UUID(),256),CURRENT_DATE-INTERVAL days.d DAY+INTERVAL 1 HOUR FROM ({days}) days CROSS JOIN ({samples}) samples")
        sql(f"INSERT INTO ad_metrics(creative_id,metric_date,impressions_count) VALUES({creative},CURRENT_DATE-INTERVAL 1 DAY,999999)")
        forecast=self.business.call(f"/api/business/campaigns/{campaign}")[1]["forecast"]
        self.assertTrue(forecast["available"]);self.assertEqual(7,forecast["sampleDays"])
        self.assertEqual(140,forecast["impressions"]);self.assertEqual(60,forecast["estimatedImpressions"])

    def test_15_missing_asset_blocks_submit_and_approval(self):
        campaign,_=self.ready();path=f"/api/business/campaigns/{campaign}"
        creative=int(sql(f"SELECT creative_id FROM ad_creatives WHERE campaign_id={campaign} ORDER BY version_no DESC LIMIT 1"))
        self.assertEqual(404,Client().call(f"/api/media/creative/{creative}")[0])
        self.assertEqual(404,self.other.call(f"/api/media/creative/{creative}")[0])
        self.assertEqual(200,self.manager.call(f"/api/media/creative/{creative}")[0])
        key=sql(f"SELECT media_object_key FROM ad_creatives WHERE creative_id={creative}")
        import re
        self.assertRegex(key,r"^[a-f0-9-]+\.png$")
        root=UPLOAD_ROOT
        file=(root/key).resolve();self.assertEqual(root.resolve(),file.parent)
        backup=file.with_suffix(".quarantine")
        file.rename(backup)
        try:
            self.assertEqual(422,self.submit(path)[0])
        finally: backup.rename(file)
        code,s=self.submit(path);self.assertEqual(200,code,s)
        file.rename(backup)
        decision=dict(submissionId=s["submissionId"],decision="APPROVED",reason="QA review asset")
        try:
            code,result=self.manager.call(f"/api/ad-manager/campaign-submissions/{campaign}/decision","POST",decision);self.assertEqual(422,code,result)
        finally:backup.rename(file)
        self.assertEqual("PENDING_REVIEW",sql(f"SELECT status FROM ad_campaigns WHERE campaign_id={campaign}"))

    def fresh_company(self):
        """Mỗi ca BUS-03 có company riêng, tránh phụ thuộc trạng thái do testcase khác để lại."""
        client=Client();suffix=uuid.uuid4().hex[:12]
        name="qa.iter2."+suffix
        registration=dict(username=name,email=name+"@example.com",fullName="Kiểm Thử Hồ Sơ",password=self.password,
            confirmPassword=self.password,acceptedTerms=True,accountType="BUSINESS")
        code,result=client.call("/api/auth/register","POST",registration);self.assertEqual(201,code,result)
        self.assertEqual(200,client.call("/api/auth/login","POST",dict(login=name,password=self.password))[0])
        form={**self.company_form,"name":"QA Iter2 "+suffix,"taxCode":str(int(suffix,16)%9000000000+1000000000)}
        code,result=client.call("/api/business/company","PUT",form);self.assertEqual(200,code,result)
        return client,int(result["company"]["company_id"]),form

    def test_16_document_limit_remove_and_locked_states(self):
        client,company,form=self.fresh_company()
        self.assertEqual(422,client.call("/api/business/application/submit","POST")[0])
        self.assertEqual(422,client.document(b"not a document")[0])
        self.assertEqual(422,client.document(b"")[0])
        docs=[]
        for _ in range(5):
            code,result=client.document(self.asset);self.assertEqual(200,code,result);docs.append(result)
        self.assertEqual(422,client.document(self.asset)[0])
        self.assertIn(self.other.call(f"/api/business/documents/{docs[0]['id']}","DELETE")[0],[403,404,422])
        self.assertEqual(5,len(client.call("/api/business/workspace")[1]["documents"]))
        self.assertEqual(200,client.call(f"/api/business/documents/{docs[0]['id']}","DELETE")[0])
        self.assertEqual(200,client.document(self.asset)[0])
        self.assertEqual(5,len(client.call("/api/business/workspace")[1]["documents"]))
        self.assertEqual(200,client.call("/api/business/application/submit","POST")[0])
        for state in ["PENDING_REVIEW","RESUBMITTED","APPROVED","REJECTED"]:
            sql(f"UPDATE companies SET application_status='{state}' WHERE company_id={company}")
            self.assertEqual(422,client.call("/api/business/company","PUT",form)[0],state)
            self.assertEqual(422,client.document(self.asset)[0],state)
            self.assertEqual(422,client.call(f"/api/business/documents/{docs[1]['id']}","DELETE")[0],state)

    def test_17_missing_legal_file_does_not_submit_or_freeze_profile(self):
        client,company,_=self.fresh_company()
        code,doc=client.document(self.asset);self.assertEqual(200,code,doc)
        key=sql(f"SELECT storage_object_key FROM company_documents WHERE document_id={int(doc['id'])}")
        root=UPLOAD_ROOT
        file=(root/key).resolve();self.assertEqual(root.resolve(),file.parent)
        backup=file.with_suffix(".quarantine");file.rename(backup)
        try:
            code,result=client.call("/api/business/application/submit","POST")
            self.assertEqual(422,code,result)
            state=client.call("/api/business/workspace")[1]["company"]
            self.assertEqual("DRAFT",state["application_status"])
            self.assertEqual(0,int(state["application_version"]))
        finally:backup.rename(file)
        self.assertEqual(200,client.call("/api/business/application/submit","POST")[0])

    def test_18_upload_boundaries_do_not_write_metadata(self):
        client,company,_=self.fresh_company()
        before=sql(f"SELECT COUNT(*) FROM company_documents WHERE company_id={company}")
        code,result=client.document(b"x"*(8*1024*1024+1));self.assertEqual(413,code,result)
        self.assertEqual(before,sql(f"SELECT COUNT(*) FROM company_documents WHERE company_id={company}"))
        campaign,_=self.draft()
        before=sql(f"SELECT COUNT(*) FROM ad_creatives WHERE campaign_id={campaign}")
        self.assertEqual(413,self.business.upload(campaign,b"x"*(8*1024*1024+1))[0])
        self.assertEqual(before,sql(f"SELECT COUNT(*) FROM ad_creatives WHERE campaign_id={campaign}"))

    def test_19_profile_required_fields_and_session_persistence(self):
        client,company,form=self.fresh_company()
        for key in form:
            code,result=client.call("/api/business/company","PUT",{**form,key:" "})
            self.assertIn(code,[400,422],(key,code,result))
        changed={**form,"industry":"Truyền thông","contactPerson":"Người Liên Hệ Mới","billingAddress":"Địa chỉ mới"}
        self.assertEqual(200,client.call("/api/business/company","PUT",changed)[0])
        for path in ["/api/business/workspace","/api/business/campaign-workspace"]:
            persisted=client.call(path)[1]["company"]
            self.assertEqual(company,int(persisted["company_id"]))
            self.assertEqual(changed["billingAddress"],persisted["billing_address"])

    def test_20_campaign_targeting_persists_and_submission_locks_upload(self):
        campaign,payload=self.ready();path=f"/api/business/campaigns/{campaign}"
        detail=self.business.call(path)[1]
        self.assertEqual({"VN","US"},set(detail["targeting"]["geo_scope"].split(",")))
        self.assertEqual("ALL",detail["targeting"]["device_type"])
        self.assertEqual(200,self.business.call(detail["creatives"][0]["media_url"])[0])
        self.assertEqual(200,self.submit(path)[0])
        self.assertEqual(422,self.business.upload(campaign,self.asset)[0])
        self.assertEqual(422,self.business.call(path+"/targeting","PUT",dict(categoryIds=[],tagIds=[],geoScope="VN",deviceType="MOBILE",editVersion=self.business.call(path)[1]["campaign"]["edit_version"]))[0])

    def test_21_concurrent_uploads_cannot_exceed_five_documents(self):
        # Hai phiên thật cùng upload khi còn một chỗ: khóa company phải chỉ cho đúng một lượt ghi.
        from concurrent.futures import ThreadPoolExecutor
        client,company,_=self.fresh_company()
        for _ in range(4):self.assertEqual(200,client.document(self.asset)[0])
        username=sql(f"SELECT username FROM users WHERE company_id={company}")
        clients=[Client(),Client()]
        for session in clients:
            self.assertEqual(200,session.call("/api/auth/login","POST",dict(login=username,password=self.password))[0])
        with ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda session:session.document(self.asset)[0],clients))
        self.assertEqual(1,results.count(200),results)
        # MySQL có thể phát hiện xung đột phiên bản trước lỗi giới hạn; cả 409/422 đều phải rollback.
        self.assertIn(next(code for code in results if code!=200),[409,422],results)
        self.assertEqual("5",sql(f"SELECT COUNT(*) FROM company_documents WHERE company_id={company} AND status='ACTIVE'"))

    def test_22_failed_creative_dimensions_leave_no_orphan_or_metadata(self):
        campaign,_=self.draft()
        root=UPLOAD_ROOT
        before={file.name for file in root.iterdir() if file.is_file()}
        metadata=sql(f"SELECT COUNT(*) FROM ad_creatives WHERE campaign_id={campaign}")
        self.assertEqual(422,self.business.upload(campaign,png(2,2))[0])
        self.assertEqual(metadata,sql(f"SELECT COUNT(*) FROM ad_creatives WHERE campaign_id={campaign}"))
        self.assertEqual(before,{file.name for file in root.iterdir() if file.is_file()})


if __name__ == "__main__":
    unittest.main(verbosity=2)
