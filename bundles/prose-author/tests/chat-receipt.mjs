/** Test-side handoff classification; no model judgment or status rewriting. */
export function chatReceiptMode(final, draft, receipt) {
  if (/\bunverified\b/i.test(final)) return "unverified-summary";
  const paragraphs = final.replace(draft, "").trim().split(/\n\s*\n/);
  const excerpts = [];
  let attributed = false;
  for (const paragraph of paragraphs) {
    if (/^(?:generated\s+)?check receipt excerpts?:$/i.test(paragraph)) {
      attributed = true;
    } else if (paragraph.split("\n").every((line) => /^>\s?/.test(line))) {
      const quoted = paragraph.split("\n").map((line) => line.replace(/^>\s?/, "")).join("\n").trim();
      excerpts.push(...quoted.split(/\n\s*\n/).filter(Boolean));
    } else {
      // Only navigation links may accompany an unlabeled direct excerpt.
      const remainder = paragraph.replace(/\[[^\]]+\]\([^)]+\)/g, "").replace(/[\s·|]/g, "");
      if (remainder) return null;
    }
  }
  return attributed && excerpts.length > 0 && excerpts.every((excerpt) => receipt.includes(excerpt))
    ? "verified-receipt-excerpts" : null;
}
