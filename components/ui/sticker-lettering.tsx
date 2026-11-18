import * as React from "react";
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const round = (v: number): number => Math.round(v * 100) / 100;

/**
 * A fat single-stroke script: [advance, main stroke, pen-lift strokes, lifts
 * after?]. x-height 10, baseline 0, y runs down. Every main stroke starts at
 * (0, -1) and, unless it lifts, ends at (advance, -1), so letters chain into
 * one continuous path. Absolute M / L / C only, so x and y simply alternate.
 */
export const SCRIPT: Record<string, [number, string, string?, number?]> = {
  a: [
    10.2,
    "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5L7.8 -10L7.8 -3C7.8 -0.8 8.8 -1 10.2 -1",
  ],
  b: [
    9.4,
    "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 -1L1.8 -6C2.4 -9 3.4 -10 4.8 -10C6.8 -10 8.2 -8 8.2 -5C8.2 -2 6.6 0 4.8 0C3.4 0 2.4 -0.6 1.8 -1.6C2.4 -0.6 3.4 0 4.8 0C6.6 0 7.8 -0.8 9.4 -1",
  ],
  c: [
    8.8,
    "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C5.6 -10 6.6 -9.6 7 -8.6C6.6 -9.6 5.6 -10 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6 0 7 -1 8.8 -1",
  ],
  d: [
    10.2,
    "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5L7.8 -19L7.8 -3C7.8 -0.8 8.8 -1 10.2 -1",
  ],
  e: [
    9.4,
    "M0 -1C3.4 -2.4 8 -4.4 8 -7.6C8 -9.4 6.6 -10.4 4.8 -10.4C2.2 -10.4 0.8 -7.8 0.8 -5C0.8 -1.8 2.6 0 5 0C6.8 0 8 -1 9.4 -1",
  ],
  f: [
    7,
    "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 7.2C1.8 9.6 3.2 9.6 3.8 7.6C4.4 5 4.8 -1 7 -1",
    "M-0.4 -9.4L5.4 -9.4",
  ],
  g: [
    9.6,
    "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5L7.8 -10L7.8 4C7.8 8.6 5.8 9.6 4.2 9.6C2 9.6 1.4 7.6 2.8 6C4.6 4 7.4 1.4 9.6 -1",
  ],
  h: [
    10,
    "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 -1L1.8 -5.6C2.6 -8.6 4 -10 5.6 -10C7.2 -10 7.8 -8.8 7.8 -7L7.8 -3C7.8 -0.8 8.8 -1 10 -1",
  ],
  i: [
    5,
    "M0 -1C1.2 -1.4 2 -6 2.2 -10L2.2 -3C2.2 -0.8 3.4 -1 5 -1",
    "M2.4 -15.2L2.5 -15.3",
  ],
  j: [
    5.4,
    "M0 -1C1.2 -1.4 2 -6 2.2 -10L2.2 4.6C2.2 9.6 -0.6 9.8 -0.2 7.4C0.2 5 3.4 1.4 5.4 -1",
    "M2.4 -15.2L2.5 -15.3",
  ],
  k: [
    9.6,
    "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 -1L1.8 -4.6C3 -8 5.6 -10.4 7 -9.6C8.4 -8.6 7 -5.6 3.6 -5C5.6 -4.6 6.6 -1 9.6 -1",
  ],
  l: [
    6.4,
    "M0 -1C2.8 -3 6.2 -12 6 -16.4C5.8 -19.8 1.8 -20 1.8 -16.4L1.8 -3.2C1.8 -0.6 4 -1 6.4 -1",
  ],
  m: [
    14.6,
    "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -1L1.8 -5.6C2.4 -8.6 3.4 -10 4.8 -10C6.2 -10 7 -9 7 -7L7 -1L7 -5.6C7.6 -8.6 8.6 -10 10 -10C11.4 -10 12.2 -9 12.2 -7L12.2 -3C12.2 -0.8 13.2 -1 14.6 -1",
  ],
  n: [
    9.6,
    "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -1L1.8 -5.6C2.4 -8.6 3.4 -10 4.8 -10C6.4 -10 7.2 -9 7.2 -7L7.2 -3C7.2 -0.8 8.2 -1 9.6 -1",
  ],
  o: [
    9,
    "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5C7.6 -7.8 6.1 -10 4.3 -10C6 -10 7.4 -9.2 9 -9",
    "",
    1,
  ],
  p: [
    9.6,
    "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 9L1.8 -5.6C2.4 -8.6 3.4 -10 5 -10C7 -10 8.2 -8 8.2 -5C8.2 -2 6.6 0 4.8 0C3.4 0 2.4 -0.6 1.8 -1.6C2.4 -0.6 3.4 0 4.8 0C6.6 0 7.8 -0.8 9.6 -1",
  ],
  q: [
    10.4,
    "M0 -1C1.4 -1.4 1.4 -9.6 4.3 -10C2.5 -10 1 -7.8 1 -5C1 -2.2 2.5 0 4.3 0C6.1 0 7.6 -2.2 7.6 -5L7.8 -10L7.8 9C8.8 6 9 0 10.4 -1",
  ],
  r: [
    8.6,
    "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -1L1.8 -5.6C2.6 -8.6 4.2 -10 5.8 -10C6.8 -10 7.6 -9.6 8.2 -8.8",
    "",
    1,
  ],
  s: [
    8.4,
    "M0 -1C1.6 -2 3 -7 4.4 -10.2C5.6 -8 7.4 -6 7.4 -3.6C7.4 -1.2 5.6 0 3.6 0C2 0 1 -0.6 0.6 -1.6C1 -0.6 2 0 3.6 0C5.6 0 6.8 -0.8 8.4 -1",
  ],
  t: [
    6.6,
    "M0 -1C1 -1.4 2.2 -8 2.4 -15L2.4 -3.2C2.4 -0.8 4 -1 6.6 -1",
    "M-0.8 -9.6L6.2 -9.6",
  ],
  u: [
    10,
    "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -3.6C1.8 -1 3 0 4.6 0C6.2 0 7.4 -1.4 7.6 -4L7.6 -9.8L7.6 -3C7.6 -0.8 8.6 -1 10 -1",
  ],
  v: [
    9,
    "M0 -1C1.2 -1.6 1.6 -6 1.6 -9.6C1.6 -6 2.6 0 4.4 0C6.4 0 7.6 -6 7.6 -9.6C8 -9 8.4 -8.8 9 -8.8",
    "",
    1,
  ],
  w: [
    12.6,
    "M0 -1C1.2 -1.6 1.6 -6 1.6 -9.6L1.6 -3.6C1.6 -1 2.6 0 4 0C5.4 0 6.2 -1 6.2 -3.6L6.2 -8L6.2 -3.6C6.2 -1 7 0 8.4 0C9.8 0 10.8 -1 10.8 -3.6L10.8 -9.6C11.2 -9 11.8 -8.8 12.6 -8.8",
    "",
    1,
  ],
  x: [
    9,
    "M0 -1C1.6 -2 2 -8.6 3 -9.6L7 -1C7.6 -0.4 8.4 -1 9 -1",
    "M7.4 -9.6L2.4 -0.4",
  ],
  y: [
    9.6,
    "M0 -1C1.2 -1.6 1.6 -6 1.8 -9.6L1.8 -3.6C1.8 -1 3 0 4.6 0C6.2 0 7.4 -1.4 7.6 -4L7.6 -9.8L7.6 4.4C7.6 9 5.6 9.6 4.2 9.6C2 9.6 1.4 7.6 2.8 6C4.6 4 7.4 1.6 9.6 -1",
  ],
  z: [
    8.8,
    "M0 -1C1 -2 1.4 -9.6 2.6 -9.6L7.4 -9.6L1.6 -0.2L6 -0.2C7 -0.2 7.8 -1 8.8 -1",
  ],
  "!": [4, "M2 -16L2 -4.4", "M2 -0.6L2.1 -0.7", 1],
  ".": [3.6, "M1.8 -0.6L1.9 -0.7", "", 1],
};

/** Horizontal stretch and the gap between letters, in script units. */
export const SX = 1.22;
export const TRACK = 1;
export const WORD_GAP = 6;

/** Shifts and stretches every x in an absolute M/L/C path. */
export const place = (d: string, dx: number, sx: number = SX): string => {
  let k = 0;
  return d.replace(/-?\d*\.?\d+/g, (n) =>
    k++ % 2 === 0 ? String(round(+n * sx + dx)) : n,
  );
};

export type ScriptBox = { x0: number; x1: number; top: number };
export type ScriptWord = {
  main: string;
  extra: string[];
  width: number;
  top: number;
  bottom: number;
  boxes: ScriptBox[];
};

const extent = (d: string): number[] => {
  const n = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  return n.filter((_, i) => i % 2 === 1);
};

/**
 * Lays text out in the script: one continuous main stroke (moves only where a
 * letter lifts or a space falls) plus the pen-lift strokes, drawn after.
 * Case is ignored, accents are stripped, anything unknown is a space.
 */
export const layoutScript = (text: string): ScriptWord => {
  const clean = String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  let x = 0;
  let main = "";
  const extra: string[] = [];
  const boxes: ScriptBox[] = [];
  let lift = true;
  let top = 0;
  let bottom = 0;
  for (const ch of clean) {
    const g = SCRIPT[ch];
    if (!g) {
      if (main) x += WORD_GAP;
      lift = true;
      continue;
    }
    const d = place(g[1], x);
    main += lift ? d : "L" + d.slice(1);
    if (g[2]) extra.push(place(g[2], x));
    const ys = extent(g[1] + (g[2] ?? ""));
    const t = Math.min(...ys);
    top = Math.min(top, t);
    bottom = Math.max(bottom, ...ys);
    boxes.push({ x0: round(x), x1: round(x + g[0] * SX), top: t });
    lift = !!g[3];
    x += g[0] * SX + TRACK;
  }
  return {
    main,
    extra,
    width: boxes.length ? round(x - TRACK) : 0,
    top,
    bottom,
    boxes,
  };
};

/** A closed star: `points` spikes, alternating radii. `wobble` makes the spikes uneven, like a hand-cut sticker. */
export const starPath = (
  points: number,
  outer: number,
  inner: number,
  cx: number = 0,
  cy: number = 0,
  wobble: number = 0,
  seed: number = 0,
): string => {
  const n = Math.max(3, Math.floor(points) || 3);
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r =
      i % 2 ? inner : outer * (1 + (hash(i * 9.7 + seed) - 0.5) * wobble);
    pts.push(round(cx + Math.cos(a) * r) + " " + round(cy + Math.sin(a) * r));
  }
  return "M" + pts.join("L") + "Z";
};

type StickerKind =
  "burst" | "smiley" | "heart" | "bubble" | "daisy" | "camera" | "bolt";
const STROKE = 3.3;
function ScriptText({
  text,
  cx,
  cy,
  w,
  color,
  stroke = STROKE,
}: {
  text: string;
  cx: number;
  cy: number;
  w: number;
  color: string;
  stroke?: number;
}) {
  const { main, extra, width, top } = React.useMemo(
    () => layoutScript(text),
    [text],
  );
  if (!width) return null;
  const s = w / (width + stroke);
  const h = (-top + 1) * s;
  return (
    <g
      transform={
        "translate(" +
        round(cx - (width * s) / 2) +
        " " +
        round(cy + h / 2 - s) +
        ") scale(" +
        round(s) +
        ")"
      }
    >
      <path
        d={main + extra.join("")}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

const sparkle = (cx: number, cy: number, r: number) =>
  "M" +
  cx +
  " " +
  (cy - r) +
  "Q" +
  cx +
  " " +
  cy +
  " " +
  (cx + r) +
  " " +
  cy +
  "Q" +
  cx +
  " " +
  cy +
  " " +
  cx +
  " " +
  (cy + r) +
  "Q" +
  cx +
  " " +
  cy +
  " " +
  (cx - r) +
  " " +
  cy +
  "Q" +
  cx +
  " " +
  cy +
  " " +
  cx +
  " " +
  (cy - r) +
  "Z";

const BURST = starPath(13, 54, 39, 60, 60, 0.2, 4);
const BOLT = "M70 8L26 66H55L44 112L94 48H64Z";
const HEART =
  "M60 100C22 76 10 56 18 38C26 20 50 18 60 38C70 18 94 20 102 38C110 56 98 76 60 100Z";
const BUBBLE =
  "M24 22H96A14 14 0 0 1 110 36V70A14 14 0 0 1 96 84H56L34 102L38 84H24A14 14 0 0 1 10 70V36A14 14 0 0 1 24 22Z";

/** The silhouette (die-cut in white) and the art on top, in a 120 × 120 box. */
const stickerArt = (
  kind: StickerKind,
  text?: string,
): { shape: React.ReactNode; art: React.ReactNode } => {
  switch (kind) {
    case "burst":
      return {
        shape: <path d={BURST} />,
        art: (
          <>
            <path d={BURST} fill="#ff6a2b" />
            <path d={starPath(13, 44, 33, 60, 60, 0.2, 4)} fill="#ff8a4c" />
            <ScriptText
              text={text ?? "wow"}
              cx={60}
              cy={58}
              w={62}
              color="#1b1230"
              stroke={3.4}
            />
          </>
        ),
      };
    case "smiley":
      return {
        shape: <circle cx="60" cy="60" r="50" />,
        art: (
          <>
            <circle cx="60" cy="60" r="50" fill="#9ab8ff" />
            <circle
              cx="60"
              cy="60"
              r="40"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
              opacity=".9"
            />
            <ellipse cx="47" cy="50" rx="4" ry="7.5" fill="#fff" />
            <ellipse cx="73" cy="50" rx="4" ry="7.5" fill="#fff" />
            <path
              d="M36 66Q60 92 84 66M32 63L39 69M88 63L81 69"
              fill="none"
              stroke="#fff"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </>
        ),
      };
    case "heart":
      return {
        shape: (
          <>
            <path d={HEART} />
            <path d={sparkle(100, 20, 14)} />
            <path d={sparkle(18, 92, 10)} />
          </>
        ),
        art: (
          <>
            <path d={HEART} fill="#b0245e" />
            <path
              d="M30 42Q32 30 45 29"
              fill="none"
              stroke="#fff"
              strokeWidth="5.5"
              strokeLinecap="round"
              opacity=".9"
            />
            <path d={sparkle(100, 20, 14)} fill="#ffd0e3" />
            <path d={sparkle(18, 92, 10)} fill="#ffd0e3" />
          </>
        ),
      };
    case "bubble":
      return {
        shape: <path d={BUBBLE} />,
        art: (
          <>
            <path d={BUBBLE} fill="#ffb6e1" />
            <ScriptText
              text={text ?? "hi!"}
              cx={60}
              cy={53}
              w={text ? 76 : 44}
              color="#8a1550"
              stroke={3.6}
            />
          </>
        ),
      };
    case "daisy": {
      const petals = Array.from({ length: 9 }, (_, i) => (
        <ellipse
          key={i}
          cx="60"
          cy="31"
          rx="13"
          ry="22"
          transform={"rotate(" + i * 40 + " 60 60)"}
        />
      ));
      return {
        shape: <>{petals}</>,
        art: (
          <>
            <g fill="#ffd23f">{petals}</g>
            <circle cx="60" cy="60" r="19" fill="#ff6a2b" />
            <circle cx="53.5" cy="57" r="2.6" fill="#1b1230" />
            <circle cx="66.5" cy="57" r="2.6" fill="#1b1230" />
            <path
              d="M53 65Q60 71 67 65"
              fill="none"
              stroke="#1b1230"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        ),
      };
    }
    case "camera":
      return {
        shape: (
          <>
            <rect x="12" y="36" width="96" height="66" rx="16" />
            <rect x="38" y="24" width="36" height="20" rx="6" />
          </>
        ),
        art: (
          <>
            <rect x="12" y="36" width="96" height="66" rx="16" fill="#1d1c22" />
            <rect x="38" y="24" width="36" height="20" rx="6" fill="#1d1c22" />
            <circle cx="60" cy="70" r="24" fill="#fff" />
            <circle cx="60" cy="70" r="17" fill="#1d1c22" />
            <circle cx="60" cy="70" r="11" fill="#5b7cff" />
            <circle cx="55" cy="65" r="4" fill="#fff" />
            <rect x="86" y="46" width="12" height="7" rx="3" fill="#ffd23f" />
            <path
              d="M22 50H30"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              opacity=".5"
            />
          </>
        ),
      };
    case "bolt":
    default:
      return {
        shape: <path d={BOLT} />,
        art: (
          <>
            <path d={BOLT} fill="#ffd23f" />
            <path
              d="M66 20L38 58"
              fill="none"
              stroke="#fff"
              strokeWidth="5"
              strokeLinecap="round"
              opacity=".75"
            />
          </>
        ),
      };
  }
};

export function Sticker({ kind, text }: { kind: StickerKind; text?: string }) {
  const id = "ssf" + React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const { shape, art } = stickerArt(kind, text);
  return (
    <svg viewBox="-6 -6 132 132" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={id + "c"}>{shape}</clipPath>
        <linearGradient id={id + "g"} x1="0" x2="1" y1="0" y2="0">
          <stop offset=".35" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".65" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill="#fff" stroke="#fff" strokeWidth="11" strokeLinejoin="round">
        {shape}
      </g>
      {art}
      <g clipPath={"url(#" + id + "c)"}>
        <g transform="rotate(20 60 60)">
          <rect
            className="ssf-sheen"
            x="-30"
            y="-30"
            width="180"
            height="180"
            fill={"url(#" + id + "g)"}
          />
        </g>
      </g>
    </svg>
  );
}

const logo = layoutScript("english coach");
export function Wordmark() {
  return (
    <svg
      className="wordmark"
      viewBox={`-3 ${logo.top - 3} ${logo.width + 6} ${logo.bottom - logo.top + 6}`}
      role="img"
      aria-label="english coach"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3.45"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path pathLength="1" d={logo.main} />
        {logo.extra.map((d, i) => (
          <path key={i} pathLength="1" d={d} />
        ))}
      </g>
    </svg>
  );
}
