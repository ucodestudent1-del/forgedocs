import { DocumentGenerator } from '@/lib/documentGenerator'
import { TEMPLATE_LIBRARY } from '@/lib/templateLibrary'

describe('DocumentGenerator', () => {
  const templateId = 'professional_service_agreement'
  const templateData = {
    client_name: 'Acme Corp',
    client_address: '123 Business Ave, City, ST 12345',
    provider_name: 'ForgeDocs Inc',
    provider_address: '456 Tech Blvd, City, ST 67890',
    effective_date: '2024-01-15',
    agreement_number: 'PSA-2024-001',
    hourly_rate: '150.00',
    total_fee: '5000.00',
    payment_due_date: '2024-02-15',
    governing_state: 'California',
    scope_of_services: 'Software development services including API development and documentation.'
  }

  describe('DocumentGenerator', () => {
    let generator: DocumentGenerator

    beforeEach(() => {
      generator = new DocumentGenerator('professional_service_agreement', templateData)
    })

    it('should create generator instance', () => {
      expect(generator).toBeDefined()
      expect(generator.getTemplateInfo()).toBeDefined()
      expect(generator.getTemplateInfo().id).toBe('professional_service_agreement')
    })

    it('should generate HTML with replaced placeholders', () => {
      const html = generator.generateHTML()
      expect(html).toContain('Acme Corp')
      expect(html).toContain('ForgeDocs Inc')
      expect(html).toContain('2024-01-15')
      expect(html).toContain('PSA-2024-001')
      expect(html).toContain('Software development services')
    })

    it('should include template styling in HTML', () => {
      const html = generator.generateHTML()
      expect(html).toContain('Times New Roman')
      expect(html).toContain('14pt')
    })

    it('should include all template sections', () => {
      const html = generator.generateHTML()
      expect(html).toContain('Parties')
      expect(html).toContain('Scope of Services')
      expect(html).toContain('Term & Termination')
      expect(html).toContain('Compensation')
      expect(html).toContain('Confidentiality')
      expect(html).toContain('Liability & Indemnification')
      expect(html).toContain('Governing Law')
      expect(html).toContain('Signature Block')
    })

    it('should include signature block with both parties', () => {
      const html = generator.generateHTML()
      expect(html).toContain('Signature:')
      expect(html).toContain('Signatory Name')
      expect(html).toContain('Signatory Title')
    })
  })

  describe('exportToPDF', () => {
    it('should export as blob', async () => {
      const generator = new DocumentGenerator('professional_service_agreement', templateData)
      const blob = await generator.exportToPDF()
      expect(blob).toBeInstanceOf(Blob)
    })
  })
})