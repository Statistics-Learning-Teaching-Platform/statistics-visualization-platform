"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "zujuan.selectedIds";

interface SelectionCtx {
  selected: string[];
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  add: (ids: string[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  ready: boolean;
}

const Ctx = createContext<SelectionCtx | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  // 初次挂载从 localStorage 恢复（SSR 安全：首帧仍为空，由 ready 标记区分）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 一次性水合，非级联渲染
      if (raw) setSelected(JSON.parse(raw));
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

  const isSelected = useCallback((id: string) => selected.includes(id), [selected]);
  const toggle = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const add = useCallback((ids: string[]) => {
    setSelected((prev) => Array.from(new Set([...prev, ...ids])));
  }, []);
  const remove = useCallback((id: string) => {
    setSelected((prev) => prev.filter((x) => x !== id));
  }, []);
  const clear = useCallback(() => setSelected([]), []);

  return (
    <Ctx.Provider value={{ selected, isSelected, toggle, add, remove, clear, ready }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
}
