/**
 * Document Generator Engine
 * Generates documents from templates with populated fields
 */

import { TEMPLATE_LIBRARY, getTemplateById } from './templateLibrary';

interface TemplateData {
  [key: string]: string | number | boolean;
}

interface RenderOptions {
  includeHeader?: boolean;
  includeFooter?: boolean;
  pageSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export class DocumentGenerator {
  private template: any;
  private data: TemplateData;
  private options: RenderOptions;

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
      ...options
    };
  }

  /**
   * Replace placeholder fields with actual values
   */
  private replacePlaceholders(text: string): string {
    let result = text;
    Object.entries(this.data).forEach(([key, value]) => {
      const pattern = new RegExp(`\\[${key}\\]`, 'g');
      result = result.replace(pattern, String(value));
    });
    return result;
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

    // Generate each section
    template.sections.forEach((section: any) => {
      html += this.renderSection(section);
    });

    html += `</body></html>`;
    return this.replacePlaceholders(html);
  }

  /**
   * Render a template section
   */
  private renderSection(section: any): string {
    const sectionId = section.id;
    const sectionLabel = section.label || section.id;
    const isRequired = section.required ? '' : ' (optional)';

    let html = `<h2>${sectionLabel}${isRequired ? '' : ' (optional)'}</h2>`;

    switch (sectionId) {
      case 'parties':
        html += this.renderPartiesSection();
        break;
      case 'scope':
        html += this.renderTextSection('scope_of_services');
        break;
      case 'term':
        html += this.renderTextSection('term_details', 'Term & Termination Details');
        break;
      case 'compensation':
        html += this.renderTextSection('total_fee', 'Total Fee:') + 
                  this.renderTextSection('payment_due_date', 'Payment Due:');
        break;
      case 'confidentiality':
        html += this.renderTextSection('confidentiality_details', 'Confidentiality Details');
        break;
      case 'liability':
        html += this.renderTextSection('liability_details', 'Liability Details');
        break;
      case 'governing_law':
        html += this.renderTextSection('governing_state', 'Governing State:');
        break;
      case 'signatures':
        html += this.renderSignatureBlock();
        break;
      case 'header':
        html += this.renderHeaderSection();
        break;
      case 'bill_to':
        html += this.renderBillToSection();
        break;
      case 'bill_from':
        html += this.renderBillFromSection();
        break;
      case 'line_items':
        html += this.renderLineItemsSection();
        break;
      case 'totals':
        html += this.renderTotalsSection();
        break;
      case 'payment_terms':
        html += this.renderTextSection('payment_method', 'Payment Method:') + 
                  this.renderTextSection('bank_details', 'Bank Details:');
        break;
      case 'cover':
        html += this.renderCoverSection();
        break;
      case 'executive_summary':
        html += this.renderTextSection('executive_summary');
        break;
      case 'client_needs':
        html += this.renderTextSection('client_challenge_1', 'Challenge #1:') +
                this.renderTextSection('client_challenge_2', 'Challenge #2:');
        break;
      case 'solution':
        html += this.renderTextSection('proposed_solution');
        break;
      case 'scope':
        html += this.renderTextSection('scope_details', 'Scope Details');
        break;
      case 'pricing':
        html += this.renderTextSection('package_name', 'Package:') +
                this.renderTextSection('package_price', 'Price:');
        break;
      case 'case_studies':
        html += this.renderTextSection('case_study_1', 'Case Study #1:');
        break;
      case 'next_steps':
        html += this.renderTextSection('next_steps_details', 'Next Steps:');
        break;
      case 'cover':
        html += this.renderCoverSection();
        break;
      case 'toc':
        html += this.renderTableOfContents();
        break;
      case 'introduction':
        html += this.renderTextSection('introduction_text', 'Introduction:');
        break;
      case 'findings':
        html += this.renderTextSection('key_finding_1', 'Finding #1:') +
                this.renderTextSection('key_finding_2', 'Finding #2:') +
                this.renderTextSection('key_finding_3', 'Finding #3:');
        break;
      case 'analysis':
        html += this.renderTextSection('analysis_text', 'Analysis:');
        break;
      case 'recommendations':
        html += this.renderTextSection('recommendation_1', 'Recommendation #1:') +
                this.renderTextSection('recommendation_2', 'Recommendation #2:') +
                this.renderTextSection('recommendation_3', 'Recommendation #3:');
        break;
      case 'appendices':
        html += this.renderTextSection('appendix_1', 'Appendix #1:');
        break;
      case 'attendees':
        html += this.renderAttendeesSection();
        break;
      case 'agenda_items':
        html += this.renderAgendaSection();
        break;
      case 'action_items':
        html += this.renderActionItemsSection();
        break;
      case 'next_meeting':
        html += this.renderTextSection('next_meeting_date', 'Next Meeting Date:') +
                this.renderTextSection('next_meeting_time', 'Next Meeting Time:');
        break;
      case 'approval':
        html += this.renderTextSection('prepared_by', 'Prepared By:') +
                this.renderTextSection('approved_by', 'Approved By:');
        break;
      default:
        html += `<p>${sectionLabel} section content would be rendered here.</p>`;
    }

    return html;
  }

  // Section renderers
  private renderPartiesSection(): string {
    return `
      <p><strong>This Agreement is made between:</strong></p>
      <table>
        <tr><td><strong>Disclosing Party:</strong></td><td>${this.data.disclosing_party_name || '[Disclosing Party Name]'}</td></tr>
        <tr><td><strong>Address:</strong></td><td>${this.data.disclosing_party_address || '[Address]'}</td></tr>
        <tr><td><strong>Receiving Party:</strong></td><td>${this.data.receiving_party_name || '[Receiving Party Name]'}</td></tr>
        <tr><td><strong>Address:</strong></td><td>${this.data.receiving_party_address || '[Address]'}</td></tr>
      </table>
    `;
  }

  private renderHeaderSection(): string {
    return `
      <div class="text-center">
        <h1>${this.data.document_title || '[Document Title]'}</h1>
        <p><strong>Date:</strong> ${this.data.invoice_date || this.data.report_date || this.data.proposal_date || '[Date]'}</p>
        <p><strong>Document #:</strong> ${this.data.invoice_number || this.data.agreement_number || '[Document #]'}</p>
      </div>
    `;
  }

  private renderBillToSection(): string {
    return `
      <div>
        <h3>Bill To:</h3>
        <p>${this.data.client_name || '[Client Name]'}</p>
        <p>${this.data.client_address || '[Client Address]'}</p>
      </div>
    `;
  }

  private renderBillFromSection(): string {
    return `
      <div>
        <h3>Bill From:</h3>
        <p>${this.data.company_name || '[Company Name]'}</p>
        <p>${this.data.company_address || '[Company Address]'}</p>
      </div>
    `;
  }

  private renderLineItemsSection(): string {
    return `
      <table>
        <thead>
          <tr><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Line Total</th></tr>
        </thead>
        <tbody>
          <tr><td>${this.data.item_description_1 || '[Item Description]'}</td><td>${this.data.quantity_1 || '1'}</td><td>$${this.data.unit_price_1 || '0.00'}</td><td>$${this.data.line_total_1 || '0.00'}</td></tr>
        </tbody>
      </table>
    `;
  }

  private renderTotalsSection(): string {
    return `
      <table style="float: right; width: 50%;">
        <tr><td><strong>Subtotal:</strong></td><td>$${this.data.subtotal || '0.00'}</td></tr>
        <tr><td><strong>Tax:</strong></td><td>$${this.data.tax_amount || '0.00'}</td></tr>
        <tr><td><strong>Grand Total:</strong></td><td><strong>$${this.data.grand_total || '0.00'}</strong></td></tr>
      </table>
    `;
  }

  private renderCoverSection(): string {
    return `
      <div class="text-center" style="margin-top: 2in;">
        <h1 style="font-size: 24pt;">${this.data.report_title || this.data.proposal_title || '[Document Title]'}</h1>
        <p style="font-size: 16pt; margin-top: 0.5in;">${this.data.report_subtitle || ''}</p>
        <p style="margin-top: 0.5in;"><strong>${this.data.author_name || '[Author Name]'}</strong></p>
        <p>${this.data.report_date || this.data.proposal_date || '[Date]'}</p>
        <p>${this.data.company_name || '[Company Name]'}</p>
      </div>
      <div class="page-break"></div>
    `;
  }

  private renderTableOfContents(): string {
    return `
      <h2>Table of Contents</h2>
      <ul>
        ${template.sections.map((s: any) => `<li>${s.label}</li>`).join('')}
      </ul>
      <div class="page-break"></div>
    `;
  }

  private renderTextSection(fieldName: string, label?: string): string {
    const value = this.data[fieldName] || `[${fieldName}]`;
    const labelText = label || `${fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:`;
    return `<p><strong>${labelText}</strong><br>${value}</p>`;
  }

  private renderAttendeesSection(): string {
    let html = '<ul>';
    for (let i = 1; i <= 5; i++) {
      const attendee = this.data[`attendee_${i}`];
      if (attendee) {
        html += `<li>${attendee}</li>`;
      }
    }
    html += '</ul>';
    return html;
  }

  private renderAgendaSection(): string {
    let html = '<table><thead><tr><th>Time</th><th>Topic</th><th>Presenter</th><th>Outcome</th></tr></thead><tbody>';
    for (let i = 1; i <= 5; i++) {
      const item = this.data[`agenda_item_${i}`];
      if (item) {
        html += `<tr><td></td><td>${item}</td><td></td><td></td></tr>`;
      }
    }
    html += '</tbody></table>';
    return html;
  }

  private renderActionItemsSection(): string {
    let html = '<table><thead><tr><th>Action Item</th><th>Owner</th><th>Due Date</th><th>Status</th></tr></thead><tbody>';
    for (let i = 1; i <= 5; i++) {
      const item = this.data[`action_item_${i}`];
      if (item) {
        html += `<tr><td>${item}</td><td></td><td></td><td></td></tr>`;
      }
    }
    html += '</tbody></table>';
    return html;
  }

  private renderSignatureBlock(): string {
    return `
      <div class="signature-line">Signature: ________________________</div>
      <div class="signature-line">Name: ${this.data.signatory_name_1 || '[Name]'}</div>
      <div class="signature-line">Title: ${this.data.signatory_title_1 || '[Title]'}</div>
      <div class="signature-line">Date: ________________</div>
      <div class="signature-line" style="margin-top: 0.5in;">Signature: ________________________</div>
      <div class="signature-line">Name: ${this.data.signatory_name_2 || '[Name]'}</div>
      <div class="signature-line">Title: ${this.data.signatory_title_2 || '[Title]'}</div>
      <div class="signature-line">Date: ________________</div>
    `;
  }

  /**
   * Export as PDF (placeholder - in production use jsPDF or similar)
   */
  public async exportToPDF(): Promise<Blob> {
    const html = this.generateHTML();
    // In production, use jsPDF or Puppeteer to convert HTML to PDF
    const blob = new Blob([html], { type: 'text/html' });
    return blob;
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
      styling: this.template.styling
    };
  }
}

export { TEMPLATE_LIBRARY, getTemplateById };
