import type { JsonSchema } from "../index.js";

export const schema: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Product",
  description: "Compact product form backed by plain JSON Schema.",
  type: "object",
  required: ["product", "pricing", "inventory"],
  properties: {
    product: {
      type: "object",
      title: "Product",
      required: ["name", "slug", "category"],
      properties: {
        name: {
          type: "string",
          title: "Name",
          minLength: 1,
        },
        slug: {
          type: "string",
          title: "Slug",
          pattern: "^[a-z0-9-]+$",
        },
        category: {
          type: "string",
          title: "Category",
          enum: [
            "catalog.category.beauty",
            "catalog.category.fashion",
            "catalog.category.home",
            "catalog.category.wellness",
          ],
        },
        tags: {
          type: "array",
          title: "Tags",
          items: {
            type: "string",
            title: "Tag",
          },
        },
      },
    },
    pricing: {
      title: "Pricing",
      oneOf: [
        {
          type: "object",
          title: "Fixed",
          required: ["mode", "amount", "currency"],
          properties: {
            mode: { const: "fixed", title: "Mode" },
            amount: {
              type: "number",
              title: "Amount",
              minimum: 0,
              multipleOf: 0.01,
            },
            currency: {
              type: "string",
              title: "Currency",
              enum: ["currency.USD", "currency.EUR", "currency.GBP"],
              default: "currency.USD",
            },
          },
        },
        {
          type: "object",
          title: "Subscription",
          required: ["mode", "amount", "cadence"],
          properties: {
            mode: { const: "subscription", title: "Mode" },
            amount: {
              type: "number",
              title: "Amount",
              minimum: 0,
              multipleOf: 0.01,
            },
            cadence: {
              type: "string",
              title: "Cadence",
              enum: ["cadence.monthly", "cadence.quarterly", "cadence.yearly"],
            },
            trialDays: {
              type: "integer",
              title: "Trial days",
              minimum: 0,
              maximum: 90,
            },
          },
        },
      ],
    },
    inventory: {
      type: "object",
      title: "Inventory",
      required: ["sku", "trackStock"],
      properties: {
        sku: {
          type: "string",
          title: "SKU",
        },
        trackStock: {
          type: "boolean",
          title: "Track stock",
          default: true,
        },
        quantity: {
          type: "integer",
          title: "Quantity",
          minimum: 0,
        },
      },
      dependentRequired: {
        trackStock: ["quantity"],
      },
    },
    fulfillment: {
      type: "object",
      title: "Fulfillment",
      additionalProperties: false,
      properties: {
        shippingRequired: {
          type: "boolean",
          title: "Shipping required",
          default: true,
        },
        packageWeight: {
          type: "number",
          title: "Package weight",
          minimum: 0,
          maximum: 100,
          multipleOf: 0.1,
        },
      },
    },
  },
  default: {
    product: {
      name: "Lip color",
      slug: "lip-color",
      category: "catalog.category.beauty",
      tags: ["cosmetic", "featured"],
    },
    pricing: {
      mode: "fixed",
      amount: 24,
      currency: "currency.USD",
    },
    inventory: {
      sku: "LIP-001",
      trackStock: true,
      quantity: 24,
    },
    fulfillment: {
      shippingRequired: true,
      packageWeight: 0.2,
    },
  },
};
