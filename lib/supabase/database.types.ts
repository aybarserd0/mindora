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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      client_applications: {
        Row: {
          age: string | null
          availability: string | null
          created_at: string
          duration: string | null
          email: string | null
          id: string
          matched_expert_id: string | null
          name: string
          note: string | null
          phone: string | null
          preference: string | null
          previous_support: string | null
          start_time: string | null
          status: string
          topic: string | null
        }
        Insert: {
          age?: string | null
          availability?: string | null
          created_at?: string
          duration?: string | null
          email?: string | null
          id?: string
          matched_expert_id?: string | null
          name: string
          note?: string | null
          phone?: string | null
          preference?: string | null
          previous_support?: string | null
          start_time?: string | null
          status?: string
          topic?: string | null
        }
        Update: {
          age?: string | null
          availability?: string | null
          created_at?: string
          duration?: string | null
          email?: string | null
          id?: string
          matched_expert_id?: string | null
          name?: string
          note?: string | null
          phone?: string | null
          preference?: string | null
          previous_support?: string | null
          start_time?: string | null
          status?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_applications_matched_expert_id_fkey"
            columns: ["matched_expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_access_tokens: {
        Row: {
          conversation_id: string
          created_at: string
          expires_at: string
          id: string
          revoked: boolean
          role: string
          token: string
          used_at: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          expires_at: string
          id?: string
          revoked?: boolean
          role: string
          token: string
          used_at?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          role?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_access_tokens_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_attachments: {
        Row: {
          conversation_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          message_id: string | null
          mime_type: string
          uploaded_by_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          message_id?: string | null
          mime_type: string
          uploaded_by_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          message_id?: string | null
          mime_type?: string
          uploaded_by_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_attachments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_email_notifications: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_sent_at: string
          recipient_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_sent_at?: string
          recipient_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_sent_at?: string
          recipient_type?: string
        }
        Relationships: []
      }
      conversation_reads: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string
          updated_at: string
          user_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_application_id: string
          created_at: string
          expert_id: string
          id: string
          payment_status: string
          status: string
          updated_at: string
        }
        Insert: {
          client_application_id: string
          created_at?: string
          expert_id: string
          id?: string
          payment_status?: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_application_id?: string
          created_at?: string
          expert_id?: string
          id?: string
          payment_status?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_application_id_fkey"
            columns: ["client_application_id"]
            isOneToOne: false
            referencedRelation: "client_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_access_tokens: {
        Row: {
          created_at: string
          expert_id: string
          expires_at: string
          id: string
          revoked: boolean
          token: string
        }
        Insert: {
          created_at?: string
          expert_id: string
          expires_at: string
          id?: string
          revoked?: boolean
          token: string
        }
        Update: {
          created_at?: string
          expert_id?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_access_tokens_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_availability: {
        Row: {
          buffer_minutes: number
          created_at: string
          day_of_week: number
          end_time: string
          expert_id: string
          id: string
          is_active: boolean
          slot_duration_minutes: number
          start_time: string
          timezone: string
          updated_at: string
        }
        Insert: {
          buffer_minutes?: number
          created_at?: string
          day_of_week: number
          end_time: string
          expert_id: string
          id?: string
          is_active?: boolean
          slot_duration_minutes?: number
          start_time: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          buffer_minutes?: number
          created_at?: string
          day_of_week?: number
          end_time?: string
          expert_id?: string
          id?: string
          is_active?: boolean
          slot_duration_minutes?: number
          start_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      expert_payouts: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          expert_id: string
          id: string
          note: string | null
          paid_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          expert_id: string
          id?: string
          note?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          expert_id?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_payouts_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_verifications: {
        Row: {
          admin_note: string | null
          created_at: string
          document_type: string
          expert_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          reviewed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          document_type: string
          expert_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          document_type?: string
          expert_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_verifications_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      experts: {
        Row: {
          account_type: string
          founding_member: boolean
          founding_until: string | null
          commission_rate: number | null
          areas: string | null
          availability: string | null
          average_rating: number
          bio: string | null
          certificates: string[] | null
          city: string | null
          created_at: string
          education: string[] | null
          email: string
          expectation: string | null
          experience: string | null
          experience_years: number | null
          focus_areas: string[] | null
          full_name: string | null
          iban: string | null
          id: string
          iyzico_submerchant_external_id: string | null
          iyzico_submerchant_key: string | null
          name: string
          note: string | null
          online: string | null
          phone: string | null
          photo_url: string | null
          price: string | null
          profile_image_url: string | null
          public_bio: string | null
          ranking_score: number
          review_count: number
          session_price: number | null
          slug: string | null
          specialties: string[] | null
          status: string
          therapy_approach: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          account_type?: string
          founding_member?: boolean
          founding_until?: string | null
          commission_rate?: number | null
          areas?: string | null
          availability?: string | null
          average_rating?: number
          bio?: string | null
          certificates?: string[] | null
          city?: string | null
          created_at?: string
          education?: string[] | null
          email: string
          expectation?: string | null
          experience?: string | null
          experience_years?: number | null
          focus_areas?: string[] | null
          full_name?: string | null
          iban?: string | null
          id?: string
          iyzico_submerchant_external_id?: string | null
          iyzico_submerchant_key?: string | null
          name: string
          note?: string | null
          online?: string | null
          phone?: string | null
          photo_url?: string | null
          price?: string | null
          profile_image_url?: string | null
          public_bio?: string | null
          ranking_score?: number
          review_count?: number
          session_price?: number | null
          slug?: string | null
          specialties?: string[] | null
          status?: string
          therapy_approach?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: string
          founding_member?: boolean
          founding_until?: string | null
          commission_rate?: number | null
          areas?: string | null
          availability?: string | null
          average_rating?: number
          bio?: string | null
          certificates?: string[] | null
          city?: string | null
          created_at?: string
          education?: string[] | null
          email?: string
          expectation?: string | null
          experience?: string | null
          experience_years?: number | null
          focus_areas?: string[] | null
          full_name?: string | null
          iban?: string | null
          id?: string
          iyzico_submerchant_external_id?: string | null
          iyzico_submerchant_key?: string | null
          name?: string
          note?: string | null
          online?: string | null
          phone?: string | null
          photo_url?: string | null
          price?: string | null
          profile_image_url?: string | null
          public_bio?: string | null
          ranking_score?: number
          review_count?: number
          session_price?: number | null
          slug?: string | null
          specialties?: string[] | null
          status?: string
          therapy_approach?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          flag_reason: string | null
          id: string
          is_flagged: boolean
          message: string
          sender_name: string | null
          sender_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean
          message: string
          sender_name?: string | null
          sender_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean
          message?: string
          sender_name?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string | null
          user_type: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
          user_type: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
          user_type?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          commission_rate: number | null
          booking_id: string | null
          refund_status: string
          refund_amount: number | null
          refund_requested_at: string | null
          refund_error: string | null
          iyzico_refund_id: string | null
          admin_note: string | null
          amount: number
          client_id: string | null
          commission_amount: number
          created_at: string
          expert_amount: number
          expert_id: string | null
          expert_payout_note: string | null
          expert_payout_paid_at: string | null
          expert_payout_status: string
          id: string
          iyzico_conversation_id: string | null
          iyzico_payment_id: string | null
          iyzico_token: string | null
          paid_notified_at: string | null
          payment_page_url: string | null
          refunded_at: string | null
          status: string
        }
        Insert: {
          commission_rate?: number | null
          booking_id?: string | null
          refund_status?: string
          refund_amount?: number | null
          refund_requested_at?: string | null
          refund_error?: string | null
          iyzico_refund_id?: string | null
          admin_note?: string | null
          amount: number
          client_id?: string | null
          commission_amount: number
          created_at?: string
          expert_amount: number
          expert_id?: string | null
          expert_payout_note?: string | null
          expert_payout_paid_at?: string | null
          expert_payout_status?: string
          id?: string
          iyzico_conversation_id?: string | null
          iyzico_payment_id?: string | null
          iyzico_token?: string | null
          paid_notified_at?: string | null
          payment_page_url?: string | null
          refunded_at?: string | null
          status?: string
        }
        Update: {
          commission_rate?: number | null
          booking_id?: string | null
          refund_status?: string
          refund_amount?: number | null
          refund_requested_at?: string | null
          refund_error?: string | null
          iyzico_refund_id?: string | null
          admin_note?: string | null
          amount?: number
          client_id?: string | null
          commission_amount?: number
          created_at?: string
          expert_amount?: number
          expert_id?: string | null
          expert_payout_note?: string | null
          expert_payout_paid_at?: string | null
          expert_payout_status?: string
          id?: string
          iyzico_conversation_id?: string | null
          iyzico_payment_id?: string | null
          iyzico_token?: string | null
          paid_notified_at?: string | null
          payment_page_url?: string | null
          refunded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_expert_fk"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_note: string | null
          booking_id: string | null
          category: string
          conversation_id: string | null
          created_at: string
          description: string | null
          id: string
          reported_user_id: string | null
          reported_user_type: string
          reporter_id: string | null
          reporter_type: string
          session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          booking_id?: string | null
          category: string
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reported_user_id?: string | null
          reported_user_type: string
          reporter_id?: string | null
          reporter_type: string
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          booking_id?: string | null
          category?: string
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reported_user_id?: string | null
          reported_user_type?: string
          reporter_id?: string | null
          reporter_type?: string
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          client_id: string
          conversation_id: string | null
          created_at: string
          expert_id: string
          id: string
          is_approved: boolean
          is_public: boolean
          rating: number
          review_text: string | null
          session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          client_id: string
          conversation_id?: string | null
          created_at?: string
          expert_id: string
          id?: string
          is_approved?: boolean
          is_public?: boolean
          rating: number
          review_text?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          client_id?: string
          conversation_id?: string | null
          created_at?: string
          expert_id?: string
          id?: string
          is_approved?: boolean
          is_public?: boolean
          rating?: number
          review_text?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "session_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_access_tokens: {
        Row: {
          booking_id: string | null
          conversation_id: string | null
          created_at: string
          expires_at: string
          id: string
          revoked_at: string | null
          session_id: string
          token: string
          used_at: string | null
          user_type: string
        }
        Insert: {
          booking_id?: string | null
          conversation_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          session_id: string
          token: string
          used_at?: string | null
          user_type: string
        }
        Update: {
          booking_id?: string | null
          conversation_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          session_id?: string
          token?: string
          used_at?: string | null
          user_type?: string
        }
        Relationships: []
      }
      session_bookings: {
        Row: {
          cancelled_by: string | null
          cancelled_at: string | null
          late_cancellation: boolean
          admin_join_url: string | null
          cancellation_reason: string | null
          client_id: string | null
          client_join_url: string | null
          conversation_id: string | null
          created_at: string
          created_by: string
          expert_id: string
          expert_join_url: string | null
          id: string
          live_session_id: string | null
          reminder_15m_sent_at: string | null
          reminder_1h_sent_at: string | null
          reminder_24h_sent_at: string | null
          rescheduled_from: string | null
          review_email_sent_at: string | null
          scheduled_end_at: string
          scheduled_start_at: string
          session_ready: boolean
          session_ready_at: string | null
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          cancelled_by?: string | null
          cancelled_at?: string | null
          late_cancellation?: boolean
          admin_join_url?: string | null
          cancellation_reason?: string | null
          client_id?: string | null
          client_join_url?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          expert_id: string
          expert_join_url?: string | null
          id?: string
          live_session_id?: string | null
          reminder_15m_sent_at?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          rescheduled_from?: string | null
          review_email_sent_at?: string | null
          scheduled_end_at: string
          scheduled_start_at: string
          session_ready?: boolean
          session_ready_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          cancelled_by?: string | null
          cancelled_at?: string | null
          late_cancellation?: boolean
          admin_join_url?: string | null
          cancellation_reason?: string | null
          client_id?: string | null
          client_join_url?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          expert_id?: string
          expert_join_url?: string | null
          id?: string
          live_session_id?: string | null
          reminder_15m_sent_at?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          rescheduled_from?: string | null
          review_email_sent_at?: string | null
          scheduled_end_at?: string
          scheduled_start_at?: string
          session_ready?: boolean
          session_ready_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_bookings_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "session_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          cancelled_reason: string | null
          client_application_id: string
          conversation_id: string
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          ended_at: string | null
          expert_id: string
          id: string
          notes: string | null
          provider: string
          room_name: string
          scheduled_at: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancelled_reason?: string | null
          client_application_id: string
          conversation_id: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          expert_id: string
          id?: string
          notes?: string | null
          provider?: string
          room_name: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancelled_reason?: string | null
          client_application_id?: string
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          expert_id?: string
          id?: string
          notes?: string | null
          provider?: string
          room_name?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_client_application_id_fkey"
            columns: ["client_application_id"]
            isOneToOne: false
            referencedRelation: "client_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      refresh_expert_rating_stats: {
        Args: { target_expert_id: string }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
