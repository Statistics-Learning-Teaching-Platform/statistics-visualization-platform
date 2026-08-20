"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Question } from "./types";
import { authenticatedFetch } from "./auth/client";

const STORAGE_KEY_PREFIX = "zujuan.selectedIds.user.";

interface SelectionCtx {
  selected: string[];
  generatedQuestions: Question[];
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  add: (ids: string[], generated?: Question[]) => void;
  replace: (ids: string[], generated?: Question[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  ready: boolean;
}

const Ctx = createContext<SelectionCtx | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [ready, setReady] = useState(false);
  const [storageKey, setStorageKey] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const meResponse = await authenticatedFetch("/api/auth/me", { signal: controller.signal, cache: "no-store" });
        if (!meResponse.ok) throw new Error("session unavailable");
        const me = await meResponse.json() as { user?: { id?: string; role?: string } };
        if (!me.user?.id) throw new Error("session user unavailable");
        const key = `${STORAGE_KEY_PREFIX}${me.user.id}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            setSelected(parsed.filter((id): id is string => typeof id === "string").slice(0, 100));
          }
        }
        if (me.user.role !== "student") {
          const draftsResponse = await authenticatedFetch("/api/questions/import-generated", {
            signal: controller.signal,
            cache: "no-store",
          });
          if (draftsResponse.ok) {
            const drafts = await draftsResponse.json() as { questions?: Question[] };
            setGeneratedQuestions(Array.isArray(drafts.questions) ? drafts.questions.slice(0, 200) : []);
          }
        }
        setStorageKey(key);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        setSelected([]);
        setGeneratedQuestions([]);
      } finally {
        if (!controller.signal.aborted) setReady(true);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!ready || !storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(selected));
    } catch {
      /* ignore */
    }
  }, [selected, ready, storageKey]);

  const isSelected = useCallback((id: string) => selected.includes(id), [selected]);
  const toggle = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const add = useCallback((ids: string[], generated: Question[] = []) => {
    setSelected((prev) => Array.from(new Set([...prev, ...ids])));
    if (generated.length) {
      setGeneratedQuestions((previous) => {
        const byId = new Map(previous.map((question) => [question.id, question]));
        for (const question of generated) byId.set(question.id, question);
        return [...byId.values()].slice(-80);
      });
    }
  }, []);
  const replace = useCallback((ids: string[], generated: Question[] = []) => {
    setSelected(Array.from(new Set(ids.filter(Boolean))));
    const selectedIds = new Set(ids);
    setGeneratedQuestions(generated.filter((question) => selectedIds.has(question.id)).slice(0, 80));
  }, []);
  const remove = useCallback((id: string) => {
    setSelected((prev) => prev.filter((x) => x !== id));
    setGeneratedQuestions((previous) => previous.filter((question) => question.id !== id));
  }, []);
  const clear = useCallback(() => {
    setSelected([]);
    setGeneratedQuestions([]);
  }, []);

  return (
    <Ctx.Provider value={{ selected, generatedQuestions, isSelected, toggle, add, replace, remove, clear, ready }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
}
