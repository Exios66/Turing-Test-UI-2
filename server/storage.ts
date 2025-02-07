import { messages, profiles, conversations, type Message, type InsertMessage, type Profile, type InsertProfile, type Conversation, type InsertConversation } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Message operations
  getMessages(conversationId?: number): Promise<Message[]>;
  createMessage(message: InsertMessage & { conversationId?: number, profileId?: number }): Promise<Message>;
  createMessages(messages: (InsertMessage & { conversationId?: number, profileId?: number })[]): Promise<Message[]>;
  clearMessages(conversationId: number): Promise<void>;

  // Profile operations
  getProfiles(): Promise<Profile[]>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: number, profile: Partial<InsertProfile>): Promise<Profile>;

  // Conversation operations
  getConversations(): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation>;
}

export class DatabaseStorage implements IStorage {
  // Message operations
  async getMessages(conversationId?: number): Promise<Message[]> {
    if (conversationId) {
      return await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.timestamp);
    }
    return await db.select().from(messages).orderBy(messages.timestamp);
  }

  async createMessage(message: InsertMessage & { conversationId?: number, profileId?: number }): Promise<Message> {
    const [createdMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return createdMessage;
  }

  async createMessages(insertMessages: (InsertMessage & { conversationId?: number, profileId?: number })[]): Promise<Message[]> {
    const createdMessages = await db
      .insert(messages)
      .values(insertMessages)
      .returning();
    return createdMessages;
  }

  async clearMessages(conversationId: number): Promise<void> {
    await db
      .delete(messages)
      .where(eq(messages.conversationId, conversationId));
  }

  // Profile operations
  async getProfiles(): Promise<Profile[]> {
    return await db.select().from(profiles);
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [createdProfile] = await db
      .insert(profiles)
      .values(profile)
      .returning();
    return createdProfile;
  }

  async updateProfile(id: number, profile: Partial<InsertProfile>): Promise<Profile> {
    const [updatedProfile] = await db
      .update(profiles)
      .set(profile)
      .where(eq(profiles.id, id))
      .returning();
    return updatedProfile;
  }

  // Conversation operations
  async getConversations(): Promise<Conversation[]> {
    return await db.select().from(conversations);
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [createdConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return createdConversation;
  }

  async updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation> {
    const [updatedConversation] = await db
      .update(conversations)
      .set(conversation)
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }
}

export const storage = new DatabaseStorage();