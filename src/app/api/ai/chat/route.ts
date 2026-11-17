import { NextRequest, NextResponse } from "next/server"
import { getRouteClient } from "@/lib/supabase"
import OpenAI from "openai"
import { openaiCircuitBreaker } from "@/lib/circuit-breaker"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const dynamic = "force-dynamic"

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured")
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export const POST = withErrorBoundary(async (request) => {
  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { message, history } = body

  if (!message) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 })
  }

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
      .map((msg: { role: string; content: string }) => ({
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