import type { GameConfig } from "./games";
export type Role = {
  id: string;
  name: string;
  description: string;
  instructions: string;
};
export type Message = {
  id: string;
  author: "user" | "assistant";
  text: string;
  at: string;
};
export type Entry = {
  id: string;
  lessonId: string;
  topic: string;
  title: string;
  text: string;
  kind: "Мои слова" | "Вывод ИИ" | "Карьерный материал" | "Письменная работа";
  evidence: string;
  created: string;
};
export type Vocabulary = {
  id: string;
  lessonId: string;
  topic: string;
  expression: string;
  meaning: string;
  example: string;
  source?: string;
  priority?: boolean;
  retrieval?: "catalogue" | "recognized" | "independent";
  review?: {
    introduced: string;
    passed: number[];
    retry: string | null;
    history: { date: string; success: boolean; evidence: string }[];
  };
};
export type Question = {
  id: string;
  kind: "grammar" | "translation" | "writing";
  prompt: string;
  answer?: string;
  explanation?: string;
};
export type Exercise = {
  id: string;
  lessonId: string;
  title: string;
  questions: Question[];
  answers: Record<string, string>;
  submitted: boolean;
  feedback?: string;
};
export type Note = {
  summary: string;
  languageFeedback: string;
  roleFeedback: string;
  nextLesson: string;
  sourceCount: number;
  sections?: { title: string; text: string }[];
};
export type Conversation = {
  id: string;
  title: string;
  topic: string;
  role: Role;
  format: string;
  focus: string[];
  request: string;
  created: string;
  status: "active" | "completed";
  messages: Message[];
  draft: string;
  note?: Note;
  parentId?: string;
  game?: GameConfig;
  duration?: 15 | 30;
  referenceText?: string;
  referenceSource?: string;
};
export type Workspace = {
  version: 2;
  level: string;
  goal: string;
  name: string;
  rules: string;
  roles: Role[];
  lessons: Conversation[];
  vocabulary: Vocabulary[];
  entries: Entry[];
  exercises: Exercise[];
  legacy?: unknown;
  importedSources?: string[];
};
export const defaultRoles: Role[] = [
  {
    id: "career",
    name: "Рекрутер / продакт",
    description: "Собеседования, профессиональные истории, рабочий английский.",
    instructions:
      "Act as a recruiter or product manager depending on my request. Simulate realistic interviews, challenge vague answers, ask follow-up questions, help with product reasoning, presentations and career narratives. Separate feedback on English from feedback on the substance. Do not invent my career achievements.",
  },
  {
    id: "personal",
    name: "Личный собеседник",
    description: "Мои истории, отношения, психология и видение себя.",
    instructions:
      "Discuss my personal stories, relationships, psychology and self-image in depth. Ask thoughtful questions without assuming facts. Help me articulate nuance in English. Do not diagnose me or present interpretations as established facts.",
  },
  {
    id: "coach",
    name: "Селф-коуч",
    description: "Убеждения, рефрейминг, будущая я и выбранные мной игры.",
    instructions:
      "Help me examine beliefs, reframe situations and imagine my future self. If I request a roast, challenge the belief directly, not my worth. Distinguish what I said from your hypotheses. Follow the game or exercise I choose; do not impose one.",
  },
];
export function freshWorkspace(): Workspace {
  return {
    version: 2,
    level: "B2",
    goal: "C1",
    name: "",
    rules:
      "Общайся на английском на уровне B2–C1. Я сама задаю тему и могу менять ход занятия. Объясняй сложные исправления по-русски, когда я прошу. Исправляй конкретно, без автоматической похвалы. Не упрощай до начального уровня.",
    roles: structuredClone(defaultRoles),
    lessons: [],
    vocabulary: [],
    entries: [],
    exercises: [],
  };
}
export function id() {
  return crypto.randomUUID();
}
export function migrate(value: unknown): Workspace {
  if (!value || typeof value !== "object")
    throw Error("Некорректная резервная копия");
  const v = value as Record<string, unknown>;
  if (v.version === 2) {
    validateWorkspace(v);
    return v as unknown as Workspace;
  }
  if (
    v.version !== 1 ||
    !Array.isArray(v.lessons) ||
    !Array.isArray(v.words) ||
    !Array.isArray(v.chapters)
  )
    throw Error("Неизвестный формат данных");
  const s = freshWorkspace();
  s.legacy = value;
  s.name = typeof v.name === "string" ? v.name : "";
  const titles = [
    "Привет, это я",
    "Мой обычный день",
    "То, что я люблю",
    "Важный момент",
    "Одна моя мечта",
  ];
  s.lessons = v.lessons.map((l) => ({
    id: l.id,
    title: titles[l.quest] || "Сохранённый урок",
    topic: "Архив первой версии",
    role: structuredClone(defaultRoles[1]),
    format: "Архив",
    focus: [],
    request: "",
    created: l.started,
    status: l.complete ? "completed" : "active",
    draft: l.draft || "",
    messages: (l.attempts || []).flatMap(
      (a: { id: string; answer: string; feedback?: string; date: string }) => [
        { id: a.id, author: "user" as const, text: a.answer, at: a.date },
        ...(a.feedback
          ? [
              {
                id: a.id + "-feedback",
                author: "assistant" as const,
                text: a.feedback,
                at: a.date,
              },
            ]
          : []),
      ],
    ),
  }));
  s.vocabulary = v.words.map((w) => ({
    id: w.id,
    lessonId: "",
    topic: "Архив первой версии",
    expression: w.expression,
    meaning: w.meaning,
    example: w.example,
  }));
  s.entries = v.chapters.map((c) => ({
    id: c.id,
    lessonId: "",
    topic: "Архив первой версии",
    title: c.title,
    text: c.text,
    evidence: c.original || "",
    kind: "Письменная работа",
    created: c.created,
  }));
  return s;
}
export function validateWorkspace(v: Record<string, unknown>) {
  for (const key of ["roles", "lessons", "vocabulary", "entries", "exercises"])
    if (!Array.isArray(v[key])) throw Error("Повреждён раздел " + key);
  for (const key of ["level", "goal", "name", "rules"])
    if (typeof v[key] !== "string") throw Error("Повреждён профиль");
  for (const l of v.lessons as Conversation[])
    if (
      !l.id ||
      !Array.isArray(l.messages) ||
      !l.role ||
      typeof l.draft !== "string" ||
      l.messages.some(
        (m) =>
          !["user", "assistant"].includes(m.author) ||
          typeof m.text !== "string",
      )
    )
      throw Error("Повреждён урок");
}
export function dateKey(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function streak(lessons: Conversation[], now = new Date()) {
  const days = new Set(
    lessons.flatMap((l) =>
      l.messages.filter((m) => m.author === "user").map((m) => dateKey(m.at)),
    ),
  );
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  if (!days.has(dateKey(d.toISOString()))) d.setDate(d.getDate() - 1);
  let count = 0;
  while (days.has(dateKey(d.toISOString()))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
export function createLesson(
  role: Role,
  title: string,
  topic: string,
  format: string,
  focus: string[],
  request: string,
  parentId?: string,
): Conversation {
  return {
    id: id(),
    role: structuredClone(role),
    title,
    topic,
    format,
    focus,
    request,
    parentId,
    created: new Date().toISOString(),
    status: "active",
    messages: [],
    draft: "",
  };
}
export type Analysis = {
  sections?: { title: string; text: string }[];
  summary: string;
  languageFeedback: string;
  roleFeedback: string;
  nextLesson: string;
  vocabulary: {
    topic: string;
    expression: string;
    meaning: string;
    example: string;
  }[];
  entries: {
    topic: string;
    title: string;
    text: string;
    kind: Entry["kind"];
    evidence: string;
  }[];
};
export function applyAnalysis(
  s: Workspace,
  lessonId: string,
  a: Analysis,
  sourceCount?: number,
): Workspace {
  const lesson = s.lessons.find((l) => l.id === lessonId);
  if (!lesson) throw Error("Урок не найден");
  const userText = lesson.messages
    .filter((m) => m.author === "user")
    .map((m) => m.text)
    .join("\n");
  const vocabulary = a.vocabulary
    .filter((w) => w.expression.trim())
    .filter(
      (w, i, arr) =>
        arr.findIndex(
          (o) =>
            o.expression.trim().toLowerCase() ===
              w.expression.trim().toLowerCase() && o.topic === w.topic,
        ) === i,
    )
    .map((w) => ({ ...w, id: id(), lessonId }));
  const entries = a.entries
    .filter((e) => e.evidence.trim() && userText.includes(e.evidence))
    .map((e) => ({
      ...e,
      id: "analysis:" + id(),
      lessonId,
      created: new Date().toISOString(),
    }));
  return {
    ...s,
    lessons: s.lessons.map((l) =>
      l.id === lessonId
        ? {
            ...l,
            note: {
              summary: a.summary,
              languageFeedback: a.languageFeedback,
              roleFeedback: a.roleFeedback,
              nextLesson: a.nextLesson,
              sourceCount: sourceCount ?? l.messages.length,
              sections: a.sections,
            },
          }
        : l,
    ),
    vocabulary: [
      ...s.vocabulary.filter((w) => w.lessonId !== lessonId),
      ...vocabulary,
    ],
    entries: [
      ...s.entries.filter(
        (e) => !(e.lessonId === lessonId && e.id.startsWith("analysis:")),
      ),
      ...entries,
    ],
  };
}
