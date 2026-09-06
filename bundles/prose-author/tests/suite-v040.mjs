/** v0.4 regressions use independently specified prose and expected outcomes. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { visibleProse, wordCount } from "../skills/prose-draft/tools/visible-prose.mjs";
import { measureSample, measureSamples, assembleProfileV3, validateProfileV3, readCurrentSamples, heldOutDiagnostics } from "../skills/prose-draft/tools/profile-v3.mjs";
import { checkRules, compareObserved, verifyRuleReceipt } from "../skills/prose-draft/tools/style-rules.mjs";
import { measureProfile } from "../skills/prose-draft/tools/profile-measure.mjs";
import { initPreferencesV2, emptyScope, proposePreferencesV2, applyPreferencesV2, compileStyleV2, undoPreferencesV2, digest, migratePreferencesV1 } from "../skills/prose-draft/tools/preferences-v2.mjs";
import { checkCurrentEvidence } from "./v040-measurements.mjs";

const sample = (text, id = "one") => ({ id, text, human_authored: true, author: "Fixture author", source: "Test fixture", register: "plain", form: "reply" });
const count = (text, id) => measureSample(sample(text)).measurements.find((r) => r.id === id).count;
const rule = (kind, fields = {}) => ({ id: "r1", kind, directive: "Explicit test instruction", ...fields });
const pieces = () => Array.from({ length: 5 }, (_, i) => sample(`${i} ${"Words belong here. ".repeat(70)}`, `piece-${i}`));

export function run(t, { HERE }) {
  t.group("v0.4 visible prose, current profiles, and explicit rules");
  const test = (name, fn) => { try { fn(); t.check(name, true); } catch (e) { t.check(name, false, e.stack); } };
  test("checked-in current measurements reproduce without changing historical records", () => {
    assert.equal(checkCurrentEvidence(), true);
  });
  test("link targets are not parenthetical asides; visible labels still count", () => {
    const text = "You read [the report](https://example.test/a_(b)?q=yes) (briefly).";
    assert.equal(count(text, "round-parenthetical-spans"), 1);
    assert.equal(count(text, "question-marks"), 0);
    assert.equal(count(text, "second-person-family"), 1);
    const measured = measureSample(sample(text));
    const span = measured.measurements.find((r) => r.id === "round-parenthetical-spans").occurrences[0];
    assert.equal(text.slice(span.start, span.end), "(briefly)");
  });
  test("metadata, code, image alt, comments, definitions and HTML nonprose are excluded", () => {
    const text = '---\r\nauthor: You?\r\n---\r\nYou read.\n````js\n```\nYou? (code)\n````\n`you?` ``you `?`` ![you?](x) <!-- you? --> <script>you?</script>\n[r]: https://x/?q=y "You?"\n';
    assert.equal(count(text, "second-person-family"), 1);
    assert.equal(count(text, "question-marks"), 0);
    assert.equal(count(text, "round-parenthetical-spans"), 0);
    assert.ok(visibleProse(text).exclusions.length > 5);
  });
  test("unterminated code fence never becomes author prose", () => {
    assert.equal(count("We begin.\n~~~\nyou? (x)", "second-person-family"), 0);
  });
  test("indented code, HTML blockquotes and bare URL closing delimiters are handled", () => {
    assert.equal(count("We begin.\n\n    you? (code)\n\nWe end.", "question-marks"), 0);
    assert.equal(count("We begin. <blockquote>You? (their aside)</blockquote>", "question-marks"), 0);
    assert.equal(count("See it (at https://example.test/x).", "round-parenthetical-spans"), 1);
  });
  test("reference links preserve the human-readable label", () => {
    assert.equal(count("[You][ref]\n\n[ref]: https://test/?q=why", "second-person-family"), 1);
    assert.equal(count("[You][ref]\n\n[ref]: https://test/?q=why", "question-marks"), 0);
  });
  test("quoted material is separate; semantic quote inference is not fabricated", () => {
    const text = "You answer.\n> You? (their aside)\n\nWe continue.";
    const n = visibleProse(text);
    assert.equal(count(text, "second-person-family"), 1);
    assert.equal(n.quotations.length, 1);
    assert.ok(wordCount(n.visible) > wordCount(n.author));
    assert.equal(count('You call it "you".', "second-person-family"), 2);
    const start = text.indexOf("You answer");
    assert.throws(() => visibleProse(text, { quotedRanges: [{ start, end: text.length + 1 }] }));
  });
  test("entities decode before counting and retain original offsets", () => {
    const text = "😀 It&apos;s fine &mdash; yes?";
    assert.equal(count(text, "contractions"), 1);
    const m = measureSample(sample(text));
    const dash = m.measurements.find((r) => r.id === "em-dashes").occurrences[0];
    assert.equal(text.slice(dash.start, dash.end), "&mdash;");
    assert.equal(wordCount("It's co-written café 42."), 5);
    assert.match(visibleProse("&unknown;").warnings[0], /Unrecognized/);
  });
  test("plain input leaves Markdown-looking prose literal", () => {
    assert.equal(visibleProse("Read `this?`", { format: "plain" }).author, "Read `this?`");
  });
  test("short human samples count; duplicate and machine samples do not bootstrap", () => {
    const m = measureSamples([sample("Thank you."), sample("Thank you.", "duplicate"), { ...sample("Why not?", "model"), human_authored: false }]);
    assert.equal(m.sample_count, 1); assert.equal(m.corpus_words, 2);
    assert.equal(m.support, "limited-evidence"); assert.equal(m.samples_excluded.length, 2);
  });
  test("five independent pieces and 1000 words establish support per selected group", () => {
    assert.equal(measureSamples(pieces()).support, "supported");
    const mixedForms = pieces().map((s, i) => ({ ...s, form: i ? "essay" : "reply" }));
    assert.equal(measureSamples(mixedForms).support, "limited-evidence");
    assert.equal(measureSamples(mixedForms, { form: "reply" }).sample_count, 1);
    assert.equal(measureSamples([]).support, "preference-only");
  });
  test("mixed authors and oversized corpora cannot silently pool", () => {
    assert.throws(() => measureSamples([sample("one"), { ...sample("two", "two"), author: "Another person" }]), /Mixed authors/);
    assert.throws(() => measureSamples(Array.from({ length: 51 }, (_, i) => sample(`piece ${i}`, `${i}`))), /Oversized/);
  });
  test("profile/3 has all dimensions, reproducible arithmetic and source citations", () => {
    const s = sample("I qualify (sometimes)."), quote = "(sometimes)";
    const p = assembleProfileV3({ id: "test", samples: [s], observations: [{ description: "An aside qualifies this statement.", dimensions: ["qualification-hedging"], citations: [{ file: s.id, start: 10, end: 21, quote }] }] });
    assert.equal(p.coverage.length, 10);
    assert.deepEqual(validateProfileV3(p, { samples: [s] }), []);
    assert.equal(p.measured.measurements.find((r) => r.id === "question-marks").observed_absence, true);
    assert.throws(() => assembleProfileV3({ id: "test", samples: [s], observations: [{ description: "unsupported", dimensions: ["figures-analogy"], citations: [{ file: s.id, start: 0, end: 4, quote: "nope" }] }] }), /Unlocatable/);
    const omitted = structuredClone(p); omitted.coverage.pop();
    assert.ok(validateProfileV3(omitted).some((e) => /coverage/i.test(e)));
    const dangling = structuredClone(p); dangling.coverage[0].observation_ids.push("missing");
    assert.ok(validateProfileV3(dangling).some((e) => /reference/.test(e)));
    const badRate = structuredClone(p); badRate.measured.measurements[0].per_1000_words = 90;
    assert.ok(validateProfileV3(badRate).some((e) => /arithmetic/.test(e)));
    const noRule = structuredClone(p); delete noRule.measured.measurements[0].counting_rule;
    assert.ok(validateProfileV3(noRule).some((e) => /counting rule/.test(e)));
    assert.ok(validateProfileV3(p, { samples: [{ ...s, text: "Changed source." }] }).some((e) => /divergence|stale/.test(e)));
  });
  test("held-out diagnostics use only other pieces and are descriptive", () => {
    const rows = pieces(); rows[4].text += " Why?";
    const d = heldOutDiagnostics(measureSamples(rows));
    const last = d.samples.find((s) => s.id === "piece-4");
    assert.equal(last.training_samples, 4);
    assert.equal(last.measurements.find((r) => r.id === "question-marks").status, "outside-observed-range");
    assert.equal(heldOutDiagnostics(measureSamples([sample("Hi.")])).samples[0].measurements[0].status, "not-evaluated");
  });
  test("no requested length cannot bypass explicit question and word limits", () => {
    const rules = [rule("count-range", { measurement_id: "question-marks", unit: "per-document", minimum: 0, maximum: 0 }), rule("word-limit", { id: "r2", minimum: 1, maximum: 20 })];
    const report = checkRules("Why? ".repeat(1000), rules);
    assert.equal(report.status, "failed"); assert.equal(report.checks[0].actual, 1000); assert.equal(report.draft_words, 1000);
  });
  test("an explicit zero really means zero, without an absolute-floor exception", () => {
    const rules = [rule("punctuation", { characters: "—", minimum: 0, maximum: 0 })];
    assert.equal(checkRules("One — two.", rules).status, "failed");
    assert.equal(checkRules("One, two.", rules).status, "passed");
    assert.equal(checkRules("(hi)-[x]", [rule("punctuation", { characters: "(-[", minimum: 3, maximum: 3 })]).status, "passed");
  });
  test("rate controls use actual length, and empty text is not evaluated", () => {
    const rules = [rule("count-range", { measurement_id: "question-marks", unit: "per-1000-words", minimum: 0, maximum: 10 })];
    assert.equal(checkRules("Why?", rules).status, "failed");
    assert.equal(checkRules("Why?", rules).checks[0].actual, 1000);
    assert.equal(checkRules("", rules).status, "not-evaluated");
  });
  test("literal rules are independently usable and distinguish a word from its substring", () => {
    assert.equal(checkRules("A classic.", [rule("prohibited-phrase", { text: "ass" })]).status, "passed");
    assert.equal(checkRules("An ass.", [rule("prohibited-phrase", { text: "ass" })]).status, "failed");
    assert.equal(checkRules("Hello Dahlia.", [rule("required-text", { text: "Dahlia" })]).status, "passed");
    assert.equal(checkRules("Hello dahlia.", [rule("required-text", { text: "Dahlia" })]).status, "failed");
  });
  test("unsupported semantic preferences are never advertised as mechanically enforced", () => {
    const report = checkRules("Example.", [rule("semantic")]);
    assert.equal(report.status, "not-evaluated"); assert.equal(report.checks[0].enforcement, "advisory");
    assert.equal(checkRules("Example.", []).status, "not-evaluated");
    assert.throws(() => checkRules("hi", [rule("count-range", { measurement_id: "invented", minimum: 0, maximum: 1, unit: "per-document" })]), /Unknown/);
  });
  test("observed absence remains advisory and actual length is always reported", () => {
    const p = assembleProfileV3({ id: "test", samples: pieces() });
    const report = compareObserved("Why?", p, { register: "plain", form: "reply" });
    assert.equal(report.draft_words, 1); assert.equal(report.enforcement, "advisory");
    assert.equal(report.measurements.find((r) => r.id === "question-marks").status, "outside-observed-range");
    assert.equal(compareObserved("Why?", p, { form: "unknown" }).measurements[0].status, "not-evaluated");
  });
  test("receipts bind both rules and exact final text", () => {
    const rules = [rule("required-text", { text: "Hello" })], report = checkRules("Hello", rules);
    assert.equal(verifyRuleReceipt("Hello", rules, report).status, "passed");
    assert.equal(verifyRuleReceipt("Hello ", rules, report).status, "failed");
    assert.equal(verifyRuleReceipt("Hello", [rule("required-text", { text: "Goodbye" })], report).status, "failed");
  });
  test("real Mullin regression: three Markdown destinations are zero asides", () => {
    const dir = join(HERE, "fixtures/profiles/eff-mullin");
    const text = readFileSync(join(dir, "corpus/human/congress-narrowed-guard-act-serious-problems-remain.txt"), "utf8");
    assert.equal((text.match(/\([^()\n]+\)/g) ?? []).length, 4); // includes frontmatter source label
    assert.equal(count(text, "round-parenthetical-spans"), 0);
    const current = measureSamples(readCurrentSamples(dir));
    assert.equal(current.sample_count, 11);
    const old = measureProfile(dir);
    assert.equal(old.schema, "voice-profile-measurements/1");
    assert.equal(old.measurements.find((r) => r.id === "round-parenthetical-spans").count, 97);
    assert.ok(current.measurements.find((r) => r.id === "round-parenthetical-spans").count < 20);
  });
  const decision = (id = "no-dash", scope = emptyScope()) => ({ id, feature: "dash-use", scope, binding: null,
    rule: rule("punctuation", { id, characters: "—", minimum: 0, maximum: 0 }) });
  const save = (p, d, feedback = "Never use an em dash.") => applyPreferencesV2(p, proposePreferencesV2(p, { feedback, operations: [{ id: "save", kind: "upsert", decision: d }] }));
  test("direct persistent feedback saves without a second approval and works without a corpus", () => {
    const p = initPreferencesV2("writer"), result = save(p, decision());
    assert.equal(result.status, "saved"); assert.equal(result.preferences.revision, 2);
    assert.equal(p.decisions.length, 0); assert.equal(result.receipt.parent_digest, digest(p));
    const reopened = JSON.parse(JSON.stringify(result.preferences));
    const spec = compileStyleV2(reopened);
    assert.equal(spec.schema, "voice-style-spec/2"); assert.equal(spec.profile, null);
    assert.equal(checkRules("One — two.", spec.rules).status, "failed");
  });
  test("inferred or ordinary edit feedback requires approval, including single-word edits", () => {
    const p = initPreferencesV2("writer");
    const proposal = proposePreferencesV2(p, { feedback: "Change utilize to use.", operations: [{ id: "save", kind: "upsert", decision: decision() }] });
    assert.equal(applyPreferencesV2(p, proposal).status, "approval-required");
    assert.equal(applyPreferencesV2(p, proposal, { accepted: ["save"] }).status, "saved");
    assert.equal(save(p, decision(), "I don't always use em dashes.").status, "approval-required");
    assert.throws(() => applyPreferencesV2(p, proposal, { accepted: ["unknown"] }), /Invalid accepted/);
  });
  test("scopes, stale proposals and undo preserve immutable history", () => {
    const p = initPreferencesV2("writer"), d = decision("email-dash", { ...emptyScope(), forms: ["email"] });
    const proposal = proposePreferencesV2(p, { feedback: "Never use an em dash in email.", operations: [{ id: "save", kind: "upsert", decision: d }] });
    const next = applyPreferencesV2(p, proposal).preferences;
    assert.equal(compileStyleV2(next, { context: { form: "essay" } }).rules.length, 0);
    assert.equal(compileStyleV2(next, { context: { form: "email" } }).rules.length, 1);
    assert.throws(() => applyPreferencesV2(next, proposal), /Stale/);
    const undone = undoPreferencesV2(next, p);
    assert.equal(undone.revision, 3); assert.equal(undone.parent_digest, digest(next));
    assert.equal(compileStyleV2(undone, { context: { form: "email" } }).rules.length, 0);
  });
  test("ties require clarification; a specific preference supersedes broader rules", () => {
    const one = save(initPreferencesV2("writer"), decision()).preferences;
    const two = save(one, decision("another")).preferences;
    assert.throws(() => compileStyleV2(two), /equally specific/);
    const three = save(two, decision("reply-only", { ...emptyScope(), forms: ["reply"] })).preferences;
    assert.equal(compileStyleV2(three, { context: { form: "reply" } }).rules[0].id, "reply-only");
  });
  test("explicit rules survive profile refresh; observed bindings do not silently retarget", () => {
    const p = assembleProfileV3({ id: "p", samples: pieces() });
    const prefs = save(initPreferencesV2("writer"), decision()).preferences;
    assert.equal(compileStyleV2(prefs, { profile: p }).rules.length, 1);
    const refreshed = assembleProfileV3({ id: "p", samples: pieces().map((s) => ({ ...s, text: `${s.text} Extra.` })) });
    assert.equal(compileStyleV2(prefs, { profile: refreshed }).rules.length, 1);
    const dependent = structuredClone(prefs); dependent.decisions[0].binding = { profile_digest: digest(p), observation_ids: ["old-observation"] };
    assert.throws(() => compileStyleV2(dependent, { profile: refreshed }), /rebinding/);
    const override = rule("punctuation", { id: "no-dash", characters: "—", minimum: 0, maximum: 2 });
    assert.equal(compileStyleV2(prefs, { overrides: [override] }).rules[0].maximum, 2);
    assert.equal(compileStyleV2(prefs).rules[0].maximum, 0);
  });
  test("legacy preferences migrate without turning semantic intent into fake hard rules", () => {
    const old = { schema: "voice-preferences/1", profile: { id: "p", digest: "a".repeat(64) }, decisions: [{ id: "o1", feature: "dash", directive: "Prefer fewer dashes", scope: emptyScope(), observation_ids: ["obs1"], control: { mode: "suppress-counted" } }] };
    const migrated = migratePreferencesV1(old);
    assert.equal(migrated.schema, "voice-preferences/2");
    assert.equal(migrated.decisions[0].rule.kind, "semantic");
    assert.throws(() => compileStyleV2(migrated), /rebinding/);
    assert.equal(old.schema, "voice-preferences/1");
  });
}
