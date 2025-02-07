import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertProfileSchema, insertConversationSchema } from "@shared/schema";
import { log } from "./logger"; // Assuming a logger function exists


export function registerRoutes(app: Express) {
  // Message routes
  app.get("/api/messages/:conversationId?", async (req, res) => {
    const conversationId = req.params.conversationId ? parseInt(req.params.conversationId) : undefined;
    const messages = await storage.getMessages(conversationId);
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    const result = insertMessageSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const message = await storage.createMessage({
      ...result.data,
      conversationId: req.body.conversationId,
      profileId: req.body.profileId,
    });
    res.json(message);
  });

  app.post("/api/messages/bulk", async (req, res) => {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: "Expected an array of messages" });
    }

    const messages = req.body.map(msg => ({
      content: msg.content,
      sender: msg.sender,
      avatar: msg.avatar,
      conversationId: msg.conversationId,
      profileId: msg.profileId,
    }));

    const savedMessages = await storage.createMessages(messages);
    res.json(savedMessages);
  });

  app.delete("/api/messages/:conversationId", async (req, res) => {
    const conversationId = parseInt(req.params.conversationId);
    await storage.clearMessages(conversationId);
    res.status(204).send();
  });

  // Profile routes
  app.get("/api/profiles", async (_req, res) => {
    const profiles = await storage.getProfiles();
    res.json(profiles);
  });

  app.post("/api/profiles", async (req, res) => {
    const result = insertProfileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const profile = await storage.createProfile(result.data);
    res.json(profile);
  });

  app.patch("/api/profiles/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const result = insertProfileSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const profile = await storage.updateProfile(id, result.data);
    res.json(profile);
  });

  // Conversation routes
  app.get("/api/conversations", async (_req, res) => {
    const conversations = await storage.getConversations();
    res.json(conversations);
  });

  app.post("/api/conversations", async (req, res) => {
    const result = insertConversationSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const conversation = await storage.createConversation(result.data);
    res.json(conversation);
  });

  app.patch("/api/conversations/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const result = insertConversationSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const conversation = await storage.updateConversation(id, result.data);
    res.json(conversation);
  });

  // Error handling middleware
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error with request details
    log(`Error ${status} on ${req.method} ${req.path}: ${message}`, "error");

    if (status >= 500) {
      log(`Stack trace: ${err.stack}`, "error");
    }

    res.status(status).json({ 
      error: {
        message,
        status,
        path: req.path,
        timestamp: new Date().toISOString()
      }
    });
  });

  return createServer(app);
}