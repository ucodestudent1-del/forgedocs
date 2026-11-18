import ReaderPage from "@/components/reader/ReaderPage"
import { getDocumentWithTranslation } from "@/app/actions/translations"

export const dynamic = "force-dynamic"

export default async function ReaderPageRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const doc = await getDocumentWithTranslation(id)

  if (!doc) {
    return <ReaderPage document={{ error: "Document not found" }} />
  }

  return <ReaderPage document={doc} />
}