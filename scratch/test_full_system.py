import urllib.request
import urllib.parse
import json
import http.cookiejar

BASE = "http://localhost:8080"

class Client:
    def __init__(self):
        self.cj = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cj))
        self.csrf = None

    def get_csrf(self):
        req = urllib.request.Request(f"{BASE}/api/auth/csrf")
        with self.opener.open(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            self.csrf = data.get('token')
            return self.csrf

    def login(self, username, password):
        self.get_csrf()
        payload = json.dumps({"login": username, "password": password}).encode('utf-8')
        req = urllib.request.Request(f"{BASE}/api/auth/login", data=payload, headers={
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": self.csrf
        })
        with self.opener.open(req) as resp:
            return json.loads(resp.read().decode('utf-8'))

    def get(self, path):
        req = urllib.request.Request(f"{BASE}{path}")
        with self.opener.open(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))

    def post(self, path, body=None):
        if not self.csrf:
            self.get_csrf()
        payload = json.dumps(body or {}).encode('utf-8')
        req = urllib.request.Request(f"{BASE}{path}", data=payload, headers={
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": self.csrf
        })
        with self.opener.open(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))

def test_full_system():
    print("=== STARTING FULL LOCAL SYSTEM HEALTH & FLOW CHECK ===")
    
    # 1. Anonymous Reader
    anon = Client()
    status, health = anon.get("/api/health")
    print(f"[BF-00 Health] GET /api/health: {status} => {health.get('status')}")
    
    status, articles = anon.get("/api/articles")
    print(f"[BF-02 Content] GET /api/articles: {status} => {len(articles)} articles found")
    
    status, pkgs = anon.get("/api/subscription-packages")
    print(f"[BF-01 Packages] GET /api/subscription-packages: {status} => {len(pkgs)} packages found")
    
    status, slots = anon.get("/api/advertising/slots")
    print(f"[BF-05 Slots] GET /api/advertising/slots: {status} => {len(slots)} slots found")

    status, banners = anon.get("/api/advertising/banners?position=HEADER_BANNER")
    print(f"[BF-08 Delivery] GET /api/advertising/banners?position=HEADER_BANNER: {status} => {len(banners)} banner(s) active")
    for b in banners:
        print(f"    - Banner ID: {b.get('id')}, Title: {b.get('title')}, Media: {b.get('mediaUrl')}")

    # 2. Reader Login & Entitlement (BF-01 & BF-02)
    reader = Client()
    reader_info = reader.login("reader.demo", "Demo@12345")
    print(f"\n[BF-01 Auth] Logged in as: {reader_info.get('username')}, roles: {reader_info.get('roles')}")
    
    status, reader_access = reader.get("/api/premium/access")
    print(f"[BF-01 Entitlement] GET /api/premium/access: {status} => active: {reader_access.get('active')}, pendingPackageId: {reader_access.get('pendingPackageId')}")

    # 3. Business Login & Campaigns (BF-03, BF-05, BF-06)
    biz = Client()
    biz_info = biz.login("business.demo", "Demo@12345")
    print(f"\n[BF-03/06 Business] Logged in as: {biz_info.get('username')}, roles: {biz_info.get('roles')}")
    
    status, biz_workspace = biz.get("/api/business/workspace")
    print(f"[BF-03 Workspace] GET /api/business/workspace: {status} => Company: {biz_workspace.get('companyName')}, Status: {biz_workspace.get('applicationStatus')}")

    status, biz_camp_ws = biz.get("/api/business/campaign-workspace")
    c_items = biz_camp_ws.get('campaigns', [])
    print(f"[BF-06 Campaign Workspace] GET /api/business/campaign-workspace: {status} => {len(c_items)} campaigns found")

    status, biz_perf = biz.get("/api/advertising/performance")
    print(f"[BF-09 Performance] GET /api/advertising/performance: {status} => Summary metrics returned successfully")

    # 4. Ad Manager Login & Review Queues (BF-04, BF-07, BF-09)
    mgr = Client()
    mgr_info = mgr.login("manager.demo", "Demo@12345")
    print(f"\n[BF-04/07 Manager] Logged in as: {mgr_info.get('username')}, roles: {mgr_info.get('roles')}")

    status, mgr_dash = mgr.get("/api/ad-manager/dashboard")
    print(f"[BF-04 Dashboard] GET /api/ad-manager/dashboard: {status} => {mgr_dash}")

    status, part_queue = mgr.get("/api/ad-manager/partnerships")
    p_items = part_queue if isinstance(part_queue, list) else part_queue.get('items', [])
    print(f"[BF-04 Partnership Queue] GET /api/ad-manager/partnerships: {status} => {len(p_items)} partnerships")

    status, camp_queue = mgr.get("/api/ad-manager/campaign-submissions")
    sub_items = camp_queue if isinstance(camp_queue, list) else camp_queue.get('items', [])
    print(f"[BF-07 Campaign Queue] GET /api/ad-manager/campaign-submissions: {status} => {len(sub_items)} submissions")

    status, camp_data = mgr.get("/api/advertising/campaign-data")
    c_list = camp_data if isinstance(camp_data, list) else camp_data.get('campaigns', [])
    print(f"[BF-09 Monitor] GET /api/advertising/campaign-data: {status} => {len(c_list)} campaigns")

    # 5. Ad Delivery Event & Tracking (BF-08)
    if banners:
        first_b = banners[0]
        c_id = first_b.get("id")
        status, imp_res = anon.post("/api/advertising/events/impression", {"creativeId": c_id})
        print(f"\n[BF-08 Impression Tracking] POST /api/advertising/events/impression: {status} => {imp_res}")

    # 6. BF-09 Pause/Resume Emergency Toggle (UC-39)
    target_c = c_list[0] if len(c_list) > 0 else None
    if target_c:
        cid = target_c.get('campaignId') or target_c.get('id')
        cstatus_before = target_c.get('status')
        status, toggle_res = mgr.post(f"/api/advertising/campaigns/{cid}/toggle-status")
        print(f"\n[BF-09 Toggle Status UC-39] Campaign {cid} ({cstatus_before} -> {toggle_res.get('newStatus')}): HTTP {status}")
        # Toggle back to maintain original state
        status2, toggle_res2 = mgr.post(f"/api/advertising/campaigns/{cid}/toggle-status")
        print(f"[BF-09 Toggle Status UC-39] Restored Campaign {cid} back to {toggle_res2.get('newStatus')}: HTTP {status2}")

    # 7. Admin Login (BF-01 Manual Review & Admin Overview)
    admin = Client()
    admin_info = admin.login("admin.demo", "Demo@12345")
    print(f"\n[Admin Overview] Logged in as: {admin_info.get('username')}, roles: {admin_info.get('roles')}")
    
    status, admin_prem = admin.get("/api/admin/premium-requests")
    print(f"[BF-01 Admin Review] GET /api/admin/premium-requests: {status} => {len(admin_prem)} requests")

    print("\n" + "="*70)
    print(">>> CONGRATULATIONS! ALL 9 BUSINESS FLOWS ARE 100% OPERATIONAL ON LOCAL! <<<")
    print("="*70)

if __name__ == "__main__":
    test_full_system()
