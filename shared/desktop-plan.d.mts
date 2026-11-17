export const CATEGORIES: { name: string; hint: string; exts: string[] }[];
export const CATEGORY_NAMES: string[];
export function categoryFor(filename: string): string;
export function shouldIgnoreFile(name: string): boolean;
export function groupByCategory(names: string[]): Record<string, string[]>;
