#!/usr/bin/env node
/**
 * fetch-corpus — vendor the acceptance corpus from Wikipedia.
 *
 *   node tests/corpus/fetch-corpus.mjs            # dry run: report what it would fetch
 *   node tests/corpus/fetch-corpus.mjs --write    # fetch and write
 *
 * Run this rarely. The corpus is COMMITTED, and the committed copy is what the
 * acceptance suite reads — a test that needs the network is a test that gets
 * skipped, and a skipped test is the same outcome as not having one.
 *
 * ============================================================================
 * WHY THIS CORPUS EXISTS
 * ============================================================================
 *
 * Until now the suite had never observed AI text. Both fixtures are the same
 * human author's draft and revision, so every "detection" assertion measured
 * draft-versus-revision. The tool could have been measuring nothing and the
 * suite would still have been green — which is not a hypothetical: the
 * apostrophe defect (CALIBRATION.md FN-2026-08-03-c) shipped in v0.1, survived
 * an audit aimed at it, and would have been caught in minutes by a single real
 * pasted sample.
 *
 * Two corpora, both CC BY-SA 4.0, both with provenance pinned to an immutable
 * revision id:
 *
 *   ai/     Wikipedia:Signs of AI writing/Examples/* — text the community
 *           examined and judged AI-written. Not our guess; theirs.
 *
 *   human/  Article revisions from BEFORE 2022-11-30, the date ChatGPT became
 *           public. The source page calls this the one dispositive signal of
 *           human authorship: text that predates the tool cannot have used it.
 *           Deliberately weighted toward Indian, Nigerian and Kenyan topics,
 *           because the catalog's most serious documented bias is against the
 *           ornate formal register that is professional norm in those varieties
 *           of English. This corpus is how that bias stops being an assertion.
 *
 * ============================================================================
 * LICENSING — read before adding anything
 * ============================================================================
 *
 * This repository is MIT. The corpus is NOT: it is CC BY-SA 4.0, kept in its own
 * directory with its own LICENSE and an ATTRIBUTION.json naming every source
 * revision. Share-alike travels with these files.
 *
 * Nothing else may be vendored here. Not contemporary news, not books, not
 * blogs, not anyone's private writing — no matter how good a sample it would
 * make. If you want model output in the corpus, generate it yourself and record
 * `model` and `prompt` in its frontmatter.
 *
 * ============================================================================
 * HELD-OUT, DEFINED MECHANICALLY
 * ============================================================================
 *
 * `catalog.json` carries `retrieved`. Any sample whose source revision POSTDATES
 * that is held out; anything the catalog could have been built from is tuning.
 * The suite enforces the split, so it cannot quietly become self-congratulation.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const UA = "agent-primitives/prose-tell-scan corpus fetch (https://github.com/ConnorBritain/agent-primitives)";
const API = "https://en.wikipedia.org/w/api.php";

const WRITE = process.argv.includes("--write");

/** Wikipedia asks for serial requests from unregistered tools. Honour it. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", action: "query", ...params })}`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${params.titles ?? params.revids}`);
    return res.json();
  }
  throw new Error("rate-limited after 4 attempts — wait and retry");
}

/** Plain text of one revision, by immutable id. */
async function extractByRevid(revid) {
  const d = await api({ prop: "extracts", explaintext: "1", revids: String(revid) });
  const page = Object.values(d.query.pages)[0];
  return { title: page.title, text: page.extract ?? "" };
}

/** The newest revision of `title` that predates `beforeISO`. */
async function revisionBefore(title, beforeISO) {
  const d = await api({
    prop: "revisions", titles: title, redirects: "1",
    rvprop: "ids|timestamp|size", rvstart: beforeISO, rvlimit: "1", rvdir: "older",
  });
  const page = Object.values(d.query.pages)[0];
  const rv = page?.revisions?.[0];
  if (!rv) return null;
  return { title: page.title, revid: rv.revid, timestamp: rv.timestamp, size: rv.size };
}

/** Current revision id and text of an AI-example subpage. */
async function currentRevision(title) {
  const d = await api({ prop: "revisions", titles: title, rvprop: "ids|timestamp", rvlimit: "1" });
  const page = Object.values(d.query.pages)[0];
  const rv = page?.revisions?.[0];
  if (!rv) return null;
  return { title: page.title, revid: rv.revid, timestamp: rv.timestamp };
}

async function listExamples() {
  const d = await api({
    list: "allpages", apprefix: "Signs of AI writing/Examples/",
    apnamespace: "4", aplimit: "500",
  });
  return d.query.allpages.map((p) => p.title);
}

const CHATGPT_LAUNCH = "2022-11-29T00:00:00Z";

/**
 * Human corpus targets. Ornate/formal register in varieties of English the
 * catalog is documented to over-fire on, plus a few controls in other registers
 * so the corpus is not purely one style.
 */
const HUMAN_TARGETS = [
  "Kenyatta University", "University of Lagos", "Jawaharlal Nehru University",
  "Obafemi Awolowo University", "University of Nairobi", "Banaras Hindu University",
  "University of Ibadan", "Aligarh Muslim University", "Makerere University",
  "Indian Institute of Science", "Ahmadu Bello University", "University of Delhi",
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

function frontmatter(fields) {
  return `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n\n`;
}

async function main() {
  const attribution = { license: "CC BY-SA 4.0", generated: null, ai: [], human: [] };
  const aiDir = join(HERE, "ai");
  const humanDir = join(HERE, "human");
  if (WRITE) { mkdirSync(aiDir, { recursive: true }); mkdirSync(humanDir, { recursive: true }); }

  process.stdout.write("AI corpus — Wikipedia:Signs of AI writing/Examples/*\n");
  const examples = await listExamples();
  process.stdout.write(`  ${examples.length} subpages listed\n`);

  for (const title of examples) {
    await sleep(350);
    const rev = await currentRevision(title);
    if (!rev) { process.stdout.write(`  SKIP (no revision) ${title}\n`); continue; }
    await sleep(350);
    const { text } = await extractByRevid(rev.revid);
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words < 200) { process.stdout.write(`  skip (${words}w) ${title}\n`); continue; }

    const name = slug(title.replace("Wikipedia:Signs of AI writing/Examples/", ""));
    const entry = {
      file: `ai/${name}.txt`, title, revid: rev.revid, timestamp: rev.timestamp, words,
      permalink: `https://en.wikipedia.org/w/index.php?oldid=${rev.revid}`,
    };
    attribution.ai.push(entry);
    process.stdout.write(`  ${String(words).padStart(5)}w  ${name}\n`);

    if (WRITE) {
      writeFileSync(join(aiDir, `${name}.txt`), frontmatter({
        source: `Wikipedia:Signs of AI writing/Examples/${title.split("/").pop()}`,
        revid: rev.revid, date: rev.timestamp.slice(0, 10),
        human_authored: false, label: "ai",
        license: "CC BY-SA 4.0", permalink: entry.permalink,
      }) + text);
    }
  }

  process.stdout.write("\nHuman corpus — revisions predating ChatGPT's public launch\n");
  for (const title of HUMAN_TARGETS) {
    await sleep(350);
    const rev = await revisionBefore(title, CHATGPT_LAUNCH);
    if (!rev) { process.stdout.write(`  SKIP (no pre-2022 revision) ${title}\n`); continue; }
    if (rev.size < 8000) { process.stdout.write(`  skip (redirect/stub, ${rev.size}B) ${title}\n`); continue; }
    await sleep(350);
    const { text } = await extractByRevid(rev.revid);
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words < 200) { process.stdout.write(`  skip (${words}w) ${title}\n`); continue; }

    const name = slug(rev.title);
    const entry = {
      file: `human/${name}.txt`, title: rev.title, revid: rev.revid,
      timestamp: rev.timestamp, words,
      permalink: `https://en.wikipedia.org/w/index.php?oldid=${rev.revid}`,
    };
    attribution.human.push(entry);
    process.stdout.write(`  ${String(words).padStart(5)}w  ${rev.timestamp.slice(0, 10)}  ${name}\n`);

    if (WRITE) {
      // human_authored: true is a FACT here, not an attestation. The revision
      // predates the tool; that is the source page's one dispositive signal.
      writeFileSync(join(humanDir, `${name}.txt`), frontmatter({
        source: `Wikipedia "${rev.title}" revision ${rev.revid}`,
        revid: rev.revid, date: rev.timestamp.slice(0, 10),
        human_authored: true, label: "human",
        attested_by: "revision predates 2022-11-30 (ChatGPT public launch)",
        license: "CC BY-SA 4.0", permalink: entry.permalink,
      }) + text);
    }
  }

  process.stdout.write(`\nai: ${attribution.ai.length}   human: ${attribution.human.length}\n`);
  if (!WRITE) { process.stdout.write("\nDry run. Re-run with --write to vendor.\n"); return; }

  attribution.generated = new Date().toISOString().slice(0, 10);
  attribution._about = [
    "Every sample here is CC BY-SA 4.0 from English Wikipedia, pinned to an immutable",
    "revision id. `permalink` resolves to exactly the text vendored.",
    "AI samples are pages the community examined and judged AI-written.",
    "Human samples predate 2022-11-30, so human authorship is a fact about the",
    "timestamp rather than an attestation anyone had to make.",
  ];
  writeFileSync(join(HERE, "ATTRIBUTION.json"), `${JSON.stringify(attribution, null, 2)}\n`);
  process.stdout.write("wrote ATTRIBUTION.json\n");
}

main().catch((e) => { process.stderr.write(`${e.message}\n`); process.exit(1); });
