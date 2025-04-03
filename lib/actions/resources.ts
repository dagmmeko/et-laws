"use server";

import { generateEmbeddingsForDocs } from "@/lib/ai/docs/generate-embeddings-for-docs";
import { db } from "@/lib/db";
import { embeddings as embeddingsTable } from "@/lib/db/schema/embeddings";
import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from "@/lib/db/schema/resources";

export const createResource = async (input: NewResourceParams) => {
  try {
    const { content } = insertResourceSchema.parse(input);

    const [resource] = await db
      .insert(resources)
      .values({ content })
      .returning();

    const embeddings = await generateEmbeddingsForDocs(content);

    await db.insert(embeddingsTable).values(
      embeddings.map((embedding) => ({
        resourceId: resource.id,
        ...embedding,
      }))
    );

    return "Resource successfully created.";
  } catch (e) {
    if (e instanceof Error)
      return e.message.length > 0 ? e.message : "Error, please try again.";
  }
};

export const listAllResources = async () => {
  try {
    const allResources = await db.select().from(resources);
    return {
      resources: allResources.map((resource) => ({
        content:
          resource.content.substring(0, 150) +
          (resource.content.length > 150 ? "..." : ""),
      })),
      count: allResources.length,
    };
  } catch (e) {
    if (e instanceof Error)
      return {
        error: e.message.length > 0 ? e.message : "Error, please try again.",
      };
    return { error: "Unknown error occurred" };
  }
};
