import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/app/schema/schema";
import { config } from "dotenv";
import fs from "fs";

// Try to load .env.local, fallback to .env
if (fs.existsSync(".env.local")) {
  config({ path: ".env.local" });
} else {
  config({ path: ".env" });
}

async function inspectUsers() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }

  const db = drizzle(neon(process.env.DATABASE_URL), { schema });

  const users = await db.select().from(schema.users);
  console.log("All users in DB:");
  users.forEach((u) => {
    console.log(`ID: ${u.id}, Email: ${u.email}, Username: '${u.username}'`);
  });
}

inspectUsers();
