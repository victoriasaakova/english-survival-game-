export type Word = {
  id: string;
  expression: string;
  meaning: string;
  example: string;
  introduced: string;
  passed: number[];
  retry: string | null;
  reviews: { date: string; success: boolean; evidence: string }[];
};
export type Attempt = {
  id: string;
  block: number;
  answer: string;
  feedback?: string;
  assisted: boolean;
  date: string;
};
export type Lesson = {
  id: string;
  quest: number;
  minutes: 15 | 30;
  block: number;
  attempts: Attempt[];
  complete: boolean;
  started: string;
  targets: string[];
  prompts?: string[];
  draft?: string;
};
export type Chapter = {
  id: string;
  title: string;
  original: string;
  text: string;
  created: string;
};
export type State = {
  version: 1;
  name: string;
  interests: string[];
  words: Word[];
  lessons: Lesson[];
  chapters: Chapter[];
  completedQuests: number[];
  xp: number;
};
export const initialState: State = {
  version: 1,
  name: "",
  interests: ["О себе", "Мои интересы"],
  words: [],
  lessons: [],
  chapters: [],
  completedQuests: [],
  xp: 0,
};
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function nextDue(w: Word): string | null {
  const p = [1, 3, 7, 14].find((n) => !w.passed.includes(n));
  if (!p) return null;
  let due = addDays(w.introduced, p);
  if (w.retry && w.retry < due) due = w.retry;
  const last = w.reviews
    .map((r) => r.date)
    .sort()
    .at(-1);
  if (last && addDays(last, 1) > due) due = addDays(last, 1);
  return due;
}
export function reviewWord(
  word: Word,
  date: string,
  correct: boolean,
  assisted: boolean,
  novel: boolean,
  evidence: string,
): Word {
  if (date < word.introduced || word.reviews.some((r) => r.date > date))
    throw Error("Invalid review date");
  const w = structuredClone(word),
    success = correct && !assisted && novel,
    due = nextDue(w);
  if (!success) {
    if (w.passed.length === 4) {
      w.introduced = date;
      w.passed = [];
    }
    w.retry = addDays(date, 1);
  } else if (due && date >= due) {
    const p = [1, 3, 7, 14].find((n) => !w.passed.includes(n));
    if (p && date >= addDays(w.introduced, p)) w.passed.push(p);
    w.retry = null;
  }
  w.reviews.push({ date, success, evidence });
  return w;
}
export function addWord(
  state: State,
  expression: string,
  meaning: string,
  example: string,
): State {
  if (
    state.words.some(
      (w) =>
        w.expression.toLowerCase().trim() === expression.toLowerCase().trim(),
    )
  )
    return state;
  return {
    ...state,
    words: [
      ...state.words,
      {
        id: crypto.randomUUID(),
        expression,
        meaning,
        example,
        introduced: localDate(),
        passed: [],
        retry: null,
        reviews: [],
      },
    ],
  };
}
export function completeQuest(s: State, q: number) {
  return s.completedQuests.includes(q)
    ? s
    : { ...s, completedQuests: [...s.completedQuests, q], xp: s.xp + 50 };
}
export const worlds = [
  {
    name: "Кто я",
    en: "The island of me",
    icon: "✧",
    color: "green",
    description: "Маленькие истории, из которых складываетесь вы.",
  },
  {
    name: "Мои интересы",
    en: "Garden of curiosity",
    icon: "✿",
    color: "peach",
    description: "То, что зажигает любопытство и делает дни ярче.",
  },
  {
    name: "Воспоминания",
    en: "Valley of memories",
    icon: "☾",
    color: "purple",
    description: "Моменты и люди, которых хочется помнить.",
  },
  {
    name: "Мои ценности",
    en: "Lighthouse of values",
    icon: "❋",
    color: "yellow",
    description: "Расскажите, что для вас по-настоящему важно.",
  },
  {
    name: "Мечты",
    en: "Mountains of possibility",
    icon: "△",
    color: "blue",
    description: "Места, идеи и открытия, которые ещё впереди.",
  },
  {
    name: "Мой будущий мир",
    en: "Beyond the horizon",
    icon: "☀",
    color: "rose",
    description: "Представьте жизнь, которую хочется создать.",
  },
];
export const quests = [
  {
    title: "Привет, это я",
    en: "A little about me",
    prompt:
      "Introduce yourself. What do you enjoy, and what would you like to learn?",
    writing:
      "Write 2–3 connected sentences introducing yourself to a new friend.",
    grammar:
      "I enjoy + -ing: I enjoy learning languages. После enjoy используем форму с -ing.",
    pattern: "I enjoy ___ new things.",
    options: ["learning", "learn", "to learn"],
    answer: 0,
    phrases: [
      ["I enjoy", "Мне нравится", "I enjoy reading in the morning."],
      [
        "I’m interested in",
        "Я интересуюсь",
        "I’m interested in learning about people.",
      ],
      ["I’d like to", "Мне хотелось бы", "I’d like to speak more confidently."],
    ],
  },
  {
    title: "Мой обычный день",
    en: "Little everyday rituals",
    prompt: "Tell me about your typical morning. What makes your day better?",
    writing: "Describe your morning and one small ritual you enjoy.",
    grammar:
      "Present Simple для привычек: I usually wake up at seven. She wakes up at seven.",
    pattern: "She usually ___ tea in the morning.",
    options: ["drink", "drinks", "drinking"],
    answer: 1,
    phrases: [
      ["I usually", "Я обычно", "I usually start my day with tea."],
      ["It helps me", "Это помогает мне", "It helps me feel calm."],
      [
        "Every now and then",
        "Время от времени",
        "Every now and then I go for a walk.",
      ],
    ],
  },
  {
    title: "То, что я люблю",
    en: "A spark of curiosity",
    prompt:
      "What do you love doing in your free time? Why does it matter to you?",
    writing: "Recommend an activity you love to a friend. Explain why.",
    grammar: "Because объясняет причину: I read because it helps me relax.",
    pattern: "I like walking ___ it helps me relax.",
    options: ["but", "because", "so"],
    answer: 1,
    phrases: [
      [
        "In my free time",
        "В свободное время",
        "In my free time I like drawing.",
      ],
      [
        "It makes me feel",
        "Это заставляет меня чувствовать",
        "It makes me feel happy.",
      ],
      ["I’m really into", "Я очень увлекаюсь", "I’m really into photography."],
    ],
  },
  {
    title: "Важный момент",
    en: "A memory to keep",
    prompt: "Tell me about a happy memory. Where were you? What happened?",
    writing:
      "Write a short story about a happy moment. Include when and where.",
    grammar:
      "Past Simple: I visited a friend yesterday. Для завершённых событий в прошлом.",
    pattern: "Yesterday I ___ an old friend.",
    options: ["visit", "visited", "visiting"],
    answer: 1,
    phrases: [
      ["I remember", "Я помню", "I remember my first trip."],
      ["At that moment", "В тот момент", "At that moment I felt happy."],
      [
        "It was special because",
        "Это было особенным, потому что",
        "It was special because we were together.",
      ],
    ],
  },
  {
    title: "Одна моя мечта",
    en: "A letter to tomorrow",
    prompt:
      "What is one thing you would love to do in the future? What is your first step?",
    writing: "Write a short letter to your future self about one dream.",
    grammar:
      "Would like + to + глагол: I would like to travel. Вежливое выражение желания.",
    pattern: "I would like ___ a new language.",
    options: ["learning", "learn", "to learn"],
    answer: 2,
    phrases: [
      ["One day", "Однажды", "One day I would like to visit Japan."],
      [
        "My first step is",
        "Мой первый шаг —",
        "My first step is to practise every day.",
      ],
      ["I hope to", "Я надеюсь", "I hope to meet new people."],
    ],
  },
];
export const blocks = [
  "Вспоминаем",
  "Грамматика",
  "Новые выражения",
  "Говорим",
  "Свои предложения",
  "Пишем",
  "Мини-тест",
];
