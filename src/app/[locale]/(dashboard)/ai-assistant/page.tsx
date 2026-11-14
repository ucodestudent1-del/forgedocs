"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardHeader } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"
import {
  Bot,
  Sparkles,
  PenTool,
  FileText,
  Copy,
  Download,
  Loader2,
  ArrowRight,
  Zap,
  Wand2,
  Type,
  Scissors,
  Plus,
  Minus,
  RefreshCw,
  Smile,
  Frown,
  Brain,
} from "lucide-react"

const AI_ACTIONS = [
  { id: "generate", label: "Generate Content", icon: Sparkles, description: "Create new content from a prompt" },
  { id: "rewrite", label: "Rewrite", icon: PenTool, description: "Rewrite selected text with improved clarity" },
  { id: "summarize", label: "Summarize", icon: FileText, description: "Create a concise summary of long content" },
  { id: "expand", label: "Expand", icon: Plus, description: "Add more detail and depth to content" },
  { id: "shorten", label: "Shorten", icon: Minus, description: "Condense content while keeping key points" },
  { id: "tone", label: "Change Tone", icon: Smile, description: "Adjust the tone (professional, casual, friendly)" },
  { id: "grammar", label: "Fix Grammar", icon: Brain, description: "Correct grammar, spelling, and punctuation" },
  { id: "translate", label: "Translate", icon: RefreshCw, description: "Translate content to another language" },
]

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "persuasive", label: "Persuasive" },
  { value: "technical", label: "Technical" },
  { value: "creative", label: "Creative" },
]

const TEMPLATES = [
  { id: "proposal", label: "Business Proposal", icon: FileText, category: "Business" },
  { id: "report", label: "Executive Report", icon: FileText, category: "Reports" },
  { id: "email", label: "Professional Email", icon: FileText, category: "Communication" },
  { id: "meeting", label: "Meeting Notes", icon: FileText, category: "Meetings" },
  { id: "invoice", label: "Invoice", icon: FileText, category: "Finance" },
  { id: "contract", label: "Contract Draft", icon: FileText, category: "Legal" },
  { id: "blog", label: "Blog Post", icon: FileText, category: "Content" },
  { id: "social", label: "Social Media Post", icon: FileText, category: "Marketing" },
]

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState<"actions" | "templates" | "chat">("actions")
  const [selectedAction, setSelectedAction] = useState<string>("generate")
  const [inputText, setInputText] = useState("")
  const [outputText, setOutputText] = useState("")
  const [processing, setProcessing] = useState(false)
  const [tone, setTone] = useState("professional")
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [chatInput, setChatInput] = useState("")
  const { toast } = useToast()

  const handleAction = async () => {
    if (!inputText.trim() && selectedAction !== "generate") {
      toast({ title: "Please enter some text", variant: "destructive" })
      return
    }

    setProcessing(true)
    try {
      // Simulate AI processing
      await new Promise((resolve) => setTimeout(resolve, 1500))

      let result = ""
      switch (selectedAction) {
        case "generate":
          result = `Generated content based on your requirements. This would be replaced with actual AI output from your configured provider.`
          break
        case "rewrite":
          result = `Rewritten version of your text with improved clarity and flow: ${inputText}`
          break
        case "summarize":
          result = `Summary: ${inputText.slice(0, 200)}...`
          break
        case "expand":
          result = `Expanded version with more detail: ${inputText} Additional context and examples would be added here.`
          break
        case "shorten":
          result = `Condensed: ${inputText.slice(0, 100)}...`
          break
        case "tone":
          result = `[${tone.charAt(0).toUpperCase() + tone.slice(1)} tone] ${inputText}`
          break
        case "grammar":
          result = `Corrected: ${inputText} (grammar fixes applied)`
          break
        case "translate":
          result = `[Translated] ${inputText}`
          break
      }
      setOutputText(result)
      toast({ title: "AI processing complete", variant: "success" })
    } catch (e) {
      toast({ title: "AI processing failed", variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText)
    toast({ title: "Copied to clipboard", variant: "success" })
  }

  const handleInsertToEditor = () => {
    toast({ title: "Inserted into editor", variant: "success" })
  }

  const handleChatSend = async () => {
    if (!chatInput.trim()) return

    const userMessage = chatInput
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setChatInput("")

    setProcessing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const response = `AI response to: "${userMessage}". This would come from your AI provider.`
      setChatMessages((prev) => [...prev, { role: "assistant", content: response }])
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="AI Assistant"
        description="Power your documents with AI — generate, rewrite, summarize, and more"
        action={
          <Button variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Configure AI Provider
          </Button>
        }
      />

      {/* Tab Navigation */}
      <div className="flex border-b border-input">
        {[
          { key: "actions" as const, label: "AI Actions", icon: Wand2 },
          { key: "templates" as const, label: "Templates", icon: FileText },
          { key: "chat" as const, label: "Chat", icon: Bot },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 -mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-muted-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* AI Actions Tab */}
      {activeTab === "actions" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Actions Sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {AI_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => setSelectedAction(action.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedAction === action.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <action.icon className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{AI_ACTIONS.find((a) => a.id === selectedAction)?.label}</CardTitle>
                <CardDescription>{AI_ACTIONS.find((a) => a.id === selectedAction)?.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedAction !== "generate" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Input Text</label>
                    <Textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Paste or type your text here..."
                      className="min-h-[200px]"
                    />
                  </div>
                )}

                {selectedAction === "tone" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Target Tone</label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TONE_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={handleAction}
                  disabled={processing || (selectedAction !== "generate" && !inputText.trim())}
                  className="w-full"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Run AI Action
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {outputText && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Result</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleInsertToEditor}>
                      <PenTool className="h-4 w-4 mr-2" />
                      Insert to Editor
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-muted/50 rounded-lg min-h-[150px] whitespace-pre-wrap font-mono text-sm">
                    {outputText}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Templates
            </CardTitle>
            <CardDescription>Generate professional documents from AI-powered templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  className="p-4 rounded-lg border border-input bg-background hover:border-primary/50 hover:bg-primary/5 transition-colors text-left group"
                >
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                    <template.icon className="h-6 w-6" />
                  </div>
                  <h4 className="font-medium mb-1">{template.label}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {template.category}
                  </Badge>
                  <Button variant="outline" size="sm" className="mt-3 w-full">
                    Generate
                  </Button>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <Card className="flex flex-col h-[70vh]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Chat
            </CardTitle>
            <CardDescription>Ask questions, brainstorm ideas, or get writing help</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 space-y-4 p-4">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                <Bot className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="font-medium mb-2">Start a conversation</h3>
                <p className="text-sm">Ask me anything about your documents or writing tasks.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <Type className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t p-4">
            <div className="flex items-center gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleChatSend())}
                placeholder="Ask me anything..."
                className="flex-1"
                disabled={processing}
              />
              <Button onClick={handleChatSend} disabled={processing || !chatInput.trim()}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}