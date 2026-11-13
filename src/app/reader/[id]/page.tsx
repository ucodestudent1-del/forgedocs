import ReaderPage from "@/components/reader/ReaderPage"

export const dynamic = "force-dynamic"

export default async function ReaderPageRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // TEMPORARILY DISABLED: Auth check removed for development
  // const supabase = await createRouteClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user) {
  //   return redirect("/auth/login")
  // }

  // const { data: doc, error } = await supabase
  //   .from("documents")
  //   .select("id, title, content, mime_type, version, updated_at, user_id")
  //   .eq("id", id)
  //   .single()

  // if (error || !doc) {
  //   return <ReaderPage document={{ error: "Document not found" }} />
  // }

  // Only the owner may read the document
  // if (user && doc.user_id !== user.id) {
  //   return <ReaderPage document={{ error: "You do not have access to this document" }} />
  // }

  // Mock document for demo
  const doc = {
    id,
    title: "Demo Document",
    content: "# Welcome to ForgeDocs\n\nThis is a demo document for the reader view.",
    mime_type: "text/markdown",
    version: 1,
    updated_at: new Date().toISOString(),
    user_id: "demo-user"
  }

  return <ReaderPage document={doc} />
}
