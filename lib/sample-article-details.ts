import { SAMPLE_ARTICLES, type SampleArticle } from "@/lib/sample-articles";
import type { RelatedStory } from "@/components/related-story-card";

export type SourceBias = "left" | "center" | "right";

export interface SourceBreakdownItem {
  name: string;
  bias: SourceBias;
}

export interface ArticleDetail {
  author: string;
  publishedAt: string;
  readTime: string;
  imageCaption: string;
  bodyParagraphs: string[];
  aiSummary: {
    generatedAt: string;
    readTime: string;
    bullets: string[];
  };
  topSources: SourceBreakdownItem[];
  relatedStories: RelatedStory[];
}

// Bespoke detail content for the reference article (id "1") — matches
// img/03-news-details-page.png. Every other id falls back to
// buildGenericDetail() below rather than inventing more fake news copy.
const ARTICLE_1_DETAIL: ArticleDetail = {
  author: "David Morgan",
  publishedAt: "May 31, 2026",
  readTime: "12 min read",
  imageCaption:
    "President Donald Trump in the Cabinet Room at the White House, Washington, D.C., May 30, 2026. Photo: Andrew Harnik/Getty Images",
  bodyParagraphs: [
    "The Trump administration has sent Iran a revised nuclear deal proposal that includes tougher terms on uranium enrichment and stronger verification measures, according to a report published Saturday.",
    "The new proposal, delivered through intermediaries in Oman, requires Iran to halt all uranium enrichment on its soil and ship its stockpile of enriched uranium out of the country. It also demands unrestricted access for international inspectors to all Iranian nuclear facilities, including military sites.",
    '"This is a take-it-or-leave-it proposal," a senior administration official told the Wall Street Journal. "The President wants a deal, but he will not accept a weak agreement that puts America or our allies at risk."',
    "Iran has not yet officially responded to the proposal. However, Iranian Foreign Minister Hossein Amir-Abdollahian said last week that any deal must respect Iran's right to peaceful nuclear energy and include the lifting of all U.S. sanctions.",
    "The revised proposal comes after several rounds of indirect talks between U.S. and Iranian officials failed to produce a breakthrough. The Trump administration has warned that if diplomacy fails, it is prepared to take other action to prevent Iran from obtaining a nuclear weapon.",
    'European allies have urged both sides to continue negotiations. "We believe diplomacy is still the best path forward," said a spokesperson for the EU\'s foreign policy chief.',
    'Israel, which has long opposed the 2015 nuclear deal with Iran, praised the Trump administration\'s tougher stance. "This is the kind of leadership that was missing in the past," said Israeli Prime Minister Benjamin Netanyahu in a statement.',
    "The fate of the proposal now rests with Iran, as global attention remains focused on whether a new nuclear agreement can be reached—or if tensions will escalate further.",
  ],
  aiSummary: {
    generatedAt: "May 31, 2026",
    readTime: "3 min read",
    bullets: [
      "The Trump administration has sent Iran a revised nuclear deal proposal with tougher terms, including a complete halt to uranium enrichment and the removal of enriched uranium stockpiles.",
      "The proposal also demands unrestricted inspector access to all nuclear sites, including military facilities.",
      "Iran has not responded officially but says any deal must respect its right to peaceful nuclear energy and include sanctions relief.",
      "The U.S. warns it is prepared to take other action if diplomacy fails, while European allies urge continued negotiations.",
      "Israel supports the tougher stance, praising the administration's determination to prevent Iran from acquiring nuclear weapons.",
    ],
  },
  topSources: [
    { name: "Fox News", bias: "right" },
    { name: "The Wall Street Journal", bias: "center" },
    { name: "Reuters", bias: "center" },
    { name: "BBC", bias: "center" },
    { name: "CNN", bias: "left" },
    { name: "The New York Times", bias: "center" },
    { name: "The Washington Post", bias: "center" },
    { name: "Newsmax", bias: "right" },
  ],
  relatedStories: [
    {
      id: "1-related-1",
      category: "World",
      region: "Middle East",
      title: "Iran Says It Will Not Negotiate Under 'Maximum Pressure'",
      imageUrl:
        "https://images.unsplash.com/photo-1590059390047-d7f076e8a8c9?w=400&q=80",
      date: "May 29, 2026",
      readTime: "8 min read",
    },
    {
      id: "1-related-2",
      category: "Politics",
      region: "United States",
      title: "Bipartisan Group Urges Diplomacy With Iran",
      imageUrl:
        "https://images.unsplash.com/photo-1523292562811-8fa7962a78c8?w=400&q=80",
      date: "May 26, 2026",
      readTime: "5 min read",
    },
    {
      id: "1-related-3",
      category: "Politics",
      region: "United States",
      title: "US Sanctions More Iranian Entities Over Nuclear Program",
      imageUrl:
        "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=400&q=80",
      date: "May 28, 2026",
      readTime: "6 min read",
    },
    {
      id: "1-related-4",
      category: "Science",
      region: "Nuclear Policy",
      title: "What's in the 2015 Iran Nuclear Deal?",
      imageUrl:
        "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400&q=80",
      date: "May 25, 2026",
      readTime: "10 min read",
    },
    {
      id: "1-related-5",
      category: "World",
      region: "Middle East",
      title: "Oman Hosts Another Round of US-Iran Nuclear Talks",
      imageUrl:
        "https://images.unsplash.com/photo-1544966503-7cc531e2589f?w=400&q=80",
      date: "May 27, 2026",
      readTime: "7 min read",
    },
    {
      id: "1-related-6",
      category: "World",
      region: "Middle East",
      title: "Israel Reaffirms Red Line Over Iranian Nuclear Program",
      imageUrl:
        "https://images.unsplash.com/photo-1547483238-2cbf881a559f?w=400&q=80",
      date: "May 24, 2026",
      readTime: "6 min read",
    },
  ],
};

const GENERIC_SOURCE_POOL: SourceBreakdownItem[] = [
  { name: "Fox News", bias: "right" },
  { name: "The Wall Street Journal", bias: "center" },
  { name: "Reuters", bias: "center" },
  { name: "BBC", bias: "center" },
  { name: "CNN", bias: "left" },
  { name: "The New York Times", bias: "center" },
  { name: "The Washington Post", bias: "center" },
  { name: "Newsmax", bias: "right" },
];

function buildGenericDetail(article: SampleArticle): ArticleDetail {
  const related = SAMPLE_ARTICLES.filter((a) => a.id !== article.id)
    .slice(0, 4)
    .map<RelatedStory>((a) => ({
      id: a.id,
      category: a.category,
      region: a.region,
      title: a.title,
      imageUrl: a.imageUrl,
      date: "May 2026",
      readTime: "5 min read",
    }));

  return {
    author: "Staff Writer",
    publishedAt: "May 2026",
    readTime: "5 min read",
    imageCaption: `${article.title} — placeholder image caption.`,
    bodyParagraphs: [
      "This is placeholder article content used to preview the design. It will be replaced with real scraped and AI-analyzed article text once the Supabase pipeline is wired up.",
      "The bias distribution and source counts shown here are illustrative only, derived from this article's sample left/center/right split rather than an actual multi-source analysis.",
      "Once scraping, AI analysis, and pgvector-backed related articles are implemented, this section will show the article's real summary, framing notes, and loaded terms.",
    ],
    aiSummary: {
      generatedAt: "May 2026",
      readTime: "1 min read",
      bullets: [
        "Placeholder summary bullet — real AI analysis output will appear here once /api/analyze is implemented.",
      ],
    },
    topSources: GENERIC_SOURCE_POOL,
    relatedStories: related,
  };
}

export function getArticleDetail(article: SampleArticle): ArticleDetail {
  if (article.id === "1") return ARTICLE_1_DETAIL;
  return buildGenericDetail(article);
}
