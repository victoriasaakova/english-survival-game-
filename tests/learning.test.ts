import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextDue,
  reviewWord,
  addDays,
  completeQuest,
  initialState,
  addWord,
  type Word,
} from "../lib/learning.ts";
const word = (): Word => ({
  id: "word",
  expression: "I enjoy",
  meaning: "Мне нравится",
  example: "I enjoy reading.",
  introduced: "2026-11-01",
  passed: [],
  retry: null,
  reviews: [],
});
test("dates use fixed introduction offsets across month boundaries", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  let w = reviewWord(
    word(),
    "2026-11-02",
    true,
    false,
    true,
    "I enjoy walking.",
  );
  assert.equal(nextDue(w), "2026-11-04");
});
test("overdue review advances only one milestone and cannot cram stages", () => {
  let w = reviewWord(word(), "2026-11-20", true, false, true, "I enjoy art.");
  assert.deepEqual(w.passed, [1]);
  assert.equal(nextDue(w), "2026-11-21");
  w = reviewWord(w, "2026-11-20", true, false, true, "I enjoy dance.");
  assert.deepEqual(w.passed, [1]);
});
test("hints and copied answers schedule retry without advancing", () => {
  for (const [assisted, novel] of [
    [true, true],
    [false, false],
  ]) {
    const w = reviewWord(
      word(),
      "2026-11-02",
      true,
      assisted,
      novel,
      "example",
    );
    assert.deepEqual(w.passed, []);
    assert.equal(nextDue(w), "2026-11-03");
  }
});
test("early practice does not count as delayed retrieval", () => {
  const w = reviewWord(
    word(),
    "2026-11-01",
    true,
    false,
    true,
    "I enjoy games.",
  );
  assert.deepEqual(w.passed, []);
});
test("failure after completed cycle preserves history and restarts cycle", () => {
  const w = word();
  w.passed = [1, 3, 7, 14];
  w.reviews = [{ date: "2026-11-15", success: true, evidence: "original" }];
  const out = reviewWord(w, "2026-11-20", false, false, true, "forgot");
  assert.equal(out.introduced, "2026-11-20");
  assert.equal(out.reviews.length, 2);
  assert.equal(nextDue(out), "2026-11-21");
  assert.equal(w.reviews.length, 1);
});
test("backdated review is rejected", () =>
  assert.throws(() =>
    reviewWord(word(), "2026-10-31", true, false, true, "x"),
  ));
test("replayed quest completion cannot award duplicate XP", () => {
  const s = completeQuest(initialState, 0);
  assert.equal(completeQuest(s, 0).xp, 50);
  assert.equal(initialState.xp, 0);
});
test("reintroduced expression keeps review progress", () => {
  let s = addWord(initialState, "I enjoy", "meaning", "example");
  s.words[0].passed = [1];
  s = addWord(s, " i ENJOY ", "meaning", "example");
  assert.equal(s.words.length, 1);
  assert.deepEqual(s.words[0].passed, [1]);
});

// Routes share this guard; missing configuration must fail closed before API calls.
test("AI access fails closed without cloud configuration", async () => {
  const { authorize } = await import("../lib/server.ts");
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const response = await authorize(
      new Request("https://example.com/api/coach", { method: "POST" }),
    );
    assert.equal(response?.status, 503);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-public-key";
    const noToken = await authorize(
      new Request("https://example.com/api/coach", { method: "POST" }),
    );
    assert.equal(noToken?.status, 401);
  } finally {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
  }
});
