/** Visible-prose normalization, versioned independently of the historical counters.
 * Offsets are UTF-16 indices into the ORIGINAL string, not bytes. Supported input is
 * plain text or Markdown; this is not an HTML layout engine. Unknown entities remain
 * literal and are reported. Straight quotation marks are not guessed to be quotations.
 */
export const NORMALIZATION_VERSION = "visible-prose/1";
export const WORD_RULE = "Unicode letter/number runs, retaining internal straight or curly apostrophes; hyphens separate words.";
export const wordCount = (text) => (text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? []).length;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };
function decode(text) {
  let result = "";
  const offsets = [], warnings = new Set();
  for (let i = 0; i < text.length;) {
    const entity = /^&(#x[0-9a-f]+|#\d+|[a-z]+);/i.exec(text.slice(i));
    let decoded;
    if (entity) {
      if (entity[1].startsWith("#")) {
        const n = entity[1][1].toLowerCase() === "x" ? parseInt(entity[1].slice(2), 16) : Number(entity[1].slice(1));
        if (n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)) decoded = String.fromCodePoint(n);
      } else decoded = ENTITIES[entity[1]];
      if (decoded === undefined) warnings.add(`Unrecognized entity: ${entity[0]}`);
    }
    if (decoded !== undefined) {
      result += decoded;
      for (let j = 0; j < decoded.length; j++) offsets.push(i);
      i += entity[0].length;
    } else { result += text[i]; offsets.push(i++); }
  }
  offsets.push(text.length);
  return { text: result, offsets, warnings: [...warnings] };
}

/** Mask non-prose without losing positions, then decode supported entities with a map. */
export function visibleProse(raw, { format = "markdown", quotedRanges = [], bodyRange = null } = {}) {
  if (typeof raw !== "string" || !["markdown", "plain"].includes(format)) throw new TypeError("Expected text and markdown/plain format");
  const chars = raw.split(""), exclusions = [], quotes = [];
  const mask = (start, end, kind, target = chars) => {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > raw.length) throw new TypeError(`Invalid ${kind} source range`);
    for (let i = start; i < end; i++) if (target[i] !== "\n" && target[i] !== "\r") target[i] = " ";
    if (target === chars) exclusions.push({ kind, start, end });
  };
  const apply = (pattern, kind) => {
    for (const m of chars.join("").matchAll(pattern)) mask(m.index, m.index + m[0].length, kind);
  };
  const fm = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(raw);
  if (fm) mask(0, fm[0].length, "metadata");
  if (bodyRange) { mask(0, bodyRange.start, "outside-body"); mask(bodyRange.end, raw.length, "outside-body"); }
  if (format === "markdown") {
    let fence = null;
    for (const m of chars.join("").matchAll(/[^\n]*(?:\n|$)/g)) {
      if (!m[0]) continue;
      const line = m[0].replace(/\r?\n$/, "");
      if (fence) {
        mask(m.index, m.index + m[0].length, "fenced-code");
        if (new RegExp(`^ {0,3}${fence.char}{${fence.size},}\\s*$`).test(line)) fence = null;
      } else {
        const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
        if (open) { fence = { char: open[1][0], size: open[1].length }; mask(m.index, m.index + m[0].length, "fenced-code"); }
      }
    }
    apply(/<!--(?:[\s\S]*?-->|[\s\S]*$)/g, "comment");
    apply(/<(script|style|pre|code)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "html-nonprose");
    // Indented code is recognizable at a paragraph boundary, not merely because
    // ordinary wrapped prose happens to have spaces in front of it.
    apply(/(?:^|\n[ \t]*\n)(?:(?: {4}|\t)[^\n]*(?:\n|$))+/g, "indented-code");
    for (const m of chars.join("").matchAll(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote\s*>/gi)) quotes.push({ start: m.index, end: m.index + m[0].length, kind: "html-blockquote" });
    // A matching run closes an inline code span; unmatched backticks stay literal.
    let current = chars.join("");
    for (let i = 0; i < current.length; i++) {
      if (current[i] !== "`") continue;
      const start = i; while (current[i + 1] === "`") i++;
      const run = i - start + 1, tail = current.slice(i + 1);
      const end = new RegExp(`(?<!\x60)\x60{${run}}(?!\x60)`).exec(tail);
      if (end) { const close = i + 1 + end.index + run; mask(start, close, "inline-code"); i = close - 1; }
    }
    apply(/^ {0,3}\[[^\]\n]+\]:[^\n]*(?:\n|$)/gm, "link-definition");
    current = chars.join("");
    // Balanced inline targets, including escaped and nested parentheses. Preserve labels.
    for (let i = 0; i < current.length; i++) {
      if (current[i] !== "[" || current[i - 1] === "\\") continue;
      const labelStart = i; let j = i + 1, depth = 1;
      for (; j < current.length && depth; j++) {
        if (current[j] === "\\") { j++; continue; }
        if (current[j] === "[") depth++;
        if (current[j] === "]") depth--;
      }
      if (depth) continue;
      const labelEnd = j - 1;
      if (current[j] === "(") {
        let k = j + 1, nesting = 1, title = null, angle = false;
        for (; k < current.length && nesting; k++) {
          const c = current[k];
          if (c === "\\") { k++; continue; }
          if (title) { if (c === title) title = null; continue; }
          if (c === "<") angle = true;
          else if (c === ">") angle = false;
          else if (!angle && (c === '"' || c === "'") && /\s/.test(current[k - 1])) title = c;
          else if (!angle && c === "(") nesting++;
          else if (!angle && c === ")") nesting--;
        }
        if (!nesting) {
          if (current[labelStart - 1] === "!") mask(labelStart - 1, k, "image");
          else { mask(labelStart, labelStart + 1, "link-marker"); mask(labelEnd, k, "link-target"); }
          i = k - 1;
        }
      } else if (current[j] === "[") {
        const close = current.indexOf("]", j + 1);
        if (close !== -1 && !current.slice(j, close).includes("\n")) {
          if (current[labelStart - 1] === "!") mask(labelStart - 1, close + 1, "image");
          else { mask(labelStart, labelStart + 1, "link-marker"); mask(labelEnd, close + 1, "link-reference"); }
          i = close;
        }
      }
    }
    apply(/<\/?[A-Za-z][^>\n]*>/g, "html-tag");
    apply(/^ {0,3}(?:#{1,6}\s+|(?:[-+*]|\d+[.)])\s+)/gm, "block-marker");
    apply(/^ {0,3}(?:[-*_]\s*){3,}$/gm, "thematic-break");
    // Recognizable Markdown block quotes are recorded separately, never attributed
    // to the author by default. Inline quotes require caller-supplied source ranges.
    for (const m of chars.join("").matchAll(/^ {0,3}>[^\n]*(?:\n|$)/gm)) quotes.push({ start: m.index, end: m.index + m[0].length, kind: "blockquote" });
    apply(/^ {0,3}>\s?/gm, "quote-marker");
    apply(/[*_~]{1,3}/g, "inline-marker");
  }
  // Stop bare URLs before closing punctuation, but preserve prose parentheses.
  for (const m of chars.join("").matchAll(/\b(?:https?|ftp):\/\/[^\s<>]+/gi)) {
    let url = m[0].replace(/[.,;:!?]+$/, "");
    while (url.endsWith(")") && (url.match(/\)/g) ?? []).length > (url.match(/\(/g) ?? []).length) url = url.slice(0, -1);
    mask(m.index, m.index + url.length, "bare-url");
  }
  const visible = decode(chars.join(""));
  const authorChars = [...chars];
  for (const span of [...quotes, ...quotedRanges]) {
    mask(span.start, span.end, "quoted-material", authorChars);
    if (!quotes.includes(span)) quotes.push({ ...span, kind: "declared-quote" });
  }
  const author = decode(authorChars.join(""));
  return { schema: NORMALIZATION_VERSION, source_length: raw.length, format,
    visible: visible.text, author: author.text, visible_offsets: visible.offsets,
    author_offsets: author.offsets, exclusions, quotations: quotes,
    warnings: [...new Set([...visible.warnings, ...author.warnings])], word_rule: WORD_RULE };
}

export function locatedMatches(text, pattern, offsets) {
  return [...text.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))]
    .map((m) => ({ text: m[0], start: offsets[m.index], end: offsets[m.index + m[0].length] }));
}
