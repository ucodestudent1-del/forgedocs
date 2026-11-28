import type { TierLimits } from '@/lib/tierLimits'

export interface SubscriptionRepository {
  getActiveTier(userId: string): Promise<string>
  getTierLimits(tier: string): Promise<TierLimits | null>
}

export interface UsageRepository {
  checkLimit(userId: string, metric: string, quantity: number): Promise<{
    allowed: boolean
    limit: number
    current: number
    remaining: number
  }>
  trackUsage(userId: string, metric: string, quantity: number): Promise<void>
}

export interface DocumentRepository {
  create(userId: string, data: DocumentCreateData): Promise<Document>
  findById(id: string, userId: string): Promise<Document | null>
  findByStoragePath(path: string, userId: string): Promise<Document | null>
  delete(id: string, userId: string): Promise<void>
  update(id: string, userId: string, data: Partial<Document>): Promise<Document>
  list(userId: string, options?: DocumentListOptions): Promise<{ documents: Document[]; count: number }>
}

export interface DocumentCreateData {
  parent_id: string | null
  title: string
  storage_path: string
  mime_type: string
  file_size: number
  version: number
}

export interface Document {
  id: string
  user_id: string
  parent_id: string | null
  title: string
  storage_path: string
  mime_type: string
  file_size: number
  version: number
  status: string
  created_at: string
  updated_at: string
}

export interface DocumentListOptions {
  page?: number
  limit?: number
  search?: string
  category?: string
  status?: string
}

export interface TemplateRepository {
  create(userId: string, data: TemplateCreateData): Promise<Template>
  findById(id: string): Promise<Template | null>
  findByUserId(userId: string, options?: TemplateListOptions): Promise<{ templates: Template[]; count: number }>
  findPublic(options?: TemplateListOptions): Promise<{ templates: Template[]; count: number }>
  update(id: string, userId: string, data: Partial<Template>): Promise<Template>
  delete(id: string, userId: string): Promise<void>
  incrementUsage(id: string): Promise<void>
}

export interface TemplateCreateData {
  name: string
  description: string | null
  category: string | null
  content: string
  source_url: string | null
  placeholder_schema: TemplateField[]
  preview_url: string | null
  tags: string[]
  is_public: boolean
  team_id: string | null
  is_favorite: boolean
  is_system: boolean
  usage_count: number
}

export interface TemplateField {
  name: string
  type: 'text' | 'date' | 'number' | 'select'
  default_value?: unknown
  required: boolean
}

export interface Template {
  id: string
  user_id: string
  name: string
  description: string | null
  category: string | null
  content: string
  source_url: string | null
  placeholder_schema: TemplateField[]
  preview_url: string | null
  tags: string[]
  is_public: boolean
  team_id: string | null
  is_favorite: boolean
  is_system: boolean
  version_count: number
  usage_count: number
  created_at: string
  updated_at: string
}

export interface TemplateListOptions {
  page?: number
  limit?: number
  search?: string
  category?: string
  is_favorite?: boolean
  is_system?: boolean
}

export interface ConversionJobRepository {
  create(data: ConversionJobCreateData): Promise<ConversionJob>
  findById(id: string): Promise<ConversionJob | null>
  findByUserId(userId: string, options?: ConversionJobListOptions): Promise<{ jobs: ConversionJob[]; count: number }>
  updateStatus(id: string, status: string, data?: Partial<ConversionJob>): Promise<ConversionJob>
}

export interface ConversionJobCreateData {
  user_id: string
  source_document_id: string | null
  source_url: string | null
  source_format: string
  target_format: string
  options: Record<string, unknown>
  status: string
}

export interface ConversionJob {
  id: string
  user_id: string
  source_document_id: string | null
  source_url: string | null
  source_format: string
  target_format: string
  options: Record<string, unknown>
  status: string
  error_message: string | null
  output_url: string | null
  output_mime_type: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ConversionJobListOptions {
  page?: number
  limit?: number
  status?: string
}

export interface WebhookRepository {
  create(userId: string, data: WebhookCreateData): Promise<WebhookEndpoint>
  findByUserId(userId: string): Promise<WebhookEndpoint[]>
  findById(id: string, userId: string): Promise<WebhookEndpoint | null>
  update(id: string, userId: string, data: Partial<WebhookEndpoint>): Promise<WebhookEndpoint>
  delete(id: string, userId: string): Promise<void>
  findActiveByUserId(userId: string): Promise<WebhookEndpoint[]>
}

export interface WebhookCreateData {
  url: string
  secret: string
  events: string[]
  is_active: boolean
}

export interface WebhookEndpoint {
  id: string
  user_id: string
  url: string
  secret: string
  events: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuditRepository {
  insert(event: AuditEventInput): Promise<void>
  findByUserId(userId: string, options?: AuditListOptions): Promise<{ events: AuditEvent[]; count: number }>
}

export interface AuditEventInput {
  user_id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  old_values: Record<string, unknown>
  new_values: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface AuditEvent {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown>
  new_values: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  severity: string
  created_at: string
}

export interface AuditListOptions {
  page?: number
  limit?: number
  action?: string
  severity?: string
  fromDate?: string
  toDate?: string
}