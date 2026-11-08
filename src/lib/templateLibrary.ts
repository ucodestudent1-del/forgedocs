// Template definitions for ForgeDocs document generator
export const TEMPLATE_LIBRARY = {
  // Legal Contracts
  professional_service_agreement: {
    id: 'professional_service_agreement',
    name: 'Professional Services Agreement',
    category: 'Legal',
    description: 'B2B service engagement and consulting agreement',
    fields: [
      { name: 'client_name', type: 'text', label: 'Client Name', required: true, placeholder: 'Acme Corporation' },
      { name: 'client_address', type: 'text', label: 'Client Address', required: true, placeholder: '123 Business Ave, City, ST 12345' },
      { name: 'client_contact', type: 'text', label: 'Client Contact', placeholder: 'John Doe, CEO' },
      { name: 'provider_name', type: 'text', label: 'Provider Name', required: true, placeholder: 'ForgeDocs Inc' },
      { name: 'provider_address', type: 'text', label: 'Provider Address', required: true },
      { name: 'provider_contact', type: 'text', label: 'Provider Contact', placeholder: 'Jane Smith, Founder' },
      { name: 'effective_date', type: 'date', label: 'Effective Date', required: true },
      { name: 'agreement_number', type: 'text', label: 'Agreement Number', placeholder: 'PSA-2024-001' },
      { name: 'hourly_rate', type: 'currency', label: 'Hourly Rate', placeholder: '150.00' },
      { name: 'total_fee', type: 'currency', label: 'Total Fee', placeholder: '5000.00' },
      { name: 'payment_due_date', type: 'date', label: 'Payment Due Date' },
      { name: 'governing_state', type: 'text', label: 'Governing State', placeholder: 'California' },
      { name: 'scope_of_services', type: 'textarea', label: 'Scope of Services', required: true, placeholder: 'Describe the services to be provided...' }
    ],
    sections: [
      { id: 'parties', label: 'Parties', required: true },
      { id: 'scope', label: 'Scope of Services', required: true },
      { id: 'term', label: 'Term & Termination', required: true },
      { id: 'compensation', label: 'Compensation', required: true },
      { id: 'confidentiality', label: 'Confidentiality', required: true },
      { id: 'liability', label: 'Liability & Indemnification', required: true },
      { id: 'governing_law', label: 'Governing Law', required: true },
      { id: 'signatures', label: 'Signature Block', required: true }
    ],
    styling: { font: 'Times New Roman', heading_size: 14, body_size: 12, line_spacing: 1.5 }
  },

  nondisclosure_agreement: {
    id: 'nondisclosure_agreement',
    name: 'Non-Disclosure Agreement (NDA)',
    category: 'Legal',
    description: 'Protect confidential information in business relationships',
    fields: [
      { name: 'disclosing_party_name', type: 'text', label: 'Disclosing Party Name', required: true },
      { name: 'disclosing_party_address', type: 'text', label: 'Disclosing Party Address', required: true },
      { name: 'receiving_party_name', type: 'text', label: 'Receiving Party Name', required: true },
      { name: 'receiving_party_address', type: 'text', label: 'Receiving Party Address', required: true },
      { name: 'effective_date', type: 'date', label: 'Effective Date', required: true },
      { name: 'agreement_term', type: 'text', label: 'Agreement Term', placeholder: '3 years', required: true },
      { name: 'confidential_info_description', type: 'textarea', label: 'Description of Confidential Information', required: true },
      { name: 'governing_state', type: 'text', label: 'Governing State', placeholder: 'California', required: true },
      { name: 'signatory_name_1', type: 'text', label: 'Signatory Name (Disclosing Party)', required: true },
      { name: 'signatory_title_1', type: 'text', label: 'Signatory Title (Disclosing Party)', placeholder: 'CEO' },
      { name: 'signatory_name_2', type: 'text', label: 'Signatory Name (Receiving Party)', required: true },
      { name: 'signatory_title_2', type: 'text', label: 'Signatory Title (Receiving Party)', placeholder: 'CTO' }
    ],
    sections: [
      { id: 'parties', label: 'Parties', required: true },
      { id: 'definition', label: 'Definition of Confidential Information', required: true },
      { id: 'obligations', label: 'Obligations of Receiving Party', required: true },
      { id: 'exclusions', label: 'Exclusions', required: true },
      { id: 'term', label: 'Term', required: true },
      { id: 'return_materials', label: 'Return of Materials', required: true },
      { id: 'remedies', label: 'Remedies', required: true },
      { id: 'governing_law', label: 'Governing Law', required: true },
      { id: 'signatures', label: 'Signature Block', required: true }
    ],
    styling: { font: 'Times New Roman', heading_size: 12, body_size: 11, line_spacing: 1.5 }
  },

  // Business Templates
  commercial_invoice: {
    id: 'commercial_invoice',
    name: 'Commercial Invoice',
    category: 'Billing',
    description: 'B2B billing and payment invoice',
    fields: [
      { name: 'invoice_number', type: 'text', label: 'Invoice Number', required: true, placeholder: 'INV-2024-001' },
      { name: 'invoice_date', type: 'date', label: 'Invoice Date', required: true },
      { name: 'due_date', type: 'date', label: 'Due Date', required: true },
      { name: 'client_name', type: 'text', label: 'Client Name', required: true },
      { name: 'client_address', type: 'text', label: 'Client Address', required: true },
      { name: 'client_tax_id', type: 'text', label: 'Client Tax ID', placeholder: 'Optional' },
      { name: 'company_name', type: 'text', label: 'Your Company Name', required: true },
      { name: 'company_address', type: 'text', label: 'Your Company Address', required: true },
      { name: 'company_tax_id', type: 'text', label: 'Your Tax ID', placeholder: 'Optional' },
      { name: 'payment_method', type: 'text', label: 'Payment Method', placeholder: 'Bank Transfer' },
      { name: 'bank_details', type: 'textarea', label: 'Bank Details', placeholder: 'Bank Name, Account Number, Routing Number' },
      { name: 'notes', type: 'textarea', label: 'Notes', placeholder: 'Thank you for your business!' }
    ],
    sections: [
      { id: 'header', label: 'Invoice Header', required: true },
      { id: 'bill_to', label: 'Bill To', required: true },
      { id: 'bill_from', label: 'Bill From', required: true },
      { id: 'line_items', label: 'Line Items', required: true },
      { id: 'totals', label: 'Totals', required: true },
      { id: 'payment_terms', label: 'Payment Terms', required: true },
      { id: 'notes', label: 'Notes', required: false }
    ],
    styling: { font: 'Helvetica', heading_size: 16, body_size: 11, line_spacing: 1.2 }
  },

  business_proposal: {
    id: 'business_proposal',
    name: 'Business Proposal',
    category: 'Sales',
    description: 'Sales proposals and project bids',
    fields: [
      { name: 'proposal_title', type: 'text', label: 'Proposal Title', required: true, placeholder: 'Digital Marketing Proposal' },
      { name: 'client_name', type: 'text', label: 'Client Name', required: true },
      { name: 'client_company', type: 'text', label: 'Client Company', required: true },
      { name: 'your_company_name', type: 'text', label: 'Your Company Name', required: true },
      { name: 'your_contact_person', type: 'text', label: 'Your Contact Person', required: true },
      { name: 'proposal_date', type: 'date', label: 'Proposal Date', required: true },
      { name: 'proposal_valid_until', type: 'date', label: 'Valid Until', required: true },
      { name: 'client_challenge_1', type: 'textarea', label: 'Client Challenge #1', required: true },
      { name: 'client_challenge_2', type: 'textarea', label: 'Client Challenge #2' },
      { name: 'proposed_solution', type: 'textarea', label: 'Proposed Solution', required: true },
      { name: 'package_name', type: 'text', label: 'Package Name', placeholder: 'Growth Package' },
      { name: 'package_price', type: 'currency', label: 'Package Price', placeholder: '5000.00' }
    ],
    sections: [
      { id: 'cover', label: 'Cover Page', required: true },
      { id: 'executive_summary', label: 'Executive Summary', required: true },
      { id: 'client_needs', label: 'Client Needs Analysis', required: true },
      { id: 'solution', label: 'Proposed Solution', required: true },
      { id: 'scope', label: 'Scope of Work', required: true },
      { id: 'pricing', label: 'Pricing', required: true },
      { id: 'case_studies', label: 'Case Studies', required: false },
      { id: 'next_steps', label: 'Next Steps', required: true }
    ],
    styling: { font: 'Montserrat', heading_size: 18, body_size: 11, line_spacing: 1.3 }
  },

  // Formal Reports
  formal_report: {
    id: 'formal_report',
    name: 'Formal Business Report',
    category: 'Reports',
    description: 'Quarterly reports, annual reviews, executive summaries',
    fields: [
      { name: 'report_title', type: 'text', label: 'Report Title', required: true, placeholder: 'Q3 2024 Business Review' },
      { name: 'report_subtitle', type: 'text', label: 'Report Subtitle', placeholder: 'Annual Performance Review' },
      { name: 'author_name', type: 'text', label: 'Author Name', required: true },
      { name: 'report_date', type: 'date', label: 'Report Date', required: true },
      { name: 'reporting_period', type: 'text', label: 'Reporting Period', placeholder: 'Q3 2024 (July - September)' },
      { name: 'company_name', type: 'text', label: 'Company Name', required: true },
      { name: 'department', type: 'text', label: 'Department', placeholder: 'Sales Department' },
      { name: 'executive_summary', type: 'textarea', label: 'Executive Summary', required: true },
      { name: 'key_finding_1', type: 'textarea', label: 'Key Finding #1', required: true },
      { name: 'key_finding_2', type: 'textarea', label: 'Key Finding #2' },
      { name: 'key_finding_3', type: 'textarea', label: 'Key Finding #3' },
      { name: 'recommendation_1', type: 'textarea', label: 'Recommendation #1', required: true },
      { name: 'recommendation_2', type: 'textarea', label: 'Recommendation #2' },
      { name: 'recommendation_3', type: 'textarea', label: 'Recommendation #3' }
    ],
    sections: [
      { id: 'cover', label: 'Cover Page', required: true },
      { id: 'toc', label: 'Table of Contents', required: true },
      { id: 'executive_summary', label: 'Executive Summary', required: true },
      { id: 'introduction', label: 'Introduction', required: true },
      { id: 'findings', label: 'Findings', required: true },
      { id: 'analysis', label: 'Analysis', required: true },
      { id: 'recommendations', label: 'Recommendations', required: true },
      { id: 'appendices', label: 'Appendices', required: false }
    ],
    styling: { font: 'Arial', heading_size: 14, body_size: 11, line_spacing: 1.4 }
  },

  meeting_minutes: {
    id: 'meeting_minutes',
    name: 'Meeting Minutes',
    category: 'Meetings',
    description: 'Board meetings, team meetings, client meetings',
    fields: [
      { name: 'meeting_title', type: 'text', label: 'Meeting Title', required: true, placeholder: 'Quarterly Board Meeting' },
      { name: 'meeting_date', type: 'date', label: 'Meeting Date', required: true },
      { name: 'meeting_time', type: 'text', label: 'Meeting Time', placeholder: '2:00 PM - 4:00 PM' },
      { name: 'meeting_location', type: 'text', label: 'Meeting Location', placeholder: 'Conference Room A' },
      { name: 'meeting_organizer', type: 'text', label: 'Meeting Organizer', required: true },
      { name: 'attendee_1', type: 'text', label: 'Attendee #1', placeholder: 'John Smith - CEO' },
      { name: 'attendee_2', type: 'text', label: 'Attendee #2', placeholder: 'Jane Doe - CFO' },
      { name: 'attendee_3', type: 'text', label: 'Attendee #3', placeholder: 'Bob Wilson - CTO' },
      { name: 'absent_attendee_1', type: 'text', label: 'Absent Attendee #1', placeholder: 'Alice Brown - HR' },
      { name: 'agenda_item_1', type: 'text', label: 'Agenda Item #1', placeholder: 'Review Q3 Financials' },
      { name: 'agenda_item_2', type: 'text', label: 'Agenda Item #2', placeholder: 'Discuss Q4 Strategy' },
      { name: 'agenda_item_3', type: 'text', label: 'Agenda Item #3', placeholder: 'Approve Budget' },
      { name: 'next_meeting_date', type: 'date', label: 'Next Meeting Date' },
      { name: 'next_meeting_time', type: 'text', label: 'Next Meeting Time', placeholder: '2:00 PM' }
    ],
    sections: [
      { id: 'header', label: 'Meeting Header', required: true },
      { id: 'attendees', label: 'Attendees', required: true },
      { id: 'agenda_items', label: 'Agenda Items', required: true },
      { id: 'action_items', label: 'Action Items', required: true },
      { id: 'next_meeting', label: 'Next Meeting', required: true },
      { id: 'approval', label: 'Approval', required: true }
    ],
    styling: { font: 'Arial', heading_size: 12, body_size: 10.5, line_spacing: 1.3 }
  },

  employment_offer_letter: {
    id: 'employment_offer_letter',
    name: 'Employment Offer Letter',
    category: 'HR',
    description: 'Job offers and employment agreements',
    fields: [
      { name: 'candidate_name', type: 'text', label: 'Candidate Name', required: true },
      { name: 'candidate_address', type: 'text', label: 'Candidate Address', required: true },
      { name: 'position_title', type: 'text', label: 'Position Title', required: true, placeholder: 'Senior Software Engineer' },
      { name: 'department', type: 'text', label: 'Department', required: true, placeholder: 'Engineering' },
      { name: 'start_date', type: 'date', label: 'Start Date', required: true },
      { name: 'salary_amount', type: 'currency', label: 'Salary Amount', placeholder: '120000.00' },
      { name: 'pay_frequency', type: 'text', label: 'Pay Frequency', placeholder: 'Monthly' },
      { name: 'bonus_amount', type: 'currency', label: 'Bonus Amount', placeholder: '10000.00' },
      { name: 'equity_grant', type: 'text', label: 'Equity Grant', placeholder: '5000 shares' },
      { name: 'vesting_schedule', type: 'text', label: 'Vesting Schedule', placeholder: '4-year vesting with 1-year cliff' },
      { name: 'benefits_start_date', type: 'date', label: 'Benefits Start Date' },
      { name: 'manager_name', type: 'text', label: 'Manager Name', required: true },
      { name: 'manager_title', type: 'text', label: 'Manager Title', required: true },
      { name: 'offer_expiration_date', type: 'date', label: 'Offer Expiration Date', required: true }
    ],
    sections: [
      { id: 'header', label: 'Offer Header', required: true },
      { id: 'candidate_info', label: 'Candidate Information', required: true },
      { id: 'offer', label: 'Offer Details', required: true },
      { id: 'compensation', label: 'Compensation', required: true },
      { id: 'benefits', label: 'Benefits', required: true },
      { id: 'conditions', label: 'Conditions', required: true },
      { id: 'acceptance', label: 'Acceptance', required: true }
    ],
    styling: { font: 'Arial', heading_size: 14, body_size: 11, line_spacing: 1.3 }
  }
};

export const TEMPLATE_CATEGORIES = {
  legal: 'Legal Contracts',
  billing: 'Billing & Invoices',
  sales: 'Sales & Proposals',
  reports: 'Reports & Analysis',
  meetings: 'Meetings & Minutes',
  hr: 'Human Resources'
};

export const getTemplateById = (id) => TEMPLATE_LIBRARY[id];
export const getTemplatesByCategory = (category) => Object.values(TEMPLATE_LIBRARY).filter(t => t.category === category);
export const getAllTemplates = () => Object.values(TEMPLATE_LIBRARY);
