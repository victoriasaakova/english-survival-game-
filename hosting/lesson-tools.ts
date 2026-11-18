import {
  createLesson,
  freshWorkspace,
  migrate,
  type Conversation,
  type Workspace,
} from "../lib/workspace.ts";
import {
  finishLesson,
  isAnalysis,
  noteSections,
} from "../lib/lesson-review.ts";
import { gameInstructions, updatedSkillRules } from "../lib/games.ts";
import type { Bucket } from "./worker.ts";
const str = { type: "string" };
const obj = (
  properties: Record<string, unknown>,
  required: string[] = Object.keys(properties),
) => ({ type: "object", properties, required, additionalProperties: false });
const array = (items: unknown) => ({ type: "array", items });
const fields = (keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, str]));
const reviewSchema = obj({
  ...fields(["summary", "languageFeedback", "roleFeedback", "nextLesson"]),
  sections: {
    ...array(obj(fields(["title", "text"]))),
    description:
      "Use these six section titles in order: " + noteSections.join(", "),
  },
  vocabulary: array(obj(fields(["topic", "expression", "meaning", "example"]))),
  entries: array(
    obj({
      ...fields(["topic", "title", "text", "evidence"]),
      section: {
        enum: [
          "Мои истории",
          "Убеждения и рефрейминги",
          "Карьерные материалы",
          "Видение будущего",
        ],
      },
      kind: { enum: ["Мои слова", "Вывод ИИ", "Карьерный материал"] },
    }),
  ),
});
const tools = [
  {
    name: "get_english_lesson",
    description:
      "Read the signed-in learner's English Coach lesson context. Without an ID, list recent lessons and available roles. With an ID, return its transcript and chosen role and game instructions to continue that lesson.",
    inputSchema: obj({ lesson_id: str }, []),
    annotations: { readOnlyHint: true },
  },
  {
    name: "reply_to_english_lesson",
    description:
      "When the learner asks to continue their web lesson here, reply to its pending message following the role and game returned by get_english_lesson. Save the tutor's actual English reply into the same conversation.",
    inputSchema: obj(fields(["lesson_id", "in_reply_to", "reply"])),
  },
  {
    name: "save_english_lesson",
    description:
      "On the learner's request to save a lesson from the current ChatGPT project chat, store its actual turns, structured note, words and personal materials. For a new lesson choose a stable source_key (date and session title); reuse it on retries or extensions. For a lesson opened from the web, also pass its lesson_id. Pass all actual turns from this project lesson only, in chronological order. No invented transcript. Quote the learner verbatim for entries. role is a role ID from get_english_lesson.",
    inputSchema: obj(
      {
        source_key: str,
        lesson_id: str,
        role: str,
        title: str,
        topic: str,
        mode: str,
        game: { enum: ["board", "future", "scenario"] },
        focus: array(str),
        turns: array(
          obj({ author: { enum: ["user", "assistant"] }, text: str }),
        ),
        review: reviewSchema,
      },
      ["source_key", "role", "title", "topic", "mode", "turns", "review"],
    ),
  },
];
function applyCall(
  state: Workspace,
  name: string,
  a: Record<string, unknown>,
): { state: Workspace; result: unknown } {
  const match = state.lessons.find((l) => l.id === a.lesson_id);
  if (a.lesson_id && !match) throw Error("Урок не найден.");
  if (name === "get_english_lesson") {
    return {
      state,
      result: match
        ? {
            lesson: {
              ...match,
              voiceImports: undefined,
              referenceText: undefined,
            },
            rules: state.rules,
            game: gameInstructions(match.game),
            skill: updatedSkillRules,
            level: state.level,
            goal: state.goal,
          }
        : {
            roles: state.roles,
            level: state.level,
            goal: state.goal,
            rules: state.rules,
            lessons: state.lessons
              .slice(-25)
              .reverse()
              .map((l) => ({
                id: l.id,
                title: l.title,
                role: l.role.name,
                created: l.created,
                pending: l.messages.at(-1)?.author === "user",
              })),
          },
    };
  }
  if (name === "reply_to_english_lesson") {
    if (
      !match ||
      typeof a.reply !== "string" ||
      !a.reply.trim() ||
      a.reply.length > 16000
    )
      throw Error("Нужны урок и ответ.");
    const msgId = "tutor:" + a.in_reply_to;
    if (match.messages.some((m) => m.id === msgId))
      return { state, result: { lesson_id: match.id, saved: true } };
    if (
      match.messages.at(-1)?.author !== "user" ||
      match.messages.at(-1)?.id !== a.in_reply_to
    )
      throw Error("Диалог изменился. Прочитайте последний вопрос.");
    const message = {
      author: "assistant" as const,
      text: a.reply.trim(),
      id: msgId,
      at: new Date().toISOString(),
      origin: "ChatGPT" as const,
    };
    return {
      state: {
        ...state,
        lessons: state.lessons.map((l) =>
          l.id === match.id ? { ...l, messages: [...l.messages, message] } : l,
        ),
      },
      result: { lesson_id: match.id, saved: true },
    };
  }
  if (name !== "save_english_lesson") throw Error("Неизвестный инструмент.");
  if (
    !["source_key", "role", "title", "topic", "mode"].every(
      (k) =>
        typeof a[k] === "string" &&
        (a[k] as string).trim() &&
        (a[k] as string).length <= 300,
    ) ||
    !isAnalysis(a.review) ||
    !Array.isArray(a.turns) ||
    !a.turns.length ||
    !a.turns.every(
      (t) =>
        t &&
        ["user", "assistant"].includes(t.author) &&
        typeof t.text === "string" &&
        t.text.trim(),
    ) ||
    !a.turns.some((t) => t.author === "user")
  )
    throw Error("Нужны исходные реплики урока и структурированный конспект.");
  const key = encodeURIComponent(a.source_key as string),
    webId = "project-" + key;
  const role = state.roles.find((r) => r.id === a.role);
  const previous = match || state.lessons.find((l) => l.id === webId);
  if (!previous && !role)
    throw Error("Выберите существующую роль через get_english_lesson.");
  const lesson: Conversation = previous || {
    ...createLesson(
      role!,
      a.title as string,
      a.topic as string,
      a.mode as string,
      Array.isArray(a.focus)
        ? a.focus.filter((f): f is string => typeof f === "string")
        : [],
      "",
    ),
    id: webId,
    game:
      typeof a.game === "string" &&
      ["board", "future", "scenario"].includes(a.game)
        ? { id: a.game }
        : undefined,
  };
  const prefix = "project-turn:" + key + ":";
  const imported = lesson.messages.filter((m) => m.id.startsWith(prefix));
  const turns = a.turns as { author: "user" | "assistant"; text: string }[];
  if (
    imported.length > turns.length ||
    imported.some(
      (m, i) => m.author !== turns[i]?.author || m.text !== turns[i]?.text,
    )
  )
    throw Error("Исходные реплики расходятся с сохранённой версией.");
  const at = new Date().toISOString(),
    added = turns
      .slice(imported.length)
      .map((t, i) => ({
        id: prefix + (imported.length + i),
        text: t.text,
        author: t.author,
        at,
        origin: "ChatGPT" as const,
      }));
  const changed = { ...lesson, messages: [...lesson.messages, ...added] };
  const next =
    imported.length && !added.length && previous?.note
      ? state
      : finishLesson(
          {
            ...state,
            lessons: previous
              ? state.lessons.map((l) => (l.id === previous.id ? changed : l))
              : [...state.lessons, changed],
          },
          changed,
          a.review,
        );
  return {
    state: next,
    result: {
      lesson_id: changed.id,
      saved: true,
      words: next.vocabulary.filter((w) => w.lessonId === changed.id).length,
      materials: next.entries.filter((e) => e.lessonId === changed.id).length,
    },
  };
}
export async function lessonTools(
  req: Request,
  bucket: Bucket | undefined,
  user: string | null,
): Promise<Response> {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  let id: unknown = null;
  const respond = (body: object) =>
    Response.json(
      { jsonrpc: "2.0", id, ...body },
      { headers: { "Cache-Control": "no-store" } },
    );
  try {
    const raw = await req.text();
    if (raw.length > 1_500_000) return new Response(null, { status: 413 });
    const call = JSON.parse(raw);
    id = call.id ?? null;
    if (call.method === "server/discover")
      return respond({
        result: {
          supportedVersions: ["2026-07-28"],
          capabilities: { tools: {} },
          serverInfo: { name: "english-coach", version: "1.0.0" },
        },
      });
    if (call.method === "initialize")
      return respond({
        result: {
          protocolVersion: call.params?.protocolVersion || "2025-11-25",
          serverInfo: { name: "english-coach", version: "1.0.0" },
          capabilities: { tools: {} },
        },
      });
    if (call.method === "notifications/initialized")
      return new Response(null, { status: 202 });
    if (call.method === "tools/list") return respond({ result: { tools } });
    if (call.method !== "tools/call")
      return respond({ error: { code: -32601, message: "Method not found" } });
    if (!user) return new Response(null, { status: 401 });
    if (!bucket) throw Error("Хранилище не подключено.");
    const key = "workspace/" + encodeURIComponent(user) + ".json";
    for (let i = 0; i < 3; i++) {
      const stored = await bucket.get(key),
        state = stored
          ? migrate(await new Response(stored.body).json())
          : freshWorkspace();
      const outcome = applyCall(
        state,
        call.params?.name,
        call.params?.arguments || {},
      );
      if (outcome.state !== state) {
        const onlyIf = new Headers(
          stored ? { "If-Match": stored.httpEtag } : { "If-None-Match": "*" },
        );
        if (!(await bucket.put(key, JSON.stringify(outcome.state), { onlyIf })))
          continue;
      }
      return respond({
        result: {
          content: [{ type: "text", text: JSON.stringify(outcome.result) }],
        },
      });
    }
    throw Error("Урок изменился на другом устройстве. Повторите сохранение.");
  } catch (e) {
    return respond({
      result: {
        isError: true,
        content: [
          {
            type: "text",
            text:
              e instanceof Error ? e.message : "Не удалось выполнить операцию.",
          },
        ],
      },
    });
  }
}
