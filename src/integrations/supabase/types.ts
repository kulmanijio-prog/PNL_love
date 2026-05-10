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
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          brokerage: number | null
          buy_amt: number | null
          expiry: string | null
          gross_pnl_excl_charges: number | null
          gross_realized_pnl: number | null
          gst: number | null
          id: string
          intraday_pnl: number | null
          isin: string | null
          long_term_pnl: number | null
          misc: number | null
          net_pnl: number | null
          option_type: string | null
          qty: number | null
          script_name: string
          security_type: string | null
          sell_amt: number | null
          short_term_pnl: number | null
          strike: number | null
          stt_ctt: number | null
          total_charges: number | null
          total_pnl: number | null
          underlying: string | null
          upload_id: string
          user_id: string | null
        }
        Insert: {
          brokerage?: number | null
          buy_amt?: number | null
          expiry?: string | null
          gross_pnl_excl_charges?: number | null
          gross_realized_pnl?: number | null
          gst?: number | null
          id?: string
          intraday_pnl?: number | null
          isin?: string | null
          long_term_pnl?: number | null
          misc?: number | null
          net_pnl?: number | null
          option_type?: string | null
          qty?: number | null
          script_name: string
          security_type?: string | null
          sell_amt?: number | null
          short_term_pnl?: number | null
          strike?: number | null
          stt_ctt?: number | null
          total_charges?: number | null
          total_pnl?: number | null
          underlying?: string | null
          upload_id: string
          user_id?: string | null
        }
        Update: {
          brokerage?: number | null
          buy_amt?: number | null
          expiry?: string | null
          gross_pnl_excl_charges?: number | null
          gross_realized_pnl?: number | null
          gst?: number | null
          id?: string
          intraday_pnl?: number | null
          isin?: string | null
          long_term_pnl?: number | null
          misc?: number | null
          net_pnl?: number | null
          option_type?: string | null
          qty?: number | null
          script_name?: string
          security_type?: string | null
          sell_amt?: number | null
          short_term_pnl?: number | null
          strike?: number | null
          stt_ctt?: number | null
          total_charges?: number | null
          total_pnl?: number | null
          underlying?: string | null
          upload_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      uploads: {
        Row: {
          charges: number | null
          charges_brokerage: number | null
          charges_gst: number | null
          charges_misc: number | null
          charges_stt_ctt: number | null
          client_code: string | null
          client_name: string | null
          created_at: string
          file_name: string
          id: string
          net_pnl: number | null
          period_from: string | null
          period_to: string | null
          raw_summary: Json | null
          realized_pnl: number | null
          storage_path: string | null
          turnover_equity_delivery: number | null
          turnover_equity_intraday: number | null
          turnover_futures: number | null
          turnover_options: number | null
          user_id: string | null
        }
        Insert: {
          charges?: number | null
          charges_brokerage?: number | null
          charges_gst?: number | null
          charges_misc?: number | null
          charges_stt_ctt?: number | null
          client_code?: string | null
          client_name?: string | null
          created_at?: string
          file_name: string
          id?: string
          net_pnl?: number | null
          period_from?: string | null
          period_to?: string | null
          raw_summary?: Json | null
          realized_pnl?: number | null
          storage_path?: string | null
          turnover_equity_delivery?: number | null
          turnover_equity_intraday?: number | null
          turnover_futures?: number | null
          turnover_options?: number | null
          user_id?: string | null
        }
        Update: {
          charges?: number | null
          charges_brokerage?: number | null
          charges_gst?: number | null
          charges_misc?: number | null
          charges_stt_ctt?: number | null
          client_code?: string | null
          client_name?: string | null
          created_at?: string
          file_name?: string
          id?: string
          net_pnl?: number | null
          period_from?: string | null
          period_to?: string | null
          raw_summary?: Json | null
          realized_pnl?: number | null
          storage_path?: string | null
          turnover_equity_delivery?: number | null
          turnover_equity_intraday?: number | null
          turnover_futures?: number | null
          turnover_options?: number | null
          user_id?: string | null
        }
        Relationships: []
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
