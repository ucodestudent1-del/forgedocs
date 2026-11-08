import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, DollarSign, Clock, Users } from "lucide-react"

export default async function BillingPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: () => cookieStore }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()

  const tier = subscription?.tier || "free"
  const tierInfo = {
    free: {
      name: "Free",
      price: "$0",
      description: "For individuals and small teams",
      features: ["500 documents/month", "100 conversions/month", "5 GB storage", "Community support", "Team collaboration"],
      limits: { documents: 500, conversions: 100, storage: "5 GB" },
    },
    pro: {
      name: "Pro",
      price: "$15",
      description: "For power users and growing teams",
      features: ["Unlimited documents", "Unlimited conversions", "100 GB storage", "Priority support", "Advanced templates", "Audit logs"],
      limits: { documents: null, conversions: null, storage: "100 GB" },
    },
  }

  const currentTier = tierInfo[tier as keyof typeof tierInfo] || tierInfo.free

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and usage</p>
      </div>

      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold">{currentTier.name}</h2>
            <p className="text-muted-foreground text-sm">{currentTier.description}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold">{currentTier.price}</span>
            <span className="text-muted-foreground text-sm">/month</span>
          </div>
          <Button className="w-full lg:w-auto" disabled={tier === "pro"}>
            {tier === "pro" ? "Current Plan" : "Upgrade to Pro"}
          </Button>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <UsageStat title="Documents Created" value="0/500" icon={CreditCard} />
            <UsageStat title="Conversions" value="0/100" icon={DollarSign} />
            <UsageStat title="Storage Used" value="0 MB / 5 GB" icon={Users} />
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Choose a Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PlanCard
              name="Free"
              price="$0"
              description="For individuals and small teams"
              features={["500 documents/month", "100 conversions/month", "5 GB storage", "Community support", "Team collaboration"]}
              popular={false}
            />
            <PlanCard
              name="Pro"
              price="$15"
              description="For power users and growing teams"
              features={["Unlimited documents", "Unlimited conversions", "100 GB storage", "Priority support", "Advanced templates", "Audit logs"]}
              popular={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function UsageStat({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  )
}

function PlanCard({ name, price, description, features, popular }: { name: string; price: string; description: string; features: string[]; popular: boolean }) {
  return (
    <Card className={`relative flex flex-col ${popular ? "border-primary ring-1 ring-primary" : ""}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          Popular
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-3xl font-bold mb-4">{price}</div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="text-xs text-green-600">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="pt-4">
        <Button className="w-full" variant={popular ? "default" : "outline"} disabled={tier === name.toLowerCase()}>
          {tier === name.toLowerCase() ? "Current Plan" : popular ? "Get Started" : "Choose Plan"}
        </Button>
      </CardFooter>
    </Card>
  )
}
