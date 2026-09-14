import Image from "next/image";
import Link from "next/link";
import { Info } from "lucide-react";

import { BiasMeter } from "@/components/bias-meter";
import { Badge } from "@/components/ui/badge";
import type { ArticleWithAnalysis } from "@/lib/supabase/queries/articles";
import { formatDate } from "@/lib/utils";

const BIAS_BADGE_VARIANT = {
  left: "left",
  center: "center",
  right: "right",
  mixed: "neutral",
  unclear: "neutral",
} as const;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ArticleCard({ article }: { article: ArticleWithAnalysis }) {
  const { analysis, source } = article;

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-background shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-16/10 w-full">
        <Link
          href={`/article/${article.id}`}
          className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Image
            src={article.image_url}
            alt=""
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        </Link>
        <button
          type="button"
          aria-label="Why this bias score"
          className="absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Info className="size-4" strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground">
          {source.name} · {formatDate(article.published_at)}
        </p>

        <Link
          href={`/article/${article.id}`}
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <h3 className="text-lg font-semibold leading-snug text-foreground hover:underline">
            {article.title}
          </h3>
        </Link>

        <Badge variant={BIAS_BADGE_VARIANT[analysis.bias_label]} size="sm" className="w-fit">
          {capitalize(analysis.bias_label)}
        </Badge>

        <BiasMeter
          compact
          leftPercentage={analysis.left_percentage}
          centerPercentage={analysis.center_percentage}
          rightPercentage={analysis.right_percentage}
        />

        <p className="text-xs text-muted-foreground">
          {capitalize(analysis.sentiment_label)} sentiment · {Math.round(analysis.confidence * 100)}% confidence
        </p>
      </div>
    </article>
  );
}
