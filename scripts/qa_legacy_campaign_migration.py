"""Chuẩn bị fixture ở V14, khởi động app có V15, rồi verify chuyển đổi pending cũ.
Chỉ dùng MySQL QA cố định từ qa_campaign_workflow, không dùng DB chung/Render.
"""
import json
import os
from pathlib import Path
import sys
import uuid
from qa_campaign_workflow import sql

if hasattr(sys.stdout,"reconfigure"):sys.stdout.reconfigure(encoding="utf-8")

ROOT=Path(__file__).resolve().parents[1]
EVIDENCE=ROOT/".runtime"/"workflow-legacy-fixtures.json"


def prepare():
    assert sql("SELECT MAX(CAST(version AS UNSIGNED)) FROM flyway_schema_history WHERE success=1")=="14", "Chỉ chuẩn bị fixture trước V15 trên DB QA"
    source=int(sql("SELECT c.campaign_id FROM ad_campaigns c JOIN ad_creatives cr ON cr.campaign_id=c.campaign_id WHERE c.status='PENDING_REVIEW' AND cr.status='PENDING_REVIEW' ORDER BY c.campaign_id DESC LIMIT 1"))
    suffix=uuid.uuid4().hex[:10]
    ids=[]
    for kind in ["WITH_ASSET","NO_ASSET"]:
        code="QA_LEGACY_"+kind+"_"+suffix
        sql(f"INSERT INTO ad_campaigns(contract_id,campaign_code,campaign_name,target_url,scheduled_start_time,scheduled_end_time,created_by,status,submitted_at) SELECT contract_id,'{code}','QA legacy {kind}',target_url,scheduled_start_time,scheduled_end_time,created_by,'PENDING_REVIEW',CURRENT_TIMESTAMP(6) FROM ad_campaigns WHERE campaign_id={source}")
        campaign=int(sql(f"SELECT campaign_id FROM ad_campaigns WHERE campaign_code='{code}'"));ids.append(campaign)
        if kind=="WITH_ASSET":
            sql(f"INSERT INTO ad_creatives(campaign_id,version_no,creative_type,title,media_url,media_object_key,target_url,mime_type,file_size,width_px,height_px,checksum_sha256,status,submitted_at) SELECT {campaign},1,creative_type,title,media_url,media_object_key,target_url,mime_type,file_size,width_px,height_px,checksum_sha256,'PENDING_REVIEW',submitted_at FROM ad_creatives WHERE campaign_id={source} AND status='PENDING_REVIEW' ORDER BY version_no DESC LIMIT 1")
            sql(f"UPDATE ad_creatives SET media_url=CONCAT('/api/media/creative/',creative_id) WHERE campaign_id={campaign}")
    hashes=sql("SELECT submission_id,SHA2(snapshot,256) FROM campaign_submissions ORDER BY submission_id")
    EVIDENCE.write_text(json.dumps(dict(ids=ids,hashes=hashes)),encoding="utf-8")
    print("Chuẩn bị hai fixture legacy V14 thành công.")


def verify():
    data=json.loads(EVIDENCE.read_text(encoding="utf-8"));with_asset,no_asset=map(int,data["ids"])
    assert sql("SELECT MAX(CAST(version AS UNSIGNED)) FROM flyway_schema_history WHERE success=1")=="15"
    assert sql(f"SELECT status FROM ad_campaigns WHERE campaign_id={with_asset}")=="PENDING_REVIEW"
    assert sql(f"SELECT COUNT(*) FROM campaign_submissions WHERE campaign_id={with_asset}")=="1"
    assert sql(f"SELECT JSON_EXTRACT(snapshot,'$.legacyImported') FROM campaign_submissions WHERE campaign_id={with_asset}") in ["1","true"]
    assert sql(f"SELECT JSON_TYPE(JSON_EXTRACT(snapshot,'$.targeting.categoryIds')) FROM campaign_submissions WHERE campaign_id={with_asset}")=="ARRAY"
    assert sql(f"SELECT status FROM ad_campaigns WHERE campaign_id={no_asset}")=="NEEDS_REVISION"
    assert sql(f"SELECT COUNT(*) FROM campaign_submissions WHERE campaign_id={no_asset}")=="0"
    assert int(sql(f"SELECT COUNT(*) FROM campaign_activity WHERE campaign_id={no_asset} AND action='LEGACY_SUBMISSION_RECOVERY'"))==1
    assert int(sql(f"SELECT COUNT(*) FROM notifications WHERE related_entity_type='CAMPAIGN' AND related_entity_id='{no_asset}'"))>0
    for row in data["hashes"].splitlines():
        sid,digest=row.split("\t");assert sql(f"SELECT SHA2(snapshot,256) FROM campaign_submissions WHERE submission_id={int(sid)}")==digest
    print("PASS: nhập snapshot pending cũ đúng creative; mở lại bản thiếu asset; giữ nguyên mọi snapshot cũ.")


if __name__=="__main__":
    if os.getenv("RUN_WORKFLOW_QA")!="1":raise SystemExit("Cần RUN_WORKFLOW_QA=1 và DB QA riêng")
    {"prepare":prepare,"verify":verify}[sys.argv[1]]()
