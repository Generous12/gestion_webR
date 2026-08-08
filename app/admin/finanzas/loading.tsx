import React from 'react';

export default function FinanzasLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-6 w-52 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-3.5 w-80 bg-zinc-100 dark:bg-zinc-850 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-10 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>

      {/* Financial Summary Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
            </div>
            <div className="h-7 w-32 bg-zinc-300 dark:bg-zinc-700 rounded-lg" />
            <div className="h-3 w-36 bg-zinc-100 dark:bg-zinc-850 rounded" />
          </div>
        ))}
      </div>

      {/* Charts & Expenses List Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-4">
          <div className="h-5 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-64 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl" />
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-4">
          <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
