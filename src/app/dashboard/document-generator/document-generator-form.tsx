"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Save, Download, Plus } from "lucide-react"
import { TEMPLATE_LIBRARY, getTemplateById } from "@/lib/templateLibrary"
import { DocumentGenerator } from "@/lib/document-generator"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { apiFetch } from "@/lib/api-client"

interface ServerTemplate {
  id: string
  name: string
  description: string
  category: string
  content: string
  placeholder_schema: Array<{
    name: string
    type: string
    label: string
    required?: boolean
    placeholder?: string
    default_value?: string
  }>
  is_system?: boolean
}

export default function DocumentGeneratorForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateData, setTemplateData] = useState<Record<string, string>>({})
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null)
  const [documentName, setDocumentName] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [serverTemplates, setServerTemplates] = useState<ServerTemplate[]>([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  // Load system templates from server, fall back to TEMPLATE_LIBRARY
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await apiFetch("/api/templates?is_system=true")
        if (res.ok) {
          const data = await res.json()
          if (data.templates && data.templates.length > 0) {
            setServerTemplates(data.templates as ServerTemplate[])
          }
        }
      } catch {
        // Server unavailable, will use TEMPLATE_LIBRARY fallback
      } finally {
        setTemplatesLoaded(true)
      }
    }
    loadTemplates()
  }, [])

  // Get available templates: server templates first, then TEMPLATE_LIBRARY fallback
  const getAvailableTemplates = () => {
    if (serverTemplates.length > 0) {
      return serverTemplates.map((t: ServerTemplate) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        fields: t.placeholder_schema || [],
        sections: [], // Server templates don't have predefined sections
        styling: {},
        content: t.content,
        is_system: t.is_system,
      }))
    }
    return Object.values(TEMPLATE_LIBRARY)
  }

  const templates = getAvailableTemplates()

  useEffect(() => {
    const templateParam = searchParams.get("template")
    if (templateParam && !selectedTemplateId) {
      const template = templates.find((t: any) => t.id === templateParam)
      if (template) {
        setSelectedTemplateId(template.id)
      }
    }
  }, [searchParams, selectedTemplateId, templates])

  const handleGenerate = async () => {
    if (!selectedTemplateId) return

    setIsGenerating(true)
    try {
      const generator = new DocumentGenerator(selectedTemplateId, templateData)
      const html = await generator.generateHTML()

      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setGeneratedDocument(html)
      setDocumentName(`${selectedTemplateId.replace(/_/g, "-")}-document`)
    } catch (e) {
      console.error("Generation failed:", e)
      toast({ title: "Failed to generate document", description: e instanceof Error ? e.message : String(e), variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!downloadUrl) return
    const a = document.createElement("a")
    a.href = downloadUrl
    a.download = `${documentName || "document"}.html`
    a.click()
  }

  const handleFieldChange = (fieldName: string, value: string) => {
    setTemplateData((prev) => ({ ...prev, [fieldName]: value }))
  }

  // Get template fields for the selected template
  const getSelectedTemplateFields = () => {
    if (serverTemplates.length > 0) {
      const t = serverTemplates.find((t: ServerTemplate) => t.id === selectedTemplateId)
      return t?.placeholder_schema || []
    }
    const t = getTemplateById(selectedTemplateId!)
    return t?.fields || []
  }

  const selectedFields = getSelectedTemplateFields()

  if (!selectedTemplateId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Document Generator</h1>
            <p className="text-muted-foreground">Generate professional documents from templates</p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => setSelectedTemplateId(null)}>
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template: any) => (
            <Card key={template.id} className="cursor-pointer hover:border-primary/50 transition-colors hover:shadow-sm" onClick={() => setSelectedTemplateId(template.id)}>
              <CardHeader>
                <CardTitle className="text-lg font-medium">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {template.fields.slice(0, 3).map((field: any) => (
                    <div key={field.name} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{field.name.replace(/_/g, " ")}</span>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">{field.type}</span>
                    </div>
                  ))}
                  {template.fields.length > 3 && (
                    <div className="text-xs text-muted-foreground">+{template.fields.length - 3} more fields</div>
                  )}
                </div>
                <Button key={template.id} onClick={(e) => {
                  e.stopPropagation()
                  setSelectedTemplateId(template.id)
                }} size="sm" variant="outline">
                  Select Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/3 overflow-y-auto max-h-[calc(100vh-160px)]">
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
              <CardDescription>Fill in the template fields</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-4">
                  {selectedFields.map((field: any) => (
                    <div key={field.name} className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground block">
                        {field.label || field.name.replace(/_/g, " ")}
                        {field.required && <span className="text-destructive text-xs ml-1">*</span>}
                      </label>
                      <input
                        type={field.type === "textarea" ? "text" : field.type}
                        placeholder={field.placeholder}
                        value={templateData[field.name] || ""}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  ))}
                  <div className="mt-6 flex items-center gap-3">
                    <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                      {isGenerating ? <Save className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4" />}
                      Generate Document
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedTemplateId(null)} className="flex-1">
                      Back to Templates
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="w-full lg:w-2/3">
          {generatedDocument ? (
            <Card>
              <CardHeader>
                <CardTitle>Document Generated</CardTitle>
                <CardDescription>Your document is ready to preview and download</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium truncate max-w-[300px]">{documentName}.html</span>
                  </div>
                  <div className="h-96 bg-muted rounded-lg border border-input overflow-hidden relative">
                    <iframe
                      className="absolute inset-0 w-full h-full border-0"
                      src={`data:text/html;charset=utf-8,${encodeURIComponent(generatedDocument)}`}
                      title="Document preview"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm" aria-hidden="true">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Preview</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleDownload} disabled={!downloadUrl} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download HTML
                    </Button>
                    <Button variant="outline" onClick={() => setGeneratedDocument(null)} className="flex-1">
                      Generate Another
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
