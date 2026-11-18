import { type Workspace, migrate } from "./workspace.ts";

type Row = Record<string, unknown>;
const record = (v: unknown): v is Row =>
  !!v && typeof v === "object" && !Array.isArray(v);
export const equalData = (a: unknown, b: unknown) =>
  a === b || JSON.stringify(a) === JSON.stringify(b);

// Apply the device's edits relative to its last common snapshot, retaining unrelated server edits.
function mergeValue(base: unknown, local: unknown, cloud: unknown): unknown {
  if (equalData(local, base)) return cloud;
  if (equalData(cloud, base) || equalData(local, cloud)) return local;
  if (
    Array.isArray(local) &&
    Array.isArray(cloud) &&
    (base === undefined || Array.isArray(base))
  ) {
    const previous: unknown[] = Array.isArray(base) ? base : [];
    if (
      [...previous, ...cloud, ...local].every(
        (x) => record(x) && typeof x.id === "string",
      )
    ) {
      const keyed = (rows: Row[]) => new Map(rows.map((x) => [x.id, x]));
      const b = keyed(previous as Row[]),
        l = keyed(local),
        r = keyed(cloud);
      const merged = [];
      for (const key of new Set([...r.keys(), ...l.keys()])) {
        const v = mergeValue(b.get(key), l.get(key), r.get(key));
        if (v !== undefined) merged.push(v);
      }
      return merged;
    }
    // Keep independently added flags and review events, honour removals from the common snapshot.
    const key = (v: unknown) => JSON.stringify(v);
    const old = new Set(previous.map(key)),
      here = new Set(local.map(key)),
      there = new Set(cloud.map(key));
    const rows = new Map([...cloud, ...local].map((v) => [key(v), v]));
    return [...rows]
      .filter(([k]) => !old.has(k) || (here.has(k) && there.has(k)))
      .map(([, v]) => v);
  }
  if (record(local) && record(cloud) && (base === undefined || record(base))) {
    const before = record(base) ? base : {};
    const fields = Object.create(null);
    for (const k of new Set([...Object.keys(local), ...Object.keys(cloud)])) {
      const v = mergeValue(before[k], local[k], cloud[k]);
      if (v !== undefined) fields[k] = v;
    }
    return fields;
  }
  return local;
}
export function mergeWorkspaces(
  base: Workspace,
  device: Workspace,
  cloud: Workspace,
): Workspace {
  return migrate(mergeValue(base, device, cloud));
}
export type Checkpoint = { etag: string; state: Workspace };
export async function exchangeWorkspace(
  current: Workspace,
  checkpoint: Checkpoint | undefined,
  initial: Workspace,
  fetcher: typeof fetch = fetch,
): Promise<Checkpoint> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetcher("/api/workspace", {
      cache: "no-store",
      headers: checkpoint ? { "If-None-Match": checkpoint.etag } : {},
    });
    if (!res.ok && res.status !== 304 && res.status !== 404)
      throw Error("Не удалось загрузить уроки.");
    let remote: Checkpoint | undefined;
    if (res.status === 304 && checkpoint) remote = checkpoint;
    else if (res.ok) {
      const etag = res.headers.get("ETag");
      if (!etag) throw Error("Нет версии облачной копии.");
      remote = { etag, state: migrate(await res.json()) };
    }
    let ancestor = checkpoint?.state || initial;
    // A library can arrive independently on each device. Never interpret missing seed data as a deletion.
    if (
      !checkpoint &&
      (!current.importedSources?.length ||
        !remote?.state.importedSources?.length)
    )
      ancestor = {
        ...initial,
        vocabulary: [],
        exercises: [],
        importedSources: undefined,
      };
    const state = remote
      ? mergeWorkspaces(ancestor, current, remote.state)
      : current;
    if (remote && equalData(remote.state, state)) return remote;
    const condition: Record<string, string> = remote
      ? { "If-Match": remote.etag }
      : { "If-None-Match": "*" };
    const saved = await fetcher("/api/workspace", {
      method: "PUT",
      headers: { ...condition, "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    if (saved.status === 412) continue;
    if (!saved.ok) throw Error("Не удалось сохранить уроки.");
    const etag = saved.headers.get("ETag");
    if (!etag) throw Error("Нет подтверждения записи.");
    return { etag, state };
  }
  throw Error("Повтор синхронизации после изменений на другом устройстве.");
}
