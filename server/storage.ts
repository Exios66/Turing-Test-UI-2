import { messages, type Message, type InsertMessage } from "@shared/schema";
import { db } from "./db";

export interface IStorage {
  getMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  createMessages(messages: InsertMessage[]): Promise<Message[]>;
}

export class DatabaseStorage implements IStorage {
  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async createMessages(insertMessages: InsertMessage[]): Promise<Message[]> {
    const insertedMessages = await db
      .insert(messages)
      .values(insertMessages)
      .returning();
    return insertedMessages;
  }
}

export const storage = new DatabaseStorage();