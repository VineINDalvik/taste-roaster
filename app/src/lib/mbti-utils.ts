import type { CulturalMBTI } from "./types";

/** Derive canonical MBTI type from dimensions (I/E + N/S + T/F + J/P). Source of truth. */
export function deriveMbtiType(dims: CulturalMBTI["dimensions"]): string {
  return (
    dims.ie.letter +
    dims.ns.letter +
    dims.tf.letter +
    dims.jp.letter
  ).toUpperCase();
}

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISTP", "ESTJ", "ESTP",
  "ISFJ", "ISFP", "ESFJ", "ESFP",
];

/**
 * Replace any wrong MBTI type in text with the correct one.
 * Used to fix AI slip-ups (e.g. INFJ written as INFP).
 */
export function fixMbtiInText(
  text: string | undefined,
  correctType: string
): string {
  if (!text || !correctType) return text ?? "";
  return MBTI_TYPES.reduce(
    (s, t) =>
      t !== correctType ? s.replaceAll(new RegExp(t, "gi"), correctType) : s,
    text
  );
}
