import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";

export function setupWebSocket(server: HttpServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Store user sessions: socketId -> userId
  const userSessions = new Map<string, number>();
  
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle user authentication
    socket.on("authenticate", (userId: number) => {
      userSessions.set(socket.id, userId);
      socket.join(`user_${userId}`);
      console.log(`User ${userId} authenticated with socket ${socket.id}`);
    });

    // Handle sending messages
    socket.on("send_message", async (data: { 
      propertyId: number; 
      receiverId: number; 
      content: string; 
    }) => {
      try {
        const senderId = userSessions.get(socket.id);
        if (!senderId) {
          socket.emit("error", { message: "Not authenticated" });
          return;
        }

        // Create message in database
        const message = await storage.createMessage({
          propertyId: data.propertyId,
          senderId,
          receiverId: data.receiverId,
          content: data.content
        });

        // Send to both sender and receiver
        io.to(`user_${senderId}`).emit("new_message", message);
        io.to(`user_${data.receiverId}`).emit("new_message", message);
        
      } catch (error) {
        console.error("WebSocket message error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle joining conversation rooms
    socket.on("join_conversation", (data: { propertyId: number; otherUserId: number }) => {
      const userId = userSessions.get(socket.id);
      if (!userId) return;
      
      // Create a consistent room name for the conversation
      const participants = [userId, data.otherUserId].sort((a, b) => a - b);
      const roomName = `conversation_${data.propertyId}_${participants[0]}_${participants[1]}`;
      socket.join(roomName);
    });

    // Handle marking messages as read
    socket.on("mark_read", async (messageId: number) => {
      try {
        const userId = userSessions.get(socket.id);
        if (!userId) return;
        
        await storage.markMessageAsRead(messageId, userId);
        socket.emit("message_read", { messageId });
      } catch (error) {
        console.error("Mark read error:", error);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const userId = userSessions.get(socket.id);
      if (userId) {
        socket.leave(`user_${userId}`);
        userSessions.delete(socket.id);
        console.log(`User ${userId} disconnected`);
      }
    });
  });

  return io;
}