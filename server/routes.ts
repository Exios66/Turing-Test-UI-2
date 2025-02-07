import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";

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
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: "Expected an array of messages" });
    }

    const messages = req.body.map(msg => ({
      content: msg.content,
      sender: msg.sender,
      avatar: msg.avatar
    }));

    const savedMessages = await storage.createMessages(messages);
    res.json(savedMessages);
  });

  return createServer(app);
}