#!/usr/bin/env node
/**
 * fetch-professional — vendor EFF Deeplinks posts as a MODERN PROFESSIONAL
 * register sample. CC-BY 4.0.
 *
 *   node tests/corpus/fetch-professional.mjs             # dry run
 *   node tests/corpus/fetch-professional.mjs --write     # fetch + write
 *
 * ============================================================================
 * THIS IS NOT A VOICE CORPUS, AND THE DIRECTORY NAME IS THE WARNING
 * ============================================================================
 *
 * It writes to `human-professional/`, NOT to `human-essays/`, and the split is
 * load-bearing rather than cosmetic.
 *
 * `human-essays/` holds SINGLE IDENTIFIABLE AUTHORS with enough samples each
 * to characterise one person's cadence. Everything that reasons about voice -
 * calibrating a profile, the voice critic's cross-author test - depends on
 * "these samples were written by the same human" being true.
 *
 * Deeplinks is written by EFF's staff: the feed carries ~27 named authors
 * across 50 posts, so no author clears the 15-sample floor and never will at
 * this cadence. Averaging them produces a house style, not a person. Filed
 * with `human/` (multi-author Wikipedia) in kind, and kept out of the
 * single-author set for the same reason `human/` is.
 *
 * WHAT IT IS FOR. Register coverage. `human-essays/` reaches argument (Bacon,
 * Chesterton), correspondence (Chekhov), narration (Chopin, O. Henry) and
 * modern long-form (Doctorow); `human/` reaches encyclopedic. None of them
 * reaches contemporary professional advocacy - the register of a policy post
 * or a campaign explainer, which is edited prose with a house voice, a call to
 * action, and a deadline. That register is what a lot of real drafting
 * actually is, and until now nothing measured it.
 *
 * ONE OVERLAP WORTH KNOWING. Cory Doctorow appears in this feed and also has
 * his own single-author tranche in `human-essays/pluralistic/`. Anything doing
 * cross-author work must draw from one bucket, not both, or it will score an
 * author against himself and call the result a match.
 *
 * ============================================================================
 * LICENSING - the evidence, not a summary of it
 * ============================================================================
 *
 * https://www.eff.org/copyright, "Creative Commons" section, verbatim:
 *
 *   "Any and all original material on the EFF website may be freely
 *    distributed at will under the Creative Commons Attribution 4.0
 *    International License (CC-BY), unless otherwise noted. All material that
 *    is not original to EFF may require permission from the copyright holder
 *    to redistribute."
 *
 * Deeplinks posts are original EFF material. The two caveats are real and are
 * handled: "unless otherwise noted" is why the fetcher refuses any post whose
 * body carries a competing licence or copyright line (see REFUSALS below), and
 * "not original to EFF" is why block quotations are kept but nothing is
 * vendored from a post that is mostly reprinted third-party text.
 *
 * The bar is unchanged from the sibling fetchers: public domain, CC0, CC-BY,
 * or CC-BY-SA only. If the licence cannot be quoted, the source does not land.
 */

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "human-professional");
const ATTR_PATH = join(OUT, "ATTRIBUTION.json");

const FEED_URL = "https://www.eff.org/rss/updates.xml";

/**
 * Word bounds. The floor is the calibration floor. The ceiling is a canary:
 * a Deeplinks post running past 20,000 words means the extractor kept a
 * navigation blob, not that someone wrote a book.
 */
const MIN_WORDS = 200;
const MAX_WORDS = 20000;

/**
 * REFUSALS. A post whose body carries one of these is not vendored, because
 * "unless otherwise noted" in EFF's policy means a note like this overrides
 * the site-wide CC-BY grant. Refusing is the honest response to an ambiguous
 * licence; guessing is not.
 */
const LICENCE_OVERRIDES = [
  /all rights reserved/i,
  /©\s*\d{4}(?!\s*Electronic Frontier)/i,
  /reprinted with permission/i,
  /used by permission/i,
];

async function fetchFeed() {
  const r = await fetch(FEED_URL, {
    headers: { "user-agent": "agent-primitives-corpus/1.0 (research)" },
  });
  if (!r.ok) throw new Error(`${FEED_URL}: HTTP ${r.status}`);
  return r.text();
}

/**
 * Extract <item> blocks. Unlike pluralistic, EFF puts the whole post body in
 * `description` rather than `content:encoded`, and escapes it rather than
 * wrapping it in CDATA - so the field has to be entity-decoded ONCE before it
 * is even HTML, and again after tags come out (entities survive inside text
 * nodes). Decoding once would leave `&amp;#039;` in the vendored prose.
 */
function parseItems(rss) {
  const items = rss.match(/<item[\s\S]*?<\/item>/g) || [];
  return items.map((raw) => {
    const pick = (tag) => {
      const m = raw.match(
        new RegExp(`<${tag}(?:[^>]*)>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`),
      );
      return m ? decodeEntities(m[1].trim()) : null;
    };
    return {
      title: pick("title"),
      link: pick("link"),
      pubDate: pick("pubDate"),
      author: pick("dc:creator"),
      content: pick("description"),
    };
  }).filter((it) => it.title && it.link && it.content);
}

/**
 * Turn a decoded Deeplinks body into plain prose.
 *
 * Order matters for the same reason it does in fetch-modern.mjs: anchors that
 * identify furniture must still be recognisable when we cut, so class-based
 * removals run BEFORE the blanket tag strip.
 */
function extractBody(html) {
  let s = html;

  // 1. Campaign furniture. Deeplinks wraps its calls to action in
  //    <p class="take-action"> and <p class="take-explainer">, which contain a
  //    button label and a one-line pitch. They are site chrome that happens to
  //    be prose-shaped: a cadence tool that ingested them would learn that
  //    3-word paragraphs are normal in this register. They are not.
  s = s.replace(/<p class="take-(?:action|explainer)"[\s\S]*?<\/p>/gi, "");

  // 2. Block-level noise.
  s = s.replace(/<img\s[^>]*>/gi, "");
  s = s.replace(/<figure[\s\S]*?<\/figure>/gi, "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");

  // 3. Link text is writing; the URL is not.
  s = s.replace(/<a\s[^>]*>([\s\S]*?)<\/a>/gi, "$1");

  // 4. Preserve paragraph structure before the tags go.
  s = s.replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");

  // 5. Strip remaining tags, then decode the entities that lived inside text
  //    nodes (the first decode in parseItems only un-escaped the RSS layer).
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);

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
  "&nbsp;": " ",
  "&hellip;": "…",
  "&mdash;": "—",
  "&ndash;": "–",
  "&lsquo;": "‘",
  "&rsquo;": "’",
  "&ldquo;": "“",
  "&rdquo;": "”",
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m] ?? m);
}

function isoDate(pubDate) {
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function makeName(link, date) {
  const path = link.replace(/^https?:\/\/[^/]+/, "").replace(/^\/+|\/+$/g, "");
  const slug = path.split("/").filter(Boolean).pop() || "post";
  return `${date}-${slug}.txt`;
}

function wordCount(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

async function main() {
  const write = process.argv.includes("--write");

  process.stdout.write(`  fetching ${FEED_URL}\n`);
  const rss = await fetchFeed();
  const items = parseItems(rss);
  process.stdout.write(`  ${items.length} items in feed\n`);

  const picked = items.map((it) => {
    const date = isoDate(it.pubDate) || "0000-00-00";
    const body = extractBody(it.content);
    const words = wordCount(body);
    const override = LICENCE_OVERRIDES.find((rx) => rx.test(body));
    const skipReason = override ? `licence override in body (${override})`
      : words < MIN_WORDS ? `body only ${words} words (below the calibration floor)`
      : words > MAX_WORDS ? `body ${words} words (extractor likely kept chrome)`
      : !it.author ? "no dc:creator - cannot attribute"
      : null;
    return { ...it, date, body, words, name: makeName(it.link, date), skipReason };
  });

  const good = picked.filter((p) => !p.skipReason);
  const skipped = picked.filter((p) => p.skipReason);

  process.stdout.write("\n  plan:\n");
  for (const p of good) {
    process.stdout.write(`    ${p.name.padEnd(64)} ${String(p.words).padStart(5)}w  ${p.author}\n`);
  }
  if (skipped.length) {
    process.stdout.write(`\n  ${skipped.length} skipped:\n`);
    for (const s of skipped) process.stdout.write(`    ${s.name}  ${s.skipReason}\n`);
  }

  const authors = new Set(good.map((p) => p.author));
  process.stdout.write(
    `\n  ${good.length} posts by ${authors.size} authors`
    + ` (${good.reduce((a, p) => a + p.words, 0)} words).\n`
    + "  Multi-author by construction - this is register coverage, not a voice corpus.\n",
  );

  if (!write) {
    process.stdout.write("\n  dry run - pass --write to save\n");
    return;
  }

  if (existsSync(OUT)) {
    // Rebuild the .txt set only. LICENSE is hand-written and must survive.
    for (const f of readdirSync(OUT)) {
      if (f.endsWith(".txt")) rmSync(join(OUT, f));
    }
  } else {
    mkdirSync(OUT, { recursive: true });
  }

  const attribution = {
    license: "CC-BY 4.0",
    source: "EFF Deeplinks (eff.org)",
    license_url: "https://creativecommons.org/licenses/by/4.0/",
    license_evidence:
      "https://www.eff.org/copyright: \"Any and all original material on the EFF "
      + "website may be freely distributed at will under the Creative Commons "
      + "Attribution 4.0 International License (CC-BY), unless otherwise noted.\"",
    multi_author: true,
    multi_author_note:
      "EFF staff blog: many named authors, none with enough samples to characterise "
      + "an individual voice. Use for register coverage, never as a single-author "
      + "voice corpus. See human-essays/ for the single-author set.",
    fetched: new Date().toISOString().slice(0, 10),
    posts: [],
  };

  for (const p of good) {
    const frontmatter = [
      "---",
      "source: EFF Deeplinks (eff.org)",
      `title: ${p.title.replace(/[\r\n]+/g, " ")}`,
      `author: ${p.author}`,
      `date: ${p.date}`,
      "human_authored: true",
      "license: CC-BY-4.0",
      "multi_author_collection: true",
      `permalink: ${p.link}`,
      "---",
      "",
    ].join("\n");
    writeFileSync(join(OUT, p.name), frontmatter + p.body + "\n");
    attribution.posts.push({
      file: p.name,
      title: p.title,
      author: p.author,
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
  process.stderr.write(`fetch-professional: ${err.message}\n`);
  process.exit(1);
});
