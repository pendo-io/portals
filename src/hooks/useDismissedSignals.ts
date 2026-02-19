import { useState, useCallback } from "react";

const STORAGE_KEY = "pendogtm-dismissed-signals";

function readIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    // ignore corrupt data
  }
  return new Set();
}

function writeIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function useDismissedSignals() {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(readIds);

  const dismissSignal = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeIds(next);
      return next;
    });
  }, []);

  const restoreSignal = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      writeIds(next);
      return next;
    });
  }, []);

  return { dismissedIds, dismissSignal, restoreSignal };
}
