import React from 'react';

export function TableSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b border-neutral-800/50">
          <td className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-800/50 animate-pulse shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-neutral-800/50 rounded w-1/3 animate-pulse" />
                <div className="h-3 bg-neutral-800/50 rounded w-1/4 animate-pulse" />
              </div>
            </div>
          </td>
          <td className="p-4">
            <div className="h-6 bg-neutral-800/50 rounded-full w-20 animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-6 bg-neutral-800/50 rounded w-24 animate-pulse" />
          </td>
          <td className="p-4 text-right">
            <div className="flex items-center justify-end gap-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-800/50 animate-pulse" />
              <div className="w-8 h-8 rounded-lg bg-neutral-800/50 animate-pulse" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
