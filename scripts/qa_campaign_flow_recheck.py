"""Kiểm tra độc lập BUS-14/15/16/17 trên QA cố định, không nhận URL production.

Tạo fixture mới cho mỗi lần chạy; thông tin đăng nhập UI chỉ nằm trong .runtime.
"""
import datetime as dt
import json
import os
from pathlib import Path
import unittest
import uuid

import qa_campaign_workflow as qa


@unittest.skipUnless(os.getenv("RUN_WORKFLOW_QA") == "1", "Chỉ chạy với database/backend QA riêng")
class CampaignFlowRecheck(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        qa.CampaignWorkflowQA.setUpClass()
        cls.flow=qa.CampaignWorkflowQA("test_03_draft_idempotent_and_optimistic_lock")
        cls.business=cls.flow.business
        # Company khác cũng phải APPROVED để test ownership không dừng sớm ở partnership gate.
        foreign_form={**cls.flow.company_form,"name":"QA Foreign Company",
            "taxCode":str(int(uuid.uuid4().hex[:10],16)%9000000000+1000000000)}
        code,result=cls.flow.other.call("/api/business/company","PUT",foreign_form)
        if code!=200:raise AssertionError((code,result))
        foreign_id=int(result["company"]["company_id"])
        qa.sql(f"UPDATE companies SET application_status='APPROVED' WHERE company_id={foreign_id}")
        root=Path(__file__).resolve().parents[1]/".runtime"
        (root/"campaign-recheck-ui.json").write_text(json.dumps({
            "login":cls.flow.accounts[0][0],"password":cls.flow.password,
            "companyId":cls.flow.company_id,"contractId":cls.flow.contract,
        }),encoding="utf-8")
        (root/"campaign-recheck-banner.png").write_bytes(cls.flow.asset)
        (root/"campaign-recheck-wrong.png").write_bytes(qa.png(2,2))

    def detail(self,campaign):
        code,result=self.business.call(f"/api/business/campaigns/{campaign}")
        self.assertEqual(200,code,result)
        return result

    def test_01_contract_status_payment_and_ownership(self):
        campaign,payload=self.flow.draft()
        try:
            for payment in ["UNPAID","PENDING","FAILED","REFUNDED"]:
                qa.sql(f"UPDATE contracts SET payment_status='{payment}' WHERE contract_id={self.flow.contract}")
                code,result=self.business.call("/api/business/campaigns","POST",{**payload,"requestKey":uuid.uuid4().hex})
                self.assertEqual(422,code,(payment,result))
            qa.sql(f"UPDATE contracts SET payment_status='PAID' WHERE contract_id={self.flow.contract}")
            for state in ["DRAFT","PROPOSED","CANCELLED","EXPIRED","COMPLETED"]:
                qa.sql(f"UPDATE contracts SET status='{state}' WHERE contract_id={self.flow.contract}")
                code,result=self.business.call("/api/business/campaigns","POST",{**payload,"requestKey":uuid.uuid4().hex})
                self.assertEqual(422,code,(state,result))
        finally:
            qa.sql(f"UPDATE contracts SET status='ACTIVE',payment_status='PAID' WHERE contract_id={self.flow.contract}")
        self.assertIn(self.flow.other.call("/api/business/campaigns","POST",{**payload,"requestKey":uuid.uuid4().hex})[0],[403,404,422])
        self.assertEqual("DRAFT",self.detail(campaign)["campaign"]["status"])

    def test_02_draft_date_url_validation_and_no_partial_save(self):
        campaign,payload=self.flow.draft();path=f"/api/business/campaigns/{campaign}"
        saved=self.detail(campaign)["campaign"]
        version=saved["edit_version"]
        invalid=[{"name":" "},{"endTime":payload["startTime"]},
            {"startTime":(dt.datetime.now()-dt.timedelta(days=10)).isoformat()},
            {"endTime":(dt.datetime.now()+dt.timedelta(days=200)).isoformat()},
            {"targetUrl":"javascript:alert(1)"},{"targetUrl":"https://user:pass@example.com"}]
        for change in invalid:
            code,result=self.business.call(path,"PUT",{**payload,"editVersion":version,**change})
            self.assertIn(code,[400,422],(change,result))
            after=self.detail(campaign)["campaign"]
            self.assertEqual(saved["campaign_name"],after["campaign_name"])
            self.assertEqual(version,after["edit_version"])

    def test_03_creative_versions_remove_and_exact_submission(self):
        campaign,_=self.flow.ready();path=f"/api/business/campaigns/{campaign}"
        first=self.detail(campaign)["creatives"][0]
        code,second=self.business.upload(campaign,self.flow.asset);self.assertEqual(200,code,second)
        self.assertNotEqual(first["creative_id"],second["id"])
        self.assertEqual(200,self.business.call(path+f"/creatives/{second['id']}","DELETE")[0])
        code,result=self.flow.submit(path);self.assertEqual(200,code,result)
        detail=self.detail(campaign)
        self.assertEqual(first["creative_id"],detail["submissions"][0]["creative_id"])
        snapshot=detail["submissions"][0]["snapshot"]
        # Retry gửi không tạo thêm submission hoặc sửa snapshot đã chốt.
        self.assertEqual(200,self.flow.submit(path)[0])
        again=self.detail(campaign)
        self.assertEqual(1,len(again["submissions"]))
        self.assertEqual(snapshot,again["submissions"][0]["snapshot"])

    def test_04_revalidate_slot_after_checklist(self):
        campaign,_=self.flow.ready();path=f"/api/business/campaigns/{campaign}"
        checklist=self.business.call(path+"/validation")[1]
        self.assertTrue(all(row["valid"] for row in checklist))
        try:
            qa.sql(f"UPDATE ad_slots SET status='INACTIVE' WHERE slot_id={int(self.flow.slot['id'])}")
            code,result=self.flow.submit(path);self.assertEqual(422,code,result)
            self.assertEqual([],self.detail(campaign)["submissions"])
        finally:qa.sql(f"UPDATE ad_slots SET status='ACTIVE' WHERE slot_id={int(self.flow.slot['id'])}")
        self.assertEqual(200,self.flow.submit(path)[0])

    def test_05_pending_locks_every_mutation_and_private_assets(self):
        campaign,payload=self.flow.ready();path=f"/api/business/campaigns/{campaign}"
        self.assertEqual(200,self.flow.submit(path)[0])
        detail=self.detail(campaign);version=detail["campaign"]["edit_version"]
        creative=detail["creatives"][0]
        self.assertEqual(422,self.business.call(path,"PUT",{**payload,"editVersion":version})[0])
        self.assertEqual(422,self.business.upload(campaign,self.flow.asset)[0])
        self.assertEqual(422,self.business.call(path+"/targeting","PUT",dict(categoryIds=[],tagIds=[],geoScope="VN",deviceType="MOBILE",editVersion=version))[0])
        self.assertEqual(422,self.business.call(path+f"/creatives/{creative['creative_id']}","DELETE")[0])
        self.assertEqual(404,qa.Client().call(creative["media_url"])[0])
        self.assertEqual(404,self.flow.other.call(creative["media_url"])[0])

    def test_06_revision_resubmit_keeps_first_snapshot(self):
        campaign,payload=self.flow.ready();path=f"/api/business/campaigns/{campaign}"
        code,sent=self.flow.submit(path);self.assertEqual(200,code,sent)
        first=self.detail(campaign)["submissions"][0]["snapshot"]
        code,result=self.flow.manager.call(f"/api/ad-manager/campaign-submissions/{campaign}/decision","POST",
            dict(submissionId=sent["submissionId"],decision="NEEDS_REVISION",reason="QA: thay URL đích"))
        self.assertEqual(200,code,result)
        current=self.detail(campaign)
        self.assertEqual(200,self.business.call(path,"PUT",{**payload,"targetUrl":"https://example.com/rechecked","editVersion":current["campaign"]["edit_version"]})[0])
        self.assertEqual(200,self.flow.submit(path)[0])
        detail=self.detail(campaign)
        self.assertEqual(2,len(detail["submissions"]))
        self.assertEqual(first,detail["submissions"][1]["snapshot"])
        self.assertEqual("https://example.com/rechecked",detail["submissions"][0]["snapshot"]["creative"]["target_url"])


if __name__=="__main__":
    unittest.main(verbosity=2)
