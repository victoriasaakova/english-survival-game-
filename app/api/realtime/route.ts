import { authorize } from "@/lib/server";
export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;
  try {
    const sdp = await req.text();
    if (sdp.length > 50000 || !sdp.startsWith("v="))
      return new Response("Invalid SDP", { status: 400 });
    const form = new FormData();
    form.set("sdp", sdp);
    form.set(
      "session",
      JSON.stringify({
        type: "realtime",
        model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",
        instructions:
          "You are an A2 English tutor. Speak slowly and naturally. Ask one short question at a time about the learner’s chosen interests and personal stories. Never invent their biography. Give at most two corrections and invite a retry. Explain in Russian if requested. Keep responses brief.",
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
