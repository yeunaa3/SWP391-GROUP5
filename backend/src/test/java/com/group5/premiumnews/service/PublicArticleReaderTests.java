package com.group5.premiumnews.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PublicArticleReaderTests {
    private final String text = "Nội dung thử nghiệm do nhóm tự tạo để kiểm tra bộ đọc bài báo công khai. ".repeat(6);
    @Test void preservesParagraphsImagesAndCaptionsInOrderWithoutSourceHtml() {
        var html = "<meta name='author' content='Test Author'><div class='maincontent'><p>" + text
            + "</p><figure><img data-src='https://static-images.vnncdn.net/demo.jpg' alt='Ảnh thử'><figcaption>Chú thích ảnh</figcaption></figure>"
            + "<h2>Tiêu đề phụ</h2><p>Đoạn tiếp theo.</p><script>alert(1)</script><iframe src='bad'></iframe></div>";
        var article = PublicArticleReader.parse(html, "https://vietnamnet.vn/test.html").orElseThrow();
        assertEquals(4, article.blocks().size());
        assertEquals("paragraph", article.blocks().get(0).type());
        assertEquals("image", article.blocks().get(1).type());
        assertEquals("Chú thích ảnh", article.blocks().get(1).caption());
        assertEquals("Test Author", article.author());
        assertFalse(article.text().contains("alert"));
    }
    @Test void doesNotReadPaywallsMissingBodiesOrUntrustedImageHosts() {
        assertTrue(PublicArticleReader.parse("<div class='paywall'></div><div class='maincontent'>" + text + "</div>", "https://vietnamnet.vn/test.html").isEmpty());
        assertTrue(PublicArticleReader.parse("<p>" + text + "</p>", "https://vietnamnet.vn/test.html").isEmpty());
        var article = PublicArticleReader.parse("<div class='fck_detail'><p>" + text + "</p><img src='https://evil.test/tracker.jpg'></div>", "https://vnexpress.net/test.html").orElseThrow();
        assertEquals(1, article.blocks().size());
    }
}
