export function normalizeProgress(value: unknown, allowedIds?: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const allowed = allowedIds ? new Set(allowedIds) : null;
  return [
    ...new Set(
      value.filter(
        (id): id is string => typeof id === "string" && (!allowed || allowed.has(id)),
      ),
    ),
  ];
}

export function loadProgress(storageKey: string, allowedIds?: readonly string[]): string[] {
  try {
    const stored = globalThis.localStorage?.getItem(storageKey);
    return normalizeProgress(stored ? JSON.parse(stored) : [], allowedIds);
  } catch {
    return [];
  }
}

export function saveProgress(
  storageKey: string,
  completed: string[],
  allowedIds?: readonly string[],
): void {
  try {
    globalThis.localStorage?.setItem(
      storageKey,
      JSON.stringify(normalizeProgress(completed, allowedIds)),
    );
  } catch {
    // The learning workspaces remain usable when storage is unavailable.
  }
}
