import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import { ClientContactForm } from "@/components/client/ContactForm"
import { Mail, DollarSign, Shield, Clock, Copy } from "lucide-react"

export const metadata: Metadata = {
  title: "Contact ForgeDocs - Get in Touch",
  description: "Contact ForgeDocs for sales, support, security, or enterprise inquiries. Email hello@forgedocs.com or use our contact form.",
}

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
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
                <ContactItem label="Email" value="hello@forgedocs.com" href="mailto:hello@forgedocs.com" icon={<Mail className="h-5 w-5" />} />
                <ContactItem label="Sales" value="sales@forgedocs.com" href="mailto:sales@forgedocs.com" icon={<DollarSign className="h-5 w-5" />} />
                <ContactItem label="Security" value="security@forgedocs.com" href="mailto:security@forgedocs.com" icon={<Shield className="h-5 w-5" />} />
                <ContactItem label="Hours" value="Mon–Fri, 9am–6pm EST" icon={<Clock className="h-5 w-5" />} />
              </div>
            </div>
            <div>
              <ClientContactForm />
            </div>
          </div>
        </div>
      </section>
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Prefer to self-serve?</h2>
          <p className="text-muted-foreground mb-8">Check out our documentation and FAQ for quick answers.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/faq" className="px-6 py-3 border border-input bg-background hover:bg-accent text-foreground font-medium rounded-lg transition-colors">
              View FAQ
            </Link>
            <Link href="/features" className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors">
              Explore features
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}

function ContactItem({ label, value, href, icon }: { label: string; value: string; href?: string; icon: React.ReactNode }) {
  const Content = href ? "a" : "div"
  return (
    <>
      {href ? (
        <a
          href={href}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
        >
          <span>{icon}</span>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
            <p className="text-sm font-medium text-foreground truncate">{value}</p>
          </div>
        </a>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
          <span>{icon}</span>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
            <p className="text-sm font-medium text-foreground">{value}</p>
          </div>
        </div>
      )}
    </>
  )
}
