import { Type } from "typebox";
import type { TSchema } from "../index.js";

export const schema = Type.Object(
  {
    product: Type.Object(
      {
        name: Type.String({
          title: "Name",
        }),
        slug: Type.String({
          title: "Slug",
        }),
        brand: Type.Optional(
          Type.String({
            title: "Brand",
          }),
        ),
        category: Type.Unknown({
          $ref: "#/$defs/category",
        }),
        shortDescription: Type.Optional(
          Type.String({
            title: "Short description",
            maxLength: 280,
          }),
        ),
        longDescription: Type.Optional(
          Type.String({
            title: "Long description",
          }),
        ),
        tags: Type.Optional(
          Type.Array(Type.String(), {
            title: "Tags",
          }),
        ),
        primaryImage: Type.Unknown({
          $ref: "#/$defs/image",
        }),
        gallery: Type.Optional(
          Type.Array(
            Type.Unknown({
              $ref: "#/$defs/image",
            }),
            {
              title: "Gallery",
            },
          ),
        ),
        features: Type.Optional(
          Type.Array(Type.String(), {
            title: "Features",
          }),
        ),
      },
      {
        title: "Product",
        default: {
          name: "Velvet Serum",
          slug: "velvet-serum",
          brand: "Northstar Beauty",
          category: "beauty",
          shortDescription: "A lightweight daily serum with hydration and glow.",
          longDescription:
            "This serum layers under moisturizer and makeup, with a fast-absorbing finish and a fragrance-free formula.",
          tags: ["hydrating", "fragrance-free", "daily-care"],
          primaryImage: {
            url: "https://example.com/images/velvet-serum-hero.jpg",
            alt: "Bottle of Velvet Serum on a stone surface",
            caption: "Hero image",
          },
          gallery: [
            {
              url: "https://example.com/images/velvet-serum-1.jpg",
              alt: "Velvet Serum front view",
            },
            {
              url: "https://example.com/images/velvet-serum-2.jpg",
              alt: "Velvet Serum texture swatch",
            },
            {
              url: "https://example.com/images/velvet-serum-3.jpg",
              alt: "Velvet Serum in packaging",
            },
          ],
          features: ["Fast absorbing", "Fragrance free", "Suitable for daily use"],
        },
      },
    ),
    pricing: Type.Union(
      [
        Type.Object(
          {
            mode: Type.Literal("fixed", {
              title: "Mode",
            }),
            listPrice: Type.Unknown({
              $ref: "#/$defs/money",
            }),
            salePrice: Type.Optional(
              Type.Unknown({
                $ref: "#/$defs/money",
              }),
            ),
            compareAt: Type.Optional(
              Type.Unknown({
                $ref: "#/$defs/money",
              }),
            ),
          },
          {
            title: "Fixed",
          },
        ),
        Type.Object(
          {
            mode: Type.Literal("tiered", {
              title: "Mode",
            }),
            tiers: Type.Array(Type.Unknown(), {
              title: "Tiers",
            }),
          },
          {
            title: "Tiered",
          },
        ),
        Type.Object(
          {
            mode: Type.Literal("subscription", {
              title: "Mode",
            }),
            cadence: Type.Union(
              [Type.Literal("monthly"), Type.Literal("quarterly"), Type.Literal("yearly")],
              {
                type: "string",
                title: "Cadence",
              },
            ),
            amount: Type.Unknown({
              $ref: "#/$defs/money",
            }),
            trialDays: Type.Optional(
              Type.Number({
                title: "Trial days",
                minimum: 0,
              }),
            ),
          },
          {
            title: "Subscription",
          },
        ),
      ],
      {
        title: "Pricing strategy",
        default: {
          mode: "fixed",
          listPrice: {
            currency: "USD",
            amount: 34,
          },
          salePrice: {
            currency: "USD",
            amount: 28,
          },
          compareAt: {
            currency: "USD",
            amount: 36,
          },
        },
      },
    ),
    inventory: Type.Object(
      {
        sku: Type.String({
          title: "Internal SKU",
        }),
        trackStock: Type.Boolean({
          title: "Track stock",
          default: true,
        }),
        safetyStock: Type.Optional(
          Type.Number({
            title: "Safety stock",
            minimum: 0,
          }),
        ),
        backorderPolicy: Type.Optional(
          Type.Union([Type.Literal("deny"), Type.Literal("allow"), Type.Literal("notify")], {
            type: "string",
            title: "Backorder policy",
          }),
        ),
        allowOversell: Type.Optional(
          Type.Boolean({
            title: "Allow oversell",
            default: false,
          }),
        ),
        warehouses: Type.Array(
          Type.Unknown({
            $ref: "#/$defs/warehouse",
          }),
          {
            title: "Warehouses",
          },
        ),
        bundleComponents: Type.Optional(
          Type.Array(
            Type.Object({
              sku: Type.String({
                title: "Component SKU",
              }),
              quantity: Type.Number({
                title: "Quantity",
                minimum: 1,
              }),
            }),
            {
              title: "Bundle components",
            },
          ),
        ),
      },
      {
        title: "Inventory",
        default: {
          sku: "VLS-001",
          trackStock: true,
          safetyStock: 24,
          backorderPolicy: "notify",
          allowOversell: false,
          warehouses: [
            {
              name: "Chicago Fulfillment",
              location: {
                name: "Northstar Beauty",
                line1: "1200 W Lake St",
                city: "Chicago",
                region: "IL",
                postalCode: "60607",
                country: "US",
              },
              priority: 1,
              active: true,
            },
            {
              name: "Dallas Overflow",
              location: {
                name: "Northstar Beauty",
                line1: "800 S Pearl Expy",
                city: "Dallas",
                region: "TX",
                postalCode: "75201",
                country: "US",
              },
              priority: 2,
              active: true,
            },
          ],
          bundleComponents: [
            {
              sku: "VLS-001-BASE",
              quantity: 1,
            },
            {
              sku: "VLS-001-BOX",
              quantity: 1,
            },
          ],
        },
      },
    ),
    fulfillment: Type.Object(
      {
        shippingRequired: Type.Boolean({
          title: "Shipping required",
          default: true,
        }),
        packageWeight: Type.Optional(
          Type.Number({
            title: "Package weight",
            minimum: 0,
          }),
        ),
        packageDimensions: Type.Optional(
          Type.Object(
            {
              width: Type.Optional(
                Type.Number({
                  title: "Width",
                  minimum: 0,
                }),
              ),
              height: Type.Optional(
                Type.Number({
                  title: "Height",
                  minimum: 0,
                }),
              ),
              depth: Type.Optional(
                Type.Number({
                  title: "Depth",
                  minimum: 0,
                }),
              ),
            },
            {
              title: "Package dimensions",
            },
          ),
        ),
        originAddress: Type.Unknown({
          $ref: "#/$defs/address",
        }),
        carriers: Type.Optional(
          Type.Array(
            Type.Union(
              [
                Type.Literal("ups"),
                Type.Literal("fedex"),
                Type.Literal("usps"),
                Type.Literal("dhl"),
              ],
              {
                type: "string",
              },
            ),
            {
              title: "Carriers",
            },
          ),
        ),
        international: Type.Optional(
          Type.Object(
            {
              enabled: Type.Optional(
                Type.Boolean({
                  title: "Enabled",
                  default: false,
                }),
              ),
              regions: Type.Optional(
                Type.Array(
                  Type.Union(
                    [
                      Type.Literal("north-america"),
                      Type.Literal("europe"),
                      Type.Literal("asia-pacific"),
                      Type.Literal("latin-america"),
                    ],
                    {
                      type: "string",
                    },
                  ),
                  {
                    title: "Regions",
                  },
                ),
              ),
              customsDeclaration: Type.Optional(
                Type.String({
                  title: "Customs declaration",
                }),
              ),
            },
            {
              title: "International shipping",
              if: {
                properties: {
                  enabled: {
                    const: true,
                  },
                },
                required: ["enabled"],
              },
              then: {
                required: ["regions"],
              },
            },
          ),
        ),
      },
      {
        title: "Fulfillment",
        default: {
          shippingRequired: true,
          packageWeight: 0.42,
          packageDimensions: {
            width: 4.2,
            height: 12.1,
            depth: 4.2,
          },
          originAddress: {
            name: "Northstar Beauty",
            line1: "1200 W Lake St",
            city: "Chicago",
            region: "IL",
            postalCode: "60607",
            country: "US",
          },
          carriers: ["ups", "usps"],
          international: {
            enabled: true,
            regions: ["north-america", "europe"],
            customsDeclaration: "Cosmetic serum, non-hazardous, retail packaging.",
          },
        },
      },
    ),
    marketing: Type.Object(
      {
        seo: Type.Unknown({
          $ref: "#/$defs/seo",
        }),
        launchDate: Type.String({
          title: "Launch date",
          format: "date",
        }),
        campaignBudget: Type.Unknown({
          $ref: "#/$defs/money",
        }),
        channels: Type.Optional(
          Type.Array(
            Type.Object({
              channelType: Type.Union(
                [
                  Type.Literal("email"),
                  Type.Literal("social"),
                  Type.Literal("search"),
                  Type.Literal("affiliate"),
                ],
                {
                  title: "Type",
                },
              ),
              active: Type.Boolean({
                title: "Active",
                default: true,
              }),
              notes: Type.Optional(
                Type.String({
                  title: "Notes",
                }),
              ),
            }),
            {
              title: "Channels",
            },
          ),
        ),
        testimonials: Type.Optional(
          Type.Array(
            Type.Unknown({
              $ref: "#/$defs/testimonial",
            }),
            {
              title: "Testimonials",
            },
          ),
        ),
      },
      {
        title: "Marketing",
        default: {
          seo: {
            slug: "velvet-serum",
            title: "Velvet Serum | Hydrating Daily Glow",
            description: "A fragrance-free hydrating serum designed for daily use.",
            keywords: ["serum", "hydration", "skincare", "fragrance-free"],
          },
          launchDate: "2026-06-01",
          campaignBudget: {
            currency: "USD",
            amount: 15000,
          },
          channels: [
            {
              channelType: "email",
              active: true,
              notes: "Launch announcement and abandoned cart sequence.",
            },
            {
              channelType: "social",
              active: true,
              notes: "Short-form product demo clips.",
            },
            {
              channelType: "search",
              active: true,
              notes: "Brand and competitor conquest terms.",
            },
          ],
          testimonials: [
            {
              quote: "It leaves my skin looking fresh without feeling heavy.",
              author: "Maya",
              role: "Customer",
            },
            {
              quote: "Easy to merchandize and simple for the team to explain.",
              author: "Jordan",
              role: "Retail buyer",
            },
          ],
        },
      },
    ),
    compliance: Type.Object(
      {
        ageRestricted: Type.Boolean({
          title: "Age restricted",
          default: false,
        }),
        certifications: Type.Optional(
          Type.Array(
            Type.Union(
              [
                Type.Literal("cpsia"),
                Type.Literal("organic"),
                Type.Literal("fair-trade"),
                Type.Literal("energy-star"),
                Type.Literal("ce"),
              ],
              {
                type: "string",
              },
            ),
            {
              title: "Certifications",
            },
          ),
        ),
        regulatedGoods: Type.Boolean({
          title: "Regulated goods",
          default: false,
        }),
        hazardClass: Type.Optional(
          Type.String({
            title: "Hazard class",
          }),
        ),
        contact: Type.Optional(
          Type.String({
            title: "Compliance contact",
          }),
        ),
      },
      {
        title: "Compliance",
        if: {
          properties: {
            regulatedGoods: {
              const: true,
            },
          },
          required: ["regulatedGoods"],
        },
        then: {
          required: ["hazardClass", "contact"],
        },
        default: {
          ageRestricted: false,
          certifications: ["organic", "ce"],
          regulatedGoods: false,
        },
      },
    ),
    analytics: Type.Optional(
      Type.Object(
        {
          enabled: Type.Optional(
            Type.Boolean({
              title: "Enabled",
              default: true,
            }),
          ),
          pixelIds: Type.Optional(
            Type.Array(Type.String(), {
              title: "Pixel IDs",
            }),
          ),
          events: Type.Optional(
            Type.Array(
              Type.Object({
                name: Type.String({
                  title: "Name",
                }),
                enabled: Type.Boolean({
                  title: "Enabled",
                  default: true,
                }),
                sampleRate: Type.Optional(
                  Type.Number({
                    title: "Sample rate",
                    minimum: 0,
                    maximum: 1,
                  }),
                ),
              }),
              {
                title: "Events",
              },
            ),
          ),
        },
        {
          title: "Analytics",
          default: {
            enabled: true,
            pixelIds: ["PIX-12345", "PIX-67890"],
            events: [
              {
                name: "view_item",
                enabled: true,
                sampleRate: 1,
              },
              {
                name: "add_to_cart",
                enabled: true,
                sampleRate: 0.85,
              },
              {
                name: "purchase",
                enabled: true,
                sampleRate: 1,
              },
            ],
          },
        },
      ),
    ),
    support: Type.Optional(
      Type.Object(
        {
          contactEmail: Type.Optional(
            Type.String({
              title: "Contact email",
            }),
          ),
          phone: Type.Optional(
            Type.String({
              title: "Phone",
            }),
          ),
          faq: Type.Optional(
            Type.Array(
              Type.Unknown({
                $ref: "#/$defs/faqItem",
              }),
              {
                title: "FAQ",
              },
            ),
          ),
        },
        {
          title: "Support",
          default: {
            contactEmail: "support@example.com",
            phone: "+1-800-555-0182",
            faq: [
              {
                question: "How often should the serum be used?",
                answer: "Use once or twice daily after cleansing.",
              },
              {
                question: "Is it fragrance free?",
                answer: "Yes, the formula is fragrance free.",
              },
            ],
          },
        },
      ),
    ),
    metadata: Type.Optional(
      Type.Record(Type.String(), Type.String(), {
        title: "Metadata",
        description: "Additional keys stay editable with local schema only.",
        default: {
          season: "spring",
          launchOwner: "marketing",
          region: "NA",
        },
      }),
    ),
  },
  {
    title: "Marketplace Listing Builder",
    description:
      "A larger JSON Schema 2020-12 demo with refs, nested objects, arrays, unions, conditionals, and additional properties.",
    $defs: {
      category: {
        type: "string",
        title: "Category",
        enum: ["beauty", "fashion", "home", "wellness", "electronics", "grocery"],
      },
      money: {
        type: "object",
        title: "Money",
        required: ["currency", "amount"],
        properties: {
          currency: {
            type: "string",
            enum: ["USD", "EUR", "GBP"],
            default: "USD",
          },
          amount: {
            type: "number",
            minimum: 0,
          },
        },
      },
      address: {
        type: "object",
        title: "Address",
        required: ["name", "line1", "city", "region", "postalCode", "country"],
        properties: {
          name: {
            type: "string",
            title: "Recipient",
          },
          line1: {
            type: "string",
            title: "Street line 1",
          },
          line2: {
            type: "string",
            title: "Street line 2",
          },
          city: {
            type: "string",
            title: "City",
          },
          region: {
            type: "string",
            title: "State / Region",
          },
          postalCode: {
            type: "string",
            title: "Postal code",
          },
          country: {
            type: "string",
            title: "Country",
            default: "US",
          },
        },
      },
      image: {
        type: "object",
        title: "Image",
        required: ["url", "alt"],
        properties: {
          url: {
            type: "string",
            title: "Image URL",
          },
          alt: {
            type: "string",
            title: "Alt text",
          },
          caption: {
            type: "string",
            title: "Caption",
          },
        },
      },
      seo: {
        type: "object",
        title: "SEO",
        required: ["slug", "title", "description"],
        properties: {
          slug: {
            type: "string",
            title: "Slug",
          },
          title: {
            type: "string",
            title: "Meta title",
          },
          description: {
            type: "string",
            title: "Meta description",
            maxLength: 180,
          },
          keywords: {
            type: "array",
            title: "Keywords",
            items: {
              type: "string",
            },
          },
        },
      },
      warehouse: {
        type: "object",
        title: "Warehouse",
        required: ["name", "location", "priority"],
        properties: {
          name: {
            type: "string",
            title: "Warehouse name",
          },
          location: {
            $ref: "#/$defs/address",
          },
          priority: {
            type: "number",
            title: "Priority",
            minimum: 1,
            maximum: 10,
          },
          active: {
            type: "boolean",
            title: "Active",
            default: true,
          },
        },
      },
      testimonial: {
        type: "object",
        title: "Testimonial",
        required: ["quote", "author", "role"],
        properties: {
          quote: {
            type: "string",
            title: "Quote",
          },
          author: {
            type: "string",
            title: "Author",
          },
          role: {
            type: "string",
            title: "Role",
          },
        },
      },
      variant: {
        type: "object",
        title: "Variant",
        required: ["sku", "label", "price"],
        properties: {
          sku: {
            type: "string",
            title: "SKU",
          },
          label: {
            type: "string",
            title: "Label",
          },
          price: {
            $ref: "#/$defs/money",
          },
          barcode: {
            type: "string",
            title: "Barcode",
          },
          attributes: {
            type: "object",
            title: "Attributes",
            additionalProperties: {
              type: "string",
            },
          },
        },
      },
      faqItem: {
        type: "object",
        title: "FAQ item",
        required: ["question", "answer"],
        properties: {
          question: {
            type: "string",
            title: "Question",
          },
          answer: {
            type: "string",
            title: "Answer",
          },
        },
      },
    },
  },
) as unknown as TSchema;
