/**
 * GraphQL Schema Processor
 *
 * Transforms raw introspection data into a structured, searchable format
 * suitable for SmartMemory storage and AI-powered features.
 */

import { generateSchemaHash } from "./introspection";
import type {
  GraphQLField,
  GraphQLFullType,
  GraphQLInputValue,
  GraphQLIntrospectionResult,
  GraphQLTypeKind,
  GraphQLTypeRef,
  ProcessedArgument,
  ProcessedEnum,
  ProcessedField,
  ProcessedInputType,
  ProcessedInterfaceType,
  ProcessedMutation,
  ProcessedObjectType,
  ProcessedQuery,
  ProcessedScalar,
  ProcessedSchema,
  ProcessedSubscription,
  ProcessedUnionType,
  SchemaStats,
  TypeRelationship,
  TypeRelationshipMap,
} from "./types";

// ============================================================================
// Built-in Types
// ============================================================================

const BUILT_IN_SCALARS = new Set(["String", "Int", "Float", "Boolean", "ID"]);

const BUILT_IN_DIRECTIVES = new Set([
  "skip",
  "include",
  "deprecated",
  "specifiedBy",
]);

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Unwrap a type reference to get the base type name
 */
function unwrapType(typeRef: GraphQLTypeRef): {
  name: string;
  kind: GraphQLTypeKind;
  isNonNull: boolean;
  isList: boolean;
} {
  let current = typeRef;
  let isNonNull = false;
  let isList = false;

  // Traverse through NON_NULL and LIST wrappers
  while (current) {
    if (current.kind === "NON_NULL") {
      isNonNull = true;
      current = current.ofType!;
    } else if (current.kind === "LIST") {
      isList = true;
      current = current.ofType!;
    } else {
      break;
    }
  }

  return {
    name: current.name || "Unknown",
    kind: current.kind,
    isNonNull,
    isList,
  };
}

/**
 * Format type as human-readable string (e.g., "[User!]!")
 */
export function formatTypeRef(typeRef: GraphQLTypeRef): string {
  if (typeRef.kind === "NON_NULL") {
    return `${formatTypeRef(typeRef.ofType!)}!`;
  }
  if (typeRef.kind === "LIST") {
    return `[${formatTypeRef(typeRef.ofType!)}]`;
  }
  return typeRef.name || "Unknown";
}

// ============================================================================
// Argument Processing
// ============================================================================

function processArgument(inputValue: GraphQLInputValue): ProcessedArgument {
  const unwrapped = unwrapType(inputValue.type);

  return {
    name: inputValue.name,
    description: inputValue.description,
    typeName: unwrapped.name,
    typeKind: unwrapped.kind,
    isNonNull: unwrapped.isNonNull,
    isList: unwrapped.isList,
    defaultValue: inputValue.defaultValue,
  };
}

// ============================================================================
// Field Processing
// ============================================================================

function processField(field: GraphQLField): ProcessedField {
  const unwrapped = unwrapType(field.type);

  return {
    name: field.name,
    description: field.description,
    typeName: unwrapped.name,
    typeKind: unwrapped.kind,
    isNonNull: unwrapped.isNonNull,
    isList: unwrapped.isList,
    isDeprecated: field.isDeprecated,
    deprecationReason: field.deprecationReason,
    arguments: field.args.map(processArgument),
  };
}

// ============================================================================
// Type Processing
// ============================================================================

function processScalar(type: GraphQLFullType): ProcessedScalar {
  return {
    name: type.name,
    description: type.description,
    isBuiltIn: BUILT_IN_SCALARS.has(type.name),
  };
}

function processEnum(type: GraphQLFullType): ProcessedEnum {
  return {
    name: type.name,
    description: type.description,
    values: (type.enumValues || []).map((ev) => ({
      name: ev.name,
      description: ev.description,
      isDeprecated: ev.isDeprecated,
      deprecationReason: ev.deprecationReason,
    })),
  };
}

function processObjectType(
  type: GraphQLFullType,
  roots: {
    query: string | null;
    mutation: string | null;
    subscription: string | null;
  }
): ProcessedObjectType {
  return {
    name: type.name,
    description: type.description,
    fields: (type.fields || []).map(processField),
    interfaces: (type.interfaces || [])
      .map((i) => i.name || "")
      .filter(Boolean),
    isQueryRoot: type.name === roots.query,
    isMutationRoot: type.name === roots.mutation,
    isSubscriptionRoot: type.name === roots.subscription,
  };
}

function processInterfaceType(
  type: GraphQLFullType,
  allTypes: GraphQLFullType[]
): ProcessedInterfaceType {
  // Find all types that implement this interface
  const implementedBy = allTypes
    .filter(
      (t) =>
        t.kind === "OBJECT" && t.interfaces?.some((i) => i.name === type.name)
    )
    .map((t) => t.name);

  return {
    name: type.name,
    description: type.description,
    fields: (type.fields || []).map(processField),
    implementedBy,
  };
}

function processUnionType(type: GraphQLFullType): ProcessedUnionType {
  return {
    name: type.name,
    description: type.description,
    possibleTypes: (type.possibleTypes || [])
      .map((t) => t.name || "")
      .filter(Boolean),
  };
}

function processInputType(type: GraphQLFullType): ProcessedInputType {
  return {
    name: type.name,
    description: type.description,
    fields: (type.inputFields || []).map(processArgument),
  };
}

// ============================================================================
// Operation Processing (Queries, Mutations, Subscriptions)
// ============================================================================

function processOperation(
  field: GraphQLField
): ProcessedQuery | ProcessedMutation | ProcessedSubscription {
  const unwrapped = unwrapType(field.type);

  return {
    name: field.name,
    description: field.description,
    arguments: field.args.map(processArgument),
    returnType: unwrapped.name,
    returnTypeKind: unwrapped.kind,
    isNonNull: unwrapped.isNonNull,
    isList: unwrapped.isList,
  };
}

function extractOperations(
  types: GraphQLFullType[],
  rootTypeName: string | null
): ProcessedQuery[] {
  if (!rootTypeName) return [];

  const rootType = types.find((t) => t.name === rootTypeName);
  if (!rootType || !rootType.fields) return [];

  return rootType.fields.map(processOperation);
}

// ============================================================================
// Relationship Mapping
// ============================================================================

export function buildRelationshipMap(
  schema: ProcessedSchema
): TypeRelationshipMap {
  const referencedBy = new Map<string, TypeRelationship[]>();
  const references = new Map<string, TypeRelationship[]>();

  const addRelationship = (rel: TypeRelationship) => {
    // Add to referencedBy
    if (!referencedBy.has(rel.toType)) {
      referencedBy.set(rel.toType, []);
    }
    referencedBy.get(rel.toType)!.push(rel);

    // Add to references
    if (!references.has(rel.fromType)) {
      references.set(rel.fromType, []);
    }
    references.get(rel.fromType)!.push(rel);
  };

  // Process object types
  for (const obj of schema.objects) {
    for (const field of obj.fields) {
      addRelationship({
        fromType: obj.name,
        toType: field.typeName,
        fieldName: field.name,
        relationshipType: "field",
        isNonNull: field.isNonNull,
        isList: field.isList,
      });

      // Field arguments
      for (const arg of field.arguments) {
        addRelationship({
          fromType: obj.name,
          toType: arg.typeName,
          fieldName: `${field.name}.${arg.name}`,
          relationshipType: "argument",
          isNonNull: arg.isNonNull,
          isList: arg.isList,
        });
      }
    }

    // Interface implementations
    for (const iface of obj.interfaces) {
      addRelationship({
        fromType: obj.name,
        toType: iface,
        fieldName: "",
        relationshipType: "implements",
        isNonNull: false,
        isList: false,
      });
    }
  }

  // Process interface types
  for (const iface of schema.interfaces) {
    for (const field of iface.fields) {
      addRelationship({
        fromType: iface.name,
        toType: field.typeName,
        fieldName: field.name,
        relationshipType: "field",
        isNonNull: field.isNonNull,
        isList: field.isList,
      });
    }
  }

  // Process union types
  for (const union of schema.unions) {
    for (const possibleType of union.possibleTypes) {
      addRelationship({
        fromType: union.name,
        toType: possibleType,
        fieldName: "",
        relationshipType: "possibleType",
        isNonNull: false,
        isList: false,
      });
    }
  }

  // Process input types
  for (const input of schema.inputTypes) {
    for (const field of input.fields) {
      addRelationship({
        fromType: input.name,
        toType: field.typeName,
        fieldName: field.name,
        relationshipType: "inputField",
        isNonNull: field.isNonNull,
        isList: field.isList,
      });
    }
  }

  return { referencedBy, references };
}

// ============================================================================
// Main Schema Processor
// ============================================================================

export interface ProcessSchemaOptions {
  endpoint: string;
  includeBuiltInTypes?: boolean;
}

/**
 * Process raw introspection data into structured schema
 */
export function processSchema(
  introspectionData: GraphQLIntrospectionResult,
  options: ProcessSchemaOptions
): ProcessedSchema {
  const { endpoint, includeBuiltInTypes = false } = options;
  const schema = introspectionData.__schema;

  // Filter types
  const types = schema.types.filter((t) => {
    // Always exclude introspection types
    if (t.name.startsWith("__")) return false;

    // Optionally exclude built-in scalars
    if (
      !includeBuiltInTypes &&
      t.kind === "SCALAR" &&
      BUILT_IN_SCALARS.has(t.name)
    ) {
      return false;
    }

    return true;
  });

  const roots = {
    query: schema.queryType?.name || null,
    mutation: schema.mutationType?.name || null,
    subscription: schema.subscriptionType?.name || null,
  };

  // Categorize types
  const scalars: ProcessedScalar[] = [];
  const enums: ProcessedEnum[] = [];
  const objects: ProcessedObjectType[] = [];
  const interfaces: ProcessedInterfaceType[] = [];
  const unions: ProcessedUnionType[] = [];
  const inputTypes: ProcessedInputType[] = [];

  for (const type of types) {
    switch (type.kind) {
      case "SCALAR":
        scalars.push(processScalar(type));
        break;
      case "ENUM":
        enums.push(processEnum(type));
        break;
      case "OBJECT":
        // Skip root types (they'll be processed as operations)
        if (
          type.name !== roots.query &&
          type.name !== roots.mutation &&
          type.name !== roots.subscription
        ) {
          objects.push(processObjectType(type, roots));
        }
        break;
      case "INTERFACE":
        interfaces.push(processInterfaceType(type, types));
        break;
      case "UNION":
        unions.push(processUnionType(type));
        break;
      case "INPUT_OBJECT":
        inputTypes.push(processInputType(type));
        break;
    }
  }

  // Extract operations
  const queries = extractOperations(schema.types, roots.query);
  const mutations = extractOperations(schema.types, roots.mutation);
  const subscriptions = extractOperations(schema.types, roots.subscription);

  // Filter directives (optionally exclude built-in)
  const directives = includeBuiltInTypes
    ? schema.directives
    : schema.directives.filter((d) => !BUILT_IN_DIRECTIVES.has(d.name));

  // Calculate stats
  let totalFields = 0;
  let totalArguments = 0;

  for (const obj of objects) {
    totalFields += obj.fields.length;
    for (const field of obj.fields) {
      totalArguments += field.arguments.length;
    }
  }

  for (const iface of interfaces) {
    totalFields += iface.fields.length;
    for (const field of iface.fields) {
      totalArguments += field.arguments.length;
    }
  }

  for (const query of queries) {
    totalArguments += query.arguments.length;
  }

  for (const mutation of mutations) {
    totalArguments += mutation.arguments.length;
  }

  for (const subscription of subscriptions) {
    totalArguments += subscription.arguments.length;
  }

  const stats: SchemaStats = {
    totalTypes:
      scalars.length +
      enums.length +
      objects.length +
      interfaces.length +
      unions.length +
      inputTypes.length,
    totalFields,
    totalArguments,
    scalarCount: scalars.length,
    enumCount: enums.length,
    objectCount: objects.length,
    interfaceCount: interfaces.length,
    unionCount: unions.length,
    inputTypeCount: inputTypes.length,
    queryCount: queries.length,
    mutationCount: mutations.length,
    subscriptionCount: subscriptions.length,
    directiveCount: directives.length,
  };

  return {
    meta: {
      endpoint,
      fetchedAt: Date.now(),
      version: "1.0",
      hash: generateSchemaHash(introspectionData),
    },
    roots,
    scalars,
    enums,
    objects,
    interfaces,
    unions,
    inputTypes,
    queries,
    mutations,
    subscriptions,
    directives,
    stats,
  };
}

// ============================================================================
// Schema Diff Utilities
// ============================================================================

export interface SchemaDiff {
  added: {
    types: string[];
    fields: Array<{ type: string; field: string }>;
    operations: Array<{
      kind: "query" | "mutation" | "subscription";
      name: string;
    }>;
  };
  removed: {
    types: string[];
    fields: Array<{ type: string; field: string }>;
    operations: Array<{
      kind: "query" | "mutation" | "subscription";
      name: string;
    }>;
  };
  changed: {
    types: Array<{ name: string; changes: string[] }>;
  };
  hasChanges: boolean;
}

/**
 * Compare two schemas to detect changes
 */
export function diffSchemas(
  oldSchema: ProcessedSchema,
  newSchema: ProcessedSchema
): SchemaDiff {
  const diff: SchemaDiff = {
    added: { types: [], fields: [], operations: [] },
    removed: { types: [], fields: [], operations: [] },
    changed: { types: [] },
    hasChanges: false,
  };

  // Quick check using hash
  if (oldSchema.meta.hash === newSchema.meta.hash) {
    return diff;
  }

  // Compare types
  const oldTypeNames = new Set([
    ...oldSchema.objects.map((t) => t.name),
    ...oldSchema.enums.map((t) => t.name),
    ...oldSchema.interfaces.map((t) => t.name),
    ...oldSchema.unions.map((t) => t.name),
    ...oldSchema.inputTypes.map((t) => t.name),
  ]);

  const newTypeNames = new Set([
    ...newSchema.objects.map((t) => t.name),
    ...newSchema.enums.map((t) => t.name),
    ...newSchema.interfaces.map((t) => t.name),
    ...newSchema.unions.map((t) => t.name),
    ...newSchema.inputTypes.map((t) => t.name),
  ]);

  // Find added types
  Array.from(newTypeNames).forEach((name) => {
    if (!oldTypeNames.has(name)) {
      diff.added.types.push(name);
      diff.hasChanges = true;
    }
  });

  // Find removed types
  Array.from(oldTypeNames).forEach((name) => {
    if (!newTypeNames.has(name)) {
      diff.removed.types.push(name);
      diff.hasChanges = true;
    }
  });

  // Compare operations
  const compareOps = (
    kind: "query" | "mutation" | "subscription",
    oldOps: Array<{ name: string }>,
    newOps: Array<{ name: string }>
  ) => {
    const oldNames = new Set(oldOps.map((o) => o.name));
    const newNames = new Set(newOps.map((o) => o.name));

    Array.from(newNames).forEach((name) => {
      if (!oldNames.has(name)) {
        diff.added.operations.push({ kind, name });
        diff.hasChanges = true;
      }
    });

    Array.from(oldNames).forEach((name) => {
      if (!newNames.has(name)) {
        diff.removed.operations.push({ kind, name });
        diff.hasChanges = true;
      }
    });
  };

  compareOps("query", oldSchema.queries, newSchema.queries);
  compareOps("mutation", oldSchema.mutations, newSchema.mutations);
  compareOps("subscription", oldSchema.subscriptions, newSchema.subscriptions);

  return diff;
}
