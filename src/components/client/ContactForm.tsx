"use client"

import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface TextFieldProps {
  label: string
  placeholder: string
  type?: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  error?: string
}

function TextField({ label, placeholder, type, name, value, onChange, required, error }: TextFieldProps) {
  const fieldId = `contact-${name}`
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className={`text-sm font-medium ${error ? "text-destructive" : "text-foreground"}`}>
        {label}
        {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
      </Label>
      {error && <p id={`${fieldId}-error`} className="text-xs text-destructive" role="alert">{error}</p>}
      <Input
        id={fieldId}
        type={type || "text"}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full"
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
      />
    </div>
  )
}

interface TextAreaFieldProps {
  label: string
  placeholder: string
  rows: number
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  required?: boolean
  error?: string
}

function TextAreaField({ label, placeholder, rows, name, value, onChange, required, error }: TextAreaFieldProps) {
  const fieldId = `contact-${name}`
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className={`text-sm font-medium ${error ? "text-destructive" : "text-foreground"}`}>
        {label}
        {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
      </Label>
      {error && <p id={`${fieldId}-error`} className="text-xs text-destructive" role="alert">{error}</p>}
      <Textarea
        id={fieldId}
        name={name}
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full"
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
      />
    </div>
  )
}

export function ClientContactForm() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const { toast } = useToast()

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => { const next = { ...prev }; delete next[name]; return next })
    }
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!formData.fullName.trim()) next.fullName = "Full name is required"
    if (!formData.email.trim()) next.email = "Email address is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) next.email = "Please enter a valid email address"
    if (!formData.message.trim()) next.message = "Message is required"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setSubmitStatus("idle")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error("Failed to send message")
      setSubmitStatus("success")
      toast({ title: "Message sent successfully", variant: "success" })
      setFormData({ fullName: "", email: "", company: "", subject: "", message: "" })
    } catch {
      setSubmitStatus("error")
      toast({ title: "Failed to send message. Please try again.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label="Full name"
          placeholder="Jane Doe"
          name="fullName"
          value={formData.fullName}
          onChange={(e) => handleChange("fullName", e.target.value)}
          required
          error={errors.fullName}
        />
        <TextField
          label="Work email"
          placeholder="jane@company.com"
          type="email"
          name="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          required
          error={errors.email}
        />
      </div>
      <TextField label="Company" placeholder="Acme Corporation" name="company" value={formData.company} onChange={(e) => handleChange("company", e.target.value)} />
      <TextField label="Subject" placeholder="How can we help?" name="subject" value={formData.subject} onChange={(e) => handleChange("subject", e.target.value)} />
      <TextAreaField
        label="Message"
        placeholder="Tell us about your needs..."
        rows={5}
        name="message"
        value={formData.message}
        onChange={(e) => handleChange("message", e.target.value)}
        required
        error={errors.message}
      />
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-busy={submitting}
      >
        {submitting ? "Sending..." : "Send message"}
      </button>
      {submitStatus === "success" && (
        <div className="p-3 rounded-lg bg-success/10 text-success-foreground border border-success/20" role="status" aria-live="polite">
          Your message has been sent successfully. We'll get back to you soon.
        </div>
      )}
      {submitStatus === "error" && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20" role="alert" aria-live="assertive">
          Failed to send message. Please try again.
        </div>
      )}
    </form>
  )
}
