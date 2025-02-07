import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import session from "express-session";
import MemoryStore from "memorystore";
import compression from "compression";

const app = express();
app.use(compression({
  // Compress everything above 1kb
  threshold: 1024,
  // Don't compress responses with this response header
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  // zlib option for compression level
  level: 6
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure memory-efficient session store
const MemoryStoreSession = MemoryStore(session);
const sessionStore = new MemoryStoreSession({
  checkPeriod: 86400000, // Prune expired entries every 24h
  max: 100000, // Maximum number of sessions to store
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400000, // 24 hours
    httpOnly: true,
  }
}));

// Enhanced logging middleware with request ID tracking
app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substring(7);
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `[${requestId}] ${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const responsePreview = JSON.stringify(capturedJsonResponse);
        if (responsePreview.length > 100) {
          logLine += ` :: ${responsePreview.slice(0, 97)}...`;
        } else {
          logLine += ` :: ${responsePreview}`;
        }
      }
      log(logLine);
    }
  });

  next();
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  log(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close database connections
    await pool.end();
    log('Database connections closed.');

    // Clean up session store
    sessionStore.clear();
    log('Session store cleared.');

    process.exit(0);
  } catch (error) {
    log(`Error during shutdown: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

(async () => {
  try {
    const server = registerRoutes(app);

    // Global error handler
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      const requestId = res.getHeader('X-Request-ID');

      log(`ERROR [${requestId}] [${status}] ${req.method} ${req.path}: ${message}`);
      if (err.stack) {
        log(`Stack trace for ${requestId}: ${err.stack}`);
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

    // Setup vite only in development
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, () => {
      log(`Server started successfully, listening on port ${PORT}`);
      // Signal that the server is ready by writing to stdout
      console.log(`Server is ready! Listening on port ${PORT}`);
    });
  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
})();