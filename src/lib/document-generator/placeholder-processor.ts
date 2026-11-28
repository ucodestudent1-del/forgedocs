import type { TemplateData } from './types';

export interface CompiledPattern {
  regex: RegExp
  key: string
  value: string
}

export class PlaceholderProcessor {
  private compiledPatterns: CompiledPattern[] = []

  compile(data: TemplateData): CompiledPattern[] {
    this.compiledPatterns = Object.entries(data).map(([key, value]) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return {
        regex: new RegExp(`\\[${escapedKey}\\]`, 'g'),
        key,
        value: this.escapeHtml(String(value)),
      }
    })
    return this.compiledPatterns
  }

  replace(text: string): string {
    let result = text
    for (const { regex, value } of this.compiledPatterns) {
      result = result.replace(regex, value)
    }
    return result
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;')
  }
}