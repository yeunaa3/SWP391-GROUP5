package com.group5.premiumnews.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** JOB-01: một user là một transaction, cùng thứ tự lock user → subscription như luồng gia hạn. */
@Service
public class PremiumExpirationService {
    private final JdbcTemplate jdbc;
    public PremiumExpirationService(JdbcTemplate jdbc){this.jdbc=jdbc;}

    /** Khóa, đọc lại mốc hạn hiện tại, hết hạn và thông báo/audit đúng một lần; lỗi ghi làm rollback. */
    @Transactional
    public int expireUser(long user){
        jdbc.queryForList("SELECT user_id FROM users WHERE user_id=? FOR UPDATE",user);
        var overdue=jdbc.queryForList("SELECT subscription_id,package_name_snapshot FROM subscriptions WHERE user_id=? AND status='ACTIVE' AND end_at<=CURRENT_TIMESTAMP(6) ORDER BY subscription_id FOR UPDATE",user);
        for(var row:overdue){long id=((Number)row.get("subscription_id")).longValue();
            jdbc.update("UPDATE subscriptions SET status='EXPIRED',updated_at=CURRENT_TIMESTAMP(6) WHERE subscription_id=?",id);
            jdbc.update("INSERT INTO notifications(user_id,title,content,notification_type,related_entity_type,related_entity_id,delivery_status,sent_at) VALUES(?,'Gói Premium đã hết hạn',?,'PREMIUM','SUBSCRIPTION',?,'SENT',CURRENT_TIMESTAMP(6))",user,"Gói "+row.get("package_name_snapshot")+" đã hết hạn. Gia hạn để tiếp tục sử dụng Premium.",String.valueOf(id));
            jdbc.update("INSERT INTO audit_logs(action,entity_type,entity_id,old_value,new_value,reason) VALUES('EXPIRE_SUBSCRIPTION','SUBSCRIPTION',?,'{\"status\":\"ACTIVE\"}','{\"status\":\"EXPIRED\"}','JOB-01: end_at đã đến hạn')",String.valueOf(id));
        }
        // Giữ quyền nếu còn một gói ACTIVE hợp lệ; không ảnh hưởng các role khác của người dùng.
        if(!overdue.isEmpty() && jdbc.queryForObject("SELECT COUNT(*) FROM subscriptions WHERE user_id=? AND status='ACTIVE' AND start_at<=CURRENT_TIMESTAMP(6) AND end_at>CURRENT_TIMESTAMP(6)",Integer.class,user)==0)
            jdbc.update("DELETE ur FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id WHERE ur.user_id=? AND r.role_name='SUBSCRIBER'",user);
        return overdue.size();
    }

    /** Giữ quy tắc dọn đơn quá 24 giờ của BF-01, tách transaction khỏi vòng quét scheduler. */
    @Transactional
    public int expireStaleRequests(){return jdbc.update("UPDATE premium_requests SET status='REJECTED',review_note='Hệ thống tự động đóng yêu cầu do quá hạn thanh toán (24 giờ)',reviewed_at=CURRENT_TIMESTAMP(6) WHERE status='PENDING' AND submitted_at<DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 24 HOUR)");}
}
