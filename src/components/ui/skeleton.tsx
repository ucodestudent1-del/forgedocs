"use client"

import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular"
  width?: string | number
  height?: string | number
}

export function Skeleton({
  className,
  variant = "text",
  width,
  height,
  ...props
}: SkeletonProps) {
  const widthClass = width ? `w-[${typeof width === "number" ? `${width}px` : width}]` : ""
  const heightClass = height ? `h-[${typeof height === "number" ? `${height}px` : height}]` : ""

  return (
    <div
      className={cn(
        "animate-pulse rounded bg-muted",
        {
          "rounded-full": variant === "circular",
          "rounded-md": variant === "rectangular",
          "h-4 w-full max-w-[250px]": variant === "text",
        },
        widthClass,
        heightClass,
        className
      )}
      {...props}
    />
  )
}

export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("animate-pulse rounded-lg border bg-card p-4", className)} {...props}>
      <Skeleton variant="text" width="60%" className="mb-4" />
      <Skeleton variant="text" width="40%" className="mb-2" />
      <Skeleton variant="text" width="80%" />
    </div>
  )
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
  ...props
}: {
  rows?: number
  columns?: number
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("animate-pulse", className)} {...props}>
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="text" width={`calc(100% / ${columns})`} height="12px" className="flex-1" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex gap-4 px-4 py-3 border-t border-muted">
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton key={col} variant="text" width={`calc(100% / ${columns})`} height="14px" className="flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonUsageCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("animate-pulse rounded-lg border bg-card p-4", className)} {...props}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="circular" width="24px" height="24px" />
      </div>
      <Skeleton variant="text" width="80%" className="mb-2 text-2xl" />
      <Skeleton variant="text" width="60%" className="mb-4" />
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary/50 w-1/2 rounded-full" />
      </div>
      <div className="flex justify-between text-xs mt-2">
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="text" width="30%" />
      </div>
    </div>
  )
}

export function SkeletonList({ items = 5, className, ...props }: { items?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("animate-pulse space-y-3", className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          <Skeleton variant="circular" width="40px" height="40px" />
          <div className="flex-1 space-y-1">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="25%" />
          </div>
          <Skeleton variant="circular" width="24px" height="24px" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("animate-pulse h-64 flex items-end justify-around p-4", className)} {...props}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-1 max-w-32">
          <div className="flex gap-1 h-[200px] items-end w-full justify-around">
            <Skeleton variant="rectangular" width="6px" height={`${Math.random() * 100 + 20}%`} className="rounded-t" />
            <Skeleton variant="rectangular" width="6px" height={`${Math.random() * 100 + 20}%`} className="rounded-t" />
            <Skeleton variant="rectangular" width="6px" height={`${Math.random() * 100 + 20}%`} className="rounded-t" />
          </div>
          <Skeleton variant="text" width="100%" height="12px" />
        </div>
      ))}
      <div className="flex flex-col items-start gap-4 ml-4">
        <Skeleton variant="rectangular" width="24px" height="8px" className="rounded" />
        <Skeleton variant="rectangular" width="24px" height="8px" className="rounded" />
        <Skeleton variant="rectangular" width="24px" height="8px" className="rounded" />
      </div>
    </div>
  )
}

export function SkeletonPlanCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("animate-pulse rounded-lg border bg-card", className)} {...props}>
      <div className="p-4 space-y-3">
        <Skeleton variant="text" width="30%" className="text-lg" />
        <Skeleton variant="text" width="60%" />
      </div>
      <div className="p-4 border-t space-y-2">
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
      <div className="p-4 border-t">
        <Skeleton variant="rectangular" width="100%" height="40px" className="rounded" />
      </div>
    </div>
  )
}