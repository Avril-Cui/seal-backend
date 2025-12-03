/**
 * Database Clear Script
 *
 * This script removes all data from the database.
 * Use with caution! This will delete everything.
 *
 * Run with: deno run -A src/utils/clear_db.ts
 */

import { MongoClient } from "npm:mongodb";
import { load } from "jsr:@std/dotenv";

// Load environment variables
await load({ export: true });

async function clearDatabase() {
  console.log("🗑️  Starting database clear...\n");

  const MONGO_URL = Deno.env.get("MONGODB_URL");

  if (!MONGO_URL) {
    console.error("❌ Error: MONGO_URL not found in environment variables!");
    console.log("\n💡 Make sure your .env file has a MONGO_URL variable.\n");
    return;
  }

  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("test_seeded_db");

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections\n`);

    // Drop each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`  Dropping ${collectionName}...`);
      await db.collection(collectionName).drop();
      console.log(`  ✓ Dropped ${collectionName}`);
    }

    console.log("\n✅ Database cleared successfully!\n");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
  } finally {
    await client.close();
    console.log("👋 Disconnected from MongoDB");
  }
}

// Run the clear script
if (import.meta.main) {
  console.log("⚠️  WARNING: This will delete ALL data from the database!");
  console.log("Press Ctrl+C within 3 seconds to cancel...\n");

  // Give user 3 seconds to cancel
  await new Promise((resolve) => setTimeout(resolve, 3000));

  await clearDatabase();
}
