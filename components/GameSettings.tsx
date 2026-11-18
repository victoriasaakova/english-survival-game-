"use client";
import {
  games,
  criticBoard,
  boardModes,
  futureChapters,
  type GameConfig,
} from "@/lib/games";
export function GameSettings({
  value,
  onChange,
}: {
  value?: GameConfig;
  onChange: (v: GameConfig | undefined) => void;
}) {
  return (
    <div className="game-settings">
      <div className="role-grid">
        {games.map((g) => (
          <button
            type="button"
            key={g.id}
            className={"role-card " + (value?.id === g.id ? "selected" : "")}
            onClick={() => onChange({ id: g.id })}
          >
            <strong>{g.name}</strong>
            <p>{g.description}</p>
          </button>
        ))}
      </div>
      {value?.id === "board" && (
        <>
          <label>
            Режим
            <select
              value={value.mode || "Полный раунд"}
              onChange={(e) => onChange({ ...value, mode: e.target.value })}
            >
              {boardModes.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            Кто берёт слово
            <select
              value={value.character || ""}
              onChange={(e) =>
                onChange({ ...value, character: e.target.value || undefined })
              }
            >
              <option value="">Определить по моей ситуации</option>
              {criticBoard.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="critic-board">
            {criticBoard
              .filter((c) => !value.character || c.id === value.character)
              .map((c) => (
                <article key={c.id}>
                  <strong>{c.name}</strong>
                  <small>{c.position}</small>
                  <blockquote>{c.line}</blockquote>
                  <p>{c.tactic}</p>
                </article>
              ))}
          </div>
          <p className="hint">
            Accusation → ваш comeback → roast логики → три plot twists → ваш mic
            drop → короткий English Upgrade. Можно сказать «не могу, возьми
            микрофон» или остановить игру.
          </p>
        </>
      )}
      {value?.id === "future" && (
        <label>
          Глава (любая, без обязательного порядка)
          <select
            value={value.chapter || futureChapters[0].name}
            onChange={(e) => onChange({ ...value, chapter: e.target.value })}
          >
            {futureChapters.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
          <p className="hint">
            {
              futureChapters.find(
                (c) => c.name === (value.chapter || futureChapters[0].name),
              )?.prompt
            }
          </p>
        </label>
      )}
      {value?.id === "scenario" && (
        <label>
          Контекст раунда
          <select
            value={value.mode || "Чередовать профессиональное и личное"}
            onChange={(e) => onChange({ ...value, mode: e.target.value })}
          >
            {[
              "Чередовать профессиональное и личное",
              "Профессиональные ставки",
              "Личные ситуации",
            ].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <p className="hint">
            Один сценарий за раз. 30–60 секунд ответа и 2–4 знакомых выражения
            по смысловым подсказкам.
          </p>
        </label>
      )}
      {value && (
        <button
          type="button"
          className="text-button"
          onClick={() => onChange(undefined)}
        >
          Вернуться к своему сценарию без игрового шаблона
        </button>
      )}
    </div>
  );
}
