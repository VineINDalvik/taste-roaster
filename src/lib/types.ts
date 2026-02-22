export interface WorkItem {
  title: string;
  rating?: number; // 1-5 stars
  date?: string;
  comment?: string;
}

export interface ReviewItem {
  title: string;
  content: string;
  type: string;
  rating?: number;
}

export interface DiaryItem {
  title: string;
  content: string;
  date?: string;
}

export interface StatusItem {
  content: string;
  date?: string;
}

export interface TasteInput {
  doubanId: string;
  doubanName: string;
  books: WorkItem[];
  movies: WorkItem[];
  music: WorkItem[];
  reviews: ReviewItem[];
  diaries: DiaryItem[];
  statuses: StatusItem[];
  source: "douban" | "manual";
}

export interface RadarData {
  depth: number; // 0-100
  breadth: number;
  uniqueness: number;
  emotionSensitivity: number;
  timeSpan: number;
}

export interface TasteReport {
  id: string;
  createdAt: string;
  input: TasteInput;
  label: string; // e.g. "文艺复兴型废物"
  roast: string; // one-liner roast
  radarData: RadarData;
  summary: string; // 2-3 sentence summary
  bookAnalysis?: string;
  movieAnalysis?: string;
  musicAnalysis?: string;
  timeline?: string;
  crossDomain?: string;
  personality?: string;
  blindSpots?: string;
  isPremium: boolean;
}

export interface CompareResult {
  id: string;
  reportA: TasteReport;
  reportB: TasteReport;
  matchScore: number;
  sharedTastes: string;
  biggestDiff: string;
  recommendations: string;
}
