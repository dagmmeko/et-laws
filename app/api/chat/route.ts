import { listAllResources } from "@/lib/actions/resources";
import { findRelevantContent } from "@/lib/ai/embedding";
import { google } from "@/lib/ai/models";
import { streamText, tool } from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-2.0-flash-001"),
    system: `You are a helpful assistant. Check your knowledge base before answering any questions.
Try your best to respond to questions using information from tool calls.
Assume all conversations are about Ethiopia unless explicitly specified otherwise. You have knowledge about Ethiopian laws, policies, and resources.

When answering questions:
- Be concise and organize information with bullet points
- Use line breaks to improve readability
- Include direct quotes from relevant law sections or subsections
- Format quotes as: "Section X.X: [exact text]" or "Subsection X.X.X: [exact text]
- Respond in markdown format
"`,
    messages,
    tools: {
      // addResource: tool({
      //   description: `add a resource to your knowledge base.
      // If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
      //   parameters: z.object({
      //     content: z
      //       .string()
      //       .describe("the content or resource to add to the knowledge base"),
      //   }),
      //   execute: async ({ content }) => createResource({ content }),
      // }),
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        parameters: z.object({
          question: z.string().describe("the users question"),
        }),
        execute: async ({ question }) => findRelevantContent(question),
      }),
      listResources: tool({
        description: `list all resources in your knowledge base.`,
        parameters: z.object({}),
        execute: async () => listAllResources(),
      }),
      getTimeAndDate: tool({
        description: `get the current time and date.`,
        parameters: z.object({}),
        execute: async () => {
          const date = new Date();
          return {
            time: date.toLocaleTimeString(),
            date: date.toLocaleDateString(),
          };
        },
      }),
    },
  });

  const stream = result.toDataStreamResponse();

  return stream;
}
