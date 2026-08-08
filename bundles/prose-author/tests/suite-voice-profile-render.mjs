/**
 * voice-profile-render — the hold, the citation contract, and the fixtures
 *
 * Split out of selftest.mjs, which had grown to 1164 lines across three unrelated
 * primitives while their logic modules were already separate. Each suite exports a
 * `run(t, ctx)` so the shared temp dir and counters stay in one place and the
 * assertions live next to the thing they describe.
 */

import { mkdirSync, readdirSync, writeFileSync, existsSync as fsExists, readFileSync as fsRead } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { validateVoiceProfile, corpusLock, parseRender } from "./voice-profile.mjs";
import { readSamples } from "../skills/prose-draft/tools/exemplars.mjs";

export async function run(t, { tmp, HERE }) {
  t.group("voice-profile-render — the hold");
  {
    // primitives/ is the source, bundles/ is the deployment, and the gap between
    // them is how this repo says a primitive exists but does not ship. Same guard
    // shape as prose-reviser's in the prose-review selftest.
    //
    // The shipped branch is dead code today. It is written anyway so that lifting
    // the hold does not also require writing the check that would have caught a
    // bad lift.
    const primitiveDir = resolve(HERE, "..", "..", "..", "primitives", "agents", "voice-profile-render");
    const metaPath = join(primitiveDir, "meta.yaml");
    const meta = fsExists(metaPath) ? fsRead(metaPath, "utf8") : "";
    const held = /^ships:\s*false\b/m.test(meta);
    const shipped = /^ships:\s*true\b/m.test(meta);
    const renderedPath = resolve(HERE, "..", "agents", "voice-profile-render.md");
    const renderedExists = fsExists(renderedPath);

    t.check("voice-profile-render: meta.yaml declares ships as exactly one of true or false",
      held !== shipped);
    t.check("voice-profile-render: a held primitive is absent from the bundle's agents/ directory",
      !held || !renderedExists);
    t.check("voice-profile-render: a held primitive declares a held_reason",
      !held || /^held_reason:\s*\S/m.test(meta));

    // The catalog firewall is a contract claim; assert it is at least declared, so
    // flipping it requires editing the line rather than quietly adding a tool.
    t.check("voice-profile-render: declares reads_catalog: false",
      /^\s*reads_catalog:\s*false\b/m.test(meta));
    t.check("voice-profile-render: declares kind: author",
      /^kind:\s*author\b/m.test(meta));

    const agentPath = join(primitiveDir, "agent.md");
    if (fsExists(agentPath)) {
      const src = fsRead(agentPath, "utf8");
      const fm = /^---\n([\s\S]*?)\n---\n/.exec(src);
      const keys = fm ? fm[1].split("\n").filter((l) => /^\w[\w-]*:/.test(l)).map((l) => l.split(":")[0]) : [];
      t.check("voice-profile-render: agent.md frontmatter carries only name + description",
        JSON.stringify(keys.sort()) === JSON.stringify(["description", "name"]));

      if (shipped && renderedExists) {
        const strip = (s) => s.replace(/^---\n[\s\S]*?\n---\n/, "");
        t.check("voice-profile-render: rendered body is byte-identical to primitives/ source (AGENTS.md rule 1)",
          strip(src) === strip(fsRead(renderedPath, "utf8")));
      }
    } else {
      t.check("voice-profile-render: agent.md exists", false);
    }
  }

  t.group("voice-profile-render prompt — the fixtures must not leak into the prompt");
  {
    // This guard exists because the first version of the prompt failed it. Its
    // formatting examples were written using the Chekhov fixture, and two of them
    // paraphrased findings from the S1 diagnostic ("questions aimed at the recipient
    // rather than the page", "nothing reaches for which is to say"). Both came back
    // near-verbatim in the renders, and the run doc then reported them as derived
    // from the corpus.
    //
    // That is the whole measurement destroyed: a primitive whose one job is to avoid
    // inventing observations was being handed its conclusions in its own instructions,
    // and the artefact it produced was being cited as evidence that it had not been.
    // Prompt examples must be author-neutral, or the positive test measures recall.
    const agentPath = resolve(HERE, "..", "..", "..", "primitives", "agents", "voice-profile-render", "agent.md");
    const prompt = fsExists(agentPath) ? fsRead(agentPath, "utf8").toLowerCase() : "";

    const fixtures = resolve(HERE, "fixtures", "profiles");
    const fixtureNames = fsExists(fixtures)
      ? readdirSync(fixtures, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
      : [];

    for (const name of fixtureNames) {
      t.check(`prompt does not name the ${name} fixture`,
        !prompt.includes(name.toLowerCase()));
      // The author's surname is the first half of the fixture dir name and is the
      // form most likely to survive a careless rewrite of the fixture name itself.
      const surname = name.split("-")[0];
      if (surname.length > 4) {
        t.check(`prompt does not name the ${surname} corpus`, !prompt.includes(surname));
      }
      const corpusDir = join(fixtures, name, "corpus", "human");
      if (fsExists(corpusDir)) {
        const leaked = readdirSync(corpusDir).filter((f) => f.endsWith(".txt") && prompt.includes(f.toLowerCase()));
        t.check(`prompt quotes no ${name} sample filename`, leaked.length === 0, leaked.join(", "));
      }
    }

    // The four constraints S1 surfaced. The run doc's positive test claims these are
    // re-derived from the corpus; that claim is only worth anything if the prompt
    // cannot have supplied them.
    for (const phrase of [
      "which is to say",
      "aimed at the recipient",
      "anchored to observed",
      "periodic opening",
    ]) {
      t.check(`prompt does not hand over the S1 finding "${phrase}"`, !prompt.includes(phrase));
    }
  }

  t.group("voice-profile schema — an uncited observation must not reach the artefact");
  {
    const base = () => ({
      schema: "voice-profile/1",
      profile: "chekhov-correspondence",
      confidence: "full",
      samples_used: Array.from({ length: 10 }, (_, i) => `s${i}.txt`),
      samples_excluded: [],
      voice_card: "empty",
      observations: [{ id: "o01", section: "cadence", support: 8, of: 10 }],
      observations_dropped: 3,
      multiple_voices_suspected: false,
    });
    const md = "Questions are aimed at the recipient — 8/10 samples.";

    t.check("a well-formed render validates", validateVoiceProfile(base(), md).ok);

    // THE assertion this module exists for.
    {
      const o = base();
      o.observations[0].support = 0;
      const r = validateVoiceProfile(o, md);
      t.check("support: 0 is rejected — uncited observations are dropped, not shipped",
        !r.ok && r.errors.some((e) => /support must be an integer >= 1/.test(e)));
    }

    // The prose and the json disagreeing is invisible to a reader of either alone.
    {
      const o = base();
      o.observations[0].support = 5;
      const r = validateVoiceProfile(o, md);
      t.check("a count in the json that appears nowhere in the prose is rejected",
        !r.ok && r.errors.some((e) => /appears nowhere in the profile prose/.test(e)));
    }

    {
      const o = base();
      o.confidence = "full";
      o.samples_used = ["a.txt", "b.txt", "c.txt", "d.txt", "e.txt"];
      o.observations = [{ id: "o01", section: "cadence", support: 4, of: 5 }];
      const r = validateVoiceProfile(o, "held in 4/5 samples");
      t.check("confidence: full on a 5-sample corpus is rejected (the tier follows the count)",
        !r.ok && r.errors.some((e) => /contradicts 5 samples/.test(e)));
    }

    {
      const o = base();
      o.samples_used = ["a.txt", "b.txt", "c.txt", "d.txt"];
      o.confidence = "thin";
      o.observations = [{ id: "o01", section: "cadence", support: 3, of: 4 }];
      const r = validateVoiceProfile(o, "3/4 samples");
      t.check("a render below the 5-sample floor is rejected — it should have refused",
        !r.ok && r.errors.some((e) => /below 5 must refuse/.test(e)));
    }

    {
      const o = base();
      o.observations[0].section = "vibes";
      t.check("an invented section is rejected",
        !validateVoiceProfile(o, md).ok);
    }

    {
      const o = base();
      o.samples_used = ["corpus/human/s0.txt"];
      t.check("a path in samples_used is rejected — filenames only",
        !validateVoiceProfile(o, md).ok);
    }

    {
      const o = base();
      o.observations = [];
      const r = validateVoiceProfile(o, md);
      t.check("a render with zero observations is rejected — that is a refusal, not a profile",
        !r.ok && r.errors.some((e) => /is a refusal, not a profile/.test(e)));
    }

    // A refusal is a different shape, not a render with a flag bolted on.
    {
      const r = validateVoiceProfile(
        { schema: "voice-profile/1", profile: "mixed-thin", refused: "corpus is more than one voice" }, "");
      t.check("a clean refusal validates", r.ok && r.refusal);
    }
    {
      const r = validateVoiceProfile(
        { schema: "voice-profile/1", profile: "x", refused: "reason", observations: [] }, "");
      t.check("a refusal carrying render keys is rejected — the shapes stay disjoint",
        !r.ok && r.errors.some((e) => /refusal carries key not in the refusal shape/.test(e)));
    }
    {
      const r = validateVoiceProfile(
        { schema: "voice-profile/1", profile: "x", refused: "reason" }, "# Voice profile\n\nprose");
      t.check("a refusal that also emitted a profile is rejected",
        !r.ok && r.errors.some((e) => /emits the json fence alone/.test(e)));
    }
  }

  t.group("voice-profile fixtures — provenance, and the corpus a profile is keyed to");
  {
    const fixtures = resolve(HERE, "fixtures", "profiles");
    const agentPath = resolve(HERE, "..", "..", "..", "primitives", "agents", "voice-profile-render", "agent.md");

    for (const [name, expected] of [["chekhov-correspondence", 10], ["bacon-essay", 10], ["mixed-thin", 5]]) {
      const dir = join(fixtures, name);
      const lock = corpusLock(dir, { agentPath });
      t.check(`${name}: ${expected} usable samples, none excluded for missing provenance`,
        lock.sample_count === expected && lock.excluded.length === 0,
        `got ${lock.sample_count} usable, ${lock.excluded.length} excluded`);
      t.check(`${name}: lock aggregate is a sha256`, /^[0-9a-f]{64}$/.test(lock.aggregate_sha256));
      t.check(`${name}: voice card is present and hashed`, /^[0-9a-f]{64}$/.test(lock.voice_card_sha256 ?? ""));
      t.check(`${name}: the prompt's own hash is in the cache key`,
        /^[0-9a-f]{64}$/.test(lock.agent_sha256 ?? ""));
    }

    // The fixtures' voice cards are empty on purpose: a filled card would let the
    // renderer transcribe answers instead of deriving them, and the positive test
    // would measure the wrong thing.
    for (const name of ["chekhov-correspondence", "bacon-essay", "mixed-thin"]) {
      const card = fsRead(join(fixtures, name, "voice.md"), "utf8");
      // Every `##` section body, once html comments and whitespace are removed,
      // must be empty. The preamble above the first `##` is allowed to explain why.
      const sections = card.split(/^## .*$/m).slice(1);
      const allEmpty = sections.every((body) => body.replace(/<!--[\s\S]*?-->/g, "").trim() === "");
      t.check(`${name}: voice card is deliberately empty (derivation, not transcription)`,
        sections.length === 5 && allEmpty,
        `${sections.length} sections, ${sections.filter((b) => b.replace(/<!--[\s\S]*?-->/g, "").trim() !== "").length} non-empty`);
    }

    // The renderer and the drafter must agree about what is in the corpus. If the
    // lock counts samples the drafter would exclude, the profile describes a corpus
    // nobody will be shown - and neither side reports anything, because each is
    // internally consistent. Anchored here because the first version of scanCorpus
    // reimplemented the scan and disagreed three ways.
    for (const name of ["chekhov-correspondence", "bacon-essay", "mixed-thin"]) {
      const dir = join(fixtures, name);
      const lock = corpusLock(dir, { agentPath });
      const drafting = readSamples(join(dir, "corpus", "human"), { requireAttestation: true });
      t.check(`${name}: corpus lock and drafting exemplars count the same samples`,
        lock.sample_count === drafting.usable.length,
        `lock ${lock.sample_count} vs exemplars ${drafting.usable.length}`);
      t.check(`${name}: they agree on which files, not just how many`,
        JSON.stringify(lock.files.map((f) => f.file).sort())
        === JSON.stringify(drafting.usable.map((s) => s.file).sort()));
    }

    // The negative fixture must not tell the renderer its answer. Its profile.json
    // once opened "NEGATIVE-TEST FIXTURE... They are five different authors" while
    // its own notes claimed it did not tip its hand, and a render duly reported
    // reading it. That is the S2 prompt leak again, moved into the test: the fixture
    // supplies the finding and the run credits the primitive with making it.
    // profile.json and voice.md are both in the renderer's read path; FIXTURE.md is
    // not, which is where the answer belongs.
    {
      const dir = join(fixtures, "mixed-thin");
      const readPath = ["profile.json", "voice.md"].map((f) => fsRead(join(dir, f), "utf8")).join("\n").toLowerCase();
      const tell = /negative|fixture|five (different )?(authors|writers|voices)|exists to fail|test/;
      t.check("the negative fixture does not disclose its answer in anything the renderer reads",
        !tell.test(readPath), (readPath.match(tell) ?? []).join(""));
      t.check("and the disclosure exists somewhere a maintainer will find it",
        fsExists(join(dir, "FIXTURE.md")) && /five different authors/i.test(fsRead(join(dir, "FIXTURE.md"), "utf8")));
    }

    // PROFILES.md documents one level of author-named group subdirectories under
    // corpus/human. A scan that throws EISDIR on them cannot lock any corpus whose
    // owner used the feature the schema advertises.
    {
      const grouped = join(tmp, "grouped-profile");
      mkdirSync(join(grouped, "corpus", "human", "newsletter"), { recursive: true });
      const sample = (n) => `---\nsource: notebook\ndate: 2021-04-0${n}\nhuman_authored: true\n---\n${"word ".repeat(400)}\n`;
      writeFileSync(join(grouped, "corpus", "human", "loose.md"), sample(1));
      writeFileSync(join(grouped, "corpus", "human", "newsletter", "a.md"), sample(2));
      writeFileSync(join(grouped, "corpus", "human", "newsletter", "b.md"), sample(3));
      let lock = null;
      let threw = null;
      try { lock = corpusLock(grouped); } catch (e) { threw = e.code ?? e.message; }
      t.check("a corpus using PROFILES.md group subdirectories locks without throwing",
        threw === null, `threw ${threw}`);
      t.check("grouped samples are counted, not skipped", lock !== null && lock.sample_count === 3,
        lock ? `counted ${lock.sample_count}` : "no lock");
      t.check("the group name survives into the lock",
        lock !== null && lock.files.filter((f) => f.group === "newsletter").length === 2);
    }

    // Corpus continuity with the runs this profile is meant to be comparable to.
    // S1's diagnostic and case-15 of the cross-author run read the same Chekhov.
    {
      const s1 = resolve(HERE, "..", "..", "prose-review", "tests", "runs",
        "2026-08-07-pi02-s1-mvp", "inputs", "case-01", "corpus");
      if (fsExists(s1)) {
        const bodyHash = (p) => {
          const raw = fsRead(p, "utf8");
          const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
          return createHash("sha256").update(body.trim()).digest("hex");
        };
        const fixtureBodies = new Set(
          readdirSync(join(fixtures, "chekhov-correspondence", "corpus", "human"))
            .filter((f) => f.endsWith(".txt"))
            .map((f) => bodyHash(join(fixtures, "chekhov-correspondence", "corpus", "human", f))),
        );
        const s1Bodies = readdirSync(s1).filter((f) => f.endsWith(".txt")).map((f) => bodyHash(join(s1, f)));
        t.check("chekhov fixture is the same corpus S1 diagnosed — profile and baseline are comparable",
          s1Bodies.length === 10 && s1Bodies.every((h) => fixtureBodies.has(h)));
      }
    }
  }

  t.group("voice-profile renders — the S2 artefacts validate against the contract");
  {
    const runs = resolve(HERE, "runs");
    const runDirs = fsExists(runs)
      ? readdirSync(runs, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
      : [];

    // runs/ holds more than one primitive's work. Each run's lock names the agent it
    // pins to, so this group validates voice-profile-render runs and leaves S3's
    // voice-draft artefacts to their own group. Deriving the owner rather than
    // hard-coding it is what stops a second primitive silently failing the first
    // one's guards - which is exactly what happened when S3 landed.
    const ownerOf = (name) => {
      const lockPath = join(runs, name, "corpus.lock.json");
      if (!fsExists(lockPath)) return null;
      const owners = [...new Set(Object.values(JSON.parse(fsRead(lockPath, "utf8"))).map((l) => l.agent))];
      return owners.length === 1 ? owners[0] : null;
    };
    const profileRuns = runDirs.filter((n) => ownerOf(n) === "voice-profile-render");

    const found = profileRuns.flatMap((n) => {
      const dir = join(runs, n, "raw");
      if (!fsExists(dir)) return [];
      return readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => join(dir, f));
    });

    t.check("at least one recorded render to validate", found.length > 0, `looked in ${runs}`);
    t.check("every run directory declares which primitive produced it",
      runDirs.every((n) => !fsExists(join(runs, n, "corpus.lock.json")) || ownerOf(n)),
      runDirs.filter((n) => fsExists(join(runs, n, "corpus.lock.json")) && !ownerOf(n)).join(", "));

    // The primitive's own spec says a stale profile is REPORTED, not silently
    // trusted. That contract has to bind its own authoring record first: a run
    // directory whose corpus.lock.json records a prompt hash that no longer matches
    // agent.md is claiming a measurement it did not make. Nothing else catches this
    // — every other check recomputes from whatever is on disk right now, so a suite
    // can be fully green against a prompt the run doc never saw.
    for (const name of runDirs) {
      const lockPath = join(runs, name, "corpus.lock.json");
      if (!fsExists(lockPath)) continue;
      const owner = ownerOf(name);
      if (!owner) continue;
      const agentSrc = resolve(HERE, "..", "..", "..", "primitives", "agents", owner, "agent.md");
      if (!fsExists(agentSrc)) { t.check(`${name}: its declared agent ${owner} exists`, false); continue; }
      const live = createHash("sha256").update(fsRead(agentSrc)).digest("hex");
      const locks = JSON.parse(fsRead(lockPath, "utf8"));
      const recorded = [...new Set(Object.values(locks).map((l) => l.agent_sha256))];
      t.check(`${name}/corpus.lock.json records exactly one prompt hash`, recorded.length === 1,
        recorded.join(", "));
      t.check(`${name}/corpus.lock.json's ${owner} hash matches agent.md on disk`,
        recorded.length === 1 && recorded[0] === live,
        `recorded ${recorded[0]?.slice(0, 12)}, live ${live.slice(0, 12)}`);
    }

    for (const path of found) {
      const label = path.split("/").slice(-3).join("/");
      const parsed = parseRender(fsRead(path, "utf8"));
      t.check(`${label}: emitted a json fence that parses`, parsed.json !== null,
        parsed.jsonError ?? "no json fence");
      if (parsed.json === null) continue;
      const r = validateVoiceProfile(parsed.json, parsed.markdown);
      t.check(`${label}: validates against voice-profile/1`, r.ok, r.errors.join("; "));

      if (!r.refusal) {
        // The firewall, checked on the artefact rather than trusted from the prompt.
        const md = parsed.markdown;
        t.check(`${label}: profile names no catalog`, !/catalog\.json|tell[- ]list|thresholds?\.json/i.test(md));
        t.check(`${label}: profile makes no detector claim`, !/detector/i.test(md));
        t.check(`${label}: profile claims no resemblance on the author's behalf`,
          !/will sound like|sounds like the author|indistinguishable/i.test(md));
        t.check(`${label}: dropped observations are reported`,
          Number.isInteger(parsed.json.observations_dropped));
      }
    }
  }
}
