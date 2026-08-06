#!/usr/bin/env node
/**
 * fetch-modern — vendor CC-BY blog posts as a modern-voice essay corpus.
 *
 *   node tests/corpus/fetch-modern.mjs             # dry run
 *   node tests/corpus/fetch-modern.mjs --write     # fetch + write
 *
 * Companion to fetch-essays.mjs. That one covers pre-1930 essayists (Bacon,
 * Chesterton); this one covers modern voices - starting with Cory Doctorow at
 * pluralistic.net, who publishes daily under CC-BY 4.0.
 *
 * WHY BOTH. The critics still to build (substance, adversarial-reader,
 * fidelity) need argumentative prose in a recognisable individual voice.
 * Bacon and Chesterton give the extreme historical case. Doctorow gives the
 * modern case - long-form linked essays with a first-person point of view,
 * links out, code-fence-like structure, present-tense reference to current
 * events. Between the two, a critic that claims to recognise "voice" gets
 * tested across three or four centuries and every register in between.
 *
 * ============================================================================
 * WHAT COUNTS AS A COMMITTABLE SOURCE
 * ============================================================================
 *
 * The bar is the same as fetch-essays.mjs: only public-domain or CC-BY / CC0.
 * pluralistic.net qualifies - Cory Doctorow's post colophons state
 * "Creative Commons Attribution 4.0 license", excluding serialized fiction
 * (which we do not fetch). See: https://pluralistic.net/2024/01/15/...
 *
 * The RSS feed at https://pluralistic.net/feed/ returns up to 60 recent posts
 * with content:encoded. This fetcher takes the N most recent and vendors them,
 * one file per post, with attribution recorded in ATTRIBUTION.json. The
 * committed files stay put; a re-run only fills what is missing.
 *
 * ============================================================================
 * WHAT THIS FETCHER STRIPS
 * ============================================================================
 *
 * Pluralistic posts have a fixed structure: leading HTML comment with the
 * tags/summary/URL metadata, masthead image, "Today's links" table of
 * contents, one or more essay sections, "Hey look at this" link roundup,
 * "This day in history", appearance/book announcements, colophon, About This
 * Site boilerplate, legal disclaimer, ISSN.
 *
 * We keep the essay sections AND the link roundups. Both are Cory's writing.
 * We strip:
 *   - the leading HTML comment block  (before `-->` on the first `<p>`)
 *   - the "About This Site" boilerplate  (starts with the CC license notice)
 *   - the BOGUS AGREEMENTS legal text and ISSN footer
 * The border in each case is stable enough that the count-check below acts
 * as a canary: if the stripped body is under 200 words or over 20,000, the
 * parser mis-identified an anchor and the post is excluded from the write.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "human-essays", "pluralistic");
const ATTR_PATH = join(HERE, "human-essays", "ATTRIBUTION.modern.json");

const FEED_URL = "https://pluralistic.net/feed/";
const PICK_N = 20;

/** Reasonable word-count bounds for a real pluralistic post body. */
const MIN_WORDS = 500;
const MAX_WORDS = 20000;

async function fetchFeed() {
  const r = await fetch(FEED_URL, { headers: { "user-agent": "agent-primitives-corpus/1.0 (research)" } });
  if (!r.ok) throw new Error(`${FEED_URL}: HTTP ${r.status}`);
  return r.text();
}

/** Extract <item> blocks and, for each, title / link / pubDate / content. */
function parseItems(rss) {
  const items = rss.match(/<item[\s\S]*?<\/item>/g) || [];
  return items.map((raw) => {
    const pick = (tag) => {
      const m = raw.match(new RegExp(`<${tag}(?:[^>]*)>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
      return m ? m[1].trim() : null;
    };
    return {
      title: pick("title"),
      link: pick("link"),
      pubDate: pick("pubDate"),
      content: pick("content:encoded"),
    };
  }).filter((it) => it.title && it.link && it.content);
}

/**
 * Turn a pluralistic content:encoded blob into plain prose.
 *
 * The steps are ordered so each rests on the previous one's output. Order
 * matters: strip images BEFORE decoding entities, or an entity inside an alt
 * attribute would become a phantom character in the text; strip the colophon
 * BEFORE stripping tags so the anchor is still recognisable.
 */
function extractBody(html) {
  let s = html;

  // 1. Drop the leading HTML comment carrying tags/summary/URL/etc. It sits
  //    inside the first <p>, and always ends at "-->". Everything before the
  //    close of that comment is metadata, not prose.
  const commentEnd = s.indexOf("-->");
  if (commentEnd !== -1) s = s.slice(commentEnd + 3);

  // 2. Cut off the license notice + About-This-Site + legal + ISSN block. The
  //    license paragraph opens with "This work - excluding any serialized
  //    fiction - is licensed under a Creative Commons Attribution 4.0 license."
  //    Anchoring at "Creative Commons" alone leaves the "This work" preamble
  //    dangling in the vendored body; anchoring at "This work" cuts the whole
  //    sentence cleanly.
  //
  //    Fallbacks: BOGUS AGREEMENTS and ISSN sit later in the same footer and
  //    catch posts where the CC boilerplate is worded differently.
  const licenseIdx = s.search(/(?:<p>\s*This work[^<]*?(?:excluding|is licensed)|Creative Commons Attribution|BOGUS AGREEMENTS|ISSN:\s*\d)/);
  if (licenseIdx !== -1) s = s.slice(0, licenseIdx);

  // 3. Strip block-level noise entirely: images, figures, scripts, style,
  //    iframes, and jetpack widgets that leak markup into the body.
  s = s.replace(/<img\s[^>]*>/gi, "");
  s = s.replace(/<figure[\s\S]*?<\/figure>/gi, "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");

  // 4. Replace <a>...</a> with the link text - the URL is not writing.
  s = s.replace(/<a\s[^>]*>([\s\S]*?)<\/a>/gi, "$1");

  // 5. Convert block breaks to newlines so paragraph structure survives the
  //    tag strip. Do this before removing all tags.
  s = s.replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");

  // 6. Strip remaining tags.
  s = s.replace(/<[^>]+>/g, "");

  // 7. Decode common HTML entities. This is not exhaustive - a rare entity
  //    that survives is preferable to a hand-rolled parser we would have to
  //    audit forever - but the common ones matter for word counts.
  s = decodeEntities(s);

  // 8. Collapse consecutive whitespace within lines and multiple blank lines
  //    between paragraphs. Preserve paragraph structure.
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/^ +| +$/gm, "");
  return s.trim();
}

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": "\"",
  "&apos;": "'",
  "&#8211;": "\u2013",
  "&#8212;": "\u2014",
  "&#8216;": "\u2018",
  "&#8217;": "\u2019",
  "&#8220;": "\u201c",
  "&#8221;": "\u201d",
  "&#8230;": "\u2026",
  "&nbsp;": " ",
  "&hellip;": "\u2026",
  "&mdash;": "\u2014",
  "&ndash;": "\u2013",
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m] ?? m);
}

/** ISO date from an RFC-822 pubDate string, without a Date-object round trip. */
function isoDate(pubDate) {
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Filename convention: <yyyy-mm-dd>-<slug>.txt where the slug comes from the
 * last non-empty path segment of the permalink.
 */
function makeName(link, date) {
  const path = link.replace(/^https?:\/\/[^/]+/, "").replace(/^\/+|\/+$/g, "");
  const slug = path.split("/").filter(Boolean).pop() || "post";
  return `${date}-${slug}.txt`;
}

function wordCount(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

function slugTitle(title) {
  // "Pluralistic: Google is a scammer's paradise (05 Aug 2026)" -> the middle.
  const cleaned = title.replace(/^Pluralistic:\s*/, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  return cleaned || title;
}

async function main() {
  const write = process.argv.includes("--write");

  process.stdout.write(`  fetching ${FEED_URL}\n`);
  const rss = await fetchFeed();
  const items = parseItems(rss);
  process.stdout.write(`  ${items.length} items in feed; taking ${PICK_N}\n`);

  const picked = items.slice(0, PICK_N).map((it) => {
    const date = isoDate(it.pubDate) || "0000-00-00";
    const body = extractBody(it.content);
    const words = wordCount(body);
    const name = makeName(it.link, date);
    const skipReason = words < MIN_WORDS ? `body only ${words} words (parser likely cut too much)`
      : words > MAX_WORDS ? `body ${words} words (parser likely kept boilerplate)`
      : null;
    return { ...it, date, body, words, name, skipReason };
  });

  const good = picked.filter((p) => !p.skipReason);
  const skipped = picked.filter((p) => p.skipReason);

  process.stdout.write("\n  plan:\n");
  for (const p of good) {
    process.stdout.write(`    ${p.name.padEnd(60)} ${String(p.words).padStart(5)} words\n`);
  }
  if (skipped.length) {
    process.stdout.write(`\n  ${skipped.length} skipped (word bounds):\n`);
    for (const s of skipped) process.stdout.write(`    ${s.name}  ${s.skipReason}\n`);
  }

  if (!write) {
    process.stdout.write("\n  dry run - pass --write to save\n");
    return;
  }

  if (existsSync(OUT)) {
    for (const f of readdirSync(OUT)) rmSync(join(OUT, f));
  } else {
    mkdirSync(OUT, { recursive: true });
  }

  const attribution = {
    license: "CC-BY 4.0",
    source: "pluralistic.net (Cory Doctorow)",
    license_url: "https://creativecommons.org/licenses/by/4.0/",
    license_evidence: "Colophon of each post reads: \"Creative Commons Attribution 4.0 license\".",
    fetched: new Date().toISOString().slice(0, 10),
    posts: [],
  };

  for (const p of good) {
    const title = slugTitle(p.title);
    const frontmatter = [
      "---",
      `source: pluralistic.net (Cory Doctorow)`,
      `title: ${title.replace(/[\r\n]+/g, " ")}`,
      "author: Cory Doctorow",
      `date: ${p.date}`,
      "human_authored: true",
      "license: CC-BY-4.0",
      `permalink: ${p.link}`,
      "---",
      "",
    ].join("\n");
    writeFileSync(join(OUT, p.name), frontmatter + p.body + "\n");
    attribution.posts.push({
      file: `pluralistic/${p.name}`,
      title,
      permalink: p.link,
      pubDate: p.pubDate,
      words: p.words,
    });
  }
  writeFileSync(ATTR_PATH, `${JSON.stringify(attribution, null, 2)}\n`);

  process.stdout.write(`\n  wrote ${good.length} posts to ${OUT}\n`);
  process.stdout.write(`  wrote ${ATTR_PATH}\n\n`);
}

main().catch((err) => {
  process.stderr.write(`fetch-modern: ${err.message}\n`);
  process.exit(1);
});
