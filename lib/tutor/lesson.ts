import { gameInstructions } from "../games.ts";
import { isAnalysis } from "../lesson-review.ts";
import { providerFailure, type TutorEnv } from "./provider.ts";
import { fullLessonPrompt } from "../lesson-prompt.ts";
export async function handleLesson(req: Request, env: TutorEnv) {
  try {
    const b = await req.json();
    if (
      !["chat", "analyse", "practice", "evaluate", "recall"].includes(b.task) ||
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
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: fullLessonPrompt + "\n" + gameInstructions(b.lesson?.game),
          },
          { role: "user", content: JSON.stringify(b) },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4500,
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!r.ok) return providerFailure(r);
    const data = await r.json();
    const out = JSON.parse(data.choices[0].message.content);
    if (
      b.task === "chat" &&
      (typeof out.reply !== "string" || !out.reply.trim())
    )
      throw Error();
    if (b.task === "analyse" && !isAnalysis(out)) throw Error();
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
    if (
      b.task === "evaluate" &&
      (typeof out.feedback !== "string" ||
        !Array.isArray(out.improvements) ||
        out.improvements.some((x: unknown) => typeof x !== "string"))
    )
      throw Error();
    if (
      b.task === "recall" &&
      (typeof out.passed !== "boolean" ||
        typeof out.novel !== "boolean" ||
        typeof out.feedback !== "string")
    )
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
