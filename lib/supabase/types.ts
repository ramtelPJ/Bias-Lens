// Hand-written to match supabase/schema.sql (no CLI/MCP access to generate
// this from the live database — keep both files in sync manually).

export type SentimentLabel = "positive" | "neutral" | "negative";
export type BiasLabel = "left" | "center" | "right" | "mixed" | "unclear";
export type LogLevel = "info" | "warn" | "error";

export interface Database {
  public: {
    Tables: {
      sources: {
        Row: {
          id: string;
          name: string;
          listing_url: string;
          parser_strategy: string | null;
          logo_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          listing_url: string;
          parser_strategy?: string | null;
          logo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sources"]["Insert"]>;
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          source_id: string;
          original_url: string;
          canonical_url: string;
          title: string;
          image_url: string;
          published_at: string;
          raw_text: string;
          scraped_at: string;
          analyzed_at: string | null;
        };
        Insert: {
          id?: string;
          source_id: string;
          original_url: string;
          canonical_url: string;
          title: string;
          image_url: string;
          published_at: string;
          raw_text: string;
          scraped_at?: string;
          analyzed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["articles"]["Insert"]>;
        Relationships: [];
      };
      article_analyses: {
        Row: {
          id: string;
          article_id: string;
          summary: string;
          sentiment_score: number;
          sentiment_label: SentimentLabel;
          bias_score: number;
          bias_label: BiasLabel;
          left_percentage: number;
          center_percentage: number;
          right_percentage: number;
          confidence: number;
          framing_notes: string;
          loaded_terms: string[];
          disclaimer: string;
          model: string;
          // PostgREST serializes pgvector columns back as their text
          // representation ("[0.1,0.2,...]"), not a JSON array — confirmed
          // against the live API. Insert/Update still take a real number[]
          // (what embed() returns and what we send); only the Row shape
          // read back is a string.
          embedding: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          summary: string;
          sentiment_score: number;
          sentiment_label: SentimentLabel;
          bias_score: number;
          bias_label: BiasLabel;
          left_percentage: number;
          center_percentage: number;
          right_percentage: number;
          confidence: number;
          framing_notes: string;
          loaded_terms?: string[];
          disclaimer: string;
          model: string;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["article_analyses"]["Insert"]>;
        Relationships: [];
      };
      oxylabs_schedules: {
        Row: {
          id: string;
          source_id: string;
          oxylabs_schedule_id: string;
          cron: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          oxylabs_schedule_id: string;
          cron: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["oxylabs_schedules"]["Insert"]>;
        Relationships: [];
      };
      oxylabs_schedule_runs: {
        Row: {
          id: string;
          schedule_id: string;
          oxylabs_job_id: string;
          result_status: string;
          processed_at: string;
        };
        Insert: {
          id?: string;
          schedule_id: string;
          oxylabs_job_id: string;
          result_status: string;
          processed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["oxylabs_schedule_runs"]["Insert"]>;
        Relationships: [];
      };
      logs: {
        Row: {
          id: string;
          level: LogLevel;
          pipeline: string;
          message: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          level: LogLevel;
          pipeline: string;
          message: string;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["logs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_related_articles: {
        Args: {
          current_article_id: string;
          // The only caller passes analysis.embedding straight through, which
          // is the string PostgREST returns (see the Row comment above).
          // Postgres casts it to vector(1536) via its text input format.
          query_embedding: string;
          match_count?: number;
        };
        Returns: {
          id: string;
          title: string;
          image_url: string;
          published_at: string;
          source_name: string;
          bias_label: BiasLabel;
          sentiment_label: SentimentLabel;
        }[];
      };
    };
  };
}
