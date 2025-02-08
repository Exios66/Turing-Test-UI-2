import { type Message, type Profile, type Conversation, type InsertProfile } from "@shared/schema";
import { log } from "./vite";

class Storage {
  private messages: Message[] = [];
  private profiles: Profile[] = [];
  private conversations: Conversation[] = [];
  private nextId = 1;

  // Profile methods with error handling
  async getProfiles(): Promise<Profile[]> {
    try {
      log("Fetching all profiles");
      return this.profiles;
    } catch (error) {
      log(`Error fetching profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error("Failed to fetch profiles");
    }
  }

  async getProfile(id: number): Promise<Profile | undefined> {
    try {
      log(`Fetching profile with id: ${id}`);
      return this.profiles.find((p) => p.id === id);
    } catch (error) {
      log(`Error fetching profile ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to fetch profile ${id}`);
    }
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    try {
      if (!profile.name) {
        throw new Error("Name is required");
      }

      const existingProfile = this.profiles.find(p => p.name === profile.name);
      if (existingProfile) {
        throw new Error("Profile name already exists");
      }

      const newProfile: Profile = { 
        ...profile, 
        id: this.nextId++,
        createdAt: new Date(),
      };

      this.profiles.push(newProfile);
      log(`Created new profile with id: ${newProfile.id} and name: ${newProfile.name}`);
      return newProfile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Error creating profile: ${errorMessage}`, "error");
      throw new Error(`Failed to create profile: ${errorMessage}`);
    }
  }

  async updateProfile(id: number, update: Partial<Profile>): Promise<Profile> {
    try {
      const index = this.profiles.findIndex((p) => p.id === id);
      if (index === -1) {
        const error = `Profile ${id} not found`;
        log(error);
        throw new Error(error);
      }

      const updatedProfile: Profile = {
        ...this.profiles[index],
        ...update,
        id: this.profiles[index].id,
        createdAt: this.profiles[index].createdAt
      };

      this.profiles[index] = updatedProfile;
      log(`Updated profile ${id}`);
      return updatedProfile;
    } catch (error) {
      log(`Error updating profile ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to update profile ${id}`);
    }
  }

  async deleteProfile(id: number): Promise<void> {
    try {
      const index = this.profiles.findIndex((p) => p.id === id);
      if (index === -1) {
        const error = `Profile ${id} not found`;
        log(error);
        throw new Error(error);
      }

      this.profiles.splice(index, 1);
      log(`Deleted profile ${id}`);
    } catch (error) {
      log(`Error deleting profile ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to delete profile ${id}`);
    }
  }

  // Message methods with error handling
  async getMessages(conversationId?: number): Promise<Message[]> {
    try {
      log(`Fetching messages${conversationId ? ` for conversation ${conversationId}` : ''}`);
      return conversationId 
        ? this.messages.filter((m) => m.conversationId === conversationId)
        : this.messages;
    } catch (error) {
      log(`Error fetching messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error("Failed to fetch messages");
    }
  }

  async createMessage(message: Omit<Message, "id">): Promise<Message> {
    try {
      const newMessage = { ...message, id: this.nextId++ };
      this.messages.push(newMessage);
      log(`Created new message with id: ${newMessage.id}`);
      return newMessage;
    } catch (error) {
      log(`Error creating message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error("Failed to create message");
    }
  }

  async createMessages(messages: Omit<Message, "id">[]): Promise<Message[]> {
    try {
      const newMessages = messages.map((message) => ({
        ...message,
        id: this.nextId++,
      }));
      this.messages.push(...newMessages);
      log(`Created ${newMessages.length} new messages`);
      return newMessages;
    } catch (error) {
      log(`Error creating multiple messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error("Failed to create messages");
    }
  }

  async clearMessages(conversationId: number): Promise<void> {
    try {
      this.messages = this.messages.filter((m) => m.conversationId !== conversationId);
      log(`Cleared messages for conversation ${conversationId}`);
    } catch (error) {
      log(`Error clearing messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error("Failed to clear messages");
    }
  }

  // Conversation methods with error handling
  async getConversations(): Promise<Conversation[]> {
    try {
      log("Fetching all conversations");
      return this.conversations;
    } catch (error) {
      log(`Error fetching conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error("Failed to fetch conversations");
    }
  }

  async createConversation(conversation: Omit<Conversation, "id">): Promise<Conversation> {
    try {
      const newConversation = { ...conversation, id: this.nextId++ };
      this.conversations.push(newConversation);
      log(`Created new conversation with id: ${newConversation.id}`);
      return newConversation;
    } catch (error) {
      log(`Error creating conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error("Failed to create conversation");
    }
  }

  async updateConversation(id: number, update: Partial<Conversation>): Promise<Conversation> {
    try {
      const index = this.conversations.findIndex((c) => c.id === id);
      if (index === -1) {
        const error = `Conversation ${id} not found`;
        log(error);
        throw new Error(error);
      }

      this.conversations[index] = { ...this.conversations[index], ...update };
      log(`Updated conversation ${id}`);
      return this.conversations[index];
    } catch (error) {
      log(`Error updating conversation ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to update conversation ${id}`);
    }
  }
}

export const storage = new Storage();