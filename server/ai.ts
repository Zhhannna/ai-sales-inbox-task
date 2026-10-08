import { z } from "zod";

export const extractRequestSchema = z
  .object({
    messageId: z.string().trim().min(1),
  })
  .strict()
  .transform((value) => value.messageId);

export type Extraction = {
  product?: string;
  quantity?: number | null;
  material?: string | null;
  budget?: number | null;
};

export const extractionByMessage: Record<string, Extraction> = {
  "message-perfect": { product: "Desk", quantity: 30, material: "Oak", budget: 50000 },
  "message-partial": { product: "Ergonomic Chair", quantity: null, material: "Black", budget: 12000 },
};

export function extractForMessage(messageId: string): Extraction | undefined {
  return extractionByMessage[messageId];
}
