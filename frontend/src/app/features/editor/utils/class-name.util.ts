/**
 * Normalizes a UML class name only for comparison.
 * The name stored in the canonical model is never changed.
 */
export function normalizeClassName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/** Matches the generated Java PascalCase identifier without changing the UML name. */
export function normalizeGeneratedClassName(value: string | null | undefined): string {
  const words = (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (words.map((word) => word[0].toUpperCase() + word.slice(1)).join('') || 'Unnamed').toLowerCase();
}
