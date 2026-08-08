import React from 'react';

export default function InventarioLoading() {
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
          <div className="h-10 w-36 bg-blue-600/50 rounded-xl" />
        </div>
      </div>

      {/* Inventory KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3"
          >
            <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-7 w-28 bg-zinc-300 dark:bg-zinc-700 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Product List Table Skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-150 dark:border-zinc-800">
          <div className="h-10 w-72 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
          <div className="h-8 w-36 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-100 dark:border-zinc-850"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-32 bg-zinc-100 dark:bg-zinc-850 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-6 w-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full" />
                <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
