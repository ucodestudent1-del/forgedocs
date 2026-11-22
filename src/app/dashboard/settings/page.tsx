"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"
import { updateProfile, updateProfileLanguage, updateNotificationPreferences } from "@/app/actions/settings"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import {
  User,
  Mail,
  Lock,
  Bell,
  Shield,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Loader2,
  Key,
  Smartphone,
  Globe,
  Palette,
  Moon,
  Sun,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "data", label: "Data & Privacy", icon: Download },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>("profile")
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const { toast } = useToast()

  // Profile state
  const [profile, setProfile] = useState({
    fullName: "John Doe",
    email: "john@example.com",
    avatarUrl: "",
    bio: "Product manager at Acme Inc.",
    timezone: "America/Los_Angeles",
    language: "en",
  })

  // Security state
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [sessions, setSessions] = useState([
    { id: "1", device: "Chrome on macOS", location: "San Francisco, CA", current: true, lastActive: "Now" },
    { id: "2", device: "Firefox on Windows", location: "New York, NY", current: false, lastActive: "2 hours ago" },
    { id: "3", device: "Mobile App (iOS)", location: "San Francisco, CA", current: false, lastActive: "1 day ago" },
  ])
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordChanging, setPasswordChanging] = useState(false)

  // Notifications state
  const [notifSettings, setNotifSettings] = useState({
    email: {
      conversions: true,
      ai_generation: true,
      signatures: true,
      sharing: true,
      usage_warnings: true,
      marketing: false,
      security: true,
    },
    push: {
      conversions: true,
      ai_generation: true,
      signatures: true,
      sharing: true,
      usage_warnings: true,
    },
    in_app: {
      conversions: true,
      ai_generation: true,
      signatures: true,
      sharing: true,
    },
  })

  // Appearance state
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable")

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const result = await updateProfile({
        fullName: profile.fullName,
        email: profile.email,
        bio: profile.bio,
        timezone: profile.timezone,
        language: profile.language,
      })
      if (result.error) {
        toast({ title: result.error, variant: "destructive" })
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({ title: "Profile saved", variant: "success" })
    } catch (e) {
      toast({ title: "Failed to save", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const { currentPassword, newPassword, confirmPassword } = passwordForm
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Please fill in all fields", variant: "destructive" })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "New password and confirmation do not match", variant: "destructive" })
      return
    }
    setPasswordChanging(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast({ title: error.message || "Failed to change password", variant: "destructive" })
        return
      }
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      toast({ title: "Password updated successfully", variant: "success" })
    } catch {
      toast({ title: "Failed to change password", variant: "destructive" })
    } finally {
      setPasswordChanging(false)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileResult, documentsResult, templatesResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("documents").select("*").eq("user_id", user.id),
        supabase.from("templates").select("*").eq("user_id", user.id),
      ])

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: { id: user.id, email: user.email },
        profile: profileResult.data || null,
        documents: documentsResult.data || [],
        templates: templatesResult.data || [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `forgedocs-export-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Data exported successfully", variant: "success" })
    } catch {
      toast({ title: "Failed to export data", variant: "destructive" })
    } finally {
      setExporting(false)
    }
  }

  const handleExportDocuments = async () => {
    setExporting(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: documents } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: { id: user.id, email: user.email },
        documents: documents || [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `forgedocs-documents-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Documents exported successfully", variant: "success" })
    } catch {
      toast({ title: "Failed to export documents", variant: "destructive" })
    } finally {
      setExporting(false)
    }
  }

  const handleSaveNotificationPreferences = async () => {
    try {
      const result = await updateNotificationPreferences(notifSettings)
      if (result.error) {
        toast({ title: result.error, variant: "destructive" })
        return
      }
      toast({ title: "Notification preferences saved", variant: "success" })
    } catch {
      toast({ title: "Failed to save notification preferences", variant: "destructive" })
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure? This will permanently delete your account and all data. This action cannot be undone.")) {
      return
    }
    setDeleting(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const result = await supabase.auth.deleteUser?.()
      const error = result?.error
      if (error) {
        toast({ title: error.message || "Failed to delete account", variant: "destructive" })
        setDeleting(false)
        return
      }
    toast({ title: "Account deleted successfully", variant: "success" })
    setTimeout(() => {
      window.location.href = "/auth/login"
    }, 1500)
    setDeleting(false)
    } catch {
      toast({ title: "Failed to delete account", variant: "destructive" })
      setDeleting(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    setRevoking(true)
    try {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to revoke session")
      setSessions(sessions.filter((s) => s.id !== sessionId))
      toast({ title: "Session revoked", variant: "success" })
    } catch {
      toast({ title: "Failed to revoke session", variant: "destructive" })
    } finally {
      setRevoking(false)
    }
  }

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImporting(true)
    const file = e.target.files?.[0]
    if (!file) {
      setImporting(false)
      return
    }
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.documents && !data.templates && !data.profile) {
        toast({ title: "Invalid export file format", variant: "destructive" })
        setImporting(false)
        return
      }
      const res = await fetch("/api/documents/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Import failed")
      toast({ title: "Data imported successfully", variant: "success" })
    } catch {
      toast({ title: "Failed to import data", variant: "destructive" })
    } finally {
      setImporting(false)
    }
  }

  const handleRevokeAllSessions = async () => {
    if (confirm("Revoke all other sessions? You'll be logged out everywhere except this device.")) {
      setRevoking(true)
      try {
        const res = await fetch("/api/auth/sessions", { method: "DELETE" })
        if (!res.ok) throw new Error("Failed to revoke sessions")
        setSessions(sessions.filter((s) => s.current))
        toast({ title: "All other sessions revoked", variant: "success" })
      } catch {
        toast({ title: "Failed to revoke sessions", variant: "destructive" })
      } finally {
        setRevoking(false)
      }
    }
  }

  return (
    <div className="space-y-6 overflow-y-auto min-h-[calc(100vh-200px)]">
      <DashboardHeader
        title="Settings"
        description="Manage your account, security, and preferences"
      />

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-input pb-2" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            className={`flex items-center gap-2 -mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-muted-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Manage your personal information and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center text-3xl font-medium">
                  {profile.fullName.charAt(0)}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90">
                  <Upload className="h-4 w-4" />
                  <input type="file" accept="image/*" className="sr-only" />
                </label>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium">{profile.fullName}</h3>
                <p className="text-muted-foreground">{profile.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Full Name</label>
                <Input
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Email changes require verification</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium">Bio</label>
                <Input
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Timezone</label>
                <Select value={profile.timezone} onValueChange={(v) => setProfile({ ...profile, timezone: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Language</label>
                <Select value={profile.language} onValueChange={(v) => setProfile({ ...profile, language: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                    <CardDescription>Add an extra layer of security to your account</CardDescription>
                  </div>
                </div>
                <Badge variant={mfaEnabled ? "default" : "secondary"}>
                  {mfaEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {!mfaEnabled ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Two-factor authentication is not enabled</p>
                      <p className="text-sm text-yellow-700 mt-1">Enable 2FA to add an extra layer of security to your account</p>
                    </div>
                  </div>
                  <Button onClick={() => window.location.href = "/auth/mfa/setup"}>
                    <Shield className="h-4 w-4 mr-2" />
                    Enable Two-Factor Authentication
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">Two-factor authentication is enabled</p>
                      <p className="text-sm text-green-700 mt-1">Your account is protected with an additional verification step</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => window.location.href = "/auth/mfa/setup"}>
                      <Key className="h-4 w-4 mr-2" />
                      View Backup Codes
                    </Button>
                    <Button variant="destructive" onClick={() => window.location.href = "/auth/mfa/disable"}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Disable 2FA
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Active Sessions
                </CardTitle>
                <CardDescription>Manage devices logged into your account</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleRevokeAllSessions} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Revoke All Other
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 rounded-lg border bg-background">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{session.device}</p>
                        <p className="text-sm text-muted-foreground">{session.location}</p>
                      </div>
                      {session.current && <Badge variant="secondary" className="text-xs">Current</Badge>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Last active: {session.lastActive}</span>
                      {!session.current && (
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRevokeSession(session.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Current Password</label>
                  <Input
                    type="password"
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">New Password</label>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Confirm New Password</label>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>
                <Button type="submit" disabled={passwordChanging}>
                  <Lock className="h-4 w-4 mr-2" />
                  {passwordChanging ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose how you want to be notified about activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {[
              { key: "email", label: "Email Notifications", icon: Mail },
              { key: "push", label: "Push Notifications", icon: Bell },
              { key: "in_app", label: "In-App Notifications", icon: Eye },
            ].map((section) => (
              <div key={section.key} className="space-y-4">
                <h4 className="flex items-center gap-2 font-medium">
                  <section.icon className="h-5 w-5" />
                  {section.label}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(notifSettings[section.key as keyof typeof notifSettings]).map(([key, enabled]) => (
                    <label key={key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                      <span className="text-sm capitalize">{key.replace("_", " ")}</span>
                      <Switch
                        checked={enabled as boolean}
                        onChange={(checked) => {
                          setNotifSettings((prev) => ({
                            ...prev,
                            [section.key]: { ...prev[section.key as keyof typeof notifSettings], [key]: checked },
                          }))
                          handleSaveNotificationPreferences()
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Appearance Tab */}
      {activeTab === "appearance" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme
              </CardTitle>
              <CardDescription>Choose your preferred color scheme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: "light", label: "Light", icon: Sun, desc: "Always use light mode" },
                  { value: "dark", label: "Dark", icon: Moon, desc: "Always use dark mode" },
                  { value: "system", label: "System", icon: Globe, desc: "Match system preference" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      theme === option.value
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <option.icon className={`h-5 w-5 ${theme === option.value ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Density
              </CardTitle>
              <CardDescription>Adjust the spacing and size of UI elements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "comfortable", label: "Comfortable", desc: "Default spacing" },
                  { value: "compact", label: "Compact", desc: "Tighter spacing for more content" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDensity(option.value as "comfortable" | "compact")}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      density === option.value
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/50"
                    }`}
                  >
                    <span className="font-medium">{option.label}</span>
                    <p className="text-sm text-muted-foreground mt-1">{option.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data & Privacy Tab */}
      {activeTab === "data" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Data
              </CardTitle>
              <CardDescription>Download a copy of your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Export All Data</p>
                  <p className="text-sm text-muted-foreground">Download a JSON file with all your documents, templates, and settings</p>
                </div>
                <Button onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Export Documents</p>
                  <p className="text-sm text-muted-foreground">Download your documents as a ZIP archive</p>
                </div>
                <Button variant="outline" onClick={handleExportDocuments}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Documents
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Data
              </CardTitle>
              <CardDescription>Import data from a previous export</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border-2 border-dashed rounded-lg text-center">
                <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Drag and drop a JSON export file here, or click to browse</p>
                <Input type="file" accept=".json" className="max-w-xs mx-auto mt-3" onChange={handleImportData} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Danger Zone Tab */}
      {activeTab === "danger" && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions that permanently affect your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-destructive">Delete Account</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? "translate-x-6" : "translate-x-1"
      }`} />
    </button>
  )
}