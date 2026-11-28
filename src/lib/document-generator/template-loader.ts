import { getTemplateById } from '@/lib/templateLibrary';
import type { Template } from '@/lib/templateLibrary';

export class TemplateLoader {
  load(templateId: string): Template {
    const template = getTemplateById(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }
    return template
  }

  validate(template: Template): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!template.id) errors.push('Template missing id')
    if (!template.name) errors.push('Template missing name')
    if (!template.sections || template.sections.length === 0) {
      errors.push('Template must have at least one section')
    }
    if (!template.fields || !Array.isArray(template.fields)) {
      errors.push('Template fields must be an array')
    }
    
    return { valid: errors.length === 0, errors }
  }
}