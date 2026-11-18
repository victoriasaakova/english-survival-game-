export type TutorEnv = {
  [key: string]: unknown;
  OPENAI_API_KEY?: string;
  OPENAI_TEXT_MODEL?: string;
  OPENAI_TRANSCRIPTION_MODEL?: string;
  OPENAI_REALTIME_MODEL?: string;
};

export async function providerFailure(res: Response) {
  let code = "";
  try {
    code = (await res.json()).error?.code || "";
  } catch {}
  const message =
    code === "insufficient_quota"
      ? "На проекте OpenAI закончился доступный баланс."
      : res.status === 429
        ? "Тренер занят. Повторите отправку через минуту."
        : res.status === 401 || res.status === 403
          ? "OpenAI отклонил доступ проекта к модели."
          : "OpenAI сейчас не может ответить. Попробуйте ещё раз.";
  return Response.json(
    { error: message },
    { status: res.status === 429 ? 429 : 502 },
  );
}
