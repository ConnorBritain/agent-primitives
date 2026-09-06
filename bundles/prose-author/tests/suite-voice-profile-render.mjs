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
import { execFileSync } from "node:child_process";
import {
  validateVoiceProfile, corpusLock, parseRender,
  checkFrequencyDiscipline, FREQUENCIES,
  checkRateArithmetic, checkFrequencyAgainstRate,
  COVERAGE_DIMENSIONS,
} from "./voice-profile.mjs";
import { analyzeParagraphCoverage } from "./coverage-analysis.mjs";
import { analyzeProfileStability } from "./profile-stability.mjs";
import { readSamples } from "../skills/prose-draft/tools/exemplars.mjs";
import { measureProfile } from "./profile-measurements.mjs";
import {
  assembleVoiceProfile, COVERAGE_DIMENSIONS as SOURCE_DIMENSIONS, parseVoiceProfileSource,
  frequencyForPerPiece, sourceMeasurementPlan, sourceRenderSchema,
} from "../skills/prose-draft/tools/profile-contract.mjs";
import { validateVoiceDraftSource } from "../skills/prose-draft/tools/draft-contract.mjs";
import { strictOutputSchemaErrors } from "./strict-output-schema.mjs";
import { parseDraft, validateDraft } from "./voice-draft.mjs";
import {
  fixtureGuards, staleExemptions, corpusMeasurements, NOT_AUTHOR_NAMED,
} from "./fixture-guard.mjs";

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

    // A stale exemption is how a real author name silently stops being checked.
    t.check("no fixture claims a not-author-named exemption it no longer needs",
      staleExemptions(fixtures).length === 0, staleExemptions(fixtures).join(", "));

    // A leaked MEASUREMENT is the same contamination as a leaked name, and the name
    // guard cannot see it. This was live: the prompt gained "a habit occurring 2.6 times
    // in a 1,755-word sample" while the `rate` field was being added - the doctorow
    // corpus's own profanity rate and mean length, handed to the renderer that was about
    // to be asked to derive them. Caught by hand, in the commit whose entire purpose was
    // making the renderer's counts trustworthy.
    {
      const measurements = corpusMeasurements(fixtures);
      const leakedNumbers = measurements.filter((m) => prompt.includes(m.token));
      t.check("prompt states no measurement taken from a fixture corpus",
        leakedNumbers.length === 0,
        leakedNumbers.map((m) => `${m.fixture} ${m.what}=${m.token}`).join("; "));

      // "No prompt contains a forbidden number" passes trivially when the forbidden
      // list is empty, so the list itself is asserted. These are the exact strings the
      // real leak used, in both plain and comma-grouped form.
      const has = (tok) => measurements.some((m) => m.token === tok);
      t.check("the measurement guard covers rates, counts, totals and per-piece figures",
        has("1.48") && has("2.6") && has("17549") && has("17,549") && has("1,755"),
        `${measurements.length} tokens`);
    }

    // The guard's own derivation needs testing, not just its verdict. Asserting only
    // "no prompt contains a forbidden token" passes just as well when the forbidden
    // list is empty - which is exactly what a broken derivation produces, and what
    // the mutation run caught as a guard with no test behind it.
    {
      const guards = fixtureGuards(fixtures);
      const byName = Object.fromEntries(guards.map((g) => [g.fixture, g]));

      // The prefix heuristic finds `doctorow` and stops. `cory` only exists in the
      // corpus frontmatter, and a prompt naming him by first name leaks just as hard.
      t.check("author tokens include the given name from corpus frontmatter, not just the surname",
        byName["doctorow-blog"]?.tokens.includes("cory")
        && byName["doctorow-blog"]?.tokens.includes("doctorow"),
        (byName["doctorow-blog"]?.tokens ?? []).join(", "));

      t.check("a fixture with no author frontmatter still guards its directory prefix",
        byName["bacon-essay"]?.tokens.includes("bacon"));

      // The exemption is a hole in the guard, so it must be exactly as wide as stated.
      t.check("a composition-named fixture contributes no author token",
        byName["mixed-thin"]?.tokens.length === 0,
        (byName["mixed-thin"]?.tokens ?? []).join(", "));

      t.check("every fixture on disk is covered by the guard",
        guards.length === readdirSync(fixtures, { withFileTypes: true })
          .filter((d) => d.isDirectory()).length);

      // staleExemptions is what stops the table above from rotting into a silent
      // exemption for a fixture that has since been renamed to an author's name.
      const emptyDir = join(tmp, "no-fixtures-here");
      mkdirSync(emptyDir, { recursive: true });
      t.check("an exemption naming no fixture on disk is reported as stale",
        staleExemptions(emptyDir).length === Object.keys(NOT_AUTHOR_NAMED).length);
    }

    for (const { fixture: name, tokens } of fixtureGuards(fixtures)) {
      t.check(`prompt does not name the ${name} fixture`,
        !prompt.includes(name.toLowerCase()));
      // Author tokens come from `author:` frontmatter where a fixture has it and from
      // the directory prefix where it does not - see fixture-guard.mjs for why the
      // prefix alone was both too eager and too narrow.
      const leakedTokens = tokens.filter((tok) => prompt.includes(tok));
      t.check(`prompt names no author of the ${name} corpus`,
        leakedTokens.length === 0, leakedTokens.join(", "));
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
    t.check("an exact numeric 'of' support claim is locatable without weakening the count",
      validateVoiceProfile(base(), "Questions are aimed at the recipient — 8 of 10 samples.").ok);
    t.check("an exact numeric 'out of' support claim is locatable without weakening the count",
      validateVoiceProfile(base(), "Questions are aimed at the recipient — 8 out of 10 samples.").ok);

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
      t.check("a different numeric 'of' count is still rejected",
        !validateVoiceProfile(o, "Questions are aimed at the recipient — 8 of 10 samples.").ok);
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

  t.group("voice-profile frequency — a count says how many samples, never how often");
  {
    // FU-16. Five consecutive profiles opened on the same observation - "a long sentence
    // accumulates, then a short flat one lands" - each introduced as that voice's engine.
    // A drafter read one and ended 7 of 7 paragraphs on the move, against a corpus that
    // does it once or twice per piece. The drafter obeyed; the profile overclaimed.
    //
    // n/m cannot carry density, so the renderer must state it separately. These assert
    // the documentation property, which is decidable from the text - NOT that the habit
    // is real or the rate accurate, which only the corpus and a human can settle.
    const good = "Sentences accumulate and are then stopped by a short flat one — 9/10 samples, "
      + "several times per piece (`s-01`: \"...\").";
    t.check("an observation carrying a frequency passes",
      checkFrequencyDiscipline(good).length === 0);

    const noFreq = "Sentences accumulate and are then stopped by a short flat one — 9/10 samples.";
    t.check("a profile that states no frequency anywhere is flagged",
      checkFrequencyDiscipline(noFreq).some((f) => f.kind === "no-frequency-anywhere"));

    // The exact shape that produced the caricature.
    const dominant = "This is the engine of this prose: a long sentence accumulates and a short "
      + "flat one delivers the verdict — 10/10 samples, once or twice per piece.";
    const r = checkFrequencyDiscipline(dominant);
    t.check("claiming a habit is the engine while rating it once-or-twice is a contradiction",
      r.some((f) => f.kind === "dominance-without-throughout"));
    t.check("and the finding quotes the phrase that made the claim",
      r.some((f) => f.phrase === "the engine of"));

    t.check("the same claim rated `throughout` is allowed — it is then merely a claim",
      checkFrequencyDiscipline("This is the engine of this prose — 10/10 samples, throughout.")
        .filter((f) => f.kind === "dominance-without-throughout").length === 0);

    // Scope: only sentences carrying a count are making an observation. Section 8 prose
    // about the corpus at large is not, and flagging it would train the renderer to
    // avoid ordinary words.
    t.check("a dominance word in prose with no count is not flagged",
      checkFrequencyDiscipline("Every paragraph of the source is set in the same type. Several times per piece.")
        .filter((f) => f.kind === "dominance-without-throughout").length === 0);

    t.check("the frequency vocabulary is fixed and exported, not improvised",
      FREQUENCIES.length === 3 && FREQUENCIES.includes("throughout"));

    // The detector must fire on the profiles that predate it, or it is tuned to pass.
    {
      const pre = resolve(HERE, "runs", "2026-08-07-fu13-period-floor", "inputs", "profiles", "doctorow-blog.md");
      if (fsExists(pre)) {
        t.check("it fires on the pre-FU-16 profile that produced the caricature",
          checkFrequencyDiscipline(fsRead(pre, "utf8")).length > 0);
      }
    }
  }

  t.group("voice-profile/2 coverage — every fixed question receives an evidence status");
  {
    const rule = "Count the named form outside quoted material.";
    const base = () => {
      const observations = COVERAGE_DIMENSIONS.map((_, i) => ({
        id: `o${String(i + 1).padStart(2, "0")}`,
        section: i === 9 ? "openings" : "address",
        support: 10,
        of: 10,
      }));
      observations[0].rate = { count: 20, per_1000_words: 2, counting_rule: rule };
      return {
        schema: "voice-profile/2",
        profile: "coverage-fixture",
        confidence: "full",
        corpus_words: 10000,
        samples_used: Array.from({ length: 10 }, (_, i) => `s${i}.txt`),
        samples_excluded: [],
        voice_card: "empty",
        observations,
        coverage: COVERAGE_DIMENSIONS.map((dimension, i) => ({
          dimension,
          status: i === 0 ? "rated" : "described",
          observation_ids: [observations[i].id],
        })),
        observations_dropped: 2,
        multiple_voices_suspected: false,
      };
    };
    const md = `Each observation is established in 10/10 samples. ${rule}`;
    const enveloped = (obj, prose = md) => ({ ...obj, profile_markdown: prose });

    t.check("a complete self-contained voice-profile/2 envelope validates",
      validateVoiceProfile(enveloped(base())).ok);
    {
      const envelope = enveloped(base());
      const parsed = parseRender(`\`\`\`json\n${JSON.stringify(envelope)}\n\`\`\``);
      t.check("a JSON-only voice-profile/2 envelope materializes its human Markdown",
        !parsed.hadMarkdownFence && parsed.markdown === md
          && validateVoiceProfile(parsed.json, parsed.markdown).ok);
    }
    {
      const record = base();
      const raw = [
        "```markdown", "<!-- voice-profile/2:profile -->", md,
        "<!-- voice-profile/2:record -->", JSON.stringify(record), "```",
      ].join("\n");
      const parsed = parseRender(raw);
      t.check("a single-fence voice-profile/2 envelope materializes prose and record",
        parsed.hadMarkdownFence && parsed.markdown === md
          && parsed.json?.profile_markdown === md
          && validateVoiceProfile(parsed.json, parsed.markdown).ok);
      t.check("a single-fence envelope rejects reversed markers",
        parseRender(raw.replace("voice-profile/2:profile", "voice-profile/2:wrong")).json === null);
    }
    t.check("a voice-profile/2 envelope without its prose is rejected",
      validateVoiceProfile(base()).errors.some((e) => /profile_markdown must contain/.test(e)));
    {
      const o = enveloped(base());
      t.check("a divergent separately supplied profile is rejected",
        !validateVoiceProfile(o, `${md} changed`).ok);
    }

    {
      const o = base();
      o.coverage.pop();
      const r = validateVoiceProfile(enveloped(o));
      t.check("silently omitting one fixed coverage dimension is rejected",
        !r.ok && r.errors.some((e) => /silently omits required dimension/.test(e)));
    }

    {
      const o = base();
      o.coverage[2].observation_ids = ["o404"];
      const r = validateVoiceProfile(enveloped(o));
      t.check("a dangling coverage observation reference is rejected",
        !r.ok && r.errors.some((e) => /dangling observation reference/.test(e)));
    }

    {
      const o = base();
      o.coverage[0].status = "described";
      const r = validateVoiceProfile(enveloped(o));
      t.check("a described dimension cannot hide a rate that makes it rated",
        !r.ok && r.errors.some((e) => /described but references a rated observation/.test(e)));
    }

    {
      const o = base();
      o.observations[0].rate.counting_rule = "A rule absent from the prose.";
      const r = validateVoiceProfile(enveloped(o));
      t.check("a counting rule that cannot be located in the profile prose is rejected",
        !r.ok && r.errors.some((e) => /counting_rule is unlocatable/.test(e)));
    }

    {
      const o = base();
      o.observations[0].rate.counting_rule = "[measurement:question-marks] Count literal question marks.";
      const prose = `${md} The rate uses [measurement:question-marks].`;
      const r = validateVoiceProfile(enveloped(o, prose));
      t.check("a deterministic measurement locator survives grammatical prose around its rule", r.ok);
    }

    {
      const o = base();
      o.observations[0].rate.counting_rule = "[measurement:question-marks] Count literal question marks.";
      const r = validateVoiceProfile(enveloped(o));
      t.check("a deterministic rule whose locator is absent from prose is rejected",
        !r.ok && r.errors.some((e) => /counting_rule is unlocatable/.test(e)));
    }

    {
      const o = base();
      delete o.observations[0].rate.counting_rule;
      const r = validateVoiceProfile(enveloped(o));
      t.check("a rated observation without a reproducible counting rule is rejected",
        !r.ok && r.errors.some((e) => /counting_rule must be a reproducible/.test(e)));
    }

    {
      const o = base();
      o.observations[0].rate.per_1000_words = 8;
      const r = validateVoiceProfile(enveloped(o));
      t.check("invalid v2 rate arithmetic is rejected from the self-contained render",
        !r.ok && r.errors.some((e) => /rate arithmetic is invalid/.test(e)));
    }

    {
      const o = base();
      o.observations.push({
        id: "o11", section: "absences", support: 10, of: 10,
        rate: { count: 0, per_1000_words: 0, counting_rule: rule },
      });
      o.coverage[1] = {
        dimension: COVERAGE_DIMENSIONS[1],
        status: "absent-paired",
        observation_ids: ["o01", "o11"],
        positive_observation_id: "o01",
        absence_observation_id: "o11",
      };
      t.check("a zero counted absence validates only when paired to a counted positive habit",
        validateVoiceProfile(enveloped(o)).ok);

      delete o.observations[0].rate;
      const r = validateVoiceProfile(enveloped(o));
      t.check("an absent-paired dimension without a counted positive replacement is rejected",
        !r.ok && r.errors.some((e) => /positive replacement must carry a counted rate/.test(e)));
    }

    {
      const sameParagraph = "Parenthetical phrasing interrupts the claim. Its rate is 3.2 per 1,000 words.";
      const separateParagraphs = "Parenthetical phrasing interrupts the claim.\n\nIts rate is 3.2 per 1,000 words.";
      const habits = [{ id: "parentheticals", pattern: /parenthetical/i }];
      t.check("coverage analysis finds a rate in the next sentence of the same paragraph",
        analyzeParagraphCoverage(sameParagraph, habits)[0].status === "rated");
      t.check("coverage analysis does not borrow a rate from another paragraph",
        analyzeParagraphCoverage(separateParagraphs, habits)[0].status === "mentioned");
      t.check("coverage analysis recognizes natural self-reference and biography language",
        [
          "The register shifts into personal testimony before returning to analysis.",
          "First-person singular is near-absent; the writer does not appear as a person.",
        ].every((prose) => analyzeParagraphCoverage(prose)
          .find((row) => row.id === "self-reference-biography")?.status === "mentioned"));
    }
  }

  t.group("voice-profile source assembly — models interpret, code keeps the books");
  {
    {
      const decoded = parseVoiceProfileSource('```json\n{"schema":"voice-profile-source/4","prose":"They call it "theft" and move on."}\n```');
      t.check("transport decoding repairs only structurally internal bare prose quotes",
        decoded.repairs === 2 && decoded.source?.prose === 'They call it "theft" and move on.');
    }
    const profileDir = resolve(HERE, "fixtures", "profiles", "doctorow-blog");
    const measured = measureProfile(profileDir);
    const files = measured.samples.map((sample) => sample.file);
    const cited = files[0];
    const placement = "Treat this as a placement rule rather than a quota: preserve it when the requested register gives it the same rhetorical job, and otherwise leave it out instead of forcing a surface tic.";
    const qualitative = (dimensions, section, prose, support = files.slice(0, 6)) => ({
      dimensions, section, prose: `${prose} Evidence appears in ${cited}. ${placement}`,
      support_files: support,
    });
    const measuredProse = (measurementId) => ({
      prose: `The counted ${measurementId} form has a stable rhetorical job in the locked register. A representative use establishes its function without restating arithmetic. ${placement}`,
    });
    const source = () => ({
      schema: "voice-profile-source/4",
      voice_card: "empty",
      measured: Object.fromEntries(measured.measurements.map((row) => [row.id, measuredProse(row.id)])),
      qualitative: [
        qualitative(["qualification-hedging"], "register-range", "Qualification is owned by the speaker rather than hidden in vague adverbs."),
        qualitative(["opponents-allies-sources"], "address", "Named opponents and sources are quoted before their terms are turned."),
        qualitative(["figures-analogy"], "figures", "Figures draw on legal, commercial, and bodily vocabulary."),
        qualitative(["openings-endings-closure"], "closings", "Openings place the disputed object on the table immediately, while closings return an opponent's term with its meaning reversed."),
      ],
      unresolved: {},
      gaps: "The corpus does not establish whether these placements survive a private or ceremonial register.",
      observations_dropped: 3,
      multiple_voices_suspected: false,
    });
    const observationFor = (value, dimension, predicate = () => true) => value.qualitative
      .find((observation) => observation.dimensions.includes(dimension) && predicate(observation));
    const context = {
      profile: "doctorow-blog", measurements: measured, samples_used: files, samples_excluded: [],
    };
    {
      const strictSchema = sourceRenderSchema(measured);
      const unresolved = strictSchema.properties.unresolved;
      t.check("the context-specific profile schema fits strict harnesses before dispatch",
        strictOutputSchemaErrors(strictSchema).length === 0
          && unresolved.required.length === Object.keys(unresolved.properties).length
          && !Object.hasOwn(strictSchema.$defs.qualitativeObservation.properties, "frequency"));
      const strictSource = source();
      for (const dimension of Object.keys(unresolved.properties)) {
        if (!Object.hasOwn(strictSource.unresolved, dimension)) strictSource.unresolved[dimension] = null;
      }
      t.check("strict nullable unresolved slots normalize before semantic assembly",
        assembleVoiceProfile(strictSource, context).ok);
    }
    {
      const duplicateDimension = source();
      duplicateDimension.qualitative[0].dimensions = [
        duplicateDimension.qualitative[0].dimensions[0],
        duplicateDimension.qualitative[0].dimensions[0],
      ];
      t.check("duplicate qualitative dimensions remain a deterministic semantic failure",
        assembleVoiceProfile(duplicateDimension, context).errors
          .some((error) => /one to three unique qualitative/.test(error)));
      const duplicateSupport = source();
      duplicateSupport.qualitative[0].support_files = [files[0], files[0]];
      t.check("one unique qualitative support file remains a deterministic semantic failure after deduplication",
        assembleVoiceProfile(duplicateSupport, context).errors
          .some((error) => /at least two unique filenames/.test(error)));
      const redundantSupport = source();
      redundantSupport.qualitative[0].support_files = [files[0], files[1], files[1]];
      const normalizedSupport = assembleVoiceProfile(redundantSupport, context);
      t.check("redundant qualitative support is normalized when two unique evidence files remain",
        normalizedSupport.ok
          && normalizedSupport.normalizations?.duplicate_support_files_removed === 1
          && redundantSupport.qualitative[0].support_files.length === 3);
    }
    {
      const plan = sourceMeasurementPlan(measured);
      t.check("the locked measurement plan creates one unique slot per relevant counter",
        plan.measured.length === 10
          && new Set(plan.measured.map((slot) => slot.id)).size === plan.measured.length
          && plan.measured.find((slot) => slot.id === "em-dashes")?.absence
          && JSON.stringify(plan.qualitativeDimensions) === JSON.stringify([
            "qualification-hedging", "opponents-allies-sources", "figures-analogy", "openings-endings-closure",
          ])
          && plan.qualitativeMin === 0 && plan.qualitativeMax === 4);
    }
    {
      const measureCli = resolve(HERE, "..", "skills", "prose-draft", "tools", "profile-measure.mjs");
      const portable = JSON.parse(execFileSync(process.execPath, [measureCli, profileDir, "--context", "doctorow-blog"], { encoding: "utf8" }));
      t.check("the shipped measurement CLI builds portable assembler context",
        portable.profile === context.profile
          && portable.measurements.corpus_words === context.measurements.corpus_words
          && JSON.stringify(portable.samples_used) === JSON.stringify(context.samples_used));
    }
    const assembled = assembleVoiceProfile(source(), context);
    t.check("one semantic source assembles into a valid canonical voice-profile/2",
      assembled.ok && validateVoiceProfile(assembled.profile).ok, assembled.errors.join("; "));
    t.check("assembly derives all ten coverage rows and their statuses",
      assembled.profile?.coverage.length === SOURCE_DIMENSIONS.length
        && assembled.profile?.coverage.find((row) => row.dimension === "interruption-punctuation")?.status === "absent-paired"
        && assembled.profile?.coverage.find((row) => row.dimension === "figures-analogy")?.status === "described");
    t.check("assembly derives ids, support, and measured rates rather than trusting the model",
      assembled.profile?.observations.every((observation, i) => observation.id === `o${String(i + 1).padStart(2, "0")}`)
        && assembled.profile?.observations.some((observation) => observation.rate?.count === 385)
        && assembled.profile?.profile_markdown.includes("[measurement:second-person-family]"));
    t.check("qualitative prevalence does not become a within-piece drafting quota",
      assembled.profile?.profile_markdown.includes("qualitative placement only; no within-piece rate inferred")
        && !source().qualitative.some((observation) => Object.hasOwn(observation, "frequency")));
    {
      const modelOwnedFrequency = source();
      modelOwnedFrequency.qualitative[0].frequency = "several times per piece";
      t.check("current qualitative source rejects a model-owned frequency",
        assembleVoiceProfile(modelOwnedFrequency, context).errors
          .some((error) => /qualitative\[0\] carries unknown key: frequency/.test(error)));
      const historical = source();
      historical.schema = "voice-profile-source/3";
      historical.qualitative = historical.qualitative.map((observation) => ({
        ...observation, frequency: "once or twice per piece",
      }));
      t.check("historical voice-profile-source/3 qualitative frequencies remain readable",
        assembleVoiceProfile(historical, context).ok);
    }
    t.check("measured frequency bands are deterministic rather than model-owned",
      frequencyForPerPiece(2.49) === "once or twice per piece"
        && frequencyForPerPiece(2.5) === "several times per piece"
        && frequencyForPerPiece(10) === "throughout"
        && assembled.profile?.profile_markdown.includes("[measurement:question-marks] Count: 38 instances; 2.17 per 1,000 words")
        && checkFrequencyAgainstRate(assembled.profile?.profile_markdown, assembled.profile,
          measured.corpus_words / measured.sample_count).length === 0);
    t.check("reader-facing evidence keeps the locator while canonical JSON keeps the full rule",
      !assembled.profile?.profile_markdown.includes("Every literal question-mark character in the extracted sample bodies")
        && assembled.profile?.observations.find((observation) => observation.rate?.counting_rule
          ?.startsWith("[measurement:question-marks] Count every literal question-mark character")));
    t.check("assembled rated evidence stays in the same paragraph as its dimension label",
      analyzeParagraphCoverage(assembled.profile?.profile_markdown)
        .find((row) => row.id === "person-reader-stance")?.status === "rated");
    t.check("assembly enforces the complete 800–1500 word profile range",
      assembled.profile?.profile_markdown.trim().split(/\s+/).length >= 800
        && assembled.profile?.profile_markdown.trim().split(/\s+/).length <= 1500);
    {
      const clone = (value) => JSON.parse(JSON.stringify(value));
      const second = clone(assembled.profile);
      const third = clone(assembled.profile);
      second.profile_markdown += "\n\nA qualitative wording difference outside measured evidence.";
      third.profile_markdown += "\n\nAnother qualitative wording difference outside measured evidence.";
      const same = analyzeProfileStability([assembled.profile, second, third]);
      t.check("k=3 stability accepts byte-different prose only when mechanical facts agree", same.ok);

      const drifted = clone(assembled.profile);
      drifted.observations.find((observation) => observation.rate).rate.count += 1;
      const drift = analyzeProfileStability([assembled.profile, drifted]);
      t.check("k=3 stability rejects a measured count, rate, band, or polarity contradiction",
        !drift.ok && drift.errors.some((error) => /contradicts render/.test(error)));

      const varied = clone(assembled.profile);
      const figure = varied.coverage.find((row) => row.dimension === "figures-analogy");
      delete figure.observation_ids;
      figure.status = "unresolved";
      figure.unresolved_reason = "A second render did not establish one stable qualitative figure instruction.";
      const variation = analyzeProfileStability([assembled.profile, varied]);
      t.check("k=3 stability reports qualitative coverage variation instead of silently unioning renders",
        variation.ok && variation.variations.some((row) => row.dimension === "figures-analogy"
          && row.kind === "coverage-status"));
    }

    {
      const cli = resolve(HERE, "..", "skills", "prose-draft", "tools", "profile-assemble.mjs");
      const sourcePath = join(tmp, "portable-profile-source.json");
      const contextPath = join(tmp, "portable-profile-context.json");
      writeFileSync(sourcePath, `${JSON.stringify(source(), null, 2)}\n`);
      writeFileSync(contextPath, `${JSON.stringify(context, null, 2)}\n`);
      const output = JSON.parse(execFileSync(process.execPath, [cli, "--source", sourcePath, "--context", contextPath], { encoding: "utf8" }));
      t.check("the shipped CLI gives Codex and generic harnesses the same assembler",
        output.schema === "voice-profile/2" && output.profile_markdown === assembled.profile?.profile_markdown);
      const strictSchema = JSON.parse(execFileSync(process.execPath,
        [cli, "--schema", "--context", contextPath], { encoding: "utf8" }));
      t.check("the shipped CLI gives strict harnesses a context-specific profile schema",
        strictSchema.properties.schema.type === "string"
          && strictSchema.properties.voice_card.type === "string"
          && strictSchema.properties.qualitative.items.$ref === "#/$defs/qualitativeObservation"
          && strictSchema.$defs.qualitativeObservation.properties.dimensions.items.type === "string");
    }

    {
      const bad = source();
      bad.qualitative = bad.qualitative
        .filter((observation) => !observation.dimensions.includes("figures-analogy"));
      t.check("assembly rejects a silently omitted dimension",
        assembleVoiceProfile(bad, context).errors.some((error) => /missing coverage dimension: figures-analogy/.test(error)));
    }
    {
      const compact = source();
      observationFor(compact, "figures-analogy").dimensions.push("qualification-hedging");
      observationFor(compact, "qualification-hedging").dimensions = ["figures-analogy"];
      const result = assembleVoiceProfile(compact, context);
      t.check("one qualitative observation can cover overlapping dimensions without duplicating evidence",
        result.ok
          && result.profile.coverage.find((row) => row.dimension === "figures-analogy")?.observation_ids
            .some((id) => result.profile.coverage.find((row) => row.dimension === "qualification-hedging")
              ?.observation_ids.includes(id)));
    }
    {
      const bad = source();
      bad.qualitative.push(qualitative(["figures-analogy"], "figures",
        "A second figure claim exists only to exceed the global semantic-source budget."));
      t.check("the context-specific source enforces its global fourteen-observation ceiling",
        assembleVoiceProfile(bad, context).errors.some((error) => /qualitative must contain 0–4 entries/.test(error)));
    }
    {
      const bad = source();
      bad.unresolved["figures-analogy"] = "The corpus cannot establish a stable figure instruction despite the emitted observation.";
      t.check("a dimension cannot be both supported and unresolved",
        assembleVoiceProfile(bad, context).errors.some((error) => /figures-analogy cannot be both observed and unresolved/.test(error)));
    }
    {
      const unresolved = source();
      unresolved.qualitative = unresolved.qualitative
        .filter((observation) => !observation.dimensions.includes("figures-analogy"));
      unresolved.unresolved["figures-analogy"] = "The corpus does not establish one stable figure vocabulary or placement instruction across the locked register.";
      const result = assembleVoiceProfile(unresolved, context);
      t.check("a qualitative dimension may remain explicitly unresolved without an invented observation",
        result.ok && result.profile.coverage.find((row) => row.dimension === "figures-analogy")?.status === "unresolved");
    }
    {
      const bad = source();
      observationFor(bad, "figures-analogy").support_files = [files[0], "not-in-corpus.txt"];
      t.check("assembly rejects support outside the locked corpus",
        assembleVoiceProfile(bad, context).errors.some((error) => /non-corpus support file/.test(error)));
    }
    {
      const bad = source();
      observationFor(bad, "figures-analogy").prose += " It occurs in 6/10 samples.";
      t.check("semantic prose cannot duplicate deterministic evidence",
        assembleVoiceProfile(bad, context).errors.some((error) => /duplicates deterministic evidence/.test(error)));
    }
    {
      const bad = source();
      bad.measured["question-marks"].frequency = "throughout";
      t.check("a measured slot structurally rejects a model-owned frequency band",
        assembleVoiceProfile(bad, context).errors.some((error) => /measured\.question-marks carries unknown key: frequency/.test(error)));
    }
    {
      const bad = source();
      bad.measured["question-marks"].prose += " It recurs throughout.";
      const result = assembleVoiceProfile(bad, context);
      t.check("measured semantic prose gets deterministic density normalization before its derived band",
        result.ok && !result.profile.profile_markdown.includes("recurs throughout")
          && result.profile.profile_markdown.includes("recurs across the supported contexts"));
    }
    {
      const bad = source();
      delete bad.measured["en-dashes"];
      t.check("a counted absence cannot omit its deterministic positive replacement slot",
        assembleVoiceProfile(bad, context).errors.some((error) => /measured\.en-dashes is missing/.test(error)));
    }
    {
      const noAbsence = source();
      const positiveMeasurements = JSON.parse(JSON.stringify(measured));
      const em = positiveMeasurements.measurements.find((row) => row.id === "em-dashes");
      em.count = 100;
      em.per_1000_words = Math.round((em.count / positiveMeasurements.corpus_words) * 100000) / 100;
      em.files_with = [...files];
      em.files_without = [];
      em.samples_with = files.length;
      em.samples_without = 0;
      const fullNegatives = positiveMeasurements.measurements.find((row) => row.id === "uncontracted-negatives");
      fullNegatives.count = 100;
      fullNegatives.per_1000_words = Math.round((fullNegatives.count / positiveMeasurements.corpus_words) * 100000) / 100;
      fullNegatives.files_with = [...files];
      fullNegatives.files_without = [];
      fullNegatives.samples_with = files.length;
      fullNegatives.samples_without = 0;
      noAbsence.gaps += " The available pieces also do not establish how the register changes in private correspondence, ceremonial writing, short notices, collaborative work, or speech. Those unknowns remain explicit instead of becoming unsupported observations merely to fill a section.";
      const result = assembleVoiceProfile(noAbsence, { ...context, measurements: positiveMeasurements });
      t.check("a corpus with no supported absence gets a neutral section rather than an invented habit",
        result.ok && /No counted absence with a positive measured replacement was established/.test(result.profile.profile_markdown),
        result.ok ? result.profile.profile_markdown.match(/## 7[\s\S]*?## 8/)?.[0] : result.errors.join("; "));
    }
    {
      const withUnresolved = source();
      const zeroMeasurements = JSON.parse(JSON.stringify(measured));
      const profanity = zeroMeasurements.measurements.find((row) => row.id === "profanity-vulgarity");
      profanity.count = 0;
      profanity.per_1000_words = 0;
      profanity.files_with = [];
      profanity.files_without = [...files];
      profanity.samples_with = 0;
      profanity.samples_without = files.length;
      delete withUnresolved.measured["profanity-vulgarity"];
      withUnresolved.unresolved["profanity-vulgarity"] = "The measured absence has no counted positive replacement, so this corpus supports no drafting instruction for the dimension.";
      const result = assembleVoiceProfile(withUnresolved, { ...context, measurements: zeroMeasurements });
      t.check("an unresolved dimension is explicit in both coverage and section 8 prose",
        result.ok
          && result.profile.coverage.find((row) => row.dimension === "profanity-vulgarity")?.status === "unresolved"
          && /Profanity and vulgarity — unresolved/.test(result.profile.profile_markdown));
    }
    {
      const sparseMeasurements = JSON.parse(JSON.stringify(measured));
      const singular = sparseMeasurements.measurements.find((row) => row.id === "first-person-singular-family");
      singular.count = 1;
      singular.per_1000_words = Math.round((1 / sparseMeasurements.corpus_words) * 100000) / 100;
      singular.files_with = [files[0]];
      singular.files_without = files.slice(1);
      singular.samples_with = 1;
      singular.samples_without = files.length - 1;
      const overlapping = source();
      const result = assembleVoiceProfile(overlapping, { ...context, measurements: sparseMeasurements });
      const person = result.profile?.coverage.find((row) => row.dimension === "person-reader-stance");
      const self = result.profile?.coverage.find((row) => row.dimension === "self-reference-biography");
      t.check("overlapping dimensions reuse one canonical measured positive for a sparse absence pair",
        result.ok && self?.status === "absent-paired"
          && self.positive_observation_id === person?.observation_ids.find((id) => id === self.positive_observation_id));
    }
  }

  t.group("voice-profile rates — the number a drafter can act on");
  {
    const withRate = (rate, support = 10) => ({
      schema: "voice-profile/1",
      profile: "doctorow-blog",
      confidence: "full",
      samples_used: Array.from({ length: 10 }, (_, i) => `s${i}.txt`),
      samples_excluded: [],
      voice_card: "empty",
      observations: [{ id: "o01", section: "address", support, of: 10, rate }],
      observations_dropped: 1,
      multiple_voices_suspected: false,
    });
    const md = "Profanity lands on the verdict — 10/10 samples, several times per piece.";

    t.check("an observation may carry a counted rate",
      validateVoiceProfile(withRate({ count: 26, per_1000_words: 1.48 }), md).ok);

    // Optional on purpose: most observations describe something no count expresses, and
    // requiring a rate everywhere would force the renderer to invent numbers.
    t.check("an observation without a rate is still valid",
      validateVoiceProfile(withRate(undefined), md).ok);

    // A rate of zero is an absence. Letting it through would put "the author does this
    // 0 times per 1000 words" in front of a drafter as a habit to reproduce.
    t.check("a zero count is rejected — an absence is not a habit",
      !validateVoiceProfile(withRate({ count: 0, per_1000_words: 0.5 }), md).ok);

    // A fractional count means the renderer interpolated rather than enumerated, which
    // is the estimation this whole field exists to replace.
    t.check("a fractional count is rejected — instances are countable or absent",
      !validateVoiceProfile(withRate({ count: 26.5, per_1000_words: 1.5 }), md).ok);

    // A habit found in ten samples has at least ten instances. Fewer means the count
    // and the support describe different things, and a drafter cannot tell which is real.
    t.check("a count smaller than the support count is rejected",
      !validateVoiceProfile(withRate({ count: 3, per_1000_words: 0.2 }), md).ok);

    t.check("an unknown key inside rate is rejected",
      !validateVoiceProfile(withRate({ count: 26, per_1000_words: 1.48, note: "x" }), md).ok);

    t.check("a non-numeric rate is rejected",
      !validateVoiceProfile(withRate({ count: 26, per_1000_words: "1.48" }), md).ok);

    // The arithmetic check is what makes a renderer-emitted number worth having. The
    // same quantity was measured three ways in PI-02 and gave 16, 26 and 56; a number
    // nothing can recompute is a confident wrong number.
    const CORPUS_WORDS = 17549;
    t.check("a rate consistent with its own count and the corpus size passes",
      checkRateArithmetic(withRate({ count: 26, per_1000_words: 1.48 }), CORPUS_WORDS).length === 0);

    t.check("a rate that is not arithmetic on its own count is caught",
      checkRateArithmetic(withRate({ count: 26, per_1000_words: 4.17 }), CORPUS_WORDS).length === 1);

    t.check("no corpus size means no arithmetic claim, not a false pass",
      checkRateArithmetic(withRate({ count: 26, per_1000_words: 4.17 }), 0).length === 0);

    // The prose phrase and the number must not tell a drafter two different things.
    const MEAN_PIECE = 1755;
    t.check("a phrase two bands from the counted rate is caught",
      checkFrequencyAgainstRate(
        "Profanity lands on the verdict — 10/10 samples, once or twice per piece.",
        withRate({ count: 300, per_1000_words: 17.1 }), MEAN_PIECE).length === 1);

    // Only GROSS disagreement is reported. A habit at 2.6 per piece genuinely straddles
    // the first two phrases, and flagging it would train renderers to write toward the
    // checker instead of describing the corpus.
    t.check("a phrase one band from the rate is left alone",
      checkFrequencyAgainstRate(
        "Profanity lands on the verdict — 10/10 samples, once or twice per piece.",
        withRate({ count: 26, per_1000_words: 1.48 }), MEAN_PIECE).length === 0);

    t.check("an observation with no rate is not judged on its phrase",
      checkFrequencyAgainstRate(md, withRate(undefined), MEAN_PIECE).length === 0);
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
    // A run may exercise more than one primitive - FU-16's re-render and re-drafts used
    // voice-profile-render AND voice-draft in the same directory. Returning a SET rather
    // than a single owner is what lets such a run declare both honestly instead of
    // picking one and under-reporting the other.
    const evidenceLocksOf = (name) => {
      const lockPath = join(runs, name, "corpus.lock.json");
      if (fsExists(lockPath)) return Object.values(JSON.parse(fsRead(lockPath, "utf8")));

      // Stage-adapter canaries use a single manifest instead of the acceptance
      // runner's two compatibility indexes. The manifest pins the full prompt files
      // in locked_files; agents.* separately pins their rendered bodies. Read the
      // former here because currency is explicitly about the complete agent.md.
      const manifestPath = join(runs, name, "MANIFEST.json");
      if (!fsExists(manifestPath)) return [];
      const manifest = JSON.parse(fsRead(manifestPath, "utf8"));
      if (manifest.schema !== "prose-author-stage-adapter-canary-manifest/1") return [];
      return Object.values(manifest.agents ?? {}).flatMap((agent) => {
        const match = /primitives\/agents\/([^/]+)\/agent\.md$/.exec(agent?.source ?? "");
        const agentSha256 = manifest.locked_files?.[agent?.source];
        const isOwnedHere = match && ["voice-profile-render", "voice-draft"].includes(match[1]);
        return isOwnedHere && typeof agentSha256 === "string"
          ? [{ agent: match[1], agent_sha256: agentSha256 }]
          : [];
      });
    };
    const ownersOf = (name) => {
      return [...new Set(evidenceLocksOf(name).map((l) => l.agent).filter(Boolean))];
    };
    const profileRuns = runDirs.filter((n) => ownersOf(n).includes("voice-profile-render"));

    // A run that exercises two primitives has both kinds of artefact in raw/ — FU-16's
    // holds one re-render and three drafts. Only renders are validated here; drafts are
    // the voice-draft suite's business. Selection is by SHAPE (a supported voice-profile json
    // fence) rather than by filename, so a malformed render still gets caught instead of
    // being quietly filed as "not a render".
    const allRaw = profileRuns.flatMap((n) => {
      const dir = join(runs, n, "raw");
      if (!fsExists(dir)) return [];
      return readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => join(dir, f));
    });
    const isRenderShaped = (p) => /"schema"\s*:\s*"voice-profile\/(?:1|2)"/.test(fsRead(p, "utf8"));
    const found = allRaw.filter(isRenderShaped);
    const skipped = allRaw.filter((p) => !isRenderShaped(p));
    if (skipped.length) {
      process.stdout.write(`  note ${skipped.length} non-render artefact(s) in render runs, `
        + `validated by their own suite: ${skipped.map((p) => p.split("/").pop()).join(", ")}\n`);
    }

    t.check("at least one recorded render to validate", found.length > 0, `looked in ${runs}`);
    t.check("every run directory declares which primitive(s) produced it",
      runDirs.every((n) => !fsExists(join(runs, n, "corpus.lock.json")) || ownersOf(n).length > 0),
      runDirs.filter((n) => fsExists(join(runs, n, "corpus.lock.json")) && ownersOf(n).length === 0).join(", "));

    // The primitive's own spec says a stale profile is REPORTED, not silently
    // trusted. That contract has to bind its own authoring record first: a run
    // directory whose corpus.lock.json records a prompt hash that no longer matches
    // agent.md is claiming a measurement it did not make. Nothing else catches this
    // — every other check recomputes from whatever is on disk right now, so a suite
    // can be fully green against a prompt the run doc never saw.
    const currency = new Map();
    for (const name of runDirs) {
      const owners = ownersOf(name);
      if (owners.length === 0) continue;
      const locks = evidenceLocksOf(name);
      for (const owner of owners) {
      // Current /3 evidence has its own checks; do not reinterpret these /1-/2 runs.
      const agentSrc = resolve(HERE, "fixtures/historical-v030", owner, "agent.md");
      if (!fsExists(agentSrc)) { t.check(`${name}: its declared agent ${owner} exists`, false); continue; }
      const live = createHash("sha256").update(fsRead(agentSrc)).digest("hex");
      const recorded = [...new Set(locks.filter((l) => l.agent === owner).map((l) => l.agent_sha256))];
      t.check(`${name}/corpus.lock.json records one ${owner} prompt hash`, recorded.length === 1,
        recorded.join(", "));
      // Drift from the prompt currently on disk is NOT a failure. A run directory is a
      // historical record: it pins what produced it, and once a prompt is revised the
      // older runs SHOULD differ. Failing them would force deleting evidence to keep a
      // suite green, which is the opposite of what the record is for.
      //
      // This is the primitive's own doctrine applied to its own tests: a stale artefact
      // is REPORTED, not silently regenerated. Stale is a status.
      //
      // The safety property that survives is asserted below — at least one run per agent
      // must match, so a prompt cannot be revised leaving nothing on disk that shows
      // what it now does.
      const isCurrent = recorded.length === 1 && recorded[0] === live;
      const artifactsPath = join(runs, name, "ARTIFACTS.json");
      let hasValidatedArtifact = false;
      if (fsExists(artifactsPath)) {
        const artifacts = JSON.parse(fsRead(artifactsPath, "utf8"));
        if (owner === "voice-profile-render") {
          hasValidatedArtifact = Object.values(artifacts.profiles ?? {})
            .some((renders) => Object.keys(renders ?? {}).length > 0);
        } else if (owner === "voice-draft") {
          hasValidatedArtifact = Object.keys(artifacts.drafts ?? {}).length > 0;
          // A strict acceptance run can stop after semantic revision and before
          // canonical public-draft collection. Its immutable raw response still
          // exercises the exact locked prompt; recognize it only when the current
          // source contract validates, rather than making an hours-long run
          // invisible merely because a later stage correctly failed closed.
          if (!hasValidatedArtifact) {
            const rawDrafts = join(runs, name, "raw", "drafts");
            if (fsExists(rawDrafts)) {
              hasValidatedArtifact = readdirSync(rawDrafts)
                .filter((file) => file.endsWith(".json") && !file.endsWith(".codex-output.json"))
                .some((file) => {
                  try {
                    const wrapper = JSON.parse(fsRead(join(rawDrafts, file), "utf8"));
                    return validateVoiceDraftSource(wrapper.structured_output).ok;
                  } catch {
                    return false;
                  }
                });
            }
          }
        }
      } else {
        const manifestPath = join(runs, name, "MANIFEST.json");
        const resultPath = join(runs, name, "RESULT.json");
        if (fsExists(manifestPath) && fsExists(resultPath)) {
          const manifest = JSON.parse(fsRead(manifestPath, "utf8"));
          const result = JSON.parse(fsRead(resultPath, "utf8"));
          const isPassingCanary = manifest.schema === "prose-author-stage-adapter-canary-manifest/1"
            && result.schema === "prose-author-stage-adapter-canary-result/1"
            && result.status === "PASS";
          if (isPassingCanary && owner === "voice-profile-render" && result.profile_assembled === true) {
            const jsonPath = join(runs, name, "outputs", "profile.json");
            const markdownPath = join(runs, name, "outputs", "profile.md");
            if (fsExists(jsonPath) && fsExists(markdownPath)) {
              hasValidatedArtifact = validateVoiceProfile(
                JSON.parse(fsRead(jsonPath, "utf8")), fsRead(markdownPath, "utf8"),
              ).ok;
            }
          } else if (isPassingCanary && owner === "voice-draft" && result.draft_assembled === true) {
            const draftPath = join(runs, name, "outputs", "draft.md");
            if (fsExists(draftPath)) {
              hasValidatedArtifact = validateDraft(parseDraft(fsRead(draftPath, "utf8"))).ok;
            }
          }
        }
      }
      currency.set(owner, (currency.get(owner) ?? false) || (isCurrent && hasValidatedArtifact));
      if (!isCurrent) {
        process.stdout.write(`  note ${name}: historical — pins ${owner}@${recorded[0]?.slice(0, 12)},`
          + ` current is ${live.slice(0, 12)}\n`);
      }
      }
    }

    for (const [owner, hasCurrent] of currency) {
      t.check(`some checked-in historical run exercises the frozen v0.3 ${owner} prompt`, hasCurrent,
        "the frozen historical prompt no longer matches its recorded evidence");
    }

    for (const path of found) {
      const label = path.split("/").slice(-3).join("/");
      const parsed = parseRender(fsRead(path, "utf8"));
      t.check(`${label}: emitted a json fence that parses`, parsed.json !== null,
        parsed.jsonError ?? "no json fence");
      if (parsed.json === null) continue;
      const r = validateVoiceProfile(parsed.json, parsed.markdown);
      t.check(`${label}: validates against its declared voice-profile schema`, r.ok, r.errors.join("; "));

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
