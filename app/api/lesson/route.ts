import { authorize } from "@/lib/server";
import { lessonPrompt } from "@/lib/lesson-prompt";
export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;
  try {
    const b = await req.json();
    if (
      !["chat", "analyse", "practice", "evaluate"].includes(b.task) ||
      !b.lesson ||
      !Array.isArray(b.lesson.messages) ||
      JSON.stringify(b).length > 150000
    )
      return Response.json(
        {
          error:
            "Некорректный запрос или слишком длинный урок. Создайте продолжение.",
        },
        { status: 400 },
      );
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
        messages: [
          { role: "system", content: lessonPrompt },
          { role: "user", content: JSON.stringify(b) },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4500,
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!r.ok) throw Error();
    const data = await r.json();
    const out = JSON.parse(data.choices[0].message.content);
    if (b.task === "chat" && typeof out.reply !== "string") throw Error();
    if (b.task === "analyse") {
      for (const k of [
        "summary",
        "languageFeedback",
        "roleFeedback",
        "nextLesson",
      ])
        if (typeof out[k] !== "string") throw Error();
      if (!Array.isArray(out.vocabulary) || !Array.isArray(out.entries))
        throw Error();
      for (const w of out.vocabulary)
        for (const k of ["topic", "expression", "meaning", "example"])
          if (typeof w[k] !== "string") throw Error();
      for (const e of out.entries) {
        for (const k of ["topic", "title", "text", "kind", "evidence"])
          if (typeof e[k] !== "string") throw Error();
        if (!["Мои слова", "Вывод ИИ", "Карьерный материал"].includes(e.kind))
          throw Error();
      }
    }
    if (
      b.task === "practice" &&
      (!Array.isArray(out.questions) ||
        out.questions.length < 1 ||
        out.questions.length > 8 ||
        out.questions.some(
          (q: { kind: string; prompt: string }) =>
            !["grammar", "translation", "writing"].includes(q.kind) ||
            typeof q.prompt !== "string",
        ))
    )
      throw Error();
    if (b.task === "evaluate" && typeof out.feedback !== "string")
      throw Error();
    return Response.json(out);
  } catch {
    return Response.json(
      {
        error:
          "Не удалось получить ответ ИИ. Сообщение сохранено; повторите запрос.",
      },
      { status: 502 },
    );
  }
}
