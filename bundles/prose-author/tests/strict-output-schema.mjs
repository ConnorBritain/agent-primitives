/**
 * Conservative structured-output schema boundary shared by CLI harnesses.
 *
 * Provider transports implement a strict subset of JSON Schema. Richer semantic
 * constraints remain in the deterministic validators; transport schemas must stay
 * inside the intersection that Codex and Claude can enforce before generation.
 */

const UNSUPPORTED_KEYWORDS = new Set([
  "allOf", "dependentRequired", "dependentSchemas", "else", "if", "not",
  "patternProperties", "then", "uniqueItems",
]);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function strictOutputSchemaErrors(schema) {
  const errors = [];
  const visit = (node, at, { root = false } = {}) => {
    if (!isObject(node)) {
      errors.push(`${at} must be a schema object`);
      return;
    }
    if (root && (node.type !== "object" || Object.hasOwn(node, "anyOf"))) {
      errors.push(`${at} must be an object schema without root anyOf`);
    }
    for (const keyword of UNSUPPORTED_KEYWORDS) {
      if (Object.hasOwn(node, keyword)) errors.push(`${at}.${keyword} is not portable structured output`);
    }
    if (node.type === "object") {
      if (!isObject(node.properties)) errors.push(`${at}.properties must be an object`);
      if (node.additionalProperties !== false) errors.push(`${at}.additionalProperties must be false`);
      const properties = Object.keys(isObject(node.properties) ? node.properties : {});
      const required = Array.isArray(node.required) ? node.required : [];
      const missing = properties.filter((key) => !required.includes(key));
      const extra = required.filter((key) => !properties.includes(key));
      if (missing.length || extra.length || new Set(required).size !== required.length) {
        errors.push(`${at}.required must name every property exactly once`);
      }
      for (const [key, child] of Object.entries(isObject(node.properties) ? node.properties : {})) {
        visit(child, `${at}.properties.${key}`);
      }
    }
    if (node.items) visit(node.items, `${at}.items`);
    for (const [index, child] of (Array.isArray(node.anyOf) ? node.anyOf : []).entries()) {
      visit(child, `${at}.anyOf[${index}]`);
    }
    for (const [key, child] of Object.entries(isObject(node.$defs) ? node.$defs : {})) {
      visit(child, `${at}.$defs.${key}`);
    }
  };
  visit(schema, "$", { root: true });
  return errors;
}

export function assertStrictOutputSchema(schema, label = "structured output schema") {
  const errors = strictOutputSchemaErrors(schema);
  if (errors.length) throw new Error(`${label} is not portable: ${errors.join("; ")}`);
  return schema;
}
