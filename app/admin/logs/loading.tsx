import React from 'react';

export default function LogsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Panel Skeleton */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-8 space-y-3">
        <div className="h-7 w-52 bg-slate-700 rounded-lg" />
        <div className="h-4 w-96 bg-slate-700/60 rounded" />
      </div>

      {/* Filter and Table Skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/85 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="h-10 flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
          <div className="h-10 w-44 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
          <div className="h-10 w-28 bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
        </div>

        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-100 dark:border-zinc-850"
            >
              <div className="flex items-center gap-4">
                <div className="h-3.5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-24 bg-zinc-300 dark:bg-zinc-700 rounded" />
                <div className="h-5 w-24 bg-blue-100 dark:bg-blue-950/60 rounded-md" />
              </div>
              <div className="h-3.5 w-64 bg-zinc-100 dark:bg-zinc-800 rounded hidden md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
