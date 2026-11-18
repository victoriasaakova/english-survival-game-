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
  once.lessons[0].draft = "My edit";
  const twice = mergeLibrary(once, library);
  assert.equal(twice.lessons.length, 1);
  assert.equal(twice.lessons[0].draft, "My edit");
  assert.equal(twice.roles[0].instructions, "My own rules");
  assert.equal(twice.level, "B2");
  assert.equal(twice.goal, "C1");
  assert.equal(twice.vocabulary[0].retrieval, "catalogue");
  assert.equal(twice.lessons[0].messages.length, 0);
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
