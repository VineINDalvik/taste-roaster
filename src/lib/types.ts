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
  label: string;
  roast: string;
  radarData: RadarData;
  summary: string;
  bookAnalysis?: string;
  movieAnalysis?: string;
  musicAnalysis?: string;
  timelineText?: string;
  timelineMonths?: MonthSnapshot[];
  crossDomain?: string;
  personality?: string;
  blindSpots?: string;
  recommendations?: RecommendationItem[];
  isPremium: boolean;
}

export interface MonthSnapshot {
  month: string; // "2026-02"
  books: string[];
  movies: string[];
  music: string[];
  mood: string;
  tasteShift: string;
  roast: string;
}

export interface RecommendationItem {
  title: string;
  type: "book" | "movie" | "music";
  reason: string;
  matchScore: number; // 0-100
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
