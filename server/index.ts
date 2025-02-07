import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
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

(async () => {
  const server = registerRoutes(app);

  // Global error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    log(`ERROR [${status}] ${req.method} ${req.path}: ${message}`);
    if (err.stack) {
      log(`Stack trace: ${err.stack}`);
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

  // Setup vite only in development
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server started successfully, listening on port ${PORT}`);
    // Signal that the server is ready by writing to stdout
    console.log(`Server is ready! Listening on port ${PORT}`);
  });
})().catch((error) => {
  log(`Failed to start server: ${error.message}`);
  process.exit(1);
});