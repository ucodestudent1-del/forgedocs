import { TEMPLATE_LIBRARY, getTemplateById, getAllTemplates } from '@/lib/templateLibrary'

describe('Template Library', () => {
  describe('TEMPLATE_LIBRARY', () => {
    it('should contain all expected templates', () => {
      const expectedTemplates = [
        'professional_service_agreement',
        'nondisclosure_agreement',
        'commercial_invoice',
        'business_proposal',
        'formal_report',
        'meeting_minutes',
        'employment_offer_letter'
      ]

      expectedTemplates.forEach(id => {
        expect(TEMPLATE_LIBRARY[id]).toBeDefined()
      })
    })

    it('each template should have required properties', () => {
      Object.values(TEMPLATE_LIBRARY).forEach(template => {
        expect(template).toHaveProperty('id')
        expect(template).toHaveProperty('name')
        expect(template).toHaveProperty('category')
        expect(template).toHaveProperty('description')
        expect(template).toHaveProperty('fields')
        expect(template).toHaveProperty('sections')
        expect(template).toHaveProperty('styling')
      })
    })

    it('each field should have required properties', () => {
      Object.values(TEMPLATE_LIBRARY).forEach(template => {
        template.fields.forEach(field => {
          expect(field).toHaveProperty('name')
          expect(field).toHaveProperty('type')
          expect(field).toHaveProperty('label')
          expect(field).toHaveProperty('required')
        })
      })
    })

    it('sections should have required properties', () => {
      Object.values(TEMPLATE_LIBRARY).forEach(template => {
        template.sections.forEach(section => {
          expect(section).toHaveProperty('id')
          expect(section).toHaveProperty('label')
          expect(section).toHaveProperty('required')
        })
      })
    })
  })

  describe('getTemplateById', () => {
    it('should return template by valid id', () => {
      const template = getTemplateById('professional_service_agreement')
      expect(template).toBeDefined()
      expect(template.id).toBe('professional_service_agreement')
    })

    it('should return undefined for invalid id', () => {
      const template = getTemplateById('invalid_template')
      expect(template).toBeUndefined()
    })
  })

  describe('getAllTemplates', () => {
    it('should return all templates as array', () => {
      const templates = getAllTemplates()
      expect(Array.isArray(templates)).toBe(true)
      expect(templates.length).toBe(7)
    })
  })
})