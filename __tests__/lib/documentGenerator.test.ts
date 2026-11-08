import { DocumentGenerator } from '@/lib/documentGenerator'
import { TEMPLATE_LIBRARY } from '@/lib/templateLibrary'

describe('DocumentGenerator', () => {
  const templateId = 'professional_service_agreement'
  // Provide data matching what documentGenerator expects (not template fields)
  const templateData = {
    disclosing_party_name: 'Acme Corp',
    disclosing_party_address: '123 Business Ave, City, ST 12345',
    receiving_party_name: 'ForgeDocs Inc',
    receiving_party_address: '456 Tech Blvd, City, ST 67890',
    effective_date: '2024-01-15',
    agreement_number: 'PSA-2024-001',
    total_fee: '5000.00',
    payment_due_date: '2024-02-15',
    governing_state: 'California',
    scope_of_services: 'Software development services including API development and documentation.',
    signatory_name_1: 'John Doe',
    signatory_title_1: 'CEO',
    signatory_name_2: 'Jane Smith',
    signatory_title_2: 'CTO',
    term_details: 'Standard terms apply',
    confidentiality_details: 'Standard confidentiality',
    liability_details: 'Standard liability',
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
      expect(html).toContain('Software development services')
      expect(html).toContain('5000.00')
      expect(html).toContain('2024-02-15')
      expect(html).toContain('California')
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
      expect(html).toContain('John Doe')
      expect(html).toContain('CEO')
      expect(html).toContain('Jane Smith')
      expect(html).toContain('CTO')
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