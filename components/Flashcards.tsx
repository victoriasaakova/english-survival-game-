import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Layers,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { type Vocabulary } from "@/lib/workspace";
import { speak } from "@/lib/client";
export function Flashcards({
  words,
  onClose,
  onActivate,
}: {
  words: Vocabulary[];
  onClose: () => void;
  onActivate: (wordId: string) => void;
}) {
  const [theme, setTheme] = useState<string | null>(null);
  const [index, setIndex] = useState(0),
    [revealed, setRevealed] = useState(false);
  const themes = Array.from(new Set(words.map((w) => w.topic)));
  const deck = words.filter((w) => w.topic === theme),
    word = deck[index];
  function start(t: string) {
    setTheme(t);
    setIndex(0);
    setRevealed(false);
    window.scrollTo(0, 0);
  }
  if (!theme)
    return (
      <>
        <div className="section-tools">
          <h2>Карточки по темам</h2>
          <button className="text-button" onClick={onClose}>
            К словарю <ArrowRight size={15} />
          </button>
        </div>
        <div className="deck-grid">
          {themes.map((t, i) => (
            <button
              className={"theme-deck tone-" + (i % 4)}
              key={t}
              onClick={() => start(t)}
            >
              <Layers />
              <strong>{t}</strong>
              <small>
                Карточек · {words.filter((w) => w.topic === t).length}
              </small>
            </button>
          ))}
        </div>
        {!themes.length && <p>Добавьте первое выражение в словарь.</p>}
      </>
    );
  return (
    <section className="flash-session">
      <button className="text-button" onClick={() => setTheme(null)}>
        <ArrowLeft size={16} /> Все темы
      </button>
      <h2>{theme}</h2>
      {word ? (
        <>
          <article className="flash-face">
            <small>
              {index + 1} / {deck.length}
            </small>
            <h3>{word.meaning}</h3>
            {revealed ? (
              <>
                <strong lang="en">{word.expression}</strong>
                <p lang="en">{word.example}</p>
                <button
                  className="text-button"
                  onClick={() => speak(word.example || word.expression)}
                >
                  <Volume2 size={16} /> Послушать
                </button>
              </>
            ) : (
              <button className="button" onClick={() => setRevealed(true)}>
                Показать ответ
              </button>
            )}
          </article>
          <div className="button-row">
            <button
              className="button secondary"
              disabled={!!word.review}
              onClick={() => onActivate(word.id)}
            >
              {word.review ? "В расписании" : "Добавить в расписание"}
            </button>
            <button
              className="button"
              onClick={() => {
                setIndex(index + 1);
                setRevealed(false);
              }}
            >
              {index + 1 === deck.length ? "Завершить" : "Дальше"}{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="panel">
          <h3>Все карточки просмотрены</h3>
          <button className="text-button" onClick={() => start(theme)}>
            <RotateCcw size={16} /> Повторить тему
          </button>
        </div>
      )}
    </section>
  );
}
