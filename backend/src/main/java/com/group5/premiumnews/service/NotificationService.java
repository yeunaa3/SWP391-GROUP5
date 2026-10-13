package com.group5.premiumnews.service;

import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationService {
    public record Notice(long id, String title, String content, String type, String entityType, String entityId, boolean read, Instant createdAt) {}
    public record Inbox(List<Notice> items, long unreadCount, Long nextCursor) {}
    private final JdbcTemplate jdbc;
    public NotificationService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Inbox inbox(long userId, Long before) {
        List<Notice> rows = jdbc.query("""
            SELECT notification_id,title,content,notification_type,related_entity_type,related_entity_id,is_read,created_at
            FROM notifications WHERE user_id=? AND delivery_channel='IN_APP'
              AND (? IS NULL OR notification_id<?)
            ORDER BY notification_id DESC LIMIT 51
            """, (rs,n) -> new Notice(rs.getLong(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getString(5),rs.getString(6),rs.getBoolean(7),rs.getTimestamp(8).toInstant()),userId,before,before);
        Long unread = jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE user_id=? AND delivery_channel='IN_APP' AND is_read=FALSE",Long.class,userId);
        List<Notice> items = rows.stream().limit(50).toList();
        return new Inbox(items, unread == null ? 0 : unread, rows.size()>50 ? items.getLast().id() : null);
    }

    public void mark(long userId, long id, boolean read) {
        // Ownership check and mutation occur in the same statement.
        int changed = jdbc.update("UPDATE notifications SET is_read=?,read_at=IF(?,CURRENT_TIMESTAMP(6),NULL) WHERE notification_id=? AND user_id=? AND delivery_channel='IN_APP'",read,read,id,userId);
        if (changed == 0) {
            Long exists = jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE notification_id=? AND user_id=? AND delivery_channel='IN_APP'",Long.class,id,userId);
            if (exists == null || exists == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy thông báo.");
        }
    }

    public void markAll(long userId) {
        jdbc.update("UPDATE notifications SET is_read=TRUE,read_at=CURRENT_TIMESTAMP(6) WHERE user_id=? AND delivery_channel='IN_APP' AND is_read=FALSE",userId);
    }
}
