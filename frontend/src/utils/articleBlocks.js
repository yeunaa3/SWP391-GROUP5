export function articleBlocks(article, locked = false) {
  if (!locked && article.contentMode === "PUBLIC_TEXT" && article.contentBlocks) {
    try {
      const parsed = typeof article.contentBlocks === "string" ? JSON.parse(article.contentBlocks) : article.contentBlocks;
      if (Array.isArray(parsed)) {
        const blocks = parsed.filter(b => b && (b.type === "paragraph" || b.type === "heading" || b.type === "image")
          && (b.type === "image" ? /^https:\/\//.test(b.url || "") : typeof b.text === "string"));
        if (blocks.length) return blocks;
      }
    } catch { /* Old/malformed data uses the safe plain-text representation. */ }
  }
  return (article.content || article.summary || "").split("\n\n").filter(Boolean).map(text => ({ type: "paragraph", text }));
}
