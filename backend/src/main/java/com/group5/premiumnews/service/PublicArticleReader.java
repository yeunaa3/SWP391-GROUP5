package com.group5.premiumnews.service;

import java.net.URI;
import java.util.*;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

/** Reads only the public article body. No cookies, login, scripts or paywall bypass. */
@Component
public class PublicArticleReader {
    public record Block(String type, String text, String url, String caption) {}
    public record Article(List<Block> blocks, String text, String author) {}
    private static final Map<String,String> BODIES = Map.of(
        "vnexpress.net", ".fck_detail",
        "tuoitre.vn", ".detail-content",
        "vietnamnet.vn", ".maincontent");

    public Optional<Article> fetch(String url) throws java.io.IOException {
        var uri = URI.create(url);
        if (!"https".equals(uri.getScheme()) || !BODIES.containsKey(uri.getHost()) || uri.getUserInfo() != null
                || (uri.getPort() != -1 && uri.getPort() != 443)) return Optional.empty();
        var response = Jsoup.connect(url).userAgent("ThePluse-StudentDemo/1.0 (public news reader)")
                .timeout(8000).maxBodySize(4_000_000).followRedirects(false).execute();
        if (response.statusCode() != 200) return Optional.empty();
        return parse(response.body(), url);
    }

    static Optional<Article> parse(String html, String url) {
        String selector = BODIES.get(URI.create(url).getHost());
        if (selector == null) return Optional.empty();
        var document = Jsoup.parse(html, url);
        if (!document.select("[class*=paywall], [id*=paywall], .premium-lock, .subscription-wall").isEmpty()) return Optional.empty();
        Element body = document.selectFirst(selector);
        if (body == null) return Optional.empty();
        String author = Optional.ofNullable(document.selectFirst("meta[name=author]")).map(e -> e.attr("content")).orElse("");
        body.select("script,style,iframe,video,audio,form,button,nav,.box-tinlienquan,.box-related,.related-news,.VCSortableInPreviewMode[type=RelatedNews],.ads,.advertisement").remove();
        List<Block> blocks = new ArrayList<>();
        Set<String> images = new HashSet<>();
        for (Element e : body.select("p,h2,h3,li,blockquote,img")) {
            if (e.tagName().equals("img")) {
                String src = "";
                for (String attr : List.of("data-original", "data-src", "data-original-src", "src")) {
                    String candidate = e.absUrl(attr);
                    if (safeImage(candidate)) { src = candidate; break; }
                }
                if (src.isEmpty() || !images.add(src)) continue;
                Element figure = e.closest("figure,table,.VCSortableInPreviewMode");
                Element caption = figure == null ? null : figure.selectFirst("figcaption,.Image,.PhotoCMS_Caption,.image-caption,.tplCaption");
                blocks.add(new Block("image", e.attr("alt"), src, caption == null ? "" : caption.text()));
            } else {
                // Captions belong to their image; nested quotations/list paragraphs are emitted once.
                if (e.closest("figcaption,.Image,.PhotoCMS_Caption,.image-caption,.tplCaption") != null
                        || !e.children().select("p,h2,h3,li,blockquote").isEmpty()) continue;
                String text = e.text().trim();
                if (!text.isEmpty()) blocks.add(new Block(e.tagName().startsWith("h") ? "heading" : "paragraph", text, null, null));
            }
        }
        String text = String.join("\n\n", blocks.stream().filter(b -> !b.type().equals("image")).map(Block::text).toList());
        if (text.length() < 200 || blocks.size() > 500) return Optional.empty();
        return Optional.of(new Article(List.copyOf(blocks), text, author.substring(0, Math.min(author.length(), 500))));
    }

    private static boolean safeImage(String value) {
        try {
            URI uri = URI.create(value);
            String host = uri.getHost();
            return "https".equals(uri.getScheme()) && uri.getUserInfo() == null && host != null
                && List.of("vnncdn.net", "vnecdn.net", "tuoitre.vn").stream().anyMatch(domain -> host.equals(domain) || host.endsWith("." + domain));
        } catch (IllegalArgumentException e) { return false; }
    }
}
