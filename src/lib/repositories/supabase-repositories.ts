import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type {
  SubscriptionRepository,
  TierLimits,
  UsageRepository,
  DocumentRepository,
  DocumentCreateData,
  Document,
  DocumentListOptions,
  TemplateRepository,
  TemplateCreateData,
  Template,
  TemplateListOptions,
  TemplateField,
  ConversionJobRepository,
  ConversionJobCreateData,
  ConversionJob,
  ConversionJobListOptions,
  WebhookRepository,
  WebhookCreateData,
  WebhookEndpoint,
  AuditRepository,
  AuditEventInput,
  AuditEvent,
  AuditListOptions,
} from '../repositories/interfaces'

export class SupabaseSubscriptionRepository implements SubscriptionRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getActiveTier(userId: string): Promise<string> {
    const { data: subscription } = await (this.supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as any)

    return subscription?.tier || 'free'
  }

  async getTierLimits(tier: string): Promise<TierLimits | null> {
    const { data: limits } = await (this.supabase
      .from('tier_limits')
      .select('*')
      .eq('tier', tier)
      .single() as any)

    if (!limits) return null

    return {
      documents_per_month: limits.documents_per_month,
      conversions_per_month: limits.conversions_per_month,
      storage_gb: limits.storage_gb,
      max_file_size_mb: limits.max_file_size_mb,
      api_requests_per_minute: limits.api_requests_per_minute,
      has_priority_support: limits.has_priority_support,
      has_audit_logs: limits.has_audit_logs,
      has_advanced_templates: limits.has_advanced_templates,
      max_seats: limits.max_seats,
    }
  }
}

export class SupabaseUsageRepository implements UsageRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async checkLimit(userId: string, metric: string, quantity: number): Promise<{
    allowed: boolean
    limit: number
    current: number
    remaining: number
  }> {
    // This would use the tierLimits.checkTierLimit function
    // For now, return a basic implementation
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!profile) {
      return { allowed: false, limit: 0, current: 0, remaining: 0 }
    }

    // Delegate to the existing tierLimits module
    const { checkTierLimit } = await import('@/lib/tierLimits')
    return checkTierLimit(userId, metric as 'documents_created' | 'conversions' | 'storage_bytes', quantity)
  }

  async trackUsage(userId: string, metric: string, quantity: number): Promise<void> {
    await (this.supabase.from('usage_records').insert({
      user_id: userId,
      metric,
      quantity,
    }) as any)
  }
}

export class SupabaseDocumentRepository implements DocumentRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async create(userId: string, data: DocumentCreateData): Promise<Document> {
    const { data: doc, error } = await (this.supabase
      .from('documents')
      .insert({
        user_id: userId,
        ...data,
      })
      .select()
      .single() as any)

    if (error) throw error
    return doc as Document
  }

  async findById(id: string, userId: string): Promise<Document | null> {
    const { data } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    return data as Document | null
  }

  async findByStoragePath(path: string, userId: string): Promise<Document | null> {
    const { data } = await this.supabase
      .from('documents')
      .select('*')
      .eq('storage_path', path)
      .eq('user_id', userId)
      .single()

    return data as Document | null
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  }

  async update(id: string, userId: string, data: Partial<Document>): Promise<Document> {
    const { data: doc, error } = await (this.supabase
      .from('documents')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single() as any)

    if (error) throw error
    return doc as Document
  }

  async list(userId: string, options: DocumentListOptions = {}): Promise<{ documents: Document[]; count: number }> {
    const { page = 1, limit = 20, search, category, status } = options
    const offset = (page - 1) * limit

    let query = this.supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { documents: (data as Document[]) || [], count: count ?? 0 }
  }
}

export class SupabaseTemplateRepository implements TemplateRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async create(userId: string, data: TemplateCreateData): Promise<Template> {
    const { data: template, error } = await this.supabase
      .from('templates')
      .insert({
        user_id: userId,
        ...data,
      })
      .select()
      .single()

    if (error) throw error
    return template as Template
  }

  async findById(id: string): Promise<Template | null> {
    const { data } = await this.supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single()

    return data as Template | null
  }

  async findByUserId(userId: string, options: TemplateListOptions = {}): Promise<{ templates: Template[]; count: number }> {
    const { page = 1, limit = 20, search, category, is_favorite, is_system } = options
    const offset = (page - 1) * limit

    let query = this.supabase
      .from('templates')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (is_favorite !== undefined) {
      query = query.eq('is_favorite', is_favorite)
    }
    if (is_system !== undefined) {
      query = query.eq('is_system', is_system)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { templates: (data as Template[]) || [], count: count ?? 0 }
  }

  async findPublic(options: TemplateListOptions = {}): Promise<{ templates: Template[]; count: number }> {
    const { page = 1, limit = 20, search, category, is_favorite, is_system } = options
    const offset = (page - 1) * limit

    let query = this.supabase
      .from('templates')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (is_favorite !== undefined) {
      query = query.eq('is_favorite', is_favorite)
    }
    if (is_system !== undefined) {
      query = query.eq('is_system', is_system)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { templates: (data as Template[]) || [], count: count ?? 0 }
  }

  async update(id: string, userId: string, data: Partial<Template>): Promise<Template> {
    const { data: template, error } = await this.supabase
      .from('templates')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return template as Template
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  }

  async incrementUsage(id: string): Promise<void> {
    await this.supabase.rpc('increment_template_usage', { template_id: id })
  }
}

export class SupabaseConversionJobRepository implements ConversionJobRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async create(data: ConversionJobCreateData): Promise<ConversionJob> {
    const { data: job, error } = await this.supabase
      .from('conversion_jobs')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return job as ConversionJob
  }

  async findById(id: string): Promise<ConversionJob | null> {
    const { data } = await this.supabase
      .from('conversion_jobs')
      .select('*')
      .eq('id', id)
      .single()

    return data as ConversionJob | null
  }

  async findByUserId(userId: string, options: ConversionJobListOptions = {}): Promise<{ jobs: ConversionJob[]; count: number }> {
    const { page = 1, limit = 20, status } = options
    const offset = (page - 1) * limit

    let query = this.supabase
      .from('conversion_jobs')
      .select('*, source_document:documents(title)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { jobs: (data as ConversionJob[]) || [], count: count ?? 0 }
  }

  async updateStatus(id: string, status: string, data: Partial<ConversionJob> = {}): Promise<ConversionJob> {
    const { data: job, error } = await this.supabase
      .from('conversion_jobs')
      .update({ status, ...data })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return job as ConversionJob
  }
}

export class SupabaseWebhookRepository implements WebhookRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async create(userId: string, data: WebhookCreateData): Promise<WebhookEndpoint> {
    const { data: endpoint, error } = await this.supabase
      .from('webhook_endpoints')
      .insert({
        user_id: userId,
        ...data,
      })
      .select()
      .single()

    if (error) throw error
    return endpoint as WebhookEndpoint
  }

  async findByUserId(userId: string): Promise<WebhookEndpoint[]> {
    const { data } = await this.supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return (data as WebhookEndpoint[]) || []
  }

  async findById(id: string, userId: string): Promise<WebhookEndpoint | null> {
    const { data } = await this.supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    return data as WebhookEndpoint | null
  }

  async update(id: string, userId: string, data: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    const { data: endpoint, error } = await this.supabase
      .from('webhook_endpoints')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return endpoint as WebhookEndpoint
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  }

  async findActiveByUserId(userId: string): Promise<WebhookEndpoint[]> {
    const { data } = await this.supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    return (data as WebhookEndpoint[]) || []
  }
}

export class SupabaseAuditRepository implements AuditRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async insert(event: AuditEventInput): Promise<void> {
    const { error } = await this.supabase.from('audit_logs').insert({
      user_id: event.user_id,
      action: event.action,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      old_values: event.old_values,
      new_values: event.new_values,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      severity: event.severity,
    })

    if (error) throw error
  }

  async findByUserId(userId: string, options: AuditListOptions = {}): Promise<{ events: AuditEvent[]; count: number }> {
    const { page = 1, limit = 50, action, severity, fromDate, toDate } = options
    const offset = (page - 1) * limit

    let query = this.supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (action) {
      query = query.ilike('action', `%${action}%`)
    }
    if (severity) {
      query = query.eq('severity', severity)
    }
    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }
    if (toDate) {
      query = query.lte('created_at', toDate)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { events: (data as AuditEvent[]) || [], count: count ?? 0 }
  }
}