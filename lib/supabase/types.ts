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
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["article_analyses"]["Insert"]>;
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
      };
    };
  };
}
