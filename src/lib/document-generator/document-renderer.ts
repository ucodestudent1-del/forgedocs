import { TemplateLoader } from './template-loader'
import { PlaceholderProcessor } from './placeholder-processor'
import { SectionRendererRegistry } from './section-renderer-registry'
import { PdfExporter } from './pdf-exporter'
import type { TemplateData, RenderOptions, SectionRenderer } from './types'
import type { Template } from '@/lib/templateLibrary'
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
} from './section-renderers'

export class DocumentRenderer {
  private loader: TemplateLoader
  private processor: PlaceholderProcessor
  private registry: SectionRendererRegistry
  private exporter: PdfExporter

  constructor() {
    this.loader = new TemplateLoader()
    this.processor = new PlaceholderProcessor()
    this.registry = new SectionRendererRegistry()
    this.exporter = new PdfExporter()
    this.registerDefaultRenderers()
  }

  private registerDefaultRenderers(): void {
    this.registry.register('parties', new PartiesSectionRenderer())
    this.registry.register('scope', new ScopeSectionRenderer())
    this.registry.register('term', new TermSectionRenderer())
    this.registry.register('compensation', new CompensationSectionRenderer())
    this.registry.register('confidentiality', new ConfidentialitySectionRenderer())
    this.registry.register('liability', new LiabilitySectionRenderer())
    this.registry.register('governing_law', new GoverningLawSectionRenderer())
    this.registry.register('signatures', new SignaturesSectionRenderer())
    this.registry.register('header', new HeaderSectionRenderer())
    this.registry.register('bill_to', new BillToSectionRenderer())
    this.registry.register('bill_from', new BillFromSectionRenderer())
    this.registry.register('line_items', new LineItemsSectionRenderer())
    this.registry.register('totals', new TotalsSectionRenderer())
    this.registry.register('payment_terms', new PaymentTermsSectionRenderer())
    this.registry.register('cover', new CoverSectionRenderer())
    this.registry.register('executive_summary', new ExecutiveSummarySectionRenderer())
    this.registry.register('client_needs', new ClientNeedsSectionRenderer())
    this.registry.register('solution', new SolutionSectionRenderer())
    this.registry.register('pricing', new PricingSectionRenderer())
    this.registry.register('case_studies', new CaseStudiesSectionRenderer())
    this.registry.register('next_steps', new NextStepsSectionRenderer())
    this.registry.register('toc', new TableOfContentsSectionRenderer())
    this.registry.register('introduction', new IntroductionSectionRenderer())
    this.registry.register('findings', new FindingsSectionRenderer())
    this.registry.register('analysis', new AnalysisSectionRenderer())
    this.registry.register('recommendations', new RecommendationsSectionRenderer())
    this.registry.register('appendices', new AppendicesSectionRenderer())
    this.registry.register('attendees', new AttendeesSectionRenderer())
    this.registry.register('agenda_items', new AgendaItemsSectionRenderer())
    this.registry.register('action_items', new ActionItemsSectionRenderer())
    this.registry.register('next_meeting', new NextMeetingSectionRenderer())
    this.registry.register('approval', new MeetingApprovalSectionRenderer())
    this.registry.setDefault(new DefaultSectionRenderer())
  }

  async renderToHtml(templateId: string, data: TemplateData, options: RenderOptions = {}): Promise<string> {
    const template = this.loader.load(templateId)
    this.processor.compile(data)
    
    // Pass template to TOC renderer
    const tocRenderer = this.registry.findRenderer('toc') as any
    if (tocRenderer && typeof tocRenderer.setTemplate === 'function') {
      tocRenderer.setTemplate(template)
    }
    
    const styling = template.styling || {}
    const css = this.generateCss(styling)

    const chunks: string[] = []
    chunks.push(`<html><head><meta charset="utf-8">${css}</head><body>`)

    template.sections.forEach((section: any) => {
      const renderer = this.registry.findRenderer(section.id)
      chunks.push(renderer.render(section, data))
    })

    chunks.push(`</body></html>`)
    const html = chunks.join('')
    return this.processor.replace(html)
  }

  async renderToPdf(templateId: string, data: TemplateData, options: RenderOptions = {}): Promise<Blob> {
    const html = await this.renderToHtml(templateId, data, options)
    return this.exporter.export(html)
  }

  getTemplateInfo(templateId: string) {
    const template = this.loader.load(templateId)
    return {
      id: template.id,
      name: template.name,
      category: template.category,
      description: template.description,
      fields: template.fields,
      styling: template.styling,
    }
  }

  public renderSections(sections: any[], data: TemplateData): string {
    this.processor.compile(data)
    
    const chunks: string[] = []
    sections.forEach((section: any) => {
      const renderer = this.registry.findRenderer(section.id)
      chunks.push(renderer.render(section, data))
    })
    
    return this.processor.replace(chunks.join(''))
  }

  private generateCss(styling: Record<string, unknown>): string {
    const font = (styling.font as string) || 'Arial'
    const bodySize = (styling.body_size as number) || 11
    const headingSize = (styling.heading_size as number) || 14
    const lineSpacing = (styling.line_spacing as number) || 1.3

    return `
      <style>
        body { font-family: '${font}', serif; font-size: ${bodySize}pt; line-height: ${lineSpacing}; margin: 1in; color: #333; }
        h1 { font-size: ${headingSize}pt; font-weight: bold; margin-bottom: 0.5in; color: #1a1a1a; }
        h2 { font-size: ${headingSize - 2}pt; font-weight: bold; margin-top: 0.3in; margin-bottom: 0.2in; color: #2a2a2a; }
        table { width: 100%; border-collapse: collapse; margin: 0.25in 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .signature-line { border-top: 1px solid #000; width: 200px; margin-top: 40px; padding-top: 5px; font-size: 10pt; }
        .page-break { page-break-before: always; }
        .text-muted { color: #666; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
      </style>
    `
  }
}