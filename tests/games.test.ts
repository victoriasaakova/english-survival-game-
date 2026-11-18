import { test } from "node:test";
import assert from "node:assert/strict";
import {
  games,
  criticBoard,
  boardModes,
  futureChapters,
  gameInstructions,
  updatedSkillRules,
} from "../lib/games.ts";
import { mergeLibrary, type Library } from "../lib/library.ts";
import { freshWorkspace, createLesson } from "../lib/workspace.ts";
import { activate, due, recordRecall } from "../lib/recall.ts";
test("canonical board stays seven characters with chosen names and seasonal December member", () => {
  assert.equal(criticBoard.length, 7);
  assert.equal(new Set(criticBoard.map((c) => c.id)).size, 7);
  assert.ok(
    criticBoard.some(
      (c) =>
        c.name === "The Chief Doom Officer (CDO)" &&
        c.line ===
          "Start feeling doomed today! Why waste time trying when you can give up in advance?",
    ),
  );
  assert.ok(
    criticBoard.find((c) => c.id === "december")!.tactic.includes("2026"),
  );
  assert.equal(boardModes.length, 7);
});
test("game-specific policies are distinct and use selected chapter or character", () => {
  const board = gameInstructions({
    id: "board",
    character: "tomorrow",
    mode: "Evidence Detective",
  });
  assert.ok(board.includes("Captain Tomorrow"));
  assert.ok(board.includes("Evidence Detective"));
  assert.ok(board.includes("1–3"));
  assert.ok(gameInstructions({ id: "scenario" }).includes("4–7"));
  assert.equal(futureChapters.length, 6);
  assert.ok(
    gameInstructions({ id: "future", chapter: "Evidence Vault" }).includes(
      "Evidence Vault",
    ),
  );
  assert.ok(updatedSkillRules.includes("B2 → C1"));
  assert.ok(updatedSkillRules.includes("Pending"));
});
test("private source import is idempotent and preserves existing roles, level, messages and edits", () => {
  const s = freshWorkspace();
  s.roles[0].instructions = "My own rules";
  const l = createLesson(s.roles[0], "Imported", "topic", "source", [], "");
  l.id = "source:test";
  const library: Library = {
    revision: "test-v1",
    lessons: [l],
    vocabulary: [
      {
        id: "w",
        lessonId: l.id,
        topic: "Career",
        expression: "take ownership of",
        meaning: "брать ответственность",
        example: "I take ownership of my work.",
        retrieval: "catalogue",
      },
    ],
    exercises: [],
    sources: [],
  };
  const once = mergeLibrary(s, library);
  once.vocabulary[0].meaning = "My edit";
  const twice = mergeLibrary(once, library);
  assert.equal(twice.lessons.length, 0);
  assert.equal(twice.vocabulary[0].meaning, "My edit");
  assert.equal(twice.vocabulary[0].lessonId, "");
  assert.equal(twice.roles[0].instructions, "My own rules");
  assert.equal(twice.level, "B2");
  assert.equal(twice.goal, "C1");
  assert.equal(twice.vocabulary[0].retrieval, "catalogue");

  assert.equal(twice.vocabulary[0].review, undefined);
  assert.equal(s.lessons.length, 0);
});
test("catalogue date is not a review date, assistance cannot establish independent mastery", () => {
  const w = {
    id: "w",
    lessonId: "source",
    topic: "Career",
    expression: "take ownership of",
    meaning: "ответственность",
    example: "I took ownership of delivery.",
    retrieval: "catalogue" as const,
  };
  assert.equal(due(w), null);
  const active = activate(w, "2026-11-18");
  assert.equal(due(active), "2026-11-19");
  const hinted = recordRecall(
    active,
    "2026-11-19",
    true,
    true,
    true,
    "A new example",
  );
  assert.deepEqual(hinted.review!.passed, []);
  assert.equal(hinted.retrieval, "catalogue");
  const passed = recordRecall(
    active,
    "2026-11-19",
    true,
    false,
    true,
    "I took ownership of the migration.",
  );
  assert.deepEqual(passed.review!.passed, [1]);
  assert.equal(passed.retrieval, "independent");
});

import {
  finishLesson,
  importReturnedLesson,
  parseReturnedLesson,
  noteSections,
} from "../lib/lesson-review.ts";
import { migrate } from "../lib/workspace.ts";
import { makePractice } from "../lib/practice.ts";

test("flow migration detaches historical sources and preserves learner drafts, vocabulary reviews and attempts", () => {
  const s = freshWorkspace();
  delete s.flowVersion;
  const empty = createLesson(
    s.roles[0],
    "context",
    "topic",
    "Импортированный конспект",
    [],
    "",
  );
  empty.id = "source:master:2026-11";
  s.lessons = [
    empty,
    { ...empty, id: "source:board:2026-11", draft: "My question" },
  ];
  s.vocabulary = [
    activate(
      {
        id: "w",
        lessonId: empty.id,
        topic: "Career",
        expression: "own the scope",
        meaning: "x",
        example: "I own the scope.",
      },
      "2026-11-10",
    ),
  ];
  s.exercises = [
    {
      id: "p",
      lessonId: empty.id,
      title: "My edited title",
      questions: [],
      answers: { q: "Original answer" },
      submitted: true,
    },
  ];
  const next = migrate(s);
  assert.deepEqual(
    next.lessons.map((l) => l.draft),
    ["My question"],
  );
  assert.equal(next.exercises[0].lessonId, "");
  assert.equal(next.exercises[0].answers.q, "Original answer");
  assert.equal(next.exercises[0].title, "My edited title");
  assert.deepEqual(next.vocabulary[0].review, s.vocabulary[0].review);
  assert.deepEqual(migrate(next), next);
});

test("three roles uses the learner's selected cast and role instructions", () => {
  const roles = freshWorkspace().roles.slice(0, 3);
  const instructions = gameInstructions({ id: "trio", roles });
  for (const role of roles) assert.ok(instructions.includes(role.instructions));
  assert.ok(instructions.includes("one perspective at a time"));
});

test("chat handoff validates, saves a structured note and links vocabulary, stories and one test to the actual lesson", () => {
  const s = freshWorkspace(),
    l = createLesson(s.roles[2], "My story", "Личное", "Три роли", [], "");
  s.lessons = [l];
  const raw = JSON.stringify({
    englishCoach: 1,
    turns: [{ author: "user", text: "I changed my mind." }],
    review: {
      sections: noteSections.map((title) => ({ title, text: "Review" })),
      summary: "Topic",
      roleFeedback: "Discussion",
      languageFeedback: "Language",
      nextLesson: "Next",
      entries: [
        {
          topic: "Личное",
          section: "Мои истории",
          title: "My story",
          text: "I changed my mind.",
          evidence: "I changed my mind.",
          kind: "Мои слова",
        },
      ],
      vocabulary: [
        {
          topic: "Choice",
          expression: "change my mind",
          meaning: "передумать",
          example: "I changed my mind.",
        },
      ],
    },
  });
  const parsed = parseReturnedLesson(raw)!;
  const next = importReturnedLesson(s, l.id, raw, parsed);
  assert.equal(next.lessons.length, 1);
  assert.equal(next.lessons[0].status, "completed");
  assert.equal(next.lessons[0].messages[0].origin, "ChatGPT");
  assert.equal(next.lessons[0].note?.summary, "Topic");
  for (const item of [...next.exercises, ...next.vocabulary, ...next.entries])
    assert.equal(item.lessonId, l.id);
  assert.equal(next.entries.length, 1);
  assert.equal(next.vocabulary.length, 1);
  assert.equal(next.exercises.length, 1);
  assert.equal(importReturnedLesson(next, l.id, raw, parsed), next);
  assert.equal(
    finishLesson(next, next.lessons[0], parsed.review).exercises.length,
    1,
  );
  assert.throws(() => parseReturnedLesson('{"englishCoach":1}'));
  assert.equal(parseReturnedLesson("# My Markdown"), null);
});

test("topic practice works without a lesson and self-checks cannot mark vocabulary as independently assessed", () => {
  const w = activate(
    {
      id: "w",
      lessonId: "",
      topic: "Career",
      expression: "set the scope",
      meaning: "определить объём",
      example: "I set the scope.",
    },
    "2026-11-10",
  );
  assert.equal(
    makePractice("grammar", "Career", "C1", [w])!.questions[0].answer,
    w.example,
  );
  assert.equal(makePractice("translation", "Elsewhere", "B2", [w]), undefined);
  assert.equal(makePractice("writing", "Career", "C1", [w])!.lessonId, "");
  const self = recordRecall(
    w,
    "2026-11-11",
    true,
    false,
    true,
    "We need to set the scope tomorrow.",
    "self",
  );
  assert.equal(self.review!.history[0].assessor, "self");
  assert.deepEqual(self.review!.passed, [1]);
  assert.notEqual(self.retrieval, "independent");
});
