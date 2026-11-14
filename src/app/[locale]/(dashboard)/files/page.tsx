"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  FolderOpen,
  FileText,
  FileImage,
  FileSpreadsheet,
  Search,
  Plus,
  Upload,
  MoreVertical,
  Trash2,
  Edit,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
  Filter,
  X,
  Star,
  Archive,
  Clock,
  Home,
  Loader2,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"

interface FileItem {
  id: string
  name: string
  type: "file" | "folder"
  mime_type?: string
  size?: number
  parent_id?: string | null
  created_at: string
  updated_at: string
  is_pinned: boolean
  is_archived: boolean
}

const FILE_TYPE_ICONS: Record<string, React.ElementType> = {
  pdf: FileImage,
  docx: FileText,
  xlsx: FileSpreadsheet,
  pptx: FileText,
  txt: FileText,
  folder: FolderOpen,
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState<FileItem[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<"name" | "size" | "date">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchFiles()
  }, [currentFolderId, search, sortBy, sortOrder])

  async function fetchFiles() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        folder_id: currentFolderId || "",
        search,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      const res = await fetch(`/api/files?${params}`)
      const data = await res.json()
      setFiles(data.files || [])
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to load files", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (currentFolderId) formData.append("folder_id", currentFolderId)

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("Upload failed")
      toast({ title: "File uploaded successfully", variant: "success" })
      fetchFiles()
    } catch (e) {
      console.error(e)
      toast({ title: "Upload failed", variant: "destructive" })
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return

    setCreatingFolder(true)
    try {
      const res = await fetch("/api/files/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName,
          parent_id: currentFolderId,
        }),
      })

      if (!res.ok) throw new Error("Failed to create folder")
      toast({ title: "Folder created", variant: "success" })
      setNewFolderName("")
      fetchFiles()
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to create folder", variant: "destructive" })
    } finally {
      setCreatingFolder(false)
    }
  }

  function navigateToFolder(folder: FileItem) {
    if (folder.type === "folder") {
      setCurrentFolderId(folder.id)
      setCurrentPath((prev) => [...prev, folder])
    }
  }

  function navigateToPath(index: number) {
    if (index === -1) {
      setCurrentFolderId(null)
      setCurrentPath([])
    } else {
      setCurrentFolderId(currentPath[index].id)
      setCurrentPath(currentPath.slice(0, index + 1))
    }
  }

  function handleSort(field: "name" | "size" | "date") {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(field)
      setSortOrder("desc")
    }
  }

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let comparison = 0
    if (sortBy === "name") {
      comparison = a.name.localeCompare(b.name)
    } else if (sortBy === "size") {
      comparison = (a.size || 0) - (b.size || 0)
    } else if (sortBy === "date") {
      comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    }
    return sortOrder === "asc" ? comparison : -comparison
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const getFileIcon = (file: FileItem) => {
    if (file.type === "folder") return FolderOpen
    const ext = file.mime_type?.split("/").pop() || "txt"
    return FILE_TYPE_ICONS[ext] || FileText
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="My Files"
        description="Manage your files and folders"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreatingFolder(true)} disabled={creatingFolder}>
              <Plus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
            <label className="relative">
              <input
                type="file"
                multiple
                onChange={handleUpload}
                className="sr-only"
                id="file-upload"
                disabled={uploading}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </label>
            </label>
          </div>
        }
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          onClick={() => navigateToPath(-1)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          Root
        </button>
        {currentPath.map((folder, index) => (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <button
              onClick={() => navigateToPath(index)}
              className="hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {folder.name}
            </button>
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Filter className="h-4 w-4 text-muted-foreground mx-2" />
          <select
            value={sortBy}
            onChange={(e) => handleSort(e.target.value as "name" | "size" | "date")}
            className="text-sm border border-input bg-background px-2 py-1 rounded"
          >
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
            aria-label={sortOrder === "asc" ? "Sort ascending" : "Sort descending"}
          >
            {sortOrder === "asc" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* File List/Grid */}
      <div className="overflow-hidden rounded-md border">
        {loading ? (
          <div className="p-8 animate-pulse">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-32 bg-muted rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded" />
                ))}
              </div>
            )}
          </div>
        ) : sortedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-1">No files found</h3>
            <p className="text-sm mb-4">
              {search ? "Try adjusting your search" : "This folder is empty"}
            </p>
            {!search && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCreatingFolder(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
                <label className="relative">
                  <input type="file" onChange={handleUpload} className="sr-only" id="empty-upload" />
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                </label>
              </div>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {sortedFiles.map((file) => (
              <FileGridItem
                key={file.id}
                file={file}
                onOpen={navigateToFolder}
                getIcon={getFileIcon}
                formatSize={formatFileSize}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y">
            <div className="bg-muted px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider grid grid-cols-12">
              <div className="col-span-6">Name</div>
              <div className="col-span-2 hidden md:block">Type</div>
              <div className="col-span-2 hidden md:block">Size</div>
              <div className="col-span-2">Modified</div>
            </div>
            {sortedFiles.map((file) => (
              <FileListItem
                key={file.id}
                file={file}
                onOpen={navigateToFolder}
                getIcon={getFileIcon}
                formatSize={formatFileSize}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {creatingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCreatingFolder(false)}>
          <div className="bg-card rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Create New Folder</h3>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCreatingFolder(false); setNewFolderName("") }}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || creatingFolder}>
                {creatingFolder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FileGridItem({
  file,
  onOpen,
  getIcon,
  formatSize,
}: {
  file: FileItem
  onOpen: (file: FileItem) => void
  getIcon: (file: FileItem) => React.ElementType
  formatSize: (bytes: number) => string
}) {
  const Icon = getIcon(file)
  const isFolder = file.type === "folder"

  return (
    <div
      className="group flex flex-col p-3 rounded-lg border border-input bg-background hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => onOpen(file)}
    >
      <div className="h-20 w-20 mx-auto mb-3 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        <Icon className="h-10 w-10" />
      </div>
      <div className="flex-1 flex flex-col">
        <h4 className="font-medium text-sm truncate mb-1">{file.name}</h4>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{isFolder ? "Folder" : formatSize(file.size || 0)}</span>
          <span>{new Date(file.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1 rounded hover:bg-accent" aria-label="View"><Eye className="h-4 w-4" /></button>
        <button className="p-1 rounded hover:bg-accent" aria-label="Download"><Download className="h-4 w-4" /></button>
        <button className="p-1 rounded hover:bg-accent" aria-label="More"><MoreVertical className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

function FileListItem({
  file,
  onOpen,
  getIcon,
  formatSize,
}: {
  file: FileItem
  onOpen: (file: FileItem) => void
  getIcon: (file: FileItem) => React.ElementType
  formatSize: (bytes: number) => string
}) {
  const Icon = getIcon(file)
  const isFolder = file.type === "folder"

  return (
    <div
      className="grid grid-cols-12 items-center px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => onOpen(file)}
    >
      <div className="col-span-6 flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-medium truncate">{file.name}</span>
          {file.is_pinned && <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
          {file.is_archived && <Archive className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
        </div>
      </div>
      <div className="col-span-2 hidden md:block text-sm text-muted-foreground">
        {isFolder ? "Folder" : file.mime_type?.split("/").pop()?.toUpperCase() || "FILE"}
      </div>
      <div className="col-span-2 hidden md:block text-sm text-muted-foreground">
        {isFolder ? "—" : formatSize(file.size || 0)}
      </div>
      <div className="col-span-2 text-sm text-muted-foreground">
        {new Date(file.updated_at).toLocaleDateString()}
      </div>
    </div>
  )
}