import ReaderPage from "@/components/reader/ReaderPage"
import { getDocumentWithTranslation } from "@/app/actions/translations"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ReaderPageRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const doc = await getDocumentWithTranslation(id)

  if (!doc) {
    notFound()
  }

  return <ReaderPage document={doc} />
}