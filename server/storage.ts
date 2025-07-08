import {
  users,
  properties,
  messages,
  type User,
  type InsertUser,
  type Property,
  type InsertProperty,
  type Message,
  type InsertMessage,
  type PropertyWithUser,
  type PropertySearch,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, gte, lte, ilike, desc, not } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const usersReceiver = alias(users, "usersReceiver");

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Property operations
  getProperty(id: number): Promise<PropertyWithUser | undefined>;
  getProperties(search?: PropertySearch): Promise<PropertyWithUser[]>;
  getUserProperties(userId: number): Promise<Property[]>;
  createProperty(property: InsertProperty, userId: number): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>, userId: number): Promise<Property | undefined>;
  deleteProperty(id: number, userId: number): Promise<boolean>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getPropertyMessages(propertyId: number, userId: number): Promise<Message[]>;
  getAllUserMessages(userId: number): Promise<any[]>;
  getConversationMessages(propertyId: number, userId: number, otherUserId: number, page?: number, limit?: number): Promise<Message[]>;
  getUserConversations(userId: number): Promise<any[]>;
  markMessageAsRead(messageId: number, userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Property operations
  async getProperty(id: number): Promise<PropertyWithUser | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .leftJoin(users, eq(properties.userId, users.id))
      .where(eq(properties.id, id));
    
    if (!property || !property.users) return undefined;
    
    return {
      ...property.properties,
      user: property.users,
    };
  }

  async getProperties(search?: PropertySearch): Promise<PropertyWithUser[]> {
    let query = db
      .select()
      .from(properties)
      .leftJoin(users, eq(properties.userId, users.id))
      .where(eq(properties.available, true));

    if (search) {
      const searchConditions = [];
      
      if (search.query) {
        searchConditions.push(
          or(
            ilike(properties.title, `%${search.query}%`),
            ilike(properties.address, `%${search.query}%`),
            ilike(properties.description, `%${search.query}%`)
          )
        );
      }
      
      if (search.type) {
        searchConditions.push(eq(properties.type, search.type));
      }
      
      if (search.minPrice) {
        searchConditions.push(gte(properties.price, search.minPrice));
      }
      
      if (search.maxPrice) {
        searchConditions.push(lte(properties.price, search.maxPrice));
      }
      
      if (search.minRooms) {
        searchConditions.push(gte(properties.rooms, search.minRooms));
      }
      
      if (search.maxRooms) {
        searchConditions.push(lte(properties.rooms, search.maxRooms));
      }

      if (searchConditions.length > 0) {
        query = db
          .select()
          .from(properties)
          .leftJoin(users, eq(properties.userId, users.id))
          .where(and(eq(properties.available, true), ...searchConditions));
      }
    }

    // Add sorting based on search parameters
    let sortedQuery = query;
    if (search?.sortBy) {
      switch (search.sortBy) {
        case 'price_asc':
          sortedQuery = query.orderBy(properties.price);
          break;
        case 'price_desc':
          sortedQuery = query.orderBy(desc(properties.price));
          break;
        case 'date_asc':
          sortedQuery = query.orderBy(properties.createdAt);
          break;
        case 'date_desc':
          sortedQuery = query.orderBy(desc(properties.createdAt));
          break;
        default:
          sortedQuery = query.orderBy(desc(properties.createdAt));
      }
    } else {
      sortedQuery = query.orderBy(desc(properties.createdAt));
    }
    
    const results = await sortedQuery;
    
    return results
      .filter(result => result.users)
      .map(result => ({
        ...result.properties,
        user: result.users!,
      }));
  }

  async getUserProperties(userId: number): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(eq(properties.userId, userId))
      .orderBy(desc(properties.createdAt));
  }

  async createProperty(property: InsertProperty, userId: number): Promise<Property> {
    const [newProperty] = await db
      .insert(properties)
      .values({ ...property, userId })
      .returning();
    return newProperty;
  }

  async updateProperty(id: number, property: Partial<InsertProperty>, userId: number): Promise<Property | undefined> {
    const [updatedProperty] = await db
      .update(properties)
      .set({ ...property, updatedAt: new Date() })
      .where(and(eq(properties.id, id), eq(properties.userId, userId)))
      .returning();
    return updatedProperty;
  }

  async deleteProperty(id: number, userId: number): Promise<boolean> {
    // First delete all messages related to this property
    await db
      .delete(messages)
      .where(eq(messages.propertyId, id));
    
    // Then delete the property
    const result = await db
      .delete(properties)
      .where(and(eq(properties.id, id), eq(properties.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getPropertyMessages(propertyId: number, userId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.propertyId, propertyId),
          or(
            eq(messages.senderId, userId),
            eq(messages.receiverId, userId)
          )
        )
      )
      .orderBy(messages.createdAt);
  }

  async getAllUserMessages(userId: number): Promise<any[]> {
    const senderUsers = alias(users, "senderUsers");
    const receiverUsers = alias(users, "receiverUsers");
    
    return await db
      .select({
        id: messages.id,
        content: messages.content,
        propertyId: messages.propertyId,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        createdAt: messages.createdAt,
        read: messages.read,
        property: {
          id: properties.id,
          title: properties.title,
          address: properties.address,
          price: properties.price,
          type: properties.type,
        },
        sender: {
          id: senderUsers.id,
          name: senderUsers.name,
          email: senderUsers.email,
        },
        receiver: {
          id: receiverUsers.id,
          name: receiverUsers.name,
          email: receiverUsers.email,
        },
      })
      .from(messages)
      .innerJoin(properties, eq(messages.propertyId, properties.id))
      .innerJoin(senderUsers, eq(messages.senderId, senderUsers.id))
      .innerJoin(receiverUsers, eq(messages.receiverId, receiverUsers.id))
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      )
      .orderBy(messages.createdAt);
  }

  async getConversationMessages(propertyId: number, userId: number, otherUserId: number, page = 1, limit = 50): Promise<Message[]> {
    const offset = (page - 1) * limit;
    const senderUsers = alias(users, "senderUsers");
    const receiverUsers = alias(users, "receiverUsers");
    
    return await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        propertyId: messages.propertyId,
        createdAt: messages.createdAt,
        read: messages.read,
        sender: {
          id: senderUsers.id,
          name: senderUsers.name,
          email: senderUsers.email,
        },
        receiver: {
          id: receiverUsers.id,
          name: receiverUsers.name,
          email: receiverUsers.email,
        },
        property: {
          id: properties.id,
          title: properties.title,
          address: properties.address,
          price: properties.price,
          type: properties.type,
        },
      })
      .from(messages)
      .innerJoin(properties, eq(messages.propertyId, properties.id))
      .innerJoin(senderUsers, eq(messages.senderId, senderUsers.id))
      .innerJoin(receiverUsers, eq(messages.receiverId, receiverUsers.id))
      .where(
        and(
          eq(messages.propertyId, propertyId),
          or(
            and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
            and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
          ),
          // Exclude any self-messages (extra safety)
          not(eq(messages.senderId, messages.receiverId))
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUserConversations(userId: number): Promise<any[]> {
    const senderUsers = alias(users, "senderUsers");
    const receiverUsers = alias(users, "receiverUsers");
    
    // Get all messages for this user with all needed data, excluding self-messages
    const userMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        propertyId: messages.propertyId,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        createdAt: messages.createdAt,
        read: messages.read,
        property: {
          id: properties.id,
          title: properties.title,
          address: properties.address,
          price: properties.price,
          type: properties.type,
        },
        sender: {
          id: senderUsers.id,
          name: senderUsers.name,
          email: senderUsers.email,
        },
        receiver: {
          id: receiverUsers.id,
          name: receiverUsers.name,
          email: receiverUsers.email,
        },
      })
      .from(messages)
      .innerJoin(properties, eq(messages.propertyId, properties.id))
      .innerJoin(senderUsers, eq(messages.senderId, senderUsers.id))
      .innerJoin(receiverUsers, eq(messages.receiverId, receiverUsers.id))
      .where(
        and(
          or(
            eq(messages.senderId, userId),
            eq(messages.receiverId, userId)
          ),
          // Exclude self-messages
          not(eq(messages.senderId, messages.receiverId))
        )
      )
      .orderBy(desc(messages.createdAt));

    // Group messages into conversations
    const conversationMap = new Map<string, any>();
    
    userMessages.forEach(message => {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      const otherUserName = message.senderId === userId ? message.receiver.name : message.sender.name;
      
      // Skip if somehow we still have a self-message
      if (otherUserId === userId) {
        return;
      }
      
      // Create consistent conversation key
      const conversationKey = `${message.propertyId}-${Math.min(userId, otherUserId)}-${Math.max(userId, otherUserId)}`;
      
      if (!conversationMap.has(conversationKey)) {
        conversationMap.set(conversationKey, {
          id: conversationKey,
          propertyId: message.propertyId,
          otherUserId,
          otherUserName,
          propertyTitle: message.property.title,
          propertyAddress: message.property.address,
          lastMessage: message,
          unreadCount: 0,
        });
      }
      
      const conversation = conversationMap.get(conversationKey)!;
      
      // Update last message if this one is newer
      if (new Date(message.createdAt) > new Date(conversation.lastMessage.createdAt)) {
        conversation.lastMessage = message;
      }
      
      // Count unread messages for current user
      if (message.receiverId === userId && !message.read) {
        conversation.unreadCount++;
      }
    });
    
    return Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.receiverId, userId)
        )
      );
  }
}

export const storage = new DatabaseStorage();
