import { authorize, coachInstructions } from "@/lib/server";
export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    if (
      !["feedback", "essay", "review", "plan"].includes(body.task) ||
      typeof body.text !== "string" ||
      body.text.length > 12000
    )
      return Response.json({ error: "Некорректный запрос." }, { status: 400 });
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
        messages: [
          { role: "system", content: coachInstructions },
          {
            role: "user",
            content: JSON.stringify({
              task: body.task,
              text: body.text,
              context: String(body.context || "").slice(0, 3000),
            }),
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1800,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok)
      return Response.json(
        {
          error:
            "Преподаватель временно недоступен. Ответ сохранён; попробуйте позже.",
        },
        { status: 502 },
      );
    const data = await res.json(),
      result = JSON.parse(data.choices[0].message.content);
    if (
      typeof result.feedback !== "string" ||
      typeof result.text !== "string" ||
      typeof result.passed !== "boolean"
    )
      throw Error();
    if (
      body.task === "plan" &&
      (!Array.isArray(result.tasks) ||
        result.tasks.length !== 6 ||
        result.tasks.some((t: unknown) => typeof t !== "string"))
    )
      throw Error();
    return Response.json(result);
  } catch {
    return Response.json(
      { error: "Не удалось получить разбор. Повторите попытку." },
      { status: 502 },
    );
  }
}
