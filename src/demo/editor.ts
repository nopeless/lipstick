import { Type } from "typebox";

export const schema = Type.Object(
  {
    primitives: Type.Object(
      {
        shortText: Type.Union(
          [
            Type.String({
              title: "Text value",
              minLength: 1,
              maxLength: 24,
            }),
            Type.Null({
              title: "Null value",
            }),
          ],
          {
            title: "Short text",
          },
        ),
        titledScalar: Type.String({
          title: "Titled scalar",
          description: "Tests scalar label and helper text rendering on the same field.",
          minLength: 1,
          maxLength: 40,
        }),
        describedScalar: Type.String({
          description: "Tests scalar helper text rendering when no schema title is provided.",
          minLength: 1,
          maxLength: 40,
        }),
        describedRange: Type.Number({
          description: "Testing section behavior.",
          minimum: 0,
          maximum: 10,
        }),
        slug: Type.String({
          title: "Slug",
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        }),
        email: Type.String({
          title: "Email",
          format: "email",
        }),
        website: Type.String({
          title: "Website",
          format: "uri",
        }),
        favoriteColor: Type.Optional(
          Type.String({
            title: "Favorite color",
            format: "color",
          }),
        ),
        launchAt: Type.String({
          title: "Launch at",
          format: "date-time",
        }),
        score: Type.Union(
          [
            Type.Number({
              title: "Number value",
              minimum: 0,
              maximum: 100,
              multipleOf: 0.5,
            }),
            Type.Null({
              title: "Null value",
            }),
          ],
          {
            title: "Score",
          },
        ),
        count: Type.Integer({
          title: "Count",
          minimum: 0,
          maximum: 10,
        }),
        optionalRange: Type.Optional(
          Type.Union(
            [
              Type.Number({
                title: "Range value",
                minimum: 0,
                maximum: 10,
                multipleOf: 1,
              }),
              Type.Null({
                title: "Null value",
              }),
            ],
            {
              title: "Optional range",
              description:
                "Tests a bounded numeric scalar that renders as a range input and can cycle to null.",
            },
          ),
        ),
        enabled: Type.Union(
          [
            Type.Boolean({
              title: "Boolean value",
            }),
            Type.Null({
              title: "Null value",
            }),
          ],
          {
            title: "Enabled",
            default: false,
          },
        ),
        nullableNote: Type.Optional(
          Type.Union(
            [
              Type.String({
                title: "String value",
              }),
              Type.Null({
                title: "Null value",
              }),
            ],
            {
              title: "Nullable note",
            },
          ),
        ),
      },
      {
        title: "Primitives",
        description: "Tests string, number, integer, boolean, and format validation.",
      },
    ),
    enums: Type.Object(
      {
        status: Type.Union(
          [Type.Literal("draft"), Type.Literal("review"), Type.Literal("published")],
          {
            type: "string",
            title: "Status",
          },
        ),
        kind: Type.Literal("test-case", {
          title: "Kind",
        }),
        mode: Type.Union([Type.Literal("manual"), Type.Literal("automatic")], {
          type: "string",
          title: "Mode",
        }),
      },
      {
        title: "Enums",
        description: "Tests enum rendering and const handling.",
      },
    ),
    arrays: Type.Object(
      {
        tags: Type.Array(Type.String(), {
          title: "Tags",
          minItems: 1,
          maxItems: 4,
          uniqueItems: true,
        }),
        tuple: Type.Array(Type.Union([Type.String(), Type.Number(), Type.Boolean()]), {
          title: "Tuple",
          description: "Tests prefixItems tuple editing.",
          minItems: 3,
          maxItems: 3,
        }),
        attachments: Type.Array(
          Type.Unknown({
            $ref: "#/$defs/attachment",
          }),
          {
            title: "Attachments",
            minItems: 1,
            maxItems: 2,
          },
        ),
      },
      {
        title: "Arrays",
        description: "Tests plain arrays, tuple arrays, and arrays of refs.",
      },
    ),
    objects: Type.Object(
      {
        closedRecord: Type.Object(
          {
            id: Type.String({
              title: "ID",
            }),
            label: Type.String({
              title: "Label",
            }),
            active: Type.Optional(
              Type.Boolean({
                title: "Active",
                default: true,
              }),
            ),
          },
          {
            title: "Closed record",
          },
        ),
        nestedRecord: Type.Object(
          {
            owner: Type.Unknown({
              $ref: "#/$defs/person",
            }),
            attachment: Type.Unknown({
              $ref: "#/$defs/attachment",
            }),
          },
          {
            title: "Nested record",
          },
        ),
      },
      {
        title: "Objects",
        description: "Tests closed objects and nested object shapes.",
      },
    ),
    refs: Type.Object(
      {
        personRef: Type.Unknown({
          $ref: "#/$defs/person",
        }),
        moneyRef: Type.Unknown({
          $ref: "#/$defs/money",
        }),
        attachmentRef: Type.Unknown({
          $ref: "#/$defs/attachment",
        }),
      },
      {
        title: "Refs",
        description: "Tests direct $ref rendering for reusable definitions.",
      },
    ),
    composition: Type.Object(
      {
        identity: Type.Intersect(
          [
            Type.Unknown({
              $ref: "#/$defs/person",
            }),
            Type.Unknown({
              $ref: "#/$defs/auditStamp",
            }),
          ],
          {
            title: "Identity",
          },
        ),
        contactChoice: Type.Union(
          [
            Type.String({
              title: "Email string",
              format: "email",
            }),
            Type.Object(
              {
                name: Type.String({
                  title: "Name",
                }),
                email: Type.String({
                  title: "Email",
                  format: "email",
                }),
                phone: Type.Optional(
                  Type.String({
                    title: "Phone",
                  }),
                ),
              },
              {
                title: "Contact card",
              },
            ),
          ],
          {
            title: "Contact choice",
          },
        ),
        pricingStrategy: Type.Union(
          [
            Type.Unknown({
              $ref: "#/$defs/fixedPrice",
            }),
            Type.Unknown({
              $ref: "#/$defs/tieredPrice",
            }),
          ],
          {
            title: "Pricing strategy",
          },
        ),
        deliveryConfig: Type.Union(
          [
            Type.Object(
              {
                kind: Type.Literal("email", {
                  title: "Kind",
                }),
                email: Type.String({
                  title: "Email",
                  format: "email",
                }),
              },
              {
                title: "Email",
                description: "Send an email notifiction.",
              },
            ),
            Type.Object(
              {
                kind: Type.Literal("webhook", {
                  title: "Kind",
                }),
                url: Type.String({
                  title: "URL",
                  format: "uri",
                }),
              },
              {
                title: "Webhook",
                description: "Send a webhook payload to the specified URL.",
              },
            ),
            Type.Object(
              {
                kind: Type.Literal("queue", {
                  title: "Kind",
                }),
                queue: Type.String({
                  title: "Queue",
                }),
              },
              {
                title: "Queue",
                description: "Add a message to the specified queue.",
              },
            ),
            Type.Null(),
          ],
          {
            title: "Delivery config",
            description:
              "Tests discriminated union inference using a shared required discriminator property.",
          },
        ),
      },
      {
        title: "Composition",
        description: "Tests allOf, anyOf, and oneOf in separate branches.",
      },
    ),
    conditionals: Type.Object(
      {
        schedule: Type.Object(
          {
            mode: Type.Union([Type.Literal("immediate"), Type.Literal("scheduled")], {
              type: "string",
              title: "Mode",
            }),
            publishAt: Type.Optional(
              Type.String({
                title: "Publish at",
                format: "date-time",
              }),
            ),
            timezone: Type.Optional(
              Type.String({
                title: "Timezone",
              }),
            ),
            notes: Type.Optional(
              Type.String({
                title: "Notes",
                maxLength: 240,
              }),
            ),
          },
          {
            title: "Schedule",
            if: {
              properties: {
                mode: {
                  const: "scheduled",
                },
              },
              required: ["mode"],
            },
            then: {
              required: ["publishAt", "timezone"],
            },
            else: {
              required: ["notes"],
            },
          },
        ),
        approvalRules: Type.Object(
          {
            approvalRequired: Type.Boolean({
              title: "Approval required",
              default: true,
            }),
            approvers: Type.Optional(
              Type.Array(
                Type.Unknown({
                  $ref: "#/$defs/person",
                }),
                {
                  title: "Approvers",
                },
              ),
            ),
          },
          {
            title: "Approval rules",
            dependentRequired: {
              approvalRequired: ["approvers"],
            },
          },
        ),
        ssoConfig: Type.Object(
          {
            provider: Type.Union(
              [Type.Literal("saml"), Type.Literal("oauth"), Type.Literal("passwordless")],
              {
                type: "string",
                title: "Provider",
              },
            ),
            issuerUrl: Type.Optional(
              Type.String({
                title: "Issuer URL",
                format: "uri",
              }),
            ),
            clientId: Type.Optional(
              Type.String({
                title: "Client ID",
              }),
            ),
            clientSecret: Type.Optional(
              Type.String({
                title: "Client secret",
                writeOnly: true,
              }),
            ),
          },
          {
            title: "SSO config",
            dependentSchemas: {
              provider: {
                required: ["issuerUrl", "clientId", "clientSecret"],
              },
            },
          },
        ),
      },
      {
        title: "Conditionals",
        description: "Tests if/then/else, dependentRequired, and dependentSchemas.",
      },
    ),
    maps: Type.Object(
      {
        stringMap: Type.Record(Type.String(), Type.String(), {
          title: "String map",
        }),
        booleanMap: Type.Record(Type.String(), Type.Boolean(), {
          title: "Boolean map",
        }),
        patternMap: Type.Intersect([
          Type.Object(
            {},
            {
              title: "Pattern map",
              description: "Tests patternProperties for controlled dynamic keys.",
            },
          ),
          Type.Object(
            {},
            {
              patternProperties: {
                "^x-": {
                  type: "string",
                },
                "^flag-": {
                  type: "boolean",
                },
              },
            },
          ),
        ]),
      },
      {
        title: "Maps",
        description: "Tests open-ended objects and key-patterned maps.",
      },
    ),
    secrets: Type.Object(
      {
        readOnlyId: Type.String({
          title: "Read-only ID",
          readOnly: true,
        }),
        apiSecret: Type.String({
          title: "API secret",
          writeOnly: true,
        }),
        webhookSecret: Type.String({
          title: "Webhook secret",
          writeOnly: true,
        }),
        enabled: Type.Optional(
          Type.Boolean({
            title: "Enabled",
            default: true,
          }),
        ),
      },
      {
        title: "Secrets",
        description: "Tests readOnly, writeOnly, and defaulted fields together.",
      },
    ),
  },
  {
    title: "Editor Testing Matrix",
    description:
      "Low-level JSON Schema 2020-12 fixture for testing primitives, enums, arrays, objects, refs, composition, conditionals, maps, and secrets. Each top-level property is a feature bucket, not a product section.",
    $defs: {
      person: {
        type: "object",
        title: "Person",
        description: "Tests a reusable object ref with required fields and an enum.",
        required: ["name", "email"],
        properties: {
          name: {
            type: "string",
            title: "Name",
          },
          email: {
            type: "string",
            title: "Email",
            format: "email",
          },
          role: {
            type: "string",
            title: "Role",
            enum: ["editor", "designer", "reviewer", "owner"],
          },
          phone: {
            type: "string",
            title: "Phone",
          },
        },
      },
      money: {
        type: "object",
        title: "Money",
        description: "Tests a reusable object ref with numeric bounds and defaults.",
        required: ["currency", "amount"],
        properties: {
          currency: {
            type: "string",
            title: "Currency",
            enum: ["USD", "EUR", "GBP"],
            default: "USD",
          },
          amount: {
            type: "number",
            title: "Amount",
            minimum: 0,
            maximum: 100000,
            multipleOf: 0.01,
          },
        },
      },
      attachment: {
        type: "object",
        title: "Attachment",
        description: "Tests nested media objects with URI, text, and optional metadata.",
        required: ["url", "alt"],
        properties: {
          url: {
            type: "string",
            title: "URL",
            format: "uri",
          },
          alt: {
            type: "string",
            title: "Alt text",
          },
          kind: {
            type: "string",
            title: "Kind",
            enum: ["image", "file"],
          },
          caption: {
            type: "string",
            title: "Caption",
            maxLength: 140,
          },
        },
      },
      auditStamp: {
        type: "object",
        title: "Audit stamp",
        description: "Tests allOf composition with required timestamp fields.",
        required: ["createdAt", "updatedAt"],
        properties: {
          createdAt: {
            type: "string",
            title: "Created at",
            format: "date-time",
          },
          updatedAt: {
            type: "string",
            title: "Updated at",
            format: "date-time",
          },
        },
      },
      fixedPrice: {
        type: "object",
        title: "Fixed price",
        description: "Tests oneOf branches with a fixed pricing mode.",
        required: ["mode", "price"],
        properties: {
          mode: {
            const: "fixed",
            title: "Mode",
          },
          price: {
            $ref: "#/$defs/money",
          },
          salePrice: {
            $ref: "#/$defs/money",
          },
        },
      },
      tieredPrice: {
        type: "object",
        title: "Tiered price",
        description: "Tests oneOf branches with nested arrays of objects.",
        required: ["mode", "tiers"],
        properties: {
          mode: {
            const: "tiered",
            title: "Mode",
          },
          tiers: {
            type: "array",
            title: "Tiers",
            minItems: 1,
            items: {
              type: "object",
              required: ["minimum", "price"],
              properties: {
                minimum: {
                  type: "integer",
                  title: "Minimum quantity",
                  minimum: 1,
                },
                price: {
                  $ref: "#/$defs/money",
                },
              },
            },
          },
        },
      },
    },
    default: {
      primitives: {
        shortText: "alpha",
        titledScalar: "has title",
        describedScalar: "generates property name by normalizing",
        describedRange: 0,
        slug: "alpha-beta",
        email: "alpha@example.com",
        website: "https://example.com",
        favoriteColor: "#ff4d6d",
        launchAt: "2026-06-01T09:30:00-05:00",
        score: 42.5,
        count: 3,
        optionalRange: 6,
        enabled: false,
        nullableNote: null,
      },
      enums: {
        status: "draft",
        kind: "test-case",
        mode: "manual",
      },
      arrays: {
        tags: ["one", "two"],
        tuple: ["primary", 2, true],
        attachments: [
          {
            url: "https://example.com/assets/a.png",
            alt: "Attachment A",
            kind: "image",
          },
        ],
      },
      objects: {
        closedRecord: {
          id: "rec_001",
          label: "Closed record",
          active: true,
        },
        nestedRecord: {
          owner: {
            name: "Avery Stone",
            email: "avery@example.com",
            role: "owner",
          },
          attachment: {
            url: "https://example.com/assets/b.png",
            alt: "Attachment B",
            kind: "file",
          },
        },
      },
      refs: {
        personRef: {
          name: "Jordan Lee",
          email: "jordan@example.com",
          role: "reviewer",
        },
        moneyRef: {
          currency: "USD",
          amount: 12.5,
        },
        attachmentRef: {
          url: "https://example.com/assets/c.png",
          alt: "Attachment C",
          kind: "image",
        },
      },
      composition: {
        identity: {
          name: "Casey Park",
          email: "casey@example.com",
          role: "editor",
          createdAt: "2026-05-14T10:00:00-05:00",
          updatedAt: "2026-05-14T10:15:00-05:00",
        },
        contactChoice: "contact@example.com",
        pricingStrategy: {
          mode: "fixed",
          price: {
            currency: "USD",
            amount: 99,
          },
        },
        deliveryConfig: {
          kind: "webhook",
          url: "https://hooks.example.com/events",
        },
      },
      conditionals: {
        schedule: {
          mode: "scheduled",
          publishAt: "2026-06-15T09:30:00-05:00",
          timezone: "America/Chicago",
        },
        approvalRules: {
          approvalRequired: true,
          approvers: [
            {
              name: "Avery Stone",
              email: "avery@example.com",
              role: "owner",
            },
          ],
        },
        ssoConfig: {
          provider: "saml",
          issuerUrl: "https://idp.example.com/metadata",
          clientId: "editor-client",
          clientSecret: "editor-secret",
        },
      },
      maps: {
        stringMap: {
          alpha: "one",
          beta: "two",
        },
        booleanMap: {
          featureA: true,
          featureB: false,
        },
        patternMap: {
          "x-test": "value",
          "flag-ready": true,
        },
      },
      secrets: {
        readOnlyId: "sec_001",
        apiSecret: "api-secret-value",
        webhookSecret: "webhook-secret-value",
        enabled: true,
      },
    },
  },
);
