"use client";
import { useState, useEffect, useRef } from "react";
import { Square, Mic, Download } from "lucide-react";
import { api } from "@/lib/client";
export function Recorder({
  onText,
  notify,
}: {
  onText: (s: string) => void;
  notify: (s: string) => void;
}) {
  const [recording, setRecording] = useState(false),
    [url, setUrl] = useState(""),
    [blob, setBlob] = useState<Blob | null>(null),
    [busy, setBusy] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  async function toggle() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      if (!navigator.mediaDevices || typeof MediaRecorder === "undefined")
        throw Error("Запись недоступна в этом браузере. Используйте текст.");
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const r = new MediaRecorder(stream.current);
      recorder.current = r;
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        if (timer.current) clearTimeout(timer.current);
        const b = new Blob(chunks, { type: r.mimeType });
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        setRecording(false);
        stream.current?.getTracks().forEach((t) => t.stop());
      };
      r.start();
      setRecording(true);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 180000);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function transcribe() {
    if (!blob) return;
    setBusy(true);
    try {
      const f = new FormData();
      f.set(
        "file",
        blob,
        blob.type.includes("mp4") ? "recording.mp4" : "recording.webm",
      );
      const r = await api("transcribe", f, true);
      onText(r.text);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="recorder">
      <button
        className={"record-button " + (recording ? "recording" : "")}
        onClick={toggle}
        aria-label={recording ? "Остановить запись" : "Записать голосовое"}
      >
        {recording ? <Square size={24} /> : <Mic size={28} />}
      </button>
      <div>
        <strong>
          {recording ? "Записываем вашу историю…" : "Нажмите и расскажите"}
        </strong>
        <p>
          {recording
            ? "До 3 минут. Нажмите ещё раз, чтобы остановить."
            : "Можно начать с “Today I’d like to talk about…”"}
        </p>
      </div>
      {url && (
        <div className="recording-result">
          <audio controls src={url} />
          <div className="button-row">
            <button
              className="btn secondary"
              disabled={busy}
              onClick={transcribe}
            >
              {busy ? "Расшифровываем…" : "Расшифровать"}
            </button>
            <a
              className="text-btn"
              href={url}
              download={
                blob?.type.includes("mp4") ? "my-story.mp4" : "my-story.webm"
              }
            >
              Скачать аудио <Download size={16} />
            </a>
          </div>
          <small>
            Скачайте запись перед выходом: аудио хранится только до закрытия
            этого раздела.
          </small>
        </div>
      )}
    </div>
  );
}
