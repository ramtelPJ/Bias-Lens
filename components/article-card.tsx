import Image from "next/image";
import Link from "next/link";
import { Info } from "lucide-react";

import { BiasMeter } from "@/components/bias-meter";
import type { SampleArticle } from "@/lib/sample-articles";

export function ArticleCard({ article }: { article: SampleArticle }) {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-background shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-16/10 w-full">
        <Link
          href={`/article/${article.id}`}
          className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Image
            src={article.imageUrl}
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
          {article.category} · {article.region}
        </p>

        <Link
          href={`/article/${article.id}`}
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <h3 className="text-lg font-semibold leading-snug text-foreground hover:underline">
            {article.title}
          </h3>
        </Link>

        <BiasMeter
          compact
          leftPercentage={article.leftPercentage}
          centerPercentage={article.centerPercentage}
          rightPercentage={article.rightPercentage}
        />

        <p className="text-xs text-muted-foreground">{article.sourceCount} sources</p>
      </div>
    </article>
  );
}
