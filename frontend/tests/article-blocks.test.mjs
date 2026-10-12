import test from "node:test";
import assert from "node:assert/strict";
import { articleBlocks } from "../src/utils/articleBlocks.js";

test("renders ordered text, heading and image blocks without importing source HTML", () => {
  const blocks = [{ type: "paragraph", text: "Tin thử" }, { type: "image", url: "https://static-images.vnncdn.net/demo.jpg", caption: "Chú thích" }, { type: "heading", text: "Tiếp theo" }];
  assert.deepEqual(articleBlocks({ contentMode: "PUBLIC_TEXT", contentBlocks: JSON.stringify(blocks) }), blocks);
});
test("locked article cannot expose full blocks; malformed data falls back to text", () => {
  const article = { contentMode: "PUBLIC_TEXT", contentBlocks: JSON.stringify([{ type: "paragraph", text: "FULL PRIVATE" }]), content: "Allowed preview" };
  assert.deepEqual(articleBlocks(article, true), [{ type: "paragraph", text: "Allowed preview" }]);
  assert.deepEqual(articleBlocks({ ...article, contentBlocks: "bad" }), [{ type: "paragraph", text: "Allowed preview" }]);
  assert.deepEqual(articleBlocks({ contentMode: "PUBLIC_TEXT", contentBlocks: '[{"type":"image","url":"javascript:alert(1)"}]' }), []);
});
