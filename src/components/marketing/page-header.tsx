import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  action?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back to home",
  action,
}: PageHeaderProps) {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            {title}
          </h1>
          {description && <p className="text-lg text-muted-foreground max-w-2xl">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {backHref && (
        <Link href={backHref} className="mt-8 md:mt-0 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}
    </>
  )
}
