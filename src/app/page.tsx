import Link from "next/link"

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                F
              </div>
              <Link href="/dashboard" className="text-xl font-bold tracking-tight text-primary">
                ForgeDocs
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Dashboard
              </Link>
              <Link href="/documents" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Documents
              </Link>
              <Link href="/templates" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Templates
              </Link>
              <Link href="/conversion" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Conversion
              </Link>
              <Link href="/billing" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Billing
              </Link>
              <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to ForgeDocs</h1>
            <p className="mt-2 text-muted-foreground">
              Professional document management, generation, editing, and conversion platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Document Management" description="Create, organize, and version your documents in the cloud.">
              <Link href="/documents" className="text-primary font-medium hover:underline">
                View Documents →
              </Link>
            </Card>
            <Card title="Templates" description="Generate professional documents from pre-built templates.">
              <Link href="/templates" className="text-primary font-medium hover:underline">
                Browse Templates →
              </Link>
            </Card>
            <Card title="Conversion" description="Convert between DOCX, PDF, XLSX, PPTX, CSV, and more.">
              <Link href="/conversion" className="text-primary font-medium hover:underline">
                Start Conversion →
              </Link>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

function Card({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}
