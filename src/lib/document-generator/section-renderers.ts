import type { SectionRenderer, TemplateData } from './types';
import { BaseSectionRenderer } from './base-renderer';

/**
 * Parties section renderer - renders the parties table section
 */
export class PartiesSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'parties';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data) + `
      <p><strong>This Agreement is made between:</strong></p>
      <table>
        <tr><td><strong>Disclosing Party:</strong></td><td>${this.data.disclosing_party_name || '[Disclosing Party Name]'}</td></tr>
        <tr><td><strong>Address:</strong></td><td>${this.data.disclosing_party_address || '[Address]'}</td></tr>
        <tr><td><strong>Receiving Party:</strong></td><td>${this.data.receiving_party_name || '[Receiving Party Name]'}</td></tr>
        <tr><td><strong>Address:</strong></td><td>${this.data.receiving_party_address || '[Address]'}</td></tr>
      </table>
    `;
  }
}

/**
 * Scope section renderer - renders scope of services
 */
export class ScopeSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'scope';
  }

  render(section: any, data: TemplateData): string {
    const header = super.render(section, data);
    if (this.data.scope_of_services) {
      return header + this.renderTextSection('scope_of_services');
    }
    if (this.data.scope_details) {
      return header + this.renderTextSection('scope_details', 'Scope Details');
    }
    return header + `<p>${section.label || section.id} section content would be rendered here.</p>`;
  }
}

/**
 * Term section renderer
 */
export class TermSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'term';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data) + this.renderTextSection('term_details', 'Term & Termination Details');
  }
}

/**
 * Compensation section renderer
 */
export class CompensationSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'compensation';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data)
      + this.renderTextSection('total_fee', 'Total Fee:')
      + this.renderTextSection('payment_due_date', 'Payment Due:');
  }
}

/**
 * Confidentiality section renderer
 */
export class ConfidentialitySectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'confidentiality';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data) + this.renderTextSection('confidentiality_details', 'Confidentiality Details');
  }
}

/**
 * Liability section renderer
 */
export class LiabilitySectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'liability';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data) + this.renderTextSection('liability_details', 'Liability Details');
  }
}

/**
 * Governing Law section renderer
 */
export class GoverningLawSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'governing_law';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data) + this.renderTextSection('governing_state', 'Governing State:');
  }
}

/**
 * Signatures section renderer
 */
export class SignaturesSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'signatures';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data) + `
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
}

/**
 * Header section renderer
 */
export class HeaderSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'header';
  }

  render(section: any, data: TemplateData): string {
    return `
      <div class="text-center">
        <h1>${this.data.document_title || '[Document Title]'}</h1>
        <p><strong>Date:</strong> ${this.data.invoice_date || this.data.report_date || this.data.proposal_date || '[Date]'}</p>
        <p><strong>Document #:</strong> ${this.data.invoice_number || this.data.agreement_number || '[Document #]'}</p>
      </div>
    `;
  }
}

/**
 * Bill To section renderer
 */
export class BillToSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'bill_to';
  }

  render(section: any, data: TemplateData): string {
    return `
      <div>
        <h3>Bill To:</h3>
        <p>${this.data.client_name || '[Client Name]'}</p>
        <p>${this.data.client_address || '[Client Address]'}</p>
      </div>
    `;
  }
}

/**
 * Bill From section renderer
 */
export class BillFromSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'bill_from';
  }

  render(section: any, data: TemplateData): string {
    return `
      <div>
        <h3>Bill From:</h3>
        <p>${this.data.company_name || '[Company Name]'}</p>
        <p>${this.data.company_address || '[Company Address]'}</p>
      </div>
    `;
  }
}

/**
 * Line Items section renderer
 */
export class LineItemsSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'line_items';
  }

  render(section: any, data: TemplateData): string {
    return `
      <table>
        <thead>
          <tr><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Line Total</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${this.data.item_description_1 || '[Item Description]'}</td>
            <td>${this.data.quantity_1 || '1'}</td>
            <td>$${this.data.unit_price_1 || '0.00'}</td>
            <td>$${this.data.line_total_1 || '0.00'}</td>
          </tr>
        </tbody>
      </table>
    `;
  }
}

/**
 * Totals section renderer
 */
export class TotalsSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'totals';
  }

  render(section: any, data: TemplateData): string {
    return `
      <table style="float: right; width: 50%;">
        <tr><td><strong>Subtotal:</strong></td><td>$${this.data.subtotal || '0.00'}</td></tr>
        <tr><td><strong>Tax:</strong></td><td>$${this.data.tax_amount || '0.00'}</td></tr>
        <tr><td><strong>Grand Total:</strong></td><td><strong>$${this.data.grand_total || '0.00'}</strong></td></tr>
      </table>
    `;
  }
}

/**
 * Payment Terms section renderer
 */
export class PaymentTermsSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'payment_terms';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data)
      + this.renderTextSection('payment_method', 'Payment Method:')
      + this.renderTextSection('bank_details', 'Bank Details:');
  }
}

/**
 * Cover section renderer
 */
export class CoverSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'cover';
  }

  render(section: any, data: TemplateData): string {
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
}

/**
 * Executive Summary section renderer
 */
export class ExecutiveSummarySectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'executive_summary';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data) + this.renderTextSection('executive_summary');
  }
}

/**
 * Client Needs section renderer
 */
export class ClientNeedsSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'client_needs';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data)
      + this.renderTextSection('client_challenge_1', 'Challenge #1:')
      + this.renderTextSection('client_challenge_2', 'Challenge #2:');
  }
}

/**
 * Solution section renderer
 */
export class SolutionSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'solution';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data) + this.renderTextSection('proposed_solution');
  }
}

/**
 * Pricing section renderer
 */
export class PricingSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'pricing';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data)
      + this.renderTextSection('package_name', 'Package:')
      + this.renderTextSection('package_price', 'Price:');
  }
}

/**
 * Case Studies section renderer
 */
export class CaseStudiesSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'case_studies';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data) + this.renderTextSection('case_study_1', 'Case Study #1:');
  }
}

/**
 * Next Steps section renderer
 */
export class NextStepsSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'next_steps';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data) + this.renderTextSection('next_steps_details', 'Next Steps:');
  }
}

/**
 * Table of Contents section renderer
 */
export class TableOfContentsSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  constructor(private template: any) {
    super({});
  }

  canRender(sectionId: string): boolean {
    return sectionId === 'table_of_contents';
  }

  render(section: any, data: TemplateData): string {
    const sections = this.template?.sections || [];
    return `
      <h2>Table of Contents</h2>
      <ul>
        ${sections.map((s: any) => `<li>${s.label}</li>`).join('')}
      </ul>
      <div class="page-break"></div>
    `;
  }
}

/**
 * Introduction section renderer
 */
export class IntroductionSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'introduction';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data) + this.renderTextSection('introduction_text', 'Introduction:');
  }
}

/**
 * Findings section renderer
 */
export class FindingsSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'findings';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data)
      + this.renderTextSection('key_finding_1', 'Finding #1:')
      + this.renderTextSection('key_finding_2', 'Finding #2:')
      + this.renderTextSection('key_finding_3', 'Finding #3:');
  }
}

/**
 * Analysis section renderer
 */
export class AnalysisSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'analysis';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data) + this.renderTextSection('analysis_text', 'Analysis:');
  }
}

/**
 * Recommendations section renderer
 */
export class RecommendationsSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'recommendations';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data)
      + this.renderTextSection('recommendation_1', 'Recommendation #1:')
      + this.renderTextSection('recommendation_2', 'Recommendation #2:')
      + this.renderTextSection('recommendation_3', 'Recommendation #3:');
  }
}

/**
 * Appendices section renderer
 */
export class AppendicesSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'appendices';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data) + this.renderTextSection('appendix_1', 'Appendix #1:');
  }
}

/**
 * Attendees section renderer
 */
export class AttendeesSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'attendees';
  }

  render(section: any, data: TemplateData): string {
    let html = '<ul>';
    for (let i = 1; i <= 5; i++) {
      const attendee = this.data[`attendee_${i}`];
      if (attendee) {
        html += `<li>${attendee}</li>`;
      }
    }
    html += '</ul>';
    return super.render(section, data) + html;
  }
}

/**
 * Agenda Items section renderer
 */
export class AgendaItemsSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'agenda_items';
  }

  render(section: any, data: TemplateData): string {
    let html = '<table><thead><tr><th>Time</th><th>Topic</th><th>Presenter</th><th>Outcome</th></tr></thead><tbody>';
    for (let i = 1; i <= 5; i++) {
      const item = this.data[`agenda_item_${i}`];
      if (item) {
        html += `<tr><td></td><td>${item}</td><td></td><td></td></tr>`;
      }
    }
    html += '</tbody></table>';
    return super.render(section, data) + html;
  }
}

/**
 * Action Items section renderer
 */
export class ActionItemsSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'action_items';
  }

  render(section: any, data: TemplateData): string {
    let html = '<table><thead><tr><th>Action Item</th><th>Owner</th><th>Due Date</th><th>Status</th></tr></thead><tbody>';
    for (let i = 1; i <= 5; i++) {
      const item = this.data[`action_item_${i}`];
      if (item) {
        html += `<tr><td>${item}</td><td></td><td></td><td></td></tr>`;
      }
    }
    html += '</tbody></table>';
    return super.render(section, data) + html;
  }
}

/**
 * Next Meeting section renderer
 */
export class NextMeetingSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'next_meeting';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data)
      + this.renderTextSection('next_meeting_date', 'Next Meeting Date:')
      + this.renderTextSection('next_meeting_time', 'Next Meeting Time:');
  }
}

/**
 * Meeting Approval section renderer
 */
export class MeetingApprovalSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return sectionId === 'meeting_approval';
  }

  render(section: any, data: TemplateData): string {
    return super.render(section, data)
      + this.renderTextSection('prepared_by', 'Prepared By:')
      + this.renderTextSection('approved_by', 'Approved By:');
  }
}

/**
 * Default section renderer - used when no specific renderer matches
 */
export class DefaultSectionRenderer extends BaseSectionRenderer implements SectionRenderer {
  canRender(sectionId: string): boolean {
    return true; // matches everything as fallback
  }

  render(section: any, data: TemplateData): string {
    const sectionLabel = section.label || section.id;
    return super.render(section, data)
      + `<p>${sectionLabel} section content would be rendered here.</p>`;
  }
}
