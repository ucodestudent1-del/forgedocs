"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

interface FaqItemProps {
  index: number
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

export function FaqItem({ index, question, answer, isOpen, onToggle }: FaqItemProps) {
  const buttonId = `faq-button-${index}`
  const panelId = `faq-panel-${index}`

  return (
    <div className="rounded-xl border border-input bg-background">
      <button
        onClick={onToggle}
        id={buttonId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full p-6 border-b border-input flex justify-between items-center text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <h3 className="text-lg font-medium text-foreground pr-4">{question}</h3>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <div
        id={panelId}
        className={`${isOpen ? "block" : "hidden"} p-6 text-sm text-muted-foreground animate-in slide-in-from-top-2 duration-200`}
      >
        {answer}
      </div>
    </div>
  )
}

interface ClientFaqSectionProps {
  faqs: Array<{ index: number; question: string; answer: string }>
}

export function ClientFaqSection({ faqs }: ClientFaqSectionProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="max-w-2xl mx-auto space-y-4" aria-label="Frequently asked questions">
      {faqs.map((faq) => (
        <FaqItem
          key={faq.index}
          index={faq.index}
          question={faq.question}
          answer={faq.answer}
          isOpen={openFaq === faq.index}
          onToggle={() => setOpenFaq(openFaq === faq.index ? null : faq.index)}
        />
      ))}
    </div>
  )
}
