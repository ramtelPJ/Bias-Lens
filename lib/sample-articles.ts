// Placeholder data for the home page grid. The `sources`/`articles`/
// `article_analyses` tables (AGENTS.md §7) don't exist yet — swap this for a
// real Supabase query once the scraping/analysis pipeline is wired up.
export interface SampleArticle {
  id: string;
  category: string;
  region: string;
  title: string;
  imageUrl: string;
  leftPercentage: number;
  centerPercentage: number;
  rightPercentage: number;
  sourceCount: number;
}

export const SAMPLE_ARTICLES: SampleArticle[] = [
  {
    id: "1",
    category: "Politics",
    region: "United States",
    title: "Trump Sends Iran Revised Peace Proposal With Tougher Terms: Report",
    imageUrl:
      "https://images.unsplash.com/photo-1580128637428-8d3f5f0a5e0a?w=800&q=80",
    leftPercentage: 20,
    centerPercentage: 31,
    rightPercentage: 49,
    sourceCount: 12,
  },
  {
    id: "2",
    category: "Health",
    region: "United States",
    title: "Researchers Make Case for Grapes as a 'Superfood' After Review of Health Evidence",
    imageUrl:
      "https://images.unsplash.com/photo-1596363505729-4190a9506133?w=800&q=80",
    leftPercentage: 18,
    centerPercentage: 42,
    rightPercentage: 40,
    sourceCount: 7,
  },
  {
    id: "3",
    category: "Science",
    region: "Switzerland",
    title: "CERN Finds High-Significance Hint of Physics Beyond Standard Model",
    imageUrl:
      "https://images.unsplash.com/photo-1517976487492-5750f3195933?w=800&q=80",
    leftPercentage: 16,
    centerPercentage: 62,
    rightPercentage: 22,
    sourceCount: 8,
  },
  {
    id: "4",
    category: "World",
    region: "Nicaragua",
    title: "Indigenous Leader Brooklyn Rivera Dies in Nicaragua After Nearly 3 Years of Detention",
    imageUrl:
      "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&q=80",
    leftPercentage: 54,
    centerPercentage: 28,
    rightPercentage: 18,
    sourceCount: 63,
  },
  {
    id: "5",
    category: "World",
    region: "Middle East",
    title: "UN Security Council to Hold Emergency Meeting as Israel Pushes Deeper into Lebanon",
    imageUrl:
      "https://images.unsplash.com/photo-1547483238-2cbf881a559f?w=800&q=80",
    leftPercentage: 22,
    centerPercentage: 35,
    rightPercentage: 43,
    sourceCount: 15,
  },
  {
    id: "6",
    category: "Business",
    region: "Global",
    title: "Oil Prices Dip as OPEC+ Considers Output Increase Amid Weak Demand",
    imageUrl:
      "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=800&q=80",
    leftPercentage: 25,
    centerPercentage: 50,
    rightPercentage: 25,
    sourceCount: 11,
  },
  {
    id: "7",
    category: "Technology",
    region: "United States",
    title: "SpaceX Launches Starship Test Flight in Milestone for Mars Program",
    imageUrl:
      "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&q=80",
    leftPercentage: 12,
    centerPercentage: 45,
    rightPercentage: 43,
    sourceCount: 9,
  },
  {
    id: "8",
    category: "Business",
    region: "United States",
    title: "Apple Unveils AI-Powered Features Across iPhone, iPad and Mac",
    imageUrl:
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80",
    leftPercentage: 15,
    centerPercentage: 40,
    rightPercentage: 45,
    sourceCount: 10,
  },
  {
    id: "9",
    category: "Climate",
    region: "Global",
    title: "2025 on Track to Be Among Top 3 Hottest Years, EU Climate Service Says",
    imageUrl:
      "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&q=80",
    leftPercentage: 33,
    centerPercentage: 34,
    rightPercentage: 33,
    sourceCount: 14,
  },
  {
    id: "10",
    category: "Economy",
    region: "United States",
    title: "Fed Holds Rates Steady, Signals Caution on Inflation and Growth Outlook",
    imageUrl:
      "https://images.unsplash.com/photo-1591696331111-ef9586a5b17a?w=800&q=80",
    leftPercentage: 30,
    centerPercentage: 45,
    rightPercentage: 25,
    sourceCount: 13,
  },
  {
    id: "11",
    category: "Soccer",
    region: "Europe",
    title: "Real Madrid Win Champions League After Comeback Victory in Final",
    imageUrl:
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80",
    leftPercentage: 10,
    centerPercentage: 20,
    rightPercentage: 70,
    sourceCount: 26,
  },
  {
    id: "12",
    category: "Environment",
    region: "Canada",
    title: "Wildfires Force Thousands to Evacuate Across Western Canada",
    imageUrl:
      "https://images.unsplash.com/photo-1602491453631-e2a5ad90a131?w=800&q=80",
    leftPercentage: 27,
    centerPercentage: 33,
    rightPercentage: 40,
    sourceCount: 17,
  },
];
