/**
 * ============================================================================
 * [BF-01] ARTICLE BLOCKS PARSER & ACCESS GUARD
 * Phụ trách: Cường (Phân tách khối bài viết & Khóa nội dung đối với Free Reader)
 * 
 * Logic phân quyền hiển thị:
 * 1. Nếu locked = true (Free Reader / Chưa mua gói Premium):
 *    - Không giải mã JSON khối bài gốc (contentBlocks).
 *    - Chỉ trả về đoạn trích xem trước (preview) hoặc tóm tắt.
 * 2. Nếu locked = false (Subscriber / Đã mua gói Premium):
 *    - Giải mã toàn bộ khối JSON (contentBlocks) gồm paragraphs, headings, hình ảnh gốc.
 * ============================================================================
 */
export function articleBlocks(article, locked = false) {
  if (!locked && article.contentMode === "PUBLIC_TEXT" && article.contentBlocks) {
    try {
      const parsed =
        typeof article.contentBlocks === "string"
          ? JSON.parse(article.contentBlocks)
          : article.contentBlocks;

      if (Array.isArray(parsed)) {
        const blocks = parsed.filter(
          (b) =>
            b &&
            (b.type === "paragraph" || b.type === "heading" || b.type === "image") &&
            (b.type === "image" ? /^https:\/\//.test(b.url || "") : typeof b.text === "string")
        );
        if (blocks.length) return blocks;
      }
    } catch {
      // Dữ liệu cũ hoặc không khớp định dạng JSON sẽ dùng chuỗi văn bản an toàn bên dưới
    }
  }

  // Dành cho bài viết bị khóa hoặc chế độ xem trước plain-text
  return (article.content || article.summary || "")
    .split("\n\n")
    .filter(Boolean)
    .map((text) => ({ type: "paragraph", text }));
}
