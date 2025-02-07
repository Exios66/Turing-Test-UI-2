import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  sender: text("sender").notNull(),
  avatar: text("avatar").notNull(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  profileId: integer("profile_id").references(() => profiles.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  name: true,
});

export const insertProfileSchema = createInsertSchema(profiles).pick({
  name: true,
  avatar: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  sender: true,
  avatar: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

// Schema for importing chat files
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