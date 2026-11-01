package com.group5.premiumnews.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** JOB-01 điều phối; transaction ở bean worker để tránh self-invocation bỏ qua @Transactional. */
@Component
public class PremiumSubscriptionScheduler {
    private static final Logger log=LoggerFactory.getLogger(PremiumSubscriptionScheduler.class);
    private final JdbcTemplate jdbc;
    private final PremiumExpirationService expiration;
    public PremiumSubscriptionScheduler(JdbcTemplate jdbc,PremiumExpirationService expiration){this.jdbc=jdbc;this.expiration=expiration;}

    /** Chu kỳ 15 phút theo SRS; một user lỗi không ngăn xử lý các user khác. */
    @Scheduled(fixedDelayString="${app.premium.expire-check-interval-ms:900000}",initialDelayString="${app.premium.expire-initial-delay-ms:15000}")
    public void runExpirationCycle(){
        try{expireOverdueSubscriptions();expireStalePendingRequests();}
        catch(Exception e){log.error("JOB-01: lỗi vòng quét",e);}
    }
    /** Lấy ứng viên rồi worker kiểm tra lại dưới lock; chạy lặp không tạo notification/audit trùng. */
    public int expireOverdueSubscriptions(){
        int total=0;
        for(long user:jdbc.queryForList("SELECT DISTINCT user_id FROM subscriptions WHERE status='ACTIVE' AND end_at<=CURRENT_TIMESTAMP(6) ORDER BY user_id",Long.class)){
            try{total+=expiration.expireUser(user);}catch(Exception e){log.error("JOB-01: rollback user {}",user,e);}
        }
        return total;
    }
    public int expireStalePendingRequests(){return expiration.expireStaleRequests();}
}