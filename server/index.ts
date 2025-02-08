import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import session from "express-session";
import MemoryStore from "memorystore";
import compression from "compression";

interface SystemError extends Error {
  code?: string;
  errno?: number;
  syscall?: string;
  address?: string;
  port?: number;
}

const app = express();

// Enhanced error logging middleware
const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const requestId = res.getHeader('X-Request-ID');
  log(`[${timestamp}] ERROR [${requestId}]: ${err.message}`);
  if (err.stack) {
    log(`Stack trace for ${requestId}:\n${err.stack}`);
  }
  next(err);
};

app.use(errorLogger);

app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));

app.use(express.json({
  limit: '1mb',
  verify: (req: Request, res: Response, buf: Buffer, encoding: string) => {
    try {
      if (buf.length > 0) {
        JSON.parse(buf.toString(encoding));
      }
    } catch (e) {
      res.status(400).json({ 
        error: { 
          message: "Invalid JSON payload",
          details: e instanceof Error ? e.message : "Parsing error"
        } 
      });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ extended: false }));

// Configure memory-efficient session store with error handling
const MemoryStoreSession = MemoryStore(session);
const sessionStore = new MemoryStoreSession({
  checkPeriod: 86400000,
  max: 100000,
  dispose: (key: string, value: any) => {
    log(`Session expired: ${key}`);
  }
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400000,
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
  log(`Unhandled Rejection at: ${promise}\nReason: ${reason instanceof Error ? reason.stack : String(reason)}`);
});

// Function to try different ports if the default one is in use
async function startServer(initialPort: number, maxAttempts: number = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = initialPort + attempt;
    try {
      const server = registerRoutes(app);

      // Global error handler
      app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        const requestId = res.getHeader('X-Request-ID');

        // Enhanced error classification
        const errorResponse = {
          error: {
            message,
            status,
            path: req.path,
            requestId,
            timestamp: new Date().toISOString(),
            type: err.type || 'UnknownError',
            code: err.code,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
          }
        };

        log(`ERROR [${requestId}] [${status}] ${req.method} ${req.path}: ${message}`);
        if (err.stack) {
          log(`Stack trace for ${requestId}: ${err.stack}`);
        }

        res.status(status).json(errorResponse);
      });

      if (app.get("env") === "development") {
        await setupVite(app, server);
      } else {
        serveStatic(app);
      }

      // Enhanced server startup with proper port waiting
      await new Promise<void>((resolve, reject) => {
        let isListening = false;

        const serverInstance = server.listen(port, '0.0.0.0')
          .once('listening', () => {
            isListening = true;
            log(`Server started successfully on 0.0.0.0:${port}`);
            console.log(`Ready | Server listening at http://0.0.0.0:${port}`);

            // Signal that the server is ready
            process.send?.({ ready: true, port });

            resolve();
          })
          .once('error', (err: SystemError) => {
            if (!isListening) {
              if (err.code === 'EADDRINUSE') {
                log(`Port ${port} is in use, trying next port...`);
                serverInstance.close();
                resolve(); // Continue to next attempt
              } else {
                reject(err);
              }
            }
          });

        // Add graceful shutdown handler
        const shutdown = async () => {
          if (isListening) {
            log('Starting graceful shutdown...');
            await new Promise((resolve) => serverInstance.close(resolve));
            await pool.end();
            log('Server shutdown completed');
          }
        };

        process.once('SIGTERM', shutdown);
        process.once('SIGINT', shutdown);
      });

      // If we got here without error, server started successfully
      return;
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        log(`Failed to start server after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
      // Log the attempt and continue
      log(`Attempt ${attempt + 1} failed, trying next port...`);
    }
  }
}

// Start the server with enhanced error handling
const PORT = Number(process.env.PORT) || 5000;
startServer(PORT).catch(error => {
  log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

// Enhance error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.stack || error.message}`);
  // Attempt graceful shutdown
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});