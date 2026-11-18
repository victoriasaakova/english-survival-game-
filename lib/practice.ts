import {
  id,
  type Conversation,
  type Exercise,
  type Question,
  type Vocabulary,
} from "./workspace.ts";

export function makePractice(
  kind: Question["kind"],
  topic: string,
  level: string,
  words: Vocabulary[],
  lesson?: Conversation,
): Exercise | undefined {
  const pool = words.filter((w) =>
    lesson ? w.lessonId === lesson.id : w.topic === topic,
  );
  const advanced = level === "C1" || level === "C2";
  // Longer source sentences retain subordinate clauses for advanced reconstruction.
  if (advanced)
    pool.sort(
      (a, b) => b.example.split(/\s+/).length - a.example.split(/\s+/).length,
    );
  const questions: Question[] = [];
  if (kind === "grammar") {
    const examples = pool.map((w) => w.example).filter(Boolean);
    for (const example of examples.slice(0, 4)) {
      const tokens = example.trim().split(/\s+/);
      if (tokens.length < 3) continue;
      const cut = Math.ceil(tokens.length / 2);
      questions.push({
        id: id(),
        kind,
        prompt:
          "Соберите предложение: " +
          [...tokens.slice(cut), ...tokens.slice(0, cut)].join(" / "),
        answer: example,
      });
    }
  } else if (kind === "translation") {
    for (const word of pool.slice(0, 4))
      questions.push({
        id: id(),
        kind,
        prompt:
          "Переведите «" +
          word.meaning +
          (advanced
            ? "» и используйте в новом предложении, передав оттенок значения в контексте темы."
            : "» и используйте в новом предложении."),
        answer: word.expression,
      });
  } else {
    const detail =
      lesson?.messages.filter((m) => m.author === "user").at(-1)?.text ||
      pool[0]?.expression ||
      topic;
    questions.push({
      id: id(),
      kind,
      prompt:
        "Write a short essay on “" +
        topic +
        "”. Develop your point with a concrete example" +
        (advanced ? " and address a counterargument" : "") +
        ". Use this as your starting point: " +
        detail,
    });
  }
  if (!questions.length) return;
  const label = {
    grammar: "Порядок слов",
    translation: "Перевод",
    writing: "Письменная практика",
  }[kind];
  return {
    id: id(),
    lessonId: lesson?.id || "",
    topic,
    level,
    title: label + " · " + topic,
    questions,
    answers: {},
    submitted: false,
  };
}
