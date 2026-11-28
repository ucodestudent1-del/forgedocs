import { DocumentRenderer } from './document-renderer';
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
 * This is a facade over the new modular DocumentRenderer.
 * It maintains backward compatibility with the old API.
 */
export class DocumentGenerator implements TemplateRenderer {
  private renderer: DocumentRenderer
  private templateId: string
  private data: TemplateData
  private options: RenderOptions

  constructor(templateId: string, data: TemplateData, options: RenderOptions = {}) {
    this.templateId = templateId
    this.data = data
    this.options = {
      includeHeader: true,
      includeFooter: true,
      pageSize: 'Letter',
      orientation: 'portrait',
      ...options,
    }
    this.renderer = new DocumentRenderer()
  }

  public async generateHTML(): Promise<string> {
    return this.renderer.renderToHtml(this.templateId, this.data, this.options)
  }

  public renderSections(sections: any[], data: TemplateData): string {
    return this.renderer.renderSections(sections, data)
  }

  public async exportToPDF(): Promise<Blob> {
    return this.renderer.renderToPdf(this.templateId, this.data, this.options)
  }

  public getTemplateInfo() {
    return this.renderer.getTemplateInfo(this.templateId)
  }
}

export { TEMPLATE_LIBRARY, getTemplateById };
export { DocumentRenderer } from './document-renderer';
export { TemplateLoader } from './template-loader';
export { PlaceholderProcessor } from './placeholder-processor';
export { SectionRendererRegistry } from './section-renderer-registry';