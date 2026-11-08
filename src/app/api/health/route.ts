import { NextResponse } from "next/server"
import { getRouteClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getRouteClient()
    const { error } = await supabase.from("documents").select("id").limit(1)

    if (error) {
      return NextResponse.json(
        { status: "degraded", database: "unavailable", error: error.message },
        { status: 503 }
      )
    }

    return NextResponse.json({ status: "healthy", database: "connected" })
  } catch (error) {
    return NextResponse.json(
      { status: "degraded", database: "unavailable", error: String(error) },
      { status: 503 }
    )
  }
}
