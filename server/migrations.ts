import { sql } from 'drizzle-orm';
import { db, pool } from './db';

export async function runMigrations() {
  try {
    console.log('Running database migrations...');
    console.log('Database URL configured:', !!process.env.DATABASE_URL);
    
    // Test database connection first
    console.log('Testing database connection...');
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connection successful');
    
    // Create tables if they don't exist
    console.log('Creating users table...');
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

    console.log('Creating properties table...');
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

    console.log('Creating messages table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" serial PRIMARY KEY NOT NULL,
        "property_id" integer NOT NULL,
        "sender_id" integer NOT NULL,
        "receiver_id" integer NOT NULL,
        "content" text NOT NULL,
        "read" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    console.log('Creating sessions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar(128) PRIMARY KEY NOT NULL,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      );
    `);

    // Add foreign key constraints if they don't exist
    console.log('Adding foreign key constraints...');
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
    console.log('Creating indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" USING btree ("expire");
    `);

    // Final test
    console.log('Testing final database state...');
    const testResult = await db.execute(sql`SELECT 1 as test`);
    console.log('Final database test successful:', testResult.length > 0);

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    console.error('Database connection string format:', process.env.DATABASE_URL?.substring(0, 20) + '...');
    console.error('This is a critical error - the application cannot start without database access');
    
    // Try to provide more helpful error information
    if (error?.message?.includes('ECONNREFUSED')) {
      console.error('Connection refused - check if database is running and accessible');
    } else if (error?.message?.includes('authentication')) {
      console.error('Authentication failed - check database credentials');
    } else if (error?.message?.includes('timeout')) {
      console.error('Connection timeout - check network connectivity');
    }
    
    throw error;
  }
}