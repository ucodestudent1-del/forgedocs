import ReaderPage from "@/components/reader/ReaderPage"
import { getDocumentWithTranslation } from "@/app/actions/translations"

export const dynamic = "force-dynamic"

export default async function ReaderPageRoute({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id, locale } = await params

  const userLocale = locale && typeof locale === "string" ? locale : "en"

  const doc = await getDocumentWithTranslation(id, userLocale)

  if (!doc) {
    return <ReaderPage document={{ error: "Document not found" } as any} />
  }

  return <ReaderPage document={doc} />
}
