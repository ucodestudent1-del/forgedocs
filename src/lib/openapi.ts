import { z } from "zod"
import { formatRegistry } from "@/lib/conversion"
import { conversionJobSchema } from "@/lib/conversion"

/* ============================================================================
   OpenAPI 3.0 Schema Generator
   Generates OpenAPI spec from Zod schemas and route definitions
   ============================================================================ */

interface OpenApiSchema {
  type: string
  format?: string
  enum?: string[]
  items?: OpenApiSchema
  properties?: Record<string, OpenApiSchema>
  required?: string[]
  description?: string
  example?: unknown
  nullable?: boolean
  anyOf?: OpenApiSchema[]
}

interface OpenApiParameter {
  name: string
  in: "query" | "header" | "path" | "cookie"
  required?: boolean
  schema: OpenApiSchema
  description?: string
}

interface OpenApiResponse {
  description: string
  content?: Record<string, { schema: OpenApiSchema }>
  headers?: Record<string, { schema: OpenApiSchema }>
}

interface OpenApiOperation {
  summary?: string
  description?: string
  operationId?: string
  tags?: string[]
  parameters?: OpenApiParameter[]
  requestBody?: {
    content: Record<string, { schema: OpenApiSchema }>
    required?: boolean
  }
  responses: Record<string, OpenApiResponse>
  security?: Record<string, string[]>[]
}

interface OpenApiPath {
  [method: string]: OpenApiOperation
}

interface OpenApiSpec {
  openapi: "3.0.0"
  info: {
    title: string
    version: string
    description?: string
  }
  servers: { url: string; description?: string }[]
  components: {
    schemas: Record<string, OpenApiSchema>
    securitySchemes: Record<string, { type: string; scheme?: string; bearerFormat?: string }>
  }
  paths: Record<string, OpenApiPath>
  security: Record<string, string[]>[]
}

/**
 * Convert Zod schema to OpenAPI schema
 */
function zodToOpenApi(schema: z.ZodTypeAny, schemas: Record<string, OpenApiSchema> = {}): OpenApiSchema {
  // Zod v4 uses constructor name for type identification
  const typeName = schema.constructor.name

  switch (typeName) {
    case "ZodString": {
      const def = schema._def as any
      const s: OpenApiSchema = { type: "string" }
      // Zod v4 checks structure varies - skip detailed check parsing for now
      return s
    }
    case "ZodNumber": {
      const def = schema._def as any
      const s: OpenApiSchema = { type: "number" }
      // Zod v4 checks structure varies - skip detailed check parsing for now
      return s
    }
    case "ZodBoolean":
      return { type: "boolean" }
    case "ZodArray": {
      const def = schema._def as any
      // In Zod v4, def.type might be a string or ZodType
      const items = typeof def.type === "string" ? { type: "string" } : zodToOpenApi(def.type as z.ZodTypeAny, schemas)
      return { type: "array", items }
    }
    case "ZodObject": {
      const def = schema._def as any
      // In Zod v4, shape might be a property or method
      const shape = typeof def.shape === "function" ? def.shape() : def.shape
      const properties: Record<string, OpenApiSchema> = {}
      const required: string[] = []
      
      if (shape) {
        for (const [key, value] of Object.entries(shape)) {
          properties[key] = zodToOpenApi(value as z.ZodTypeAny, schemas)
          if (!(value as z.ZodTypeAny).isOptional()) {
            required.push(key)
          }
        }
      }
      
      return { type: "object", properties, required: required.length > 0 ? required : undefined }
    }
    case "ZodOptional": {
      const def = schema._def as any
      return zodToOpenApi(def.innerType, schemas)
    }
    case "ZodNullable": {
      const def = schema._def as any
      const inner = zodToOpenApi(def.innerType, schemas)
      return { ...inner, nullable: true }
    }
    case "ZodDefault": {
      const def = schema._def as any
      const inner = zodToOpenApi(def.innerType, schemas)
      if (def.defaultValue !== undefined) {
        inner.example = def.defaultValue()
      }
      return inner
    }
    case "ZodUnion": {
      const def = schema._def as any
      return { anyOf: def.options.map((opt: z.ZodTypeAny) => zodToOpenApi(opt, schemas)) }
    }
    case "ZodEnum": {
      const def = schema._def as any
      return { type: "string", enum: def.values }
    }
    case "ZodNativeEnum": {
      const def = schema._def as any
      return { type: "string", enum: Object.values(def.enum) }
    }
    case "ZodRecord": {
      const def = schema._def as any
      return {
        type: "object",
        additionalProperties: zodToOpenApi(def.valueType, schemas),
      }
    }
    case "ZodUnknown":
    case "ZodAny":
      return {}
    default:
      return {}
  }
}

/**
 * Generate OpenAPI spec from route definitions
 */
export function generateOpenApiSpec(): OpenApiSpec {
  const schemas: Record<string, OpenApiSchema> = {}
  
  // Register conversion job schema
  const jobSchema = zodToOpenApi(conversionJobSchema, schemas)
  schemas["ConversionJob"] = jobSchema

  // Register format schemas
  const formats = formatRegistry.getAllFormats()
  schemas["ConversionFormat"] = {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      mimeType: { type: "string" },
      extension: { type: "string" },
      category: { type: "string", enum: ["document", "image", "spreadsheet", "presentation", "text", "unit", "metadata"] },
    },
    required: ["id", "name", "mimeType", "extension", "category"],
  }

  // API paths
  const paths: Record<string, OpenApiPath> = {
    "/api/conversion": {
      GET: {
        summary: "List conversion jobs or get available formats",
        description: "Returns paginated list of user's conversion jobs, or available formats/pairs if requested",
        operationId: "listConversions",
        tags: ["Conversion"],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Page number",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            description: "Items per page",
          },
          {
            name: "formats",
            in: "query",
            schema: { type: "boolean" },
            description: "If true, return all supported formats and conversion pairs",
          },
          {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["document", "unit", "metadata"] },
            description: "Filter by conversion type",
          },
          {
            name: "unit-categories",
            in: "query",
            schema: { type: "boolean" },
            description: "If true, return all unit categories",
          },
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
            description: "Filter unit pairs by category",
          },
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jobs: { type: "array", items: { $ref: "#/components/schemas/ConversionJob" } },
                    count: { type: "integer" },
                    page: { type: "integer" },
                    limit: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      },
      POST: {
        summary: "Create a new conversion job or perform synchronous conversion",
        description: "Creates a document conversion job, or performs unit/metadata conversion synchronously",
        operationId: "createConversion",
        tags: ["Conversion"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: jobSchema,
            },
          },
        },
        responses: {
          "201": {
            description: "Job created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    job: { $ref: "#/components/schemas/ConversionJob" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      },
    },
    "/api/conversion/{jobId}": {
      GET: {
        summary: "Get conversion job status",
        operationId: "getConversionJob",
        tags: ["Conversion"],
        parameters: [
          {
            name: "jobId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Job details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConversionJob" },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
        security: [{ bearerAuth: [] }],
      },
      DELETE: {
        summary: "Cancel a pending conversion job",
        operationId: "cancelConversionJob",
        tags: ["Conversion"],
        parameters: [
          {
            name: "jobId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "204": { description: "Job cancelled" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    "/api/documents": {
      GET: {
        summary: "List user documents",
        operationId: "listDocuments",
        tags: ["Documents"],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Paginated document list" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
        security: [{ bearerAuth: [] }],
      },
      POST: {
        summary: "Upload a new document",
        operationId: "uploadDocument",
        tags: ["Documents"],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                  folderId: { type: "string", format: "uuid" },
                },
                required: ["file"],
              },
            },
          },
        },
        responses: {
          "201": { description: "Document uploaded" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "413": { $ref: "#/components/responses/PayloadTooLarge" },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    "/api/templates": {
      GET: {
        summary: "List templates",
        operationId: "listTemplates",
        tags: ["Templates"],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "is_favorite", in: "query", schema: { type: "boolean" } },
          { name: "is_system", in: "query", schema: { type: "boolean" } },
        ],
        responses: {
          "200": { description: "Paginated template list" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      },
      POST: {
        summary: "Create a new template",
        operationId: "createTemplate",
        tags: ["Templates"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string", nullable: true },
                  category: { type: "string", nullable: true },
                  content: { type: "string" },
                  placeholder_schema: { type: "array", items: { type: "object" } },
                  preview_url: { type: "string", nullable: true },
                  tags: { type: "array", items: { type: "string" } },
                  is_public: { type: "boolean" },
                  is_favorite: { type: "boolean" },
                },
                required: ["name", "content"],
              },
            },
          },
        },
        responses: {
          "201": { description: "Template created" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    "/api/webhooks": {
      GET: {
        summary: "List webhook endpoints",
        operationId: "listWebhooks",
        tags: ["Webhooks"],
        responses: {
          "200": { description: "List of webhook endpoints" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
        security: [{ bearerAuth: [] }],
      },
      POST: {
        summary: "Create a webhook endpoint",
        operationId: "createWebhook",
        tags: ["Webhooks"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  url: { type: "string", format: "uri" },
                  events: { type: "array", items: { type: "string" } },
                  is_active: { type: "boolean" },
                },
                required: ["url", "events"],
              },
            },
          },
        },
        responses: {
          "201": { description: "Webhook created" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    "/api/auth/login": {
      POST: {
        summary: "User login",
        operationId: "login",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Login successful" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/auth/signup": {
      POST: {
        summary: "User registration",
        operationId: "signup",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  name: { type: "string" },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          "201": { description: "Account created" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "409": { $ref: "#/components/responses/Conflict" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/ai/chat": {
      POST: {
        summary: "AI chat completion",
        operationId: "aiChat",
        tags: ["AI"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  messages: { type: "array", items: { type: "object" } },
                  model: { type: "string" },
                  temperature: { type: "number" },
                },
                required: ["messages"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Chat response" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      },
    },
  }

  return {
    openapi: "3.0.0",
    info: {
      title: "ForgeDocs API",
      version: "1.0.0",
      description: "Document conversion, generation, and management API",
    },
    servers: [
      { url: "https://api.forgedocs.com", description: "Production server" },
      { url: "http://localhost:3000", description: "Development server" },
    ],
    components: {
      schemas,
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        apiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
        },
      },
      responses: {
        BadRequest: {
          description: "Bad request",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string" },
                  code: { type: "string" },
                  request_id: { type: "string" },
                  timestamp: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        Unauthorized: {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Forbidden: {
          description: "Forbidden",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        NotFound: {
          description: "Not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        RateLimited: {
          description: "Rate limited",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
          headers: {
            "X-RateLimit-Limit": { schema: { type: "integer" } },
            "X-RateLimit-Remaining": { schema: { type: "integer" } },
            "X-RateLimit-Reset": { schema: { type: "integer" } },
          },
        },
        Conflict: {
          description: "Conflict",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        PayloadTooLarge: {
          description: "Payload too large",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                request_id: { type: "string" },
                timestamp: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },
    paths,
    security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  }
}

/**
 * Generate OpenAPI spec as JSON string
 */
export function generateOpenApiJson(): string {
  const spec = generateOpenApiSpec()
  return JSON.stringify(spec, null, 2)
}

/**
 * Generate OpenAPI spec as YAML string (requires yaml package)
 */
export async function generateOpenApiYaml(): Promise<string> {
  const spec = generateOpenApiSpec()
  const { default: yaml } = await import("yaml")
  return yaml.stringify(spec)
}