import { nextDue, reviewWord, localDate, type Word } from "./learning.ts";
import type { Vocabulary } from "./workspace";
export function activate(w: Vocabulary, date = localDate()): Vocabulary {
  return w.review
    ? w
    : {
        ...w,
        review: { introduced: date, passed: [], retry: null, history: [] },
      };
}
function legacy(w: Vocabulary): Word | null {
  return w.review
    ? {
        id: w.id,
        expression: w.expression,
        meaning: w.meaning,
        example: w.example,
        introduced: w.review.introduced,
        passed: w.review.passed,
        retry: w.review.retry,
        reviews: w.review.history,
      }
    : null;
}
export function due(w: Vocabulary) {
  const old = legacy(w);
  return old ? nextDue(old) : null;
}
export function recordRecall(
  w: Vocabulary,
  date: string,
  passed: boolean,
  assisted: boolean,
  novel: boolean,
  evidence: string,
): Vocabulary {
  const old = legacy(w);
  if (!old) throw Error("Сначала активируйте выражение");
  const reviewed = reviewWord(old, date, passed, assisted, novel, evidence);
  return {
    ...w,
    retrieval: passed && !assisted && novel ? "independent" : w.retrieval,
    review: {
      introduced: reviewed.introduced,
      passed: reviewed.passed,
      retry: reviewed.retry,
      history: reviewed.reviews,
    },
  };
}
