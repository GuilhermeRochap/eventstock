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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          configuracoes: Json | null
          criado_em: string | null
          id: string
          nome: string
        }
        Insert: {
          configuracoes?: Json | null
          criado_em?: string | null
          id?: string
          nome: string
        }
        Update: {
          configuracoes?: Json | null
          criado_em?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          aguardando_definicao_cortesia: boolean | null
          atualizado_em: string | null
          company_id: string
          criado_em: string | null
          data_evento: string
          descricao: string | null
          foto_url: string | null
          id: string
          local: string | null
          organizer_id: string
          status: Database["public"]["Enums"]["event_status"] | null
          titulo: string
          total_vagas: number
          vagas_disponiveis: number
          vagas_pendentes_decisao: number | null
        }
        Insert: {
          aguardando_definicao_cortesia?: boolean | null
          atualizado_em?: string | null
          company_id: string
          criado_em?: string | null
          data_evento: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          local?: string | null
          organizer_id: string
          status?: Database["public"]["Enums"]["event_status"] | null
          titulo: string
          total_vagas: number
          vagas_disponiveis: number
          vagas_pendentes_decisao?: number | null
        }
        Update: {
          aguardando_definicao_cortesia?: boolean | null
          atualizado_em?: string | null
          company_id?: string
          criado_em?: string | null
          data_evento?: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          local?: string | null
          organizer_id?: string
          status?: Database["public"]["Enums"]["event_status"] | null
          titulo?: string
          total_vagas?: number
          vagas_disponiveis?: number
          vagas_pendentes_decisao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      price_tiers: {
        Row: {
          criado_em: string | null
          event_id: string
          id: string
          is_cortesia: boolean | null
          nome: string | null
          ordem: number
          preco: number
          quantidade_maxima: number
        }
        Insert: {
          criado_em?: string | null
          event_id: string
          id?: string
          is_cortesia?: boolean | null
          nome?: string | null
          ordem: number
          preco: number
          quantidade_maxima: number
        }
        Update: {
          criado_em?: string | null
          event_id?: string
          id?: string
          is_cortesia?: boolean | null
          nome?: string | null
          ordem?: number
          preco?: number
          quantidade_maxima?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          criado_em: string | null
          expira_em: string
          id: string
          revogado: boolean | null
          token_hash: string
          user_id: string
        }
        Insert: {
          criado_em?: string | null
          expira_em: string
          id?: string
          revogado?: boolean | null
          token_hash: string
          user_id: string
        }
        Update: {
          criado_em?: string | null
          expira_em?: string
          id?: string
          revogado?: boolean | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company_id: string | null
          criado_em: string | null
          criado_por: string | null
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          senha_hash: string | null
          senha_temporaria: boolean | null
        }
        Insert: {
          company_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          email: string
          id?: string
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          senha_hash?: string | null
          senha_temporaria?: boolean | null
        }
        Update: {
          company_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          email?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
          senha_hash?: string | null
          senha_temporaria?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      event_status:
        | "rascunho"
        | "publicado"
        | "lotado"
        | "encerrado"
        | "cancelado"
      user_role: "admin" | "manager" | "user"
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
      event_status: [
        "rascunho",
        "publicado",
        "lotado",
        "encerrado",
        "cancelado",
      ],
      user_role: ["admin", "manager", "user"],
    },
  },
} as const
