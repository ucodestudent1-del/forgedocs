--- up ---
-- Seed system templates into the templates table
-- These templates are marked as is_system=true and are available to all users

INSERT INTO templates (name, description, category, content, placeholder_schema, is_system, usage_count, created_at, updated_at)
SELECT * FROM (VALUES
  (
    'Professional Services Agreement',
    'B2B service engagement and consulting agreement',
    'Legal',
    'This Agreement is made between [provider_name] ("Provider") and [client_name] ("Client"), effective [effective_date].

1. SCOPE OF SERVICES
[scope_of_services]

2. COMPENSATION
Client shall pay Provider [hourly_rate] per hour, total fee [total_fee], due by [payment_due_date].

3. GOVERNING LAW
This agreement shall be governed by the laws of [governing_state].

4. SIGNATURES
[signatory_name_1] [signatory_title_1]
[signatory_name_2] [signatory_title_2]',
    '[
      {"name": "client_name", "type": "text", "label": "Client Name", "required": true, "placeholder": "Acme Corporation"},
      {"name": "client_address", "type": "text", "label": "Client Address", "required": true, "placeholder": "123 Business Ave, City, ST 12345"},
      {"name": "client_contact", "type": "text", "label": "Client Contact", "placeholder": "John Doe, CEO"},
      {"name": "provider_name", "type": "text", "label": "Provider Name", "required": true, "placeholder": "ForgeDocs Inc"},
      {"name": "provider_address", "type": "text", "label": "Provider Address", "required": true},
      {"name": "provider_contact", "type": "text", "label": "Provider Contact", "placeholder": "Jane Smith, Founder"},
      {"name": "effective_date", "type": "date", "label": "Effective Date", "required": true},
      {"name": "agreement_number", "type": "text", "label": "Agreement Number", "placeholder": "PSA-2024-001"},
      {"name": "hourly_rate", "type": "currency", "label": "Hourly Rate", "placeholder": "150.00"},
      {"name": "total_fee", "type": "currency", "label": "Total Fee", "placeholder": "5000.00"},
      {"name": "payment_due_date", "type": "date", "label": "Payment Due Date"},
      {"name": "governing_state", "type": "text", "label": "Governing State", "placeholder": "California"},
      {"name": "scope_of_services", "type": "textarea", "label": "Scope of Services", "required": true, "placeholder": "Describe the services to be provided..."}
    ]',
    true, 0, NOW(), NOW()
  ),
  (
    'Non-Disclosure Agreement (NDA)',
    'Protect confidential information in business relationships',
    'Legal',
    'This Non-Disclosure Agreement is entered into between [disclosing_party_name] ("Disclosing Party") and [receiving_party_name] ("Receiving Party"), effective [effective_date].

1. DEFINITION OF CONFIDENTIAL INFORMATION
[confidential_info_description]

2. OBLIGATIONS OF RECEIVING PARTY
The Receiving Party shall maintain the confidentiality of the Confidential Information for a term of [agreement_term].

3. GOVERNING LAW
This agreement shall be governed by the laws of [governing_state].

4. SIGNATURES
[signatory_name_1] [signatory_title_1]
[signatory_name_2] [signatory_title_2]',
    '[
      {"name": "disclosing_party_name", "type": "text", "label": "Disclosing Party Name", "required": true},
      {"name": "disclosing_party_address", "type": "text", "label": "Disclosing Party Address", "required": true},
      {"name": "receiving_party_name", "type": "text", "label": "Receiving Party Name", "required": true},
      {"name": "receiving_party_address", "type": "text", "label": "Receiving Party Address", "required": true},
      {"name": "effective_date", "type": "date", "label": "Effective Date", "required": true},
      {"name": "agreement_term", "type": "text", "label": "Agreement Term", "placeholder": "3 years", "required": true},
      {"name": "confidential_info_description", "type": "textarea", "label": "Description of Confidential Information", "required": true},
      {"name": "governing_state", "type": "text", "label": "Governing State", "placeholder": "California", "required": true},
      {"name": "signatory_name_1", "type": "text", "label": "Signatory Name (Disclosing Party)", "required": true},
      {"name": "signatory_title_1", "type": "text", "label": "Signatory Title (Disclosing Party)", "placeholder": "CEO"},
      {"name": "signatory_name_2", "type": "text", "label": "Signatory Name (Receiving Party)", "required": true},
      {"name": "signatory_title_2", "type": "text", "label": "Signatory Title (Receiving Party)", "placeholder": "CTO"}
    ]',
    true, 0, NOW(), NOW()
  ),
  (
    'Commercial Invoice',
    'B2B billing and payment invoice',
    'Billing',
    'INVOICE

Invoice Number: [invoice_number]
Invoice Date: [invoice_date]
Due Date: [due_date]

Bill To:
[client_name]
[client_address]
Tax ID: [client_tax_id]

Bill From:
[company_name]
[company_address]
Tax ID: [company_tax_id]

Payment Method: [payment_method]
Bank Details: [bank_details]

Notes: [notes]',
    '[
      {"name": "invoice_number", "type": "text", "label": "Invoice Number", "required": true, "placeholder": "INV-2024-001"},
      {"name": "invoice_date", "type": "date", "label": "Invoice Date", "required": true},
      {"name": "due_date", "type": "date", "label": "Due Date", "required": true},
      {"name": "client_name", "type": "text", "label": "Client Name", "required": true},
      {"name": "client_address", "type": "text", "label": "Client Address", "required": true},
      {"name": "client_tax_id", "type": "text", "label": "Client Tax ID", "placeholder": "Optional"},
      {"name": "company_name", "type": "text", "label": "Your Company Name", "required": true},
      {"name": "company_address", "type": "text", "label": "Your Company Address", "required": true},
      {"name": "company_tax_id", "type": "text", "label": "Your Tax ID", "placeholder": "Optional"},
      {"name": "payment_method", "type": "text", "label": "Payment Method", "placeholder": "Bank Transfer"},
      {"name": "bank_details", "type": "textarea", "label": "Bank Details", "placeholder": "Bank Name, Account Number, Routing Number"},
      {"name": "notes", "type": "textarea", "label": "Notes", "placeholder": "Thank you for your business!"}
    ]',
    true, 0, NOW(), NOW()
  ),
  (
    'Business Proposal',
    'Sales proposals and project bids',
    'Sales',
    'BUSINESS PROPOSAL

Title: [proposal_title]
Date: [proposal_date]
Valid Until: [proposal_valid_until]

Prepared for: [client_name]
Company: [client_company]
Prepared by: [your_company_name]
Contact: [your_contact_person]

CLIENT CHALLENGES
1. [client_challenge_1]
2. [client_challenge_2]

PROPOSED SOLUTION
[proposed_solution]

PACKAGE: [package_name]
PRICE: [package_price]',
    '[
      {"name": "proposal_title", "type": "text", "label": "Proposal Title", "required": true, "placeholder": "Digital Marketing Proposal"},
      {"name": "client_name", "type": "text", "label": "Client Name", "required": true},
      {"name": "client_company", "type": "text", "label": "Client Company", "required": true},
      {"name": "your_company_name", "type": "text", "label": "Your Company Name", "required": true},
      {"name": "your_contact_person", "type": "text", "label": "Your Contact Person", "required": true},
      {"name": "proposal_date", "type": "date", "label": "Proposal Date", "required": true},
      {"name": "proposal_valid_until", "type": "date", "label": "Valid Until", "required": true},
      {"name": "client_challenge_1", "type": "textarea", "label": "Client Challenge #1", "required": true},
      {"name": "client_challenge_2", "type": "textarea", "label": "Client Challenge #2"},
      {"name": "proposed_solution", "type": "textarea", "label": "Proposed Solution", "required": true},
      {"name": "package_name", "type": "text", "label": "Package Name", "placeholder": "Growth Package"},
      {"name": "package_price", "type": "currency", "label": "Package Price", "placeholder": "5000.00"}
    ]',
    true, 0, NOW(), NOW()
  ),
  (
    'Formal Business Report',
    'Quarterly reports, annual reviews, executive summaries',
    'Reports',
    'FORMAL BUSINESS REPORT

[report_title]
[report_subtitle]

Author: [author_name]
Date: [report_date]
Period: [reporting_period]
Company: [company_name]
Department: [department]

EXECUTIVE SUMMARY
[executive_summary]

KEY FINDINGS
1. [key_finding_1]
2. [key_finding_2]
3. [key_finding_3]

RECOMMENDATIONS
1. [recommendation_1]
2. [recommendation_2]
3. [recommendation_3]',
    '[
      {"name": "report_title", "type": "text", "label": "Report Title", "required": true, "placeholder": "Q3 2024 Business Review"},
      {"name": "report_subtitle", "type": "text", "label": "Report Subtitle", "placeholder": "Annual Performance Review"},
      {"name": "author_name", "type": "text", "label": "Author Name", "required": true},
      {"name": "report_date", "type": "date", "label": "Report Date", "required": true},
      {"name": "reporting_period", "type": "text", "label": "Reporting Period", "placeholder": "Q3 2024 (July - September)"},
      {"name": "company_name", "type": "text", "label": "Company Name", "required": true},
      {"name": "department", "type": "text", "label": "Department", "placeholder": "Sales Department"},
      {"name": "executive_summary", "type": "textarea", "label": "Executive Summary", "required": true},
      {"name": "key_finding_1", "type": "textarea", "label": "Key Finding #1", "required": true},
      {"name": "key_finding_2", "type": "textarea", "label": "Key Finding #2"},
      {"name": "key_finding_3", "type": "textarea", "label": "Key Finding #3"},
      {"name": "recommendation_1", "type": "textarea", "label": "Recommendation #1", "required": true},
      {"name": "recommendation_2", "type": "textarea", "label": "Recommendation #2"},
      {"name": "recommendation_3", "type": "textarea", "label": "Recommendation #3"}
    ]',
    true, 0, NOW(), NOW()
  ),
  (
    'Meeting Minutes',
    'Board meetings, team meetings, client meetings',
    'Meetings',
    'MEETING MINUTES

Title: [meeting_title]
Date: [meeting_date]
Time: [meeting_time]
Location: [meeting_location]
Organizer: [meeting_organizer]

ATTENDEES
[attendee_1]
[attendee_2]
[attendee_3]
Absent: [absent_attendee_1]

AGENDA ITEMS
1. [agenda_item_1]
2. [agenda_item_2]
3. [agenda_item_3]

NEXT MEETING
Date: [next_meeting_date]
Time: [next_meeting_time]',
    '[
      {"name": "meeting_title", "type": "text", "label": "Meeting Title", "required": true, "placeholder": "Quarterly Board Meeting"},
      {"name": "meeting_date", "type": "date", "label": "Meeting Date", "required": true},
      {"name": "meeting_time", "type": "text", "label": "Meeting Time", "placeholder": "2:00 PM - 4:00 PM"},
      {"name": "meeting_location", "type": "text", "label": "Meeting Location", "placeholder": "Conference Room A"},
      {"name": "meeting_organizer", "type": "text", "label": "Meeting Organizer", "required": true},
      {"name": "attendee_1", "type": "text", "label": "Attendee #1", "placeholder": "John Smith - CEO"},
      {"name": "attendee_2", "type": "text", "label": "Attendee #2", "placeholder": "Jane Doe - CFO"},
      {"name": "attendee_3", "type": "text", "label": "Attendee #3", "placeholder": "Bob Wilson - CTO"},
      {"name": "absent_attendee_1", "type": "text", "label": "Absent Attendee #1", "placeholder": "Alice Brown - HR"},
      {"name": "agenda_item_1", "type": "text", "label": "Agenda Item #1", "placeholder": "Review Q3 Financials"},
      {"name": "agenda_item_2", "type": "text", "label": "Agenda Item #2", "placeholder": "Discuss Q4 Strategy"},
      {"name": "agenda_item_3", "type": "text", "label": "Agenda Item #3", "placeholder": "Approve Budget"},
      {"name": "next_meeting_date", "type": "date", "label": "Next Meeting Date"},
      {"name": "next_meeting_time", "type": "text", "label": "Next Meeting Time", "placeholder": "2:00 PM"}
    ]',
    true, 0, NOW(), NOW()
  ),
  (
    'Employment Offer Letter',
    'Job offers and employment agreements',
    'HR',
    'EMPLOYMENT OFFER LETTER

[manager_name] [manager_title]

[date]

[candidate_name]
[candidate_address]

RE: Offer of Employment - [position_title]

Dear [candidate_name],

We are pleased to offer you the position of [position_title] in the [department] department, starting [start_date].

COMPENSATION
Salary: [salary_amount] ([pay_frequency])
Bonus: [bonus_amount]
Equity: [equity_grant] ([vesting_schedule])
Benefits Start: [benefits_start_date]

This offer expires on [offer_expiration_date].

Sincerely,
[manager_name]',
    '[
      {"name": "candidate_name", "type": "text", "label": "Candidate Name", "required": true},
      {"name": "candidate_address", "type": "text", "label": "Candidate Address", "required": true},
      {"name": "position_title", "type": "text", "label": "Position Title", "required": true, "placeholder": "Senior Software Engineer"},
      {"name": "department", "type": "text", "label": "Department", "required": true, "placeholder": "Engineering"},
      {"name": "start_date", "type": "date", "label": "Start Date", "required": true},
      {"name": "salary_amount", "type": "currency", "label": "Salary Amount", "placeholder": "120000.00"},
      {"name": "pay_frequency", "type": "text", "label": "Pay Frequency", "placeholder": "Monthly"},
      {"name": "bonus_amount", "type": "currency", "label": "Bonus Amount", "placeholder": "10000.00"},
      {"name": "equity_grant", "type": "text", "label": "Equity Grant", "placeholder": "5000 shares"},
      {"name": "vesting_schedule", "type": "text", "label": "Vesting Schedule", "placeholder": "4-year vesting with 1-year cliff"},
      {"name": "benefits_start_date", "type": "date", "label": "Benefits Start Date"},
      {"name": "manager_name", "type": "text", "label": "Manager Name", "required": true},
      {"name": "manager_title", "type": "text", "label": "Manager Title", "required": true},
      {"name": "offer_expiration_date", "type": "date", "label": "Offer Expiration Date", "required": true}
    ]',
    true, 0, NOW(), NOW()
  )
) AS v(name, description, category, content, placeholder_schema, is_system, usage_count, created_at, updated_at)
WHERE NOT EXISTS (
  SELECT 1 FROM templates WHERE is_system = TRUE AND name = v.name
);

--- down ---
DELETE FROM templates WHERE is_system = TRUE;
