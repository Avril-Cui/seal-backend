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
import type { AmazonAPIClient } from "@services/amazonAPI.ts";
import type { GeminiLLMClient } from "@services/geminiLLM.ts";

// Load environment variables
await load({ export: true });

// Sample user data
const USERS = [
  { email: "alice@test.com", password: "test123", name: "Alice" },
  { email: "bob@test.com", password: "test123", name: "Bob" },
  { email: "charlie@test.com", password: "test123", name: "Charlie" },
  { email: "diana@test.com", password: "test123", name: "Diana" },
  { email: "eve@test.com", password: "test123", name: "Eve" },
  { email: "dianne2@test.com", password: "test", name: "Dianne" },
  { email: "frank@test.com", password: "test123", name: "Frank" },
  { email: "grace@test.com", password: "test123", name: "Grace" },
  { email: "henry@test.com", password: "test123", name: "Henry" },
  { email: "iris@test.com", password: "test123", name: "Iris" },
  { email: "jack@test.com", password: "test123", name: "Jack" },
  { email: "kate@test.com", password: "test123", name: "Kate" },
  { email: "liam@test.com", password: "test123", name: "Liam" },
  { email: "mia@test.com", password: "test123", name: "Mia" },
  { email: "noah@test.com", password: "test123", name: "Noah" },
  { email: "olivia@test.com", password: "test123", name: "Olivia" },
  { email: "paul@test.com", password: "test123", name: "Paul" },
  { email: "quinn@test.com", password: "test123", name: "Quinn" },
  { email: "ryan@test.com", password: "test123", name: "Ryan" },
  { email: "sarah@test.com", password: "test123", name: "Sarah" },
  { email: "tom@test.com", password: "test123", name: "Tom" },
];

// Real Amazon product data for each user
// Realistic image URLs via Unsplash keyword search
const ITEMS = [
  // Alice's items - practical home/lifestyle items
  [
    {
      itemName: "Keurig K-Express Single Serve K-Cup Pod Coffee Maker",
      description:
        "STRONG BREW: Increases the strength and bold taste of your coffee's flavor. 3 CUP SIZES: Brew an 8, 10, or 12 oz. cup at the push of a button. 42oz removable reservoir lets you brew up to 4 cups before refilling.",
      photo: "https://m.media-amazon.com/images/I/61wg-VbRsIL._AC_SL1500_.jpg",
      price: 59.99,
      reason:
        "watched one budgeting video and suddenly i'm convinced this is the key to fixing my entire life. probably delusional but also maybe genius??",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
    {
      itemName: "Shark Navigator Lift-Away Professional Vacuum NV356E",
      description:
        "LIFT-AWAY FUNCTIONALITY: Easily clean above-floor areas like stairs and furniture. ANTI-ALLERGEN COMPLETE SEAL with HEPA filter traps 99.9% of dust and allergens. PERFECT FOR PET OWNERS.",
      photo: "https://m.media-amazon.com/images/I/51tuHde-VAL._AC_SL1500_.jpg",
      price: 199.99,
      reason:
        "still in shock that my old vacuum literally sparked like a cartoon explosion. i want* the fancy one but i know this is 60% fear-based impulse.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
    {
      itemName: "Silent Wall Clock Non-Ticking Battery Operated – Olive Green",
      description:
        "Modern wall clock with muted olive green face and clean white frame. Large white Arabic numbers for easy reading. Silent quartz movement - no ticking sound.",
      photo: "https://m.media-amazon.com/images/I/81VE8fjMh7L._AC_SL1500_.jpg",
      price: 6.49,
      reason:
        "TICK TOCK TICK TOCK TICK TOCK bro PLEASE JUST STFU i can't take this anymore i need a new clock.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Instant Pot Duo 7-in-1 Electric Pressure Cooker",
      description:
        "7-in-1 functionality: pressure cooker, slow cooker, rice cooker, steamer, sauté pan, yogurt maker, and warmer. 13 customizable Smart Programs. Stainless steel cooking pot.",
      photo: "https://m.media-amazon.com/images/I/61SjFgxqBCL._AC_SL1500_.jpg",
      price: 99.95,
      reason:
        "everyone i know talks about this like it's a religion. i'm lowkey curious but highkey unsure if i'd ever use more than 1 setting.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
    {
      itemName: "Bamboo Cutting Board Set",
      description: "Set of 3 bamboo cutting boards. Eco-friendly.",
      photo: "https://m.media-amazon.com/images/I/81bhPiDcPSL._AC_SL1500_.jpg",
      price: 24.99,
      reason:
        "my current ones technically work, but these look cute and eco vibes are winning despite zero urgency.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
  ],
  // Bob's items - tech enthusiast
  [
    {
      itemName: "FUJIFILM X100VI Digital Camera (Black) Bundle",
      description:
        "40.2MP APS-C X-Trans CMOS 5 HR Sensor, X-Processor 5 Image Processor, Fujinon 23mm f/2 Lens, 6-Stop In-Body Image Stabilization. Bundle includes 64GB card, case, and accessories.",
      photo: "https://m.media-amazon.com/images/I/81JtXYem-fL._AC_SX679_.jpg",
      price: 2499.95,
      reason:
        "i saw ONE guy shoot cool street photos and immediately went 'yes i too am an artist.' brain chemistry permanently altered 🤯",
      isNeed: "Want",
      isFutureApprove: "Unsure",
    },
    {
      itemName: "charmast Portable Charger with Built-in Cables 10000mAh",
      description:
        "Slim portable charger with 4 built-in cables, 6 outputs and 3 inputs. Can charge 6 devices at once. Works with iPhone, Android, USB-C devices. Super slim design.",
      photo: "https://m.media-amazon.com/images/I/71NVBNrF1pL._AC_SL1500_.jpg",
      price: 20.99,
      reason:
        "honestly the built-in cables just scratch the engineer itch in my brain. feels futuristic. i want it.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Mechanical Keyboard RGB",
      description: "RGB mechanical keyboard with blue switches.",
      photo: "https://m.media-amazon.com/images/I/71axun+qTXL._AC_SL1500_.jpg",
      price: 89.99,
      reason:
        "not me convincing myself that RGB = productivity 😂 absolutely an impulse but it would look sick.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
    {
      itemName: "USB-C Hub",
      description: "USB-C hub with multiple ports.",
      photo:
        "https://m.media-amazon.com/images/I/61ZrDcJ4nYL._AC_SY300_SX300_QL70_ML2_.jpg",
      price: 34.99,
      reason:
        "my desk is a cable apocalypse 😅 this won't fix my life but it will make me feel like it could.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Wireless Mouse",
      description: "Ergonomic wireless mouse.",
      photo: "https://m.media-amazon.com/images/I/61GGx076lrL._AC_SL1500_.jpg",
      price: 29.99,
      reason:
        "my mouse is genuinely deceased. this is the only normal purchase here.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
  ],
  // Charlie's items - parent/family focused
  [
    {
      itemName: "National Geographic Kids Magic Set - 45 Magic Tricks",
      description:
        "Kids learn techniques behind famous magic tricks including cups and balls, false thumb tip, and more. Includes special magician's card deck and step-by-step video instructions from a professional magician.",
      photo: "https://m.media-amazon.com/images/I/81C0JBHqA2L._AC_SX679_.jpg",
      price: 22.39,
      reason:
        "Emma will absolutely lose her mind over this. Educational + adorable = immediate yes.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "LEGO City Interstellar Spaceship Toy 60430",
      description:
        "Building set with spacecraft model, drone, and astronaut figure. Features fold-out main thrusters and convertible drone bot jetpack. Digital construction guide via LEGO Builder app.",
      photo:
        "https://m.media-amazon.com/images/I/812jUhF64hL._AC_SY300_SX300_QL70_ML2_.jpg",
      price: 15.99,
      reason:
        "He talks about the universe constantly. This feels like feeding a healthy obsession.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Owala FreeSip Insulated Stainless Steel Water Bottle 24oz",
      description:
        "Patented FreeSip spout for sipping through straw or tilting to swig. Double-wall insulation keeps drinks cold for 24 hours. Push-button lid with lock. BPA-free.",
      photo: "https://m.media-amazon.com/images/I/416nzDnENFL._AC_SL1080_.jpg",
      price: 29.99,
      reason:
        "I'm trying to break the plastic bottle habit — cute design helps more than I'd like to admit.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Kids Art Supplies Set",
      description:
        "Big set of crayons, markers, colored pencils, and paper for kids.",
      photo: "https://m.media-amazon.com/images/I/71G92O5lsTL._AC_SL1500_.jpg",
      price: 19.99,
      reason:
        "She keeps raiding my desk. Getting her her own set is basically self-defense.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Board Game Collection",
      description: "Set of classic board games.",
      photo: "https://m.media-amazon.com/images/I/71AbDpYEkgL._AC_SL1500_.jpg",
      price: 45.99,
      reason:
        "Trying to lower screen time without starting a fight. Board games are the compromise.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Baby Monitor",
      description: "Video baby monitor with night vision.",
      photo: "https://m.media-amazon.com/images/I/61qMfoVil5L._AC_SL1500_.jpg",
      price: 129.99,
      reason:
        "Ours technically still works but the picture quality is abysmal. Not essential, but peace of mind is valuable.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
  ],
  // Diana's items - lifestyle/fashion
  [
    {
      itemName:
        "Louis Vuitton Pre-Loved OnTheGo Tote Reverse Monogram Giant MM",
      description:
        "Pre-loved authentic Louis Vuitton OnTheGo Tote in Reverse Monogram Giant MM size. Brown colorway.",
      photo: "https://m.media-amazon.com/images/I/81rXc9vmybL._AC_SX679_.jpg",
      price: 2985,
      reason:
        "This is pure chaos energy. I DON'T need it but omg I've wanted this exact style forever help.",
      isNeed: "Want",
      isFutureApprove: "No",
    },
    {
      itemName: "MAXYOYO Folding Sofa Bed with Pillow - Beige",
      description:
        "Versatile folding sofa bed with headrest and lumbar pillow. Comfortable shredded foam filling. Perfect for small spaces, reading, watching TV, or guest sleeping.",
      photo: "https://m.media-amazon.com/images/I/81AasRJcRxL._AC_SL1500_.jpg",
      price: 112.49,
      reason:
        "I'm tired of making guests sleep on literal hardwood. This is me being a good host... right?",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Designer Sunglasses",
      description: "Ray-Ban aviator sunglasses.",
      photo: "https://m.media-amazon.com/images/I/51QNAfosCuL._AC_SX679_.jpg",
      price: 154.99,
      reason:
        "Lost my last pair (they were my 25th) in the dumbest possible way (don't ask). Replacements are overdue.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Yoga Mat",
      description: "Premium yoga mat with carrying strap.",
      photo: "https://m.media-amazon.com/images/I/61WrjbRYC3L._AC_SL1500_.jpg",
      price: 39.99,
      reason:
        "My knees have simply given up. This mat is not a luxury; it's survival.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Candles Set",
      description: "Set of scented candles.",
      photo: "https://m.media-amazon.com/images/I/61EgR8ziFUL._AC_SL1000_.jpg",
      price: 24.99,
      reason:
        "My apartment feels like 'depressed college sophomore' and I'm trying to upgrade to 'functional adult.' Candles are step one.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
  ],
  // Eve's items - outdoor/practical
  [
    {
      itemName: "Balaclava Ski Mask - Winter Face Mask",
      description:
        "Winter face mask for men and women. Cold weather gear for skiing, snowboarding, and motorcycle riding.",
      photo: "https://m.media-amazon.com/images/I/71ouyCT82CL._AC_SX679_.jpg",
      price: 14.95,
      reason:
        "last ski trip i nearly froze my face off. scarf is NOT enough. we have learned.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName:
        "Keep It Simple Y'all: Easy Dinners from Your Barefoot Neighbor",
      description:
        "Cookbook featuring easy dinner recipes from the Barefoot Neighbor. Simple, approachable home cooking.",
      photo:
        "https://m.media-amazon.com/images/I/51Fa0imDlhL._SX342_SY445_ControlCacheEqualizer_.jpg",
      price: 7.23,
      reason:
        "this is definitely me pretending i'm entering my 'cooking era' again. history says otherwise but hope persists.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
    {
      itemName:
        "Pop-Tarts Emotional Support Plushies by Relatable - 5 Plush Pals",
      description:
        "Cute plushies shaped like Pop-Tarts flavors. Each plush has a silly face and squishy feel. Perfect funny gifts for friends. Comes in adorable plush box.",
      photo: "https://m.media-amazon.com/images/I/812P0dj2WuL._AC_SL1500_.jpg",
      price: 16.99,
      reason:
        "they're so dumb it's actually beautiful. roommate will scream laughing.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Hiking Backpack",
      description: "30L hiking backpack with hydration system.",
      photo: "https://m.media-amazon.com/images/I/71m8NE6EVcL._AC_SY879_.jpg",
      price: 79.99,
      reason:
        "my current bag is one rip away from a dramatic collapse. this is not urgent but it IS imminent.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
    {
      itemName: "Camping Tent",
      description: "2-person camping tent.",
      photo: "https://m.media-amazon.com/images/I/61MjVUfx6CL._AC_SL1500_.jpg",
      price: 89.99,
      reason:
        "never camped. planning to camp. identity crisis? maybe. tent impulse purchase? absolutely.",
      isNeed: "Want",
      isFutureApprove: "Unsure",
    },
  ],
  // Dianne's items - fitness/wellness focused
  [
    {
      itemName: "Yoga Mat Extra Thick 1/2 inch Premium Exercise Mat",
      description:
        "Extra thick 1/2 inch premium exercise mat with double-sided non-slip surface. Perfect for yoga, pilates, and floor exercises. Easy to clean and carry.",
      photo: "https://m.media-amazon.com/images/I/71XdZff1guL._AC_SL1500_.jpg",
      price: 24.99,
      reason:
        "i physically cannot do floor exercises without sinking into the void. thicker mat required.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Fitbit Charge 6 Fitness Tracker",
      description:
        "Advanced fitness tracker with built-in GPS, heart rate monitoring, sleep tracking, and 40+ exercise modes. Water resistant up to 50m.",
      photo:
        "https://m.media-amazon.com/images/I/61QikQMfgeL._AC_SX300_SY300_QL70_ML2_.jpg",
      price: 159.95,
      reason: "if i see my step count maybe i'll stop being sedentary. maybe.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
    {
      itemName: "Resistance Bands Set with Door Anchor",
      description:
        "Set of 5 resistance bands with varying resistance levels, door anchor, ankle straps, and carrying bag. Perfect for home workouts.",
      photo: "https://m.media-amazon.com/images/I/71tWTWashCL._AC_SL1200_.jpg",
      price: 19.99,
      reason:
        "trying to trick myself into working out at home since the gym is bleeding my wallet dry.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Protein Powder",
      description: "Vanilla whey protein powder, 2lb container.",
      photo: "https://m.media-amazon.com/images/I/71Zua-6y90L._AC_SL1500_.jpg",
      price: 34.99,
      reason:
        "this is one of those 'convenience impulse' things but realistically i'll probably use it.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
    {
      itemName: "Foam Roller",
      description: "High-density foam roller for muscle recovery.",
      photo: "https://m.media-amazon.com/images/I/719fCtAm+hL._AC_SL1500_.jpg",
      price: 19.99,
      reason: "hurts like evil but fixes everything. worth.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Workout Clothes Set",
      description: "Set of 3 workout outfits.",
      photo: "https://m.media-amazon.com/images/I/6189rr3zzXL._AC_SX679_.jpg",
      price: 49.99,
      reason:
        "having one outfit is becoming a logistical nightmare. multiple sets = sanity.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
  ],
  // Frank's items - gamer/entertainment
  [
    {
      itemName: "Gaming Headset",
      description: "Wireless gaming headset with surround sound.",
      photo:
        "https://m.media-amazon.com/images/I/61SuaWIsRtL._AC_SY300_SX300_QL70_ML2_.jpg",
      price: 129.99,
      reason:
        "dude my headset broke mid-game and my team was PISSED. need a new one asap. wireless would be nice too so i'm not tangled in cables",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Gaming Chair",
      description: "Ergonomic gaming chair with lumbar support.",
      photo: "https://m.media-amazon.com/images/I/71ML+A04PFL._AC_SL1500_.jpg",
      price: 299.99,
      reason:
        "my back is screaming every time i sit down. this feels like an impulse but also… spine health?",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Nintendo Switch Game",
      description: "Latest Zelda game.",
      photo:
        "https://m.media-amazon.com/images/I/515uYYB3GfS._SY445_SX342_QL70_ML2_.jpg",
      price: 59.99,
      reason:
        "everyone's playing it and i'm tired of dodging spoilers. pure fomo purchase.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
    {
      itemName: "Controller",
      description: "Xbox wireless controller.",
      photo: "https://m.media-amazon.com/images/I/61BtEYVZjwL._SL1500_.jpg",
      price: 59.99,
      reason:
        "friends want couch co-op nights and i'm tired of taking turns like it's 2003.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Monitor Stand",
      description: "Dual monitor stand for desk.",
      photo:
        "https://m.media-amazon.com/images/I/61CcipLafUL._AC_SX300_SY300_QL70_ML2_.jpg",
      price: 79.99,
      reason:
        "desk is a disaster zone and maybe this will make me feel like a real adult with a real setup.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
  ],
  // Grace's items - artist/creative
  [
    {
      itemName: "Art Supplies Set",
      description: "Professional acrylic paint set with brushes.",
      photo: "https://m.media-amazon.com/images/I/81RHc+Ws-ES._AC_SL1500_.jpg",
      price: 89.99,
      reason:
        "Feeling that itch to make something again. Not sure if it's a phase, but the idea makes me happy 😊",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
    {
      itemName: "Sketchbook",
      description: "High-quality sketchbook with thick paper.",
      photo: "https://m.media-amazon.com/images/I/818lckaWh0L._AC_SL1500_.jpg",
      price: 24.99,
      reason:
        "Filled the last few pages last night. Starting a new one always feels like opening a fresh window.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Drawing Tablet",
      description: "Digital drawing tablet for computer.",
      photo: "https://m.media-amazon.com/images/I/61bZALc7r0L._AC_SL1000_.jpg",
      price: 199.99,
      reason:
        "Digital art seems magical but I'm worried I'll buy this and then freeze from perfectionism 🤔",
      isNeed: "Want",
      isFutureApprove: "Unsure",
    },
    {
      itemName: "Easel",
      description: "Wooden easel for canvas painting.",
      photo: "https://m.media-amazon.com/images/I/71Hd39q64JL._AC_SL1500_.jpg",
      price: 49.99,
      reason:
        "I literally cannot paint without one. Practicality wins this round.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Art Prints",
      description: "Set of framed art prints for wall decor.",
      photo: "https://m.media-amazon.com/images/I/81F4V399DvL._AC_SL1500_.jpg",
      price: 34.99,
      reason:
        "I want my walls to feel like a place where ideas live. These prints feel right 😌",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
  ],
  // Henry's items - musician/audio
  [
    {
      itemName: "Guitar Strings",
      description: "Set of acoustic guitar strings.",
      photo: "https://m.media-amazon.com/images/I/71yZxl196-L._AC_SL1000_.jpg",
      price: 12.99,
      reason: "Strings are dead and buzzing. This isn't optional anymore.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Microphone",
      description: "USB condenser microphone for recording.",
      photo: "https://m.media-amazon.com/images/I/611Z7Gx4Z7L._AC_SL1500_.jpg",
      price: 79.99,
      reason: "Want to record demos without using my phone mic like a caveman.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Headphones",
      description: "Studio monitor headphones.",
      photo:
        "https://m.media-amazon.com/images/I/51F-Ok9xuzL._AC_SY300_SX300_QL70_ML2_.jpg",
      price: 149.99,
      reason:
        "Mixing on earbuds is basically mixing blindfolded. Actual gear required.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Audio Interface",
      description: "USB audio interface for recording.",
      photo: "https://m.media-amazon.com/images/I/71GiojmKOxL._AC_SL1500_.jpg",
      price: 129.99,
      reason:
        "This is literally the centerpiece of recording. Can't proceed without it.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Music Stand",
      description: "Adjustable music stand.",
      photo: "https://m.media-amazon.com/images/I/61t3essVyXL._AC_SL1500_.jpg",
      price: 24.99,
      reason:
        "Sick of propping sheet music against cereal boxes. Time for a real stand.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
  ],
  // Iris's items - bookworm/reader
  [
    {
      itemName: "Kindle Paperwhite",
      description: "Waterproof e-reader with built-in light.",
      photo: "https://m.media-amazon.com/images/I/71mjD4DTmqL._AC_SL1500_.jpg",
      price: 139.99,
      reason:
        "Books are stacking horizontally now. Storage is gone. Kindle feels like a peaceful solution.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Book Light",
      description: "Clip-on book light for reading.",
      photo: "https://m.media-amazon.com/images/I/81n7M-T19NL._AC_SL1500_.jpg",
      price: 14.99,
      reason:
        "Want to read without waking my partner. Small thing, big improvement.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Bookshelf",
      description: "5-tier bookshelf.",
      photo: "https://m.media-amazon.com/images/I/815QDdPtECL._AC_SL1500_.jpg",
      price: 79.99,
      reason: "I cannot keep living inside a literary landslide hazard.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Reading Glasses",
      description: "Blue light blocking reading glasses.",
      photo: "https://m.media-amazon.com/images/I/61K4KMmQm+L._AC_SX679_.jpg",
      price: 19.99,
      reason:
        "Eyes are tired. Could be age, could be screens, could be denial. Glasses might help.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
    {
      itemName: "Bookmark Set",
      description: "Set of decorative bookmarks.",
      photo: "https://m.media-amazon.com/images/I/81EKKdp5iKL._AC_SL1500_.jpg",
      price: 9.99,
      reason:
        "Receipts keep ending up in the wash… bookmarks would save many pages.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
  ],
  // Jack's items - DIY/home improvement
  [
    {
      itemName: "Tool Set",
      description: "Complete tool set with 100+ pieces.",
      photo: "https://m.media-amazon.com/images/I/714Mrvt8q+L._AC_SL1500_.jpg",
      price: 89.99,
      reason:
        "New house = endless repairs. I'm tired of borrowing tools like a teenager.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Drill",
      description: "Cordless power drill.",
      photo: "https://m.media-amazon.com/images/I/71RmwCdSlcL._AC_SL1500_.jpg",
      price: 79.99,
      reason: "Learned the hard way that a hammer is not a universal tool.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Paint Brushes",
      description: "Set of professional paint brushes.",
      photo: "https://m.media-amazon.com/images/I/81CB52uLDvL._AC_SL1500_.jpg",
      price: 24.99,
      reason:
        "If I use the cheap brushes again, the walls will look like camouflage. Need proper ones.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Ladder",
      description: "6-foot step ladder.",
      photo: "https://m.media-amazon.com/images/I/61HiLaGqC-L._AC_SL1500_.jpg",
      price: 59.99,
      reason: "I'm short, ceilings are tall — enough said.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Workbench",
      description: "Portable workbench.",
      photo: "https://m.media-amazon.com/images/I/61k7JgMlyUL._AC_SL1500_.jpg",
      price: 129.99,
      reason:
        "Kitchen table is suffering. Workbench will save both my sanity and the table.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
  ],
  // Kate's items - fashion/style
  [
    {
      itemName: "Designer Handbag",
      description: "Leather crossbody bag.",
      photo: "https://m.media-amazon.com/images/I/71zXUK+E6AL._AC_SY695_.jpg",
      price: 199.99,
      reason:
        "I keep convincing myself that crossbody = completely different category of bag. Delusion? Sure.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
    {
      itemName: "Jewelry Set",
      description: "Set of gold-plated jewelry.",
      photo: "https://m.media-amazon.com/images/I/818BnYh9Q8L._AC_SY695_.jpg",
      price: 49.99,
      reason:
        "My old stuff is literally rusting on me. I deserve something that doesn't stain my skin green.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Perfume",
      description: "Luxury perfume 3.4oz.",
      photo: "https://m.media-amazon.com/images/I/61L-+6Qa4BL._SL1500_.jpg",
      price: 89.99,
      reason:
        "I'm bored of smelling the same every day. Want something that feels like 'new me'. Very impulse-coded.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Makeup Set",
      description: "Professional makeup palette.",
      photo:
        "https://m.media-amazon.com/images/I/51WPVic6q0L._SY300_SX300_QL70_ML2_.jpg",
      price: 59.99,
      reason:
        "Using expired makeup is probably a crime. Time to upgrade and not give myself a rash.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Hair Dryer",
      description: "Professional hair dryer with diffuser.",
      photo: "https://m.media-amazon.com/images/I/51WEBM8+9LL._SL1500_.jpg",
      price: 39.99,
      reason: "My old one broke",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
  ],
  // Liam's items - sports/athletic
  [
    {
      itemName: "Basketball",
      description: "Official size basketball.",
      photo: "https://m.media-amazon.com/images/I/91sjL7skP2S._AC_SL1500_.jpg",
      price: 24.99,
      reason:
        "Just want to play again. Nothing fancy, just need an actual ball.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Running Shoes",
      description: "Professional running shoes.",
      photo: "https://m.media-amazon.com/images/I/71MEAEU4whL._AC_SY695_.jpg",
      price: 129.99,
      reason: "Old shoes are dangerous at this point. I need proper support.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Gym Bag",
      description: "Large gym bag with compartments.",
      photo: "https://m.media-amazon.com/images/I/81TcYURW40L._AC_SX679_.jpg",
      price: 34.99,
      reason: "Carrying stuff in a grocery bag is… not it.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Protein Shaker",
      description: "Blender bottle for protein shakes.",
      photo: "https://m.media-amazon.com/images/I/61FmoEliunL._AC_SL1500_.jpg",
      price: 12.99,
      reason: "Clumps are ruining my life. Shaker solves the issue.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Jump Rope",
      description: "Weighted jump rope for cardio.",
      photo: "https://m.media-amazon.com/images/I/71wm42EtoNL._AC_SL1500_.jpg",
      price: 19.99,
      reason: "Easy cardio, small apartment — perfect.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
  ],
  // Mia's items - pet owner
  [
    {
      itemName: "Dog Bed",
      description: "Orthopedic dog bed for large dogs.",
      photo: "https://m.media-amazon.com/images/I/51TDv7a1phL._AC_SL1200_.jpg",
      price: 49.99,
      reason:
        "he's getting older and deserves something soft for his joints. feels right.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Cat Tree",
      description: "Multi-level cat tree with scratching posts.",
      photo: "https://m.media-amazon.com/images/I/71oeawcwU7L._AC_SL1500_.jpg",
      price: 79.99,
      reason:
        "if this doesn't stop her from climbing the curtains idk what will.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Pet Food Storage",
      description: "Airtight pet food storage container.",
      photo: "https://m.media-amazon.com/images/I/61O0zj+RX7L._AC_SL1500_.jpg",
      price: 24.99,
      reason:
        "keeps going stale and i'm tired of rolling the bag like a burrito.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Pet Toys Set",
      description: "Set of interactive pet toys.",
      photo: "https://m.media-amazon.com/images/I/813uC3hs3oL._AC_SL1500_.jpg",
      price: 19.99,
      reason: "their chaos increases when they're bored. toys = peace treaty.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Pet Grooming Kit",
      description: "Complete pet grooming kit.",
      photo: "https://m.media-amazon.com/images/I/71YzrQBZ4+L._AC_SL1500_.jpg",
      price: 34.99,
      reason:
        "groomer prices make me ill. might learn to do this myself… maybe.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
  ],
  // Noah's items - student/study
  [
    {
      itemName: "Laptop Stand",
      description: "Adjustable laptop stand for desk.",
      photo: "https://m.media-amazon.com/images/I/71pNZrEkYWL._AC_SL1500_.jpg",
      price: 29.99,
      reason:
        "currently hunched like a shrimp. stand would save my spine AND my mood.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Notebook Set",
      description: "Set of 5 college-ruled notebooks.",
      photo: "https://m.media-amazon.com/images/I/71yHOVrcDiL._AC_SL1500_.jpg",
      price: 14.99,
      reason: "school starts in like 2 seconds and i forgot notebooks existed.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Desk Lamp",
      description: "LED desk lamp with adjustable brightness.",
      photo: "https://m.media-amazon.com/images/I/71Xa0fzUiGL._AC_SL1500_.jpg",
      price: 24.99,
      reason:
        "overhead light makes me want to cry. need gentler lighting to survive homework.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Backpack",
      description: "Laptop backpack with multiple compartments.",
      photo: "https://m.media-amazon.com/images/I/91PF4HmzZML._AC_SL1500_.jpg",
      price: 49.99,
      reason: "bro my backpack is literally falling apart.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Calculator",
      description: "Scientific calculator for math classes.",
      photo: "https://m.media-amazon.com/images/I/71Bq3CsON8L._AC_SL1500_.jpg",
      price: 19.99,
      reason: "prof says no phones allowed. guess i need the real thing.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
  ],
  // Olivia's items - home decor
  [
    {
      itemName: "Throw Pillows Set",
      description: "Set of 4 decorative throw pillows.",
      photo: "https://m.media-amazon.com/images/I/71bUyPwQm9L._AC_SL1500_.jpg",
      price: 39.99,
      reason:
        "The couch looks emotionally vacant 😅 Pillows would fix that instantly.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Area Rug",
      description: "5x7 area rug for living room.",
      photo: "https://m.media-amazon.com/images/I/91tpF-73gYL._AC_SL1500_.jpg",
      price: 89.99,
      reason:
        "My feet deserve warmth and also I want the room to stop echoing.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Wall Art",
      description: "Set of 3 framed wall art prints.",
      photo: "https://m.media-amazon.com/images/I/81GC33CC6DL._AC_SL1500_.jpg",
      price: 49.99,
      reason:
        "Blank walls feel like I'm living in a rental unit inside a rental unit 😂",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Plant Stand",
      description: "Tiered plant stand for indoor plants.",
      photo: "https://m.media-amazon.com/images/I/71a+FMczcwL._AC_SL1500_.jpg",
      price: 34.99,
      reason:
        "Plants are staging a coup on my floor 😅 Need vertical organization asap.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Curtains",
      description: "Blackout curtains for bedroom.",
      photo: "https://m.media-amazon.com/images/I/71HJGiZ6OCL._AC_SL1500_.jpg",
      price: 44.99,
      reason:
        "Sunrise should not be my alarm clock. Blackout solves everything.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
  ],
  // Paul's items - cook/kitchen
  [
    {
      itemName: "Chef's Knife",
      description: "Professional 8-inch chef's knife.",
      photo: "https://m.media-amazon.com/images/I/71ZFQ6aGHeL._AC_SL1500_.jpg",
      price: 79.99,
      reason:
        "My current knife squishes tomatoes instead of cutting them. Completely unacceptable.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Cast Iron Skillet",
      description: "12-inch pre-seasoned cast iron skillet.",
      photo: "https://m.media-amazon.com/images/I/5171PN2riwL._AC_SL1250_.jpg",
      price: 34.99,
      reason:
        "Everyone hypes cast iron and I want to see if the flavor thing is real. Mildly impulsive curiosity purchase.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Kitchen Scale",
      description: "Digital kitchen scale.",
      photo: "https://m.media-amazon.com/images/I/71eiII6MS-L._AC_SL1500_.jpg",
      price: 19.99,
      reason: "Precision matters and my baking failures prove it.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Spice Rack",
      description: "Wall-mounted spice rack.",
      photo: "https://m.media-amazon.com/images/I/71AiuQKcleL._AC_SL1500_.jpg",
      price: 24.99,
      reason: "Finding paprika should not require a treasure hunt.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Apron",
      description: "Professional chef's apron.",
      photo: "https://m.media-amazon.com/images/I/71R9dGe+D2L._AC_SL1500_.jpg",
      price: 14.99,
      reason: "I ruin shirts weekly. Apron is basically self-defense.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
  ],
  // Quinn's items - minimalist/practical
  [
    {
      itemName: "Minimalist Wallet",
      description: "Slim RFID-blocking wallet.",
      photo: "https://m.media-amazon.com/images/I/71NjJ1YgR5L._AC_SL1500_.jpg",
      price: 29.99,
      reason:
        "Current wallet is bulky and makes me irrationally annoyed. Slim version preferred.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Phone Case",
      description: "Protective phone case.",
      photo: "https://m.media-amazon.com/images/I/71LS35zBKWL._AC_SL1500_.jpg",
      price: 19.99,
      reason: "I cannot afford another cracked screen situation. Necessity.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Cable Organizer",
      description: "Cable management system.",
      photo: "https://m.media-amazon.com/images/I/81hLyL0rX2S._AC_SL1500_.jpg",
      price: 12.99,
      reason:
        "My cables look like spaghetti. This is a small but meaningful quality-of-life upgrade.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Storage Bins",
      description: "Set of 6 clear storage bins.",
      photo: "https://m.media-amazon.com/images/I/61koVlJ64PL._AC_SL1500_.jpg",
      price: 24.99,
      reason: "I like seeing what I own. Transparency = efficiency.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Desk Organizer",
      description: "Desktop organizer for supplies.",
      photo: "https://m.media-amazon.com/images/I/81InLBb2JcL._AC_SL1500_.jpg",
      price: 16.99,
      reason: "Visual clutter equals mental clutter. Must eliminate.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
  ],
  // Ryan's items - fitness/health
  [
    {
      itemName: "Dumbbell Set",
      description: "Adjustable dumbbell set 5-50lbs.",
      photo: "https://m.media-amazon.com/images/I/71f4Mg4P9fL._AC_SL1500_.jpg",
      price: 199.99,
      reason:
        "home workouts would be so much easier with these. feels like a smart investment… or at least i'm telling myself that.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Pull-up Bar",
      description: "Doorway pull-up bar.",
      photo: "https://m.media-amazon.com/images/I/619ozwh22nS._AC_SL1500_.jpg",
      price: 29.99,
      reason: "i want to finally do a pull-up before i die. this is step one.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Yoga Block Set",
      description: "Set of 2 yoga blocks.",
      photo: "https://m.media-amazon.com/images/I/513sSIGgyHL._AC_SL1500_.jpg",
      price: 14.99,
      reason:
        "i lack flexibility on a molecular level. blocks would help a lot.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Massage Gun",
      description: "Percussion massage gun.",
      photo: "https://m.media-amazon.com/images/I/71SXDvzuSXL._AC_SL1500_.jpg",
      price: 79.99,
      reason:
        "friend swears by theirs but this is definitely a semi-impulse 'treat my muscles' moment.",
      isNeed: "Want",
      isFutureApprove: "Maybe",
    },
    {
      itemName: "Gym Towel",
      description: "Quick-dry gym towel.",
      photo: "https://m.media-amazon.com/images/I/91c08Kxit6L._AC_SL1500_.jpg",
      price: 12.99,
      reason: "gym said no more paper towels. towel required.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
  ],
  // Sarah's items - beauty/self-care
  [
    {
      itemName: "Skincare Set",
      description: "Complete skincare routine set.",
      photo: "https://m.media-amazon.com/images/I/81ZSzkx7gcL._SL1500_.jpg",
      price: 69.99,
      reason:
        "I've hit that age where my face needs more than vibes and water. Full routine might help.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Hair Straightener",
      description: "Professional hair straightener.",
      photo: "https://m.media-amazon.com/images/I/61VkRoH0BSL._SL1500_.jpg",
      price: 49.99,
      reason: "My old one broke",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Face Mask Set",
      description: "Set of 12 sheet masks.",
      photo: "https://m.media-amazon.com/images/I/81qISzGfflL._SL1500_.jpg",
      price: 19.99,
      reason:
        "Sheet masks are like little vacations for my brain. Impulse? Maybe. Self-care? Also yes.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Nail Polish Set",
      description: "Set of 10 nail polish colors.",
      photo: "https://m.media-amazon.com/images/I/71M5JB9G8yL._SL1500_.jpg",
      price: 24.99,
      reason:
        "Salon prices are getting violent. DIY might save money if I stick with it.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Bath Bombs Set",
      description: "Set of 6 luxury bath bombs.",
      photo: "https://m.media-amazon.com/images/I/71pb+JOaCHL._AC_SL1080_.jpg",
      price: 16.99,
      reason: "I want my bath to feel like a whimsical fantasy novel scene.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
  ],
  // Tom's items - outdoor/adventure
  [
    {
      itemName: "Camping Stove",
      description: "Portable camping stove.",
      photo: "https://m.media-amazon.com/images/I/61+FmqopgPL._AC_SL1424_.jpg",
      price: 39.99,
      reason:
        "cooking over fire is cool until it isn't. stove = less chaos, more food.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Sleeping Bag",
      description: "Cold weather sleeping bag.",
      photo: "https://m.media-amazon.com/images/I/81D0F56EvDL._AC_SL1500_.jpg",
      price: 59.99,
      reason:
        "mountain nights get aggressively cold. i would like to not freeze.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Flashlight",
      description: "High-powered LED flashlight.",
      photo: "https://m.media-amazon.com/images/I/91H2HARjx0L._AC_SL1500_.jpg",
      price: 19.99,
      reason:
        "phone flashlight is basically a candle in a storm. need the real deal.",
      isNeed: "Need",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Multi-tool",
      description: "Swiss Army style multi-tool.",
      photo: "https://source.unsplash.com/featured/?multitool,pocket,knife",
      price: 34.99,
      reason:
        "feels extremely 'prepared adventurer' vibes which i enjoy. may or may not actually need it.",
      isNeed: "Want",
      isFutureApprove: "Yes",
    },
    {
      itemName: "Water Bottle",
      description: "Insulated water bottle 32oz.",
      photo: "https://m.media-amazon.com/images/I/71XJK6bWJKL._AC_SL1500_.jpg",
      price: 24.99,
      reason:
        "hydration is my arch-nemesis. maybe a better bottle will trick me into drinking? maybe.",
      isNeed: "Want",
      isFutureApprove: "Yes",
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

    // Clear existing data first
    console.log("🗑️  Clearing existing database...");
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).drop();
    }
    console.log("✅ Database cleared\n");

    // Initialize concepts (no external dependencies needed for seed)
    const userAuth = new UserAuthConcept(db);
    const userProfile = new UserProfileConcept(db);
    const itemCollection = new ItemCollectionConcept(
      db,
      {
        fetchItemDetails: () => Promise.resolve({ error: "Mock API" }),
      } as AmazonAPIClient,
      {
        executeLLM: () => Promise.resolve({ error: "Mock API" }),
        executeLLMWithSchema: () => Promise.resolve({ error: "Mock API" }),
        clearCache: () => {},
      } as GeminiLLMClient,
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
                  `    ✓ Added "${itemData.itemName}" for ${user.name}`,
                );
                return itemId;
              }
              return null;
            }),
        );
      }
    }

    await Promise.all(itemPromises);

    console.log(`\n✅ Created ${allItemIds.length} items total\n`);

    // 4. Create cross-swipes (ensure EVERY item gets feedback)
    console.log("👆 Creating swipe data...");

    // Strategy: Have ALL users create swipes so everyone has review data
    // Each user swipes on a subset of items from other users
    const swipingUsers = createdUsers; // ALL users create swipes

    console.log(
      `  ${swipingUsers.length} users will swipe on items from other users`,
    );

    // Process swipes in batches to avoid overwhelming the database
    const BATCH_SIZE = 100;
    let totalSwipesCreated = 0;
    let totalSwipesFailed = 0;
    const userSwipeCounts = new Map<ID, number>(); // Track swipes per user

    for (const swiper of swipingUsers) {
      const swipePromises = [];

      // Get items NOT owned by this user
      const otherUsersItems = allItemIds.filter((itemId) => {
        const itemOwner = itemOwnerMap.get(itemId);
        return itemOwner && itemOwner !== swiper.uid;
      });

      // Each user swipes on a random subset of other users' items
      // This ensures everyone has some swipes but doesn't create too many
      const shuffledItems = [...otherUsersItems].sort(
        () => Math.random() - 0.5,
      );
      // Each user swipes on ~30-40 items to ensure good coverage
      // With 21 users swiping on 30+ items each, most items will get multiple swipes
      const itemsToSwipe = shuffledItems.slice(
        0,
        Math.min(40, shuffledItems.length),
      );

      for (const itemId of itemsToSwipe) {
        // Random decision with slight bias toward "Buy" (60% buy, 40% skip)
        const decision = Math.random() > 0.4 ? "Buy" : "Don't Buy";

        swipePromises.push(
          swipeSystem
            .recordSwipe({
              ownerUserId: swiper.uid,
              itemId,
              decision,
            })
            .then((result) => result) // Keep the result as-is
            .catch((err) => {
              // Only catch actual promise rejections, not error objects
              return { error: String(err) };
            }),
        );
      }

      // Process this user's swipes in batches
      let userSwipeCount = 0;
      for (let i = 0; i < swipePromises.length; i += BATCH_SIZE) {
        const batch = swipePromises.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch);
        const batchSuccess = batchResults.filter(
          (r) => r && !("error" in r),
        ).length;
        const batchErrors = batchResults.filter(
          (r) => r && "error" in r,
        ).length;
        totalSwipesCreated += batchSuccess;
        totalSwipesFailed += batchErrors;
        userSwipeCount += batchSuccess;
      }
      userSwipeCounts.set(swiper.uid, userSwipeCount);
    }

    const swipeCount = totalSwipesCreated;
    const errorCount = totalSwipesFailed;

    console.log(`\n✅ Created ${swipeCount} swipes total`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} swipes failed (likely duplicates)`);
    }

    // Show swipe counts for a few users as examples
    console.log("  Sample user swipe counts:");
    for (let i = 0; i < Math.min(3, createdUsers.length); i++) {
      const user = createdUsers[i];
      const count = userSwipeCounts.get(user.uid) || 0;
      console.log(`    ${user.name}: ${count} swipes`);
    }

    // Verify swipes were created correctly by checking user swipe counts
    if (swipeCount > 0) {
      console.log("  Verifying swipes were created correctly...");
      let usersWithSwipes = 0;
      const sampleUsers = createdUsers.slice(0, 5); // Check first 5 users

      for (const user of sampleUsers) {
        const userSwipeCount = await swipeSystem._getUserSwipeCount({
          userId: user.uid,
        });
        if (!("error" in userSwipeCount) && userSwipeCount.count > 0) {
          usersWithSwipes++;
          if (usersWithSwipes === 1) {
            // Log first user as example
            const userStats = await swipeSystem._getUserSwipeStatistics({
              userId: user.uid,
            });
            if (!("error" in userStats)) {
              console.log(
                `  ✓ ${user.name} has ${userSwipeCount.count} swipes (${userStats.buyCount} Buy, ${userStats.dontBuyCount} Don't Buy)`,
              );
            }
          }
        } else {
          console.log(
            `  ⚠️  ${user.name} has 0 swipes - this might indicate an issue!`,
          );
        }
      }
      console.log(
        `  ✓ Verified ${usersWithSwipes}/${sampleUsers.length} sample users have swipes`,
      );

      // Also verify community stats for a sample item
      if (allItemIds.length > 0) {
        const sampleItemId = allItemIds[0];
        const sampleItemOwner = itemOwnerMap.get(sampleItemId);
        if (sampleItemOwner) {
          const communityStats = await swipeSystem._getCommunitySwipeStats({
            itemId: sampleItemId,
            excludeUserId: sampleItemOwner,
          });
          if (!("error" in communityStats[0])) {
            console.log(
              `  ✓ Sample item has ${
                communityStats[0].total
              } community swipes (${communityStats[0].approval} approvals)`,
            );
          }
        }
      }
    } else {
      console.log(
        "  ⚠️  WARNING: No swipes were created! This might indicate an issue.",
      );
    }
    console.log();

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
        () => Math.random() - 0.5,
      );
      const queueItems = shuffledItems.slice(
        0,
        Math.min(10, shuffledItems.length),
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
          `  ⚠️ Not enough items for ${user.name}'s queue (${queueItems.length}/10)`,
        );
      }
    }

    // Final verification: Check specific users like Charlie
    console.log("\n🔍 Final verification for key users:");
    for (const user of createdUsers) {
      if (user.name === "Charlie" || user.name === "Dianne") {
        const userSwipeCount = await swipeSystem._getUserSwipeCount({
          userId: user.uid,
        });
        const userStats = await swipeSystem._getUserSwipeStatistics({
          userId: user.uid,
        });
        const wishlist = await itemCollection._getUserWishList({
          owner: user.uid,
        });

        console.log(`\n  ${user.name} (${user.email}):`);
        if (!("error" in userSwipeCount)) {
          console.log(`    ✓ Swipes: ${userSwipeCount.count}`);
        } else {
          console.log(`    ✗ Swipes: ERROR - ${userSwipeCount.error}`);
        }
        if (!("error" in userStats)) {
          console.log(
            `    ✓ Buy: ${userStats.buyCount}, Don't Buy: ${userStats.dontBuyCount}`,
          );
        }
        if (!("error" in wishlist) && wishlist.length > 0) {
          console.log(`    ✓ Wishlist items: ${wishlist.length}`);
        } else {
          console.log(`    ✗ Wishlist: ${wishlist.length} items`);
        }
      }
    }

    console.log("\n🎉 Database seeded successfully!\n");
    console.log("📝 Test accounts created:");
    for (const user of createdUsers) {
      const userData = USERS.find((u) => u.email === user.email);
      const password = userData?.password || "test123";
      console.log(`   ${user.name}: ${user.email} / ${password}`);
    }
    console.log("\n💡 Testing recommendations:");
    console.log(
      "   • Login with any of the accounts above to Swipe on Items from other users",
    );
    console.log(
      "   • Many items have pre-existing community reviews from seed data\n",
    );
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
