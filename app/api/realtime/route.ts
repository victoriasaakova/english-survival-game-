import { authorize } from "@/lib/server";
export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;
  try {
    const config = await req.json();
    const sdp = config.sdp;
    if (typeof sdp !== "string" || sdp.length > 50000 || !sdp.startsWith("v="))
      return new Response("Invalid SDP", { status: 400 });
    const form = new FormData();
    form.set("sdp", sdp);
    form.set(
      "session",
      JSON.stringify({
        type: "realtime",
        model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",
        instructions:
          "You are an English tutor for a B2 learner aiming at C1. Conduct the selected role and format. Ask one question at a time, give precise brief corrections and retries. Do not invent learner biography or assess from unavailable evidence. Follow the learner choices in this configuration: " +
          JSON.stringify({
            role: config.lesson?.role,
            topic: config.lesson?.topic,
            format: config.lesson?.format,
            focus: config.lesson?.focus,
            request: config.lesson?.request,
            rules: config.rules,
            history: config.lesson?.messages?.slice(-16),
          }).slice(0, 18000),
        audio: {
          input: { transcription: { model: "gpt-4o-mini-transcribe" } },
          output: { voice: "marin" },
        },
      }),
    );
    const r = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw Error();
    return new Response(await r.text(), {
      headers: { "Content-Type": "application/sdp" },
    });
  } catch {
    return Response.json(
      { error: "Не удалось начать разговор. Попробуйте голосовое сообщение." },
      { status: 502 },
    );
  }
}
