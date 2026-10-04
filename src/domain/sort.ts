// EX-2: alphabetical, names starting with a number sort before letters
// (3/4 Sit-Up, 90/90 Hamstring, Ab Crunch Machine).
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export const compareNames = (a: string, b: string): number => collator.compare(a, b);

export function sortByName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => compareNames(a.name, b.name));
}
