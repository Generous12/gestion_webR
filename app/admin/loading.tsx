import React from 'react';

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="rounded-3xl bg-zinc-200/80 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl w-full">
          <div className="h-4 w-32 bg-zinc-300 dark:bg-zinc-800 rounded-full" />
          <div className="h-8 w-64 bg-zinc-300 dark:bg-zinc-800 rounded-xl" />
          <div className="h-4 w-96 bg-zinc-300/70 dark:bg-zinc-800/70 rounded-lg" />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="h-11 w-36 bg-zinc-300 dark:bg-zinc-800 rounded-xl" />
          <div className="h-11 w-36 bg-zinc-300 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>

      {/* Main Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-850 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
              <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="h-7 w-32 bg-zinc-300 dark:bg-zinc-800 rounded-lg" />
            <div className="h-3 w-40 bg-zinc-200 dark:bg-zinc-850 rounded-md" />
          </div>
        ))}
      </div>

      {/* Analytics & Breakdown Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-850 space-y-5"
          >
            <div className="space-y-2">
              <div className="h-4 w-36 bg-zinc-300 dark:bg-zinc-800 rounded-md" />
              <div className="h-3 w-48 bg-zinc-200 dark:bg-zinc-850 rounded-md" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                  <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
