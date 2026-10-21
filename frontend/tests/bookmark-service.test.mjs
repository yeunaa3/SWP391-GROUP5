import test from "node:test";
import assert from "node:assert/strict";
import {
  getBookmarks,
  removeBookmark,
  saveBookmark,
} from "../src/services/bookmarkService.js";

test("bookmark listing sends page parameters and session cookies", async context => {
  const calls = [];
  context.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ items: [], page: 2, hasNext: false }));
  });

  const controller = new AbortController();
  const result = await getBookmarks(2, 10, controller.signal);

  assert.deepEqual(result.items, []);
  assert.equal(calls[0].url, "/api/bookmarks?page=2&size=10");
  assert.equal(calls[0].options.credentials, "include");
  assert.equal(calls[0].options.signal, controller.signal);
});

test("save and remove use protected requests without accepting an owner ID", async context => {
  const calls = [];
  context.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return url.endsWith("/csrf")
      ? new Response(JSON.stringify({ token: "masked-test-token" }))
      : new Response(null, { status: 204 });
  });

  await saveBookmark(42);
  await removeBookmark(42);

  const mutations = calls.filter(call => !call.url.endsWith("/csrf"));
  assert.deepEqual(mutations.map(call => call.options.method), ["PUT", "DELETE"]);
  for (const { url, options } of mutations) {
    assert.equal(url, "/api/bookmarks/42");
    assert.equal(options.credentials, "include");
    assert.equal(options.headers["X-XSRF-TOKEN"], "masked-test-token");
    assert.equal(options.body, undefined);
  }
});

test("session errors propagate instead of returning demo bookmarks", async context => {
  context.mock.method(globalThis, "fetch", async () =>
    new Response(JSON.stringify({ message: "Sign in required" }), { status: 401 }),
  );

  await assert.rejects(getBookmarks(0, 10), error =>
    error.status === 401 && error.message === "Sign in required",
  );
});
