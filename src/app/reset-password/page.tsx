import { Suspense } from "react"
import ResetPasswordForm from "./reset-password-form"

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<div className="flex items-center justify-center h-[400px]">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
