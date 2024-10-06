/**
 * Severity of a single schema change.
 *
 * `breaking` changes invalidate payloads that were valid against the previous
 * schema; `non-breaking` changes keep every previously valid payload valid.
 */
export type Severity = 'breaking' | 'non-breaking';

/**
 * A JSON Schema document, narrowed to the keywords this tool understands.
 * Unknown keywords are kept in the index signature so documents pass through
 * without being rewritten.
 */
export interface JsonSchema {
  type?: string | string[];
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  minProperties?: number;
  maxProperties?: number;
  [keyword: string]: unknown;
}

/** One difference between the two documents. */
export interface SchemaChange {
  /** Id of the rule that produced the change, e.g. `required`. */
  rule: string;
  /** JSON pointer of the keyword that changed, rooted at `#`. */
  path: string;
  severity: Severity;
  message: string;
  /** Value in the before document, when the rule has one to report. */
  before?: unknown;
  /** Value in the after document, when the rule has one to report. */
  after?: unknown;
}

export interface CompareOptions {
  /** Report every change as breaking, regardless of the rule default. */
  strict?: boolean;
  /** Rule ids to skip, e.g. `['bounds', 'enum']`. */
  ignore?: string[];
}

export interface CompareResult {
  changes: SchemaChange[];
  breaking: SchemaChange[];
  nonBreaking: SchemaChange[];
  /** True when the after document is backward compatible. */
  ok: boolean;
}

/** Everything a rule needs in order to inspect one pair of schemas. */
export interface RuleContext {
  /** JSON pointer of the pair of schemas being compared. */
  path: string;
  left: JsonSchema;
  right: JsonSchema;