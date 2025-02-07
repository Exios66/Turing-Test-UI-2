import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { insertMessageSchema, insertProfileSchema, insertConversationSchema } from "@shared/schema";
import { log } from "./vite";
import { checkDatabaseConnection } from "./db";

const MAX_CLIENTS = 1000; // Maximum number of concurrent WebSocket connections
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CLIENT_TIMEOUT = 120000; // 2 minutes

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
  lastMessageTime: number;
}

export function registerRoutes(app: Express) {
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Track connected clients with extended information
  const clients = new Map<ExtendedWebSocket, { connectTime: number }>();

  function heartbeat(ws: ExtendedWebSocket) {
    ws.isAlive = true;
    ws.lastMessageTime = Date.now();
  }

  // Periodic cleanup and health check
  const interval = setInterval(() => {
    const now = Date.now();
    wss.clients.forEach((client) => {
      const ws = client as ExtendedWebSocket;
      if (!ws.isAlive) {
        clients.delete(ws);
        return ws.terminate();
      }

      // Check for client timeout
      if (now - ws.lastMessageTime > CLIENT_TIMEOUT) {
        log(`Client timed out, terminating connection`);
        clients.delete(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });

    // Log active connections
    log(`Active WebSocket connections: ${clients.size}`);
  }, HEARTBEAT_INTERVAL);

  wss.on('connection', (ws: WebSocket, req) => {
    // Extend the WebSocket instance
    const extWs = ws as ExtendedWebSocket;
    extWs.isAlive = true;
    extWs.lastMessageTime = Date.now();

    // Check maximum connections
    if (clients.size >= MAX_CLIENTS) {
      log(`Connection rejected: Maximum clients (${MAX_CLIENTS}) reached`);
      extWs.close(1013, 'Maximum connections reached');
      return;
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    log(`WebSocket client connected from ${clientIp}`);

    clients.set(extWs, { connectTime: Date.now() });

    extWs.on('pong', () => heartbeat(extWs));

    extWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        extWs.lastMessageTime = Date.now();

        // Validate message structure
        if (!message || typeof message !== 'object') {
          throw new Error('Invalid message format');
        }

        log(`Received message from ${clientIp}: ${JSON.stringify(message).slice(0, 100)}...`);

        // Broadcast message to all connected clients
        let broadcastCount = 0;
        wss.clients.forEach((client) => {
          if (client !== extWs && client.readyState === WebSocket.OPEN) {
            try {
              client.send(JSON.stringify(message));
              broadcastCount++;
            } catch (error) {
              log(`Failed to send message to client: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        });
        log(`Broadcasted message to ${broadcastCount} clients`);
      } catch (error) {
        log(`WebSocket message error: ${error instanceof Error ? error.message : String(error)}`);
        extWs.send(JSON.stringify({ 
          error: 'Failed to process message',
          details: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    });

    extWs.on('error', (error) => {
      log(`WebSocket error for client ${clientIp}: ${error.message}`);
      clients.delete(extWs);
    });

    extWs.on('close', () => {
      log(`WebSocket client disconnected: ${clientIp}`);
      clients.delete(extWs);
    });

    // Send initial connection success message
    extWs.send(JSON.stringify({ 
      type: 'connection', 
      status: 'connected',
      timestamp: new Date().toISOString()
    }));
  });

  // Cleanup interval when server closes
  wss.on('close', () => {
    clearInterval(interval);
  });

  // Request validation middleware
  const validateRequest = (schema: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: {
            message: "Validation failed",
            details: result.error.errors
          }
        });
      }
      req.body = result.data;
      next();
    };
  };

  // Message routes with validation
  app.get("/api/messages/:conversationId?", async (req, res, next) => {
    try {
      const conversationId = req.params.conversationId ? parseInt(req.params.conversationId) : undefined;
      const messages = await storage.getMessages(conversationId);
      log(`Fetching messages${conversationId ? ` for conversation ${conversationId}` : ''}`);
      res.json(messages);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/messages", validateRequest(insertMessageSchema), async (req, res, next) => {
    try {
      const message = await storage.createMessage({
        ...req.body,
        conversationId: req.body.conversationId,
        profileId: req.body.profileId,
        timestamp: new Date(),
      });
      log(`Created new message from ${req.body.sender}`);
      res.json(message);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/messages/bulk", validateRequest(insertMessageSchema), async (req, res, next) => {
    try {
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: "Expected an array of messages" });
      }

      const messages = req.body.map(msg => ({
        content: msg.content,
        sender: msg.sender,
        avatar: msg.avatar,
        conversationId: msg.conversationId,
        profileId: msg.profileId,
        timestamp: new Date(),
      }));

      const savedMessages = await storage.createMessages(messages);
      log(`Bulk created ${savedMessages.length} messages`);
      res.json(savedMessages);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/messages/:conversationId", async (req, res, next) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      await storage.clearMessages(conversationId);
      log(`Cleared messages for conversation ${conversationId}`);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Profile routes
  app.get("/api/profiles", async (_req, res, next) => {
    try {
      const profiles = await storage.getProfiles();
      log("Fetching all profiles");
      res.json(profiles);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/profiles", validateRequest(insertProfileSchema), async (req, res, next) => {
    try {
      const profile = await storage.createProfile({
        ...req.body,
        createdAt: new Date(),
      });
      log(`Created new profile: ${req.body.name}`);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/profiles/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertProfileSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      const profile = await storage.updateProfile(id, result.data);
      log(`Updated profile ${id}`);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  });

  // Conversation routes
  app.get("/api/conversations", async (_req, res, next) => {
    try {
      const conversations = await storage.getConversations();
      log("Fetching all conversations");
      res.json(conversations);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/conversations", validateRequest(insertConversationSchema), async (req, res, next) => {
    try {
      const conversation = await storage.createConversation({
        ...req.body,
        createdAt: new Date(),
      });
      log(`Created new conversation: ${req.body.name}`);
      res.json(conversation);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/conversations/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertConversationSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      const conversation = await storage.updateConversation(id, result.data);
      log(`Updated conversation ${id}`);
      res.json(conversation);
    } catch (error) {
      next(error);
    }
  });

  // Health check endpoint
  app.get("/health", async (_req, res) => {
    try {
      const dbStatus = await checkDatabaseConnection();
      res.json({ 
        status: "ok",
        timestamp: new Date().toISOString(),
        database: dbStatus ? "connected" : "error",
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(503).json({ 
        status: "error",
        message: error instanceof Error ? error.message : "Service unavailable"
      });
    }
  });

  // Cache control middleware for static assets
  app.use("/assets", (req, res, next) => {
    // Cache static assets for 1 day
    res.setHeader("Cache-Control", "public, max-age=86400");
    next();
  });

  // Rate limiting middleware with type safety
  const rateLimit = new Map<string, { count: number, lastReset: number }>();
  app.use((req, res, next) => {
    const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = 100; // Max requests per window

    if (!clientIp) {
      log('Warning: Unable to determine client IP address');
      return next();
    }

    const client = rateLimit.get(clientIp) || { count: 0, lastReset: now };

    if (now - client.lastReset > windowMs) {
      client.count = 0;
      client.lastReset = now;
    }

    client.count++;
    rateLimit.set(clientIp, client);

    if (client.count > maxRequests) {
      return res.status(429).json({ 
        error: {
          message: "Too many requests",
          retryAfter: Math.ceil((client.lastReset + windowMs - now) / 1000)
        }
      });
    }

    next();
  });

  // Error handling middleware
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const requestId = res.getHeader('X-Request-ID');

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
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  });

  return server;
}