package com.group5.premiumnews.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Kích hoạt/kết thúc theo lịch, mỗi campaign có transaction riêng; lỗi một bản không chặn các bản khác. */
@Component
public class CampaignDeliveryScheduler {
    private static final Logger log=LoggerFactory.getLogger(CampaignDeliveryScheduler.class);
    private final JdbcTemplate jdbc;private final CampaignWorkflowService workflow;
    public CampaignDeliveryScheduler(JdbcTemplate jdbc,CampaignWorkflowService workflow){this.jdbc=jdbc;this.workflow=workflow;}
    /** Query ứng viên nhẹ; service khóa và kiểm tra lại trước update, an toàn khi nhiều instance cùng chạy. */
    @Scheduled(fixedDelayString="${app.campaign-delivery.interval-ms:60000}",initialDelayString="${app.campaign-delivery.interval-ms:60000}")
    public void tick(){for(Long id:jdbc.queryForList("SELECT campaign_id FROM ad_campaigns WHERE status IN ('ACTIVE','PAUSED','SCHEDULED','APPROVED') AND (scheduled_end_time<=CURRENT_TIMESTAMP(6) OR (status IN ('APPROVED','SCHEDULED') AND scheduled_start_time<=CURRENT_TIMESTAMP(6)))",Long.class))try{workflow.advanceDelivery(id);}catch(RuntimeException ex){log.warn("Không chuyển được lịch campaign {}: {}",id,ex.getClass().getSimpleName());}}
}
