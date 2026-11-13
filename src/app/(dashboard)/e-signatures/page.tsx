"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DashboardHeader } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"
import {
  FileSignature,
  PenTool,
  UserPlus,
  Mail,
  Eye,
  Download,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Upload,
  Send,
  Settings,
  RefreshCw,
} from "lucide-react"

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  sent: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
  declined: "bg-red-100 text-red-700",
}

export default function ESignaturesPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "create" | "manage">("dashboard")
  const [signingRequests, setSigningRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Mock data for demo
  const mockRequests = [
    {
      id: "1",
      documentName: "Service Agreement.pdf",
      status: "completed",
      signers: [{ name: "John Doe", email: "john@example.com", status: "signed" }, { name: "Jane Smith", email: "jane@example.com", status: "signed" }],
      createdAt: "2024-01-15T10:00:00Z",
      completedAt: "2024-01-15T14:30:00Z",
    },
    {
      id: "2",
      documentName: "NDA.pdf",
      status: "pending",
      signers: [{ name: "Bob Wilson", email: "bob@example.com", status: "pending" }],
      createdAt: "2024-01-20T09:00:00Z",
    },
    {
      id: "3",
      documentName: "Contract.pdf",
      status: "sent",
      signers: [{ name: "Alice Brown", email: "alice@example.com", status: "viewed" }, { name: "Charlie Davis", email: "charlie@example.com", status: "pending" }],
      createdAt: "2024-01-22T11:00:00Z",
    },
  ]

  if (activeTab === "dashboard") {
    return (
      <div className="space-y-6">
        <DashboardHeader
          title="E-Signatures"
          description="Send, track, and manage document signing requests"
          action={
            <Button onClick={() => setActiveTab("create")}>
              <Plus className="h-4 w-4 mr-2" />
              New Signature Request
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Requests" value={mockRequests.length} icon={FileSignature} />
          <StatCard title="Pending" value={mockRequests.filter((r) => r.status === "pending").length} icon={Clock} color="yellow" />
          <StatCard title="Completed" value={mockRequests.filter((r) => r.status === "completed").length} icon={CheckCircle} color="green" />
          <StatCard title="Expired" value={mockRequests.filter((r) => r.status === "expired").length} icon={AlertTriangle} color="red" />
        </div>

        {/* Recent Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Signature Requests</CardTitle>
              <CardDescription>Track the status of your signing requests</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("manage")}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <div className="bg-muted px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider grid grid-cols-12">
                <div className="col-span-4">Document</div>
                <div className="col-span-3">Signers</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-1">Actions</div>
              </div>
              <div className="divide-y">
                {mockRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="grid grid-cols-12 items-center px-4 py-3 gap-4">
                    <div className="col-span-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <FileSignature className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium truncate">{request.documentName}</p>
                          <p className="text-xs text-muted-foreground">{request.signers.length} signer(s)</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <div className="flex flex-wrap gap-1">
                        {request.signers.map((signer: any, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {signer.name} ({signer.status})
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Badge className={STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                    <div className="col-span-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (activeTab === "create") {
    const [documentFile, setDocumentFile] = useState<File | null>(null)
    const [signers, setSigners] = useState<Array<{ name: string; email: string; order: number }>>([{ name: "", email: "", order: 1 }])
    const [message, setMessage] = useState("")

    const addSigner = () => {
      setSigners([...signers, { name: "", email: "", order: signers.length + 1 }])
    }

    const removeSigner = (index: number) => {
      if (signers.length <= 1) return
      setSigners(signers.filter((_, i) => i !== index))
    }

    const handleSend = async () => {
      if (!documentFile) {
        toast({ title: "Please upload a document", variant: "destructive" })
        return
      }
      if (signers.some((s) => !s.name || !s.email)) {
        toast({ title: "Please fill in all signer details", variant: "destructive" })
        return
      }

      setLoading(true)
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        toast({ title: "Signature request sent!", variant: "success" })
        setActiveTab("dashboard")
        setDocumentFile(null)
        setSigners([{ name: "", email: "", order: 1 }])
        setMessage("")
      } catch (e) {
        toast({ title: "Failed to send request", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="space-y-6">
        <DashboardHeader
          title="Create Signature Request"
          description="Upload a document and add signers"
          action={
            <Button variant="outline" onClick={() => setActiveTab("dashboard")}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Document
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  documentFile ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"
                }`}
                onClick={() => document.getElementById("esign-file-input")?.click()}
              >
                <input
                  id="esign-file-input"
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <FileSignature className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">
                  {documentFile ? documentFile.name : "Click to upload document (PDF, DOCX)"}
                </p>
                <p className="text-xs text-muted-foreground">Drag and drop or click to browse</p>
              </div>

              {documentFile && (
                <Button variant="outline" onClick={() => setDocumentFile(null)} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Change Document
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Signers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Signers
              </CardTitle>
              <Button variant="outline" size="sm" onClick={addSigner}>
                <Plus className="h-4 w-4 mr-2" />
                Add Signer
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {signers.map((signer, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground w-8">#{signer.order}</span>
                  <div className="flex-1">
                    <Input placeholder="Full Name" value={signer.name} onChange={(e) => {
                      setSigners(signers.map((s, i) => i === index ? { ...s, name: e.target.value } : s))
                    }} />
                  </div>
                  <div className="flex-1">
                    <Input type="email" placeholder="Email Address" value={signer.email} onChange={(e) => {
                      setSigners(signers.map((s, i) => i === index ? { ...s, email: e.target.value } : s))
                    }} />
                  </div>
                  {signers.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeSigner(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Message */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Message to Signers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message (optional)..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Send Button */}
          <div className="lg:col-span-2 flex justify-end">
            <Button onClick={handleSend} disabled={loading} size="lg" className="w-[300px]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send for Signature
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Manage Requests"
        description="View and manage all signature requests"
        action={
          <Button variant="outline" onClick={() => setActiveTab("dashboard")}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        }
      />

      <Card>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <div className="bg-muted px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider grid grid-cols-12">
              <div className="col-span-3">Document</div>
              <div className="col-span-3">Signers</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2">Actions</div>
            </div>
            <div className="divide-y">
              {mockRequests.map((request) => (
                <div key={request.id} className="grid grid-cols-12 items-center px-4 py-3 gap-4">
                  <div className="col-span-3">
                    <p className="font-medium">{request.documentName}</p>
                  </div>
                  <div className="col-span-3">
                    <div className="flex flex-wrap gap-1">
                      {request.signers.map((signer: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {signer.name} - {signer.status}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Badge className={STATUS_COLORS[request.status as keyof typeof STATUS_COLORS]}>
                      {request.status}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                    {request.status === "pending" && <Button variant="ghost" size="icon" className="text-destructive"><XCircle className="h-4 w-4" /></Button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color = "blue" }: { title: string; value: number; icon: React.ElementType; color?: string }) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    red: "bg-red-100 text-red-600",
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colors[color as keyof typeof colors]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function Loader2({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
}