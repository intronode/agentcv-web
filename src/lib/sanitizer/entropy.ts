/**
 * Shannon entropy — pure JS, no dependencies.
 * H(s) = -Σ (count(c)/len * log2(count(c)/len)) for each unique char c in s
 * Spec: SANITIZER.md §5.1.2
 */
export function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const c of s) {
    freq.set(c, (freq.get(c) ?? 0) + 1);
  }
  const len = s.length;
  let h = 0;
  for (const count of freq.values()) {
    const p = count / len;
    h -= p * Math.log2(p);
  }
  return h;
}
