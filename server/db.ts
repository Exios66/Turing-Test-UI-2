import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { log } from "./vite";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool with optimal settings for Replit deployment
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
  maxUses: 7500, // Close and replace a connection after it has been used this many times
});

// Log pool events for better monitoring
pool.on('connect', (client) => {
  log('New client connected to database pool');
});

pool.on('error', (err, client) => {
  log(`Unexpected error on idle client: ${err.message}`);
});

export const db = drizzle({ client: pool, schema });

// Function to check database connectivity
export async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    log('Database connection successful');
    return true;
  } catch (error) {
    log(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}