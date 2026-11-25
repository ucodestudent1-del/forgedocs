export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: string
          tier: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          tier?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          tier?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      usage_records: {
        Row: {
          id: string
          user_id: string
          metric: string
          quantity: number
          recorded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          metric: string
          quantity?: number
          recorded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          metric?: string
          quantity?: number
          recorded_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          user_id: string | null
          is_public: boolean
          name: string
          description: string | null
          category: string | null
          source_url: string
          placeholder_schema: Json
          preview_url: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          is_public?: boolean
          name: string
          description?: string | null
          category?: string | null
          source_url: string
          placeholder_schema?: Json
          preview_url?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          is_public?: boolean
          name?: string
          description?: string | null
          category?: string | null
          source_url?: string
          placeholder_schema?: Json
          preview_url?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          template_id: string | null
          parent_id: string | null
          title: string
          description: string | null
          content: Json | null
          storage_path: string
          mime_type: string
          file_size: number
          page_count: number | null
          is_archived: boolean
          is_pinned: boolean
          version: number
          encryption_key_wrapped: string | null
          encryption_iv: string | null
          encryption_algorithm: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id?: string | null
          template_id?: string | null
          parent_id?: string | null
          title: string
          description?: string | null
          content?: Json | null
          storage_path: string
          mime_type?: string
          file_size?: number
          page_count?: number | null
          is_archived?: boolean
          is_pinned?: boolean
          version?: number
          encryption_key_wrapped?: string | null
          encryption_iv?: string | null
          encryption_algorithm?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string | null
          template_id?: string | null
          parent_id?: string | null
          title?: string
          description?: string | null
          content?: Json | null
          storage_path?: string
          mime_type?: string
          file_size?: number
          page_count?: number | null
          is_archived?: boolean
          is_pinned?: boolean
          version?: number
          encryption_key_wrapped?: string | null
          encryption_iv?: string | null
          encryption_algorithm?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      document_presence: {
        Row: {
          id: string
          document_id: string
          user_id: string
          user_name: string | null
          user_avatar_url: string | null
          cursor_position: Json
          selection: Json
          last_seen_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          user_name?: string | null
          user_avatar_url?: string | null
          cursor_position?: Json
          selection?: Json
          last_seen_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          user_name?: string | null
          user_avatar_url?: string | null
          cursor_position?: Json
          selection?: Json
          last_seen_at?: string
        }
      }
      saml_providers: {
        Row: {
          id: string
          user_id: string
          entity_id: string
          sso_url: string
          x509_certificate: string
          name_id_format: string | null
          attribute_mapping: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entity_id: string
          sso_url: string
          x509_certificate: string
          name_id_format?: string | null
          attribute_mapping?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entity_id?: string
          sso_url?: string
          x509_certificate?: string
          name_id_format?: string | null
          attribute_mapping?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      saml_relay_states: {
        Row: {
          id: string
          relay_state: string
          user_id: string
          provider_id: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          relay_state: string
          user_id: string
          provider_id: string
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          relay_state?: string
          user_id?: string
          provider_id?: string
          expires_at?: string
          created_at?: string
        }
      }
      saml_accounts: {
        Row: {
          id: string
          user_id: string
          provider_id: string
          external_id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider_id: string
          external_id: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider_id?: string
          external_id?: string
          email?: string
          created_at?: string
        }
      }
      custom_domains: {
        Row: {
          id: string
          user_id: string
          hostname: string
          dns_verified: boolean
          verification_token: string | null
          ssl_certificate: string | null
          ssl_private_key: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          hostname: string
          dns_verified?: boolean
          verification_token?: string | null
          ssl_certificate?: string | null
          ssl_private_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          hostname?: string
          dns_verified?: boolean
          verification_token?: string | null
          ssl_certificate?: string | null
          ssl_private_key?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      webhook_endpoints: {
        Row: {
          id: string
          user_id: string
          url: string
          secret: string
          events: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          secret: string
          events?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          secret?: string
          events?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      webhook_deliveries: {
        Row: {
          id: string
          endpoint_id: string
          event: string
          payload: Json
          response_status: number | null
          response_body: string | null
          created_at: string
        }
        Insert: {
          id?: string
          endpoint_id: string
          event: string
          payload?: Json
          response_status?: number | null
          response_body?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          endpoint_id?: string
          event?: string
          payload?: Json
          response_status?: number | null
          response_body?: string | null
          created_at?: string
        }
      }
      user_integrations: {
        Row: {
          id: string
          user_id: string
          integration_id: string
          access_token_encrypted: string | null
          refresh_token_encrypted: string | null
          scopes: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          integration_id: string
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          integration_id?: string
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      batch_job_tasks: {
        Row: {
          id: string
          batch_job_id: string
          task_type: string
          input: Json
          output: Json | null
          status: string
          error_message: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          batch_job_id: string
          task_type: string
          input?: Json
          output?: Json | null
          status?: string
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          batch_job_id?: string
          task_type?: string
          input?: Json
          output?: Json | null
          status?: string
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      mfa_profiles: {
        Row: {
          id: string
          user_id: string
          totp_secret: string | null
          totp_secret_encrypted: string | null
          enabled: boolean
          backup_codes: string[] | null
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          totp_secret?: string | null
          totp_secret_encrypted?: string | null
          enabled?: boolean
          backup_codes?: string[] | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          totp_secret?: string | null
          totp_secret_encrypted?: string | null
          enabled?: boolean
          backup_codes?: string[] | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      document_collab_snapshots: {
        Row: {
          id: string
          document_id: string
          yjs_state: Json
          version_number: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          yjs_state?: Json
          version_number?: number
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          yjs_state?: Json
          version_number?: number
          created_by?: string | null
          created_at?: string
        }
      }
      document_versions: {
        Row: {
          id: string
          document_id: string
          version: number
          content: Json | null
          storage_path: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          version: number
          content?: Json | null
          storage_path?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          version?: number
          content?: Json | null
          storage_path?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      document_shares: {
        Row: {
          id: string
          document_id: string
          shared_with: string | null
          permission: string
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          shared_with?: string | null
          permission?: string
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          shared_with?: string | null
          permission?: string
          created_at?: string
        }
      }
      conversion_jobs: {
        Row: {
          id: string
          user_id: string
          source_document_id: string | null
          source_url: string
          target_format: string
          status: string
          output_url: string | null
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_document_id?: string | null
          source_url: string
          target_format: string
          status?: string
          output_url?: string | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source_document_id?: string | null
          source_url?: string
          target_format?: string
          status?: string
          output_url?: string | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      batch_jobs: {
        Row: {
          id: string
          user_id: string
          name: string | null
          status: string
          total_tasks: number
          completed_tasks: number
          failed_tasks: number
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name?: string | null
          status?: string
          total_tasks?: number
          completed_tasks?: number
          failed_tasks?: number
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string | null
          status?: string
          total_tasks?: number
          completed_tasks?: number
          failed_tasks?: number
          created_at?: string
          completed_at?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          metadata?: Json
          ip_address?: string | null
          created_at?: string
        }
      }
      support_tickets: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company: string | null
          subject: string | null
          message: string
          status: string
          source: string
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          company?: string | null
          subject?: string | null
          message: string
          status?: string
          source?: string
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company?: string | null
          subject?: string | null
          message?: string
          status?: string
          source?: string
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type Json = string | number | boolean | null | { [key: string]: Json } | Json[]
