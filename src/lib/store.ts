import type { TasteReport } from "./types";

const reports = new Map<string, TasteReport>();

export function saveReport(report: TasteReport): void {
  reports.set(report.id, report);
}

export function getReport(id: string): TasteReport | undefined {
  return reports.get(id);
}

export function updateReport(
  id: string,
  patch: Partial<TasteReport>
): TasteReport | undefined {
  const existing = reports.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  reports.set(id, updated);
  return updated;
}
