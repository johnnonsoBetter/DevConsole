// app/api/generate-object/route.ts
import { generateObject, generateText } from "ai";
import { z } from "zod";

interface UseVercelAiOptions {
  model?: any;
  prompt?: string;
}
const useVercelAi = ({ model, prompt = "" }: UseVercelAiOptions) => {
  // Hook logic for Vercel AI integration

  const generateTextResponse = async () => {
    const response = await generateText({
      model,
      prompt,
    });
    return response as typeof response;
  };

  const generateStructuredData = async () => {
    const response = await generateObject({
      model,

      schema: z.object({
        recipe: z.object({
          name: z.string(),
          ingredients: z.array(
            z.object({ name: z.string(), amount: z.string() })
          ),
          steps: z.array(z.string()),
        }),
      }),
      prompt,
    });
    return response as typeof response;
  };

  return {
    generateTextResponse,
    generateStructuredData,
  };
};

export default useVercelAi;
