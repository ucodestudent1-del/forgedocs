import { Suspense } from "react"
import VerifyEmailForm from "./verify-form"

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<div className="flex items-center justify-center h-[400px]">Loading...</div>}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  )
}
