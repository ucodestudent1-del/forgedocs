import { NextResponse } from "next/server"

export const GET = async (req: Request): Promise<NextResponse> => {
  // Redirect to /api/documents which has caching and advanced filtering
  return NextResponse.redirect(new URL("/api/documents" + new URL(req.url).search, req.url), 301)
}
