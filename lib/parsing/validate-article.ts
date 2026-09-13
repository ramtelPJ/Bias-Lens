import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { looksLikeArticleUrl, normalizeUrl } from "@/lib/parsing/candidate-url";

export type RejectionReason =
  | "missing_title"
  | "generic_title"
  | "missing_image"
  | "missing_published_date"
  | "insufficient_body"
  | "non_article_canonical";

export interface ValidatedArticle {
  canonicalUrl: string;
  title: string;
  imageUrl: string;
  publishedAt: string;
  rawText: string;
}

export type ValidationResult =
  | { ok: true; article: ValidatedArticle }
  | { ok: false; reason: RejectionReason };

const GENERIC_TITLES = new Set([
  "home",
  "news",
  "politics",
  "business",
  "world",
  "world news",
  "sports",
  "opinion",
  "entertainment",
  "technology",
  "video",
  "videos",
  "live",
  "podcasts",
]);

const MIN_TITLE_LENGTH = 15;
const MIN_PARAGRAPH_LENGTH = 40;
const MIN_MEANINGFUL_PARAGRAPHS = 3;
const MIN_MEANINGFUL_CHARS = 900;

// Removed before computing raw_text — scripts/styles/nav/ads/newsletter/etc.
// per AGENTS.md §13.
const STRIP_SELECTOR = [
  "script",
  "style",
  "nav",
  "footer",
  "aside",
  "form",
  "iframe",
  "noscript",
  "[class*='newsletter' i]",
  "[class*='subscri' i]",
  "[class*='related' i]",
  "[class*='most-viewed' i]",
  "[class*='most-read' i]",
  "[class*='most_read' i]",
  "[class*='share' i]",
  "[class*='social' i]",
  "[class*='promo' i]",
  "[class*='advert' i]",
  "[class*='cookie' i]",
  "[class*='comment' i]",
  "[id*='comment' i]",
  // Byline sign-off / author bio / share toolbar / sidebar widgets — these
  // sit *inside* the main article-body container on some sites (e.g. a
  // Reuters "SignOff"/"AuthorBio" block after the last real paragraph), so
  // container scoping alone doesn't exclude them; strip explicitly.
  "[data-testid*='signoff' i]",
  "[data-testid*='authorbio' i]",
  "[data-testid*='contextwidget' i]",
  "[data-testid*='articletoolbar' i]",
  "[data-testid*='promo-box' i]",
  "[data-testid='Tags' i]",
].join(", ");

// Checked first: sites (e.g. Reuters) that render the real article body in a
// dedicated container but use non-<p> elements (data-testid="paragraph-0",
// "paragraph-1", ...) for each paragraph instead of semantic <p> tags. A
// generic <main>/<article> scan picks up unrelated boilerplate <p> tags
// (bylines, "Our Standards" disclaimers, promo blocks) on those sites.
const PRIMARY_BODY_SELECTOR =
  "[data-testid='ArticleBody' i], [itemprop='articleBody'], [class*='articleBody' i], [class*='article-body' i]";
const FALLBACK_BODY_SELECTOR = "article, [class*='story-body' i], main";
// Tried in order — kept separate rather than combined into one selector:
// a page using indexed paragraph markers often also has unrelated trailing
// <p> tags (byline, corporate sign-off) inside the same body container, so a
// combined query would pull both in.
const PARAGRAPH_SELECTORS = ["[data-testid^='paragraph-' i]", "p"];

function extractTitle($: cheerio.CheerioAPI): string | null {
  const ogTitle = $("meta[property='og:title']").attr("content")?.trim();
  const h1 = $("h1").first().text().trim();
  const titleTag = $("title").first().text().trim();
  return ogTitle || h1 || titleTag || null;
}

function extractImage($: cheerio.CheerioAPI, base: string): string | null {
  const raw =
    $("meta[property='og:image']").attr("content")?.trim() ||
    $("meta[name='twitter:image']").attr("content")?.trim() ||
    null;
  if (!raw) return null;
  try {
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

function extractPublishedAt($: cheerio.CheerioAPI): string | null {
  const metaCandidates = [
    $("meta[property='article:published_time']").attr("content"),
    $("meta[name='article:published_time']").attr("content"),
    $("meta[name='publish-date']").attr("content"),
    $("meta[name='date']").attr("content"),
    $("time[datetime]").first().attr("datetime"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of metaCandidates) {
    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  let ldDate: string | null = null;
  $("script[type='application/ld+json']").each((_, el) => {
    if (ldDate) return;
    try {
      const json = JSON.parse($(el).contents().text());
      const nodes = Array.isArray(json) ? json : [json];
      for (const node of nodes) {
        const datePublished = node?.datePublished ?? node?.dateCreated;
        if (typeof datePublished === "string") {
          const date = new Date(datePublished);
          if (!Number.isNaN(date.getTime())) {
            ldDate = date.toISOString();
            break;
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  });

  return ldDate;
}

function extractCanonicalUrl($: cheerio.CheerioAPI, originalUrl: string): string | null {
  const href = $("link[rel='canonical']").attr("href");
  if (!href) return null;
  return normalizeUrl(href, originalUrl);
}

function paragraphsFrom<T extends AnyNode>($: cheerio.CheerioAPI, scope: cheerio.Cheerio<T>): string[] {
  for (const selector of PARAGRAPH_SELECTORS) {
    const paragraphs = scope
      .find(selector)
      .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
      .get()
      .filter((text) => text.length >= MIN_PARAGRAPH_LENGTH);
    if (paragraphs.length > 0) return paragraphs;
  }
  return [];
}

function collectMeaningfulParagraphs($: cheerio.CheerioAPI): string[] {
  const primaryContainer = $(PRIMARY_BODY_SELECTOR).first();
  if (primaryContainer.length > 0) {
    // A precise, site-specific body container was found — trust it. Escalating
    // to a broad <main>/<body> scan when it comes up short pulls in unrelated
    // page noise (related-article teasers, photo credits, section headings)
    // that isn't covered by the strip list, which is worse than rejecting a
    // genuinely thin/paywalled page (AGENTS.md §16: fewer good articles beats
    // bad ones).
    return paragraphsFrom($, primaryContainer);
  }

  const fallbackContainer = $(FALLBACK_BODY_SELECTOR).first();
  const scope = fallbackContainer.length > 0 ? fallbackContainer : $("body");

  let paragraphs = paragraphsFrom($, scope);

  if (paragraphs.length < MIN_MEANINGFUL_PARAGRAPHS) {
    // Re-split by sentence boundaries in case the body came through as one
    // large paragraph (AGENTS.md §13 — don't reject on that alone).
    const combinedText = scope.text().replace(/\s+/g, " ").trim();
    const sentenceSplit = combinedText
      .split(/(?<=[.!?])\s+(?=[A-Z"“])/)
      .map((s) => s.trim())
      .filter((s) => s.length >= MIN_PARAGRAPH_LENGTH);
    if (sentenceSplit.length > paragraphs.length) paragraphs = sentenceSplit;
  }

  return paragraphs;
}

export function validateArticle(detailHtml: string, originalUrl: string): ValidationResult {
  const $ = cheerio.load(detailHtml);
  $(STRIP_SELECTOR).remove();

  const title = extractTitle($);
  if (!title) return { ok: false, reason: "missing_title" };
  if (title.length < MIN_TITLE_LENGTH || GENERIC_TITLES.has(title.trim().toLowerCase())) {
    return { ok: false, reason: "generic_title" };
  }

  const imageUrl = extractImage($, originalUrl);
  if (!imageUrl) return { ok: false, reason: "missing_image" };

  const publishedAt = extractPublishedAt($);
  if (!publishedAt) return { ok: false, reason: "missing_published_date" };

  const canonicalFromPage = extractCanonicalUrl($, originalUrl);
  if (canonicalFromPage && !looksLikeArticleUrl(canonicalFromPage)) {
    return { ok: false, reason: "non_article_canonical" };
  }
  const canonicalUrl = canonicalFromPage ?? normalizeUrl(originalUrl, originalUrl) ?? originalUrl;

  const paragraphs = collectMeaningfulParagraphs($);
  const meaningfulChars = paragraphs.reduce((sum, p) => sum + p.length, 0);
  if (paragraphs.length < MIN_MEANINGFUL_PARAGRAPHS && meaningfulChars < MIN_MEANINGFUL_CHARS) {
    return { ok: false, reason: "insufficient_body" };
  }

  return {
    ok: true,
    article: {
      canonicalUrl,
      title,
      imageUrl,
      publishedAt,
      rawText: paragraphs.join("\n\n"),
    },
  };
}
