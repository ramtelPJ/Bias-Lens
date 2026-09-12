import Image from "next/image";
import { notFound } from "next/navigation";
import { Bookmark, MoreHorizontal, Share2 } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

import { BiasMeter } from "@/components/bias-meter";
import { RelatedStoryCard } from "@/components/related-story-card";
import { SidebarCard } from "@/components/sidebar-card";
import { StatBar } from "@/components/stat-bar";
import { Button } from "@/components/ui/button";
import { CategoryChips } from "@/components/layout/category-chips";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { UtilityBar } from "@/components/layout/utility-bar";
import { getArticleDetail } from "@/lib/sample-article-details";
import { SAMPLE_ARTICLES } from "@/lib/sample-articles";
import { cn } from "@/lib/utils";

const BIAS_TEXT_CLASS = {
  left: "text-bias-left",
  center: "text-bias-center-foreground",
  right: "text-bias-right",
} as const;

function getDominantBias(leftPercentage: number, centerPercentage: number, rightPercentage: number) {
  const entries = [
    { key: "left" as const, label: "Left", value: leftPercentage },
    { key: "center" as const, label: "Center", value: centerPercentage },
    { key: "right" as const, label: "Right", value: rightPercentage },
  ];
  return entries.reduce((max, entry) => (entry.value > max.value ? entry : max));
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await auth.protect();

  const { id } = await params;
  const article = SAMPLE_ARTICLES.find((a) => a.id === id);
  if (!article) notFound();

  const detail = getArticleDetail(article);
  const dominant = getDominantBias(
    article.leftPercentage,
    article.centerPercentage,
    article.rightPercentage,
  );

  const leftCount = Math.round((article.leftPercentage / 100) * article.sourceCount);
  const centerCount = Math.round((article.centerPercentage / 100) * article.sourceCount);
  const rightCount = article.sourceCount - leftCount - centerCount;

  return (
    <>
      <UtilityBar />
      <SiteHeader />
      <CategoryChips />

      <main className="flex-1">
        <div className="container-biasly py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <article className="lg:col-span-2">
              <p className="text-xs text-muted-foreground">
                {article.category} · {article.region}
              </p>

              <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                {article.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  By {detail.author} | {detail.publishedAt} | {detail.readTime}
                </p>
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
                  src={article.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 66vw, 100vw"
                  priority
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{detail.imageCaption}</p>

              <section className="mt-6 rounded-lg border border-border bg-background p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">
                    Bias Distribution
                  </h2>
                </div>
                <BiasMeter
                  leftPercentage={article.leftPercentage}
                  centerPercentage={article.centerPercentage}
                  rightPercentage={article.rightPercentage}
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  {article.sourceCount} sources
                </p>
              </section>

              <div className="mt-6 flex max-w-[75ch] flex-col gap-4 text-base leading-relaxed text-foreground">
                {detail.bodyParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              <hr className="my-8 border-divider" />

              <section>
                <h2 className="mb-4 text-xl font-semibold text-foreground">
                  Related Stories
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {detail.relatedStories.map((story) => (
                    <RelatedStoryCard key={story.id} story={story} />
                  ))}
                </div>
              </section>
            </article>

            <aside className="flex flex-col gap-6 lg:col-span-1">
              <SidebarCard title="Bias Analysis">
                <p className="text-sm text-muted-foreground">Overall Bias</p>
                <p className={cn("mt-1 text-2xl font-bold", BIAS_TEXT_CLASS[dominant.key])}>
                  {dominant.label} {dominant.value}%
                </p>
                <p className="mt-1 text-sm text-bias-right">
                  Based on {article.sourceCount} balanced sources
                </p>

                <hr className="my-4 border-divider" />

                <div className="flex flex-col gap-3">
                  <StatBar
                    label="Left"
                    value={`${article.leftPercentage}%`}
                    percentage={article.leftPercentage}
                    variant="left"
                  />
                  <StatBar
                    label="Center"
                    value={`${article.centerPercentage}%`}
                    percentage={article.centerPercentage}
                    variant="center"
                  />
                  <StatBar
                    label="Right"
                    value={`${article.rightPercentage}%`}
                    percentage={article.rightPercentage}
                    variant="right"
                  />
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Our analysis is based on the political leaning of the publication
                  and how the story is framed. Sources are weighted by reliability
                  and recency.
                </p>

                <Button variant="secondary" className="mt-4 w-full">
                  How We Analyze Bias
                </Button>
              </SidebarCard>

              <SidebarCard title="AI Summary">
                <p className="text-xs text-muted-foreground">
                  Generated {detail.aiSummary.generatedAt} · {detail.aiSummary.readTime}
                </p>
                <ul className="mt-3 flex flex-col gap-3">
                  {detail.aiSummary.bullets.map((bullet, index) => (
                    <li key={index} className="flex gap-2 text-sm text-foreground">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  AI summaries can make mistakes.
                </p>
                <Button variant="secondary" className="mt-4 w-full">
                  Provide Feedback
                </Button>
              </SidebarCard>

              <SidebarCard title="Source Breakdown">
                <p className="text-xs text-muted-foreground">
                  {article.sourceCount} Total Sources
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  <StatBar
                    label="Left"
                    value={`${leftCount} (${article.leftPercentage}%)`}
                    percentage={article.leftPercentage}
                    variant="left"
                  />
                  <StatBar
                    label="Center"
                    value={`${centerCount} (${article.centerPercentage}%)`}
                    percentage={article.centerPercentage}
                    variant="center"
                  />
                  <StatBar
                    label="Right"
                    value={`${rightCount} (${article.rightPercentage}%)`}
                    percentage={article.rightPercentage}
                    variant="right"
                  />
                </div>

                <hr className="my-4 border-divider" />

                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Top Sources</span>
                  <span>Bias</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {detail.topSources.map((source) => (
                    <li
                      key={source.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground">{source.name}</span>
                      <span className={cn("font-medium", BIAS_TEXT_CLASS[source.bias])}>
                        {source.bias === "left"
                          ? "Left"
                          : source.bias === "right"
                            ? "Right"
                            : "Center"}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button variant="secondary" className="mt-4 w-full">
                  View All Sources
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
