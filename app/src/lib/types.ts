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

export interface MBTIDimension {
  letter: string; // "I" | "E" | "N" | "S" | "T" | "F" | "J" | "P"
  score: number; // 0-100 (percentage toward this pole)
  evidence: string; // concise reasoning from taste data
}

export interface CulturalMBTI {
  type: string; // e.g. "INTJ"
  title: string; // e.g. "理性主义审美建筑师"
  dimensions: {
    ie: MBTIDimension; // Introversion vs Extraversion
    ns: MBTIDimension; // iNtuition vs Sensing
    tf: MBTIDimension; // Thinking vs Feeling
    jp: MBTIDimension; // Judging vs Perceiving
  };
  summary: string; // overall MBTI interpretation
}

export interface RadarData {
  wenqing: number;     // 文青浓度 0=大众爆款 100=小众到没朋友
  emo: number;         // emo 指数 0=天天嗨 100=深夜emo循环
  shekong: number;     // 社恐值 0=社交话题王 100=没人聊得来
  kaogu: number;       // 考古癖 0=只追新的 100=活在上个世纪
  shangtou: number;    // 上头程度 0=浅尝辄止 100=入坑就疯
}

export interface TasteReport {
  id: string;
  createdAt: string;
  input: TasteInput;
  mbti: CulturalMBTI;
  roast: string;
  radarData: RadarData;
  summary: string;
  // premium fields
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
  moodScore: number; // 0-100 taste energy
  tasteShift: string;
  roast: string;
}

export interface RecommendationItem {
  title: string;
  type: "book" | "movie" | "music";
  reason: string;
  matchScore: number; // 0-100
  alreadyConsumed?: boolean;
}

export interface RealCounts {
  books: number;
  movies: number;
  music: number;
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
