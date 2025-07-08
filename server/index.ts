import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runMigrations } from "./migrations";
import { setupWebSocket } from "./websocket";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('Starting application...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Database URL configured:', !!process.env.DATABASE_URL);
    
    // Run database migrations first
    console.log('Initializing database...');
    await runMigrations();
    console.log('Database initialization completed successfully');
    
    console.log('Setting up API routes...');
    const server = await registerRoutes(app);
  
  // Setup WebSocket
  const io = setupWebSocket(server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use Railway's PORT environment variable or default to 5000 for development
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log(`WebSocket server ready`, "websocket");
    console.log('🚀 Application started successfully and ready to handle requests');
    console.log('📊 Database tables created and ready');
    console.log('💬 Messaging system active with WebSocket support');
    console.log(`🌐 Server accessible at http://0.0.0.0:${port}`);
  });
  } catch (error) {
    console.error('❌ CRITICAL ERROR: Failed to start application');
    console.error('Error details:', error);
    console.error('This is likely a database connection issue. Check your DATABASE_URL environment variable.');
    process.exit(1);
  }
})();
