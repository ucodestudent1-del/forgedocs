import { Suspense } from "react"
import LoginForm from "./login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<div className="flex items-center justify-center h-[400px]">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}