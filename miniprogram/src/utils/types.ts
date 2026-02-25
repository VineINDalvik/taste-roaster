export interface WorkItem {
  title: string
  rating?: number
  date?: string
  comment?: string
}

export interface TasteInput {
  doubanId: string
  doubanName: string
  books: WorkItem[]
  movies: WorkItem[]
  music: WorkItem[]
  reviews: never[]
  diaries: never[]
  statuses: never[]
  source: 'douban' | 'manual'
}

export interface MBTIDimension {
  letter: string
  score: number
  evidence: string
}

export interface CulturalMBTI {
  type: string
  title: string
  dimensions: {
    ie: MBTIDimension
    ns: MBTIDimension
    tf: MBTIDimension
    jp: MBTIDimension
  }
  summary: string
}

export interface RadarData {
  wenqing: number
  emo: number
  shekong: number
  kaogu: number
  shangtou: number
  chouxiang: number
}

export interface MonthSnapshot {
  month: string
  books: string[]
  movies: string[]
  music: string[]
  mood: string
  tasteShift: string
  roast: string
}

export interface RecommendationItem {
  title: string
  type: 'book' | 'movie' | 'music'
  reason: string
  matchScore: number
  alreadyConsumed?: boolean
}

export interface RealCounts {
  books: number
  movies: number
  music: number
}

export interface ReportData {
  id: string
  mbti: CulturalMBTI
  roast: string
  radarData: RadarData
  summary: string
  isPremium: boolean
  doubanName?: string
  doubanId?: string
  input?: TasteInput
  sampleCount?: number
  realCounts?: RealCounts
  itemCount: number
  bookCount: number
  movieCount: number
  musicCount: number
  bookAnalysis?: string
  movieAnalysis?: string
  musicAnalysis?: string
  timelineMonths?: MonthSnapshot[]
  timelineText?: string
  crossDomain?: string
  personality?: string
  blindSpots?: string
  recommendations?: RecommendationItem[]
}

export interface EvolutionPoint {
  month: string
  score: number
  label: string
  genre: string
}

export interface MusicEmotion {
  emotion: string
  percentage: number
  color: string
  tracks: string[]
}

export interface PersonData {
  name: string
  mbtiType: string
  mbtiTitle: string
  dimensions: {
    ie: MBTIDimension
    ns: MBTIDimension
    tf: MBTIDimension
    jp: MBTIDimension
  }
  radarData: Record<string, number>
  bookCount: number
  movieCount: number
  musicCount: number
}

export interface ComparisonData {
  matchScore: number
  matchTitle: string
  overview: string
  similarities: { point: string; detail: string }[]
  differences: { point: string; detail: string }[]
  chemistry: string
  sharedWorks: string[]
  recommendTogether?: { title: string; type: string; reason: string }[]
  roastOneLiner?: string
  dateScene?: string
  dangerZone?: string
  memeLine?: string
  battleVerdict?: string
}

export interface CompareData {
  compareId: string
  personA: PersonData
  personB: PersonData
  comparison: ComparisonData
}
