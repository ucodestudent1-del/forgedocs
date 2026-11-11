import Link from "next/link"

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-xl font-bold tracking-tight text-primary">
                ForgeDocs
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Pricing
              </Link>
              <Link href="/features" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Features
              </Link>
              <Link href="/solutions" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Solutions
              </Link>
              <Link href="/faq" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                FAQ
              </Link>
              <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Sign in
              </Link>
              <a
                href="/auth/signup"
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Get started
              </a>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
                Get in touch
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Have questions about ForgeDocs? Want to discuss enterprise pricing or a custom integration? We'd love to hear from you.
              </p>
              <div className="space-y-6">
                <ContactItem icon="✉️" label="Email" value="hello@forgedocs.com" href="mailto:hello@forgedocs.com" />
                <ContactItem icon="💼" label="Sales" value="sales@forgedocs.com" href="mailto:sales@forgedocs.com" />
                <ContactItem icon="🔒" label="Security" value="security@forgedocs.com" href="mailto:security@forgedocs.com" />
                <ContactItem icon="🕒" label="Hours" value="Mon–Fri, 9am–6pm EST" />
              </div>
            </div>

            <div>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="Full name" placeholder="Jane Doe" />
                  <TextField label="Work email" placeholder="jane@company.com" type="email" />
                </div>
                <TextField label="Company" placeholder="Acme Corporation" />
                <TextField label="Subject" placeholder="How can we help?" />
                <TextArea label="Message" placeholder="Tell us about your needs..." rows={5} />
                <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors">
                  Send message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Prefer to self-serve?</h2>
          <p className="text-muted-foreground mb-8">Check out our documentation and FAQ for quick answers.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/faq" className="px-6 py-3 border border-input bg-background hover:bg-accent text-foreground font-medium rounded-lg transition-colors">
              View FAQ
            </a>
            <a href="/features" className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors">
              Explore features
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

function ContactItem({ icon, label, value, href }: { icon: string; label: string; value: string; href?: string }) {
  return (
    <a
      href={href || "#"}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </a>
  )
}

function TextField({ label, placeholder, type }: { label: string; placeholder: string; type?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        type={type || "text"}
        placeholder={placeholder}
        className="h-10 w-full px-3 rounded-md border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  )
}

function TextArea({ label, placeholder, rows }: { label: string; placeholder: string; rows: number }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <textarea
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  )
}
