import LoginForm from "./login-form"
import { isGuestMode } from "@/lib/guest-session"

export default function LoginPage() {
  // Free-tier guest mode bypasses the standard authentication workflow entirely.
  // When enabled there is no login prompt — users continue directly as a guest.
  if (isGuestMode()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
        <div className="max-w-md mx-auto">
          <div className="rounded-xl bg-card border p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-foreground mb-2">Guest access</h1>
            <p className="text-muted-foreground mb-6">
              ForgeDocs is running in free-tier guest mode. No login required — create and edit documents directly.
            </p>
            <a href="/" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Continue as guest
            </a>
          </div>
        </div>
      </div>
    )
  }

  return <LoginForm />
}
