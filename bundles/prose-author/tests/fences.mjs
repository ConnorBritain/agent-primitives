/**
 * Fenced-output parsing, shared by every primitive in this bundle that emits one.
 *
 * `voice-profile-render` emits a markdown profile plus a json provenance block;
 * `voice-draft` emits a markdown draft OR a json refusal. Different contracts, but
 * the same convention on purpose — a fenced artefact a harness can extract without
 * trusting the model's prose around it.
 *
 * This exists because the two parsers were written separately and were identical
 * apart from field names. They are in the same bundle with no load-independence
 * reason to duplicate, so the shape lives here and each module names the fields its
 * own contract uses.
 */

/**
 * @param {string} text  a dispatch's full output
 * @returns {{markdown: string|null, json: object|null, jsonError: string|null,
 *            hadMarkdown: boolean, hadJson: boolean}}
 */
export function parseFences(text) {
  const md = /```markdown\n([\s\S]*?)\n```/.exec(text ?? "");
  const js = /```json\n([\s\S]*?)\n```/.exec(text ?? "");
  let json = null;
  let jsonError = null;
  if (js) {
    try { json = JSON.parse(js[1]); } catch (e) { jsonError = e.message; }
  }
  return {
    markdown: md ? md[1] : null,
    json,
    jsonError,
    hadMarkdown: Boolean(md),
    hadJson: Boolean(js),
  };
}
