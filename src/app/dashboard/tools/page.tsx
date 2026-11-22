"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard/header"
import { Wrench, RefreshCw, Bot, FileImage, FileSignature, PenTool, Share2, History, CreditCard, FileText, Users } from "lucide-react"

export default function ToolsPage() {
  const tools = [
    {
      id: "conversion",
      label: "Document Conversion",
      description: "Convert documents between different formats",
      icon: RefreshCw,
      color: "bg-blue-100 text-blue-600",
      href: "/conversion",
    },
    {
      id: "ai-assistant",
      label: "AI Assistant",
      description: "AI-powered document assistance and generation",
      icon: Bot,
      color: "bg-purple-100 text-purple-600",
      href: "/ai-assistant",
    },
    {
      id: "pdf-tools",
      label: "PDF Tools",
      description: "Merge, split, compress, rotate, and more",
      icon: FileImage,
      color: "bg-red-100 text-red-600",
      href: "/pdf-tools",
    },
    {
      id: "e-signatures",
      label: "E-Signatures",
      description: "Send documents for electronic signature",
      icon: FileSignature,
      color: "bg-green-100 text-green-600",
      href: "/e-signatures",
    },
    {
      id: "document-generator",
      label: "Document Generator",
      description: "Generate documents from templates",
      icon: PenTool,
      color: "bg-orange-100 text-orange-600",
      href: "/document-generator",
    },
    {
      id: "files",
      label: "File Management",
      description: "Upload and manage your documents",
      icon: FileText,
      color: "bg-indigo-100 text-indigo-600",
      href: "/files",
    },
    {
      id: "admin-users",
      label: "Admin Users",
      description: "Manage user accounts and permissions",
      icon: Users,
      color: "bg-pink-100 text-pink-600",
      href: "/dashboard/admin/users",
    },
    {
      id: "admin-subscriptions",
      label: "Admin Subscriptions",
      description: "Manage subscription plans and billing",
      icon: CreditCard,
      color: "bg-cyan-100 text-cyan-600",
      href: "/dashboard/admin/subscriptions",
    },
  ]

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Tools"
        description="Access all ForgeDocs tools and utilities"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Card key={tool.id} className="cursor-pointer hover:border-primary/50 transition-colors hover:shadow-sm">
            <Link href={tool.href}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <tool.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-medium">{tool.label}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}