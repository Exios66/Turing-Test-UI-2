import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertMessageSchema, messageFileSchema } from "@shared/schema";

export function registerRoutes(app: Express) {
  app.get("/api/messages", async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    const result = insertMessageSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const message = await storage.createMessage(result.data);
    res.json(message);
  });

  app.post("/api/messages/bulk", async (req, res) => {
    const result = messageFileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const avatars = [
      "https://images.unsplash.com/photo-1630910561339-4e22c7150093",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
      "https://images.unsplash.com/photo-1646617747609-45b466ace9a6",
      "https://images.unsplash.com/photo-1628891435222-065925dcb365",
      "https://images.unsplash.com/photo-1507499036636-f716246c2c23",
      "https://images.unsplash.com/photo-1601388352547-2802c6f32eb8",
      "https://images.unsplash.com/photo-1581291518570-03a26006fb21",
      "https://images.unsplash.com/photo-1633466154054-399bf16156a2"
    ];

    const senderAvatars = new Map<string, string>();
    
    const messages = result.data.map(msg => {
      if (!senderAvatars.has(msg.sender)) {
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
        senderAvatars.set(msg.sender, randomAvatar);
      }
      
      return {
        content: msg.content,
        sender: msg.sender,
        avatar: senderAvatars.get(msg.sender)!
      };
    });

    const savedMessages = await storage.createMessages(messages);
    res.json(savedMessages);
  });

  return createServer(app);
}
