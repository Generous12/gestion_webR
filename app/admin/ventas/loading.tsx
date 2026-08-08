import React from 'react';

export default function VentasLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner / Mode Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex gap-2">
          <div className="h-10 w-44 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-10 w-44 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-10 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
        <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>

      {/* Main Grid: Left Products / Right Ticket Virtual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Products Catalogue Skeleton (2 cols span) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client Search Skeleton */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-11 w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-xl" />
          </div>

          {/* Products Grid Skeleton */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <div className="space-y-1.5">
                <div className="h-4 w-52 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-72 bg-zinc-100 dark:bg-zinc-850 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-48 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
                <div className="h-9 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="p-4 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3"
                >
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      <div className="h-4 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      <div className="flex justify-between items-center pt-1">
                        <div className="h-4 w-16 bg-zinc-300 dark:bg-zinc-700 rounded" />
                        <div className="h-3.5 w-14 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <div className="h-8 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Virtual Skeleton */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 space-y-6 h-fit">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-150 dark:border-zinc-800">
            <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
          </div>

          <div className="space-y-3">
            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
          </div>

          <div className="space-y-3 py-4 border-y border-zinc-150 dark:border-zinc-800">
            <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
            {[1, 2].map((i) => (
              <div key={i} className="flex justify-between items-center py-2">
                <div className="space-y-1">
                  <div className="h-3.5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-2.5 w-16 bg-zinc-100 dark:bg-zinc-850 rounded" />
                </div>
                <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-6 w-24 bg-zinc-300 dark:bg-zinc-700 rounded" />
            </div>
            <div className="h-11 w-full bg-emerald-600/30 rounded-xl mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
