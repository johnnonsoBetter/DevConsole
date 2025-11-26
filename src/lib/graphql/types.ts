/**
 * GraphQL Schema Types
 * 
 * Comprehensive type definitions for GraphQL schema introspection
 * These types represent all elements of a GraphQL schema that can be
 * stored in SmartMemory for intelligent query assistance.
 */

// ============================================================================
// Core GraphQL Type Kinds
// ============================================================================

export type GraphQLTypeKind =
  | 'SCALAR'
  | 'OBJECT'
  | 'INTERFACE'
  | 'UNION'
  | 'ENUM'
  | 'INPUT_OBJECT'
  | 'LIST'
  | 'NON_NULL';

// ============================================================================
// Base Types
// ============================================================================

export interface GraphQLTypeRef {
  kind: GraphQLTypeKind;
  name: string | null;
  ofType: GraphQLTypeRef | null;
}

export interface GraphQLInputValue {
  name: string;
  description: string | null;
  type: GraphQLTypeRef;
  defaultValue: string | null;
}

export interface GraphQLField {
  name: string;
  description: string | null;
  args: GraphQLInputValue[];
  type: GraphQLTypeRef;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

export interface GraphQLEnumValue {
  name: string;
  description: string | null;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

// ============================================================================
// Full Type Definitions
// ============================================================================

export interface GraphQLFullType {
  kind: GraphQLTypeKind;
  name: string;
  description: string | null;
  fields: GraphQLField[] | null;
  inputFields: GraphQLInputValue[] | null;
  interfaces: GraphQLTypeRef[] | null;
  enumValues: GraphQLEnumValue[] | null;
  possibleTypes: GraphQLTypeRef[] | null;
}

export interface GraphQLDirective {
  name: string;
  description: string | null;
  locations: string[];
  args: GraphQLInputValue[];
}

// ============================================================================
// Schema Root Types
// ============================================================================

export interface GraphQLSchemaRoot {
  queryType: { name: string } | null;
  mutationType: { name: string } | null;
  subscriptionType: { name: string } | null;
}

// ============================================================================
// Full Introspection Result
// ============================================================================

export interface GraphQLIntrospectionResult {
  __schema: {
    queryType: { name: string } | null;
    mutationType: { name: string } | null;
    subscriptionType: { name: string } | null;
    types: GraphQLFullType[];
    directives: GraphQLDirective[];
  };
}

// ============================================================================
// Processed Schema Types (for SmartMemory storage)
// ============================================================================

export interface ProcessedScalar {
  name: string;
  description: string | null;
  isBuiltIn: boolean;
}

export interface ProcessedEnumValue {
  name: string;
  description: string | null;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

export interface ProcessedEnum {
  name: string;
  description: string | null;
  values: ProcessedEnumValue[];
}

export interface ProcessedField {
  name: string;
  description: string | null;
  typeName: string;
  typeKind: GraphQLTypeKind;
  isNonNull: boolean;
  isList: boolean;
  isDeprecated: boolean;
  deprecationReason: string | null;
  arguments: ProcessedArgument[];
}

export interface ProcessedArgument {
  name: string;
  description: string | null;
  typeName: string;
  typeKind: GraphQLTypeKind;
  isNonNull: boolean;
  isList: boolean;
  defaultValue: string | null;
}

export interface ProcessedObjectType {
  name: string;
  description: string | null;
  fields: ProcessedField[];
  interfaces: string[];
  isQueryRoot: boolean;
  isMutationRoot: boolean;
  isSubscriptionRoot: boolean;
}

export interface ProcessedInterfaceType {
  name: string;
  description: string | null;
  fields: ProcessedField[];
  implementedBy: string[];
}

export interface ProcessedUnionType {
  name: string;
  description: string | null;
  possibleTypes: string[];
}

export interface ProcessedInputType {
  name: string;
  description: string | null;
  fields: ProcessedArgument[];
}

export interface ProcessedQuery {
  name: string;
  description: string | null;
  arguments: ProcessedArgument[];
  returnType: string;
  returnTypeKind: GraphQLTypeKind;
  isNonNull: boolean;
  isList: boolean;
}

export interface ProcessedMutation {
  name: string;
  description: string | null;
  arguments: ProcessedArgument[];
  returnType: string;
  returnTypeKind: GraphQLTypeKind;
  isNonNull: boolean;
  isList: boolean;
}

export interface ProcessedSubscription {
  name: string;
  description: string | null;
  arguments: ProcessedArgument[];
  returnType: string;
  returnTypeKind: GraphQLTypeKind;
  isNonNull: boolean;
  isList: boolean;
}

// ============================================================================
// Complete Processed Schema (SmartMemory format)
// ============================================================================

export interface ProcessedSchema {
  /** Schema metadata */
  meta: {
    endpoint: string;
    fetchedAt: number;
    version: string;
    hash: string;
  };
  
  /** Root operation type names */
  roots: {
    query: string | null;
    mutation: string | null;
    subscription: string | null;
  };
  
  /** All scalar types (including custom) */
  scalars: ProcessedScalar[];
  
  /** All enum types */
  enums: ProcessedEnum[];
  
  /** All object types */
  objects: ProcessedObjectType[];
  
  /** All interface types */
  interfaces: ProcessedInterfaceType[];
  
  /** All union types */
  unions: ProcessedUnionType[];
  
  /** All input types */
  inputTypes: ProcessedInputType[];
  
  /** All queries (fields on Query type) */
  queries: ProcessedQuery[];
  
  /** All mutations (fields on Mutation type) */
  mutations: ProcessedMutation[];
  
  /** All subscriptions (fields on Subscription type) */
  subscriptions: ProcessedSubscription[];
  
  /** Directives */
  directives: GraphQLDirective[];
  
  /** Statistics */
  stats: SchemaStats;
}

export interface SchemaStats {
  totalTypes: number;
  totalFields: number;
  totalArguments: number;
  scalarCount: number;
  enumCount: number;
  objectCount: number;
  interfaceCount: number;
  unionCount: number;
  inputTypeCount: number;
  queryCount: number;
  mutationCount: number;
  subscriptionCount: number;
  directiveCount: number;
}

// ============================================================================
// Type Relationship Mapping
// ============================================================================

export interface TypeRelationship {
  fromType: string;
  toType: string;
  fieldName: string;
  relationshipType: 'field' | 'argument' | 'implements' | 'possibleType' | 'inputField';
  isNonNull: boolean;
  isList: boolean;
}

export interface TypeRelationshipMap {
  /** Types that reference this type */
  referencedBy: Map<string, TypeRelationship[]>;
  /** Types that this type references */
  references: Map<string, TypeRelationship[]>;
}
