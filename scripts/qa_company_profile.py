"""Kiểm thử lưu/đọc lại BUS-02 trên backend QA localhost:18080; không hỗ trợ URL production."""
import os
import secrets
import unittest
from qa_campaign_workflow import Client, BASE


@unittest.skipUnless(os.getenv("RUN_WORKFLOW_QA") == "1", "Chỉ chạy khi chủ động bật môi trường QA riêng")
class CompanyProfilePersistenceTest(unittest.TestCase):
    def test_create_edit_reopen_and_login_again(self):
        self.assertEqual(BASE, "http://127.0.0.1:18080")
        client = Client()
        suffix = secrets.token_hex(6)
        credentials = {"login": "companyqa." + suffix, "password": secrets.token_urlsafe(18)}
        status, result = client.call("/api/auth/register", "POST", {
            "username": credentials["login"], "email": suffix + "@example.com",
            "password": credentials["password"], "confirmPassword": credentials["password"],
            "fullName": "Người Kiểm Thử", "accountType": "BUSINESS", "acceptedTerms": True,
        })
        self.assertEqual(status, 201, result)
        self.assertEqual(client.call("/api/auth/login", "POST", credentials)[0], 200)
        mapping = {"name": "company_name", "taxCode": "tax_code", "industry": "industry", "contactPerson": "contact_person", "email": "email", "phone": "phone", "address": "address", "billingAddress": "billing_address"}
        form = {"name": "Công ty kiểm thử hồ sơ " + suffix, "taxCode": str(secrets.randbelow(9000000000) + 1000000000), "industry": "Công nghệ", "contactPerson": "Người liên hệ QA", "email": suffix + "@example.com", "phone": "0901234567", "address": "Địa chỉ ban đầu", "billingAddress": "Địa chỉ hóa đơn ban đầu"}
        status, result = client.call("/api/business/company", "PUT", form)
        self.assertEqual(status, 200, result)
        company_id = result["company"]["company_id"]
        form.update({"industry": "Quảng cáo", "contactPerson": "Người liên hệ mới", "address": "Địa chỉ đã cập nhật", "billingAddress": "Địa chỉ hóa đơn đã cập nhật"})
        status, result = client.call("/api/business/company", "PUT", form)
        self.assertEqual(status, 200, result)
        for path in ["/api/business/workspace", "/api/business/campaign-workspace"]:
            status, reopened = client.call(path)
            self.assertEqual(status, 200, reopened)
            for key, column in mapping.items():
                self.assertEqual(reopened["company"][column], form[key])
        # Session mới vẫn đọc đúng company đã lưu, không dựa state frontend hay companyId cũ trong session.
        fresh = Client()
        self.assertEqual(fresh.call("/api/auth/login", "POST", credentials)[0], 200)
        status, reopened = fresh.call("/api/business/campaign-workspace")
        self.assertEqual(status, 200, reopened)
        self.assertEqual(reopened["company"]["company_id"], company_id)
        for key, column in mapping.items():
            self.assertEqual(reopened["company"][column], form[key])
        status, result = fresh.call("/api/business/company", "PUT", {**form, "industry": " "})
        self.assertEqual(status, 400, result)
        self.assertEqual(fresh.call("/api/business/workspace")[1]["company"]["industry"], form["industry"])


if __name__ == "__main__":
    unittest.main()
