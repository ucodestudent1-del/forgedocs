--- up ---
-- Template categories table for organizing templates
CREATE TABLE IF NOT EXISTS template_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add category_id foreign key to templates (optional, for categorization)
ALTER TABLE templates ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES template_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_templates_category_id ON templates(category_id);

-- Insert default categories
INSERT INTO template_categories (name, slug, description, color, icon) VALUES
  ('Legal Contracts', 'legal', 'Contracts, NDAs, agreements', '#3b82f6', 'FileText'),
  ('Billing & Invoices', 'billing', 'Invoices, bills, receipts', '#10b981', 'Receipt'),
  ('Sales & Proposals', 'sales', 'Proposals, quotes, bids', '#8b5cf6', 'Share2'),
  ('Reports & Analysis', 'reports', 'Reports, reviews, summaries', '#f59e0b', 'BarChart3'),
  ('Meetings & Minutes', 'meetings', 'Meeting minutes, agendas', '#ef4444', 'Calendar'),
  ('Human Resources', 'hr', 'Offer letters, HR documents', '#06b6d4', 'Users')
ON CONFLICT (slug) DO NOTHING;

--- down ---
ALTER TABLE templates DROP COLUMN IF EXISTS category_id;
DROP TABLE IF EXISTS template_categories CASCADE;
