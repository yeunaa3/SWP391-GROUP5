package com.group5.premiumnews.service;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;

/** Ghép snapshot, sự kiện nộp và quyết định theo đúng version; không sửa dữ liệu lịch sử đã lưu. */
final class CompanyApplicationHistory {
    private CompanyApplicationHistory() {}

    static List<Map<String,Object>> load(JdbcTemplate jdbc, Map<String,Object> company) {
        if (company.get("company_id") == null) return List.of();
        Object id=company.get("company_id");
        var versions=jdbc.queryForList("SELECT * FROM company_application_versions WHERE company_id=? ORDER BY application_version DESC",id);
        // NOTE là ghi chú làm việc của manager, không công khai trong lịch sử phía Business.
        var reviews=jdbc.queryForList("""
            SELECT r.application_version,r.decision,r.review_note,r.created_at,
                COALESCE(u.full_name,u.username) reviewer_name
            FROM partnership_reviews r JOIN users u ON u.user_id=r.reviewer_id
            WHERE r.company_id=? AND r.decision IN ('APPROVED','REJECTED','NEEDS_REVISION')
            ORDER BY r.partnership_review_id ASC
            """,id);
        var submissions=jdbc.queryForList("""
            SELECT JSON_UNQUOTE(JSON_EXTRACT(new_value,'$.application_version')) application_version,
                JSON_UNQUOTE(JSON_EXTRACT(new_value,'$.submission_status')) submission_status,
                JSON_UNQUOTE(JSON_EXTRACT(new_value,'$.application_code')) application_code
            FROM audit_logs WHERE entity_type='COMPANY' AND entity_id=?
                AND action='SUBMIT_APPLICATION' AND new_value IS NOT NULL
            ORDER BY audit_log_id ASC
            """,String.valueOf(id));
        return assemble(company,versions,reviews,submissions);
    }

    /** Dữ liệu cũ thiếu bằng chứng chỉ hiện Đã nộp; không lấy trạng thái company mới ghi đè version cũ. */
    static List<Map<String,Object>> assemble(Map<String,Object> company,
            List<Map<String,Object>> versions,List<Map<String,Object>> reviews,
            List<Map<String,Object>> submissions) {
        List<Map<String,Object>> result=new ArrayList<>();
        for (var version:versions) {
            var row=new HashMap<String,Object>(version);
            String number=String.valueOf(version.get("application_version"));
            String submitted="SUBMITTED";
            for(var event:submissions) if(number.equals(String.valueOf(event.get("application_version")))
                    && Set.of("PENDING_REVIEW","RESUBMITTED").contains(String.valueOf(event.get("submission_status")))) {
                submitted=String.valueOf(event.get("submission_status"));
                row.put("application_code",event.get("application_code"));break;
            }
            // Fallback chỉ dùng trạng thái chờ của chính version hiện tại, không áp dụng cho các bản cũ.
            if("SUBMITTED".equals(submitted) && number.equals(String.valueOf(company.get("application_version")))
                    && Set.of("PENDING_REVIEW","RESUBMITTED").contains(String.valueOf(company.get("application_status"))))
                submitted=String.valueOf(company.get("application_status"));
            // Với bản cũ, chỉ khôi phục loại gửi khi có quyết định của version liền trước làm căn cứ.
            if("SUBMITTED".equals(submitted)) {
                int previous=((Number)version.get("application_version")).intValue()-1;
                String priorDecision="";
                for(var review:reviews) if(String.valueOf(previous).equals(String.valueOf(review.get("application_version")))
                        && Set.of("APPROVED","REJECTED","NEEDS_REVISION").contains(String.valueOf(review.get("decision"))))
                    priorDecision=String.valueOf(review.get("decision"));
                if("NEEDS_REVISION".equals(priorDecision)) submitted="RESUBMITTED";
                if("REJECTED".equals(priorDecision)) submitted="PENDING_REVIEW";
            }
            if("SUBMITTED".equals(submitted) && "1".equals(number)) submitted="PENDING_REVIEW";
            var timeline=new ArrayList<Map<String,Object>>();
            timeline.add(Map.of("status",submitted,"occurred_at",version.get("submitted_at")));
            String outcome=number.equals(String.valueOf(company.get("application_version")))
                    && Set.of("PENDING_REVIEW","RESUBMITTED").contains(String.valueOf(company.get("application_status")))
                    ? submitted : "SUBMITTED";
            for(var review:reviews) if(number.equals(String.valueOf(review.get("application_version")))
                    && Set.of("APPROVED","REJECTED","NEEDS_REVISION").contains(String.valueOf(review.get("decision")))) {
                var event=new HashMap<String,Object>();
                outcome=String.valueOf(review.get("decision"));
                event.put("status",outcome);event.put("occurred_at",review.get("created_at"));
                event.put("note",review.get("review_note"));event.put("reviewer_name",review.get("reviewer_name"));
                timeline.add(event);
            }
            row.put("submission_status",submitted);row.put("history_status",outcome);row.put("history_events",timeline);
            result.add(row);
        }
        return result;
    }
}
