export const CABANG_OPTIONS = ["Alor", "Waingapu", "Soe", "Kefamenanu", "Waikabubak"] as const;

export type CabangName = (typeof CABANG_OPTIONS)[number];
