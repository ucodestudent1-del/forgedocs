import { NextRequest, NextResponse } from "next/server"
import { getRouteClient } from "@/lib/supabase"
import OpenAI from "openai"

export const dynamic = "force-dynamic"

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured")
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

const SYSTEM_PROMPTS: Record<string, string> = {
  generate: "You are a professional document writer. Generate clear, well-structured content based on the user's requirements.",
  rewrite: "You are an expert editor. Rewrite the text to improve clarity, flow, and readability while maintaining the original meaning.",
  summarize: "You are an expert summarizer. Create a concise summary capturing the key points of the text.",
  expand: "You are a content expander. Add detail, examples, and context to make the text more comprehensive.",
  shorten: "You are a concise writer. Condense the text while preserving the key information.",
  tone: "You are a tone adapter. Rewrite the text to match the specified tone while preserving the core message.",
  grammar: "You are a grammar expert. Fix all grammar, punctuation, and syntax errors in the text.",
  translate: "You are a translator. Translate the text to the target language while preserving meaning and tone.",
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getRouteClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action, input, tone, targetLanguage } = body

    if (!action || (!input && action !== "generate")) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: "AI provider not configured. Please set OPENAI_API_KEY environment variable." 
      }, { status: 503 })
    }

    const openai = getOpenAI()
    const systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS.generate
    
    let userPrompt = ""
    switch (action) {
      case "generate":
        userPrompt = `Generate content for: ${input || "general document"}`
        break
      case "rewrite":
        userPrompt = `Rewrite this text with improved clarity and flow: ${input}`
        break
      case "summarize":
        userPrompt = `Summarize this text concisely: ${input}`
        break
      case "expand":
        userPrompt = `Expand this text with more detail and examples: ${input}`
        break
      case "shorten":
        userPrompt = `Condense this text while preserving key information: ${input}`
        break
      case "tone":
        userPrompt = `Rewrite in ${tone || "professional"} tone: ${input}`
        break
      case "grammar":
        userPrompt = `Fix all grammar, punctuation, and syntax errors: ${input}`
        break
      case "translate":
        userPrompt = `Translate to ${targetLanguage || "English"}: ${input}`
        break
      default:
        userPrompt = `${action.charAt(0).toUpperCase() + action.slice(1)} this text: ${input}`
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const result = completion.choices[0]?.message?.content || "AI processing complete"

    return NextResponse.json({ result })
  } catch (error) {
    console.error("AI assistant error:", error)
    
    if (error instanceof Error && error.message.includes("API key")) {
      return NextResponse.json({ 
        error: "AI provider not configured. Please set OPENAI_API_KEY environment variable." 
      }, { status: 503 })
    }
    
    return NextResponse.json({ error: "AI processing failed" }, { status: 500 })
  }
}