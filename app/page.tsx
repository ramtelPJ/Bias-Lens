import { ArticleCard } from "@/components/article-card";
import { CategoryChips } from "@/components/layout/category-chips";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { UtilityBar } from "@/components/layout/utility-bar";
import { getArticles } from "@/lib/supabase/queries/articles";

// Without this, Next prerenders the article list once at build time — new
// articles from the hourly pipeline (AGENTS.md §18) would never show up
// without a redeploy.
export const dynamic = "force-dynamic";

export default async function Home() {
  const articles = await getArticles();

  return (
    <>
      <UtilityBar />
      <SiteHeader />
      <CategoryChips />

      <main className="flex-1">
        <div className="container-biasly py-8">
          <h1 className="mb-6 text-3xl font-bold text-foreground">Top News</h1>

          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No analyzed articles yet — check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
