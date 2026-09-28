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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_employees: {
        Row: {
          can_manage_properties: boolean | null
          can_manage_users: boolean | null
          can_verify_documents: boolean | null
          can_view_financials: boolean | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["admin_employee_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          can_manage_properties?: boolean | null
          can_manage_users?: boolean | null
          can_verify_documents?: boolean | null
          can_view_financials?: boolean | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["admin_employee_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          can_manage_properties?: boolean | null
          can_manage_users?: boolean | null
          can_verify_documents?: boolean | null
          can_view_financials?: boolean | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["admin_employee_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      buyer_preferences: {
        Row: {
          created_at: string
          id: string
          max_living_area: number | null
          max_price: number | null
          max_rooms: number | null
          min_living_area: number | null
          min_price: number | null
          min_rooms: number | null
          preferred_cantons: string[] | null
          preferred_cities: string[] | null
          property_types: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_living_area?: number | null
          max_price?: number | null
          max_rooms?: number | null
          min_living_area?: number | null
          min_price?: number | null
          min_rooms?: number | null
          preferred_cantons?: string[] | null
          preferred_cities?: string[] | null
          property_types?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_living_area?: number | null
          max_price?: number | null
          max_rooms?: number | null
          min_living_area?: number | null
          min_price?: number | null
          min_rooms?: number | null
          preferred_cantons?: string[] | null
          preferred_cities?: string[] | null
          property_types?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_activity_log: {
        Row: {
          activity_description: string | null
          activity_type: string
          created_at: string
          customer_user_id: string
          id: string
          related_entity_id: string | null
          related_entity_type: string | null
        }
        Insert: {
          activity_description?: string | null
          activity_type: string
          created_at?: string
          customer_user_id: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Update: {
          activity_description?: string | null
          activity_type?: string
          created_at?: string
          customer_user_id?: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Relationships: []
      }
      customer_assignments: {
        Row: {
          assigned_by: string | null
          assigned_employee_id: string | null
          created_at: string
          customer_user_id: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_employee_id?: string | null
          created_at?: string
          customer_user_id: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_employee_id?: string | null
          created_at?: string
          customer_user_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_assignments_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "admin_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_url: string
          id: string
          property_id: string | null
          user_id: string
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_url: string
          id?: string
          property_id?: string | null
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_url?: string
          id?: string
          property_id?: string | null
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      financing_documents: {
        Row: {
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          financing_request_id: string
          id: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          financing_request_id: string
          id?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          financing_request_id?: string
          id?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financing_documents_financing_request_id_fkey"
            columns: ["financing_request_id"]
            isOneToOne: false
            referencedRelation: "financing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      financing_messages: {
        Row: {
          content: string
          created_at: string
          financing_request_id: string
          id: string
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          created_at?: string
          financing_request_id: string
          id?: string
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string
          created_at?: string
          financing_request_id?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financing_messages_financing_request_id_fkey"
            columns: ["financing_request_id"]
            isOneToOne: false
            referencedRelation: "financing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      financing_requests: {
        Row: {
          annual_income: number | null
          calculation_data: Json | null
          created_at: string
          equity_amount: number | null
          financing_type: Database["public"]["Enums"]["financing_type"]
          id: string
          interest_rate: number | null
          loan_amount: number | null
          loan_term_years: number | null
          monthly_payment: number | null
          notes: string | null
          property_address: string | null
          property_canton: string | null
          property_city: string | null
          property_type: string | null
          purchase_price: number | null
          request_number: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["financing_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_income?: number | null
          calculation_data?: Json | null
          created_at?: string
          equity_amount?: number | null
          financing_type: Database["public"]["Enums"]["financing_type"]
          id?: string
          interest_rate?: number | null
          loan_amount?: number | null
          loan_term_years?: number | null
          monthly_payment?: number | null
          notes?: string | null
          property_address?: string | null
          property_canton?: string | null
          property_city?: string | null
          property_type?: string | null
          purchase_price?: number | null
          request_number?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["financing_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_income?: number | null
          calculation_data?: Json | null
          created_at?: string
          equity_amount?: number | null
          financing_type?: Database["public"]["Enums"]["financing_type"]
          id?: string
          interest_rate?: number | null
          loan_amount?: number | null
          loan_term_years?: number | null
          monthly_payment?: number | null
          notes?: string | null
          property_address?: string | null
          property_canton?: string | null
          property_city?: string | null
          property_type?: string | null
          purchase_price?: number | null
          request_number?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["financing_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          property_id: string | null
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          property_id?: string | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          property_id?: string | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_contracts: {
        Row: {
          base_rent: number
          contract_number: string | null
          created_at: string
          deposit_amount: number | null
          deposit_paid: boolean | null
          document_url: string | null
          end_date: string | null
          id: string
          notes: string | null
          notice_period_months: number | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          tenant_id: string
          termination_date: string | null
          termination_reason: string | null
          unit_id: string
          updated_at: string
          utilities_advance: number | null
        }
        Insert: {
          base_rent: number
          contract_number?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          notice_period_months?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          tenant_id: string
          termination_date?: string | null
          termination_reason?: string | null
          unit_id: string
          updated_at?: string
          utilities_advance?: number | null
        }
        Update: {
          base_rent?: number
          contract_number?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          notice_period_months?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          tenant_id?: string
          termination_date?: string | null
          termination_reason?: string | null
          unit_id?: string
          updated_at?: string
          utilities_advance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "pm_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_contracts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "pm_units"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_defects: {
        Row: {
          assigned_to: string | null
          cost: number | null
          created_at: string
          description: string
          id: string
          images: string[] | null
          priority: Database["public"]["Enums"]["defect_priority"]
          reported_by_name: string | null
          resolution_notes: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["defect_status"]
          tenant_id: string | null
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          cost?: number | null
          created_at?: string
          description: string
          id?: string
          images?: string[] | null
          priority?: Database["public"]["Enums"]["defect_priority"]
          reported_by_name?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["defect_status"]
          tenant_id?: string | null
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          cost?: number | null
          created_at?: string
          description?: string
          id?: string
          images?: string[] | null
          priority?: Database["public"]["Enums"]["defect_priority"]
          reported_by_name?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["defect_status"]
          tenant_id?: string | null
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_defects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "pm_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_defects_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "pm_units"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_documents: {
        Row: {
          contract_id: string | null
          created_at: string
          document_type: string
          file_size: number | null
          file_url: string
          id: string
          name: string
          property_id: string | null
          tenant_id: string | null
          unit_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          document_type: string
          file_size?: number | null
          file_url: string
          id?: string
          name: string
          property_id?: string | null
          tenant_id?: string | null
          unit_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          document_type?: string
          file_size?: number | null
          file_url?: string
          id?: string
          name?: string
          property_id?: string | null
          tenant_id?: string | null
          unit_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pm_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "pm_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "pm_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_documents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "pm_units"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_listing_applications: {
        Row: {
          applicant_email: string
          applicant_name: string
          applicant_phone: string | null
          created_at: string
          id: string
          listing_id: string
          message: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          applicant_email: string
          applicant_name: string
          applicant_phone?: string | null
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          applicant_email?: string
          applicant_name?: string
          applicant_phone?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_listing_applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pm_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_listings: {
        Row: {
          available_from: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          images: string[] | null
          published_at: string | null
          rent_display: number
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          unit_id: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          available_from?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          published_at?: string | null
          rent_display: number
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          unit_id: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          available_from?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          published_at?: string | null
          rent_display?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          unit_id?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_listings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "pm_units"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          property_id: string | null
          read_at: string | null
          recipient_id: string | null
          recipient_tenant_id: string | null
          sender_id: string | null
          sender_tenant_id: string | null
          subject: string
          unit_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          property_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_tenant_id?: string | null
          sender_id?: string | null
          sender_tenant_id?: string | null
          subject: string
          unit_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          property_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_tenant_id?: string | null
          sender_id?: string | null
          sender_tenant_id?: string | null
          subject?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "pm_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_messages_recipient_tenant_id_fkey"
            columns: ["recipient_tenant_id"]
            isOneToOne: false
            referencedRelation: "pm_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_messages_sender_tenant_id_fkey"
            columns: ["sender_tenant_id"]
            isOneToOne: false
            referencedRelation: "pm_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_messages_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "pm_units"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_payments: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_date: string | null
          payment_type: string
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_type: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_type?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pm_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "pm_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_properties: {
        Row: {
          address: string
          canton: string
          city: string
          country: string
          created_at: string
          id: string
          image_url: string | null
          name: string
          notes: string | null
          owner_id: string | null
          postal_code: string
          property_type: string
          total_units: number | null
          updated_at: string
          year_built: number | null
        }
        Insert: {
          address: string
          canton: string
          city: string
          country?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          postal_code: string
          property_type: string
          total_units?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          address?: string
          canton?: string
          city?: string
          country?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          postal_code?: string
          property_type?: string
          total_units?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Relationships: []
      }
      pm_property_assignments: {
        Row: {
          created_at: string
          id: string
          property_id: string
          role: Database["public"]["Enums"]["pm_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          role: Database["public"]["Enums"]["pm_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          role?: Database["public"]["Enums"]["pm_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_property_assignments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "pm_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_tenants: {
        Row: {
          access_token: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          employer: string | null
          first_name: string
          id: string
          last_name: string
          monthly_income: number | null
          nationality: string | null
          notes: string | null
          phone: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          employer?: string | null
          first_name: string
          id?: string
          last_name: string
          monthly_income?: number | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          employer?: string | null
          first_name?: string
          id?: string
          last_name?: string
          monthly_income?: number | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pm_units: {
        Row: {
          balcony_area_sqm: number | null
          base_rent: number
          created_at: string
          floor: number | null
          has_parking: boolean | null
          has_storage: boolean | null
          id: string
          living_area_sqm: number | null
          notes: string | null
          property_id: string
          rooms: number | null
          status: Database["public"]["Enums"]["unit_status"]
          unit_number: string
          updated_at: string
          utilities_advance: number | null
        }
        Insert: {
          balcony_area_sqm?: number | null
          base_rent: number
          created_at?: string
          floor?: number | null
          has_parking?: boolean | null
          has_storage?: boolean | null
          id?: string
          living_area_sqm?: number | null
          notes?: string | null
          property_id: string
          rooms?: number | null
          status?: Database["public"]["Enums"]["unit_status"]
          unit_number: string
          updated_at?: string
          utilities_advance?: number | null
        }
        Update: {
          balcony_area_sqm?: number | null
          base_rent?: number
          created_at?: string
          floor?: number | null
          has_parking?: boolean | null
          has_storage?: boolean | null
          id?: string
          living_area_sqm?: number | null
          notes?: string | null
          property_id?: string
          rooms?: number | null
          status?: Database["public"]["Enums"]["unit_status"]
          unit_number?: string
          updated_at?: string
          utilities_advance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "pm_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["pm_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["pm_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["pm_role"]
          user_id?: string
        }
        Relationships: []
      }
      pm_utility_bill_items: {
        Row: {
          balance: number
          calculated_costs: number
          contract_id: string
          created_at: string
          document_url: string | null
          id: string
          sent_at: string | null
          tenant_id: string
          total_advance_paid: number | null
          utility_bill_id: string
        }
        Insert: {
          balance: number
          calculated_costs: number
          contract_id: string
          created_at?: string
          document_url?: string | null
          id?: string
          sent_at?: string | null
          tenant_id: string
          total_advance_paid?: number | null
          utility_bill_id: string
        }
        Update: {
          balance?: number
          calculated_costs?: number
          contract_id?: string
          created_at?: string
          document_url?: string | null
          id?: string
          sent_at?: string | null
          tenant_id?: string
          total_advance_paid?: number | null
          utility_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_utility_bill_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pm_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_utility_bill_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "pm_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_utility_bill_items_utility_bill_id_fkey"
            columns: ["utility_bill_id"]
            isOneToOne: false
            referencedRelation: "pm_utility_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_utility_bills: {
        Row: {
          billing_year: number
          created_at: string
          created_by: string | null
          id: string
          property_id: string
          status: string
          total_costs: number
          updated_at: string
        }
        Insert: {
          billing_year: number
          created_at?: string
          created_by?: string | null
          id?: string
          property_id: string
          status?: string
          total_costs: number
          updated_at?: string
        }
        Update: {
          billing_year?: number
          created_at?: string
          created_by?: string | null
          id?: string
          property_id?: string
          status?: string
          total_costs?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_utility_bills_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "pm_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          financial_verified: boolean | null
          first_name: string | null
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at: string | null
          kyc_verified_at: string | null
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          financial_verified?: boolean | null
          first_name?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at?: string | null
          kyc_verified_at?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          financial_verified?: boolean | null
          first_name?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at?: string | null
          kyc_verified_at?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          bathrooms: number | null
          broker_id: string | null
          canton: string
          city: string
          country: string
          created_at: string
          currency: string
          description: string | null
          featured_image_url: string | null
          id: string
          is_off_market: boolean
          living_area_sqm: number | null
          owner_id: string | null
          plot_area_sqm: number | null
          postal_code: string
          price: number
          property_type: string
          rooms: number | null
          status: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at: string
          year_built: number | null
        }
        Insert: {
          address: string
          bathrooms?: number | null
          broker_id?: string | null
          canton: string
          city: string
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          featured_image_url?: string | null
          id?: string
          is_off_market?: boolean
          living_area_sqm?: number | null
          owner_id?: string | null
          plot_area_sqm?: number | null
          postal_code: string
          price: number
          property_type: string
          rooms?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          address?: string
          bathrooms?: number | null
          broker_id?: string | null
          canton?: string
          city?: string
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          featured_image_url?: string | null
          id?: string
          is_off_market?: boolean
          living_area_sqm?: number | null
          owner_id?: string | null
          plot_area_sqm?: number | null
          postal_code?: string
          price?: number
          property_type?: string
          rooms?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          updated_at?: string
          year_built?: number | null
        }
        Relationships: []
      }
      property_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          property_id: string
          sort_order: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          property_id: string
          sort_order?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          property_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_interests: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          message: string | null
          property_id: string
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          message?: string | null
          property_id: string
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          message?: string | null
          property_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_interests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      employee_has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      generate_tenant_access_token: {
        Args: { _tenant_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_pm_role: {
        Args: {
          _role: Database["public"]["Enums"]["pm_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_property_access: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_employee: { Args: { _user_id: string }; Returns: boolean }
      is_pm_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      admin_employee_role: "admin_manager" | "admin_employee"
      app_role: "admin" | "buyer" | "seller" | "broker"
      contract_status: "draft" | "active" | "terminated" | "expired"
      defect_priority: "low" | "normal" | "urgent"
      defect_status: "open" | "in_progress" | "resolved" | "closed"
      document_type:
        | "kyc_id"
        | "kyc_proof_of_address"
        | "financial_proof"
        | "property_deed"
        | "floor_plan"
        | "energy_certificate"
        | "other"
      financing_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "approved"
        | "rejected"
        | "completed"
      financing_type: "mortgage" | "land" | "construction"
      kyc_status: "pending" | "submitted" | "verified" | "rejected"
      listing_status: "draft" | "active" | "paused" | "rented"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      pm_role: "pm_admin" | "pm_manager" | "pm_employee"
      property_status:
        | "draft"
        | "pending_review"
        | "active"
        | "sold"
        | "withdrawn"
      unit_status: "vacant" | "occupied" | "maintenance" | "reserved"
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
    Enums: {
      admin_employee_role: ["admin_manager", "admin_employee"],
      app_role: ["admin", "buyer", "seller", "broker"],
      contract_status: ["draft", "active", "terminated", "expired"],
      defect_priority: ["low", "normal", "urgent"],
      defect_status: ["open", "in_progress", "resolved", "closed"],
      document_type: [
        "kyc_id",
        "kyc_proof_of_address",
        "financial_proof",
        "property_deed",
        "floor_plan",
        "energy_certificate",
        "other",
      ],
      financing_status: [
        "draft",
        "submitted",
        "in_review",
        "approved",
        "rejected",
        "completed",
      ],
      financing_type: ["mortgage", "land", "construction"],
      kyc_status: ["pending", "submitted", "verified", "rejected"],
      listing_status: ["draft", "active", "paused", "rented"],
      payment_status: ["pending", "paid", "overdue", "cancelled"],
      pm_role: ["pm_admin", "pm_manager", "pm_employee"],
      property_status: [
        "draft",
        "pending_review",
        "active",
        "sold",
        "withdrawn",
      ],
      unit_status: ["vacant", "occupied", "maintenance", "reserved"],
    },
  },
} as const
