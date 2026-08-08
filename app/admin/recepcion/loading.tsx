import React from 'react';

export default function RecepcionLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Check-in Hero Card Skeleton */}
      <div className="rounded-3xl bg-gradient-to-r from-zinc-900 to-blue-950 p-8 text-white space-y-6 shadow-xl">
        <div className="space-y-2 max-w-xl">
          <div className="h-4 w-32 bg-zinc-700 rounded-full" />
          <div className="h-8 w-64 bg-zinc-700 rounded-xl" />
          <div className="h-3.5 w-80 bg-zinc-700/60 rounded" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
          <div className="h-14 flex-1 bg-zinc-800 rounded-2xl" />
          <div className="h-14 w-40 bg-blue-600/60 rounded-2xl" />
        </div>
      </div>

      {/* Access History List Skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-zinc-150 dark:border-zinc-800">
          <div className="h-5 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-28 bg-zinc-100 dark:bg-zinc-850 rounded" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-100 dark:border-zinc-850"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-2.5 w-24 bg-zinc-100 dark:bg-zinc-850 rounded" />
                </div>
              </div>
              <div className="h-6 w-20 bg-emerald-100 dark:bg-emerald-950/60 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
