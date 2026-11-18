import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Flame,
  Layers,
  Plus,
} from "lucide-react";
import { type Conversation, type Workspace, streak } from "@/lib/workspace";
import { localDate } from "@/lib/learning";
import { due } from "@/lib/recall";
import { Wordmark, Sticker } from "./ui/sticker-lettering";

function NextLesson({
  state,
  follow,
  followPractice,
}: {
  state: Workspace;
  follow: (lesson: Conversation) => void;
  followPractice: (id: string) => void;
}) {
  const latest = [...state.lessons]
    .reverse()
    .find(
      (l) => l.note?.nextLesson && l.messages.some((m) => m.author === "user"),
    );
  const exercise = [...state.exercises]
    .reverse()
    .find((e) => e.improvements?.length);
  if (!latest && !exercise) return null;
  return (
    <section className="next-lesson panel">
      <h2>Следующий урок</h2>
      <p>{latest?.note?.nextLesson || exercise!.improvements!.join(" ")}</p>
      <button
        className="button secondary"
        onClick={() => (latest ? follow(latest) : followPractice(exercise!.id))}
      >
        Начать <ArrowRight size={16} />
      </button>
    </section>
  );
}

export function Dashboard({
  state,
  start,
  review,
  open,
  list,
  follow,
  followPractice,
}: {
  state: Workspace;
  start: () => void;
  review: () => void;
  open: (id: string) => void;
  list: () => void;
  follow: (lesson: Conversation) => void;
  followPractice: (id: string) => void;
}) {
  const oldest = new Date();
  oldest.setHours(0, 0, 0, 0);
  oldest.setDate(oldest.getDate() - 6);
  const week = state.lessons.filter((l) =>
    l.messages.some((m) => m.author === "user" && new Date(m.at) >= oldest),
  ).length;
  const count = state.vocabulary.filter((w) => {
    const d = due(w);
    return d && d <= localDate();
  }).length;
  const topics = new Set(state.vocabulary.map((w) => w.topic)).size;
  const recent = [...state.lessons].reverse().slice(0, 3);
  const verdict = [...state.lessons]
    .reverse()
    .find(
      (l) =>
        l.note?.languageFeedback && l.messages.some((m) => m.author === "user"),
    );
  return (
    <>
      <section className="cover">
        <div className="cover-top">
          <h1>Главная</h1>
        </div>
        <div className="cover-art">
          <Wordmark />
          <i className="sticker cover-flower">
            <Sticker kind="daisy" />
          </i>
          <i className="sticker cover-heart">
            <Sticker kind="heart" />
          </i>
        </div>
        <div className="cover-stats">
          <span>
            <BookOpen /> {state.level} → {state.goal}
          </span>
          <span>
            <Flame /> Стрик · {streak(state.lessons)}
          </span>
          <span>
            <CalendarDays /> За неделю · {week}
          </span>
        </div>
      </section>
      <div className="action-grid">
        <button className="action-card new-action" onClick={start}>
          <span className="action-art" aria-hidden="true">
            <MessageSticker />
          </span>
          <span className="card-jump">
            <Plus />
          </span>
          <strong>Новый урок</strong>
          <small>Выбрать роль и режим</small>
        </button>
        <button className="action-card review-action" onClick={review}>
          <span className="action-art deck-art" aria-hidden="true">
            <i />
            <i />
            <i>
              <Layers />
            </i>
          </span>
          <span className="card-jump">
            <ArrowUpRight />
          </span>
          <strong>Повторить карточки</strong>
          <small>
            {count
              ? "По расписанию сегодня · " + count
              : "Тем в словаре · " + topics}
          </small>
        </button>
      </div>
      <NextLesson
        state={state}
        follow={follow}
        followPractice={followPractice}
      />
      <div className="section-tools">
        <h2>Последние уроки</h2>
        {recent.length > 0 && (
          <button className="text-button" onClick={list}>
            Все уроки <ArrowRight size={16} />
          </button>
        )}
      </div>
      {recent.length ? (
        <div className="recent-list">
          {recent.map((l) => (
            <button key={l.id} onClick={() => open(l.id)}>
              <span>
                <strong>{l.title}</strong>
                <small>
                  {l.role.name} · {l.format}
                </small>
              </span>
              <ArrowUpRight />
            </button>
          ))}
        </div>
      ) : (
        <div className="home-empty">
          <BookOpen size={20} /> Пока нет начатых уроков
        </div>
      )}
      {verdict && (
        <section className="panel">
          <h2>Вердикт тренера</h2>
          <p>{verdict.note!.languageFeedback}</p>
          <button className="text-button" onClick={() => open(verdict.id)}>
            {verdict.title} <ArrowUpRight size={15} />
          </button>
        </section>
      )}
    </>
  );
}
function MessageSticker() {
  return (
    <span className="dialog-art">
      <i />
      <i>
        <b />
        <b />
        <b />
      </i>
    </span>
  );
}
