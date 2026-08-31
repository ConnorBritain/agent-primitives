#!/usr/bin/env node
/** Compile a rendered voice profile into an ID-bound machine control card. */

import {
  COVERAGE_DIMENSIONS, DIMENSION_LABELS, SECTION_HEADINGS,
} from "./profile-contract.mjs";

export const CONTROL_CARD_SCHEMA_ID = "voice-draft-control-card/1";

const labelDimensions = new Map(
  Object.entries(DIMENSION_LABELS).map(([dimension, label]) => [label, dimension]),
);
const headingSections = new Map(
  Object.entries(SECTION_HEADINGS).map(([section, heading]) => [heading, section]),
);

const sorted = (values) => [...values].sort();
const sameStrings = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
const measurementId = (observation) =>
  /^\[measurement:([a-z0-9-]+)\]/.exec(observation?.rate?.counting_rule ?? "")?.[1] ?? null;

function instructionBlocks(markdown) {
  const blocks = [];
  let section = null;
  for (const raw of String(markdown ?? "").trim().split(/\n{2,}/)) {
    const block = raw.trim();
    if (headingSections.has(block)) {
      section = headingSections.get(block);
      continue;
    }
    const match = /^\*\*(.+?)\.\*\*\s+([\s\S]*?)\n_Evidence:\s*([\s\S]*?)_\s*$/.exec(block);
    if (!match) continue;
    const labels = match[1].split("; ").map((label) => label.trim());
    const dimensions = labels.map((label) => labelDimensions.get(label));
    if (dimensions.some((dimension) => !dimension)) {
      throw new TypeError(`profile instruction has an unknown coverage label: ${match[1]}`);
    }
    if (!section) throw new TypeError(`profile instruction appears before a known section: ${match[1]}`);
    blocks.push({
      section,
      dimensions,
      instruction: match[2].trim(),
      measurement_id: /\[measurement:([a-z0-9-]+)\]/.exec(match[3])?.[1] ?? null,
    });
  }
  return blocks;
}

export function draftControlCard(profileMarkdown, profileInput) {
  const style = profileInput?.schema === "voice-style-spec/1" ? profileInput : null;
  const profile = style ? style.observed_profile : profileInput;
  if (profile?.schema !== "voice-profile/2" || !Array.isArray(profile.observations)
    || !Array.isArray(profile.coverage)) {
    throw new TypeError("draft controls require one complete voice-profile/2");
  }
  const blocks = instructionBlocks(profileMarkdown);
  const dimensionsByObservation = new Map();
  for (const row of profile.coverage) {
    for (const id of row.observation_ids ?? []) {
      const dimensions = dimensionsByObservation.get(id) ?? [];
      if (!dimensions.includes(row.dimension)) dimensions.push(row.dimension);
      dimensionsByObservation.set(id, dimensions);
    }
  }

  const unused = new Set(blocks.map((_, index) => index));
  const compiled = [];
  for (const observation of profile.observations) {
    const id = measurementId(observation);
    let index = -1;
    if (id) {
      index = blocks.findIndex((block, candidate) =>
        unused.has(candidate) && block.measurement_id === id);
    } else {
      const dimensions = dimensionsByObservation.get(observation.id) ?? [];
      index = blocks.findIndex((block, candidate) => unused.has(candidate)
        && block.measurement_id === null && block.section === observation.section
        && sameStrings(block.dimensions, dimensions));
    }
    if (index === -1) {
      throw new TypeError(`profile observation ${observation.id} has no locatable instruction block`);
    }
    unused.delete(index);
    compiled.push({
      observation_id: observation.id,
      section: observation.section,
      dimensions: dimensionsByObservation.get(observation.id) ?? [],
      measurement_id: id,
      instruction: blocks[index].instruction,
    });
  }
  if (unused.size) {
    throw new TypeError(`profile markdown has ${unused.size} instruction block(s) without observation IDs`);
  }

  const coverage = profile.coverage.map((row) => ({
    dimension: row.dimension,
    status: row.status,
    observation_ids: [...(row.observation_ids ?? [])],
    ...(row.unresolved_reason ? { unresolved_reason: row.unresolved_reason } : {}),
  }));
  if (coverage.length !== COVERAGE_DIMENSIONS.length
    || !sameStrings(coverage.map((row) => row.dimension), COVERAGE_DIMENSIONS)) {
    throw new TypeError("draft control card requires exactly the ten fixed coverage dimensions");
  }
  const instructionIds = new Set(compiled.map((row) => row.observation_id));
  for (const row of coverage) {
    if (row.status !== "unresolved" && row.observation_ids.some((id) => !instructionIds.has(id))) {
      throw new TypeError(`${row.dimension} references an instruction that was not compiled`);
    }
  }
  return {
    schema: CONTROL_CARD_SCHEMA_ID,
    profile: profile.profile,
    confidence: profile.confidence,
    voice_card: profile.voice_card,
    instructions: compiled,
    coverage,
    preference_revision: style?.preference_revision ?? null,
    preferences: style?.active_preferences ?? [],
  };
}

export function renderDraftControlCard(card) {
  if (card?.schema !== CONTROL_CARD_SCHEMA_ID || !Array.isArray(card.instructions)
    || !Array.isArray(card.coverage)) {
    throw new TypeError("invalid voice draft control card");
  }
  const lines = [
    "## Compiled rhetorical control card",
    "",
    `Profile: ${card.profile}; confidence: ${card.confidence}; voice card: ${card.voice_card}.`,
    "Observation instructions are the only supported semantic habits; examples inside them are evidence, not reusable topic facts.",
    "",
    "### Observation instructions",
    "",
  ];
  for (const row of card.instructions) {
    const dimensions = row.dimensions.join(", ");
    const measurement = row.measurement_id ? `; measurement:${row.measurement_id}` : "";
    lines.push(`- ${row.observation_id} [${dimensions}; section:${row.section}${measurement}]: ${row.instruction}`);
  }
  lines.push("", "### Complete coverage checklist", "");
  for (const row of card.coverage) {
    const support = row.status === "unresolved"
      ? `no instruction; ${row.unresolved_reason}`
      : `instructions ${row.observation_ids.join(", ")}`;
    lines.push(`- ${row.dimension}: ${row.status}; ${support}.`);
  }
  if (card.preferences?.length) {
    lines.push(
      "",
      "### Active user preferences",
      "",
      "These are user-selected directives, not observations about the corpus.",
    );
    for (const row of card.preferences) {
      lines.push(`- ${row.id} [${row.stance}; ${row.dimension}/${row.feature}]: ${row.directive}`);
    }
  }
  return lines.join("\n");
}
