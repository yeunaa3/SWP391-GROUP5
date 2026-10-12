package com.group5.premiumnews.service;

import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.io.StringReader;
import java.util.List;
import javax.xml.parsers.DocumentBuilderFactory;
import org.xml.sax.InputSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.junit.jupiter.api.Assertions.*;

/** Opt-in read-only smoke check. Never starts Spring or connects to MySQL. */
@EnabledIfEnvironmentVariable(named="PUBLIC_NEWS_SMOKE", matches="true")
class PublicArticleLiveTests {
    @Test void checksCurrentPublicArticlesWithoutDatabase() throws Exception {
        var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NORMAL).build();
        int readable = 0;
        for (String host : List.of("vietnamnet.vn", "vnexpress.net", "tuoitre.vn")) {
            try {
                String feed = host.equals("vietnamnet.vn") ? "/rss/thoi-su.rss" : "/rss/tin-moi-nhat.rss";
                var response = client.send(HttpRequest.newBuilder(URI.create("https://"+host+feed)).timeout(Duration.ofSeconds(20))
                        .header("User-Agent", "ThePluse-StudentDemo/1.0 (RSS reader)").GET().build(), HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200 || response.body().isBlank()) {
                    System.out.println("PUBLIC SOURCE " + host + ": RSS unavailable (HTTP " + response.statusCode() + ")");
                    continue;
                }
                var factory = DocumentBuilderFactory.newInstance();
                factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
                factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
                factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
                factory.setExpandEntityReferences(false);
                var document = factory.newDocumentBuilder().parse(new InputSource(new StringReader(response.body())));
                var item = (org.w3c.dom.Element) document.getElementsByTagName("item").item(0);
                String url = item.getElementsByTagName("link").item(0).getTextContent().trim();
                var article = new PublicArticleReader().fetch(url);
                if (article.isPresent()) {
                    readable++;
                    var data = article.get();
                    System.out.printf("PUBLIC SOURCE %s: paragraphs=%d images=%d characters=%d%n", host,
                        data.blocks().stream().filter(b -> !b.type().equals("image")).count(),
                        data.blocks().stream().filter(b -> b.type().equals("image")).count(), data.text().length());
                } else System.out.println("PUBLIC SOURCE " + host + ": RSS fallback (no readable public body)");
            } catch (Exception e) { System.out.println("PUBLIC SOURCE " + host + ": unavailable (" + e.getClass().getSimpleName() + ")"); }
        }
        assertTrue(readable > 0, "No public source could be verified; check connectivity or article selectors");
    }
}
