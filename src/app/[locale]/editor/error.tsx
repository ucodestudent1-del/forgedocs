"use client"

import { useTranslations } from "@/lib/i18n"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations(["errors", "common"])
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <h2 className="text-xl font-medium text-destructive">{t("editorError")}</h2>
      <p className="text-muted-foreground mt-2">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        {t("common.confirm")}
      </button>
    </div>
  )
}
