/**
 * Sanitizer entry point.
 * runScan(fileId, triggeredBy): synchronous, in-process, fail-closed.
 * Spec: SANITIZER.md §4, §10.1
 */
import { createDecipheriv, createCipheriv, randomBytes } from 'crypto';
import type { ScanResult } from './types';
import type { ScanTrigger } from '../db/types';
import { parseMarkdownSegments } from './parser';
import { detectSecrets } from './detectors/secrets';
import { detectPii } from './detectors/pii';
import { detectConfidential } from './detectors/confidential';
import { buildMaskToken } from './masks';
import { getDb } from '../db';

export { createCipheriv, randomBytes }; // re-export for the confidential-terms API route

export const DETECTOR_VERSIONS = {
  secrets: '1.0',
  pii: '1.0',
  confidential: '1.0',
};

/**
 * Run a full scan on a file by ID.
 * Writes findings + scan log rows to SQLite.
 * Updates files.sanitization_state.
 * Returns ScanResult (scanLogId, findings, error, detectorVersions).
 * FAIL-CLOSED: any thrown error → scan_error state, no publish allowed.
 */
export function runScan(fileId: number, triggeredBy: ScanTrigger): ScanResult {
  const db = getDb();

  // Mark prior findings stale before scan
  db.prepare(`UPDATE file_findings SET stale=1 WHERE file_id=? AND stale=0`).run(fileId);

  // Fetch file content
  const fileRow = db
    .prepare('SELECT content_private, subject_type, subject_id FROM files WHERE id=?')
    .get(fileId) as
    | { content_private: string; subject_type: string; subject_id: number }
    | undefined;

  if (!fileRow) {
    // No file — this is an internal error; write a scan_error log
    const logRes = db
      .prepare(
        `INSERT INTO file_scan_log (file_id, detector_versions, finding_count, error_message, triggered_by)
         VALUES (?, ?, 0, ?, ?)`
      )
      .run(fileId, JSON.stringify(DETECTOR_VERSIONS), 'File not found during scan', triggeredBy);
    db.prepare(`UPDATE files SET sanitization_state='scan_error' WHERE id=?`).run(fileId);
    return {
      scanLogId: Number(logRes.lastInsertRowid),
      findings: [],
      error: 'File not found during scan',
      detectorVersions: DETECTOR_VERSIONS,
    };
  }

  const content = fileRow.content_private;

  // Fetch deny-list for this owner
  const denyList = loadDenyList(fileRow.subject_type, fileRow.subject_id);

  let errorMessage: string | null = null;
  let allFindings: ReturnType<typeof detectSecrets> = [];

  try {
    const segments = parseMarkdownSegments(content);
    const secretFindings = detectSecrets(segments, content);
    const piiFindings = detectPii(segments, content);
    const confidentialFindings = detectConfidential(segments, content, denyList);
    allFindings = [...secretFindings, ...piiFindings, ...confidentialFindings];
    // Sort by spanStart ascending for consistent ordering
    allFindings.sort((a, b) => a.spanStart - b.spanStart);
    // Assign suggested mask tokens with entity numbering
    assignEntityNumbers(allFindings);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    db.prepare(`UPDATE files SET sanitization_state='scan_error' WHERE id=?`).run(fileId);
    const logRes = db
      .prepare(
        `INSERT INTO file_scan_log (file_id, detector_versions, finding_count, error_message, triggered_by)
         VALUES (?, ?, 0, ?, ?)`
      )
      .run(fileId, JSON.stringify(DETECTOR_VERSIONS), errorMessage, triggeredBy);
    return {
      scanLogId: Number(logRes.lastInsertRowid),
      findings: [],
      error: errorMessage,
      detectorVersions: DETECTOR_VERSIONS,
    };
  }

  // Insert scan log row
  const logRes = db
    .prepare(
      `INSERT INTO file_scan_log (file_id, detector_versions, finding_count, error_message, triggered_by)
       VALUES (?, ?, ?, NULL, ?)`
    )
    .run(fileId, JSON.stringify(DETECTOR_VERSIONS), allFindings.length, triggeredBy);
  const scanLogId = Number(logRes.lastInsertRowid);

  // Insert findings
  const insertFinding = db.prepare(
    `INSERT INTO file_findings
      (file_id, scan_log_id, detector_id, detector_version, finding_type, severity,
       span_start, span_end, excerpt, suggested_mask, status, stale)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unresolved', 0)`
  );
  const insertMany = db.transaction(() => {
    for (const f of allFindings) {
      insertFinding.run(
        fileId,
        scanLogId,
        f.detectorId,
        f.detectorVersion,
        f.findingType,
        f.severity,
        f.spanStart,
        f.spanEnd,
        f.excerpt,
        f.suggestedMask
      );
    }
  });
  insertMany();

  // Update file state
  const newState = errorMessage ? 'scan_error' : 'scan_complete';
  db.prepare(`UPDATE files SET sanitization_state=? WHERE id=?`).run(newState, fileId);

  return {
    scanLogId,
    findings: allFindings,
    error: errorMessage,
    detectorVersions: DETECTOR_VERSIONS,
  };
}

/**
 * Assign/normalize suggestedMask tokens with entity numbering.
 * Same base + same value → same number; new value → next number.
 * Mutates findings in-place.
 */
function assignEntityNumbers(findings: ReturnType<typeof detectSecrets>): void {
  // Group by suggestedMask base (strip trailing -N if present)
  const baseToCount = new Map<string, number>();
  for (const f of findings) {
    const base = f.suggestedMask.replace(/^\[/, '').replace(/\]$/, '').replace(/-\d+$/, '');
    const count = (baseToCount.get(base) ?? 0) + 1;
    baseToCount.set(base, count);
    f.suggestedMask = buildMaskToken(base, count > 1 ? count : undefined);
  }
}

/**
 * Decrypt and return owner deny-list terms for the given subject.
 * Returns [] if no terms or SANITIZER_KEY not set (graceful degradation).
 */
function loadDenyList(subjectType: string, subjectId: number): string[] {
  const db = getDb();
  try {
    // Find owner for this subject
    const table = subjectType === 'agent' ? 'agents' : 'teams';
    const subjectRow = db.prepare(`SELECT owner_id FROM ${table} WHERE id=?`).get(subjectId) as
      | { owner_id: number }
      | undefined;
    if (!subjectRow) return [];

    const rows = db
      .prepare('SELECT term_encrypted, iv, auth_tag FROM owner_confidential_terms WHERE owner_id=?')
      .all(subjectRow.owner_id) as Array<{
      term_encrypted: string;
      iv: string;
      auth_tag: string;
    }>;

    if (rows.length === 0) return [];

    const key = process.env.SANITIZER_KEY;
    if (!key || key.length !== 64) return []; // graceful: no key → no deny-list enforcement

    const keyBuf = Buffer.from(key, 'hex');

    const terms: string[] = [];
    for (const row of rows) {
      try {
        const decipher = createDecipheriv('aes-256-gcm', keyBuf, Buffer.from(row.iv, 'hex'));
        decipher.setAuthTag(Buffer.from(row.auth_tag, 'hex'));
        const dec = Buffer.concat([
          decipher.update(Buffer.from(row.term_encrypted, 'hex')),
          decipher.final(),
        ]);
        terms.push(dec.toString('utf8'));
      } catch {
        // Skip corrupted entries gracefully
      }
    }
    return terms;
  } catch {
    return [];
  }
}
