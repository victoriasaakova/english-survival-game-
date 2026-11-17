import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freshWorkspace,
  migrate,
  createLesson,
  applyAnalysis,
  streak,
  defaultRoles,
  type Analysis,
} from "../lib/workspace.ts";
test("personal defaults are B2 to C1, roles can be changed independently", () => {
  const a = freshWorkspace(),
    b = freshWorkspace();
  assert.equal(a.level, "B2");
  assert.equal(a.goal, "C1");
  assert.equal(a.roles.length, 3);
  a.roles[0].name = "Custom";
  assert.notEqual(a.roles[0].name, b.roles[0].name);
});
test("lesson snapshots role instructions and retains custom format and request", () => {
  const role = structuredClone(defaultRoles[0]);
  const l = createLesson(
    role,
    "Interview",
    "Product",
    "Мой формат",
    ["Лексика"],
    "Challenge my answers",
  );
  role.instructions = "Changed";
  assert.notEqual(l.role.instructions, role.instructions);
  assert.equal(l.request, "Challenge my answers");
  assert.equal(l.format, "Мой формат");
});
test("v1 migration preserves raw archive, original conversation, vocabulary, stories and draft", () => {
  const old = {
    version: 1,
    name: "Me",
    lessons: [
      {
        id: "l",
        quest: 0,
        complete: true,
        started: "2026-11-01",
        draft: "draft",
        attempts: [
          {
            id: "a",
            answer: "My story",
            feedback: "Correction",
            date: "2026-11-01",
          },
        ],
      },
    ],
    words: [
      {
        id: "w",
        expression: "nuance",
        meaning: "оттенок",
        example: "A subtle nuance.",
      },
    ],
    chapters: [
      {
        id: "c",
        title: "Career",
        text: "Polished",
        original: "Original",
        created: "2026-11-01",
      },
    ],
  };
  const n = migrate(old);
  assert.deepEqual(n.legacy, old);
  assert.equal(n.level, "B2");
  assert.equal(n.lessons[0].messages.length, 2);
  assert.equal(n.lessons[0].draft, "draft");
  assert.equal(n.entries[0].evidence, "Original");
  assert.equal(n.vocabulary[0].expression, "nuance");
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(n))), n);
});
test("invalid backup is rejected", () => {
  assert.throws(() => migrate({ version: 2 }));
  assert.throws(() => migrate({ version: 7 }));
  assert.throws(() => migrate(null));
});
test("analysis requires exact user evidence, replaces generated records and preserves manual notes", () => {
  let s = freshWorkspace();
  const l = createLesson(s.roles[0], "Story", "Career", "Dialogue", [], "");
  l.messages = [
    {
      id: "m",
      author: "user",
      text: "I led a team of four.",
      at: "2026-11-17",
    },
  ];
  s.lessons = [l];
  s.entries = [
    {
      id: "manual",
      lessonId: l.id,
      title: "Manual",
      text: "Keep",
      topic: "Career",
      kind: "Мои слова",
      evidence: "Keep",
      created: "2026-11-17",
    },
  ];
  const a: Analysis = {
    summary: "Summary",
    languageFeedback: "Language",
    roleFeedback: "Content",
    nextLesson: "Next",
    vocabulary: [
      {
        topic: "Career",
        expression: "led a team",
        meaning: "руководила командой",
        example: "I led a team of four.",
      },
    ],
    entries: [
      {
        topic: "Career",
        title: "Career story",
        text: "Team lead",
        kind: "Карьерный материал",
        evidence: "I led a team of four.",
      },
      {
        topic: "Career",
        title: "Invented",
        text: "CEO",
        kind: "Вывод ИИ",
        evidence: "I am a CEO.",
      },
    ],
  };
  s = applyAnalysis(s, l.id, a);
  s = applyAnalysis(s, l.id, a);
  assert.equal(s.vocabulary.length, 1);
  assert.equal(s.entries.length, 2);
  assert.ok(s.entries.some((e) => e.id === "manual"));
  assert.ok(!s.entries.some((e) => e.title === "Invented"));
  assert.equal(s.lessons[0].note?.sourceCount, 1);
});
test("streak counts user activity, not assistant replies or XP; yesterday remains current", () => {
  const s = freshWorkspace(),
    l = createLesson(s.roles[0], "x", "x", "x", [], "");
  l.messages = [
    { id: "1", author: "user", text: "one", at: "2026-11-15T12:00:00" },
    { id: "2", author: "user", text: "two", at: "2026-11-16T12:00:00" },
    { id: "3", author: "assistant", text: "three", at: "2026-11-17T12:00:00" },
  ];
  assert.equal(streak([l], new Date("2026-11-17T18:00:00")), 2);
  assert.equal(streak([l], new Date("2026-11-19T18:00:00")), 0);
});
