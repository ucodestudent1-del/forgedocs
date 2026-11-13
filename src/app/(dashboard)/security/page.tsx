import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, CheckCircle, XCircle, Key, AlertTriangle, Smartphone } from "lucide-react"
import Link from "next/link"
import { SessionList } from "@/components/security/SessionList"

export default function SecurityPage() {
  // TEMPORARILY DISABLED: Auth check removed for development
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security</h1>
        <p className="text-muted-foreground">Manage your account security settings</p>
      </div>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </div>
            </div>
            <Badge variant="secondary">
              Disabled (Demo)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Two-factor authentication is not enabled</p>
                  <p className="text-sm text-amber-700">Enable 2FA to add an extra layer of security to your account</p>
                </div>
              </div>
            </div>
            <Link href="/auth/mfa/setup">
              <Button>
                <Shield className="h-4 w-4 mr-2" />
                Enable Two-Factor Authentication
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <SessionList userId="demo-user" />

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RecommendationItem
            icon={<Shield className="h-5 w-5" />}
            title="Enable Two-Factor Authentication"
            description="Add an extra layer of security beyond your password"
            status="pending"
          />
          <RecommendationItem
            icon={<Key className="h-5 w-5" />}
            title="Use a Strong, Unique Password"
            description="Ensure your password is at least 12 characters with mixed case, numbers, and symbols"
            status="done"
          />
          <RecommendationItem
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Save Backup Codes Securely"
            description="Store your 2FA backup codes in a password manager or secure location"
            status="pending"
          />
          <RecommendationItem
            icon={<Smartphone className="h-5 w-5" />}
            title="Review Active Sessions Regularly"
            description="Check for unrecognized devices and revoke access if needed"
            status="pending"
          />
        </CardContent>
      </Card>
    </div>
  )
}

function RecommendationItem({ icon, title, description, status }: { icon: React.ReactNode; title: string; description: string; status: "done" | "pending" }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${status === "done" ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
        {status === "done" ? <CheckCircle className="h-4 w-4" /> : icon}
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Badge variant={status === "done" ? "default" : "secondary"}>
        {status === "done" ? "Complete" : "Recommended"}
      </Badge>
    </div>
  )
}