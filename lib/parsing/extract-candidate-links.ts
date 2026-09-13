import * as cheerio from "cheerio";

import { looksLikeArticleUrl, normalizeUrl } from "@/lib/parsing/candidate-url";

export interface CandidateExtractionResult {
  candidates: string[];
  rejected: number;
}

// AGENTS.md §11: only visible homepage story-card links, never a full <a>
// crawl of the page (nav/footer noise) and never sublinks beyond the homepage.
const STORY_CARD_SELECTOR = "article a[href], [class*='card'] a[href], [class*='story'] a[href], [class*='teaser'] a[href], [data-testid*='Card'] a[href], [data-testid*='Heading'] a[href]";

export function extractCandidateLinks(homepageHtml: string, homepageUrl: string): CandidateExtractionResult {
  const $ = cheerio.load(homepageHtml);

  let anchors = $(STORY_CARD_SELECTOR);
  if (anchors.length === 0) {
    // Fallback for sources with no recognizable story-card markup: scan every
    // anchor and rely entirely on the URL-shape + reject-list filters below.
    anchors = $("a[href]");
  }

  const homepageOrigin = new URL(homepageUrl).origin;
  const seen = new Set<string>();
  const candidates: string[] = [];
  let rejected = 0;

  anchors.each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const normalized = normalizeUrl(href, homepageUrl);
    if (!normalized) return;
    if (new URL(normalized).origin !== homepageOrigin) return; // homepage-only, no off-site links

    if (!looksLikeArticleUrl(normalized)) {
      rejected += 1;
      return;
    }

    if (seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  });

  return { candidates, rejected };
}
