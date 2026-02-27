import CompareResultClient from "./CompareResultClient";

interface MBTIDimension {
  letter: string;
  score: number;
  evidence: string;
}

interface PersonData {
  name: string;
  mbtiType: string;
  mbtiTitle: string;
  dimensions: {
    ie: MBTIDimension;
    ns: MBTIDimension;
    tf: MBTIDimension;
    jp: MBTIDimension;
  };
  radarData: Record<string, number>;
  bookCount: number;
  movieCount: number;
  musicCount: number;
}

interface CrossRecItem {
  title: string;
  type: string;
  reason: string;
}

interface ComparisonData {
  matchScore: number;
  matchTitle: string;
  overview: string;
  similarities: { point: string; detail: string }[];
  differences: { point: string; detail: string }[];
  chemistry: string;
  sharedWorks: string[];
  crossRecommend?: {
    forA: CrossRecItem[];
    forB: CrossRecItem[];
  };
  recommendTogether?: CrossRecItem[];
  roastOneLiner?: string;
  dateScene?: string;
  dangerZone?: string;
  memeLine?: string;
  battleVerdict?: string;
}

interface CompareData {
  compareId: string;
  personA: PersonData;
  personB: PersonData;
  comparison: ComparisonData;
}

const DIM_KEYS = ["ie", "ns", "tf", "jp"] as const;
const DIM_LABELS: Record<string, [string, string]> = {
  ie: ["I", "E"],
  ns: ["N", "S"],
  tf: ["T", "F"],
  jp: ["J", "P"],
};

const RADAR_LABELS: [string, string][] = [
  ["wenqing", "文青浓度"],
  ["emo", "emo指数"],
  ["shekong", "社恐值"],
  ["kaogu", "考古癖"],
  ["shangtou", "上头指数"],
  ["chouxiang", "活人感"],
];

function getMatchColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#667eea";
  if (score >= 40) return "#f5c518";
  return "#e94560";
}

function getMatchLabel(score: number) {
  if (score >= 90) return "灵魂伴侣";
  if (score >= 70) return "品味知己";
  if (score >= 50) return "互补搭档";
  if (score >= 30) return "平行世界";
  return "文化反义词";
}

export default async function CompareResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompareResultClient id={id} />;
}
