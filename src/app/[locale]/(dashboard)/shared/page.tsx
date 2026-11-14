"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DashboardHeader } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"
import {
  Share2,
  Link,
  User,
  Users,
  Eye,
  Edit,
  Copy,
  Trash2,
  Clock,
  Calendar,
  ExternalLink,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Check,
  X,
} from "lucide-react"

interface SharedDoc {
  id: string
  documentId: string
  documentTitle: string
  sharedWith: string | null
  permission: "view" | "edit" | "comment"
  link: string
  expiresAt: string | null
  createdAt: string
  accessCount: number
}

export default function SharedDocumentsPage() {
  const [sharedDocs, setSharedDocs] = useState<SharedDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterPermission, setFilterPermission] = useState<string>("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSharedDocs()
  }, [])

  const fetchSharedDocs = async () => {
    setLoading(true)
    try {
      // Mock data for demo
      const mockData: SharedDoc[] = [
        {
          id: "1",
          documentId: "doc-1",
          documentTitle: "Project Proposal.pdf",
          sharedWith: "client@example.com",
          permission: "view",
          link: "https://forgedocs.app/share/abc123",
          expiresAt: "2024-02-15T00:00:00Z",
          createdAt: "2024-01-10T10:00:00Z",
          accessCount: 5,
        },
        {
          id: "2",
          documentId: "doc-2",
          documentTitle: "Contract Draft.docx",
          sharedWith: "lawyer@example.com",
          permission: "edit",
          link: "https://forgedocs.app/share/def456",
          expiresAt: null,
          createdAt: "2024-01-12T14:00:00Z",
          accessCount: 12,
        },
        {
          id: "3",
          documentId: "doc-3",
          documentTitle: "Meeting Notes.pdf",
          sharedWith: null,
          permission: "comment",
          link: "https://forgedocs.app/share/ghi789",
          expiresAt: "2024-01-30T00:00:00Z",
          createdAt: "2024-01-15T09:00:00Z",
          accessCount: 3,
        },
      ]
      setSharedDocs(mockData)
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to load shared documents", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filteredDocs = sharedDocs.filter((doc) => {
    const matchesSearch = doc.documentTitle.toLowerCase().includes(search.toLowerCase()) ||
      (doc.sharedWith?.toLowerCase().includes(search.toLowerCase()) || false)
    const matchesPermission = filterPermission === "all" || doc.permission === filterPermission
    return matchesSearch && matchesPermission
  })

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast({ title: "Link copied to clipboard", variant: "success" })
  }

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke access to this document?")) return
    try {
      // await fetch(`/api/shared/${id}`, { method: "DELETE" })
      setSharedDocs(sharedDocs.filter((d) => d.id !== id))
      toast({ title: "Access revoked", variant: "success" })
    } catch (e) {
      toast({ title: "Failed to revoke access", variant: "destructive" })
    }
  }

  const [newShareDocId, setNewShareDocId] = useState("")
  const [newShareEmail, setNewShareEmail] = useState("")
  const [newSharePermission, setNewSharePermission] = useState<"view" | "edit" | "comment">("view")
  const [newShareExpires, setNewShareExpires] = useState("")

  const handleCreateShare = async () => {
    if (!newShareDocId || (!newShareEmail && newSharePermission !== "view")) {
      toast({ title: "Please fill in required fields", variant: "destructive" })
      return
    }
    try {
      // await fetch("/api/shared", { method: "POST", body: JSON.stringify({...}) })
      toast({ title: "Share link created", variant: "success" })
      setShowCreateModal(false)
      setNewShareDocId("")
      setNewShareEmail("")
      setNewShareExpires("")
      fetchSharedDocs()
    } catch (e) {
      toast({ title: "Failed to create share", variant: "destructive" })
    }
  }

  const getPermissionBadge = (permission: string) => {
    const badges = {
      view: <Badge variant="secondary">View Only</Badge>,
      edit: <Badge variant="default">Can Edit</Badge>,
      comment: <Badge variant="outline">Can Comment</Badge>,
    }
    return badges[permission as keyof typeof badges] || <Badge>{permission}</Badge>
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Shared Documents"
        description="Manage document sharing links and permissions"
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Share Document
          </Button>
        }
      />

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents, emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterPermission} onValueChange={setFilterPermission}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Permissions</SelectItem>
            <SelectItem value="view">View Only</SelectItem>
            <SelectItem value="edit">Can Edit</SelectItem>
            <SelectItem value="comment">Can Comment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Shared Documents Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 animate-pulse">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-muted mx-4 rounded" />
                ))}
              </div>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Share2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">No shared documents</h3>
              <p className="text-sm mb-4">
                {search ? "Try adjusting your search or filters" : "Start sharing documents with others"}
              </p>
              {!search && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Share Your First Document
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Shared With</th>
                    <th className="px-4 py-3">Permission</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3">Access Count</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium truncate max-w-[300px]">{doc.documentTitle}</p>
                            <p className="text-xs text-muted-foreground">ID: {doc.documentId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {doc.sharedWith ? (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{doc.sharedWith}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Link className="h-4 w-4" />
                            <span>Public Link</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{getPermissionBadge(doc.permission)}</td>
                      <td className="px-4 py-3">
                        {doc.expiresAt ? (
                          <span className={isExpired(doc.expiresAt) ? "text-destructive" : "text-muted-foreground"}>
                            {isExpired(doc.expiresAt) ? "Expired " : ""}
                            {new Date(doc.expiresAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{doc.accessCount}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleCopyLink(doc.link)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => window.open(doc.link, "_blank")}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRevoke(doc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Share Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-card rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-6">Create Share Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Document ID</label>
                <Input
                  value={newShareDocId}
                  onChange={(e) => setNewShareDocId(e.target.value)}
                  placeholder="Enter document ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Share With (Email)</label>
                <Input
                  type="email"
                  value={newShareEmail}
                  onChange={(e) => setNewShareEmail(e.target.value)}
                  placeholder="Optional - leave blank for public link"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Permission</label>
                <Select value={newSharePermission} onValueChange={(v) => setNewSharePermission(v as "view" | "edit" | "comment")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="edit">Can Edit</SelectItem>
                    <SelectItem value="comment">Can Comment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expires At (Optional)</label>
                <Input
                  type="date"
                  value={newShareExpires}
                  onChange={(e) => setNewShareExpires(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button onClick={handleCreateShare}>Create Link</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText } from "lucide-react"