export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analysis_results: {
        Row: {
          consultation_id: string
          created_at: string | null
          env_factors: string | null
          icf_codes: Json | null
          icf_codes_deprecated: Json | null
          id: string
          identified_problems: string | null
          summary: string | null
        }
        Insert: {
          consultation_id: string
          created_at?: string | null
          env_factors?: string | null
          icf_codes?: Json | null
          icf_codes_deprecated?: Json | null
          id?: string
          identified_problems?: string | null
          summary?: string | null
        }
        Update: {
          consultation_id?: string
          created_at?: string | null
          env_factors?: string | null
          icf_codes?: Json | null
          icf_codes_deprecated?: Json | null
          id?: string
          identified_problems?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_analysis_consultation"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_analysis_consultation"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "view_consultation_icf_codes_detail"
            referencedColumns: ["consultation_id"]
          },
          {
            foreignKeyName: "fk_analysis_consultation"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "view_consultation_icf_codes_jsonb"
            referencedColumns: ["consultation_id"]
          },
        ]
      }
      categories: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          level: number | null
          name: string
          name_en: string | null
          parent_code: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name: string
          name_en?: string | null
          parent_code?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name?: string
          name_en?: string | null
          parent_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_categories_parent"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fk_categories_parent"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "view_products_with_codes"
            referencedColumns: ["category_code"]
          },
        ]
      }
      chat_messages: {
        Row: {
          consultation_id: string
          created_at: string | null
          id: string
          message_text: string
          sender: string
        }
        Insert: {
          consultation_id: string
          created_at?: string | null
          id?: string
          message_text: string
          sender: string
        }
        Update: {
          consultation_id?: string
          created_at?: string | null
          id?: string
          message_text?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_chat_consultation"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat_consultation"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_detail"
            referencedColumns: ["consultation_id"]
          },
          {
            foreignKeyName: "fk_chat_consultation"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_jsonb"
            referencedColumns: ["consultation_id"]
          },
        ]
      }
      consultation_feedback: {
        Row: {
          accuracy_rating: number
          consultation_id: string
          created_at: string | null
          feedback_comment: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy_rating: number
          consultation_id: string
          created_at?: string | null
          feedback_comment?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy_rating?: number
          consultation_id?: string
          created_at?: string | null
          feedback_comment?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_feedback_consultation"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feedback_consultation"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "view_consultation_icf_codes_detail"
            referencedColumns: ["consultation_id"]
          },
          {
            foreignKeyName: "fk_feedback_consultation"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "view_consultation_icf_codes_jsonb"
            referencedColumns: ["consultation_id"]
          },
          {
            foreignKeyName: "fk_feedback_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feedback_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_user_analytics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      consultation_icf_codes: {
        Row: {
          confidence_score: number | null
          consultation_id: string
          context: Json | null
          created_at: string | null
          icf_code_id: string
          id: string
          source: string
        }
        Insert: {
          confidence_score?: number | null
          consultation_id: string
          context?: Json | null
          created_at?: string | null
          icf_code_id: string
          id?: string
          source?: string
        }
        Update: {
          confidence_score?: number | null
          consultation_id?: string
          context?: Json | null
          created_at?: string | null
          icf_code_id?: string
          id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_consultation_icf_code"
            columns: ["icf_code_id"]
            isOneToOne: false
            referencedRelation: "icf_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_consultation_icf_code"
            columns: ["icf_code_id"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_detail"
            referencedColumns: ["icf_code_id"]
          },
          {
            foreignKeyName: "fk_consultation_icf_consultation"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_consultation_icf_consultation"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_detail"
            referencedColumns: ["consultation_id"]
          },
          {
            foreignKeyName: "fk_consultation_icf_consultation"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_jsonb"
            referencedColumns: ["consultation_id"]
          },
        ]
      }
      consultations: {
        Row: {
          created_at: string | null
          disability_severity: string | null
          disability_type: string | null
          id: string
          ippa_activities: Json | null
          is_favorite: boolean | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          disability_severity?: string | null
          disability_type?: string | null
          id?: string
          ippa_activities?: Json | null
          is_favorite?: boolean | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          disability_severity?: string | null
          disability_type?: string | null
          id?: string
          ippa_activities?: Json | null
          is_favorite?: boolean | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_consultations_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_consultations_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_user_analytics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conversion_events: {
        Row: {
          commission_amount: number | null
          consultation_id: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          product_id: string | null
          purchase_amount: number | null
          purchase_date: string | null
          recommendation_id: string | null
          source: string | null
          tracking_source: string | null
          user_id: string | null
        }
        Insert: {
          commission_amount?: number | null
          consultation_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          purchase_amount?: number | null
          purchase_date?: string | null
          recommendation_id?: string | null
          source?: string | null
          tracking_source?: string | null
          user_id?: string | null
        }
        Update: {
          commission_amount?: number | null
          consultation_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          purchase_amount?: number | null
          purchase_date?: string | null
          recommendation_id?: string | null
          source?: string | null
          tracking_source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_conversion_consultation"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversion_consultation"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_detail"
            referencedColumns: ["consultation_id"]
          },
          {
            foreignKeyName: "fk_conversion_consultation"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_jsonb"
            referencedColumns: ["consultation_id"]
          },
          {
            foreignKeyName: "fk_conversion_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mv_icf_iso_product_matches"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_conversion_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_quality_scores"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_conversion_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversion_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_conversion_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_products_with_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversion_recommendation"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversion_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversion_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_user_analytics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_purchase_amount: number | null
          name: string
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_purchase_amount?: number | null
          name: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from: string
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_purchase_amount?: number | null
          name?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      icf_code_statistics: {
        Row: {
          associated_iso_codes: string[] | null
          associated_keywords: string[] | null
          category: string
          first_seen_at: string | null
          icf_code: string
          is_in_core_set: boolean
          last_seen_at: string | null
          total_usage_count: number
          unique_consultations: number
          updated_at: string
          usage_by_source: Json | null
        }
        Insert: {
          associated_iso_codes?: string[] | null
          associated_keywords?: string[] | null
          category: string
          first_seen_at?: string | null
          icf_code: string
          is_in_core_set?: boolean
          last_seen_at?: string | null
          total_usage_count?: number
          unique_consultations?: number
          updated_at?: string
          usage_by_source?: Json | null
        }
        Update: {
          associated_iso_codes?: string[] | null
          associated_keywords?: string[] | null
          category?: string
          first_seen_at?: string | null
          icf_code?: string
          is_in_core_set?: boolean
          last_seen_at?: string | null
          total_usage_count?: number
          unique_consultations?: number
          updated_at?: string
          usage_by_source?: Json | null
        }
        Relationships: []
      }
      icf_code_usage_logs: {
        Row: {
          category: string
          consultation_id: string | null
          context: Json | null
          created_at: string
          icf_code: string
          id: string
          is_in_core_set: boolean
          source: string
        }
        Insert: {
          category: string
          consultation_id?: string | null
          context?: Json | null
          created_at?: string
          icf_code: string
          id?: string
          is_in_core_set?: boolean
          source: string
        }
        Update: {
          category?: string
          consultation_id?: string | null
          context?: Json | null
          created_at?: string
          icf_code?: string
          id?: string
          is_in_core_set?: boolean
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "icf_code_usage_logs_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icf_code_usage_logs_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_detail"
            referencedColumns: ["consultation_id"]
          },
          {
            foreignKeyName: "icf_code_usage_logs_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_jsonb"
            referencedColumns: ["consultation_id"]
          },
        ]
      }
      icf_codes: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_in_core_set: boolean | null
          level: number | null
          name: string | null
          name_en: string | null
          parent_code: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_in_core_set?: boolean | null
          level?: number | null
          name?: string | null
          name_en?: string | null
          parent_code?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_in_core_set?: boolean | null
          level?: number | null
          name?: string | null
          name_en?: string | null
          parent_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_icf_codes_parent"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "icf_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fk_icf_codes_parent"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_detail"
            referencedColumns: ["icf_code"]
          },
        ]
      }
      icf_iso_mappings: {
        Row: {
          base_score: number | null
          confidence: number | null
          created_at: string | null
          description: string | null
          icf_codes: string[]
          id: string
          is_active: boolean | null
          iso_code: string
          iso_code_id: string | null
          label: string
          source: string | null
          updated_at: string | null
        }
        Insert: {
          base_score?: number | null
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          icf_codes: string[]
          id?: string
          is_active?: boolean | null
          iso_code: string
          iso_code_id?: string | null
          label: string
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          base_score?: number | null
          confidence?: number | null
          created_at?: string | null
          description?: string | null
          icf_codes?: string[]
          id?: string
          is_active?: boolean | null
          iso_code?: string
          iso_code_id?: string | null
          label?: string
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "icf_iso_mappings_iso_code_id_fkey"
            columns: ["iso_code_id"]
            isOneToOne: false
            referencedRelation: "iso_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      icf_iso_precomputed_mappings: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          icf_codes: string[]
          icf_codes_key: string
          id: string
          iso_matches: Json
          last_used_at: string | null
          match_method: string | null
          success_rate: number | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          icf_codes: string[]
          icf_codes_key: string
          id?: string
          iso_matches?: Json
          last_used_at?: string | null
          match_method?: string | null
          success_rate?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          icf_codes?: string[]
          icf_codes_key?: string
          id?: string
          iso_matches?: Json
          last_used_at?: string | null
          match_method?: string | null
          success_rate?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      ippa_evaluations: {
        Row: {
          activity_scores: Json | null
          effectiveness_score: number | null
          evaluated_at: string | null
          feedback_comment: string | null
          id: string
          problem_description: string | null
          product_id: string
          recommendation_id: string | null
          score_difficulty_post: number
          score_difficulty_pre: number
          score_importance: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_scores?: Json | null
          effectiveness_score?: number | null
          evaluated_at?: string | null
          feedback_comment?: string | null
          id?: string
          problem_description?: string | null
          product_id: string
          recommendation_id?: string | null
          score_difficulty_post: number
          score_difficulty_pre: number
          score_importance?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_scores?: Json | null
          effectiveness_score?: number | null
          evaluated_at?: string | null
          feedback_comment?: string | null
          id?: string
          problem_description?: string | null
          product_id?: string
          recommendation_id?: string | null
          score_difficulty_post?: number
          score_difficulty_pre?: number
          score_importance?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ippa_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mv_icf_iso_product_matches"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_ippa_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_quality_scores"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_ippa_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ippa_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_ippa_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_products_with_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ippa_recommendation"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ippa_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ippa_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_user_analytics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      iso_codes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          level: number | null
          name: string
          parent_code: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name: string
          parent_code?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name?: string
          parent_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_iso_codes_parent"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "iso_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fk_iso_codes_parent"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "mv_icf_iso_product_matches"
            referencedColumns: ["product_iso_code"]
          },
          {
            foreignKeyName: "fk_iso_codes_parent"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "view_iso_code_stats"
            referencedColumns: ["iso_code"]
          },
          {
            foreignKeyName: "fk_iso_codes_parent"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "view_product_stats"
            referencedColumns: ["iso_code"]
          },
          {
            foreignKeyName: "fk_iso_codes_parent"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "view_products_with_codes"
            referencedColumns: ["iso_code"]
          },
        ]
      }
      manufacturers: {
        Row: {
          code: string
          country: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          code: string
          country?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          code?: string
          country?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      matching_performance_logs: {
        Row: {
          analysis_summary: string | null
          average_match_score: number | null
          consultation_id: string | null
          created_at: string | null
          execution_time_ms: number | null
          feedback_rating: number | null
          icf_code_count: number
          icf_codes: string[]
          id: string
          knowledge_graph_used: boolean | null
          match_count: number
          matched_iso_codes: string[]
          purchase_completed: boolean | null
          recommendation_clicked: boolean | null
          semantic_match_used: boolean | null
          top_match_score: number | null
          updated_at: string | null
          user_id: string | null
          weight_config_id: string | null
          weight_config_name: string | null
        }
        Insert: {
          analysis_summary?: string | null
          average_match_score?: number | null
          consultation_id?: string | null
          created_at?: string | null
          execution_time_ms?: number | null
          feedback_rating?: number | null
          icf_code_count: number
          icf_codes: string[]
          id?: string
          knowledge_graph_used?: boolean | null
          match_count: number
          matched_iso_codes: string[]
          purchase_completed?: boolean | null
          recommendation_clicked?: boolean | null
          semantic_match_used?: boolean | null
          top_match_score?: number | null
          updated_at?: string | null
          user_id?: string | null
          weight_config_id?: string | null
          weight_config_name?: string | null
        }
        Update: {
          analysis_summary?: string | null
          average_match_score?: number | null
          consultation_id?: string | null
          created_at?: string | null
          execution_time_ms?: number | null
          feedback_rating?: number | null
          icf_code_count?: number
          icf_codes?: string[]
          id?: string
          knowledge_graph_used?: boolean | null
          match_count?: number
          matched_iso_codes?: string[]
          purchase_completed?: boolean | null
          recommendation_clicked?: boolean | null
          semantic_match_used?: boolean | null
          top_match_score?: number | null
          updated_at?: string | null
          user_id?: string | null
          weight_config_id?: string | null
          weight_config_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matching_performance_logs_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_performance_logs_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_detail"
            referencedColumns: ["consultation_id"]
          },
          {
            foreignKeyName: "matching_performance_logs_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_jsonb"
            referencedColumns: ["consultation_id"]
          },
          {
            foreignKeyName: "matching_performance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_performance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_user_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "matching_performance_logs_weight_config_id_fkey"
            columns: ["weight_config_id"]
            isOneToOne: false
            referencedRelation: "matching_weight_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      matching_weight_configs: {
        Row: {
          ab_test_name: string | null
          ab_test_traffic_percentage: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_ab_test_variant: boolean | null
          is_active: boolean | null
          is_default: boolean | null
          min_score: number | null
          name: string
          similarity_threshold: number | null
          top_k: number | null
          updated_at: string | null
          weight_keyword: number
          weight_knowledge_graph: number
          weight_rule_based: number
          weight_semantic: number
        }
        Insert: {
          ab_test_name?: string | null
          ab_test_traffic_percentage?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_ab_test_variant?: boolean | null
          is_active?: boolean | null
          is_default?: boolean | null
          min_score?: number | null
          name: string
          similarity_threshold?: number | null
          top_k?: number | null
          updated_at?: string | null
          weight_keyword?: number
          weight_knowledge_graph?: number
          weight_rule_based?: number
          weight_semantic?: number
        }
        Update: {
          ab_test_name?: string | null
          ab_test_traffic_percentage?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_ab_test_variant?: boolean | null
          is_active?: boolean | null
          is_default?: boolean | null
          min_score?: number | null
          name?: string
          similarity_threshold?: number | null
          top_k?: number | null
          updated_at?: string | null
          weight_keyword?: number
          weight_knowledge_graph?: number
          weight_rule_based?: number
          weight_semantic?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link_url: string | null
          message: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_user_analytics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      performance_web_vitals: {
        Row: {
          connection_type: string | null
          created_at: string | null
          device_memory: number | null
          hardware_concurrency: number | null
          id: string
          metric_name: string
          metric_rating: string
          metric_value: number
          page_path: string
          page_url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          connection_type?: string | null
          created_at?: string | null
          device_memory?: number | null
          hardware_concurrency?: number | null
          id?: string
          metric_name: string
          metric_rating: string
          metric_value: number
          page_path: string
          page_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          connection_type?: string | null
          created_at?: string | null
          device_memory?: number | null
          hardware_concurrency?: number | null
          id?: string
          metric_name?: string
          metric_rating?: string
          metric_value?: number
          page_path?: string
          page_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_web_vitals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_web_vitals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_user_analytics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          points: number
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_point_transaction_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_point_transaction_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_user_analytics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          embedding: string | null
          embedding_updated_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          iso_code_id: string | null
          manufacturer: string | null
          manufacturer_id: string | null
          name: string
          price: number | null
          purchase_link: string | null
          rating: number | null
          review_count: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          embedding_updated_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          iso_code_id?: string | null
          manufacturer?: string | null
          manufacturer_id?: string | null
          name: string
          price?: number | null
          purchase_link?: string | null
          rating?: number | null
          review_count?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          embedding_updated_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          iso_code_id?: string | null
          manufacturer?: string | null
          manufacturer_id?: string | null
          name?: string
          price?: number | null
          purchase_link?: string | null
          rating?: number | null
          review_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_products_iso_code"
            columns: ["iso_code_id"]
            isOneToOne: false
            referencedRelation: "iso_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_products_manufacturer"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      realtime_learning_configs: {
        Row: {
          click_rate_boost_factor: number | null
          click_rate_threshold: number | null
          created_at: string | null
          created_by: string | null
          decay_factor: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          learning_rate: number
          max_weight_boost: number | null
          min_sample_count: number
          min_weight_penalty: number | null
          name: string
          purchase_rate_boost_factor: number | null
          updated_at: string | null
        }
        Insert: {
          click_rate_boost_factor?: number | null
          click_rate_threshold?: number | null
          created_at?: string | null
          created_by?: string | null
          decay_factor?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          learning_rate?: number
          max_weight_boost?: number | null
          min_sample_count?: number
          min_weight_penalty?: number | null
          name: string
          purchase_rate_boost_factor?: number | null
          updated_at?: string | null
        }
        Update: {
          click_rate_boost_factor?: number | null
          click_rate_threshold?: number | null
          created_at?: string | null
          created_by?: string | null
          decay_factor?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          learning_rate?: number
          max_weight_boost?: number | null
          min_sample_count?: number
          min_weight_penalty?: number | null
          name?: string
          purchase_rate_boost_factor?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          consultation_id: string
          created_at: string | null
          id: string
          is_clicked: boolean | null
          match_reason: string | null
          product_id: string
          purchase_amount: number | null
          purchase_completed: boolean | null
          purchase_completed_at: string | null
          rank: number | null
        }
        Insert: {
          consultation_id: string
          created_at?: string | null
          id?: string
          is_clicked?: boolean | null
          match_reason?: string | null
          product_id: string
          purchase_amount?: number | null
          purchase_completed?: boolean | null
          purchase_completed_at?: string | null
          rank?: number | null
        }
        Update: {
          consultation_id?: string
          created_at?: string | null
          id?: string
          is_clicked?: boolean | null
          match_reason?: string | null
          product_id?: string
          purchase_amount?: number | null
          purchase_completed?: boolean | null
          purchase_completed_at?: string | null
          rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_recommendation_consultation"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_recommendation_consultation"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_detail"
            referencedColumns: ["consultation_id"]
          },
          {
            foreignKeyName: "fk_recommendation_consultation"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "view_consultation_icf_codes_jsonb"
            referencedColumns: ["consultation_id"]
          },
          {
            foreignKeyName: "fk_recommendation_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mv_icf_iso_product_matches"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_recommendation_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_quality_scores"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_recommendation_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_recommendation_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_product_stats"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_recommendation_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_products_with_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coupons: {
        Row: {
          coupon_id: string
          created_at: string | null
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_coupon_coupon"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_coupon_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_coupon_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_user_analytics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          clerk_id: string
          created_at: string | null
          email: string
          id: string
          name: string | null
          points: number | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          clerk_id: string
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          points?: number | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          clerk_id?: string
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          points?: number | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      icf_code_expansion_priority: {
        Row: {
          category: string | null
          first_seen_at: string | null
          icf_code: string | null
          is_in_core_set: boolean | null
          last_seen_at: string | null
          priority_score: number | null
          total_usage_count: number | null
          unique_consultations: number | null
          usage_by_source: Json | null
        }
        Insert: {
          category?: string | null
          first_seen_at?: string | null
          icf_code?: string | null
          is_in_core_set?: boolean | null
          last_seen_at?: string | null
          priority_score?: never
          total_usage_count?: number | null
          unique_consultations?: number | null
          usage_by_source?: Json | null
        }
        Update: {
          category?: string | null
          first_seen_at?: string | null
          icf_code?: string | null
          is_in_core_set?: boolean | null
          last_seen_at?: string | null
          priority_score?: never
          total_usage_count?: number | null
          unique_consultations?: number | null
          usage_by_source?: Json | null
        }
        Relationships: []
      }
      mv_icf_iso_product_matches: {
        Row: {
          base_score: number | null
          category: string | null
          icf_codes: string[] | null
          image_url: string | null
          iso_label: string | null
          manufacturer: string | null
          mapping_description: string | null
          mapping_id: string | null
          mapping_iso_code: string | null
          mapping_iso_code_id: string | null
          mapping_iso_level: number | null
          mapping_label: string | null
          match_score: number | null
          match_type: string | null
          price: number | null
          product_active: boolean | null
          product_created_at: string | null
          product_description: string | null
          product_id: string | null
          product_iso_code: string | null
          product_iso_code_id: string | null
          product_name: string | null
          purchase_link: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_iso_code"
            columns: ["product_iso_code_id"]
            isOneToOne: false
            referencedRelation: "iso_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icf_iso_mappings_iso_code_id_fkey"
            columns: ["mapping_iso_code_id"]
            isOneToOne: false
            referencedRelation: "iso_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_quality_scores: {
        Row: {
          average_effectiveness_score: number | null
          average_feedback_rating: number | null
          click_through_rate: number | null
          iso_code_id: string | null
          last_updated_at: string | null
          overall_quality_score: number | null
          product_id: string | null
          product_name: string | null
          total_clicks: number | null
          total_evaluations: number | null
          total_feedbacks: number | null
          total_recommendations: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_iso_code"
            columns: ["iso_code_id"]
            isOneToOne: false
            referencedRelation: "iso_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      view_ab_test_matching_results: {
        Row: {
          ab_test_name: string | null
          active_days: number | null
          avg_average_match_score: number | null
          avg_execution_time_ms: number | null
          avg_feedback_rating: number | null
          avg_match_count: number | null
          avg_top_match_score: number | null
          click_through_rate: number | null
          clicked_count: number | null
          first_match_at: string | null
          last_match_at: string | null
          purchase_conversion_rate: number | null
          purchase_count: number | null
          total_matches: number | null
          variant_name: string | null
          weight_keyword: number | null
          weight_knowledge_graph: number | null
          weight_rule_based: number | null
          weight_semantic: number | null
        }
        Relationships: []
      }
      view_consultation_icf_codes_detail: {
        Row: {
          category: string | null
          confidence_score: number | null
          consultation_id: string | null
          context: Json | null
          created_at: string | null
          description: string | null
          icf_code: string | null
          icf_code_id: string | null
          icf_code_name: string | null
          icf_code_name_en: string | null
          is_in_core_set: boolean | null
          relation_id: string | null
          source: string | null
        }
        Relationships: []
      }
      view_consultation_icf_codes_jsonb: {
        Row: {
          consultation_id: string | null
          icf_codes: Json | null
        }
        Relationships: []
      }
      view_daily_stats: {
        Row: {
          clicked_count: number | null
          recommendations_count: number | null
          stat_date: string | null
        }
        Relationships: []
      }
      view_iso_code_stats: {
        Row: {
          average_effectiveness_score: number | null
          click_through_rate: number | null
          clicked_recommendations: number | null
          iso_code: string | null
          product_count: number | null
          total_ippa_evaluations: number | null
          total_recommendations: number | null
        }
        Relationships: []
      }
      view_platform_stats: {
        Row: {
          average_effectiveness_score: number | null
          click_through_rate: number | null
          clicked_recommendations: number | null
          completed_consultations: number | null
          consultation_completion_rate: number | null
          ippa_participation_rate: number | null
          last_updated: string | null
          recent_ippa_evaluations: number | null
          recent_recommendations: number | null
          total_consultations: number | null
          total_ippa_evaluations: number | null
          total_recommendations: number | null
        }
        Relationships: []
      }
      view_product_stats: {
        Row: {
          average_effectiveness_score: number | null
          click_through_rate: number | null
          clicked_recommendations: number | null
          iso_code: string | null
          last_recommended_at: string | null
          manufacturer: string | null
          price: number | null
          product_id: string | null
          product_name: string | null
          total_ippa_evaluations: number | null
          total_recommendations: number | null
        }
        Relationships: []
      }
      view_products_with_codes: {
        Row: {
          category: string | null
          category_code: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          iso_code: string | null
          iso_code_id: string | null
          iso_code_name: string | null
          manufacturer: string | null
          manufacturer_code: string | null
          manufacturer_id: string | null
          name: string | null
          price: number | null
          purchase_link: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_products_iso_code"
            columns: ["iso_code_id"]
            isOneToOne: false
            referencedRelation: "iso_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_products_manufacturer"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      view_user_analytics: {
        Row: {
          average_effectiveness_score: number | null
          clicked_recommendations: number | null
          completed_consultations: number | null
          email: string | null
          ippa_participation_rate: number | null
          last_ippa_evaluation_at: string | null
          last_recommendation_at: string | null
          name: string | null
          points: number | null
          role: string | null
          total_consultations: number | null
          total_ippa_evaluations: number | null
          total_recommendations: number | null
          user_created_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      batch_update_realtime_learning_stats: {
        Args: { p_days_back?: number; p_min_events?: number }
        Returns: {
          avg_weight_adjustment: number
          total_events_processed: number
          updated_combinations: number
        }[]
      }
      calculate_period_stats: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          average_effectiveness_score: number
          click_through_rate: number
          clicked_recommendations: number
          completed_consultations: number
          period_end: string
          period_start: string
          total_consultations: number
          total_ippa_evaluations: number
          total_recommendations: number
        }[]
      }
      calculate_user_kpi: {
        Args: { p_user_id: string }
        Returns: {
          average_effectiveness_score: number
          click_through_rate: number
          clicked_recommendations: number
          completed_consultations: number
          ippa_participation_rate: number
          total_consultations: number
          total_ippa_evaluations: number
          total_recommendations: number
          user_id: string
        }[]
      }
      get_consultation_icf_codes: {
        Args: { p_consultation_id: string }
        Returns: {
          category: string
          code: string
          name: string
          source: string
        }[]
      }
      get_current_user_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_icf_combination_patterns: {
        Args: {
          p_days_back?: number
          p_limit?: number
          p_min_frequency?: number
        }
        Returns: {
          avg_feedback_rating: number
          click_rate: number
          frequency: number
          icf_codes: string[]
          icf_codes_key: string
          last_seen_at: string
          preferred_iso_codes: string[]
          purchase_rate: number
          success_rate: number
          unique_consultations: number
        }[]
      }
      get_icf_iso_matching_stats: {
        Args: { p_icf_codes: string[] }
        Returns: {
          avg_score: number
          matched_iso_codes: number
          matched_products: number
          max_score: number
          total_mappings: number
        }[]
      }
      get_product_icf_scores: {
        Args: { p_limit?: number; p_min_score?: number; p_product_id: string }
        Returns: {
          icf_category: string
          icf_code: string
          icf_name: string
          match_method: string
          match_reason: string
          match_score: number
        }[]
      }
      get_product_quality_stats: {
        Args: never
        Returns: {
          avg_quality_score: number
          max_quality_score: number
          min_quality_score: number
          products_with_clicks: number
          products_with_effectiveness: number
          products_with_feedback: number
          total_products: number
        }[]
      }
      get_products_by_icf_codes: {
        Args: { p_icf_codes: string[]; p_limit?: number; p_min_score?: number }
        Returns: {
          category: string
          description: string
          image_url: string
          iso_code: string
          iso_code_id: string
          iso_label: string
          manufacturer: string
          match_reason: string
          match_score: number
          price: number
          product_id: string
          product_name: string
          purchase_link: string
        }[]
      }
      get_products_by_icf_codes_with_cache: {
        Args: {
          p_icf_codes: string[]
          p_limit?: number
          p_min_score?: number
          p_use_precomputed?: boolean
        }
        Returns: {
          category: string
          description: string
          image_url: string
          iso_code: string
          iso_code_id: string
          iso_label: string
          manufacturer: string
          match_reason: string
          match_score: number
          price: number
          product_id: string
          product_name: string
          purchase_link: string
          source: string
        }[]
      }
      get_realtime_weight_adjustment: {
        Args: { p_icf_codes: string[]; p_iso_code: string }
        Returns: {
          click_rate: number
          purchase_rate: number
          sample_count: number
          weight_adjustment: number
        }[]
      }
      is_admin_or_manager: { Args: never; Returns: boolean }
      recommend_products_by_icf: {
        Args: {
          p_icf_codes: string[]
          p_limit?: number
          p_min_score?: number
          p_use_quality_scores?: boolean
        }
        Returns: {
          category: string
          description: string
          final_score: number
          image_url: string
          iso_code: string
          iso_code_id: string
          iso_label: string
          manufacturer: string
          match_reason: string
          match_score: number
          price: number
          product_id: string
          product_name: string
          purchase_link: string
          quality_score: number
          rank: number
        }[]
      }
      refresh_materialized_view: {
        Args: { view_name: string }
        Returns: undefined
      }
      refresh_mv_icf_iso_product_matches: { Args: never; Returns: undefined }
      search_similar_icf_iso_mappings: {
        Args: {
          max_results?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          base_score: number
          icf_codes: string[]
          iso_code: string
          iso_code_id: string
          label: string
          mapping_id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
