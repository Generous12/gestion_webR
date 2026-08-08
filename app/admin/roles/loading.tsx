import React from 'react';

export default function RolesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-6 w-52 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-3.5 w-80 bg-zinc-100 dark:bg-zinc-850 rounded" />
        </div>
        <div className="h-10 w-36 bg-blue-600/50 rounded-xl" />
      </div>

      {/* Roles & Permissions Matrix Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-5"
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-150 dark:border-zinc-800">
              <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-6 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
            </div>

            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl">
                  <div className="h-3.5 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="w-5 h-5 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
