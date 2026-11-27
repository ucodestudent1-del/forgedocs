import { TEMPLATE_LIBRARY, getTemplateById } from '@/lib/templateLibrary';
import type { TemplateData, RenderOptions, TemplateRenderer, SectionRenderer } from './types';
import { BaseSectionRenderer } from './base-renderer';
import { PdfExporter } from './pdf-exporter';
import {
  PartiesSectionRenderer,
  ScopeSectionRenderer,
  TermSectionRenderer,
  CompensationSectionRenderer,
  ConfidentialitySectionRenderer,
  LiabilitySectionRenderer,
  GoverningLawSectionRenderer,
  SignaturesSectionRenderer,
  HeaderSectionRenderer,
  BillToSectionRenderer,
  BillFromSectionRenderer,
  LineItemsSectionRenderer,
  TotalsSectionRenderer,
  PaymentTermsSectionRenderer,
  CoverSectionRenderer,
  ExecutiveSummarySectionRenderer,
  ClientNeedsSectionRenderer,
  SolutionSectionRenderer,
  PricingSectionRenderer,
  CaseStudiesSectionRenderer,
  NextStepsSectionRenderer,
  TableOfContentsSectionRenderer,
  IntroductionSectionRenderer,
  FindingsSectionRenderer,
  AnalysisSectionRenderer,
  RecommendationsSectionRenderer,
  AppendicesSectionRenderer,
  AttendeesSectionRenderer,
  AgendaItemsSectionRenderer,
  ActionItemsSectionRenderer,
  NextMeetingSectionRenderer,
  MeetingApprovalSectionRenderer,
  DefaultSectionRenderer,
} from './section-renderers';

/**
 * Document Generator Engine
 * Generates documents from templates with populated fields
 *
 * Uses the Strategy pattern: section rendering is delegated to
 * individual SectionRenderer implementations rather than a monolithic
 * switch statement. This improves maintainability and testability.
 */
export class DocumentGenerator implements TemplateRenderer {
  private template: any;
  private data: TemplateData;
  private options: RenderOptions;
  private compiledPatterns: Array<{ regex: RegExp; key: string; value: string }> = [];
  private renderers: SectionRenderer[];

  constructor(templateId: string, data: TemplateData, options: RenderOptions = {}) {
    this.template = getTemplateById(templateId);
    if (!this.template) {
      throw new Error(`Template ${templateId} not found`);
    }
    this.data = data;
    this.options = {
      includeHeader: true,
      includeFooter: true,
      pageSize: 'Letter',
      orientation: 'portrait',
      ...options,
    };
    this.compilePatterns();
    this.renderers = this.buildRenderers();
  }

  /**
   * Build the list of section renderers in priority order.
   * More specific renderers should come before general ones.
   */
  private buildRenderers(): SectionRenderer[] {
    return [
      new PartiesSectionRenderer(),
      new ScopeSectionRenderer(),
      new TermSectionRenderer(),
      new CompensationSectionRenderer(),
      new ConfidentialitySectionRenderer(),
      new LiabilitySectionRenderer(),
      new GoverningLawSectionRenderer(),
      new SignaturesSectionRenderer(),
      new HeaderSectionRenderer(),
      new BillToSectionRenderer(),
      new BillFromSectionRenderer(),
      new LineItemsSectionRenderer(),
      new TotalsSectionRenderer(),
      new PaymentTermsSectionRenderer(),
      new CoverSectionRenderer(this.template),
      new ExecutiveSummarySectionRenderer(),
      new ClientNeedsSectionRenderer(),
      new SolutionSectionRenderer(),
      new PricingSectionRenderer(),
      new CaseStudiesSectionRenderer(),
      new NextStepsSectionRenderer(),
      new TableOfContentsSectionRenderer(this.template),
      new IntroductionSectionRenderer(),
      new FindingsSectionRenderer(),
      new AnalysisSectionRenderer(),
      new RecommendationsSectionRenderer(),
      new AppendicesSectionRenderer(),
      new AttendeesSectionRenderer(),
      new AgendaItemsSectionRenderer(),
      new ActionItemsSectionRenderer(),
      new NextMeetingSectionRenderer(),
      new MeetingApprovalSectionRenderer(),
      new DefaultSectionRenderer(),
    ];
  }

  /**
   * Pre-compile placeholder regex patterns once so replacePlaceholders
   * avoids constructing a new RegExp per key on every render.
   */
  private compilePatterns(): void {
    this.compiledPatterns = Object.entries(this.data).map(([key, value]) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return {
        regex: new RegExp(`\\[${escapedKey}\\]`, 'g'),
        key,
        value: this.escapeHtml(String(value)),
      };
    });
  }

  /**
   * Escape HTML special characters to prevent XSS in generated documents
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Replace placeholder fields with actual values
   */
  private replacePlaceholders(text: string): string {
    let result = text;
    for (const { regex, value } of this.compiledPatterns) {
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * Find the appropriate renderer for a section
   */
  private findRenderer(sectionId: string): SectionRenderer {
    return this.renderers.find((r) => r.canRender(sectionId)) ?? this.renderers[this.renderers.length - 1];
  }

  /**
   * Generate HTML from template
   */
  public generateHTML(): string {
    const template = this.template;
    const styling = template.styling || {};

    const css = `
      <style>
        body { font-family: '${styling.font || 'Arial'}', serif; font-size: ${styling.body_size || 11}pt; line-height: ${styling.line_spacing || 1.3}; margin: 1in; color: #333; }
        h1 { font-size: ${styling.heading_size || 14}pt; font-weight: bold; margin-bottom: 0.5in; color: #1a1a1a; }
        h2 { font-size: ${styling.heading_size - 2 || 12}pt; font-weight: bold; margin-top: 0.3in; margin-bottom: 0.2in; color: #2a2a2a; }
        table { width: 100%; border-collapse: collapse; margin: 0.25in 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .signature-line { border-top: 1px solid #000; width: 200px; margin-top: 40px; padding-top: 5px; font-size: 10pt; }
        .page-break { page-break-before: always; }
        .text-muted { color: #666; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
      </style>
    `;

    let html = `<html><head><meta charset="utf-8">${css}</head><body>`;

    // Generate each section using the strategy pattern
    template.sections.forEach((section: any) => {
      const renderer = this.findRenderer(section.id);
      html += renderer.render(section, this.data);
    });

    html += `</body></html>`;
    return this.replacePlaceholders(html);
  }

  /**
   * Render all sections (implements TemplateRenderer interface)
   */
  public renderSections(sections: any[], data: TemplateData): string {
    let html = '';
    sections.forEach((section) => {
      const renderer = this.findRenderer(section.id);
      html += renderer.render(section, data);
    });
    return html;
  }

  /**
   * Export as PDF using pdf-lib
   */
  public async exportToPDF(): Promise<Blob> {
    const html = this.generateHTML();
    const exporter = new PdfExporter();
    return exporter.export(html);
  }

  /**
   * Get template metadata
   */
  public getTemplateInfo() {
    return {
      id: this.template.id,
      name: this.template.name,
      category: this.template.category,
      description: this.template.description,
      fields: this.template.fields,
      styling: this.template.styling,
    };
  }
}

export { TEMPLATE_LIBRARY, getTemplateById };
