"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Save, Download, Plus, FileText as FileTextIcon } from "lucide-react"
import { TEMPLATE_LIBRARY, getTemplateById } from "@/lib/templateLibrary"
import { DocumentGenerator } from "@/lib/documentGenerator"
import { useRouter, useSearchParams } from "next/navigation"

export default function DocumentGeneratorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateData, setTemplateData] = useState<Record<string, string>>({})
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const templates = Object.values(TEMPLATE_LIBRARY)

  useEffect(() => {
    const templateParam = searchParams.get("template")
    if (templateParam && !selectedTemplateId) {
      const template = getTemplateById(templateParam)
      if (template) {
        setSelectedTemplateId(template.id)
      }
    }
  }, [searchParams, selectedTemplateId])

  const handleGenerate = async () => {
    if (!selectedTemplateId) return

    setIsGenerating(true)
    try {
      const generator = new DocumentGenerator(selectedTemplateId, templateData)
      const html = generator.generateHTML()
      
      // Create downloadable HTML file
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      setGeneratedDocument(url)
      
      // Auto-download
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedTemplateId.replace(/_/g, '-')}-document.html`
      a.click()
      
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error("Generation failed:", e)
      alert("Failed to generate document: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFieldChange = (fieldName: string, value: string) => {
    setTemplateData(prev => ({ ...prev, [fieldName]: value }))
  }

  if (!selectedTemplateId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Document Generator</h1>
            <p className="text-muted-foreground">Generate professional documents from templates</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <Card key={template.id} className="cursor-pointer hover:border-primary/50 transition-colors hover:shadow-sm" 
                  onClick={() => setSelectedTemplateId(template.id)}>
              <CardHeader>
                <CardTitle className="text-lg font-medium">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {template.fields.slice(0, 3).map(field => (
                    <div key={field.name} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{field.name.replace(/_/g, ' ')}</span>
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
      {!selectedTemplateId ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Document Generator</h1>
              <p className="text-muted-foreground">Generate professional documents from templates</p>
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Document
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <Card key={template.id} className="cursor-pointer hover:border-primary/50 transition-colors hover:shadow-sm" 
                    onClick={() => setSelectedTemplateId(template.id)}>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {template.fields.slice(0, 3).map(field => (
                      <div key={field.name} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{field.name.replace(/_/g, ' ')}</span>
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
      ) : (
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
                    {templateData && Object.entries((TEMPLATE_LIBRARY as Record<string, { fields: { name: string; label: string; required: boolean; type: string; placeholder?: string }[] }>)[selectedTemplateId!].fields).map(([fieldName, field]) => (
                      <div key={fieldName} className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground block">
                          {field.label}
                          {field.required && <span className="text-destructive text-xs ml-1">*</span>}
                        </label>
                        <input
                          type={field.type === "textarea" ? "text" : field.type}
                          placeholder={field.placeholder}
                          value={templateData[fieldName] || ""}
                          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                          className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    ))}
                    <div className="mt-6 flex items-center gap-3">
                      <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full"
                      >
                        {isGenerating ? <Save className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4" />}
                        Generate Document
                      </Button>
                      <Button
                        onClick={() => setSelectedTemplateId(null)}
                        variant="outline"
                      >
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
                  <CardDescription>Your document is ready to download</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <FileText className="h-32 w-32 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">{selectedTemplateId.replace(/_/g, ' ')}</h3>
                    <p className="text-muted-foreground text-sm mb-4">Click below to download your document</p>
                    <Button
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = generatedDocument
                        a.download = `${selectedTemplateId.replace(/_/g, '-')}-document.html`
                        a.click()
                      }}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
