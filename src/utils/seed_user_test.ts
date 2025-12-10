/**
 * User Testing Seed Script
 *
 * This script populates the database with test data specifically designed
 * to support all 7 user testing tasks:
 *
 * 1. Create an Account - Test user with fields of interest
 * 2. Add an Item to PauseCart (Manual Link Flow) - Empty cart ready for manual addition
 * 3. Add an Item Using the Chrome Extension - Empty cart ready for extension addition
 * 4. Edit and Manage Items in PauseCart - Pre-populated items to edit/delete
 * 5. Complete a Daily SwipeSense Queue - Queue with 10 items ready to swipe
 * 6. View Community Feedback on Your Items - Items with community swipes/feedback
 * 7. Mark an Item as Purchased + Explore Stats Page - One item already purchased, others ready
 *
 * Run with: deno run -A src/utils/seed_user_test.ts
 */

import { MongoClient } from "npm:mongodb";
import { load } from "jsr:@std/dotenv";
import UserAuthConcept from "../concepts/UserAuth/UserAuthConcept.ts";
import UserProfileConcept from "../concepts/UserProfile/UserProfileConcept.ts";
import ItemCollectionConcept from "../concepts/ItemCollection/ItemCollectionConcept.ts";
import SwipeSystemConcept from "../concepts/SwipeSystem/SwipeSystemConcept.ts";
import QueueSystemConcept from "../concepts/QueueSystem/QueueSystemConcept.ts";
import { ID } from "@utils/types.ts";

// Load environment variables
await load({ export: true });

// Test user account for user testing
const TEST_USER = {
  email: "testuser@example.com",
  password: "test123",
  name: "Test User",
  fieldsOfInterests: ["Electronics", "Home & Kitchen", "Fashion", "Books"],
};

// Items for the test user (these will have community feedback)
const TEST_USER_ITEMS = [
  {
    itemName: "Apple AirPods Pro (2nd Generation)",
    description:
      "Active Noise Cancellation, Adaptive Transparency, Personalized Spatial Audio, MagSafe Charging Case, Bluetooth 5.3 Headphones",
    photo: "https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SX679_.jpg",
    price: 249.99,
    reason:
      "My current headphones broke and I need something for my daily commute",
    isNeed: "Need - I use headphones every day for work calls and music",
    isFutureApprove:
      "Yes, I'll use these daily and they have great reviews for noise cancellation",
    amazonUrl: "https://www.amazon.com/dp/B0BDHB9Y8H",
  },
  {
    itemName: "Instant Pot Duo 7-in-1 Electric Pressure Cooker",
    description:
      "7-in-1 functionality: pressure cooker, slow cooker, rice cooker, steamer, sauté pan, yogurt maker, and warmer",
    photo: "https://m.media-amazon.com/images/I/81iVdR-KJfL._AC_SX679_.jpg",
    price: 99.95,
    reason: "Trying to cook more at home to save money and eat healthier meals",
    isNeed: "Want - would help me meal prep and save time",
    isFutureApprove:
      "Yes, if I actually use it regularly. I've heard great things about meal prepping with it",
    amazonUrl: "https://www.amazon.com/dp/B00FLYWNYQ",
  },
  {
    itemName: "Nike Air Max 90 Sneakers",
    description:
      "Classic running-inspired design with visible Air cushioning. Leather and synthetic upper with rubber outsole.",
    photo: "https://m.media-amazon.com/images/I/71+1VqJZ8XL._AC_SX695_.jpg",
    price: 120.0,
    reason: "My current sneakers are worn out and I want something stylish",
    isNeed: "Want - my current shoes still work but are getting old",
    isFutureApprove:
      "Maybe - they're expensive but I'd wear them a lot. Do I really need new shoes right now?",
    amazonUrl: "https://www.amazon.com/dp/B08N5WRWNW",
  },
];

// Items from other users (these will appear in the test user's queue)
const COMMUNITY_ITEMS = [
  // User 1: Tech enthusiast
  {
    ownerName: "TechEnthusiast",
    email: "tech@example.com",
    password: "test123",
    items: [
      {
        itemName: "Sony WH-1000XM5 Wireless Headphones",
        description:
          "Industry-leading noise canceling with Dual Noise Sensor technology. Next-level music with Edge-AI and DSEE Extreme. Multipoint connection lets you connect to 2 devices at once.",
        photo: "https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SX679_.jpg",
        price: 399.99,
        reason:
          "Want the best noise cancellation for my home office and travel",
        isNeed:
          "Want - my current headphones work fine but these are an upgrade",
        isFutureApprove:
          "Yes, I travel frequently and good noise cancellation is worth it",
        amazonUrl: "https://www.amazon.com/dp/B09XS7J5HS",
      },
      {
        itemName: "Logitech MX Master 3S Wireless Mouse",
        description:
          "Advanced ergonomic design with quiet clicks. Ultra-fast scrolling. Multi-device connectivity. Precision tracking on any surface.",
        photo: "https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SX679_.jpg",
        price: 99.99,
        reason: "My current mouse is uncomfortable for long coding sessions",
        isNeed: "Need - wrist pain from current mouse",
        isFutureApprove: "Yes, ergonomics are important for my work",
        amazonUrl: "https://www.amazon.com/dp/B09HM94VDS",
      },
      {
        itemName: "Samsung 49-inch Odyssey G9 Gaming Monitor",
        description:
          "Dual QHD curved gaming monitor with 240Hz refresh rate, 1ms response time, and HDR1000 support.",
        photo: "https://m.media-amazon.com/images/I/81QmL0dCgDL._AC_SX679_.jpg",
        price: 1099.99,
        reason: "Dream setup for my home office and gaming",
        isNeed: "Pure want - my current monitor works fine",
        isFutureApprove:
          "Uncertain... this is a lot of money. Would I really use all these features?",
        amazonUrl: "https://www.amazon.com/dp/B088HH6L5F",
      },
    ],
  },
  // User 2: Home & Kitchen
  {
    ownerName: "HomeCook",
    email: "homecook@example.com",
    password: "test123",
    items: [
      {
        itemName: "KitchenAid Stand Mixer - Artisan Series",
        description:
          "5-quart capacity, 10 speeds, includes flat beater, wire whip, and dough hook. Available in multiple colors.",
        photo: "https://m.media-amazon.com/images/I/71vUjJZJN8L._AC_SX679_.jpg",
        price: 379.99,
        reason: "Want to start baking bread and making pasta from scratch",
        isNeed: "Want - I've been wanting to get into baking",
        isFutureApprove:
          "Yes, if I actually use it. I've been talking about baking for months",
        amazonUrl: "https://www.amazon.com/dp/B008B6ON6C",
      },
      {
        itemName: "OXO Good Grips 12-Cup Coffee Maker",
        description:
          "Programmable coffee maker with brew strength control, auto shut-off, and 12-cup capacity.",
        photo: "https://m.media-amazon.com/images/I/81YzZJjG+aL._AC_SX679_.jpg",
        price: 89.99,
        reason: "My old coffee maker broke and I need my morning coffee",
        isNeed: "Need - can't function without coffee",
        isFutureApprove: "Yes, essential for my daily routine",
        amazonUrl: "https://www.amazon.com/dp/B00A8ZJ8OY",
      },
      {
        itemName: "Le Creuset Dutch Oven 5.5 Quart",
        description:
          "Enameled cast iron Dutch oven, perfect for braising, baking, and slow cooking. Classic round design.",
        photo: "https://m.media-amazon.com/images/I/71vUjJZJN8L._AC_SX679_.jpg",
        price: 349.95,
        reason: "Want to make better soups and stews, plus it's beautiful",
        isNeed: "Want - I have pots that work but this would be an upgrade",
        isFutureApprove:
          "Maybe - it's expensive but I'd use it for years. Is it worth the price?",
        amazonUrl: "https://www.amazon.com/dp/B0000CFLMN",
      },
    ],
  },
  // User 3: Fashion & Lifestyle
  {
    ownerName: "FashionLover",
    email: "fashion@example.com",
    password: "test123",
    items: [
      {
        itemName: "Patagonia Better Sweater Fleece Jacket",
        description:
          "Classic fleece jacket made from recycled polyester. Full-zip design with zippered chest pocket.",
        photo: "https://m.media-amazon.com/images/I/71vUjJZJN8L._AC_SX679_.jpg",
        price: 99.0,
        reason: "Need a warm layer for fall hiking and casual wear",
        isNeed: "Need - my current jacket is too thin for cold weather",
        isFutureApprove: "Yes, I'll wear this frequently",
        amazonUrl: "https://www.amazon.com/dp/B08N5WRWNW",
      },
      {
        itemName: "Ray-Ban Aviator Classic Sunglasses",
        description:
          "Classic aviator style with green lenses and gold-tone frame. UV protection.",
        photo: "https://m.media-amazon.com/images/I/71vUjJZJN8L._AC_SX679_.jpg",
        price: 154.0,
        reason: "Lost my sunglasses and need eye protection for driving",
        isNeed: "Need - I drive a lot and need sun protection",
        isFutureApprove: "Yes, essential for eye health",
        amazonUrl: "https://www.amazon.com/dp/B000EYZ7W8",
      },
      {
        itemName: "Coach Leather Crossbody Bag",
        description:
          "Classic leather crossbody bag with adjustable strap. Multiple compartments and interior organization.",
        photo: "https://m.media-amazon.com/images/I/71vUjJZJN8L._AC_SX679_.jpg",
        price: 295.0,
        reason: "Want a nice bag for work and going out",
        isNeed: "Want - I have bags but want something nicer",
        isFutureApprove:
          "Uncertain... it's expensive. Do I really need another bag?",
        amazonUrl: "https://www.amazon.com/dp/B08N5WRWNW",
      },
    ],
  },
  // User 4: Books & Learning
  {
    ownerName: "BookWorm",
    email: "bookworm@example.com",
    password: "test123",
    items: [
      {
        itemName: "Kindle Paperwhite (11th Generation)",
        description:
          "6.8-inch display, adjustable warm light, waterproof, 8GB storage. Perfect for reading anywhere.",
        photo: "https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SX679_.jpg",
        price: 139.99,
        reason: "Want to read more but physical books take up too much space",
        isNeed: "Want - would help me read more",
        isFutureApprove:
          "Yes, if I actually use it. I have a tablet but the e-ink is better for reading",
        amazonUrl: "https://www.amazon.com/dp/B08N5WRWNW",
      },
      {
        itemName: "Atomic Habits by James Clear",
        description:
          "An Easy & Proven Way to Build Good Habits & Break Bad Ones",
        photo: "https://m.media-amazon.com/images/I/81YzZJjG+aL._AC_SX679_.jpg",
        price: 11.98,
        reason: "Heard great things about this book for personal development",
        isNeed: "Want - interested in improving my habits",
        isFutureApprove:
          "Yes, it's affordable and could be helpful. But will I actually read it?",
        amazonUrl: "https://www.amazon.com/dp/B08N5WRWNW",
      },
    ],
  },
];

async function seedUserTest() {
  console.log("🌱 Starting user testing seed script...\n");

  // Connect to MongoDB
  const MONGO_URL = Deno.env.get("MONGODB_URL");
  const DB_NAME = Deno.env.get("DB_NAME");

  if (!MONGO_URL) {
    console.error("❌ Error: MONGODB_URL not found in environment variables!");
    console.log("\n💡 Make sure your .env file has a MONGODB_URL variable.");
    console.log("Example: MONGODB_URL=mongodb+srv://...\n");
    return;
  }

  if (!DB_NAME) {
    console.error("❌ Error: DB_NAME not found in environment variables!");
    console.log("\n💡 Make sure your .env file has a DB_NAME variable.");
    console.log("Example: DB_NAME=aw_concepts\n");
    return;
  }

  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();
    console.log(`✅ Connected to MongoDB (database: ${DB_NAME})\n`);

    const db = client.db(DB_NAME);

    // Initialize concepts
    const userAuth = new UserAuthConcept(db);
    const userProfile = new UserProfileConcept(db);
    const itemCollection = new ItemCollectionConcept(
      db,
      {
        fetchProductDetails: async () => ({ error: "Mock API" }),
      } as any,
      {
        generateInsight: async () => ({ error: "Mock API" }),
      } as any
    );
    const swipeSystem = new SwipeSystemConcept(db);
    const queueSystem = new QueueSystemConcept(db);

    // ============================================
    // 1. CREATE TEST USER ACCOUNT
    // ============================================
    console.log("👤 Creating test user account...");
    let testUserId: ID;

    // Try to create the test user
    const authResult = await userAuth.signup({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if ("error" in authResult) {
      console.log(`⚠️  Test user might already exist, logging in...`);
      const loginResult = await userAuth.login({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });
      if ("error" in loginResult) {
        console.error(
          `❌ Could not create or login test user: ${loginResult.error}`
        );
        return;
      }
      testUserId = loginResult.user._id;
    } else {
      testUserId = authResult.user._id;
    }

    // Create or update profile with fields of interest
    await userProfile.createUser({
      uid: testUserId,
      name: TEST_USER.name,
      email: TEST_USER.email,
      profilePicture: "",
      fieldOfInterests: TEST_USER.fieldsOfInterests,
    });

    console.log(`  ✓ Test user: ${TEST_USER.email} / ${TEST_USER.password}`);
    console.log(
      `  ✓ Fields of interest: ${TEST_USER.fieldsOfInterests.join(", ")}\n`
    );

    // ============================================
    // 2. CREATE COMMUNITY USERS AND THEIR ITEMS
    // ============================================
    console.log("👥 Creating community users and their items...");
    const communityUserIds: ID[] = [];
    const allCommunityItemIds: ID[] = [];
    const itemOwnerMap = new Map<ID, ID>();

    for (const communityUser of COMMUNITY_ITEMS) {
      // Create auth account
      const authResult = await userAuth.signup({
        email: communityUser.email,
        password: communityUser.password,
      });

      let userId: ID;
      if ("error" in authResult) {
        const loginResult = await userAuth.login({
          email: communityUser.email,
          password: communityUser.password,
        });
        if ("error" in loginResult) {
          console.log(`  ⚠️  Skipping ${communityUser.ownerName}...`);
          continue;
        }
        userId = loginResult.user._id;
      } else {
        userId = authResult.user._id;
      }

      // Create profile
      await userProfile.createUser({
        uid: userId,
        name: communityUser.ownerName,
        email: communityUser.email,
        profilePicture: "",
        fieldOfInterests: [],
      });

      communityUserIds.push(userId);
      console.log(`  ✓ Created ${communityUser.ownerName}`);

      // Initialize wishlist
      const dummyResult = await itemCollection.addItem({
        owner: userId,
        itemName: "temp",
        description: "temp",
        photo: "",
        price: 0,
        reason: "temp",
        isNeed: "temp",
        isFutureApprove: "temp",
      });
      if (!("error" in dummyResult)) {
        await itemCollection.removeItem({
          owner: userId,
          itemId: dummyResult.item._id,
        });
      }

      // Add items for this user
      for (const itemData of communityUser.items) {
        const result = await itemCollection.addItem({
          owner: userId,
          ...itemData,
        });
        if (!("error" in result)) {
          const itemId = result.item._id;
          allCommunityItemIds.push(itemId);
          itemOwnerMap.set(itemId, userId);
        }
      }
    }

    console.log(
      `✅ Created ${communityUserIds.length} community users with ${allCommunityItemIds.length} items\n`
    );

    // ============================================
    // 3. CREATE TEST USER'S ITEMS (with some already having feedback)
    // ============================================
    console.log("📦 Creating test user's items...");

    // Initialize test user's wishlist
    const dummyResult = await itemCollection.addItem({
      owner: testUserId,
      itemName: "temp",
      description: "temp",
      photo: "",
      price: 0,
      reason: "temp",
      isNeed: "temp",
      isFutureApprove: "temp",
    });
    if (!("error" in dummyResult)) {
      await itemCollection.removeItem({
        owner: testUserId,
        itemId: dummyResult.item._id,
      });
    }

    const testUserItemIds: ID[] = [];
    for (const itemData of TEST_USER_ITEMS) {
      const result = await itemCollection.addItem({
        owner: testUserId,
        ...itemData,
      });
      if (!("error" in result)) {
        testUserItemIds.push(result.item._id);
        console.log(`  ✓ Added "${itemData.itemName}"`);
      }
    }

    console.log(`✅ Created ${testUserItemIds.length} items for test user\n`);

    // ============================================
    // 4. CREATE COMMUNITY SWIPES ON TEST USER'S ITEMS
    // ============================================
    console.log("👆 Creating community feedback on test user's items...");
    let swipeCount = 0;

    // Each community user swipes on test user's items
    for (const swiperId of communityUserIds) {
      for (const itemId of testUserItemIds) {
        // Random decision: 60% Buy, 40% Don't Buy
        const decision = Math.random() > 0.4 ? "Buy" : "Don't Buy";
        const result = await swipeSystem.recordSwipe({
          ownerUserId: swiperId,
          itemId,
          decision,
        });
        if (!("error" in result)) {
          swipeCount++;
        }
      }
    }

    console.log(
      `✅ Created ${swipeCount} community swipes on test user's items\n`
    );

    // ============================================
    // 5. CREATE DAILY QUEUE FOR TEST USER
    // ============================================
    console.log("📋 Creating daily queue for test user...");

    // Select 10 random items from community items for the queue
    const shuffledItems = [...allCommunityItemIds].sort(
      () => Math.random() - 0.5
    );
    const queueItems = shuffledItems.slice(
      0,
      Math.min(10, shuffledItems.length)
    );

    if (queueItems.length >= 10) {
      const result = await queueSystem.generateDailyQueue({
        owner: testUserId,
        itemIds: queueItems,
      });

      if (!("error" in result)) {
        console.log(`  ✓ Created queue with ${queueItems.length} items`);
      } else {
        console.log(`  ⚠️  Error creating queue: ${result.error}`);
      }
    } else {
      console.log(`  ⚠️  Not enough items for queue (${queueItems.length}/10)`);
    }

    console.log("✅ Queue created\n");

    // ============================================
    // 6. MARK ONE ITEM AS PURCHASED (for Task 7)
    // ============================================
    console.log("💰 Marking one item as purchased...");

    if (testUserItemIds.length > 0) {
      const purchasedItemId = testUserItemIds[0];
      const purchaseTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
      const actualPrice = TEST_USER_ITEMS[0].price * 0.9; // 10% discount

      const result = await itemCollection.setPurchased({
        owner: testUserId,
        item: purchasedItemId,
        quantity: 1,
        purchaseTime: purchaseTime,
        actualPrice: actualPrice,
      });

      if (!("error" in result)) {
        console.log(`  ✓ Marked "${TEST_USER_ITEMS[0].itemName}" as purchased`);
        console.log(
          `    Purchase date: ${new Date(purchaseTime).toLocaleDateString()}`
        );
        console.log(
          `    Price: $${actualPrice.toFixed(2)} (original: $${
            TEST_USER_ITEMS[0].price
          })`
        );
      } else {
        console.log(`  ⚠️  Error: ${result.error}`);
      }
    }

    console.log("✅ Purchase recorded\n");

    // ============================================
    // SUMMARY
    // ============================================
    console.log("🎉 User testing seed completed successfully!\n");
    console.log("📝 Test Account:");
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}`);
    console.log(
      `   Fields of Interest: ${TEST_USER.fieldsOfInterests.join(", ")}\n`
    );

    console.log("📋 Testing Tasks Ready:");
    console.log(
      "   ✓ Task 1: Create an Account - Test user already created with fields of interest"
    );
    console.log(
      "   ✓ Task 2: Add Item (Manual) - Cart is ready for manual additions"
    );
    console.log(
      "   ✓ Task 3: Add Item (Extension) - Cart is ready for extension additions"
    );
    console.log(
      "   ✓ Task 4: Edit/Manage Items - 3 items ready to edit/delete"
    );
    console.log(
      "   ✓ Task 5: Complete SwipeSense Queue - Queue with 10 items ready"
    );
    console.log(
      "   ✓ Task 6: View Community Feedback - Items have community swipes"
    );
    console.log(
      "   ✓ Task 7: Mark Purchased + Stats - 1 item already purchased, others ready\n"
    );

    console.log("💡 Notes:");
    console.log("   • Test user has 3 items in their PauseCart");
    console.log(
      "   • All test user items have community feedback from 4 community users"
    );
    console.log("   • Daily queue contains 10 items from community users");
    console.log(
      "   • One item is already marked as purchased (for stats testing)"
    );
    console.log(
      "   • Cart is ready for adding new items via manual link or extension\n"
    );
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await client.close();
    console.log("👋 Disconnected from MongoDB");
  }
}

// Run the seed script
if (import.meta.main) {
  await seedUserTest();
}


