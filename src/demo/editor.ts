import type { JsonSchema } from "../index.js";

const thenKeyword = ("th" + "en") as "then";

export const schema: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Editor Testing Matrix",
  description:
    "Plain JSON Schema fixture covering primitives, required fields, arrays, enums, unions, conditionals, maps, and secrets.",
  type: "object",
  required: ["profile", "delivery"],
  properties: {
    profile: {
      type: "object",
      title: "Profile",
      required: ["name", "email"],
      properties: {
        name: {
          type: "string",
          title: "Name",
          minLength: 1,
        },
        email: {
          type: "string",
          title: "Email",
          format: "email",
        },
        website: {
          type: "string",
          title: "Website",
          format: "uri",
        },
        nullable: {
          anyOf: [
            {
              type: "null",
            },
            {
              type: "string",
              title: "Nullable string",
            },
          ],
        },
        favoriteColor: {
          type: "string",
          title: "Favorite color",
          format: "color",
        },
        status: {
          type: "string",
          title: "Status",
          enum: ["Draft (not yet submitted)", "In review (awaiting approval)", "Published (live)"],
          default: "Draft (not yet submitted)",
        },
      },
    },
    primitives: {
      type: "object",
      title: "Primitives",
      properties: {
        score: {
          type: "number",
          title: "Score",
          minimum: 0,
          maximum: 100,
          multipleOf: 0.5,
          default: 42.5,
        },
        count: {
          type: "integer",
          title: "Count",
          minimum: 0,
          default: 3,
        },
        enabled: {
          type: "boolean",
          title: "Enabled",
          default: true,
        },
        launchAt: {
          type: "string",
          title: "Launch at",
          format: "date-time",
        },
        apiSecret: {
          type: "string",
          title: "API secret",
          writeOnly: true,
        },
        readOnlyId: {
          type: "string",
          title: "Read-only ID",
          readOnly: true,
          default: "demo_001",
        },
      },
    },
    arrays: {
      type: "object",
      title: "Arrays",
      properties: {
        tags: {
          type: "array",
          title: "Tags",
          items: {
            type: "string",
            title: "Tag",
          },
          default: ["alpha", "beta"],
        },
        tuple: {
          type: "array",
          title: "Tuple",
          prefixItems: [
            { type: "string", title: "Label" },
            { type: "integer", title: "Priority" },
            { type: "boolean", title: "Enabled" },
          ],
          items: false,
          default: ["primary", 2, true],
        },
        attachments: {
          type: "array",
          title: "Attachments",
          items: {
            type: "object",
            title: "Attachment",
            required: ["url", "alt"],
            properties: {
              url: { type: "string", title: "URL", format: "uri" },
              alt: { type: "string", title: "Alt text" },
              kind: {
                type: "string",
                title: "Kind",
                enum: ["Image attachment", "File attachment"],
              },
            },
          },
        },
      },
    },
    delivery: {
      title: "Delivery",
      oneOf: [
        {
          type: "object",
          title: "Email",
          required: ["kind", "email"],
          properties: {
            kind: { const: "email", title: "Kind" },
            email: { type: "string", title: "Email", format: "email" },
          },
        },
        {
          type: "object",
          title: "Webhook",
          required: ["kind", "url"],
          properties: {
            kind: { const: "webhook", title: "Kind" },
            url: { type: "string", title: "URL", format: "uri" },
            signingSecret: { type: "string", title: "Signing secret", writeOnly: true },
          },
        },
        {
          type: "object",
          title: "Queue",
          required: ["kind", "queue"],
          properties: {
            kind: { const: "queue", title: "Kind" },
            queue: { type: "string", title: "Queue" },
          },
        },
      ],
    },
    schedule: {
      type: "object",
      title: "Schedule",
      required: ["mode"],
      properties: {
        mode: {
          type: "string",
          title: "Mode",
          enum: ["immediate", "scheduled"],
          default: "immediate",
        },
        publishAt: {
          type: "string",
          title: "Publish at",
          format: "date-time",
        },
      },
      if: {
        properties: {
          mode: { const: "scheduled" },
        },
      },
      [thenKeyword]: {
        required: ["publishAt"],
      },
    },
    optionalFlexibleValue: {
      title: "Optional flexible value",
      oneOf: [
        { type: "null", title: "No value" },
        {
          type: "number",
          title: "Numeric value (0 to 100)",
          minimum: 0,
          maximum: 100,
        },
        { type: "string", title: "Text value" },
      ],
    },
    metadata: {
      type: "object",
      title: "Metadata",
      additionalProperties: {
        type: "string",
      },
      default: {
        owner: "content",
      },
    },
  },
  default: {
    profile: {
      name: "Avery Stone",
      email: "avery@example.com",
      favoriteColor: "#ff4d6d",
      status: "In review (awaiting approval)",
    },
    primitives: {
      score: 42.5,
      count: 3,
      enabled: true,
      launchAt: "2026-06-01T09:30:00-05:00",
      readOnlyId: "demo_001",
    },
    arrays: {
      tags: ["alpha", "beta"],
      tuple: ["primary", 2, true],
      attachments: [
        {
          url: "https://example.com/assets/a.png",
          alt: "Attachment A",
          kind: "Image attachment",
        },
      ],
    },
    delivery: {
      kind: "email",
      email: "ops@example.com",
    },
    schedule: {
      mode: "immediate",
    },
    optionalFlexibleValue: null,
    metadata: {
      owner: "content",
    },
  },
};
