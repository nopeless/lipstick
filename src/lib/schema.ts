export {
  acceptsType,
  getArrayItemSchema,
  getRefError,
  getRequiredProperties,
  humanizeLabel,
  isArraySchema,
  isObjectSchema,
  isSchemaObject,
  matchesSchema,
  pathToKey,
  resolveSchema,
} from "./schema/resolution.js";
export { describeUnion, inferDiscriminator, pickBestBranchIndex } from "./schema/unions.js";
export type { DiscriminatorInfo, UnionPresentation } from "./schema/unions.js";
export { buildInitialValue, sanitizeValueForSchema } from "./schema/value.js";
