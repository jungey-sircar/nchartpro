'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import QuizDialog from './QuizDialog';

interface QuizContextValue {
  open:   boolean;
  toggle: () => void;
  close:  () => void;
}

const QuizContext = createContext<QuizContextValue>({
  open:   false,
  toggle: () => {},
  close:  () => {},
});

const STORE_KEY = 'nchart-quiz-open';

export function QuizProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  // Restore open state on mount (survives full-page reloads from <a href> navigation)
  useEffect(() => {
    if (localStorage.getItem(STORE_KEY) === 'true') setOpen(true);
  }, []);

  function toggle() {
    setOpen(prev => {
      const next = !prev;
      localStorage.setItem(STORE_KEY, String(next));
      return next;
    });
  }

  function close() {
    setOpen(false);
    localStorage.setItem(STORE_KEY, 'false');
  }

  return (
    <QuizContext.Provider value={{ open, toggle, close }}>
      {children}
      <QuizDialog open={open} onClose={close} />
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  return useContext(QuizContext);
}
