/**
 * GraphQL Schema Tree Builder
 *
 * Converts introspection data into a rich, deeply nested tree structure
 * similar to how GraphQL Playground displays schema exploration.
 */

import {
  buildClientSchema,
  printSchema,
  type IntrospectionQuery,
} from "graphql";

// ============================================================================
// TYPES - Rich Tree Structure
// ============================================================================

export interface SchemaFieldArg {
  name: string;
  type: string;
  typeDetails: TypeDetails;
  description?: string;
  defaultValue?: string;
  isRequired: boolean;
}

export interface TypeDetails {
  name: string;
  kind:
    | "SCALAR"
    | "OBJECT"
    | "INTERFACE"
    | "UNION"
    | "ENUM"
    | "INPUT_OBJECT"
    | "LIST"
    | "NON_NULL";
  ofType?: TypeDetails;
  isNonNull: boolean;
  isList: boolean;
  baseType: string; // The innermost type name (e.g., "String" from "[String!]!")
}

export interface SchemaField {
  name: string;
  description?: string;
  type: string; // Human readable type string like "[User!]!"
  typeDetails: TypeDetails;
  args: SchemaFieldArg[];
  isDeprecated: boolean;
  deprecationReason?: string;
  // Nested fields if this returns an object type
  nestedFields?: SchemaField[];
  // Possible types for unions/interfaces
  possibleTypes?: string[];
}

export interface SchemaType {
  name: string;
  kind: "SCALAR" | "OBJECT" | "INTERFACE" | "UNION" | "ENUM" | "INPUT_OBJECT";
  description?: string;
  fields?: SchemaField[];
  inputFields?: SchemaFieldArg[];
  enumValues?: Array<{
    name: string;
    description?: string;
    isDeprecated: boolean;
    deprecationReason?: string;
  }>;
  interfaces?: string[];
  possibleTypes?: string[];
}

export interface SchemaOperation {
  name: string;
  description?: string;
  args: SchemaFieldArg[];
  returnType: string;
  returnTypeDetails: TypeDetails;
  // Deeply nested return type structure
  nestedFields?: SchemaField[];
}

export interface SchemaDirective {
  name: string;
  description?: string;
  locations: string[];
  args: SchemaFieldArg[];
  isRepeatable?: boolean;
}

export interface RichSchemaTree {
  // Meta information
  meta: {
    endpoint?: string;
    capturedAt: string;
    totalTypes: number;
    totalOperations: {
      queries: number;
      mutations: number;
      subscriptions: number;
    };
  };

  // Root operations - deeply nested
  queries: SchemaOperation[];
  mutations: SchemaOperation[];
  subscriptions: SchemaOperation[];

  // All types organized by kind
  types: {
    objects: SchemaType[];
    interfaces: SchemaType[];
    unions: SchemaType[];
    enums: SchemaType[];
    inputObjects: SchemaType[];
    scalars: SchemaType[];
  };

  // Directives
  directives: SchemaDirective[];

  // Raw SDL for reference
  sdl: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse a GraphQL type reference into TypeDetails
 */
function parseTypeRef(typeRef: any): TypeDetails {
  if (!typeRef) {
    return {
      name: "Unknown",
      kind: "SCALAR",
      isNonNull: false,
      isList: false,
      baseType: "Unknown",
    };
  }

  if (typeRef.kind === "NON_NULL") {
    const inner = parseTypeRef(typeRef.ofType);
    return {
      ...inner,
      isNonNull: true,
      ofType: inner,
    };
  }

  if (typeRef.kind === "LIST") {
    const inner = parseTypeRef(typeRef.ofType);
    return {
      name: `[${inner.name}]`,
      kind: "LIST",
      ofType: inner,
      isNonNull: false,
      isList: true,
      baseType: inner.baseType,
    };
  }

  return {
    name: typeRef.name || "Unknown",
    kind: typeRef.kind || "SCALAR",
    isNonNull: false,
    isList: false,
    baseType: typeRef.name || "Unknown",
  };
}

/**
 * Convert type reference to human-readable string like "[User!]!"
 */
function typeToString(typeRef: any): string {
  if (!typeRef) return "Unknown";

  if (typeRef.kind === "NON_NULL") {
    return `${typeToString(typeRef.ofType)}!`;
  }

  if (typeRef.kind === "LIST") {
    return `[${typeToString(typeRef.ofType)}]`;
  }

  return typeRef.name || "Unknown";
}

/**
 * Parse field arguments
 */
function parseArgs(args: any[]): SchemaFieldArg[] {
  if (!args) return [];

  return args.map((arg) => ({
    name: arg.name,
    type: typeToString(arg.type),
    typeDetails: parseTypeRef(arg.type),
    description: arg.description || undefined,
    defaultValue: arg.defaultValue || undefined,
    isRequired: arg.type?.kind === "NON_NULL",
  }));
}

/**
 * Build nested fields for object types (up to a certain depth to avoid cycles)
 */
function buildNestedFields(
  typeName: string,
  allTypes: Map<string, any>,
  visitedTypes: Set<string> = new Set(),
  maxDepth: number = 3,
  currentDepth: number = 0
): SchemaField[] | undefined {
  if (currentDepth >= maxDepth) return undefined;
  if (visitedTypes.has(typeName)) return undefined;

  const type = allTypes.get(typeName);
  if (!type || !type.fields) return undefined;

  const newVisited = new Set(visitedTypes);
  newVisited.add(typeName);

  return type.fields.map((field: any): SchemaField => {
    const typeDetails = parseTypeRef(field.type);
    const baseTypeName = typeDetails.baseType;
    const baseType = allTypes.get(baseTypeName);

    let nestedFields: SchemaField[] | undefined;
    let possibleTypes: string[] | undefined;

    // Get nested fields for object types
    if (
      baseType &&
      (baseType.kind === "OBJECT" || baseType.kind === "INTERFACE")
    ) {
      nestedFields = buildNestedFields(
        baseTypeName,
        allTypes,
        newVisited,
        maxDepth,
        currentDepth + 1
      );
    }

    // Get possible types for unions and interfaces
    if (
      baseType &&
      (baseType.kind === "UNION" || baseType.kind === "INTERFACE")
    ) {
      possibleTypes = baseType.possibleTypes?.map((t: any) => t.name) || [];
    }

    return {
      name: field.name,
      description: field.description || undefined,
      type: typeToString(field.type),
      typeDetails,
      args: parseArgs(field.args),
      isDeprecated: field.isDeprecated || false,
      deprecationReason: field.deprecationReason || undefined,
      nestedFields,
      possibleTypes,
    };
  });
}

/**
 * Build a schema operation (query/mutation/subscription) with deep nesting
 */
function buildOperation(
  field: any,
  allTypes: Map<string, any>
): SchemaOperation {
  const typeDetails = parseTypeRef(field.type);
  const baseTypeName = typeDetails.baseType;

  return {
    name: field.name,
    description: field.description || undefined,
    args: parseArgs(field.args),
    returnType: typeToString(field.type),
    returnTypeDetails: typeDetails,
    nestedFields: buildNestedFields(baseTypeName, allTypes, new Set(), 4, 0),
  };
}

/**
 * Build a schema type with fields
 */
function buildSchemaType(type: any, allTypes: Map<string, any>): SchemaType {
  const schemaType: SchemaType = {
    name: type.name,
    kind: type.kind,
    description: type.description || undefined,
  };

  if (type.fields) {
    schemaType.fields = type.fields.map((field: any): SchemaField => {
      const typeDetails = parseTypeRef(field.type);
      const baseTypeName = typeDetails.baseType;

      return {
        name: field.name,
        description: field.description || undefined,
        type: typeToString(field.type),
        typeDetails,
        args: parseArgs(field.args),
        isDeprecated: field.isDeprecated || false,
        deprecationReason: field.deprecationReason || undefined,
        nestedFields: buildNestedFields(
          baseTypeName,
          allTypes,
          new Set([type.name]),
          2,
          0
        ),
        possibleTypes: undefined,
      };
    });
  }

  if (type.inputFields) {
    schemaType.inputFields = type.inputFields.map(
      (field: any): SchemaFieldArg => ({
        name: field.name,
        type: typeToString(field.type),
        typeDetails: parseTypeRef(field.type),
        description: field.description || undefined,
        defaultValue: field.defaultValue || undefined,
        isRequired: field.type?.kind === "NON_NULL",
      })
    );
  }

  if (type.enumValues) {
    schemaType.enumValues = type.enumValues.map((v: any) => ({
      name: v.name,
      description: v.description || undefined,
      isDeprecated: v.isDeprecated || false,
      deprecationReason: v.deprecationReason || undefined,
    }));
  }

  if (type.interfaces) {
    schemaType.interfaces = type.interfaces.map((i: any) => i.name);
  }

  if (type.possibleTypes) {
    schemaType.possibleTypes = type.possibleTypes.map((t: any) => t.name);
  }

  return schemaType;
}

// ============================================================================
// MAIN BUILDER
// ============================================================================

/**
 * Build a rich, deeply nested schema tree from introspection data
 */
export function buildRichSchemaTree(
  introspection: IntrospectionQuery,
  endpoint?: string
): RichSchemaTree {
  const schema = introspection.__schema;

  // Build type map for lookups
  const allTypes = new Map<string, any>();
  for (const type of schema.types) {
    allTypes.set(type.name, type);
  }

  // Get root type names
  const queryTypeName = schema.queryType?.name;
  const mutationTypeName = schema.mutationType?.name;
  const subscriptionTypeName = schema.subscriptionType?.name;

  // Build operations
  const queryType = queryTypeName ? allTypes.get(queryTypeName) : null;
  const mutationType = mutationTypeName ? allTypes.get(mutationTypeName) : null;
  const subscriptionType = subscriptionTypeName
    ? allTypes.get(subscriptionTypeName)
    : null;

  const queries: SchemaOperation[] =
    queryType?.fields?.map((f: any) => buildOperation(f, allTypes)) || [];
  const mutations: SchemaOperation[] =
    mutationType?.fields?.map((f: any) => buildOperation(f, allTypes)) || [];
  const subscriptions: SchemaOperation[] =
    subscriptionType?.fields?.map((f: any) => buildOperation(f, allTypes)) ||
    [];

  // Filter out internal types and categorize
  const isInternalType = (name: string) => name.startsWith("__");
  const isRootType = (name: string) =>
    name === queryTypeName ||
    name === mutationTypeName ||
    name === subscriptionTypeName;

  const userTypes = schema.types.filter(
    (t) => !isInternalType(t.name) && !isRootType(t.name)
  );

  const objects: SchemaType[] = [];
  const interfaces: SchemaType[] = [];
  const unions: SchemaType[] = [];
  const enums: SchemaType[] = [];
  const inputObjects: SchemaType[] = [];
  const scalars: SchemaType[] = [];

  for (const type of userTypes) {
    const schemaType = buildSchemaType(type, allTypes);
    switch (type.kind) {
      case "OBJECT":
        objects.push(schemaType);
        break;
      case "INTERFACE":
        interfaces.push(schemaType);
        break;
      case "UNION":
        unions.push(schemaType);
        break;
      case "ENUM":
        enums.push(schemaType);
        break;
      case "INPUT_OBJECT":
        inputObjects.push(schemaType);
        break;
      case "SCALAR":
        scalars.push(schemaType);
        break;
    }
  }

  // Build directives
  const directives: SchemaDirective[] = schema.directives.map((d) => ({
    name: d.name,
    description: d.description || undefined,
    locations: [...d.locations],
    args: parseArgs(d.args as any[]),
    isRepeatable: d.isRepeatable,
  }));

  // Generate SDL
  let sdl = "";
  try {
    const clientSchema = buildClientSchema(introspection);
    sdl = printSchema(clientSchema);
  } catch (e) {
    console.warn("Failed to generate SDL:", e);
    sdl = "# Failed to generate SDL";
  }

  return {
    meta: {
      endpoint,
      capturedAt: new Date().toISOString(),
      totalTypes: userTypes.length,
      totalOperations: {
        queries: queries.length,
        mutations: mutations.length,
        subscriptions: subscriptions.length,
      },
    },
    queries,
    mutations,
    subscriptions,
    types: {
      objects,
      interfaces,
      unions,
      enums,
      inputObjects,
      scalars,
    },
    directives,
    sdl,
  };
}

/**
 * Export schema tree as a downloadable JSON
 */
export function schemaTreeToJSON(tree: RichSchemaTree, pretty = true): string {
  return JSON.stringify(tree, null, pretty ? 2 : 0);
}

/**
 * Generate a compact summary of the schema
 */
export function generateSchemaSummary(tree: RichSchemaTree): string {
  const lines: string[] = [
    `# GraphQL Schema Summary`,
    `# Captured: ${tree.meta.capturedAt}`,
    tree.meta.endpoint ? `# Endpoint: ${tree.meta.endpoint}` : "",
    "",
    `## Statistics`,
    `- Total Types: ${tree.meta.totalTypes}`,
    `- Queries: ${tree.meta.totalOperations.queries}`,
    `- Mutations: ${tree.meta.totalOperations.mutations}`,
    `- Subscriptions: ${tree.meta.totalOperations.subscriptions}`,
    "",
  ];

  // List queries with signatures
  if (tree.queries.length > 0) {
    lines.push("## Queries", "");
    for (const q of tree.queries) {
      const args = q.args.map((a) => `${a.name}: ${a.type}`).join(", ");
      lines.push(`- \`${q.name}(${args})\`: ${q.returnType}`);
      if (q.description) lines.push(`  ${q.description}`);
    }
    lines.push("");
  }

  // List mutations with signatures
  if (tree.mutations.length > 0) {
    lines.push("## Mutations", "");
    for (const m of tree.mutations) {
      const args = m.args.map((a) => `${a.name}: ${a.type}`).join(", ");
      lines.push(`- \`${m.name}(${args})\`: ${m.returnType}`);
      if (m.description) lines.push(`  ${m.description}`);
    }
    lines.push("");
  }

  // List types
  if (tree.types.objects.length > 0) {
    lines.push("## Object Types", "");
    for (const t of tree.types.objects) {
      lines.push(`### ${t.name}`);
      if (t.description) lines.push(t.description);
      if (t.fields) {
        for (const f of t.fields) {
          lines.push(`- \`${f.name}\`: ${f.type}`);
        }
      }
      lines.push("");
    }
  }

  return lines.filter(Boolean).join("\n");
}
