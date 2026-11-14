"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { File, Plus, Search } from "lucide-react"

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/templates")
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Templates</h1>
          <p className="text-muted-foreground">Generate documents from templates</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="relative">
        <label htmlFor="template-search" className="sr-only">Search templates</label>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="template-search"
          type="search"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pl-10 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-96"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 animate-pulse rounded-lg bg-card p-6">
            <div className="h-4 bg-muted w-3/4 rounded mb-4" />
            <div className="h-4 bg-muted w-1/2 rounded" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-12 text-muted-foreground">
            <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No templates found</p>
          </div>
        ) : (
          filtered.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))
        )}
      </div>
    </div>
  )
}

function TemplateCard({ template }: { template: any }) {
  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <File className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Template</span>
        </div>
        <CardTitle className="mt-2 text-lg font-medium">{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-3">
          {template.category || "General"} • {template.placeholder_schema?.length || 0} fields
        </p>
        <Button size="sm" className="w-full">
          Generate Document
        </Button>
      </CardContent>
    </Card>
  )
}
