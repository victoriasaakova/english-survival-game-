"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  BookOpen,
  Compass,
  Home,
  Mic,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Headphones,
  Volume2,
  Plus,
  Search,
  X,
  Check,
  Play,
  Pause,
  Download,
  Settings,
  Feather,
  Map,
  Leaf,
  Sparkles,
  Flag,
  LogOut,
  RotateCcw,
  Square,
  Send,
} from "lucide-react";
import {
  initialState,
  State,
  Word,
  Lesson,
  worlds,
  quests,
  blocks,
  addWord,
  nextDue,
  localDate,
  reviewWord,
  completeQuest,
} from "@/lib/learning";
import { api, download, speak, supabase } from "@/lib/client";
type Tab = "home" | "map" | "lessons" | "vocabulary" | "voice" | "book";
const nav = [
  { id: "home", label: "Сегодня", icon: Home },
  { id: "map", label: "Мой мир", icon: Compass },
  { id: "lessons", label: "Уроки", icon: BookOpen },
  { id: "vocabulary", label: "Словарь", icon: Leaf },
  { id: "voice", label: "Голос", icon: Mic },
  { id: "book", label: "Моя книга", icon: Feather },
] as const;
export default function App() {
  const [state, setState] = useState<State>(initialState),
    [ready, setReady] = useState(false),
    [tab, setTab] = useState<Tab>("home"),
    [modal, setModal] = useState(false),
    [notice, setNotice] = useState(""),
    [cloud, setCloud] = useState("На этом устройстве"),
    [user, setUser] = useState<string | null>(null),
    [email, setEmail] = useState(""),
    [active, setActive] = useState<string | null>(null),
    [selectedWorld, setSelectedWorld] = useState(0),
    [status, setStatus] = useState({ ai: false, cloud: false });
  const latest = useRef(state),
    cloudReady = useRef(false),
    backupBlocked = useRef(false);
  latest.current = state;
  const notify = useCallback((text: string) => setNotice(text), []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("innerworld.v1:guest");
      if (raw) {
        const s = JSON.parse(raw);
        if (
          s.version !== 1 ||
          !Array.isArray(s.words) ||
          !Array.isArray(s.lessons) ||
          !Array.isArray(s.chapters) ||
          !Array.isArray(s.completedQuests)
        )
          throw Error();
        setState(s);
      }
    } catch {
      backupBlocked.current = true;
      setNotice(
        "Сохранённые данные не удалось прочитать. Они сохранены без изменений; экспортируйте резервную копию в настройках.",
      );
    }
    setReady(true);
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!ready || backupBlocked.current || (user && !cloudReady.current))
      return;
    try {
      localStorage.setItem(
        "innerworld.v1:" + (user || "guest"),
        JSON.stringify(state),
      );
    } catch {
      setNotice(
        "Не хватает места для сохранения. Экспортируйте данные в настройках.",
      );
    }
  }, [state, ready, user]);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let disposed = false;
    async function load(id: string | null) {
      cloudReady.current = false;
      setUser(id);
      if (!id) {
        setCloud("На этом устройстве");
        try {
          setState(
            JSON.parse(localStorage.getItem("innerworld.v1:guest") || "null") ||
              initialState,
          );
        } catch {
          setState(initialState);
        }
        return;
      }
      const { data, error } = await client
        .from("learning_state")
        .select("data")
        .eq("user_id", id)
        .maybeSingle();
      if (disposed) return;
      if (error) {
        setCloud("Ошибка облака — локальная копия сохранена");
        return;
      }
      if (data?.data) {
        setState(data.data as State);
      } else {
        try {
          setState(
            JSON.parse(localStorage.getItem("innerworld.v1:" + id) || "null") ||
              initialState,
          );
        } catch {
          setState(initialState);
        }
      }
      cloudReady.current = true;
      setCloud("Облако подключено");
    }
    client.auth
      .getSession()
      .then(({ data }) => load(data.session?.user.id || null));
    const { data } = client.auth.onAuthStateChange((_e, s) => {
      setTimeout(() => load(s?.user.id || null), 0);
    });
    return () => {
      disposed = true;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!ready || !user || !supabase || !cloudReady.current) return;
    const timer = setTimeout(async () => {
      const { error } = await supabase!
        .from("learning_state")
        .upsert({
          user_id: user,
          data: state,
          updated_at: new Date().toISOString(),
        });
      setCloud(
        error
          ? "Ошибка синхронизации — есть локальная копия"
          : "Сохранено в облаке",
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [state, user, ready]);
  function update(fn: (s: State) => State) {
    setState(fn);
  }
  function start(q: number, m: 15 | 30) {
    const old = state.lessons.find((l) => !l.complete && l.quest === q);
    if (old) {
      setActive(old.id);
      setTab("lessons");
      return;
    }
    const id = crypto.randomUUID();
    const lesson: Lesson = {
      id,
      quest: q,
      minutes: m,
      block: 0,
      attempts: [],
      complete: false,
      started: new Date().toISOString(),
      targets: quests[q].phrases.map((p) => p[0]),
    };
    update((s) => ({ ...s, lessons: [...s.lessons, lesson] }));
    setActive(id);
    setTab("lessons");
  }
  const current = state.lessons.find((l) => l.id === active),
    due = state.words.filter((w) => nextDue(w) && nextDue(w)! <= localDate()),
    finished = state.lessons.filter((l) => l.complete).length;
  if (!ready) return <div className="loading">Открываем ваш мир…</div>;
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Innerworld, главная">
          <span className="brand-icon">
            <BookOpen size={23} />
          </span>
          innerworld<span className="brand-dot">✧</span>
        </a>
        <span className="eyebrow brand-caption">ENGLISH IN YOUR OWN WORDS</span>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "nav-item active" : "nav-item"}
              onClick={() => setTab(n.id)}
            >
              <n.icon size={20} />
              {n.label}
              {n.id === "vocabulary" && due.length > 0 && (
                <span className="count">{due.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="little-note">
            <Sparkles size={18} />
            <p>
              Каждая история —<br />
              ещё немного ближе к себе.
            </p>
          </div>
          <button className="profile" onClick={() => setModal(true)}>
            <span className="avatar">
              {state.name ? state.name[0].toUpperCase() : "Я"}
            </span>
            <span>
              <strong>{state.name || "Мой профиль"}</strong>
              <small>A2 · исследователь</small>
            </span>
            <Settings size={18} />
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>YOUR PERSONAL ENGLISH JOURNEY</span>
          <div>
            <span className="save-dot" />
            {cloud}
            <button
              className="icon-btn mobile-settings"
              aria-label="Настройки"
              onClick={() => setModal(true)}
            >
              <Settings size={18} />
            </button>
          </div>
        </header>
        <main>
          {tab === "home" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    A LITTLE PRACTICE. A BIGGER WORLD.
                  </div>
                  <h1>
                    Ваш мир звучит <em>по-новому.</em>
                  </h1>
                  <p>Учите английский через то, что вам близко.</p>
                </div>
                <div className="level-pill">
                  <span>✧</span> A2{" "}
                  <span className="muted">начало путешествия</span>
                </div>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <span className="tag light">ВАША СЛЕДУЮЩАЯ ГЛАВА</span>
                  <h2>
                    Большое путешествие
                    <br />
                    начинается с <em>«это я».</em>
                  </h2>
                  <p>
                    Знакомьтесь с собой на английском.
                    <br />
                    Одна история, три выражения и новые открытия.
                  </p>
                  <button
                    className="btn cream"
                    onClick={() => start(Math.min(finished, 4), 15)}
                  >
                    Начать путешествие <ArrowUpRight size={19} />
                  </button>
                  <span className="hero-meta">
                    15 минут · ваш темп · ваши истории
                  </span>
                </div>
                <WorldIllustration />
              </section>
              <div className="stats">
                <div>
                  <span className="stat-icon green">
                    <BookOpen size={20} />
                  </span>
                  <span>
                    <strong>{finished}</strong>
                    <small>уроков пройдено</small>
                  </span>
                </div>
                <div>
                  <span className="stat-icon peach">
                    <Leaf size={20} />
                  </span>
                  <span>
                    <strong>{state.words.length}</strong>
                    <small>выражений в словаре</small>
                  </span>
                </div>
                <div>
                  <span className="stat-icon purple">
                    <Feather size={20} />
                  </span>
                  <span>
                    <strong>{state.chapters.length}</strong>
                    <small>историй в вашей книге</small>
                  </span>
                </div>
                <div>
                  <span className="stat-icon yellow">
                    <Flag size={20} />
                  </span>
                  <span>
                    <strong>
                      {state.xp} <small className="inline">XP</small>
                    </strong>
                    <small>опыта исследователя</small>
                  </span>
                </div>
              </div>
              <div className="section-heading">
                <h2>Куда отправимся сегодня?</h2>
                <button className="text-btn" onClick={() => setTab("map")}>
                  Открыть карту <ArrowRight size={16} />
                </button>
              </div>
              <div className="action-grid">
                <button className="action-card" onClick={() => start(0, 15)}>
                  <span className="tile green">
                    <BookOpen />
                  </span>
                  <span className="duration">15 / 30 мин</span>
                  <h3>Маленький урок</h3>
                  <p>
                    Новые выражения, немного грамматики
                    <br />и разговор о важном для вас.
                  </p>
                  <span className="card-link">
                    Продолжить обучение <ArrowUpRight size={18} />
                  </span>
                </button>
                <button className="action-card" onClick={() => setTab("voice")}>
                  <span className="tile peach">
                    <Mic />
                  </span>
                  <span className="duration">В вашем темпе</span>
                  <h3>Расскажите свою историю</h3>
                  <p>
                    Запишите мысль голосом.
                    <br />
                    Превратим её в страницу вашей книги.
                  </p>
                  <span className="card-link">
                    Открыть голосовую студию <ArrowUpRight size={18} />
                  </span>
                </button>
                <button
                  className="action-card"
                  onClick={() => setTab("vocabulary")}
                >
                  <span className="tile purple">
                    <Leaf />
                  </span>
                  <span className="duration">{due.length} к повторению</span>
                  <h3>Слова, которые остаются</h3>
                  <p>
                    Вспомните знакомые выражения
                    <br />и найдите для них новый контекст.
                  </p>
                  <span className="card-link">
                    Заглянуть в словарь <ArrowUpRight size={18} />
                  </span>
                </button>
              </div>
              <div className="bottom-grid">
                <section className="journey-preview">
                  <div className="section-heading">
                    <h2>Карта вашего мира</h2>
                    <span className="eyebrow">01 / 06 ОСТРОВОВ</span>
                  </div>
                  <div className="island-row">
                    {worlds.slice(0, 3).map((w, i) => (
                      <button
                        key={w.name}
                        onClick={() => {
                          setSelectedWorld(i);
                          setTab("map");
                        }}
                      >
                        <span className={"island-mini " + w.color}>
                          {w.icon}
                        </span>
                        <strong>{w.name}</strong>
                        <small>
                          {i === 0
                            ? "Ваше путешествие начинается здесь"
                            : "Выберите свою тему"}
                        </small>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="book-preview">
                  <span className="eyebrow">THE BOOK OF YOU</span>
                  <Feather className="book-feather" size={60} />
                  <h3>
                    У каждой жизни
                    <br />
                    есть свой голос.
                  </h3>
                  <p>
                    Собирайте моменты в истории.
                    <br />
                    Пусть английский станет вашим.
                  </p>
                  <button className="text-btn" onClick={() => setTab("book")}>
                    Открыть мою книгу <ArrowRight size={16} />
                  </button>
                </section>
              </div>
            </>
          )}
          {tab === "map" && (
            <>
              <PageTitle
                eyebrow="EXPLORE YOUR INNER WORLD"
                title="Карта моего мира"
                subtitle="Выберите остров. Откройте историю. Найдите свои слова."
              />
              <div className="world-tabs">
                {worlds.map((w, i) => (
                  <button
                    key={w.name}
                    className={selectedWorld === i ? "selected" : ""}
                    onClick={() => setSelectedWorld(i)}
                  >
                    {w.icon} {w.name}
                  </button>
                ))}
              </div>
              <section className="map-scene">
                <WorldIllustration />
                <div className="map-label">
                  <span className="eyebrow">{worlds[selectedWorld].en}</span>
                  <h2>{worlds[selectedWorld].name}</h2>
                  <p>{worlds[selectedWorld].description}</p>
                </div>
              </section>
              <div className="section-heading">
                <h2>
                  {selectedWorld === 0
                    ? "Пять историй о вас"
                    : "Свободное исследование"}
                </h2>
                <span>
                  {selectedWorld === 0
                    ? `${state.completedQuests.length} / 5 квестов`
                    : "Через разговор и письмо"}
                </span>
              </div>
              {selectedWorld === 0 ? (
                <div className="quest-list">
                  {quests.map((q, i) => (
                    <div className="quest-row" key={q.title}>
                      <span
                        className={
                          "quest-number " +
                          (state.completedQuests.includes(i) ? "done" : "")
                        }
                      >
                        {state.completedQuests.includes(i) ? (
                          <Check />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      <div>
                        <h3>{q.title}</h3>
                        <p>{q.en}</p>
                      </div>
                      <span className="tag">+50 XP</span>
                      <button
                        className="btn small"
                        onClick={() => start(i, 15)}
                      >
                        {state.completedQuests.includes(i)
                          ? "Повторить"
                          : "Исследовать"}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="panel">
                  <h3>О чём хочется рассказать?</h3>
                  <p>
                    Откройте голосовую студию или начните новую главу на тему «
                    {worlds[selectedWorld].name}».
                  </p>
                  <div className="button-row">
                    <button className="btn" onClick={() => setTab("voice")}>
                      Рассказать голосом <Mic size={17} />
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => setTab("book")}
                    >
                      Написать историю <Feather size={17} />
                    </button>
                  </div>
                </div>
              )}
              <Games words={state.words} notify={notify} />
            </>
          )}
          {tab === "lessons" &&
            (current && !current.complete ? (
              <LessonView
                key={current.id}
                lesson={current}
                state={state}
                update={update}
                notify={notify}
                exit={() => setActive(null)}
              />
            ) : (
              <>
                <PageTitle
                  eyebrow="ONE SMALL STEP AT A TIME"
                  title="Мои уроки"
                  subtitle="15 или 30 минут. Семь шагов. Одна история, которую вы сможете рассказать."
                />
                <div className="lesson-grid">
                  {quests.map((q, i) => (
                    <section className="panel lesson-card" key={q.title}>
                      <span className="eyebrow">
                        ГЛАВА {String(i + 1).padStart(2, "0")}
                      </span>
                      <h2>{q.title}</h2>
                      <p>{q.prompt}</p>
                      <div className="phrase-chips">
                        {q.phrases.map((p) => (
                          <span key={p[0]}>{p[0]}</span>
                        ))}
                      </div>
                      <div className="button-row">
                        <button className="btn" onClick={() => start(i, 15)}>
                          15 минут <ArrowRight size={16} />
                        </button>
                        <button
                          className="btn secondary"
                          onClick={() => start(i, 30)}
                        >
                          30 минут
                        </button>
                      </div>
                    </section>
                  ))}
                </div>
                {state.lessons.length > 0 && (
                  <section className="panel">
                    <h2>История занятий</h2>
                    {state.lessons.map((l) => (
                      <details key={l.id}>
                        <summary>
                          {quests[l.quest].title} ·{" "}
                          {l.complete ? "Завершён" : `Шаг ${l.block + 1} из 7`}{" "}
                          · {new Date(l.started).toLocaleDateString("ru")}
                        </summary>
                        {l.attempts.map((a) => (
                          <div className="saved-answer" key={a.id}>
                            <strong>{blocks[a.block]}</strong>
                            <p>{a.answer}</p>
                            {a.feedback && <p>{a.feedback}</p>}
                          </div>
                        ))}
                        {!l.complete && (
                          <button
                            className="btn"
                            onClick={() => setActive(l.id)}
                          >
                            Продолжить
                          </button>
                        )}
                        <button
                          className="text-btn"
                          onClick={() =>
                            download(
                              "lesson.md",
                              `# ${quests[l.quest].title}\n\n` +
                                l.attempts
                                  .map(
                                    (a) =>
                                      `## ${blocks[a.block]}\n${a.answer}\n\n${a.feedback || "Без оценки"}\n`,
                                  )
                                  .join("\n"),
                            )
                          }
                        >
                          Скачать конспект <Download size={16} />
                        </button>
                      </details>
                    ))}
                  </section>
                )}
              </>
            ))}
          {tab === "vocabulary" && (
            <Vocabulary state={state} update={update} notify={notify} />
          )}
          {tab === "voice" && (
            <VoiceStudio
              state={state}
              update={update}
              notify={notify}
              connected={status.ai && status.cloud && !!user}
            />
          )}
          {tab === "book" && (
            <Book state={state} update={update} notify={notify} />
          )}
          <footer>
            <span>innerworld</span> Маленькие шаги. Настоящие истории. Ваш
            английский.
          </footer>
        </main>
      </div>
      <nav className="mobile-nav">
        {nav.map((n) => (
          <button
            key={n.id}
            className={tab === n.id ? "active" : ""}
            onClick={() => setTab(n.id)}
          >
            <n.icon size={20} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button
            className="icon-btn"
            aria-label="Закрыть сообщение"
            onClick={() => setNotice("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Настройки"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close icon-btn"
              onClick={() => setModal(false)}
              aria-label="Закрыть"
            >
              <X />
            </button>
            <h2>Ваше пространство</h2>
            <label>
              Как к вам обращаться?
              <input
                value={state.name}
                onChange={(e) =>
                  update((s) => ({ ...s, name: e.target.value }))
                }
                placeholder="Ваше имя"
              />
            </label>
            <label>
              Интересные темы (через запятую)
              <input
                value={state.interests.join(", ")}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    interests: e.target.value.split(",").map((t) => t.trim()),
                  }))
                }
              />
            </label>
            <p className="muted">
              A2 — ваша начальная самооценка. Наблюдения по письму, грамматике и
              речи будут собираться отдельно.
            </p>
            <div className="status-box">
              {status.ai ? "ИИ настроен" : "ИИ пока не подключён"} · {cloud}
            </div>
            {supabase ? (
              user ? (
                <button
                  className="btn secondary"
                  onClick={() => supabase?.auth.signOut()}
                >
                  Выйти <LogOut size={16} />
                </button>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const { error } = await supabase!.auth.signInWithOtp({
                      email,
                      options: { emailRedirectTo: location.origin },
                    });
                    notify(
                      error
                        ? error.message
                        : "Ссылка для входа отправлена на вашу почту.",
                    );
                  }}
                >
                  <label>
                    Почта для входа
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </label>
                  <button className="btn">Получить ссылку для входа</button>
                </form>
              )
            ) : (
              <p>
                Сейчас записи сохраняются в этом браузере. Облачная
                синхронизация появится после подключения Supabase.
              </p>
            )}
            <hr />
            <button
              className="btn secondary"
              onClick={() =>
                download(
                  "innerworld-backup.json",
                  backupBlocked.current
                    ? localStorage.getItem(
                        "innerworld.v1:" + (user || "guest"),
                      ) || ""
                    : JSON.stringify(state, null, 2),
                  "application/json",
                )
              }
            >
              Скачать все мои данные <Download size={16} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
function WorldIllustration() {
  return (
    <svg
      className="world-art"
      viewBox="0 0 600 400"
      role="img"
      aria-label="Иллюстрированный остров с домиком, тропинкой и деревьями"
    >
      <defs>
        <linearGradient id="land" x2="0" y2="1">
          <stop stopColor="#aac5a0" />
          <stop offset="1" stopColor="#709b7a" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#bdd5bd" opacity=".22">
        <ellipse cx="325" cy="276" rx="246" ry="88" />
        <ellipse cx="325" cy="276" rx="218" ry="73" />
        <path d="M60 192q80-32 120-4M400 105q55-24 100-2M440 334q50 5 80-9" />
      </g>
      <path
        d="M135 245q-35-40 26-63l54-12 20-42 66-15 61 27 66 16 48 57-12 58-58 36-103 12-85-25z"
        fill="#3f7260"
      />
      <path
        d="M124 225q-22-38 39-61l54-12 20-42 66-15 61 27 66 16 48 57-12 58-58 36-103 12-85-25z"
        fill="url(#land)"
      />
      <path
        d="M220 265q94-15 88-60t59-47"
        stroke="#e6d7aa"
        strokeWidth="21"
        fill="none"
      />
      <path d="M293 207v-60l48-19 48 19v60l-48 18z" fill="#efe2bd" />
      <path d="m281 148 59-52 61 52-58-17z" fill="#c9815d" />
      <path d="m340 96 61 52-58-17z" fill="#9a5f46" />
      <path d="M331 218v-39q10-13 20 0v39" fill="#466450" />
      <path d="M308 166h12v18h-12m43-20h14v18h-14" fill="#7d9d8a" />
      <g stroke="#486e52" strokeWidth="6">
        <path d="M194 209v-56M247 175v-70M426 231v-68M393 264v-50" />
      </g>
      <g fill="#446e52">
        <ellipse cx="192" cy="147" rx="22" ry="35" />
        <ellipse cx="247" cy="101" rx="25" ry="39" />
        <ellipse cx="426" cy="157" rx="26" ry="43" />
        <ellipse cx="393" cy="211" rx="18" ry="27" />
      </g>
      <g fill="#66916b">
        <ellipse cx="187" cy="139" rx="15" ry="24" />
        <ellipse cx="241" cy="91" rx="17" ry="28" />
        <ellipse cx="418" cy="145" rx="17" ry="31" />
      </g>
      <g fill="#f1dc9e">
        <circle cx="167" cy="215" r="4" />
        <circle cx="179" cy="224" r="3" />
        <circle cx="368" cy="264" r="4" />
        <circle cx="378" cy="271" r="3" />
      </g>
      <path
        d="M271 270v-29m0 0 23 5-23 8"
        stroke="#f5ecd2"
        strokeWidth="3"
        fill="#cf955d"
      />
      <g fill="#e8dab3">
        <path d="m476 77 3 10 10 3-10 3-3 10-3-10-10-3 10-3zM148 102l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
        <circle cx="387" cy="62" r="3" />
        <circle cx="112" cy="276" r="2" />
      </g>
      <path
        d="m460 125 10-5 10 5m-31-50 8-4 8 4"
        fill="none"
        stroke="#b9d0b6"
        strokeWidth="2"
      />
      <g transform="translate(97 306) rotate(-12)">
        <path d="M0 0h47L34 12H13z" fill="#d6b380" />
        <path d="M25-38v38H4z" fill="#f5e8c7" />
      </g>
    </svg>
  );
}
type Shared = {
  state: State;
  update: (fn: (s: State) => State) => void;
  notify: (s: string) => void;
};
function LessonView({
  lesson,
  state,
  update,
  notify,
  exit,
}: Shared & { lesson: Lesson; exit: () => void }) {
  const q = quests[lesson.quest],
    b = lesson.block,
    [answer, setAnswer] = useState(lesson.draft || ""),
    [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false),
    [test, setTest] = useState<Record<number, string>>({}),
    [result, setResult] = useState("");
  const basePrompts = [
    `Вспомните без подсказок: как сказать «мне нравится» и «мне хотелось бы»? Затем представьтесь одним предложением.`,
    `${q.grammar}\nСоставьте два своих примера.`,
    `Прочитайте выражения ниже. Объясните своими словами значение каждого.`,
    q.prompt,
    `Составьте по одному новому предложению с каждым выражением: ${q.phrases.map((p) => p[0]).join(", ")}.`,
    q.writing,
    "Ответьте самостоятельно. Первые ответы сохранятся отдельно от последующих исправлений.",
  ];
  const prompts = lesson.prompts
    ? [...lesson.prompts, basePrompts[6]]
    : basePrompts;
  async function personalize() {
    setBusy(true);
    try {
      const r = await api("coach", {
        task: "plan",
        text: JSON.stringify({
          interests: state.interests,
          topic: q.title,
          grammar: q.grammar,
          expressions: q.phrases,
          minutes: lesson.minutes,
          previous: state.lessons
            .filter((l) => l.complete)
            .slice(-3)
            .flatMap((l) => l.attempts.filter((a) => a.feedback).slice(-2))
            .map((a) => ({ answer: a.answer, feedback: a.feedback })),
        }),
      });
      update((s) => ({
        ...s,
        lessons: s.lessons.map((l) =>
          l.id === lesson.id ? { ...l, prompts: r.tasks } : l,
        ),
      }));
      notify("Задания адаптированы под ваши интересы и доступную историю.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const count = lesson.minutes === 15 ? 3 : 5;
  const questions = [
    { text: q.pattern, options: q.options, correct: q.options[q.answer] },
    {
      text: `Как сказать «${q.phrases[0][1]}»?`,
      options: [q.phrases[1][0], q.phrases[0][0], q.phrases[2][0]],
      correct: q.phrases[0][0],
    },
    {
      text: "Напишите новое предложение о друге, используя одно из выражений урока.",
    },
    ...(count === 5
      ? [
          {
            text: "Напишите вопрос новому знакомому с изученной конструкцией.",
          },
          {
            text: state.words.length
              ? `Вспомните выражение: «${state.words[0].meaning}», и примените его в новой ситуации.`
              : "Расскажите о новом интересе одним предложением.",
          },
        ]
      : []),
  ];
  function save(text: string, fb?: string) {
    const last = lesson.attempts.at(-1);
    if (
      last?.block === b &&
      last.answer === text &&
      (!fb || last.feedback === fb)
    )
      return last.id;
    const id = crypto.randomUUID();
    update((s) => ({
      ...s,
      lessons: s.lessons.map((l) =>
        l.id === lesson.id
          ? {
              ...l,
              attempts: [
                ...l.attempts,
                {
                  id,
                  block: b,
                  answer: text,
                  feedback: fb,
                  assisted: !!feedback,
                  date: new Date().toISOString(),
                },
              ],
            }
          : l,
      ),
    }));
    return id;
  }
  async function check() {
    if (!answer.trim()) return;
    const id = save(answer);
    setBusy(true);
    try {
      const r = await api("coach", {
        task: "feedback",
        text: answer,
        context: prompts[b],
      });
      setFeedback(r.feedback);
      update((s) => ({
        ...s,
        lessons: s.lessons.map((l) =>
          l.id === lesson.id
            ? {
                ...l,
                attempts: l.attempts.map((a) =>
                  a.id === id ? { ...a, feedback: r.feedback } : a,
                ),
              }
            : l,
        ),
      }));
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function next() {
    if (b !== 6 && !answer.trim()) {
      notify("Добавьте ответ, чтобы сохранить этот шаг.");
      return;
    }
    if (b !== 6) save(answer, feedback || undefined);
    update((s) => {
      let out = s;
      if (b === 2)
        for (const p of q.phrases) out = addWord(out, p[0], p[1], p[2]);
      out = {
        ...out,
        lessons: out.lessons.map((l) =>
          l.id === lesson.id
            ? { ...l, block: Math.min(6, b + 1), draft: "", complete: b === 6 }
            : l,
        ),
      };
      if (b === 6) out = completeQuest(out, lesson.quest);
      return out;
    });
    setAnswer("");
    setFeedback("");
    if (b === 6) {
      notify(
        "Урок сохранён. Вы открыли ещё одну историю своего мира. +50 XP за первое прохождение.",
      );
      exit();
    }
  }
  function submitTest() {
    if (questions.some((_, i) => !test[i]?.trim())) {
      notify("Ответьте на все задания. Можно вернуться к уроку позже.");
      return;
    }
    let correct = 0;
    questions.forEach((q, i) => {
      if (q.correct === test[i]) correct++;
    });
    const summary = `${correct} / 2 закрытых заданий верно. ${count - 2} открытых ответа сохранены для разбора. Это не оценка общего уровня.`;
    save(
      questions.map((q, i) => `${q.text}\n${test[i]}`).join("\n\n"),
      summary,
    );
    setResult(summary);
  }
  return (
    <>
      <div className="section-heading">
        <button className="text-btn" onClick={exit}>
          ← Все уроки
        </button>
        <span className="tag">{lesson.minutes} минут · A2</span>
      </div>
      <PageTitle
        eyebrow={`ГЛАВА ${lesson.quest + 1} · ШАГ ${b + 1} ИЗ 7`}
        title={q.title}
        subtitle="Один короткий шаг за раз. Можно остановиться и вернуться позже."
      />
      <div className="button-row">
        <button
          className="btn secondary"
          onClick={personalize}
          disabled={busy || lesson.attempts.length > 0}
        >
          {busy ? "Подготавливаем…" : "Адаптировать под мои интересы"}
          <Sparkles size={16} />
        </button>
        <small className="muted">
          Перед началом · учитывает предыдущие разборы · требуется ИИ
        </small>
      </div>
      <div className="steps">
        {blocks.map((n, i) => (
          <div key={n} className={i === b ? "current" : i < b ? "done" : ""}>
            <span>{i < b ? <Check size={14} /> : i + 1}</span>
            <small>{n}</small>
          </div>
        ))}
      </div>
      <section className="panel exercise">
        <span className="eyebrow">{blocks[b]}</span>
        <h2>
          {b === 3
            ? "Дайте своей истории голос"
            : b === 6
              ? "Что осталось с вами?"
              : b === 5
                ? "Маленькая история"
                : "Попробуем вместе"}
        </h2>
        <p className="prompt">{prompts[b]}</p>
        {b === 2 && (
          <div className="expression-list">
            {q.phrases.map((p) => (
              <div key={p[0]}>
                <button
                  className="icon-btn"
                  onClick={() => speak(p[2])}
                  aria-label="Послушать пример"
                >
                  <Volume2 size={18} />
                </button>
                <strong>{p[0]}</strong>
                <span>{p[1]}</span>
                <p>{p[2]}</p>
              </div>
            ))}
          </div>
        )}
        {b === 3 && (
          <>
            <p className="muted">
              {lesson.minutes === 15
                ? "До двух ответов по 30–45 секунд"
                : "До трёх ответов по 60–90 секунд"}
              . После разбора попробуйте ещё раз.
            </p>
            <Recorder onText={setAnswer} notify={notify} />
          </>
        )}
        {b === 6 ? (
          <>
            {questions.map((q, i) => (
              <fieldset key={q.text} disabled={!!result}>
                <legend>
                  {i + 1}. {q.text}
                </legend>
                {q.options ? (
                  q.options.map((o) => (
                    <label className="radio" key={o}>
                      <input
                        type="radio"
                        name={"test" + i}
                        value={o}
                        checked={test[i] === o}
                        onChange={() => setTest({ ...test, [i]: o })}
                      />
                      {o}
                    </label>
                  ))
                ) : (
                  <textarea
                    aria-label={q.text}
                    value={test[i] || ""}
                    onChange={(e) => setTest({ ...test, [i]: e.target.value })}
                  />
                )}
              </fieldset>
            ))}
            {result ? (
              <div className="feedback">{result}</div>
            ) : (
              <button className="btn" onClick={submitTest}>
                Завершить тест <Check size={17} />
              </button>
            )}
          </>
        ) : (
          <>
            <textarea
              className="answer"
              placeholder="Your words go here…"
              aria-label="Ваш ответ"
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                update((s) => ({
                  ...s,
                  lessons: s.lessons.map((l) =>
                    l.id === lesson.id ? { ...l, draft: e.target.value } : l,
                  ),
                }));
              }}
            />
            {feedback && (
              <div className="feedback">
                <strong>Разбор преподавателя</strong>
                <p>{feedback}</p>
                <small>Исправьте ответ выше и повторите попытку.</small>
              </div>
            )}
            <div className="button-row">
              <button
                className="btn secondary"
                disabled={busy || !answer.trim()}
                onClick={check}
              >
                {busy ? "Разбираем…" : "Получить разбор"} <Sparkles size={16} />
              </button>
              <span className="muted">
                Ответ сохранится даже при недоступности ИИ.
              </span>
            </div>
          </>
        )}
        <div className="exercise-footer">
          <span className="muted">
            {b + 1} / 7 · {blocks[b]}
          </span>
          <button
            className="btn"
            disabled={busy || (b === 6 && !result)}
            onClick={next}
          >
            {b === 6 ? "Сохранить урок" : "Сохранить и дальше"}
            <ArrowRight size={17} />
          </button>
        </div>
      </section>
    </>
  );
}
function Vocabulary({ state, update, notify }: Shared) {
  const [search, setSearch] = useState(""),
    [adding, setAdding] = useState(false),
    [expression, setExpression] = useState(""),
    [meaning, setMeaning] = useState(""),
    [example, setExample] = useState(""),
    [review, setReview] = useState<Word | null>(null),
    [answer, setAnswer] = useState(""),
    [revealed, setRevealed] = useState(false),
    [busy, setBusy] = useState(false);
  const due = state.words
    .filter((w) => nextDue(w) && nextDue(w)! <= localDate())
    .sort((a, b) => nextDue(a)!.localeCompare(nextDue(b)!));
  async function check() {
    if (!review) return;
    setBusy(true);
    try {
      const r = await api("coach", {
        task: "review",
        text: answer,
        context: `Recall ${review.expression} (${review.meaning}) and use in an original sentence. Answer revealed: ${revealed}`,
      });
      update((s) => ({
        ...s,
        words: s.words.map((w) =>
          w.id === review.id
            ? reviewWord(w, localDate(), r.passed, revealed, true, answer)
            : w,
        ),
      }));
      notify(r.feedback);
      setReview(null);
      setAnswer("");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="WORDS THAT BECOME YOURS"
        title="Мой словарь"
        subtitle="Отдельные слова, целые выражения и ваши собственные примеры."
      />
      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <input
            placeholder="Найти слово или выражение"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className="btn secondary" onClick={() => setAdding(!adding)}>
          <Plus size={17} />
          Добавить
        </button>
        <button
          className="btn"
          disabled={!due.length}
          onClick={() => {
            setReview(due[0]);
            setRevealed(false);
            setAnswer("");
          }}
        >
          Повторить · {due.length}
        </button>
      </div>
      {adding && (
        <form
          className="panel add-form"
          onSubmit={(e) => {
            e.preventDefault();
            update((s) =>
              addWord(s, expression.trim(), meaning.trim(), example.trim()),
            );
            setAdding(false);
            setExpression("");
            setMeaning("");
            setExample("");
          }}
        >
          <label>
            Выражение
            <input
              required
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
            />
          </label>
          <label>
            Значение
            <input
              required
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
            />
          </label>
          <label>
            Пример
            <input
              required
              value={example}
              onChange={(e) => setExample(e.target.value)}
            />
          </label>
          <button className="btn">Сохранить</button>
        </form>
      )}
      {review && (
        <section className="panel">
          <h2>Вспомните: {review.meaning}</h2>
          <p>Напишите выражение и новое предложение с ним.</p>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            aria-label="Ответ для повторения"
          />
          <div className="button-row">
            <button
              className="btn"
              onClick={check}
              disabled={busy || !answer.trim()}
            >
              {busy ? "Проверяем…" : "Проверить"}
            </button>
            <button className="text-btn" onClick={() => setRevealed(true)}>
              Показать подсказку
            </button>
            <button className="text-btn" onClick={() => setReview(null)}>
              Позже
            </button>
          </div>
          {revealed && (
            <p className="feedback">
              {review.expression} — {review.example}
            </p>
          )}
        </section>
      )}
      {!state.words.length ? (
        <Empty
          icon={<Leaf size={35} />}
          title="Здесь будут ваши новые слова"
          text="Пройдите блок выражений в уроке или добавьте первое самостоятельно."
        />
      ) : (
        <>
          <div className="word-grid">
            {state.words
              .filter((w) =>
                (w.expression + " " + w.meaning)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((w) => (
                <section className="word-card" key={w.id}>
                  <div className="section-heading">
                    <span className="tag">
                      {w.passed.length === 4
                        ? "Цикл завершён"
                        : `${w.passed.length} / 4 повторений`}
                    </span>
                    <button
                      className="icon-btn"
                      aria-label={"Послушать " + w.expression}
                      onClick={() => speak(w.example || w.expression)}
                    >
                      <Volume2 size={18} />
                    </button>
                  </div>
                  <h3>{w.expression}</h3>
                  <p>{w.meaning}</p>
                  <blockquote>{w.example}</blockquote>
                  <div className="word-bottom">
                    <small>
                      {nextDue(w)
                        ? `Повторить ${nextDue(w)}`
                        : "Продолжайте применять в речи"}
                    </small>
                    <button
                      className="text-btn"
                      onClick={() => {
                        setReview(w);
                        setRevealed(false);
                        setAnswer("");
                      }}
                    >
                      Практика
                    </button>
                  </div>
                </section>
              ))}
          </div>
          <button
            className="text-btn"
            onClick={() =>
              download(
                "vocabulary.csv",
                "\uFEFFExpression,Meaning,Example\n" +
                  state.words
                    .map((w) =>
                      [w.expression, w.meaning, w.example]
                        .map((v) => '"' + v.replaceAll('"', '""') + '"')
                        .join(","),
                    )
                    .join("\n"),
                "text/csv",
              )
            }
          >
            Экспорт словаря <Download size={16} />
          </button>
        </>
      )}
    </>
  );
}
function Recorder({
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
function VoiceStudio({
  state,
  update,
  notify,
  connected,
}: Shared & { connected: boolean }) {
  const [text, setText] = useState(""),
    [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false),
    [live, setLive] = useState(false),
    [connecting, setConnecting] = useState(false),
    [transcript, setTranscript] = useState("");
  const pc = useRef<RTCPeerConnection | null>(null),
    stream = useRef<MediaStream | null>(null),
    audio = useRef<HTMLAudioElement | null>(null),
    channel = useRef<RTCDataChannel | null>(null),
    endTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    talk = useRef("");
  useEffect(() => {
    const draft = localStorage.getItem("innerworld.voice");
    if (draft) setText(draft);
    return () => {
      if (endTimer.current) clearTimeout(endTimer.current);
      pc.current?.close();
      stream.current?.getTracks().forEach((t) => t.stop());
      if (audio.current) audio.current.srcObject = null;
    };
  }, []);
  function draft(value: string) {
    setText(value);
    try {
      localStorage.setItem("innerworld.voice", value);
    } catch {
      notify("Не удалось сохранить черновик. Скопируйте текст.");
    }
  }
  function stop() {
    if (endTimer.current) clearTimeout(endTimer.current);
    channel.current?.close();
    pc.current?.close();
    stream.current?.getTracks().forEach((t) => t.stop());
    if (audio.current) audio.current.srcObject = null;
    setLive(false);
    if (talk.current) draft(talk.current);
  }
  async function call() {
    if (live) {
      stop();
      return;
    }
    setConnecting(true);
    try {
      if (!connected)
        throw Error(
          "Для живого разговора нужны подключение ИИ и вход в аккаунт.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const p = new RTCPeerConnection();
      pc.current = p;
      audio.current = new Audio();
      audio.current.autoplay = true;
      p.ontrack = (e) => {
        audio.current!.srcObject = e.streams[0];
      };
      stream.current.getTracks().forEach((t) => p.addTrack(t, stream.current!));
      const dc = p.createDataChannel("oai-events");
      channel.current = dc;
      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (
            msg.type === "conversation.item.input_audio_transcription.completed"
          ) {
            talk.current += (talk.current ? "\n" : "") + msg.transcript;
            setTranscript(talk.current);
            localStorage.setItem("innerworld.voice", talk.current);
          }
          if (msg.type === "error")
            notify(
              "Ошибка голосового сервиса. Разговор можно завершить и сохранить текст.",
            );
        } catch {}
      };
      dc.onopen = () =>
        dc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions:
                "Ask the learner which personal topic they would like to discuss. Keep it to one short question.",
            },
          }),
        );
      p.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(p.connectionState)) {
          stop();
        }
      };
      const offer = await p.createOffer();
      await p.setLocalDescription(offer);
      const sdp = await api("realtime", offer.sdp, true);
      await p.setRemoteDescription({ type: "answer", sdp });
      setLive(true);
      talk.current = "";
      setTranscript("");
      endTimer.current = setTimeout(stop, 7 * 60 * 1000);
    } catch (e) {
      stop();
      notify((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }
  async function process(task: "essay" | "feedback") {
    setBusy(true);
    try {
      const r = await api("coach", { task, text });
      if (task === "essay") {
        update((s) => ({
          ...s,
          chapters: [
            ...s.chapters,
            {
              id: crypto.randomUUID(),
              title: "История из голоса",
              original: text,
              text: r.text,
              created: new Date().toISOString(),
            },
          ],
        }));
        notify("Черновик добавлен в «Мою книгу». Его можно отредактировать.");
      } else setFeedback(r.feedback);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="FIND YOUR OWN VOICE"
        title="Голосовая студия"
        subtitle="Мысли не обязаны быть идеальными. Просто начните говорить."
      />
      <div className="voice-grid">
        <section className="panel">
          <span className="tile peach">
            <Mic />
          </span>
          <h2>Моя история</h2>
          <p>
            Запишите голосовое, получите расшифровку и соберите из неё эссе.
          </p>
          <Recorder onText={draft} notify={notify} />
        </section>
        <section className="panel live-panel">
          <span className="tile purple">
            <Headphones />
          </span>
          <h2>Поговорим?</h2>
          <p>
            Живой разговор с преподавателем. Короткие вопросы, время подумать и
            понятные исправления.
          </p>
          <div className={"wave " + (live ? "moving" : "")}>
            {[12, 28, 45, 21, 56, 34, 62, 42, 23, 48, 30, 16].map((h, i) => (
              <i key={i} style={{ height: h, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <button className="btn" onClick={call} disabled={connecting}>
            {connecting
              ? "Соединяем…"
              : live
                ? "Завершить разговор"
                : "Начать разговор"}
            {live ? <Square size={17} /> : <Headphones size={17} />}
          </button>
          <p className="muted">
            До 7 минут за сессию ·{" "}
            {connected ? "Преподаватель доступен" : "Подключение ИИ ожидается"}
          </p>
        </section>
      </div>
      {transcript && (
        <section className="panel">
          <h3>Ваши реплики</h3>
          <p className="pre-wrap">{transcript}</p>
        </section>
      )}
      <section className="panel">
        <h2>От мысли к истории</h2>
        <p>Проверьте расшифровку или напишите историю самостоятельно.</p>
        <textarea
          className="long-text"
          value={text}
          onChange={(e) => draft(e.target.value)}
          placeholder="Today I’d like to tell you about…"
          aria-label="Текст вашей истории"
        />
        <div className="button-row">
          <button
            className="btn secondary"
            disabled={!text.trim() || busy}
            onClick={() => process("feedback")}
          >
            Разобрать английский <Sparkles size={16} />
          </button>
          <button
            className="btn"
            disabled={!text.trim() || busy}
            onClick={() => process("essay")}
          >
            {busy ? "Обрабатываем…" : "Собрать эссе"}
            <Feather size={16} />
          </button>
          <button
            className="text-btn"
            disabled={!text.trim()}
            onClick={() => {
              update((s) => ({
                ...s,
                chapters: [
                  ...s.chapters,
                  {
                    id: crypto.randomUUID(),
                    title: "Моя история",
                    original: text,
                    text,
                    created: new Date().toISOString(),
                  },
                ],
              }));
              notify("История сохранена в книге.");
            }}
          >
            Сохранить исходный текст
          </button>
        </div>
        {feedback && <div className="feedback pre-wrap">{feedback}</div>}
      </section>
    </>
  );
}
function Book({ state, update, notify }: Shared) {
  const [edit, setEdit] = useState<string | null>(null),
    [title, setTitle] = useState(""),
    [text, setText] = useState(""),
    [original, setOriginal] = useState(""),
    [busy, setBusy] = useState(false);
  function open(id?: string) {
    const c = state.chapters.find((c) => c.id === id);
    setEdit(c?.id || "new");
    setTitle(c?.title || "");
    setText(c?.text || "");
    setOriginal(c?.original || "");
  }
  function save() {
    if (!text.trim() || !title.trim()) return;
    const c = {
      id: edit === "new" ? crypto.randomUUID() : edit!,
      title: title.trim(),
      text,
      original: original || text,
      created: new Date().toISOString(),
    };
    update((s) => ({
      ...s,
      chapters:
        edit === "new"
          ? [...s.chapters, c]
          : s.chapters.map((old) =>
              old.id === edit ? { ...c, created: old.created } : old,
            ),
    }));
    setEdit(null);
    notify("Глава сохранена.");
  }
  async function polish() {
    setBusy(true);
    try {
      const r = await api("coach", { task: "essay", text });
      if (!original) setOriginal(text);
      setText(r.text);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="THE BOOK OF YOU"
        title="Книга моего мира"
        subtitle="Ваши мысли становятся историями. Истории становятся вашим английским."
      />
      <div className="book-banner">
        <span>MY INNER WORLD</span>
        <h2>
          Истории, в которых
          <br />я узнаю <em>себя.</em>
        </h2>
        <Feather size={90} />
        <p>{state.chapters.length} глав · написано вашим голосом</p>
      </div>
      <div className="section-heading">
        <h2>Мои главы</h2>
        <div className="button-row">
          <button
            className="text-btn"
            disabled={!state.chapters.length}
            onClick={() =>
              download(
                "my-inner-world.md",
                "# My inner world\n\n" +
                  state.chapters
                    .map((c) => `## ${c.title}\n\n${c.text}\n`)
                    .join("\n"),
              )
            }
          >
            Скачать книгу <Download size={17} />
          </button>
          <button className="btn" onClick={() => open()}>
            <Plus size={17} />
            Новая глава
          </button>
        </div>
      </div>
      {!state.chapters.length ? (
        <Empty
          icon={<Feather size={35} />}
          title="Первая страница ждёт вас"
          text="Расскажите о маленькой радости, важном человеке или своей мечте."
        />
      ) : (
        <div className="chapter-grid">
          {state.chapters.map((c, i) => (
            <article className="chapter" key={c.id}>
              <span className="eyebrow">
                ГЛАВА {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{c.title}</h2>
              <p className="chapter-excerpt">{c.text}</p>
              <button className="text-btn" onClick={() => open(c.id)}>
                Читать и редактировать <ArrowUpRight size={17} />
              </button>
            </article>
          ))}
        </div>
      )}
      {edit && (
        <div className="overlay">
          <section
            className="modal editor"
            role="dialog"
            aria-modal="true"
            aria-label="Редактор главы"
          >
            <button
              className="close icon-btn"
              onClick={() => setEdit(null)}
              aria-label="Закрыть"
            >
              <X />
            </button>
            <h2>{edit === "new" ? "Новая глава" : "Ваша история"}</h2>
            <label>
              Название
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A little about me"
              />
            </label>
            <label>
              Текст
              <textarea
                className="long-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="I’ve always wanted to…"
              />
            </label>
            {original && (
              <details>
                <summary>Исходный текст</summary>
                <p className="pre-wrap">{original}</p>
              </details>
            )}
            <div className="button-row">
              <button
                className="btn"
                onClick={save}
                disabled={!title.trim() || !text.trim() || busy}
              >
                Сохранить главу
              </button>
              <button
                className="btn secondary"
                onClick={polish}
                disabled={!text.trim() || busy}
              >
                {busy ? "Редактируем…" : "Помочь с английским"}
              </button>
              {edit !== "new" && (
                <button
                  className="text-btn danger"
                  onClick={() => {
                    if (confirm("Удалить эту главу?")) {
                      update((s) => ({
                        ...s,
                        chapters: s.chapters.filter((c) => c.id !== edit),
                      }));
                      setEdit(null);
                    }
                  }}
                >
                  Удалить
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
function Empty({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="empty">
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Games({
  words,
  notify,
}: {
  words: Word[];
  notify: (s: string) => void;
}) {
  const [game, setGame] = useState<number | null>(null),
    [chosen, setChosen] = useState<string[]>([]),
    [answer, setAnswer] = useState(""),
    [reveal, setReveal] = useState(false),
    [dialog, setDialog] = useState(0);
  const sentence = ["I", "enjoy", "learning", "new", "things."];
  const shuffled = ["new", "enjoy", "things.", "I", "learning"];
  return (
    <section>
      <div className="section-heading">
        <h2>Игровая поляна</h2>
        <span className="muted">Практика без оценок и спешки</span>
      </div>
      <div className="action-grid">
        {[
          {
            title: "Собери мысль",
            text: "Превратите россыпь слов в предложение.",
            icon: "✧",
          },
          {
            title: "Вспомни слово",
            text: "Найдите выражение в своей памяти.",
            icon: "✿",
          },
          {
            title: "Первое знакомство",
            text: "Выберите реплику и продолжите диалог.",
            icon: "☀",
          },
        ].map((g, i) => (
          <button
            className="action-card"
            key={g.title}
            onClick={() => {
              setGame(i);
              setChosen([]);
              setAnswer("");
              setReveal(false);
              setDialog(0);
            }}
          >
            <span className="game-symbol">{g.icon}</span>
            <h3>{g.title}</h3>
            <p>{g.text}</p>
            <span className="card-link">
              Играть <Play size={16} />
            </span>
          </button>
        ))}
      </div>
      {game !== null && (
        <div className="overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Игра"
          >
            <button
              className="close icon-btn"
              onClick={() => setGame(null)}
              aria-label="Закрыть"
            >
              <X />
            </button>
            {game === 0 ? (
              <>
                <h2>Собери мысль</h2>
                <p>«Мне нравится узнавать новое»</p>
                <div className="sentence">
                  {chosen.join(" ") || "Нажимайте на слова по порядку"}
                </div>
                <div className="phrase-chips">
                  {shuffled.map((w) => (
                    <button
                      className="btn secondary"
                      disabled={chosen.includes(w)}
                      key={w}
                      onClick={() => setChosen([...chosen, w])}
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <div className="button-row">
                  <button
                    className="btn"
                    onClick={() =>
                      notify(
                        chosen.join(" ") === sentence.join(" ")
                          ? "Верно: после enjoy используем learning."
                          : "Попробуйте начать с I enjoy…",
                      )
                    }
                  >
                    Проверить
                  </button>
                  <button className="text-btn" onClick={() => setChosen([])}>
                    Заново <RotateCcw size={16} />
                  </button>
                </div>
              </>
            ) : game === 1 ? (
              <>
                <h2>Вспомни слово</h2>
                <p>{words[0]?.meaning || "Мне хотелось бы"}</p>
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  aria-label="Выражение на английском"
                  placeholder="Your answer…"
                />
                <button className="btn" onClick={() => setReveal(true)}>
                  Показать ответ
                </button>
                {reveal && (
                  <div className="feedback">
                    {words[0]?.expression || "I’d like to"}
                    <p>
                      Теперь придумайте свой пример вслух. Эта игра не
                      засчитывает интервальное повторение.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2>Первое знакомство</h2>
                <div className="speech-bubble">
                  {dialog === 0
                    ? "Hi! I’m Sam. What do you enjoy doing?"
                    : dialog === 1
                      ? "That sounds interesting! Why do you like it?"
                      : "Nice to meet you! I’d love to hear more next time."}
                </div>
                {dialog < 2 ? (
                  <div className="dialog-options">
                    {(dialog === 0
                      ? [
                          "I enjoy reading and exploring new places.",
                          "I enjoy read books.",
                        ]
                      : [
                          "Because it helps me relax and discover new ideas.",
                          "Because I relaxing.",
                        ]
                    ).map((o, i) => (
                      <button
                        className="btn secondary"
                        key={o}
                        onClick={() =>
                          i === 0
                            ? setDialog(dialog + 1)
                            : notify(
                                dialog === 0
                                  ? "После enjoy нужна форма -ing: reading."
                                  : "Попробуйте: it helps me relax.",
                              )
                        }
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="feedback">
                    Знакомство состоялось. Теперь расскажите эту историю своими
                    словами!
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
