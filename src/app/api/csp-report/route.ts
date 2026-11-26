import { NextResponse } from "next/server"
import logger from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const cspReport = body["csp-report"] ?? body
    logger.warn("CSP violation reported", {
      "document-uri": cspReport["document-uri"],
      "blocked-uri": cspReport["blocked-uri"],
      "violated-directive": cspReport["violated-directive"],
      "effective-directive": cspReport["effective-directive"],
      "status-code": cspReport["status-code"],
      "sample": cspReport["sample"],
    })
    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse("Invalid report", { status: 400 })
  }
}
