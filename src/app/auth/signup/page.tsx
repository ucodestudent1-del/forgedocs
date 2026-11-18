import { Suspense } from "react"
import SignupForm from "./signup-form"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<div className="flex items-center justify-center h-[400px]">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  )
}