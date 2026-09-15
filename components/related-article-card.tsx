import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { RelatedArticle } from "@/lib/supabase/queries/articles";
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

export function RelatedArticleCard({ article }: { article: RelatedArticle }) {
  return (
    <Link
      href={`/article/${article.id}`}
      className="flex gap-4 rounded-lg border border-border bg-background p-3 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-md">
        <Image src={article.image_url} alt="" fill className="object-cover" sizes="80px" />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          {article.source_name} · {formatDate(article.published_at)}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {article.title}
        </h3>
        <Badge variant={BIAS_BADGE_VARIANT[article.bias_label]} size="sm" className="w-fit">
          {capitalize(article.bias_label)}
        </Badge>
      </div>
    </Link>
  );
}
