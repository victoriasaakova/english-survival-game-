export type GameConfig = {
  id: string;
  mode?: string;
  chapter?: string;
  character?: string;
};
export const criticBoard = [
  {
    id: "ceo",
    name: "The Catastrophic CEO",
    position: "Chief Executive of Imaginary Disasters",
    line: "One bad day? Excellent. Let's declare your entire life a failure!",
    tactic: "Превращает трудный момент в постоянный приговор.",
  },
  {
    id: "december",
    name: "Miss Decembergeddon",
    position: "Director of Calendar Apocalypse",
    line: "No job offer by December? THE WORLD IS ENDING!",
    tactic:
      "Превращает реальный срок в пророчество катастрофы. Сезонный персонаж 2026 года.",
  },
  {
    id: "rejection",
    name: "Count Rejectionula",
    position: "Curator of the Hall of No",
    line: "One rejection! Two rejections! Ah-ah-ah! Nobody will ever hire you!",
    tactic: "Принимает прошлые отказы за доказательство всех будущих отказов.",
  },
  {
    id: "tomorrow",
    name: "Captain Tomorrow",
    position: "Vice President of Doing It Later",
    line: "We'll change our lives tomorrow. Maybe next Monday.",
    tactic: "Откладывает действие под видом бесконечного планирования.",
  },
  {
    id: "ready",
    name: "Her Majesty Not-Ready-Yet",
    position: "Director of Impossible Readiness Standards",
    line: "Your portfolio is only 99% perfect. How dare you apply?",
    tactic: "Требует невозможной готовности и полной уверенности.",
  },
  {
    id: "hat",
    name: "The Career Sorting Hat",
    position: "Supreme Inspector of Forever-Careers",
    line: "Designer? Not good enough! Coach? Not qualified! UNEMPLOYABLE!",
    tactic: "Выдаёт поиск профессионального пути за необратимый тест личности.",
  },
  {
    id: "doom",
    name: "The Chief Doom Officer (CDO)",
    position: "Chief Marketing Officer of Misery, Inc.",
    line: "Start feeling doomed today! Why waste time trying when you can give up in advance?",
    tactic:
      "Продаёт тревожные сценарии как убедительную рекламу. Maximum anxiety. Minimum action. Zero return on investment.",
  },
];
export const boardModes = [
  "Полный раунд",
  "Roast Your Inner Critic",
  "The Plot Twist",
  "Evidence Detective",
  "Future Self",
  "Find the Hidden Win",
  "Boardroom Mode",
];
export const futureChapters = [
  {
    name: "An Ordinary Tuesday",
    prompt:
      "Describe an ordinary Tuesday in your imagined 2031. What would you see, do and choose? Include concrete details that matter to you.",
  },
  {
    name: "The Thank-You Message",
    prompt:
      "Imagine a thank-you message from someone you hope to help. What change would you want them to describe? This is an aspiration, not evidence of results.",
  },
  {
    name: "Evidence Vault",
    prompt:
      "What actual experience, if any, suggests that you helped someone? It is fine not to remember. We will not invent evidence.",
  },
  {
    name: "Evidence Lab",
    prompt:
      "What observable change in someone’s words, choices or follow-through would indicate value?",
  },
  {
    name: "One-Sentence Promise",
    prompt:
      "How would you express the change you aspire to help create in one sentence, without claiming an unproven qualification?",
  },
  {
    name: "Skill Tree",
    prompt:
      "Which skills can you use professionally now, which would you like to build, and how might you test demand?",
  },
];
export const games = [
  {
    id: "scenario",
    name: "The Scenario Challenge",
    description:
      "Сложная ситуация, speaking mission на 30–60 секунд и активное извлечение 2–4 знакомых выражений.",
    role: "career",
    topic: "Профессиональное",
  },
  {
    id: "future",
    name: "Future Self Files · 2031",
    description:
      "Шесть свободно выбираемых глав о будущем, свидетельствах и навыках. Видение, а не предсказание.",
    role: "coach",
    topic: "Селф-коучинг",
  },
  {
    id: "board",
    name: "The Inner Critic Board of Directors",
    description:
      "Семь критиков. Ваш comeback, roast логики, три plot twists и собственный mic drop.",
    role: "coach",
    topic: "Рефрейминг",
  },
];
export function gameInstructions(config?: GameConfig): string {
  if (!config) return "";
  const game = games.find((g) => g.id === config.id);
  if (!game) return "";
  if (config.id === "scenario")
    return `THE SCENARIO CHALLENGE. Give one vivid premise with real professional or personal stakes, one specific 30–60 second speaking mission and 2–4 targets from supplied prior vocabulary. Cue targets by meaning first, not by displaying exact answers. Occasionally request a specific grammar form. Wait for the real response. Alternate domains and avoid nearly identical scenarios. After response, react to substance, use actual evidence for strengths, separate product reasoning from language. Give 4–7 high-impact original → correction → reason items when evidence supports them, and review 2–4 collocations including prepositions/verb patterns. In a live voice turn give the highest priority items briefly and reserve the full review for the note. Never manufacture 4 errors to reach a quota. Mark omitted requested forms not demonstrated. No next scenario before response and feedback. Polish a paragraph only when useful or requested. If tired, use one compact challenge. Current domain choice: ${config.mode || "alternate professional/personal"}.`;
  if (config.id === "future") {
    const chapter = futureChapters.find((c) => c.name === config.chapter);
    return `FUTURE SELF FILES (2031). Only run because the learner selected it. Chosen chapter: ${chapter?.name || futureChapters[0].name}. Opening prompt: ${chapter?.prompt || futureChapters[0].prompt}. Chapters are independent, not a mandatory sequence. Treat all future descriptions as vision, never prediction or achieved result. Separate facts, hopes, interpretations and open questions. Preserve EVERY substantive autobiographical idea and first-person meaning in a synthesis; edit grammar/flow, do not silently cut detail. Evidence Vault must use actual evidence only. Do not treat praise, client silence or interest in psychology as proof of coaching effectiveness. If the learner cannot remember evidence, stop pressing and offer another exploratory prompt. Distinguish marketable competence, skills to build and market validation. No forced therapy, diagnosis, guaranteed future or probing finances. Ask one purposeful question; if asked for synthesis or to stop, provide it and stop asking. Don't impose rhythm/intonation drills.`;
  }
  const character = criticBoard.find((c) => c.id === config.character);
  return `THE INNER CRITIC BOARD OF DIRECTORS. Canonical cast (do not rename): ${criticBoard.map((c) => `${c.name} — ${c.position}. ${c.tactic}`).join("; ")}. Chief Doom Officer's chosen slogan is "Start feeling doomed today! Why waste time trying when you can give up in advance?" Miss Decembergeddon is seasonal for 2026, not permanent. Selected mode: ${config.mode || "Полный раунд"}. Selected character: ${character ? character.name : "identify from learner’s thought, do not assume"}. Full round: actual user accusation/situation → identify character and reasoning trick → invite ONE original comeback if possible → roast critic's logic → three DISTINCT plot twists: realistic, empowering, outrageously optimistic/quietly bold (possible, not promised) → user's original 1–2 sentence mic drop → brief English Upgrade with 1–3 key corrections and 1–2 expressions. Optional modes: Roast Your Inner Critic, The Plot Twist, Evidence Detective, Future Self, Find the Hidden Win, Boardroom Mode. Follow the selected submode, not an obligatory full round. Bold affectionate sarcasm targets the critic’s unsupported logic, NEVER the user's worth. Acknowledge real medical/financial constraints; do not reclassify them as imaginary, replace clinical care, or promise a mindset shift solves practical problems. Characters are metaphors, not diagnoses/personalities. If stuck or too tired for a comeback, take the mic, model one and allow ending without penalty. No forced positive response or repeat-after-me. Don't turn this into interview preparation. Keep turns short, playful and responsive, not theatrical monologues or an interrogation. On stop/summary requests end the game without another round.`;
}
export const updatedSkillRules = `UPDATED ADAPTIVE-LANGUAGE-COACH RULES, reconciled with the learner's explicit current goal B2 → C1 (historical B1+/emerging B2 labels are source context, never a downgrade). Professional/personal rotation around 60/40 is a long-term suggestion, not a quota; user choices override it. 15/30 minute options for structured lessons; one task/question at a time; all four skills unless the learner requests another format. Select 3–5 expressions for activation, and 2–4 targets per scenario. Distinguish catalogue, recognition, independent recall and accurate original use. Imported vocabulary or polished model text is NOT proof of active mastery. Review at D+1/3/7/14 from actual activation date, not source file date. Track errors as dated evidence, not permanent labels: articles, agreement, verb patterns and prepositions, embedded-question order, sentence boundaries, tense choice, third vs mixed conditionals. Respect stop, only-summary, preserve-whole-speech and no-intonation requests. Respond to substance before corrections. Never fabricate pronunciation/real-time fluency from a transcript. Do not infer clinical or business outcomes from lesson notes.
For every end-of-lesson note include SIX named sections: Grammar Notes (actually practised rules/examples); Core Vocabulary (professional/personal, meanings, examples and retrieval status); My Mistakes (verbatim original → correction → explanation, recurring vs one-off); Speaking (actually performed tasks, evidence and unavailable dimensions); Writing (exact task and response, or Pending); Review (D+1/3/7/14 and specific recall/error checks). If Future Self was explored, add a seventh: Future Self — complete first-person polished vision preserving all substantive details and a self-coaching log separating facts / hopes / interpretations / open questions. Do not mark pending work completed. In normal dialogue use focused corrections; Scenario Challenge may use 4–7 evidence-supported corrections, board game only 1–3 to preserve its flow. These rules update the app tutor only; do not publish private learner documents to GitHub or write to Notion as a side effect.`;
