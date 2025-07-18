import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import multer from "multer";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertPropertySchema,
  insertMessageSchema,
  frontendMessageSchema,
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
  
  const isProduction = process.env.NODE_ENV === "production";
  
  return session({
    secret: process.env.SESSION_SECRET || "your-secret-key-here",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: "connect.sid",
    cookie: {
      httpOnly: true,
      secure: isProduction, // True for production (HTTPS), false for development
      maxAge: sessionTtl,
      sameSite: isProduction ? "none" : "lax", // 'none' for cross-origin in production
      path: "/", // Explicitly set path
      domain: undefined, // Let browser determine domain automatically
    },
  });
}

// Extend session type
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// Auth middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads (memory storage for small images)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
  });

  // Session middleware
  app.use(getSession());

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Additional server-side validation for security
      if (!data.password || data.password.length < 6) {
        return res.status(400).json({ message: "Adgangskoden skal være mindst 6 tegn" });
      }
      
      if (!data.name || data.name.trim().length === 0) {
        return res.status(400).json({ message: "Navn er påkrævet" });
      }
      
      if (!data.email || !data.email.includes('@')) {
        return res.status(400).json({ message: "Ugyldig email-adresse" });
      }
      
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
      
      // Set session and save explicitly
      req.session.userId = user.id;
      
      // Save session and send response
      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error during registration:", err);
          return res.status(500).json({ message: "Registration failed" });
        }
        res.json({ user: { id: user.id, email: user.email, name: user.name } });
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
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
      
      // Set session and save explicitly
      req.session.userId = user.id;
      
      console.log("Login - Setting session userId:", user.id);
      console.log("Login - Session before save:", req.session);
      console.log("Login - Request headers:", req.headers);
      console.log("Login - Request host:", req.get('host'));
      
      // Save session and send response
      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error during login:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        console.log("Login - Session after save:", req.session);
        console.log("Login - Session ID:", req.sessionID);
        console.log("Login - Response headers about to be sent:", res.getHeaders());
        
        res.json({ user: { id: user.id, email: user.email, name: user.name } });
      });
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

  app.get("/api/auth/me", async (req: any, res: any) => {
    try {
      console.log("Auth me request - Session ID:", req.sessionID);
      console.log("Auth me request - Session data:", req.session);
      console.log("Auth me request - Cookies:", req.headers.cookie);
      
      // Check if session exists and has userId
      if (!req.session?.userId) {
        console.log("No session or userId found");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        console.log("User not found in database:", req.session.userId);
        return res.status(401).json({ message: "User not found" });
      }
      
      console.log("User found:", { id: user.id, email: user.email, name: user.name });
      res.json({ id: user.id, email: user.email, name: user.name });
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
        sortBy: req.query.sortBy as any,
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
      
      // Return the property with userId for editing purposes
      const propertyWithUserId = {
        ...property,
        userId: property.user?.id || property.userId
      };
      
      res.json(propertyWithUserId);
    } catch (error) {
      console.error("Get property error:", error);
      res.status(500).json({ message: "Failed to get property" });
    }
  });

  app.post("/api/properties", requireAuth, async (req: any, res: any) => {
    try {
      console.log("Creating property with data:", req.body);
      const data = insertPropertySchema.parse(req.body);
      console.log("Parsed data:", data);
      const property = await storage.createProperty(data, req.session.userId);
      console.log("Created property:", property);
      res.json(property);
    } catch (error) {
      console.error("Create property error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(400).json({ message: "Invalid property data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/properties/:id", requireAuth, async (req: any, res: any) => {
    try {
      console.log("PUT - Updating property with ID:", req.params.id);
      console.log("PUT - Update data:", req.body);
      const id = parseInt(req.params.id);
      const data = insertPropertySchema.partial().parse(req.body);
      console.log("PUT - Parsed update data:", data);
      
      const property = await storage.updateProperty(id, data, req.session.userId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found or not owned by user" });
      }
      
      console.log("PUT - Updated property:", property);
      res.json(property);
    } catch (error) {
      console.error("PUT - Update property error:", error);
      if (error instanceof Error) {
        console.error("PUT - Error message:", error.message);
        console.error("PUT - Error stack:", error.stack);
      }
      res.status(400).json({ message: "Invalid property data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/properties/:id", requireAuth, async (req: any, res: any) => {
    try {
      console.log("PATCH - Updating property with ID:", req.params.id);
      console.log("PATCH - Update data:", req.body);
      const id = parseInt(req.params.id);
      const data = insertPropertySchema.partial().parse(req.body);
      console.log("PATCH - Parsed update data:", data);
      
      const property = await storage.updateProperty(id, data, req.session.userId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found or not owned by user" });
      }
      
      console.log("PATCH - Updated property:", property);
      res.json(property);
    } catch (error) {
      console.error("PATCH - Update property error:", error);
      if (error instanceof Error) {
        console.error("PATCH - Error message:", error.message);
        console.error("PATCH - Error stack:", error.stack);
      }
      res.status(400).json({ message: "Invalid property data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/properties/:id", requireAuth, async (req: any, res: any) => {
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

  app.get("/api/my-properties", requireAuth, async (req: any, res: any) => {
    try {
      console.log("Getting properties for user ID:", req.session.userId);
      const properties = await storage.getUserProperties(req.session.userId);
      console.log("Found properties:", properties.length, "for user", req.session.userId);
      res.json(properties);
    } catch (error) {
      console.error("Get user properties error:", error);
      res.status(500).json({ message: "Failed to get user properties" });
    }
  });

  // Image upload route
  app.post("/api/upload", requireAuth, upload.single('image'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image provided" });
      }
      
      // Convert image buffer to base64 data URL
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      // In a real app, you would upload to a cloud storage service like AWS S3, Cloudinary, etc.
      // For this demo, we'll return the base64 data URL
      res.json({ imageUrl: base64Image });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Message routes
  app.post("/api/messages", requireAuth, async (req: any, res: any) => {
    try {
      console.log("Create message - Request body:", req.body);
      console.log("Create message - User ID:", req.session.userId);
      
      // First validate frontend data without senderId
      const frontendData = frontendMessageSchema.parse(req.body);
      
      // Then create full message data with senderId from session
      const data = {
        ...frontendData,
        senderId: req.session.userId,
      };
      
      console.log("Create message - Parsed data:", data);
      
      // Prevent users from messaging themselves
      if (data.senderId === data.receiverId) {
        return res.status(400).json({ message: "Cannot send message to yourself" });
      }
      
      const message = await storage.createMessage(data);
      console.log("Create message - Created message:", message);
      res.json(message);
    } catch (error) {
      console.error("Create message error:", error);
      if (error.name === "ZodError") {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ 
          message: "Invalid message data", 
          errors: error.errors 
        });
      }
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  app.get("/api/properties/:id/messages", requireAuth, async (req: any, res: any) => {
    try {
      const propertyId = parseInt(req.params.id);
      const messages = await storage.getPropertyMessages(propertyId, req.session.userId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.get("/api/messages", requireAuth, async (req: any, res: any) => {
    try {
      const messages = await storage.getAllUserMessages(req.session.userId);
      res.json(messages);
    } catch (error) {
      console.error("Get all messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Messages endpoints as specified
  app.get("/api/messages/conversations", requireAuth, async (req: any, res: any) => {
    try {
      console.log("Getting conversations for user:", req.session.userId);
      const conversations = await storage.getUserConversations(req.session.userId);
      console.log("Found conversations:", conversations.length);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  app.get("/api/messages/:conversationId", requireAuth, async (req: any, res: any) => {
    try {
      const { conversationId } = req.params;
      console.log('Fetching messages for conversation ID:', conversationId);
      console.log('Current user ID:', req.session.userId);
      
      // Parse conversationId format: "propertyId-userId1-userId2" 
      const parts = conversationId.split('-');
      if (parts.length !== 3) {
        console.error('Invalid conversation ID format:', conversationId);
        return res.status(400).json({ message: 'Invalid conversation ID format' });
      }

      const [propertyId, userId1, userId2] = parts.map(Number);
      const currentUserId = req.session.userId;
      
      // Determine the other user ID
      const otherUserId = userId1 === currentUserId ? userId2 : userId1;
      
      console.log('Fetching messages for property:', propertyId, 'between users:', currentUserId, 'and', otherUserId);
      
      const messages = await storage.getConversationMessages(propertyId, currentUserId, otherUserId);
      console.log('Found messages:', messages.length);
      
      res.json(messages.reverse()); // Return oldest first for proper display order
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await storage.markMessageAsRead(messageId, userId);
      res.json({ message: "Message marked as read" });
    } catch (error) {
      console.error("Mark message as read error:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Image upload endpoint (simplified - stores as base64 in database)
  app.post("/api/upload", requireAuth, async (req, res) => {
    try {
      // For now, we'll use a simple base64 approach
      // In production, you'd use a proper file storage service
      const imageData = req.body.image;
      if (!imageData) {
        return res.status(400).json({ message: "No image provided" });
      }
      
      // Return the image URL (in this case, the base64 data)
      res.json({ imageUrl: imageData });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
