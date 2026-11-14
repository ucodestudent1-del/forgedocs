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
}

function TextField({ label, placeholder, type, name, value, onChange, required }: TextFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type || "text"} name={name} placeholder={placeholder} value={value} onChange={onChange} required={required} className="w-full" />
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
}

function TextAreaField({ label, placeholder, rows, name, value, onChange, required }: TextAreaFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} placeholder={placeholder} rows={rows} value={value} onChange={onChange} required={required} className="w-full" />
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
  const { toast } = useToast()

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { fullName, email, company, subject, message } = formData

    if (!email || !message) {
      toast({ title: "Please fill in required fields", variant: "destructive" })
      return
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, company, subject, message }),
      })
      if (!res.ok) throw new Error("Failed to send message")
      toast({ title: "Message sent successfully", variant: "success" })
      setFormData({ fullName: "", email: "", company: "", subject: "", message: "" })
    } catch {
      toast({ title: "Failed to send message. Please try again.", variant: "destructive" })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label="Full name"
          placeholder="Jane Doe"
          name="fullName"
          value={formData.fullName}
          onChange={(e) => handleChange("fullName", e.target.value)}
        />
        <TextField
          label="Work email"
          placeholder="jane@company.com"
          type="email"
          name="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          required
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
      />
      <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors">
        Send message
      </button>
    </form>
  )
}
