import React from 'react';

export default function CajaLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-3.5 w-80 bg-zinc-100 dark:bg-zinc-850 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-10 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>

      {/* Caja Status Card & Summary Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            </div>
            <div className="h-7 w-32 bg-zinc-300 dark:bg-zinc-700 rounded-lg" />
            <div className="h-3 w-40 bg-zinc-100 dark:bg-zinc-850 rounded" />
          </div>
        ))}
      </div>

      {/* Movements Table Skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-zinc-150 dark:border-zinc-800">
          <div className="h-5 w-44 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-8 w-28 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-100 dark:border-zinc-850"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="space-y-1">
                  <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-2.5 w-28 bg-zinc-100 dark:bg-zinc-850 rounded" />
                </div>
              </div>
              <div className="h-4 w-20 bg-zinc-300 dark:bg-zinc-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
