import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorker, type Bucket } from "../hosting/worker.ts";
import { freshWorkspace, createLesson } from "../lib/workspace.ts";
import { exchangeWorkspace } from "../lib/workspace-sync.ts";
import { noteSections } from "../lib/lesson-review.ts";
class MemoryBucket implements Bucket {
  data = new Map<string, { etag: string; body: string }>();
  revision = 0;
  async head(k: string) {
    const v = this.data.get(k);
    return v ? { httpEtag: v.etag } : null;
  }
  async get(k: string) {
    const v = this.data.get(k);
    return v ? { httpEtag: v.etag, body: new Response(v.body).body! } : null;
  }
  async put(k: string, body: string, opt: { onlyIf: Headers }) {
    const v = this.data.get(k);
    if (
      (opt.onlyIf.get("If-None-Match") === "*" && v) ||
      (opt.onlyIf.has("If-Match") && opt.onlyIf.get("If-Match") !== v?.etag)
    )
      return null;
    const etag = '"' + ++this.revision + '"';
    this.data.set(k, { etag, body });
    return { httpEtag: etag };
  }
}
const site = createWorker({
  "/index.html": { text: "app", mime: "text/html" },
});
function session(
  env: { BUCKET: Bucket; OPENAI_API_KEY?: string },
  user = "learner",
): typeof fetch {
  return async (path, init = {}) => {
    const headers = new Headers(init.headers);
    if (user) headers.set("oai-authenticated-user-id", user);
    return site.fetch(
      new Request("https://coach.test" + path, { ...init, headers }),
      env,
    );
  };
}
test("role and game reach the model; disabled access and quota cause explicit errors", async () => {
  const env = { BUCKET: new MemoryBucket(), OPENAI_API_KEY: "test-fixture" },
    request = session(env),
    state = freshWorkspace();
  const lesson = createLesson(
    state.roles[0],
    "My job",
    "Career",
    "Roast",
    ["Speaking"],
    "",
  );
  lesson.game = { id: "board" };
  lesson.messages = [
    {
      id: "m",
      at: new Date().toISOString(),
      author: "user",
      text: "Roast my critic.",
    },
  ];
  const init = {
    method: "POST",
    body: JSON.stringify({ task: "chat", lesson }),
  };
  assert.equal((await session(env, "")("/api/lesson", init)).status, 401);
  assert.equal(
    (await session({ BUCKET: env.BUCKET })("/api/lesson", init)).status,
    503,
  );
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, opts) => {
      assert.equal(String(url), "https://api.openai.com/v1/chat/completions");
      const payload = JSON.parse(String(opts?.body));
      assert.match(payload.messages[0].content, /INNER CRITIC BOARD/);
      const body = JSON.parse(payload.messages[1].content);
      assert.equal(body.lesson.role.instructions, state.roles[0].instructions);
      assert.equal(body.lesson.messages[0].text, "Roast my critic.");
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({ reply: "What does your critic say?" }),
            },
          },
        ],
      });
    };
    assert.equal(
      (await (await request("/api/lesson", init)).json()).reply,
      "What does your critic say?",
    );
    globalThis.fetch = async () =>
      Response.json({ error: { code: "insufficient_quota" } }, { status: 429 });
    assert.match(
      (await (await request("/api/lesson", init)).json()).error,
      /баланс/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("two devices share one account, retain concurrent messages, propagate deletions and isolate a second account", async () => {
  const env = { BUCKET: new MemoryBucket() },
    req = session(env),
    seed = freshWorkspace(),
    phone = structuredClone(seed);
  const l = createLesson(seed.roles[0], "Phone", "Work", "Chat", [], "");
  phone.lessons.push(l);
  const first = await exchangeWorkspace(phone, undefined, seed, req);
  const laptop = await exchangeWorkspace(
    structuredClone(seed),
    undefined,
    seed,
    req,
  );
  assert.equal(laptop.state.lessons[0].id, l.id);
  const a = structuredClone(first.state),
    b = structuredClone(laptop.state),
    at = new Date().toISOString();
  a.lessons[0].messages.push({ id: "a", author: "user", text: "phone", at });
  b.lessons[0].messages.push({ id: "b", author: "user", text: "laptop", at });
  await exchangeWorkspace(a, first, seed, req);
  const merged = await exchangeWorkspace(b, laptop, seed, req);
  assert.deepEqual(
    merged.state.lessons[0].messages.map((m) => m.id),
    ["a", "b"],
  );
  assert.equal(
    (
      await req("/api/workspace", {
        method: "PUT",
        headers: { "If-Match": first.etag },
        body: JSON.stringify(a),
      })
    ).status,
    412,
  );
  assert.equal((await session(env, "other")("/api/workspace")).status, 404);
  const edited = structuredClone(merged.state);
  edited.roles.pop();
  await exchangeWorkspace(edited, merged, seed, req);
  assert.equal(
    (await exchangeWorkspace(merged.state, merged, seed, req)).state.roles
      .length,
    3,
  );
});
test("ChatGPT project save is authenticated, idempotent and immediately visible to the website", async () => {
  const env = { BUCKET: new MemoryBucket() },
    req = session(env);
  const call = async (name: string, args: object) =>
    (
      await (
        await req("/mcp", {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name, arguments: args },
          }),
        })
      ).json()
    ).result;
  const args = {
    source_key: "demo",
    title: "Reflection",
    topic: "Career",
    mode: "Роастер убеждений",
    role: "coach",
    game: "board",
    turns: [{ author: "user", text: "I want to apply." }],
    review: {
      summary: "Reflection",
      languageFeedback: "One sample.",
      roleFeedback: "Discussed work.",
      nextLesson: "Follow up.",
      sections: noteSections.map((title) => ({ title, text: "Pending" })),
      vocabulary: [
        {
          expression: "apply",
          meaning: "подать заявку",
          topic: "Career",
          example: "I want to apply.",
        },
      ],
      entries: [],
    },
  };
  assert.ok(!(await call("save_english_lesson", args)).isError);
  assert.ok(!(await call("save_english_lesson", args)).isError);
  const state = await (await req("/api/workspace")).json();
  assert.equal(state.lessons.length, 1);
  assert.equal(state.lessons[0].messages.length, 1);
  assert.equal(state.vocabulary.length, 1);
  const id = state.lessons[0].id,
    pending = state.lessons[0].messages[0].id;
  const reply = {
    lesson_id: id,
    in_reply_to: pending,
    reply: "Which role are you considering?",
  };
  await call("reply_to_english_lesson", reply);
  await call("reply_to_english_lesson", reply);
  const result = JSON.parse(
    (await call("get_english_lesson", { lesson_id: id })).content[0].text,
  );
  assert.equal(result.lesson.messages.length, 2);
  assert.equal(result.lesson.messages[1].text, reply.reply);
});
