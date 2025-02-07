import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  sender: text("sender").notNull(),
  avatar: text("avatar").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  sender: true,
  avatar: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Updated schema for the new file format
export const messageFileSchema = z.object({
  version: z.string(),
  messages: z.record(z.string(), z.object({
    characterId: z.string(),
    content: z.string(),
    id: z.string(),
    updatedAt: z.string(),
    metadata: z.object({
      generateDuration: z.number(),
      latencyDuration: z.number(),
      duration: z.number(),
      tokensCount: z.number(),
      tokensPerSecond: z.number()
    }).optional(),
    isRetrying: z.boolean().optional()
  }))
});