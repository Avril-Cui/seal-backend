/**
 * Database Seed Script
 *
 * This script populates the database with test users, items, and swipe data
 * to facilitate testing of community feedback features.
 *
 * Run with: deno run -A src/utils/seed.ts
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

// Sample user data
const USERS = [
  { email: "alice@test.com", password: "test123", name: "Alice" },
  { email: "bob@test.com", password: "test123", name: "Bob" },
  { email: "charlie@test.com", password: "test123", name: "Charlie" },
  { email: "diana@test.com", password: "test123", name: "Diana" },
  { email: "eve@test.com", password: "test123", name: "Eve" },
];

// Real Amazon product data for each user
const ITEMS = [
  // Alice's items - practical home/lifestyle items
  [
    {
      itemName: "Keurig K-Express Single Serve K-Cup Pod Coffee Maker",
      description:
        "STRONG BREW: Increases the strength and bold taste of your coffee's flavor. 3 CUP SIZES: Brew an 8, 10, or 12 oz. cup at the push of a button. 42oz removable reservoir lets you brew up to 4 cups before refilling.",
      photo: "https://m.media-amazon.com/images/I/611S4FYZhsL._AC_SX466_.jpg",
      price: 59.99,
      reason:
        "I spend $6/day on coffee from Starbucks, this could save me money",
      isNeed: "Want, but could save ~$150/month if I use it daily",
      isFutureApprove:
        "Yes, if I actually commit to making coffee at home instead of buying out",
    },
    {
      itemName: "Shark Navigator Lift-Away Professional Vacuum NV356E",
      description:
        "LIFT-AWAY FUNCTIONALITY: Easily clean above-floor areas like stairs and furniture. ANTI-ALLERGEN COMPLETE SEAL with HEPA filter traps 99.9% of dust and allergens. PERFECT FOR PET OWNERS.",
      photo: "https://m.media-amazon.com/images/I/61bnpamDP9L._AC_SX569_.jpg",
      price: 199.99,
      reason: "My old vacuum broke and I have two cats that shed everywhere",
      isNeed: "Definitely a need - can't keep up with pet hair without one",
      isFutureApprove:
        "Yes, this is essential for maintaining a clean home with pets",
    },
    {
      itemName: "Silent Wall Clock Non-Ticking Battery Operated – Olive Green",
      description:
        "Modern wall clock with muted olive green face and clean white frame. Large white Arabic numbers for easy reading. Silent quartz movement - no ticking sound.",
      photo: "https://m.media-amazon.com/images/I/81VE8fjMh7L._AC_SX466_.jpg",
      price: 6.49,
      reason:
        "Redecorating my home office and need a clock that won't distract me",
      isNeed: "Want - purely aesthetic but very affordable",
      isFutureApprove:
        "Yes, it's only $6 and I genuinely need to track time while working",
    },
  ],
  // Bob's items - tech enthusiast
  [
    {
      itemName: "FUJIFILM X100VI Digital Camera (Black) Bundle",
      description:
        "40.2MP APS-C X-Trans CMOS 5 HR Sensor, X-Processor 5 Image Processor, Fujinon 23mm f/2 Lens, 6-Stop In-Body Image Stabilization. Bundle includes 64GB card, case, and accessories.",
      photo: "https://m.media-amazon.com/images/I/81JtXYem-fL._AC_SX522_.jpg",
      price: 2499.95,
      reason:
        "I've been wanting to get into street photography as a serious hobby",
      isNeed:
        "Definitely a want - my phone camera works fine for casual photos",
      isFutureApprove:
        "Uncertain... this is a lot of money. Would I really use it enough?",
    },
    {
      itemName: "charmast Portable Charger with Built-in Cables 10000mAh",
      description:
        "Slim portable charger with 4 built-in cables, 6 outputs and 3 inputs. Can charge 6 devices at once. Works with iPhone, Android, USB-C devices. Super slim design.",
      photo: "https://m.media-amazon.com/images/I/7107A4-8G4L._AC_SX679_.jpg",
      price: 20.99,
      reason:
        "My phone always dies when I'm traveling and I hate carrying multiple cables",
      isNeed: "Need for my frequent business trips",
      isFutureApprove: "Yes, this is practical and reasonably priced",
    },
  ],
  // Charlie's items - parent/family focused
  [
    {
      itemName: "National Geographic Kids Magic Set - 45 Magic Tricks",
      description:
        "Kids learn techniques behind famous magic tricks including cups and balls, false thumb tip, and more. Includes special magician's card deck and step-by-step video instructions from a professional magician.",
      photo: "https://m.media-amazon.com/images/I/81C0JBHqA2L._AC_SX569_.jpg",
      price: 22.39,
      reason:
        "My daughter's 8th birthday is coming up and she loves magic shows",
      isNeed: "Want - it's a gift, not for me",
      isFutureApprove:
        "Yes, she'll love it and it encourages creativity and performance skills",
    },
    {
      itemName: "LEGO City Interstellar Spaceship Toy 60430",
      description:
        "Building set with spacecraft model, drone, and astronaut figure. Features fold-out main thrusters and convertible drone bot jetpack. Digital construction guide via LEGO Builder app.",
      photo: "https://m.media-amazon.com/images/I/812jUhF64hL._AC_SX522_.jpg",
      price: 15.99,
      reason: "Stocking stuffer for my nephew who is obsessed with space",
      isNeed: "Want - holiday gift",
      isFutureApprove: "Yes, it's affordable and he'll play with it for hours",
    },
    {
      itemName: "Owala FreeSip Insulated Stainless Steel Water Bottle 24oz",
      description:
        "Patented FreeSip spout for sipping through straw or tilting to swig. Double-wall insulation keeps drinks cold for 24 hours. Push-button lid with lock. BPA-free.",
      photo: "https://m.media-amazon.com/images/I/41xGVia9icL._AC_SX569_.jpg",
      price: 29.99,
      reason:
        "I keep buying plastic water bottles - trying to be more eco-friendly",
      isNeed:
        "Want, but would help me drink more water and reduce plastic waste",
      isFutureApprove:
        "Yes, it's a sustainable choice and these bottles have great reviews",
    },
  ],
  // Diana's items - lifestyle/fashion
  [
    {
      itemName:
        "Louis Vuitton Pre-Loved OnTheGo Tote Reverse Monogram Giant MM",
      description:
        "Pre-loved authentic Louis Vuitton OnTheGo Tote in Reverse Monogram Giant MM size. Brown colorway.",
      photo: "https://m.media-amazon.com/images/I/81jwrxnCLqL._AC_SX466_.jpg",
      price: 2985,
      reason:
        "I've wanted a designer bag forever and this is pre-loved so slightly cheaper",
      isNeed: "Pure luxury want - I have plenty of functional bags",
      isFutureApprove:
        "Probably not... I'd feel guilty spending this much on a bag",
    },
    {
      itemName: "MAXYOYO Folding Sofa Bed with Pillow - Beige",
      description:
        "Versatile folding sofa bed with headrest and lumbar pillow. Comfortable shredded foam filling. Perfect for small spaces, reading, watching TV, or guest sleeping.",
      photo: "https://m.media-amazon.com/images/I/81AasRJcRxL._AC_SX522_.jpg",
      price: 112.49,
      reason:
        "My studio apartment is tiny and I need flexible furniture for when friends visit",
      isNeed: "Need - I literally have nowhere for guests to sleep currently",
      isFutureApprove:
        "Yes, this solves a real problem and isn't too expensive",
    },
  ],
  // Eve's items - outdoor/practical
  [
    {
      itemName: "Balaclava Ski Mask - Winter Face Mask",
      description:
        "Winter face mask for men and women. Cold weather gear for skiing, snowboarding, and motorcycle riding.",
      photo: "https://m.media-amazon.com/images/I/81+E+imBpoL._AC_SX385_.jpg",
      price: 14.95,
      reason:
        "Planning a ski trip to Vermont in January and my face always freezes",
      isNeed: "Need for the specific trip I have planned",
      isFutureApprove: "Yes, it's cheap and I'll definitely use it",
    },
    {
      itemName:
        "Keep It Simple Y'all: Easy Dinners from Your Barefoot Neighbor",
      description:
        "Cookbook featuring easy dinner recipes from the Barefoot Neighbor. Simple, approachable home cooking.",
      photo: "https://m.media-amazon.com/images/I/61Zk8idxPKL._SY385_.jpg",
      price: 7.23,
      reason:
        "Trying to cook more at home instead of ordering DoorDash every night",
      isNeed: "Want, but could help me save money on food delivery",
      isFutureApprove:
        "Yes if I actually use it - but I have other cookbooks I never opened...",
    },
    {
      itemName:
        "Pop-Tarts Emotional Support Plushies by Relatable - 5 Plush Pals",
      description:
        "Cute plushies shaped like Pop-Tarts flavors. Each plush has a silly face and squishy feel. Perfect funny gifts for friends. Comes in adorable plush box.",
      photo: "https://m.media-amazon.com/images/I/812P0dj2WuL._AC_SX679_.jpg",
      price: 16.99,
      reason: "My roommate is stressed about finals and these are hilarious",
      isNeed: "Total want - it's a silly impulse buy",
      isFutureApprove:
        "Probably yes because it'll make her laugh and it's not expensive",
    },
  ],
];

async function seed() {
  console.log("🌱 Starting database seed...\n");

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

    // Initialize concepts (no external dependencies needed for seed)
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

    // Store created users and their items
    const createdUsers: Array<{ uid: ID; email: string; name: string }> = [];
    const allItemIds: ID[] = [];

    // 1. Create users
    console.log("👥 Creating users...");
    for (let i = 0; i < USERS.length; i++) {
      const userData = USERS[i];

      // Create auth account
      const authResult = await userAuth.signup({
        email: userData.email,
        password: userData.password,
      });

      if ("error" in authResult) {
        console.log(`⚠️  ${userData.name} might already exist, skipping...`);
        // Try to get existing user
        const loginResult = await userAuth.login({
          email: userData.email,
          password: userData.password,
        });
        if (!("error" in loginResult)) {
          createdUsers.push({
            uid: loginResult.user._id,
            email: userData.email,
            name: userData.name,
          });
        }
        continue;
      }

      const userId = authResult.user._id;

      // Create profile
      await userProfile.createUser({
        uid: userId,
        name: userData.name,
        email: userData.email,
        password: userData.password,
        profilePicture: "",
        fieldOfInterests: [],
      });

      createdUsers.push({
        uid: userId,
        email: userData.email,
        name: userData.name,
      });

      console.log(`  ✓ Created ${userData.name} (${userData.email})`);
    }

    console.log(`\n✅ Created ${createdUsers.length} users\n`);

    // 2. Pre-create wishlists to avoid race conditions
    console.log("📋 Initializing wishlists...");
    for (const user of createdUsers) {
      // Create an empty wishlist for each user by adding and removing a dummy item
      const dummyResult = await itemCollection.addItem({
        owner: user.uid,
        itemName: "temp",
        description: "temp",
        photo: "",
        price: 0,
        reason: "temp",
        isNeed: "temp",
        isFutureApprove: "temp",
      });

      // Remove the dummy item if it was created
      if (!("error" in dummyResult)) {
        await itemCollection.removeItem({
          owner: user.uid,
          itemId: dummyResult.item._id,
        });
      }
    }
    console.log("✅ Wishlists initialized\n");

    // 3. Create items for each user (in parallel for speed)
    // Track ownership as items are created
    const itemOwnerMap = new Map<ID, ID>();

    console.log("📦 Creating items for users...");
    const itemPromises = [];
    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i];
      const userItems = ITEMS[i];

      console.log(`  Creating items for ${user.name}...`);

      for (const itemData of userItems) {
        itemPromises.push(
          itemCollection
            .addItem({
              owner: user.uid,
              ...itemData,
            })
            .then((result) => {
              if (!("error" in result)) {
                const itemId = result.item._id;
                allItemIds.push(itemId);
                // Track owner correctly regardless of creation order
                itemOwnerMap.set(itemId, user.uid);
                console.log(
                  `    ✓ Added "${itemData.itemName}" for ${user.name}`
                );
                return itemId;
              }
              return null;
            })
        );
      }
    }

    await Promise.all(itemPromises);

    console.log(`\n✅ Created ${allItemIds.length} items total\n`);

    // 4. Create cross-swipes (ensure EVERY item gets feedback)
    console.log("👆 Creating swipe data...");
    const swipePromises = [];

    // Strategy: Only first 3 users create swipes (Alice, Bob, Charlie)
    // This leaves Diana and Eve with fresh items to swipe on for testing
    const swipingUsers = createdUsers.slice(0, 3); // Only first 3 users swipe

    for (const swiper of swipingUsers) {
      for (const itemId of allItemIds) {
        const itemOwner = itemOwnerMap.get(itemId);

        // Don't swipe on your own items
        if (itemOwner && itemOwner !== swiper.uid) {
          // Random decision with slight bias toward "Buy" (60% buy, 40% skip)
          const decision = Math.random() > 0.4 ? "Buy" : "Don't Buy";

          swipePromises.push(
            swipeSystem
              .recordSwipe({
                ownerUserId: swiper.uid,
                itemId,
                decision,
              })
              .catch(() => null) // Ignore duplicate errors
          );
        }
      }
    }

    console.log(`  Processing ${swipePromises.length} swipes...`);
    const swipeResults = await Promise.all(swipePromises);
    const swipeCount = swipeResults.filter((r) => r && !("error" in r)).length;

    console.log(`\n✅ Created ${swipeCount} swipes\n`);

    // 5. Create some daily queues
    console.log("📋 Creating daily queues...");
    for (const user of createdUsers) {
      // Get items NOT owned by this user
      const otherUsersItems = allItemIds.filter((itemId) => {
        const itemOwner = itemOwnerMap.get(itemId);
        return itemOwner !== user.uid;
      });

      // Shuffle and pick up to 10
      const shuffledItems = [...otherUsersItems].sort(
        () => Math.random() - 0.5
      );
      const queueItems = shuffledItems.slice(
        0,
        Math.min(10, shuffledItems.length)
      );

      if (queueItems.length >= 10) {
        const result = await queueSystem.generateDailyQueue({
          owner: user.uid,
          itemIds: queueItems,
        });

        if (!("error" in result)) {
          console.log(`  ✓ Created queue for ${user.name}`);
        }
      } else {
        console.log(
          `  ⚠️ Not enough items for ${user.name}'s queue (${queueItems.length}/10)`
        );
      }
    }

    console.log("\n🎉 Database seeded successfully!\n");
    console.log("📝 Test accounts created:");
    for (const user of createdUsers) {
      console.log(`   ${user.name}: ${user.email} / test123`);
    }
    console.log("\n💡 Testing recommendations:");
    console.log(
      "   • Login as Alice, Bob, Charlie, Diana or Eve to Swipe on Items from other users"
    );
    console.log("   • All items have 2-3 community reviews from seed data\n");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await client.close();
    console.log("👋 Disconnected from MongoDB");
  }
}

// Run the seed script
if (import.meta.main) {
  await seed();
}
