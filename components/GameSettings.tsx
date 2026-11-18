"use client";
import {
  criticBoard,
  boardModes,
  futureChapters,
  type GameConfig,
} from "@/lib/games";
export function GameSettings({
  value,
  roles,
  onChange,
}: {
  value?: GameConfig;
  roles: import("@/lib/workspace").Role[];
  onChange: (v: GameConfig | undefined) => void;
}) {
  return (
    <div className="game-settings">
      {value?.id === "trio" && (
        <div className="trio-select">
          {[0, 1, 2].map((i) => (
            <label key={i}>
              Роль {i + 1}
              <select
                value={value.roles?.[i]?.id || ""}
                onChange={(e) => {
                  const chosen = roles.find((r) => r.id === e.target.value);
                  if (!chosen) return;
                  const cast = [...(value.roles || [])];
                  cast[i] = {
                    id: chosen.id,
                    name: chosen.name,
                    instructions: chosen.instructions,
                  };
                  onChange({ ...value, roles: cast });
                }}
              >
                <option value="" disabled>
                  Выберите роль
                </option>
                {roles.map((r) => (
                  <option
                    value={r.id}
                    key={r.id}
                    disabled={value.roles?.some(
                      (x, j) => j !== i && x?.id === r.id,
                    )}
                  >
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
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
    </div>
  );
}
