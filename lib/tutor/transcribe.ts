import { providerFailure, type TutorEnv } from "./provider.ts";
export async function handleTranscription(req: Request, env: TutorEnv) {
  try {
    const incoming = await req.formData(),
      file = incoming.get("file");
    if (!(file instanceof File) || file.size > 20 * 1024 * 1024)
      return Response.json(
        { error: "Запись должна быть меньше 20 МБ." },
        { status: 400 },
      );
    const form = new FormData();
    form.set("file", file);
    form.set(
      "model",
      env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
    );
    form.set("language", "en");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return providerFailure(res);
    return Response.json(await res.json());
  } catch {
    return Response.json(
      {
        error:
          "Не удалось расшифровать запись. Аудио можно скачать и попробовать снова.",
      },
      { status: 502 },
    );
  }
}
