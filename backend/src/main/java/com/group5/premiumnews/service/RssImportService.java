package com.group5.premiumnews.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.w3c.dom.Element;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;

@Service
@ConditionalOnProperty(name = "app.news-import.enabled", havingValue = "true")
public class RssImportService {
    private static final Logger log = LoggerFactory.getLogger(RssImportService.class);
    private final JdbcTemplate jdbc;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
        .followRedirects(HttpClient.Redirect.NORMAL).build();
    private final List<Feed> feeds = List.of(
        new Feed("VnExpress", "https://vnexpress.net/rss/tin-moi-nhat.rss", "Thời sự", "society"),
        new Feed("VnExpress", "https://vnexpress.net/rss/kinh-doanh.rss", "Kinh doanh", "business"),
        new Feed("VnExpress", "https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss", "Công nghệ", "technology"),
        new Feed("Tuổi Trẻ", "https://tuoitre.vn/rss/tin-moi-nhat.rss", "Thời sự", "society"),
        new Feed("Tuổi Trẻ", "https://tuoitre.vn/rss/kinh-doanh.rss", "Kinh doanh", "business"));

    public RssImportService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() { importFeeds(); }

    @Scheduled(initialDelay = 900000, fixedDelay = 900000)
    public synchronized Map<String, Object> importFeeds() {
        int processed = 0;
        List<String> errors = new ArrayList<>();
        for (Feed feed : feeds) {
            try { processed += importFeed(feed); }
            catch (Exception e) {
                errors.add(feed.url() + ": " + e.getClass().getSimpleName());
                log.warn("RSS import failed for {}: {}", feed.url(), e.getMessage());
            }
        }
        log.info("RSS import processed {} items; {} feeds failed", processed, errors.size());
        return Map.of("processed", processed, "errors", errors, "updatedAt", Instant.now());
    }

    private int importFeed(Feed feed) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(feed.url())).timeout(Duration.ofSeconds(20))
            .header("User-Agent", "ThePulse-StudentDemo/1.0 (RSS reader)").GET().build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() != 200 || response.body().length() > 2_000_000)
            throw new IllegalStateException("Unexpected RSS response " + response.statusCode());
        var factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        var document = factory.newDocumentBuilder().parse(new InputSource(new StringReader(response.body())));
        var items = document.getElementsByTagName("item");
        jdbc.update("INSERT IGNORE INTO categories(name,slug,status) VALUES (?,?,'ACTIVE')", feed.category(), feed.slug());
        int processed = 0;
        for (int i = 0; i < Math.min(items.getLength(), 20); i++) {
            Element item = (Element) items.item(i);
            String title = plain(text(item, "title"));
            String url = text(item, "link").trim();
            URI uri;
            try { uri = URI.create(url); } catch (Exception invalid) { continue; }
            String expected = feed.name().equals("VnExpress") ? "vnexpress.net" : "tuoitre.vn";
            if (!"https".equals(uri.getScheme()) || !expected.equals(uri.getHost()) || title.isBlank()) continue;
            String description = text(item, "description");
            String summary = plain(description);
            // Keep only the RSS introduction; never fetch the article body or a paywall.
            String image = null;
            var matcher = Pattern.compile("<img[^>]+src=[\"']([^\"']+)", Pattern.CASE_INSENSITIVE).matcher(description);
            if (matcher.find() && matcher.group(1).startsWith("https://")) image = matcher.group(1).replace("&amp;", "&");
            var enclosures = item.getElementsByTagName("enclosure");
            if (image == null && enclosures.getLength() > 0) {
                String enclosed = ((Element) enclosures.item(0)).getAttribute("url");
                if (enclosed.startsWith("https://")) image = enclosed;
            }
            String slug = "rss-" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(url.getBytes(StandardCharsets.UTF_8))).substring(0, 32);
            jdbc.update("""
                INSERT INTO articles(title,slug,summary,content,thumbnail_url,is_premium,status,published_at,source_name,source_url,imported_at)
                VALUES (?,?,?,?,?,FALSE,'PUBLISHED',?,?,?,CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE title=?,summary=?,content=?,thumbnail_url=?,imported_at=CURRENT_TIMESTAMP
                """, title.substring(0, Math.min(title.length(), 255)), slug, summary, summary, image,
                Timestamp.from(parseDate(text(item, "pubDate"))), feed.name(), url,
                title.substring(0, Math.min(title.length(), 255)), summary, summary, image);
            jdbc.update("""
                INSERT IGNORE INTO article_categories(article_id,category_id)
                SELECT a.article_id,c.category_id FROM articles a JOIN categories c ON c.slug=? WHERE a.slug=?
                """, feed.slug(), slug);
            processed++;
        }
        return processed;
    }

    private static String text(Element item, String tag) {
        var nodes = item.getElementsByTagName(tag);
        return nodes.getLength() == 0 ? "" : nodes.item(0).getTextContent();
    }
    static String plain(String value) {
        return value.replaceAll("(?is)<script.*?</script>|<style.*?</style>", "")
            .replaceAll("<[^>]+>", " ").replace("&nbsp;", " ").replace("&amp;", "&")
            .replace("&quot;", "\"").replace("&#39;", "'").replaceAll("\\s+", " ").trim();
    }
    static Instant parseDate(String value) {
        try { return ZonedDateTime.parse(value.trim(), DateTimeFormatter.RFC_1123_DATE_TIME).toInstant(); }
        catch (Exception ignored) { }
        try {
            return LocalDateTime.parse(value.replace('\u202f', ' ').trim(),
                DateTimeFormatter.ofPattern("M/d/yyyy h:mm:ss a", Locale.US)).atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        } catch (Exception ignored) { return Instant.now(); }
    }
    private record Feed(String name, String url, String category, String slug) { }
}
