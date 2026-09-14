import Image from "next/image";
import { notFound } from "next/navigation";
import { Bookmark, MoreHorizontal, Share2 } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

import { BiasMeter } from "@/components/bias-meter";
import { SidebarCard } from "@/components/sidebar-card";
import { StatBar } from "@/components/stat-bar";
import { Button } from "@/components/ui/button";
import { CategoryChips } from "@/components/layout/category-chips";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { UtilityBar } from "@/components/layout/utility-bar";
import { getArticleById } from "@/lib/supabase/queries/articles";
import { cn, formatDate } from "@/lib/utils";

const BIAS_TEXT_CLASS = {
  left: "text-bias-left",
  center: "text-bias-center-foreground",
  right: "text-bias-right",
  mixed: "text-foreground",
  unclear: "text-foreground",
} as const;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await auth.protect();

  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) notFound();

  const { analysis, source } = article;
  const bodyParagraphs = article.raw_text.split("\n\n");

  return (
    <>
      <UtilityBar />
      <SiteHeader />
      <CategoryChips />

      <main className="flex-1">
        <div className="container-biasly py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <article className="lg:col-span-2">
              <p className="text-xs text-muted-foreground">{source.name}</p>

              <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                {article.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{formatDate(article.published_at)}</p>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Bookmark className="size-4" strokeWidth={2} />
                    Save
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Share2 className="size-4" strokeWidth={2} />
                    Share
                  </button>
                  <button
                    type="button"
                    aria-label="More options"
                    className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <MoreHorizontal className="size-4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="relative mt-5 aspect-16/9 w-full overflow-hidden rounded-lg">
                <Image
                  src={article.image_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 66vw, 100vw"
                  priority
                />
              </div>

              <section className="mt-6 rounded-lg border border-border bg-background p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Bias Distribution</h2>
                </div>
                <BiasMeter
                  leftPercentage={analysis.left_percentage}
                  centerPercentage={analysis.center_percentage}
                  rightPercentage={analysis.right_percentage}
                />
              </section>

              <div className="mt-6 flex max-w-[75ch] flex-col gap-4 text-base leading-relaxed text-foreground">
                {bodyParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </article>

            <aside className="flex flex-col gap-6 lg:col-span-1">
              <SidebarCard title="Bias Analysis">
                <p className="text-sm text-muted-foreground">Overall Bias</p>
                <p className={cn("mt-1 text-2xl font-bold", BIAS_TEXT_CLASS[analysis.bias_label])}>
                  {capitalize(analysis.bias_label)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {Math.round(analysis.confidence * 100)}% confidence
                </p>

                <hr className="my-4 border-divider" />

                <div className="flex flex-col gap-3">
                  <StatBar
                    label="Left"
                    value={`${analysis.left_percentage}%`}
                    percentage={analysis.left_percentage}
                    variant="left"
                  />
                  <StatBar
                    label="Center"
                    value={`${analysis.center_percentage}%`}
                    percentage={analysis.center_percentage}
                    variant="center"
                  />
                  <StatBar
                    label="Right"
                    value={`${analysis.right_percentage}%`}
                    percentage={analysis.right_percentage}
                    variant="right"
                  />
                </div>

                <p className="mt-4 text-xs text-muted-foreground">{analysis.disclaimer}</p>

                <Button variant="secondary" className="mt-4 w-full">
                  How We Analyze Bias
                </Button>
              </SidebarCard>

              <SidebarCard title="AI Analysis">
                <p className="text-xs text-muted-foreground">
                  {capitalize(analysis.sentiment_label)} sentiment
                </p>
                <p className="mt-3 text-sm text-foreground">{analysis.summary}</p>

                {analysis.framing_notes && (
                  <p className="mt-3 text-sm text-muted-foreground">{analysis.framing_notes}</p>
                )}

                {analysis.loaded_terms.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.loaded_terms.map((term) => (
                      <span
                        key={term}
                        className="rounded-full bg-surface px-2 py-1 text-xs text-muted-foreground"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-4 text-xs text-muted-foreground">
                  AI analysis can make mistakes.
                </p>
                <Button variant="secondary" className="mt-4 w-full">
                  Provide Feedback
                </Button>
              </SidebarCard>
            </aside>
          </div>

          <section className="mt-12 flex flex-col items-start justify-between gap-4 rounded-lg bg-surface p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Stay Informed. Stay Balanced.
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Get the top stories and bias analysis delivered to your inbox.
              </p>
            </div>
            <form className="flex w-full max-w-md gap-3 sm:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <Button variant="primary" type="submit">
                Subscribe
              </Button>
            </form>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
