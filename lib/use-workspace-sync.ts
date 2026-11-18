import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  equalData,
  exchangeWorkspace,
  mergeWorkspaces,
  type Checkpoint,
} from "./workspace-sync";
import type { Workspace } from "./workspace";

async function checkpointStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("english-coach-sync", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("checkpoint");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function checkpointData(
  db: IDBDatabase,
  user: string,
  value?: Checkpoint,
): Promise<Checkpoint | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("checkpoint", value ? "readwrite" : "readonly");
    const store = tx.objectStore("checkpoint");
    const req = value ? store.put(value, user) : store.get(user);
    tx.oncomplete = () => resolve(value || req.result);
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}
export function useWorkspaceSync(
  state: Workspace,
  setState: Dispatch<SetStateAction<Workspace>>,
  user: string | null,
  seed: Workspace | null,
) {
  const current = useRef(state);
  current.current = state;
  const wake = useRef<null | (() => void)>(null);
  const [status, setStatus] = useState("Сохранение на устройстве");
  useEffect(() => {
    if (!user || !seed) return;
    let stopped = false,
      running = false,
      again = false;
    let db: IDBDatabase | undefined, base: Checkpoint | undefined;
    const account = user,
      initial = seed;
    let timer: ReturnType<typeof setTimeout>;
    async function run() {
      if (stopped) return;
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        const owner = localStorage.getItem("english-coach.sync-owner");
        if (owner && owner !== account) {
          setStatus("Для этих локальных уроков нужен исходный аккаунт.");
          return;
        }
        if (!owner) localStorage.setItem("english-coach.sync-owner", account);
        if (!db) {
          db = await checkpointStore();
          base = await checkpointData(db, account);
        }
        if (stopped) return;
        const snapshot = current.current;
        setStatus("Синхронизация…");
        const next = await exchangeWorkspace(snapshot, base, initial);
        if (stopped) return;
        if (!equalData(snapshot, next.state)) {
          setState((latest) =>
            equalData(latest, snapshot)
              ? next.state
              : mergeWorkspaces(snapshot, latest, next.state),
          );
        }
        if (base?.etag !== next.etag) await checkpointData(db, account, next);
        base = next;
        if (!stopped) setStatus("Синхронизировано с аккаунтом");
      } catch {
        if (!stopped)
          setStatus("Изменения на устройстве. Синхронизация повторится.");
      } finally {
        running = false;
        if (again && !stopped) {
          again = false;
          schedule();
        }
        if (stopped) db?.close();
      }
    }
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(run, 380);
    }
    wake.current = schedule;
    const visible = () => {
      if (document.visibilityState === "visible") schedule();
    };
    const interval = setInterval(visible, 20000);
    window.addEventListener("online", schedule);
    window.addEventListener("focus", schedule);
    document.addEventListener("visibilitychange", visible);
    schedule();
    return () => {
      stopped = true;
      wake.current = null;
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("online", schedule);
      window.removeEventListener("focus", schedule);
      document.removeEventListener("visibilitychange", visible);
      if (!running) db?.close();
    };
  }, [user, seed, setState]);
  useEffect(() => {
    wake.current?.();
  }, [state]);
  return user ? status : "Данные на устройстве";
}
