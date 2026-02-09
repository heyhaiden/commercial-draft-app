import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function BrandCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#5a5a4a]/30 bg-[#2d2d1e] p-4 flex items-center gap-3">
      <Skeleton className="w-14 h-14 rounded-xl bg-[#3d3d2e]" />
      <div className="flex-1">
        <Skeleton className="h-5 w-32 mb-2 bg-[#3d3d2e]" />
        <Skeleton className="h-4 w-24 bg-[#3d3d2e]" />
      </div>
      <Skeleton className="h-8 w-16 bg-[#3d3d2e]" />
    </div>
  );
}

export function PlayerCardSkeleton() {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3 bg-[#4a4a3a]/20 border border-[#5a5a4a]/30">
      <Skeleton className="w-12 h-12 rounded-full bg-[#3d3d2e]" />
      <div className="flex-1">
        <Skeleton className="h-5 w-28 mb-1 bg-[#3d3d2e]" />
        <Skeleton className="h-4 w-20 bg-[#3d3d2e]" />
      </div>
      <Skeleton className="h-6 w-16 bg-[#3d3d2e]" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl bg-[#3d3d2e] border border-[#5a5a4a]/30 p-4">
      <Skeleton className="h-4 w-20 mb-2 bg-[#4a4a3a]" />
      <Skeleton className="h-8 w-16 bg-[#4a4a3a]" />
    </div>
  );
}