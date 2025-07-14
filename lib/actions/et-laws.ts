"use server";

import {
  EtLawsChunk,
  EtLawsSection,
  EtLawsSubsection,
} from "@/lib/types/et-laws-chunk";
import { generateObject } from "ai";
import { z } from "zod";
import { google } from "../ai/models";

export async function processLawText(fileUrl: string) {
  try {
    const result = await generateObject<EtLawsChunkSchema>({
      model: google.chat("gemini-2.5-pro", {
        useSearchGrounding: false,
        structuredOutputs: false,
      }),
      temperature: 0,
      maxRetries: 3,
      mode: "json",
      output: "object",
      schema: etLawsChunkSchema,
      schemaName: "Law",
      messages: [
        {
          role: "system",
          content: `You are a precise legal document parser. Extract the content from the provided law document and structure it exactly according to the provided schema. Maintain the exact verbatim text from the document. Do not summarize or paraphrase. Use your understanding of the contents of the document only to structure the output in an accurate hierarchy.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Parse the attached law document into the required JSON structure. Focus only on the English sections of the document and discard any Amharic text. Only extract and structure the English language content.`,
              // If the document doesn't explicitly define parts, assume it's a single part and structure it accordingly with appropriate part number and title.
            },
            {
              type: "file",
              data: fileUrl,
              mimeType: "application/pdf",
            },
          ],
        },
      ],
    });

    console.log(result);
    console.log(JSON.stringify({ chunks: result.object.chunks }, null, 2));

    return {
      success: true,
      chunks: result.object.chunks as EtLawsChunk[],
    } as const;
  } catch (error) {
    console.error("Error processing law text:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    } as const;
  }
}

// Define schemas that match our type definitions
const subsectionSchema: z.ZodType<EtLawsSubsection> = z.lazy(() =>
  z.object({
    id: z.string(),
    number: z.string(),
    content: z.string(),
    subsections: z.array(subsectionSchema),
  })
);

const sectionSchema: z.ZodType<EtLawsSection> = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  content: z.string(),
  subsections: z.array(subsectionSchema),
});

const etLawsChunkSchema: z.ZodType<{ chunks: EtLawsChunk[] }> = z.object({
  chunks: z.array(
    z.object({
      id: z.string(),
      number: z.string(),
      title: z.string(),
      sections: z.array(sectionSchema),
    })
  ),
});

type EtLawsChunkSchema = { chunks: EtLawsChunk[] };
