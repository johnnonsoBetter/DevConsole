
import Raindrop from "@liquidmetal-ai/lm-raindrop";

const client = new Raindrop({ apiKey: "test" });

function inspect(obj: any, path: string = "") {
  if (!obj) return;
  const keys = Object.keys(obj);
  console.log(`${path}: [${keys.join(", ")}]`);
  
  for (const key of keys) {
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
       // Limit depth to avoid infinite loops if any
       if (path.split(".").length < 3) {
         inspect(obj[key], path ? `${path}.${key}` : key);
       }
    }
  }
}





console.log("Inspecting prototype of client.bucket:");
// @ts-ignore
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.bucket)));

console.log("\nInspecting prototype of client.executeQuery:");
// @ts-ignore
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.executeQuery)));

console.log("\nInspecting prototype of client.query:");
// @ts-ignore
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.query)));




