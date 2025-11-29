


import { GraphQLSmartBuckets } from "./smartBuckets";



const client = new GraphQLSmartBuckets({ apiKey: "test-key" });

console.log("GraphQLSmartBuckets instance created.");
console.log("Methods:");

const proto = Object.getPrototypeOf(client);
const methods = Object.getOwnPropertyNames(proto).filter(n => n !== "constructor");
console.log(methods);

// Check if methods are callable (mock check)
console.log("\nChecking method signatures:");
for (const method of methods) {
  console.log(`- ${method}: typeof ${(client as any)[method]}`);
}
