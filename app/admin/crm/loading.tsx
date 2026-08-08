import React from 'react';

export default function CrmLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-6 w-52 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-3.5 w-80 bg-zinc-100 dark:bg-zinc-850 rounded" />
        </div>
        <div className="h-10 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>

      {/* CRM Stats Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3"
          >
            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-6 w-20 bg-zinc-300 dark:bg-zinc-700 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Search & Member Directory Skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="h-11 w-full max-w-md bg-zinc-100 dark:bg-zinc-800 rounded-xl" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-850 rounded" />
                </div>
              </div>
              <div className="h-7 w-full bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
