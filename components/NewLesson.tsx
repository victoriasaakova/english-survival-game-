import { useState } from "react";
import { ArrowRight, Check, Headphones, MessageSquare } from "lucide-react";
import {
  createLesson,
  type Workspace,
  type Conversation,
} from "@/lib/workspace";
import { games, type GameConfig } from "@/lib/games";
import { GameSettings } from "./GameSettings";
export const modes = [
  { name: "Свободный диалог" },
  { name: "Имитация собеса" },
  { name: "Презентация" },
  { name: "Диалог с PM" },
  { name: "Коучинг будущей себя", game: "future" },
  { name: "Роастер убеждений", game: "board" },
  { name: "Три роли", game: "trio" },
  { name: "Scenario Challenge", game: "scenario" },
  { name: "Урок по скиллу" },
  { name: "Свой сценарий" },
];
export function NewLesson({
  state,
  source,
  onCreate,
  ai,
}: {
  state: Workspace;
  source?: string;
  onCreate: (l: Conversation) => void;
  ai: boolean;
}) {
  const test = state.exercises.find((e) => "exercise-" + e.id === source);
  const parent = state.lessons.find((l) => l.id === (test?.lessonId || source));
  const initialMode =
    modes.find((m) =>
      parent?.game ? m.game === parent.game.id : m.name === parent?.format,
    )?.name ||
    parent?.format ||
    modes[0].name;
  const [roleId, setRole] = useState(parent?.role.id || state.roles[0]?.id);
  const [mode, setMode] = useState(initialMode);
  const [game, setGame] = useState<GameConfig | undefined>(parent?.game);
  const [focus, setFocus] = useState(
    test
      ? [
          test.questions[0]?.kind === "writing"
            ? "Письмо"
            : test.questions[0]?.kind === "grammar"
              ? "Грамматика"
              : "Лексика",
        ]
      : parent?.focus || ["Speaking"],
  );
  const [delivery, setDelivery] = useState<"voice" | "text">(
    parent?.delivery || "text",
  );
  const [request, setRequest] = useState(
    test?.improvements?.join("\n") || parent?.note?.nextLesson || "",
  );
  const [topic, setTopic] = useState(test?.topic || parent?.topic || "");
  const [duration, setDuration] = useState<15 | 30>(parent?.duration || 30);
  const role = state.roles.find((r) => r.id === roleId) || parent?.role;
  const roleOptions =
    role && !state.roles.some((r) => r.id === role.id)
      ? [role, ...state.roles]
      : state.roles;
  const choices = modes.some((m) => m.name === initialMode)
    ? modes
    : [...modes, { name: initialMode }];
  return (
    <>
      <div className="heading">
        <h1>Новый урок</h1>
      </div>
      <form
        className="setup"
        onSubmit={(e) => {
          e.preventDefault();
          if (!role) return;
          const subject =
            topic.trim() ||
            games.find((g) => g.id === game?.id)?.topic ||
            role.theme ||
            "Своя";
          const l = createLesson(
            role,
            topic.trim() || mode,
            subject,
            mode,
            focus,
            request.trim(),
            parent?.id,
          );
          l.game = game;
          l.delivery = delivery;
          if (mode === "Урок по скиллу") l.duration = duration;
          onCreate(l);
        }}
      >
        <section className="panel">
          <h2>Роль</h2>
          <div className="choice-grid">
            {roleOptions.map((r) => (
              <button
                type="button"
                key={r.id}
                aria-pressed={r.id === roleId}
                className="choice-card"
                onClick={() => setRole(r.id)}
              >
                <strong>{r.name}</strong>
                <small>{r.theme || "Своя"}</small>
                {r.id === roleId && <Check size={15} />}
              </button>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Режим урока</h2>
          <div className="mode-grid">
            {choices.map((m) => (
              <button
                type="button"
                key={m.name}
                aria-pressed={mode === m.name}
                onClick={() => {
                  setMode(m.name);
                  setGame(
                    m.game
                      ? {
                          id: m.game,
                          ...(m.game === "trio"
                            ? {
                                roles: state.roles
                                  .slice(0, 3)
                                  .map(({ id, name, instructions }) => ({
                                    id,
                                    name,
                                    instructions,
                                  })),
                              }
                            : {}),
                        }
                      : undefined,
                  );
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
          {game && (
            <GameSettings value={game} roles={state.roles} onChange={setGame} />
          )}
          {mode === "Урок по скиллу" && (
            <label>
              Длительность
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) as 15 | 30)}
              >
                <option value="15">15 минут</option>
                <option value="30">30 минут</option>
              </select>
            </label>
          )}
          <label>
            Тема
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="О чём поговорим?"
            />
          </label>
          <label>
            {mode === "Свой сценарий" ? "Мой сценарий" : "Запрос к тренеру"}
            <textarea
              required={mode === "Свой сценарий"}
              rows={2}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder={
                mode === "Свой сценарий"
                  ? "Что происходит и как вести занятие?"
                  : "По желанию"
              }
            />
          </label>
        </section>
        <section className="panel">
          <h2>Акцент</h2>
          <div className="chips">
            {Array.from(
              new Set([
                "Грамматика",
                "Лексика",
                "Listening",
                "Speaking",
                "Письмо",
                ...focus,
              ]),
            ).map((f) => (
              <button
                type="button"
                key={f}
                aria-pressed={focus.includes(f)}
                className={focus.includes(f) ? "selected" : ""}
                onClick={() =>
                  setFocus(
                    focus.includes(f)
                      ? focus.filter((x) => x !== f)
                      : [...focus, f],
                  )
                }
              >
                {f}
              </button>
            ))}
          </div>
          <h2 className="subhead">Формат</h2>
          <div className="mode-grid">
            {(["text", "voice"] as const).map((d) => (
              <button
                type="button"
                key={d}
                aria-pressed={delivery === d}
                onClick={() => setDelivery(d)}
              >
                {d === "text" ? (
                  <MessageSquare size={16} />
                ) : (
                  <Headphones size={16} />
                )}{" "}
                {d === "text" ? "Текст" : "Голос"}
              </button>
            ))}
          </div>
          {delivery === "voice" && !ai && (
            <p className="hint">
              Голос доступен через перенос в ChatGPT. Встроенный realtime пока
              отключён.
            </p>
          )}
        </section>
        <button
          className="button"
          disabled={
            !role ||
            (game?.id === "trio" &&
              new Set(game.roles?.map((r) => r.id)).size !== 3)
          }
        >
          Начать урок <ArrowRight size={17} />
        </button>
      </form>
    </>
  );
}
