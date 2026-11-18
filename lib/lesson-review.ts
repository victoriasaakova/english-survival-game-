import {
  applyAnalysis,
  bookSections,
  id,
  type Analysis,
  type Conversation,
  type Workspace,
} from "./workspace.ts";
import { makePractice } from "./practice.ts";

export const noteSections = [
  "Grammar Notes",
  "Core Vocabulary",
  "My Mistakes",
  "Speaking",
  "Writing",
  "Review",
] as const;
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const strings = (value: unknown, keys: string[]) =>
  object(value) && keys.every((k) => typeof value[k] === "string");

export function isAnalysis(value: unknown): value is Analysis {
  if (
    !object(value) ||
    !strings(value, [
      "summary",
      "roleFeedback",
      "languageFeedback",
      "nextLesson",
    ])
  )
    return false;
  if (
    !Array.isArray(value.vocabulary) ||
    !value.vocabulary.every((w) =>
      strings(w, ["topic", "expression", "meaning", "example"]),
    )
  )
    return false;
  if (
    !Array.isArray(value.entries) ||
    !value.entries.every(
      (e) =>
        strings(e, ["topic", "title", "text", "kind", "evidence"]) &&
        ["Мои слова", "Вывод ИИ", "Карьерный материал"].includes(e.kind) &&
        (e.section === undefined || bookSections.includes(e.section)),
    )
  )
    return false;
  if (
    !Array.isArray(value.sections) ||
    !value.sections.every((s) => strings(s, ["title", "text"]))
  )
    return false;
  const sections = value.sections;
  return noteSections.every((title, i) => sections[i]?.title === title);
}

export function finishLesson(
  state: Workspace,
  lesson: Conversation,
  analysis?: Analysis,
): Workspace {
  const next = analysis
    ? applyAnalysis(state, lesson.id, analysis, lesson.messages.length)
    : state;
  const test = next.exercises.some((e) => e.lessonId === lesson.id)
    ? undefined
    : makePractice(
        "grammar",
        lesson.topic,
        state.goal,
        next.vocabulary,
        lesson,
      ) ||
      makePractice(
        "writing",
        lesson.topic,
        state.goal,
        next.vocabulary,
        lesson,
      );
  return {
    ...next,
    lessons: next.lessons.map((l) =>
      l.id === lesson.id ? { ...l, status: "completed" } : l,
    ),
    exercises: test ? [...next.exercises, test] : next.exercises,
  };
}

export const returnFormat = `At the end, return a single JSON object for the learner to paste into english coach. Keys: englishCoach:1, turns:[{author:"user"|"assistant",text:string}], review:{summary:string,languageFeedback:string,roleFeedback:string,nextLesson:string,sections:[{title:string,text:string}],vocabulary:[{topic:string,expression:string,meaning:string,example:string}],entries:[{section:"Мои истории"|"Убеждения и рефрейминги"|"Карьерные материалы"|"Видение будущего",topic:string,title:string,text:string,kind:"Мои слова"|"Вывод ИИ"|"Карьерный материал",evidence:string}]}. Include only verbatim new turns you can actually access in this chat, no reconstruction. If no transcript is available provide ordinary Markdown instead. Use the six section titles in this exact order: ${noteSections.join(", ")}. Use an exact user quote as evidence for each personal item. Only extract actual lesson vocabulary. Give analysis in Russian with English examples.`;

export function parseReturnedLesson(text: string) {
  const raw = text
    .trim()
    .replace(/^\x60\x60\x60(?:json)?\s*/i, "")
    .replace(/\s*\x60\x60\x60$/, "");
  if (!raw.startsWith("{")) return null;
  const value: unknown = JSON.parse(raw);
  if (
    !object(value) ||
    value.englishCoach !== 1 ||
    !Array.isArray(value.turns) ||
    !value.turns.every(
      (m) =>
        object(m) &&
        ["user", "assistant"].includes(String(m.author)) &&
        typeof m.text === "string" &&
        m.text.trim(),
    ) ||
    !value.turns.some((m) => m.author === "user") ||
    !isAnalysis(value.review)
  )
    throw Error("Проверьте формат экспорта english coach.");
  return {
    turns: value.turns as { author: "assistant" | "user"; text: string }[],
    review: value.review,
  };
}
export function importReturnedLesson(
  state: Workspace,
  lessonId: string,
  raw: string,
  parsed: NonNullable<ReturnType<typeof parseReturnedLesson>>,
) {
  const previous = state.lessons.find((l) => l.id === lessonId);
  if (!previous || previous.voiceImports?.includes(raw)) return state;
  const at = new Date().toISOString();
  const messages = parsed.turns.map((m) => ({
    ...m,
    id: id(),
    at,
    origin: "ChatGPT" as const,
  }));
  const lesson = {
    ...previous,
    messages: [...previous.messages, ...messages],
    voiceImports: [...(previous.voiceImports || []), raw],
  };
  return finishLesson(
    {
      ...state,
      lessons: state.lessons.map((l) => (l.id === lessonId ? lesson : l)),
    },
    lesson,
    parsed.review,
  );
}
