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
    lessons: merge(s.lessons, library.lessons),
    vocabulary: merge(s.vocabulary, library.vocabulary),
    exercises: merge(s.exercises, library.exercises),
    importedSources: [...(s.importedSources || []), library.revision],
  };
}
