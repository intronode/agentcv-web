/**
 * Sanitizer type definitions — spec: docs/SANITIZER.md
 */

export type SegmentType = 'prose' | 'code_block' | 'inline_code';

export interface Segment {
  type: SegmentType;
  content: string;
  /** Byte offset of this segment's first character in the original file content */
  offset: number;
}

export type FindingType = 'secret' | 'pii' | 'confidential';
export type Severity = 'critical' | 'blocking' | 'advisory';

export interface Finding {
  /** e.g. "secrets.provider-prefix.anthropic" */
  detectorId: string;
  detectorVersion: string;
  findingType: FindingType;
  severity: Severity;
  /** Absolute offset in original file content */
  spanStart: number;
  spanEnd: number;
  /** ±20 chars of context; value itself masked for secrets */
  excerpt: string;
  /** Auto-generated mask token, e.g. "[api-key]" */
  suggestedMask: string;
}

export interface ScanResult {
  scanLogId: number;
  findings: Finding[];
  error: string | null;
  detectorVersions: Record<string, string>;
}
