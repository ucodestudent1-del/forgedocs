import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail, Lock, User, Chrome } from "lucide-react"

export default async function SignupPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    return redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Start managing your documents</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/auth/signup" method="POST" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full name</label>
              <Input name="full_name" placeholder="John Doe" className="w-full" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" name="email" placeholder="you@example.com" required className="w-full" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" name="password" placeholder="••••••••" required className="w-full" />
            </div>
            <Button type="submit" className="w-full">
              Create account
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <a
            href="/api/auth/google"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background text-foreground hover:bg-accent transition-colors"
          >
            <Chrome className="h-4 w-4" />
            Google
          </a>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <a href="/auth/login" className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border border-input bg-background text-foreground hover:bg-accent transition-colors">
            Already have an account? Sign in
          </a>
        </CardFooter>
      </Card>
    </div>
  )
}
