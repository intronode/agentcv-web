/**
 * Markdown-aware segment parser.
 * Splits markdown content into prose vs code segments.
 * Secrets are scanned across ALL segments; PII and confidential prose-only.
 * Spec: SANITIZER.md §5.0, §10.2
 */
import type { Segment } from './types';

/**
 * Split `content` into ordered, non-overlapping segments.
 * Fenced code blocks (``` or ~~~), indented code blocks (4-space/tab lines),
 * and inline code spans (`...`) are marked as code_block or inline_code.
 * Everything else is prose.
 */
export function parseMarkdownSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  let pos = 0;
  const len = content.length;

  // We process line-by-line for block-level constructs first,
  // then per-char for inline code within prose lines.

  // Split into lines preserving newlines
  const lines: Array<{ text: string; start: number }> = [];
  let lineStart = 0;
  for (let i = 0; i <= len; i++) {
    if (i === len || content[i] === '\n') {
      lines.push({ text: content.slice(lineStart, i + (i < len ? 1 : 0)), start: lineStart });
      lineStart = i + 1;
    }
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // noUncheckedIndexedAccess: lines[i] can be undefined after the while check,
    // but the loop guard ensures it is defined here. Satisfying the compiler:
    if (!line) {
      i++;
      continue;
    }

    const trimmed = line.text.trimStart();

    // Fenced code block: ``` or ~~~
    const fenceMatch = /^(`{3,}|~{3,})/.exec(trimmed);
    if (fenceMatch) {
      const fence = fenceMatch[1] ?? '```';
      const blockStart = line.start;
      i++;
      while (i < lines.length) {
        const inner = lines[i];
        if (!inner) {
          i++;
          break;
        }
        if (inner.text.trimStart().startsWith(fence)) {
          i++;
          break;
        }
        i++;
      }
      const nextLine = lines[i];
      const blockEnd = nextLine !== undefined ? nextLine.start : len;
      // Flush prose before this block
      if (pos < blockStart) {
        pushProseWithInline(content.slice(pos, blockStart), pos, segments);
      }
      segments.push({
        type: 'code_block',
        content: content.slice(blockStart, blockEnd),
        offset: blockStart,
      });
      pos = blockEnd;
      continue;
    }

    // Indented code block: lines starting with 4 spaces or a tab
    if (line.text.startsWith('    ') || line.text.startsWith('\t')) {
      const blockStart = line.start;
      let j = i + 1;
      while (j < lines.length) {
        const jLine = lines[j];
        if (!jLine) break;
        if (
          jLine.text.startsWith('    ') ||
          jLine.text.startsWith('\t') ||
          jLine.text.trim() === ''
        ) {
          j++;
        } else {
          break;
        }
      }
      // trim trailing blank lines from indented block
      while (j > i + 1) {
        const prevLine = lines[j - 1];
        if (!prevLine || prevLine.text.trim() !== '') break;
        j--;
      }
      const jLine = lines[j];
      const blockEnd = jLine !== undefined ? jLine.start : len;
      if (pos < blockStart) {
        pushProseWithInline(content.slice(pos, blockStart), pos, segments);
      }
      segments.push({
        type: 'code_block',
        content: content.slice(blockStart, blockEnd),
        offset: blockStart,
      });
      pos = blockEnd;
      i = j;
      continue;
    }

    i++;
  }

  // Remaining content after last code block
  if (pos < len) {
    pushProseWithInline(content.slice(pos), pos, segments);
  }

  return segments;
}

/**
 * Split a prose chunk into prose / inline_code segments (backtick spans).
 * Appends directly to `out`.
 */
function pushProseWithInline(chunk: string, baseOffset: number, out: Segment[]): void {
  let pos = 0;
  const len = chunk.length;

  while (pos < len) {
    const backtickIdx = chunk.indexOf('`', pos);
    if (backtickIdx === -1) {
      // Pure prose remainder
      if (pos < len) {
        out.push({ type: 'prose', content: chunk.slice(pos), offset: baseOffset + pos });
      }
      break;
    }

    // Prose before backtick
    if (backtickIdx > pos) {
      out.push({ type: 'prose', content: chunk.slice(pos, backtickIdx), offset: baseOffset + pos });
    }

    // Count opening backticks
    let tickLen = 1;
    while (backtickIdx + tickLen < len && chunk[backtickIdx + tickLen] === '`') tickLen++;
    const openTick = chunk.slice(backtickIdx, backtickIdx + tickLen);
    const closeIdx = chunk.indexOf(openTick, backtickIdx + tickLen);

    if (closeIdx === -1) {
      // Unclosed backtick — treat rest as prose
      out.push({
        type: 'prose',
        content: chunk.slice(backtickIdx),
        offset: baseOffset + backtickIdx,
      });
      break;
    }

    const spanEnd = closeIdx + tickLen;
    out.push({
      type: 'inline_code',
      content: chunk.slice(backtickIdx, spanEnd),
      offset: baseOffset + backtickIdx,
    });
    pos = spanEnd;
  }
}
