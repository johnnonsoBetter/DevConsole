/**
 * GraphQL SmartMemory Module
 *
 * Intelligent GraphQL schema management with:
 * - Full schema introspection
 * - Processed schema storage
 * - Type relationship mapping
 * - Schema diffing for change detection
 *
 * @example
 * ```typescript
 * import {
 *   fetchSchemaIntrospection,
 *   processSchema,
 *   buildRelationshipMap
 * } from '@/lib/graphql';
 *
 * // Fetch and process schema
 * const result = await fetchSchemaIntrospection({ endpoint: '/graphql' });
 * if (result.success && result.data) {
 *   const schema = processSchema(result.data, { endpoint: '/graphql' });
 *   const relationships = buildRelationshipMap(schema);
 *
 *   // Access schema data
 *   console.log(`Found ${schema.stats.queryCount} queries`);
 *   console.log(`Found ${schema.stats.mutationCount} mutations`);
 * }
 * ```
 */

// Types
export type {
    GraphQLDirective,
    GraphQLEnumValue,
    GraphQLField,
    GraphQLFullType,
    GraphQLInputValue,
    GraphQLIntrospectionResult,
    GraphQLSchemaRoot,
    // Core GraphQL types
    GraphQLTypeKind,
    GraphQLTypeRef,
    ProcessedArgument,
    ProcessedEnum,
    ProcessedEnumValue,
    ProcessedField,
    ProcessedInputType,
    ProcessedInterfaceType,
    ProcessedMutation,
    ProcessedObjectType,
    ProcessedQuery,
    // Processed types (for SmartMemory)
    ProcessedScalar,
    ProcessedSchema,
    ProcessedSubscription,
    ProcessedUnionType,
    SchemaStats,

    // Relationships
    TypeRelationship,
    TypeRelationshipMap
} from "./types";

// Introspection
export {
    FULL_INTROSPECTION_QUERY, LIGHT_INTROSPECTION_QUERY, checkIntrospectionSupport,
    fetchSchemaIntrospection, generateSchemaHash
} from "./introspection";

export type {
    IntrospectionOptions,
    IntrospectionResult
} from "./introspection";

// Schema Processing
export {
    buildRelationshipMap,
    diffSchemas,
    formatTypeRef,
    processSchema
} from "./schemaProcessor";

export type { ProcessSchemaOptions, SchemaDiff } from "./schemaProcessor";

// SmartMemory Client
export {
    GraphQLSmartMemory, createGraphQLSmartMemory,
    createGraphQLSmartMemoryWithSession, isSmartMemoryConfigured
} from "./smartMemory";

export type {
    EpisodicEntry,
    GraphQLMemoryConfig,
    MemoryEntry,
    MemorySearchResult,
    MemorySession,
    OperationDocument,
    ProcedureSearchResult,
    QueryTemplate,
    SchemaDocument,
    SemanticSearchResult,
    SummarizationResult,
    SystemPrompt,
    TypeDocument
} from "./smartMemory";

// SmartBuckets Client
export {
    GraphQLSmartBuckets, createGraphQLSmartBuckets
} from "./smartBuckets";

export type {
    ChunkSearchResult,
    DocumentQueryResult,
    FileEntry,
    SearchResult,
    SmartBucketsConfig
} from "./smartBuckets";

// Schema Service
export {
    GraphQLSchemaService, createSchemaService,
    getSchemaService, resetSchemaService
} from "./schemaService";

export type {
    OperationSearchResult,
    SchemaServiceConfig,
    SchemaServiceState,
    TypeSearchResult
} from "./schemaService";

// Query Generator (AI-powered)
export {
    GraphQLQueryGenerator, createQueryGenerator,
    getQueryGenerator, isQueryGeneratorAvailable
} from "./queryGenerator";

export type {
    GenerateQueryRequest, GeneratedQuery, QueryGeneratorConfig,
    QuerySuggestion
} from "./queryGenerator";

