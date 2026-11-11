export default function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold tracking-tight text-foreground mb-6">
              Professional document management, generation, editing, and conversion platform
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create, organize, and version your documents in the cloud. Generate from templates, convert formats, and collaborate seamlessly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a href="/dashboard" className="px-8 py-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors">
              Get Started
            </a>
            <a href="/templates" className="px-8 py-4 border border-input bg-background hover:bg-accent text-foreground font-medium rounded-lg transition-colors">
              Browse Templates
            </a>
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Features</h2>
            <p className="text-muted-foreground">Everything you need to manage your documents</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg border bg-card p-6">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary mb-4">
                <span className="text-xl">📄</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Document Management</h3>
              <p className="text-muted-foreground">Create, organize, and version your documents in the cloud.</p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary mb-4">
                <span className="text-xl">📋</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Templates</h3>
              <p className="text-muted-foreground">Generate professional documents from pre-built templates.</p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary mb-4">
                <span className="text-xl">🔄</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Conversion</h3>
              <p className="text-muted-foreground">Convert between DOCX, PDF, XLSX, PPTX, CSV, and more.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-xl bg-primary p-8 text-primary-foreground">
            <h2 className="text-3xl font-bold mb-4">Ready to organize your documents?</h2>
            <p className="text-primary-foreground/90 mb-6">Join thousands of teams using ForgeDocs to streamline their document workflow.</p>
            <a href="/dashboard" className="px-8 py-3 bg-background text-primary font-semibold rounded-lg hover:bg-primary/90 transition-colors">
              Start for free
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
