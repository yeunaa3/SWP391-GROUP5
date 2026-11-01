"""Iteration 3 API/DB/storage QA. Cố định :18081 và pulse_iteration3_qa; không nhận URL production."""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import time
import unittest
import uuid
import qa_campaign_workflow as qa

qa.BASE="http://127.0.0.1:18081"
qa.UPLOAD_ROOT=Path(__file__).resolve().parents[1]/".runtime/iteration3-uploads"
def sql(statement):
    if os.getenv("RUN_ITERATION3_QA")!="1":raise RuntimeError("Chỉ chạy trên Iteration 3 QA riêng")
    if statement.startswith("CREATE TRIGGER"):
        statement="DELIMITER $$\n"+statement+"$$\nDELIMITER ;\n"
    return subprocess.check_output([qa.MYSQL,"--no-defaults","--host=127.0.0.1","--port=13306","--user=root","--batch","--skip-column-names","pulse_iteration3_qa","--execute="+statement],encoding="utf8",errors="replace").strip()
qa.sql=sql

def await_value(query,expected,seconds=8):
    deadline=time.monotonic()+seconds
    while time.monotonic()<deadline:
        value=sql(query)
        if value==expected:return
        time.sleep(.2)
    raise AssertionError((query,expected,value))

@unittest.skipUnless(os.getenv("RUN_ITERATION3_QA")=="1","QA riêng chưa bật")
class IterationThreeQA(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ["RUN_WORKFLOW_QA"]="1"
        qa.CampaignWorkflowQA.setUpClass()
        cls.flow=qa.CampaignWorkflowQA("test_03_draft_idempotent_and_optimistic_lock")
        cls.suffix=cls.flow.suffix
        cls.password=cls.flow.password
        cls.admin=qa.Client();cls.guest=qa.Client()
        username="iter3.admin."+cls.suffix
        code,user=cls.admin.call("/api/auth/register","POST",dict(username=username,email=username+"@example.com",fullName="Quản Trị Kiểm Thử",phoneNumber="0901234567",password=cls.password,confirmPassword=cls.password,acceptedTerms=True,accountType="READER"))
        if code!=201:raise AssertionError((code,user))
        cls.admin_id=int(user["id"]);cls.admin_name=username
        sql(f"INSERT INTO user_roles SELECT {cls.admin_id},role_id,CURRENT_TIMESTAMP(6) FROM roles WHERE role_name='ADMINISTRATOR'")
        if cls.admin.call("/api/auth/login","POST",dict(login=username,password=cls.password))[0]!=200:raise AssertionError("QA admin login failed")
        cls.reader_id=cls.flow.accounts[3][1]
        cls.base_roles={r["name"]:r["id"] for r in cls.admin.call("/api/admin/access")[1]["roles"]}
        root=Path(__file__).resolve().parents[1]/".runtime"
        (root/"iter3-ui.json").write_text(json.dumps(dict(admin=username,password=cls.password,reader=cls.flow.accounts[3][0],readerId=cls.reader_id,business=cls.flow.accounts[0][0],contract=cls.flow.contract)),encoding="utf8")

    def account(self,user):
        code,data=self.admin.call("/api/admin/access?query="+str(user));self.assertEqual(200,code,data)
        return next(x for x in data["users"] if x["username"]==str(user) or x["id"]==user)
    def row(self,id):
        username=sql(f"SELECT username FROM users WHERE user_id={int(id)}")
        return self.account(username)
    def change(self,client,row,**changes):
        payload=dict(status=row["status"],roleIds=row["roleIds"],version=row["version"],reason="Iteration 3 QA access")
        return client.call(f"/api/admin/access/users/{row['id']}","PUT",{**payload,**changes})
    def setting(self):
        return next(x for x in self.admin.call("/api/admin/settings")[1]["settings"] if x["setting_key"]=="creative.max.image.bytes")
    def sub(self,user,end,start="CURRENT_TIMESTAMP(6)-INTERVAL 5 DAY",status="ACTIVE"):
        sql(f"INSERT INTO subscriptions(user_id,package_id,package_code_snapshot,package_name_snapshot,price_snapshot,duration_days_snapshot,start_at,end_at,status) SELECT {int(user)},package_id,code,'Iteration 3 QA',price,30,{start},{end},'{status}' FROM subscription_packages WHERE status='ACTIVE' LIMIT 1")
        return int(sql(f"SELECT MAX(subscription_id) FROM subscriptions WHERE user_id={int(user)}"))

    def test_01_authz_and_csrf(self):
        for path in ["/api/admin/access","/api/admin/settings"]:
            self.assertEqual(401,self.guest.call(path)[0]);self.assertEqual(403,self.flow.reader.call(path)[0]);self.assertEqual(403,self.flow.business.call(path)[0])
        self.assertEqual(403,self.admin.call(f"/api/admin/access/users/{self.reader_id}","PUT",{},csrf=False)[0])

    def test_02_search_filter_page_and_no_secrets(self):
        code,result=self.admin.call("/api/admin/access?query="+self.suffix+"&status=ACTIVE&role=BUSINESS")
        self.assertEqual(200,code,result);self.assertEqual(2,result["total"])
        self.assertNotIn("hashed_password",json.dumps(result));self.assertEqual([],self.admin.call("/api/admin/access?page=100")[1]["users"])
        self.assertEqual(422,self.admin.call("/api/admin/access?page=-1")[0])

    def test_03_lock_revokes_session_and_unlock(self):
        row=self.row(self.reader_id);self.assertEqual(200,self.change(self.admin,row,status="LOCKED")[0])
        self.assertEqual(401,self.flow.reader.call("/api/auth/me")[0])
        self.assertEqual(401,self.flow.reader.call("/api/auth/login","POST",dict(login=row["username"],password=self.password))[0])
        self.assertEqual(200,self.change(self.admin,self.row(self.reader_id),status="ACTIVE")[0])
        self.assertEqual(200,self.flow.reader.call("/api/auth/login","POST",dict(login=row["username"],password=self.password))[0])

    def test_04_stale_access_and_last_admin_rollback(self):
        row=self.row(self.reader_id);self.assertEqual(200,self.change(self.admin,row)[0]);self.assertEqual(409,self.change(self.admin,row,status="LOCKED")[0])
        row=self.row(self.admin_id)
        # Chỉ thao tác admin mới trong schema QA sạch của lượt này.
        others=sql(f"SELECT DISTINCT u.user_id FROM users u JOIN user_roles ur ON ur.user_id=u.user_id JOIN roles r ON r.role_id=ur.role_id JOIN role_permissions p ON p.role_id=r.role_id WHERE u.status='ACTIVE' AND r.status='ACTIVE' AND p.permission_code='ADMINISTRATOR' AND u.user_id<>{self.admin_id}").splitlines()
        # Chỉ schema pulse_iteration3_qa; giữ lại trạng thái fixture QA cũ sau testcase.
        for user in others:sql(f"UPDATE users SET status='INACTIVE' WHERE user_id={int(user)}")
        try:
            self.assertEqual(422,self.change(self.admin,row,status="LOCKED")[0])
            self.assertEqual(422,self.change(self.admin,row,roleIds=[self.base_roles["READER"]])[0])
            self.assertEqual(row,self.row(self.admin_id))
        finally:
            for user in others:sql(f"UPDATE users SET status='ACTIVE' WHERE user_id={int(user)}")

    def test_05_custom_role_permissions_live_and_immutable_builtin(self):
        name="QA_ROLE_"+self.suffix.upper()
        payload=dict(name=name,description="Nhóm QA",status="ACTIVE",permissions=["READER","AD_MANAGER"],version=0,reason="Iteration 3 QA role")
        self.assertEqual(200,self.admin.call("/api/admin/access/roles","POST",payload)[0])
        self.assertEqual(409,self.admin.call("/api/admin/access/roles","POST",payload)[0])
        role=next(r for r in self.admin.call("/api/admin/access")[1]["roles"] if r["name"]==name)
        row=self.row(self.reader_id);self.assertEqual(200,self.change(self.admin,row,roleIds=[role["id"]])[0])
        self.assertIn("AD_MANAGER",self.flow.reader.call("/api/auth/me")[1]["roles"])
        self.assertEqual(200,self.admin.call(f"/api/admin/access/roles/{role['id']}","PUT",{**payload,"permissions":["READER"]})[0])
        self.assertNotIn("AD_MANAGER",self.flow.reader.call("/api/auth/me")[1]["roles"])
        self.assertEqual(409,self.admin.call(f"/api/admin/access/roles/{role['id']}","PUT",payload)[0])
        builtin=next(r for r in self.admin.call("/api/admin/access")[1]["roles"] if r["name"]=="ADMINISTRATOR")
        self.assertEqual(422,self.admin.call(f"/api/admin/access/roles/{builtin['id']}","PUT",{**payload,"name":"ADMINISTRATOR","permissions":["READER"],"version":builtin["version"]})[0])
        self.assertEqual(200,self.change(self.admin,self.row(self.reader_id),roleIds=[self.base_roles["READER"]])[0])

    def test_06_settings_validate_stale_readonly_audit(self):
        row=self.setting();path="/api/admin/settings/creative.max.image.bytes";payload=dict(value="4096",version=row["edit_version"],reason="Iteration 3 QA settings",restoreDefault=False)
        for value in ["0","-1","1.1","1e3","52428801"]:self.assertEqual(422,self.admin.call(path,"PUT",{**payload,"value":value})[0])
        self.assertEqual(row["setting_value"],self.setting()["setting_value"])
        self.assertEqual(200,self.admin.call(path,"PUT",payload)[0]);self.assertEqual("4096",self.setting()["setting_value"])
        self.assertEqual(409,self.admin.call(path,"PUT",payload)[0])
        self.assertEqual(422,self.admin.call("/api/admin/settings/payment.currency","PUT",payload)[0])
        self.assertGreater(int(sql(f"SELECT COUNT(*) FROM audit_logs WHERE actor_id={self.admin_id} AND entity_type='SYSTEM_SETTING' AND old_value IS NOT NULL AND new_value IS NOT NULL")),0)
        fresh=self.setting();self.assertEqual(200,self.admin.call(path,"PUT",{**payload,"version":fresh["edit_version"],"restoreDefault":True})[0]);self.assertEqual(row["default_value"],self.setting()["setting_value"])

    def test_07_save_failure_rolls_back_settings(self):
        row=self.setting();sql("CREATE TRIGGER iter3_qa_setting_failure BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.reason='ITER3_FAIL_SAVE' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='QA audit unavailable'; END IF; END")
        try:
            code,_=self.admin.call("/api/admin/settings/creative.max.image.bytes","PUT",dict(value="1234",version=row["edit_version"],reason="ITER3_FAIL_SAVE",restoreDefault=False))
            self.assertEqual(500,code);after=self.setting();self.assertEqual(row["setting_value"],after["setting_value"]);self.assertEqual(row["edit_version"],after["edit_version"])
        finally:sql("DROP TRIGGER IF EXISTS iter3_qa_setting_failure")

    def test_08_setting_applies_to_upload_keeps_previous_asset(self):
        campaign,_=self.flow.ready();before=self.flow.business.call(f"/api/business/campaigns/{campaign}")[1];creative=before["creatives"][0]["creative_id"]
        row=self.setting();path="/api/admin/settings/creative.max.image.bytes"
        try:
            self.assertEqual(200,self.admin.call(path,"PUT",dict(value="1",version=row["edit_version"],reason="Iteration 3 QA limit",restoreDefault=False))[0])
            self.assertEqual(422,self.flow.business.upload(campaign,self.flow.asset)[0])
            self.assertEqual(200,self.flow.business.call(f"/api/media/creative/{creative}")[0]);self.assertEqual(before["campaign"]["edit_version"],self.flow.business.call(f"/api/business/campaigns/{campaign}")[1]["campaign"]["edit_version"])
        finally:self.admin.call(path,"PUT",dict(value=row["setting_value"],version=self.setting()["edit_version"],reason="Iteration 3 QA restore",restoreDefault=False))

    def test_09_profile_invalid_duplicate_persistence(self):
        client=self.flow.reader;code,original=client.call("/api/account/profile");self.assertEqual(200,code)
        payload={**original,"phoneNumber":"0901234567","currentPassword":self.password,"newPassword":"","confirmNewPassword":""}
        for change in [{"currentPassword":"wrong"},{"fullName":"Name #1"},{"email":"bad"},{"phoneNumber":"abc"},{"newPassword":"NewPassword123","confirmNewPassword":"Mismatch123"},{"newPassword":self.password,"confirmNewPassword":self.password},{"newPassword":"ệ"*25,"confirmNewPassword":"ệ"*25}]:self.assertIn(client.call("/api/account/profile","PUT",{**payload,**change})[0],[400,422])
        self.assertEqual(409,client.call("/api/account/profile","PUT",{**payload,"email":self.admin_name+"@example.com"})[0])
        email=f"profile.{self.suffix}@example.com";self.assertEqual(200,client.call("/api/account/profile","PUT",{**payload,"email":email,"fullName":"Nguyễn Kiểm Thử"})[0])
        self.assertEqual(email,client.call("/api/account/profile")[1]["email"]);fresh=qa.Client();self.assertEqual(200,fresh.call("/api/auth/login","POST",dict(login=original["username"],password=self.password))[0]);self.assertEqual("Nguyễn Kiểm Thử",fresh.call("/api/account/profile")[1]["fullName"])

    def test_10_password_change_revokes_other_session(self):
        # Chỉ đổi mật khẩu account QA phụ; giữ nguyên credentials reader/business cho UI.
        client=self.flow.other;name=self.flow.accounts[1][0];second=qa.Client();self.assertEqual(200,second.call("/api/auth/login","POST",dict(login=name,password=self.password))[0])
        profile=client.call("/api/account/profile")[1];new=uuid.uuid4().hex+"Aa1!"
        code,result=client.call("/api/account/profile","PUT",{**profile,"phoneNumber":"0901234567","currentPassword":self.password,"newPassword":new,"confirmNewPassword":new});self.assertEqual(200,code,result)
        self.assertEqual(401,second.call("/api/auth/me")[0]);self.assertEqual(200,client.call("/api/auth/me")[0])
        self.assertEqual(401,second.call("/api/auth/login","POST",dict(login=name,password=self.password))[0]);self.assertEqual(200,second.call("/api/auth/login","POST",dict(login=name,password=new))[0])

    def test_11_expiry_idempotent_and_role_revoked(self):
        user=self.reader_id;sql(f"INSERT IGNORE INTO user_roles SELECT {user},role_id,CURRENT_TIMESTAMP(6) FROM roles WHERE role_name='SUBSCRIBER'")
        sub=self.sub(user,"CURRENT_TIMESTAMP(6)")
        await_value(f"SELECT status FROM subscriptions WHERE subscription_id={sub}","EXPIRED")
        await_value(f"SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id WHERE user_id={user} AND role_name='SUBSCRIBER'","0")
        time.sleep(1.2)
        self.assertEqual("1",sql(f"SELECT COUNT(*) FROM audit_logs WHERE action='EXPIRE_SUBSCRIPTION' AND entity_id='{sub}'"));self.assertEqual("1",sql(f"SELECT COUNT(*) FROM notifications WHERE related_entity_type='SUBSCRIPTION' AND related_entity_id='{sub}'"))
        self.assertNotIn("SUBSCRIBER",self.flow.reader.call("/api/auth/me")[1]["roles"])

    def test_12_overlap_keeps_entitlement_and_future_unchanged(self):
        user=self.flow.accounts[0][1];live=self.sub(user,"CURRENT_TIMESTAMP(6)+INTERVAL 2 DAY");future=self.sub(user,"CURRENT_TIMESTAMP(6)+INTERVAL 10 DAY",start="CURRENT_TIMESTAMP(6)+INTERVAL 3 DAY")
        sql(f"INSERT IGNORE INTO user_roles SELECT {user},role_id,CURRENT_TIMESTAMP(6) FROM roles WHERE role_name='SUBSCRIBER'");expired=self.sub(user,"CURRENT_TIMESTAMP(6)-INTERVAL 1 SECOND")
        await_value(f"SELECT status FROM subscriptions WHERE subscription_id={expired}","EXPIRED")
        self.assertEqual("ACTIVE\nACTIVE",sql(f"SELECT status FROM subscriptions WHERE subscription_id IN ({live},{future}) ORDER BY subscription_id"));self.assertIn("SUBSCRIBER",self.flow.business.call("/api/auth/me")[1]["roles"])

    def test_13_expiry_audit_failure_rolls_back_then_recovers(self):
        sub=self.sub(self.reader_id,"CURRENT_TIMESTAMP(6)-INTERVAL 1 SECOND",status="PENDING")
        sql(f"CREATE TRIGGER iter3_qa_expiry_failure BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action='EXPIRE_SUBSCRIPTION' AND NEW.entity_id='{sub}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='QA expiry audit unavailable'; END IF; END")
        try:
            sql(f"UPDATE subscriptions SET status='ACTIVE' WHERE subscription_id={sub}");time.sleep(2.2)
            self.assertEqual("ACTIVE",sql(f"SELECT status FROM subscriptions WHERE subscription_id={sub}"));self.assertEqual("0",sql(f"SELECT COUNT(*) FROM notifications WHERE related_entity_type='SUBSCRIPTION' AND related_entity_id='{sub}'"))
        finally:sql("DROP TRIGGER IF EXISTS iter3_qa_expiry_failure")
        await_value(f"SELECT status FROM subscriptions WHERE subscription_id={sub}","EXPIRED")

    def test_14_media_permission_missing_and_approved_public(self):
        campaign,_=self.flow.ready();detail=self.flow.business.call(f"/api/business/campaigns/{campaign}")[1];creative=detail["creatives"][0]["creative_id"];path=f"/api/media/creative/{creative}"
        self.assertEqual(404,self.guest.call(path)[0]);self.assertEqual(404,self.flow.reader.call(path)[0]);self.assertEqual(200,self.flow.manager.call(path)[0]);self.assertEqual(200,self.admin.call(path)[0])
        code,result=self.flow.submit(f"/api/business/campaigns/{campaign}");self.assertEqual(200,code,result)
        current=self.flow.business.call(f"/api/business/campaigns/{campaign}")[1];submission=current["submissions"][0]["submission_id"]
        code,result=self.flow.manager.call(f"/api/ad-manager/campaign-submissions/{campaign}/decision","POST",dict(submissionId=submission,decision="APPROVED",reason="Iteration 3 QA approved media"));self.assertEqual(200,code,result)
        self.assertEqual(200,self.guest.call(path)[0]);self.assertEqual(404,self.guest.call("/api/media/creative/999999999")[0])
        key=detail["creatives"][0]["media_object_key"];root=Path(__file__).resolve().parents[1]/".runtime/iteration3-uploads";asset=root/key;backup=asset.with_suffix(".qa-backup")
        asset.rename(backup)
        try:self.assertEqual(404,self.guest.call(path)[0])
        finally:backup.rename(asset)

    def test_15_media_legal_owner_staff_only(self):
        # Hồ sơ QA khác DRAFT, không nộp giấy tờ hoặc thay đổi company đã APPROVED.
        name="iter3.legal."+self.suffix;client=qa.Client();payload=dict(username=name,email=name+"@example.com",fullName="Kiểm Thử Tệp",phoneNumber="0901234567",password=self.password,confirmPassword=self.password,acceptedTerms=True,accountType="BUSINESS")
        self.assertEqual(201,client.call("/api/auth/register","POST",payload)[0]);self.assertEqual(200,client.call("/api/auth/login","POST",dict(login=name,password=self.password))[0])
        self.assertEqual(200,client.call("/api/business/company","PUT",{**self.flow.company_form,"taxCode":str(int(uuid.uuid4().hex[:10],16)%9000000000+1000000000)})[0]);code,result=client.document(qa.png(2,2));self.assertEqual(200,code,result);path=result["url"]
        self.assertEqual(200,client.call(path)[0]);self.assertEqual(200,self.admin.call(path)[0]);self.assertEqual(200,self.flow.manager.call(path)[0]);self.assertEqual(401,self.guest.call(path)[0]);self.assertEqual(404,self.flow.business.call(path)[0])

    def test_16_campaign_review_checklist_submit_regression(self):
        campaign,_=self.flow.draft();path=f"/api/business/campaigns/{campaign}";code,detail=self.flow.business.call(path);self.assertEqual(200,code,detail)
        checks=self.flow.business.call(path+"/validation")[1];self.assertTrue(any(not x["valid"] for x in checks));self.assertEqual(422,self.flow.submit(path)[0])
        ready,_=self.flow.ready();path=f"/api/business/campaigns/{ready}";checks=self.flow.business.call(path+"/validation")[1];self.assertTrue(all(x["valid"] for x in checks))
        self.assertEqual(200,self.flow.submit(path)[0]);self.assertEqual(200,self.flow.submit(path)[0]);self.assertEqual("1",sql(f"SELECT COUNT(*) FROM campaign_submissions WHERE campaign_id={ready}"))

    def test_17_concurrent_admin_removal_preserves_one_admin(self):
        name="iter3.second."+self.suffix;second=qa.Client()
        code,user=second.call("/api/auth/register","POST",dict(username=name,email=name+"@example.com",fullName="Quản Trị Phụ",phoneNumber="0901234567",password=self.password,confirmPassword=self.password,acceptedTerms=True,accountType="READER"));self.assertEqual(201,code,user)
        user=int(user["id"]);self.assertEqual(200,self.change(self.admin,self.row(user),roleIds=[self.base_roles["ADMINISTRATOR"]])[0]);self.assertEqual(200,second.call("/api/auth/login","POST",dict(login=name,password=self.password))[0])
        others=sql(f"SELECT DISTINCT u.user_id FROM users u JOIN user_roles ur ON ur.user_id=u.user_id JOIN roles r ON r.role_id=ur.role_id JOIN role_permissions p ON p.role_id=r.role_id WHERE u.status='ACTIVE' AND r.status='ACTIVE' AND p.permission_code='ADMINISTRATOR' AND u.user_id NOT IN ({user},{self.admin_id})").splitlines()
        for old in others:sql(f"UPDATE users SET status='INACTIVE' WHERE user_id={int(old)}")
        try:
            first_row=self.row(self.admin_id);second_row=self.row(user)
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                a=pool.submit(self.change,self.admin,first_row,status="INACTIVE");b=pool.submit(self.change,second,second_row,status="INACTIVE")
                results=[a.result()[0],b.result()[0]]
            self.assertEqual([200,422],sorted(results))
            self.assertEqual("1",sql(f"SELECT COUNT(*) FROM users WHERE user_id IN ({user},{self.admin_id}) AND status='ACTIVE'"))
        finally:
            sql(f"UPDATE users SET status='ACTIVE' WHERE user_id IN ({user},{self.admin_id})")
            for old in others:sql(f"UPDATE users SET status='ACTIVE' WHERE user_id={int(old)}")
            self.assertEqual(200,self.admin.call("/api/auth/login","POST",dict(login=self.admin_name,password=self.password))[0])

    def test_18_access_audit_failure_is_atomic(self):
        row=self.row(self.reader_id)
        sql("CREATE TRIGGER iter3_qa_access_failure BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.reason='ITER3_FAIL_ACCESS' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='QA access audit unavailable'; END IF; END")
        try:
            self.assertEqual(500,self.change(self.admin,row,status="LOCKED",roleIds=[self.base_roles["BUSINESS"]],reason="ITER3_FAIL_ACCESS")[0])
            self.assertEqual(row,self.row(self.reader_id))
        finally:sql("DROP TRIGGER IF EXISTS iter3_qa_access_failure")

    def test_19_profile_cannot_self_grant_access_and_save_failure_rolls_back(self):
        client=self.flow.reader;profile=client.call("/api/account/profile")[1];identity=client.call("/api/auth/me")[1]
        payload={**profile,"phoneNumber":"0901234567","currentPassword":self.password,"newPassword":"","confirmNewPassword":"","companyId":self.flow.company_id,"roles":["ADMINISTRATOR"],"roleIds":[self.base_roles["ADMINISTRATOR"]]}
        self.assertEqual(200,client.call("/api/account/profile","PUT",payload)[0])
        after=client.call("/api/auth/me")[1];self.assertEqual(identity["roles"],after["roles"]);self.assertEqual(identity["companyId"],after["companyId"])
        before=client.call("/api/account/profile")[1]
        sql(f"CREATE TRIGGER iter3_qa_profile_failure BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action='UPDATE_PROFILE' AND NEW.actor_id={self.reader_id} THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='QA profile audit unavailable'; END IF; END")
        try:
            self.assertEqual(500,client.call("/api/account/profile","PUT",{**payload,"fullName":"Không Được Lưu"})[0]);self.assertEqual(before,client.call("/api/account/profile")[1])
        finally:sql("DROP TRIGGER IF EXISTS iter3_qa_profile_failure")

    def test_20_campaign_submit_failure_leaves_editable_draft(self):
        campaign,_=self.flow.ready();path=f"/api/business/campaigns/{campaign}";before=self.flow.business.call(path)[1]
        sql(f"CREATE TRIGGER iter3_qa_submit_failure BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action='SUBMIT_CAMPAIGN' AND NEW.entity_id='{campaign}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='QA submit audit unavailable'; END IF; END")
        try:
            self.assertEqual(500,self.flow.submit(path)[0]);after=self.flow.business.call(path)[1]
            self.assertEqual("DRAFT",after["campaign"]["status"]);self.assertEqual(before["campaign"]["edit_version"],after["campaign"]["edit_version"]);self.assertEqual([],after["submissions"]);self.assertEqual("DRAFT",after["creatives"][0]["status"])
        finally:sql("DROP TRIGGER IF EXISTS iter3_qa_submit_failure")
        self.assertEqual(200,self.flow.submit(path)[0])

if __name__=="__main__":unittest.main(verbosity=2)
