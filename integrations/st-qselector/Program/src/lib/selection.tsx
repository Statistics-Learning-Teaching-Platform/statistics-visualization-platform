"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Question } from "./types";

const STORAGE_KEY = "zujuan.selectedIds";
const GENERATED_STORAGE_KEY = "zujuan.generatedQuestions.v1";

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

  // 初次挂载从 localStorage 恢复（SSR 安全：首帧仍为空，由 ready 标记区分）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 一次性水合，非级联渲染
      if (raw) setSelected(JSON.parse(raw));
      const generatedRaw = localStorage.getItem(GENERATED_STORAGE_KEY);
      if (generatedRaw) {
        const parsed = JSON.parse(generatedRaw) as unknown;
        if (Array.isArray(parsed)) {
          setGeneratedQuestions(parsed.filter((item): item is Question => Boolean(
            item && typeof item === "object" && typeof item.id === "string" &&
            typeof item.content === "string" && typeof item.answer === "string" &&
            (item.origin === "variant" || item.origin === "generated"),
          )).slice(0, 80));
        }
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  // 变更时持久化
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    } catch {
      /* ignore */
    }
  }, [selected, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(GENERATED_STORAGE_KEY, JSON.stringify(generatedQuestions));
    } catch {
      /* ignore */
    }
  }, [generatedQuestions, ready]);

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
