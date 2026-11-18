import type {
  Workspace,
  Conversation,
  Vocabulary,
  Exercise,
} from "./workspace";
export type Library = {
  revision: string;
  lessons: Conversation[];
  vocabulary: Vocabulary[];
  exercises: Exercise[];
  sources: { name: string; date: string; description: string }[];
};
export function mergeLibrary(s: Workspace, library: Library): Workspace {
  if (s.importedSources?.includes(library.revision)) return s;
  function merge<T extends { id: string }>(old: T[], next: T[]): T[] {
    const ids = new Set(old.map((x) => x.id));
    return [...old, ...next.filter((x) => !ids.has(x.id))];
  }
  return {
    ...s,

    vocabulary: merge(
      s.vocabulary,
      library.vocabulary.map((w) =>
        w.lessonId.startsWith("source:") ? { ...w, lessonId: "" } : w,
      ),
    ),
    exercises: merge(
      s.exercises,
      library.exercises.map((e) =>
        e.lessonId.startsWith("source:") ? { ...e, lessonId: "" } : e,
      ),
    ),
    importedSources: [...(s.importedSources || []), library.revision],
  };
}
