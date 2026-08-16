'use client';

import React, { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'class') {
        callback();
      }
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  return () => {
    window.removeEventListener('storage', callback);
    observer.disconnect();
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains('dark');
}

function getServerSnapshot() {
  return true;
}

const emptySubscribe = () => () => {};

export default function ThemeToggle() {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', nextTheme);
      localStorage.setItem('gym_theme', nextTheme);
    } catch {
      // Ignorar error al escribir storage
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      suppressHydrationWarning
      title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
      aria-label="Cambiar tema de color"
      className="p-2 w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center justify-center cursor-pointer shadow-xs"
    >
      {!isMounted ? (
        <Sun className="w-4 h-4 text-amber-500" />
      ) : isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-zinc-600 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}

