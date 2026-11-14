import ReaderPage from "@/components/reader/ReaderPage"
import { getDocumentWithTranslation } from "@/app/actions/translations"

export const dynamic = "force-dynamic"

export default async function ReaderPageRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const { locale } = await searchParams

  // Resolve user locale from query param (set by reader based on user's preference)
  const userLocale = locale && typeof locale === "string" ? locale : "en"

  const doc = await getDocumentWithTranslation(id, userLocale)

  if (!doc) {
    return <ReaderPage document={{ error: "Document not found" } as any} />
  }

  return <ReaderPage document={doc} />
}
