import { NextRequest, NextResponse } from "next/server"
import { getPooledRouteClient } from "@/lib/supabase"
import OpenAI from "openai"
import { openaiCircuitBreaker } from "@/lib/circuit-breaker"
import { validateCSRF } from "@/lib/csrf"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { z } from "zod"

export const dynamic = "force-dynamic"

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ).optional(),
})

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured")
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export const POST = withErrorBoundary(async (request) => {
  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await validateCSRF(request)

  const body = await request.json()
  const parsed = chatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { message, history } = parsed.data

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ 
      error: "AI provider not configured. Please set OPENAI_API_KEY environment variable." 
    }, { status: 503 })
  }

  const openai = getOpenAI()

  const MAX_HISTORY_MESSAGES = 20

  const messages = [
    { 
      role: "system" as const, 
      content: "You are a helpful AI assistant for ForgeDocs, a document management platform. Help users with document-related questions, writing, editing, and workflow questions." 
    },
    ...(history || [])
      .slice(-MAX_HISTORY_MESSAGES)
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    { role: "user" as const, content: message },
  ]

  const completion = await openaiCircuitBreaker.execute(() =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    })
  )

  const response = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again."

  return NextResponse.json({ response })
})
