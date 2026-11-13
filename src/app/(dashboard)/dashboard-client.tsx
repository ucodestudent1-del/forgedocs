"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Search, Bell, ChevronLeft, ChevronRight } from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"

interface DashboardClientProps {
  userEmail: string | null
  userInitial: string
  children: React.ReactNode
}

export default function DashboardClient({
  userEmail,
  userInitial,
  children,
}: DashboardClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { toast } = useToast()
  const pathname = usePathname()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={userEmail}
        userInitial={userInitial}
      />

      <div className="flex-1 overflow-hidden relative">
        <header className="flex items-center justify-between h-16 px-4 border-b bg-background/50 backdrop-blur md:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Open sidebar"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
            <div className="relative w-full md:w-96 lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search documents, templates, tools..."
                className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors cursor-pointer relative" />
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
              {userInitial}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}