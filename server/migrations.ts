import { sql } from 'drizzle-orm';
import { db } from './db.js';

export async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Create tables if they don't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" serial PRIMARY KEY NOT NULL,
        "email" varchar(255) NOT NULL,
        "password" varchar(255) NOT NULL,
        "name" varchar(255) NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "users_email_unique" UNIQUE("email")
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "properties" (
        "id" serial PRIMARY KEY NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "address" varchar(500) NOT NULL,
        "price" integer NOT NULL,
        "size" integer NOT NULL,
        "rooms" integer NOT NULL,
        "type" varchar(50) NOT NULL,
        "image_url" text,
        "image_urls" text[],
        "available" boolean DEFAULT true NOT NULL,
        "user_id" integer NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Add missing columns if they don't exist (for existing databases)
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "properties" ADD COLUMN "image_url" text;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "properties" ADD COLUMN "image_urls" text[];
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "properties" ADD COLUMN "address" varchar(500);
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "properties" ADD COLUMN "rooms" integer;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" serial PRIMARY KEY NOT NULL,
        "property_id" integer NOT NULL,
        "sender_id" integer NOT NULL,
        "receiver_id" integer NOT NULL,
        "content" text NOT NULL,
        "is_read" boolean DEFAULT false NOT NULL,
        "sent_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar(128) PRIMARY KEY NOT NULL,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      );
    `);

    // Add foreign key constraints if they don't exist
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "properties" ADD CONSTRAINT "properties_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "messages" ADD CONSTRAINT "messages_property_id_properties_id_fk" 
        FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" 
        FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_users_id_fk" 
        FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create index if it doesn't exist
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" USING btree ("expire");
    `);

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}