import React from 'react';

export default function PlanesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-6 w-44 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-3.5 w-72 bg-zinc-100 dark:bg-zinc-850 rounded" />
        </div>
        <div className="h-10 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>

      {/* Pricing Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-6 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-3.5 w-24 bg-zinc-100 dark:bg-zinc-850 rounded" />
                </div>
                <div className="h-6 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
              </div>

              <div className="h-10 w-28 bg-zinc-300 dark:bg-zinc-700 rounded-xl" />

              <div className="space-y-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                    <div className="h-3 w-40 bg-zinc-100 dark:bg-zinc-850 rounded" />
                  </div>
                ))}
              </div>
            </div>

            <div className="h-11 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
