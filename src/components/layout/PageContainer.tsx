"use client"

import { PropsWithChildren } from "react"

/**
 * PageContainer provides a consistent layout wrapper for all marketing and
 * content pages. It centers content within a max-width container with
 * responsive horizontal padding.
 *
 * Usage:
 *   <PageContainer className="optional-extra-classes">
 *     {children}
 *   </PageContainer>
 */
export function PageContainer({
  children,
  className,
  maxWidth = "max-w-7xl",
  px = "px-4 sm:px-6 lg:px-8",
}: PropsWithChildren<{
  className?: string
  maxWidth?: string
  px?: string
}>) {
  return (
    <div className={`${maxWidth} mx-auto ${px} ${className ?? ""}`}>
      {children}
    </div>
  )
}

export default PageContainer
