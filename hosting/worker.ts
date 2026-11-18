import { lessonTools } from "./lesson-tools.ts";
import { handleLesson } from "../lib/tutor/lesson.ts";
import { handleTranscription } from "../lib/tutor/transcribe.ts";
import { handleRealtime } from "../lib/tutor/realtime.ts";
import { type TutorEnv } from "../lib/tutor/provider.ts";
import { validateWorkspace } from "../lib/workspace.ts";

export type Bucket = {
  get(key: string): Promise<{ httpEtag: string; body: ReadableStream } | null>;
  put(
    key: string,
    data: string,
    options: { onlyIf: Headers },
  ): Promise<{ httpEtag: string } | null>;
  head(key: string): Promise<{ httpEtag: string } | null>;
};
type SiteEnv = TutorEnv & { BUCKET?: Bucket };
type Asset = { mime: string; text: string; binary?: boolean };
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function workspace(req: Request, bucket: Bucket, user: string) {
  const key = "workspace/" + encodeURIComponent(user) + ".json";
  if (req.method === "GET") {
    const known = req.headers.get("If-None-Match");
    if (known && (await bucket.head(key))?.httpEtag === known)
      return new Response(null, {
        status: 304,
        headers: { "Cache-Control": "no-store", ETag: known },
      });
    const obj = await bucket.get(key);
    return obj
      ? new Response(obj.body, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            ETag: obj.httpEtag,
          },
        })
      : json(null, 404);
  }
  if (req.method !== "PUT")
    return json({ error: "Метод не поддерживается." }, 405);
  const condition = new Headers();
  const expected = req.headers.get("If-Match");
  if (expected && /^"[^"]+"$/.test(expected))
    condition.set("If-Match", expected);
  else if (req.headers.get("If-None-Match") === "*")
    condition.set("If-None-Match", "*");
  else return json({ error: "Требуется версия для записи." }, 428);
  const body = await req.text();
  if (body.length > 10_000_000)
    return json({ error: "Копия превышает 10 МБ." }, 413);
  try {
    const data = JSON.parse(body);
    if (data.version !== 2) throw Error();
    validateWorkspace(data);
  } catch {
    return json({ error: "Некорректный формат копии." }, 400);
  }
  const saved = await bucket.put(key, body, { onlyIf: condition });
  return saved
    ? new Response(null, {
        status: 204,
        headers: { ETag: saved.httpEtag, "Cache-Control": "no-store" },
      })
    : json({ error: "На другом устройстве есть изменения." }, 412);
}

export function createWorker(assets: Record<string, Asset>) {
  return {
    async fetch(req: Request, env: SiteEnv): Promise<Response> {
      const url = new URL(req.url),
        path = url.pathname;
      if (path === "/mcp")
        return lessonTools(
          req,
          env.BUCKET,
          req.headers.get("oai-authenticated-user-id"),
        );
      if (!path.startsWith("/api/")) {
        if (req.method !== "GET" && req.method !== "HEAD")
          return new Response(null, { status: 405 });
        const asset = assets[path === "/" ? "/index.html" : path];
        if (!asset) return new Response(null, { status: 404 });
        return new Response(
          req.method === "HEAD"
            ? null
            : asset.binary
              ? Uint8Array.from(atob(asset.text), (c) => c.charCodeAt(0))
              : asset.text,
          {
            headers: {
              "Content-Type": asset.mime,
              "Cache-Control": path.startsWith("/_next/static/")
                ? "private,max-age=31536000,immutable"
                : "private,no-cache",
            },
          },
        );
      }
      const user = req.headers.get("oai-authenticated-user-id");
      if (path === "/api/status" && req.method === "GET")
        return json({
          ai: !!env.OPENAI_API_KEY && !!user,
          cloud: !!env.BUCKET,
          account: user,
        });
      if (!user)
        return json(
          { error: "Войдите в english coach через свой аккаунт ChatGPT." },
          401,
        );
      const origin = req.headers.get("Origin");
      if (req.method !== "GET" && origin && origin !== url.origin)
        return json({ error: "Источник запроса не поддерживается." }, 403);
      if (path === "/api/workspace") {
        if (!env.BUCKET) return json({ error: "Хранилище недоступно." }, 503);
        try {
          return await workspace(req, env.BUCKET, user);
        } catch {
          return json(
            { error: "Облачное сохранение временно недоступно." },
            503,
          );
        }
      }
      const handler =
        path === "/api/lesson"
          ? handleLesson
          : path === "/api/realtime"
            ? handleRealtime
            : path === "/api/transcribe"
              ? handleTranscription
              : null;
      if (!handler) return json({ error: "Маршрут не найден." }, 404);
      if (req.method !== "POST") return json({ error: "Требуется POST." }, 405);
      if (!env.OPENAI_API_KEY)
        return json(
          {
            error:
              "Для ответов тренера нужен ключ OpenAI в настройках сервера.",
          },
          503,
        );
      return handler(req, env);
    },
  };
}
