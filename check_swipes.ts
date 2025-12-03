import { MongoClient } from "mongodb";

const MONGO_URL = Deno.env.get("MONGO_URL") || "mongodb://localhost:27017/";
const client = new MongoClient(MONGO_URL);

try {
  await client.connect();
  const db = client.db("team_backend");
  const swipes = db.collection("swipes");

  console.log("=== ALL SWIPES IN DATABASE ===");
  const allSwipes = await swipes.find({}).toArray();
  console.log(`Total swipes: ${allSwipes.length}`);

  for (let i = 0; i < allSwipes.length; i++) {
    const swipe = allSwipes[i];
    console.log(`\nSwipe ${i + 1}:`);
    console.log(`  userId: ${swipe.userId}`);
    console.log(`  itemId: ${swipe.itemId}`);
    console.log(`  decision: ${swipe.decision}`);
    console.log(`  comment: ${swipe.comment || "(none)"}`);
  }

  // Group by itemId
  const byItem = new Map();
  for (const swipe of allSwipes) {
    if (!byItem.has(swipe.itemId)) {
      byItem.set(swipe.itemId, []);
    }
    byItem.get(swipe.itemId).push(swipe);
  }

  console.log("\n=== SWIPES BY ITEM ===");
  for (const [itemId, itemSwipes] of byItem.entries()) {
    console.log(`\nItem ${itemId}: ${itemSwipes.length} swipe(s)`);
    const buyCount = itemSwipes.filter((s: any) => s.decision === "Buy").length;
    const dontBuyCount = itemSwipes.filter((s: any) => s.decision === "Don't Buy").length;
    console.log(`  Buy: ${buyCount}, Don't Buy: ${dontBuyCount}`);
  }

} catch (error) {
  console.error("Error:", error);
} finally {
  await client.close();
}
