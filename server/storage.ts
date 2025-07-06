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
import { eq, and, or, gte, lte, ilike, desc } from "drizzle-orm";
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
      const conditions = [];
      
      if (search.query) {
        conditions.push(
          or(
            ilike(properties.title, `%${search.query}%`),
            ilike(properties.address, `%${search.query}%`),
            ilike(properties.description, `%${search.query}%`)
          )
        );
      }
      
      if (search.type) {
        conditions.push(eq(properties.type, search.type));
      }
      
      if (search.minPrice) {
        conditions.push(gte(properties.price, search.minPrice));
      }
      
      if (search.maxPrice) {
        conditions.push(lte(properties.price, search.maxPrice));
      }
      
      if (search.minRooms) {
        conditions.push(gte(properties.rooms, search.minRooms));
      }
      
      if (search.maxRooms) {
        conditions.push(lte(properties.rooms, search.maxRooms));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }

    const results = await query.orderBy(desc(properties.createdAt));
    
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
