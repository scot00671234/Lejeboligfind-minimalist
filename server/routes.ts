import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertPropertySchema,
  insertMessageSchema,
  loginSchema,
  propertySearchSchema,
} from "@shared/schema";
import { z } from "zod";

// Session configuration
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "your-secret-key-here",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

// Auth middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(getSession());

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });
      
      // Set session
      req.session.userId = user.id;
      
      res.json({ user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const isValidPassword = await bcrypt.compare(data.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Set session
      req.session.userId = user.id;
      
      res.json({ user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json({ user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Property routes
  app.get("/api/properties", async (req, res) => {
    try {
      const search = propertySearchSchema.parse({
        query: req.query.query,
        type: req.query.type,
        minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
        minRooms: req.query.minRooms ? parseInt(req.query.minRooms as string) : undefined,
        maxRooms: req.query.maxRooms ? parseInt(req.query.maxRooms as string) : undefined,
      });
      
      const properties = await storage.getProperties(search);
      res.json(properties);
    } catch (error) {
      console.error("Get properties error:", error);
      res.status(500).json({ message: "Failed to get properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      res.json(property);
    } catch (error) {
      console.error("Get property error:", error);
      res.status(500).json({ message: "Failed to get property" });
    }
  });

  app.post("/api/properties", requireAuth, async (req, res) => {
    try {
      const data = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(data, req.session.userId);
      res.json(property);
    } catch (error) {
      console.error("Create property error:", error);
      res.status(400).json({ message: "Invalid property data" });
    }
  });

  app.put("/api/properties/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertPropertySchema.partial().parse(req.body);
      
      const property = await storage.updateProperty(id, data, req.session.userId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found or not owned by user" });
      }
      
      res.json(property);
    } catch (error) {
      console.error("Update property error:", error);
      res.status(400).json({ message: "Invalid property data" });
    }
  });

  app.delete("/api/properties/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProperty(id, req.session.userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Property not found or not owned by user" });
      }
      
      res.json({ message: "Property deleted successfully" });
    } catch (error) {
      console.error("Delete property error:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  app.get("/api/my-properties", requireAuth, async (req, res) => {
    try {
      const properties = await storage.getUserProperties(req.session.userId);
      res.json(properties);
    } catch (error) {
      console.error("Get user properties error:", error);
      res.status(500).json({ message: "Failed to get user properties" });
    }
  });

  // Message routes
  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const data = insertMessageSchema.parse({
        ...req.body,
        senderId: req.session.userId,
      });
      
      const message = await storage.createMessage(data);
      res.json(message);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  app.get("/api/properties/:id/messages", requireAuth, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const messages = await storage.getPropertyMessages(propertyId, req.session.userId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.put("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      await storage.markMessageAsRead(messageId, req.session.userId);
      res.json({ message: "Message marked as read" });
    } catch (error) {
      console.error("Mark message as read error:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
