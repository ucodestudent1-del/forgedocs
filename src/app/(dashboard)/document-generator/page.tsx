import { Suspense } from "react"
import DocumentGeneratorForm from "./document-generator-form"

export default function DocumentGeneratorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[600px]">Loading...</div>}>
      <DocumentGeneratorForm />
    </Suspense>
  )
}