import type { SectionRenderer, TemplateData } from './types';

/**
 * Base section renderer providing shared utilities.
 * Individual section renderers extend this to render specific section types.
 */
export class BaseSectionRenderer implements SectionRenderer {
  protected data: TemplateData;

  constructor(data: TemplateData = {}) {
    this.data = data;
  }

  canRender(sectionId: string): boolean {
    return false;
  }

  render(section: any, data: TemplateData): string {
    this.data = data;
    const sectionId = section.id;
    const sectionLabel = section.label || section.id;
    const isRequired = section.required ? '' : ' (optional)';

    return `<h2>${sectionLabel}${isRequired ? '' : ' (optional)'}</h2>`;
  }

  protected escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  protected renderTextSection(fieldName: string, label?: string): string {
    const value = this.data[fieldName] || `[${fieldName}]`;
    const labelText = label || `${fieldName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}:`;
    return `<p><strong>${labelText}</strong><br>${this.escapeHtml(String(value))}</p>`;
  }
}
