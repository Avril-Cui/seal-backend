---
timestamp: 'Tue Nov 25 2025 13:29:33 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_132933.6c592c3d.md]]'
content_id: a050ddcdea9bd1a24ba646f4256ecbb5bc4f7a508cb138e50ac0d1eff06c1283
---

# response:

You are absolutely right to point out those remaining errors! My apologies for the oversight and for misplacing the `sleep` method.

Let's address each error clearly.

***

### **Understanding and Fixing the Errors**

1. **`TS2307 [ERROR]: Import "@google/generative-ai" not a dependency...`**
   * **Cause**: This means the Deno project itself doesn't know where to find the `@google/generative-ai` package. Even though you have an `import` statement, Deno needs to know how to resolve it, typically via `deno.json` or `deno.jsonc`'s `imports` or `dependencies`.
   * **Solution (Action Required by You)**: You need to run the suggested Deno command in your project's root directory:
     ```bash
     deno add npm:@google/generative-ai
     ```
     This command will update your `deno.json` (or create it if it doesn't exist) to include the npm dependency, allowing Deno's type checker and runtime to find the package.

2. **`TS18046 [ERROR]: 'acc' is of type 'unknown'.` & `TS2698 [ERROR]: Spread types may only be created from object types.`**
   * **Cause**: These errors occur in the `MockAmazonAPIClient`'s constructor. The TypeScript compiler is struggling to infer the type of the `acc` (accumulator) parameter within the `reduce` function when it's initialized with `{}` and then spread. Even with a type assertion on the initial value, sometimes in complex object literals, the inference can be brittle.
   * **Solution**: We'll explicitly type the `acc` parameter in the `reduce` callback function itself for maximum clarity and robustness. This ensures TypeScript knows exactly what `acc` is.

3. **`TS2339 [ERROR]: Property 'sleep' does not exist on type 'GeminiLLM'. await this.sleep(backoffMs);`**
   * **Cause**: This is the most direct error. Your `GeminiLLM` class (the actual implementation, not the mock) is calling `this.sleep(backoffMs)` inside its `executeLLM` method, but you haven't defined a `sleep` method within the `GeminiLLM` class. I mistakenly added it to the *mock* in the previous response, but the error is in your actual `GeminiLLM` service.
   * **Solution**: Add a private `sleep` helper method directly to your `GeminiLLM` class in `src/services/geminiLLM.ts`.

***

### **Corrected Files**

Here are the corrected versions of your `ItemCollectionConcept.ts` (minor changes to `ItemDoc` and `WishListDoc` exports), `geminiLLM.ts` (adding `sleep`), and the `ItemCollectionConcept.test.ts` (fixing mock client typing).

***

### **1. Corrected `src/concepts/ItemCollection/ItemCollectionConcept.ts`**

(The exports for `ItemDoc` and `WishListDoc` were already corrected in the previous response, and the type guard for `llmResponse` is also fine. No further changes needed here from the last version provided by me.)

```typescript
// src/concepts/ItemCollection/ItemCollectionConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { AmazonAPIClient } from "@services/amazonAPI.ts";
import { GeminiLLMClient } from "@services/geminiLLM.ts"; // Use the client interface

// Declare collection prefix, use concept name
const PREFIX = "ItemCollection" + ".";

// Generic types of this concept (User is external ID)
type User = ID;
type ItemID = ID; // Renamed for clarity, this is the unique item identifier

/**
 * a set of Items with
 *   an owner User
 *   an itemId String  // this is a unique id, maps to _id
 *   an itemName String
 *   a description String
 *   a photo String
 *   a price Number
 *   a reason String  // user's reflection on why they want to purchase
 *   a isNeed String  // user's reflection on is this a "need" or "want"
 *   a isFutureApprove String  // user's reflection on whether their future-self will like this purchase
 *   an wasPurchased Flag
 *   an PurchasedTime Number  [Optional]
 */
export interface ItemDoc { // ADDED 'export'
  _id: ItemID; // This is the unique itemId
  owner: User; // The owner of this specific item entry
  itemName: string;
  description: string;
  photo: string;
  price: number;
  reason: string;
  isNeed: string; // e.g., "yes", "no", "maybe"
  isFutureApprove: string; // e.g., "yes", "no", "unsure"
  wasPurchased: boolean;
  PurchasedTime?: number; // Changed to number (timestamp)
}

/**
 * a set of WishLists with
 *     an owner User
 *     an itemIdSet set of Strings  // this contains unique ids identifying items
 */
export interface WishListDoc { // ADDED 'export'
  _id: User; // The owner ID is the _id of the wishlist document
  itemIdSet: ItemID[]; // Renamed from itemIds
}

export default class ItemCollectionConcept {
  private wishlists: Collection<WishListDoc>;
  private items: Collection<ItemDoc>;
  private amazonAPI: AmazonAPIClient;
  private geminiLLM: GeminiLLMClient;

  /**
   * concept: ItemCollection [User, AmazonAPI, GeminiLLM]
   *
   * purpose:
   *     Tracks and manage items that users are considering for purchase.
   *
   * principles:
   *     (1) Users maintain a personal wishlist of items they intend to purchase.
   *     (2) Adding an item requires users to enter reflection questions.
   *     (3) Item metadata is fetched from AmazonAPI to reduce user effort.
   *     (4) Users can update attributes of the items they own.
   *     (5) Users can mark items as purchased after they made the purchase.
   */
  constructor(
    private readonly db: Db,
    amazonAPI: AmazonAPIClient,
    geminiLLM: GeminiLLMClient,
  ) {
    this.wishlists = this.db.collection(PREFIX + "wishlists");
    this.items = this.db.collection(PREFIX + "items");
    this.amazonAPI = amazonAPI;
    this.geminiLLM = geminiLLM;
  }

  /**
   * _getTenRandomItems (owner: User): (itemIdSet: set of Strings)
   *
   * **requires**
   *   exists at least ten items with owner not matching the given owner
   *
   * **effects**
   *   select by random ten items with owner not matching the given owner;
   *   return an itemIdSet containing the itemIds of these ten items;
   */
  async _getTenRandomItems({
    owner,
  }: {
    owner: User;
  }): Promise<{ itemIdSet: ItemID[] }[] | { error: string }> {
    // Find items not owned by the given owner
    const otherItems = await this.items.find({ owner: { $ne: owner } })
      .toArray();

    if (otherItems.length < 10) {
      // The spec says 'requires at least ten items', so if not, return an error.
      // Alternatively, one could return fewer than 10 or an empty array depending on specific design choice.
      return { error: "Not enough items from other owners to select ten." };
    }

    // Shuffle and pick 10 random items
    for (let i = otherItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherItems[i], otherItems[j]] = [otherItems[j], otherItems[i]];
    }

    const randomTenItemIDs = otherItems.slice(0, 10).map((item) => item._id);

    return [{ itemIdSet: randomTenItemIDs }];
  }

  /**
   * addItem (owner: User, url: String, reason: String, isNeed: String, isFutureApprove: String): (item: ItemDoc)
   *
   * **effect**
   *   fetch item's itemName, description, photo, and price with amazonAPI;
   *   generate a new unique itemId;
   *   create a new item with (owner, itemId, itemName, description, photo, price, reason, isNeed, isFutureApprove, wasPurchased=False);
   *   add item to the itemIdSet under the wishlist with owner matching this user;
   *   return the added item;
   */
  async addItem({
    owner,
    url,
    reason,
    isNeed,
    isFutureApprove,
  }: {
    owner: User;
    url: string;
    reason: string;
    isNeed: string;
    isFutureApprove: string;
  }): Promise<{ item: ItemDoc } | { error: string }> {
    // 1. Fetch item details from Amazon API
    const amazonDetails = await this.amazonAPI.fetchItemDetails(url);
    if ("error" in amazonDetails) {
      return { error: `Amazon API error: ${amazonDetails.error}` };
    }

    const newItemId = freshID();
    const newItem: ItemDoc = {
      _id: newItemId,
      owner, // Now part of the ItemDoc
      itemName: amazonDetails.itemName,
      description: amazonDetails.description,
      photo: amazonDetails.photo,
      price: amazonDetails.price,
      reason,
      isNeed,
      isFutureApprove,
      wasPurchased: false,
    };

    // 2. Insert new item into the items collection
    await this.items.insertOne(newItem);

    // 3. Find or create the wishlist for the owner and add the item
    const existingWishlist = await this.wishlists.findOne({ _id: owner }); // Use owner as _id

    if (existingWishlist) {
      // Add to existing wishlist, avoiding duplicates
      if (!existingWishlist.itemIdSet.includes(newItemId)) {
        await this.wishlists.updateOne(
          { _id: owner },
          { $push: { itemIdSet: newItemId } },
        );
      }
    } else {
      // Create a new wishlist for the owner
      await this.wishlists.insertOne({
        _id: owner, // owner is the _id
        itemIdSet: [newItemId],
      });
    }

    return { item: newItem };
  }

  /**
   * removeItem (owner: User, itemId: String)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *   itemId exists in $w$'s itemIdSet;
   *
   * **effect**
   *   remove itemId from the itemIdSet;
   */
  async removeItem({
    owner,
    itemId,
  }: {
    owner: User;
    itemId: ItemID;
  }): Promise<Empty | { error: string }> {
    const wishlist = await this.wishlists.findOne({ _id: owner });

    if (!wishlist) {
      return { error: `No wishlist found for owner: ${owner}` };
    }
    if (!wishlist.itemIdSet.includes(itemId)) {
      return {
        error: `Item ${itemId} not found in wishlist for owner: ${owner}`,
      };
    }

    await this.wishlists.updateOne(
      { _id: owner },
      { $pull: { itemIdSet: itemId } },
    );

    // The spec only mentions removing from the itemIdSet, not deleting the item itself.
    // So, we do not delete the item from the 'items' collection here.

    return {};
  }

  // --- Update Actions ---

  /**
   * _updateItemAttribute(owner: User, itemId: ItemID, field: keyof ItemDoc, value: any): Promise<Empty | { error: string }>
   * Helper function for common update logic.
   */
  private async _updateItemAttribute<K extends keyof ItemDoc>(
    owner: User,
    itemId: ItemID,
    field: K,
    value: ItemDoc[K],
  ): Promise<Empty | { error: string }> {
    const wishlist = await this.wishlists.findOne({ _id: owner });

    if (!wishlist) {
      return { error: `No wishlist found for owner: ${owner}` };
    }
    if (!wishlist.itemIdSet.includes(itemId)) {
      return {
        error: `Item ${itemId} not found in wishlist for owner: ${owner}`,
      };
    }

    const itemDoc = await this.items.findOne({ _id: itemId, owner }); // Also check owner consistency
    if (!itemDoc) {
      return {
        error: `Item details for ${itemId} not found or not owned by ${owner}.`,
      };
    }

    await this.items.updateOne({ _id: itemId, owner }, {
      $set: { [field]: value },
    });
    return {};
  }

  /**
   * updateItemName (owner: User, item: ItemID, itemName: String)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *   item.itemId exists in $w$'s itemIdSet;
   *
   * **effect**
   *   update the itemName attribute of this item;
   */
  async updateItemName({
    owner,
    item: itemId, // Renamed 'item' argument to 'itemId' for clarity matching spec interpretation
    itemName,
  }: {
    owner: User;
    item: ItemID;
    itemName: string;
  }): Promise<Empty | { error: string }> {
    return this._updateItemAttribute(owner, itemId, "itemName", itemName);
  }

  /**
   * updateDescription (owner: User, item: ItemID, description: String)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *   item.itemId exists in $w$'s itemIdSet;
   *
   * **effect**
   *   update the description attribute of this item;
   */
  async updateDescription({
    owner,
    item: itemId,
    description,
  }: {
    owner: User;
    item: ItemID;
    description: string;
  }): Promise<Empty | { error: string }> {
    return this._updateItemAttribute(owner, itemId, "description", description);
  }

  /**
   * updatePhoto (owner: User, item: ItemID, photo: String)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *   item.itemId exists in $w$'s itemIdSet;
   *
   * **effect**
   *   update the photo attribute of this item;
   */
  async updatePhoto({
    owner,
    item: itemId,
    photo,
  }: {
    owner: User;
    item: ItemID;
    photo: string;
  }): Promise<Empty | { error: string }> {
    return this._updateItemAttribute(owner, itemId, "photo", photo);
  }

  /**
   * updatePrice (owner: User, item: ItemID, price: Number)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *   item.itemId exists in $w$'s itemIdSet;
   *
   * **effect**
   *   update the price attribute of this item;
   */
  async updatePrice({
    owner,
    item: itemId,
    price,
  }: {
    owner: User;
    item: ItemID;
    price: number;
  }): Promise<Empty | { error: string }> {
    // Additional practical validation (not explicitly in spec, but good practice)
    if (price < 0) {
      return { error: "Price cannot be negative." };
    }
    return this._updateItemAttribute(owner, itemId, "price", price);
  }

  /**
   * updateReason (owner: User, item: ItemID, reason: String)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *   item.itemId exists in $w$'s itemIdSet;
   *
   * **effect**
   *   update the reason attribute of this item;
   */
  async updateReason({
    owner,
    item: itemId,
    reason,
  }: {
    owner: User;
    item: ItemID;
    reason: string;
  }): Promise<Empty | { error: string }> {
    return this._updateItemAttribute(owner, itemId, "reason", reason);
  }

  /**
   * updateIsNeed (owner: User, item: ItemID, isNeed: String)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *   item.itemId exists in $w$'s itemIdSet;
   *
   * **effect**
   *   update the isNeed attribute of this item;
   */
  async updateIsNeed({
    owner,
    item: itemId,
    isNeed,
  }: {
    owner: User;
    item: ItemID;
    isNeed: string;
  }): Promise<Empty | { error: string }> {
    return this._updateItemAttribute(owner, itemId, "isNeed", isNeed);
  }

  /**
   * updateIsFutureApprove (owner: User, item: ItemID, isFutureApprove: String)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *   item.itemId exists in $w$'s itemIdSet;
   *   
   * **effect**
   *   update the isFutureApprove attribute of this item;
   */
  async updateIsFutureApprove({
    owner,
    item: itemId,
    isFutureApprove,
  }: {
    owner: User;
    item: ItemID;
    isFutureApprove: string;
  }): Promise<Empty | { error: string }> {
    return this._updateItemAttribute(
      owner,
      itemId,
      "isFutureApprove",
      isFutureApprove,
    );
  }

  /**
   * setPurchased (owner: User, item: ItemID)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *   item $i$.itemId exists in $w$'s itemIdSet;
   *   $i$.wasPurchased is False;
   *
   * **effect**
   *   set $i$.wasPurchased as True;
   *   set $i$.PurchasedTime as the current time of this action;
   */
  async setPurchased({
    owner,
    item: itemId,
  }: {
    owner: User;
    item: ItemID;
  }): Promise<Empty | { error: string }> {
    const wishlist = await this.wishlists.findOne({ _id: owner });

    if (!wishlist) {
      return { error: `No wishlist found for owner: ${owner}` };
    }
    if (!wishlist.itemIdSet.includes(itemId)) {
      return {
        error: `Item ${itemId} not found in wishlist for owner: ${owner}`,
      };
    }

    const itemDoc = await this.items.findOne({ _id: itemId, owner }); // Check owner consistency
    if (!itemDoc) {
      return {
        error: `Item details for ${itemId} not found or not owned by ${owner}.`,
      };
    }
    if (itemDoc.wasPurchased) {
      return { error: `Item ${itemId} has already been marked as purchased.` };
    }

    await this.items.updateOne(
      { _id: itemId, owner },
      { $set: { wasPurchased: true, PurchasedTime: new Date().getTime() } }, // Use timestamp (number)
    );
    return {};
  }

  /**
   * async getAIInsight (owner: User, item: ItemID, context_prompt: String): (llm_response: String)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *   item.itemId exists in $w$'s itemIdSet;
   *
   * **effect**
   *   send context_prompt with the item to geminiLLM (including all the attributes under item, like description, price, reason, isNeed, isFutureApprove) and ask for insights on whether geminiLLM thinks this purchase is impulsive;
   *   return the llm_response;
   */
  async getAIInsight({
    owner,
    item: itemId,
    context_prompt,
  }: {
    owner: User;
    item: ItemID;
    context_prompt: string;
  }): Promise<{ llm_response: string } | { error: string }> {
    const wishlist = await this.wishlists.findOne({ _id: owner });

    if (!wishlist) {
      return { error: `No wishlist found for owner: ${owner}` };
    }
    if (!wishlist.itemIdSet.includes(itemId)) {
      return {
        error: `Item ${itemId} not found in wishlist for owner: ${owner}`,
      };
    }

    const itemDoc = await this.items.findOne({ _id: itemId, owner }); // Check owner consistency
    if (!itemDoc) {
      return {
        error: `Item details for ${itemId} not found or not owned by ${owner}.`,
      };
    }

    const { itemName, description, price, reason, isNeed, isFutureApprove } =
      itemDoc;

    // Construct the full prompt for the LLM
    const fullPrompt = `${context_prompt}

Here are the details of the item:
Item Name: ${itemName}
Description: ${description}
Price: $${price}
User's Reason for wanting it: ${reason}
Is this a "need" or "want"? ${isNeed}
Will my future self approve of this purchase? ${isFutureApprove}

Please provide insights on whether this purchase seems impulsive, considering the user's reflections.`;

    const llmResponse = await this.geminiLLM.executeLLM(fullPrompt);

    // IMPROVED TYPE GUARD: Check if llmResponse is an object AND has an 'error' property
    if (
      typeof llmResponse === "object" && llmResponse !== null &&
      "error" in llmResponse
    ) {
      return { error: `LLM API error: ${llmResponse.error}` };
    }

    // Now TypeScript knows llmResponse must be a string if it didn't enter the error block
    return { llm_response: llmResponse };
  }

  // --- Queries ---

  /**
   * _getWishListItems (owner: User): (item: ItemDoc)
   *
   * **requires** owner exists and has a wishlist
   *
   * **effects** returns a set of all item documents in the owner's wishlist
   */
  async _getWishListItems({
    owner,
  }: {
    owner: User;
  }): Promise<{ item: ItemDoc }[] | { error: string }> {
    const wishlist = await this.wishlists.findOne({ _id: owner });
    if (!wishlist) {
      return { error: `No wishlist found for owner: ${owner}` };
    }

    if (wishlist.itemIdSet.length === 0) {
      return [];
    }

    // Ensure items returned are also owned by the user, for consistency
    const items = await this.items
      .find({ _id: { $in: wishlist.itemIdSet }, owner })
      .toArray();

    return items.map((item) => ({ item }));
  }

  /**
   * _getItemDetails (itemId: ItemID): (item: ItemDoc)
   *
   * **requires** item exists
   *
   * **effects** returns the details of a specific item
   */
  async _getItemDetails({
    itemId,
  }: {
    itemId: ItemID;
  }): Promise<{ item: ItemDoc }[] | { error: string }> {
    const itemDoc = await this.items.findOne({ _id: itemId });
    if (!itemDoc) {
      return { error: `Item details for ${itemId} not found.` };
    }
    return [{ item: itemDoc }];
  }
}

```

***

### **2. Corrected `src/services/geminiLLM.ts`**

(Added the `private async sleep(ms: number)` method.)

```typescript
// src/services/geminiLLM.ts (Refined from the provided class)
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiLLMClientConfig {
  apiKey: string;
  maxRetries?: number;
  timeoutMs?: number;
  initialBackoffMs?: number;
}

export interface GeminiLLMClient {
  executeLLM(prompt: string): Promise<string | { error: string }>; // Modified to return error object
  clearCache(): void;
}

export class GeminiLLM implements GeminiLLMClient {
  private apiKey: string;
  private maxRetries: number;
  private timeoutMs: number;
  private initialBackoffMs: number;
  private requestCache: Map<string, string> = new Map();

  constructor(config: GeminiLLMClientConfig) {
    this.apiKey = config.apiKey;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.initialBackoffMs = config.initialBackoffMs ?? 1000;
  }

  async executeLLM(prompt: string): Promise<string | { error: string }> {
    const cachedResponse = this.requestCache.get(prompt);
    if (cachedResponse) {
      // console.log('✅ Using cached LLM response (idempotent request)');
      return cachedResponse;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const backoffMs = this.initialBackoffMs * Math.pow(2, attempt - 1);
          // console.log(`⏳ Retrying LLM request (attempt ${attempt + 1}/${this.maxRetries + 1}) after ${backoffMs}ms backoff...`);
          await this.sleep(backoffMs); // THIS IS NOW DEFINED
        }

        const result = await this.executeWithTimeout(prompt);
        this.requestCache.set(prompt, result);
        return result;
      } catch (error) {
        lastError = error as Error;

        if (this.isRetryableError(error)) {
          // console.warn(`⚠️ Retryable error on attempt ${attempt + 1}: ${(error as Error).message}`);
          continue;
        } else {
          return { error: this.enhanceErrorMessage(error).message };
        }
      }
    }
    return {
      error: `❌ LLM request failed after ${
        this.maxRetries + 1
      } attempts. Last error: ${lastError?.message || "Unknown error"}`,
    };
  }

  // ADDED: Private sleep helper method
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async executeWithTimeout(prompt: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      try {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash-lite",
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.1,
          },
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        clearTimeout(timeoutId);
        resolve(text);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private isRetryableError(error: unknown): boolean {
    const errorMessage = (error as Error).message?.toLowerCase() || "";
    const retryablePatterns = [
      "timeout",
      "network",
      "econnreset",
      "enotfound",
      "rate limit",
      "quota exceeded",
      "429",
      "500",
      "502",
      "503",
      "504",
    ];
    return retryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  private enhanceErrorMessage(error: unknown): Error {
    const originalError = error as Error;
    const errorMessage = originalError.message || "Unknown error";
    if (errorMessage.includes("API key")) {
      return new Error("API Authentication Error: Invalid or missing API key.");
    }
    if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
      return new Error("API Quota Error: Rate limit or quota exceeded.");
    }
    if (errorMessage.includes("timeout")) {
      return new Error(
        `Timeout Error: Request exceeded ${this.timeoutMs}ms timeout.`,
      );
    }
    if (
      errorMessage.includes("network") || errorMessage.includes("ECONNRESET")
    ) {
      return new Error("Network Error: Failed to connect to Gemini API.");
    }
    return new Error(`LLM Error: ${errorMessage}`);
  }

  clearCache(): void {
    this.requestCache.clear();
  }
}
```

***

### **3. Corrected `src/concepts/ItemCollection/ItemCollectionConcept.test.ts`**

(Explicitly typed `acc` in `MockAmazonAPIClient` constructor.)

```typescript
import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertInstanceOf,
  assertGreater,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ItemCollectionConcept, { ItemDoc, WishListDoc } from "./ItemCollectionConcept.ts"; // Import ItemDoc and WishListDoc
import { AmazonAPIClient } from "../../services/amazonAPI.ts";
import { GeminiLLMClient } from "../../services/geminiLLM.ts";
import { Collection } from "npm:mongodb"; // Import Collection type for manual db operations

// region: Mocks for external services
/**
 * Mock implementation of AmazonAPIClient for testing purposes.
 * It provides canned responses for specific URLs and can be configured to fail.
 */
class MockAmazonAPIClient implements AmazonAPIClient {
  private itemDetails: Record<
    string,
    { itemName: string; description: string; photo: string; price: number }
  >;
  private shouldFail: boolean = false;

  constructor() {
    // Explicitly type the accumulator for robustness against TS18046/TS2698
    const randomItems = Array.from({ length: 15 }).reduce(
      (
        acc: Record< // Explicitly type acc here
          string,
          { itemName: string; description: string; photo: string; price: number }
        >,
        _,
        i,
      ) => {
        const url = `https://amazon.com/random_item_${i}`;
        acc[url] = {
          itemName: `Random Item ${i}`,
          description: `Description for random item ${i}`,
          photo: `http://example.com/random_${i}.jpg`,
          price: 10 + i * 5,
        };
        return acc;
      },
      {}, // Initial value still can be {}
    );

    this.itemDetails = {
      "https://amazon.com/item1": {
        itemName: "Super Gadget",
        description: "A very cool and useful gadget.",
        photo: "http://example.com/gadget.jpg",
        price: 99.99,
      },
      "https://amazon.com/item2": {
        itemName: "Awesome Widget",
        description: "Enhances productivity.",
        photo: "http://example.com/widget.jpg",
        price: 49.99,
      },
      "https://amazon.com/another_gadget_B": {
        itemName: "Another Gadget B",
        description: "A different cool gadget for userB.",
        photo: "http://example.com/another_B.jpg",
        price: 120.00,
      },
      "https://amazon.com/another_gadget_C": {
        itemName: "Another Gadget C",
        description: "A different cool gadget for userC.",
        photo: "http://example.com/another_C.jpg",
        price: 150.00,
      },
      ...randomItems,
    };
  }

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async fetchItemDetails(
    url: string,
  ): Promise<
    | { itemName: string; description: string; photo: string; price: number }
    | { error: string }
  > {
    if (this.shouldFail || url === "https://amazon.com/fail") {
      return { error: "Failed to fetch item details from Amazon." };
    }
    const details = this.itemDetails[url];
    if (details) {
      return details;
    }
    return { error: `Item not found for URL: ${url}` };
  }
}

/**
 * Mock implementation of GeminiLLMClient for testing purposes.
 * It provides canned or generic responses and can be configured to fail.
 */
class MockGeminiLLMClient implements GeminiLLMClient {
  private shouldFail: boolean = false;
  private fixedResponse: string | null = null;

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  setFixedResponse(response: string | null) {
    this.fixedResponse = response;
  }

  async executeLLM(prompt: string): Promise<string | { error: string }> {
    if (this.shouldFail) {
      return { error: "LLM API call failed." };
    }
    if (this.fixedResponse) {
      return this.fixedResponse;
    }
    // Generic mock response based on prompt content
    if (prompt.includes("impulsive")) {
      return "Based on the provided details, the purchase appears to be well-considered rather than impulsive.";
    }
    return `Mock LLM response for prompt: "${
      prompt.substring(0, Math.min(prompt.length, 50))
    }"...`;
  }

  clearCache(): void {} // Required by GeminiLLMClient interface
}
// endregion

// region: Test Constants
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;
const userC = "user:Charlie" as ID;
// endregion

// Principle: User maintains a personal wishlist, adds/updates items, marks as purchased, and gets AI insight
Deno.test("Principle: User maintains a personal wishlist, adds/updates items, marks as purchased, and gets AI insight", async (t) => {
  console.log(
    "\n--- Principle Test: User maintains a personal wishlist, adds/updates items, marks as purchased, and gets AI insight ---",
  );
  const [db, client] = await testDb();
  const amazonAPI = new MockAmazonAPIClient();
  const geminiLLM = new MockGeminiLLMClient();
  const itemCollectionConcept = new ItemCollectionConcept(
    db,
    amazonAPI,
    geminiLLM,
  );

  try {
    const itemUrl = "https://amazon.com/item1";
    const initialReason = "I really need this for my work.";
    const initialIsNeed = "yes";
    const initialIsFutureApprove = "yes";

    // Trace Step 1: User A adds an item to their wishlist with reflection questions.
    // This demonstrates principle (1) and (2), and implicitly (3) via mock API.
    await t.step("1. User A adds an item to their wishlist with reflection questions.", async () => {
      console.log(
        `Trace: User ${userA} calls addItem with URL "${itemUrl}" and initial reflections.`,
      );
      const addResult = await itemCollectionConcept.addItem({
        owner: userA,
        url: itemUrl,
        reason: initialReason,
        isNeed: initialIsNeed,
        isFutureApprove: initialIsFutureApprove,
      });

      assertNotEquals(
        "error" in addResult,
        true,
        `addItem should succeed, but got error: ${
          "error" in addResult ? (addResult as { error: string }).error : "N/A"
        }`,
      );
      assertExists((addResult as { item: ItemDoc }).item._id, "Item ID should be generated.");

      const addedItem = (addResult as { item: ItemDoc }).item;
      console.log(`Effect: Item added with ID: ${addedItem._id}`);

      // Verification of effects: item details and reflection questions stored, wishlist created.
      const wishlistItemsResult = await itemCollectionConcept._getWishListItems(
        { owner: userA },
      );
      assertNotEquals(
        "error" in wishlistItemsResult,
        true,
        `_getWishListItems should not fail: ${
          "error" in wishlistItemsResult
            ? (wishlistItemsResult as { error: string }).error
            : "N/A"
        }`,
      );
      assertEquals(
        (wishlistItemsResult as { item: ItemDoc }[]).length,
        1,
        "User A's wishlist should contain one item.",
      );
      const itemInWishlist =
        (wishlistItemsResult as { item: ItemDoc }[])[0].item;
      assertEquals(itemInWishlist.itemName, "Super Gadget");
      assertEquals(itemInWishlist.description, "A very cool and useful gadget."); // From mock Amazon API
      assertEquals(itemInWishlist.price, 99.99); // From mock Amazon API
      assertEquals(itemInWishlist.reason, initialReason);
      assertEquals(itemInWishlist.isNeed, initialIsNeed);
      assertEquals(
        itemInWishlist.isFutureApprove,
        initialIsFutureApprove,
      );
      assertEquals(
        itemInWishlist.wasPurchased,
        false,
        "Item should not be marked as purchased initially.",
      );
      assertEquals(
        itemInWishlist.PurchasedTime,
        undefined,
        "PurchasedTime should be undefined for an unpurchased item.",
      );
      console.log("Verification: Item found in wishlist with correct initial details (principle 1, 2, 3 fulfilled).");
    });

    let itemId: ID;
    await t.step("2. Retrieve item ID for subsequent actions.", async () => {
      const wishlistItemsResult = await itemCollectionConcept._getWishListItems(
        { owner: userA },
      );
      itemId = (wishlistItemsResult as { item: ItemDoc }[])[0].item._id;
      console.log(`Trace: Retrieved item ID: ${itemId}`);
    });

    // Trace Step 3: User A updates an attribute of the item (description).
    // This demonstrates principle (4).
    await t.step("3. User A updates an attribute of the item (description).", async () => {
      const newDescription = "This gadget is actually for my hobby now.";
      console.log(
        `Trace: User ${userA} calls updateDescription for item ${itemId} to: "${newDescription}"`,
      );
      const updateResult = await itemCollectionConcept.updateDescription({
        owner: userA,
        item: itemId,
        description: newDescription,
      });

      assertNotEquals(
        "error" in updateResult,
        true,
        `updateDescription should succeed, but got error: ${
          "error" in updateResult ? (updateResult as { error: string }).error : "N/A"
        }`,
      );
      console.log("Effect: Item description updated.");

      // Verification of effects: description is updated.
      const itemDetailsResult = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertNotEquals(
        "error" in itemDetailsResult,
        true,
        `_getItemDetails should not fail: ${
          "error" in itemDetailsResult
            ? (itemDetailsResult as { error: string }).error
            : "N/A"
        }`,
      );
      assertEquals(
        (itemDetailsResult as { item: ItemDoc }[])[0].item.description,
        newDescription,
        "Item description should be updated.",
      );
      console.log("Verification: Item description verified to be updated (principle 4 fulfilled).");
    });

    // Trace Step 4: User A marks the item as purchased.
    // This demonstrates principle (5).
    await t.step("4. User A marks the item as purchased.", async () => {
      console.log(`Trace: User ${userA} calls setPurchased for item ${itemId}`);
      const purchaseResult = await itemCollectionConcept.setPurchased({
        owner: userA,
        item: itemId,
      });

      assertNotEquals(
        "error" in purchaseResult,
        true,
        `setPurchased should succeed, but got error: ${
          "error" in purchaseResult ? (purchaseResult as { error: string }).error : "N/A"
        }`,
      );
      console.log("Effect: Item marked as purchased.");

      // Verification of effects: wasPurchased is true and PurchasedTime is set.
      const itemDetailsResult = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertNotEquals(
        "error" in itemDetailsResult,
        true,
        `_getItemDetails should not fail after purchase: ${
          "error" in itemDetailsResult
            ? (itemDetailsResult as { error: string }).error
            : "N/A"
        }`,
      );
      const purchasedItem =
        (itemDetailsResult as { item: ItemDoc }[])[0].item;
      assertEquals(
        purchasedItem.wasPurchased,
        true,
        "Item should be marked as purchased.",
      );
      assertExists(purchasedItem.PurchasedTime, "PurchasedTime should be set.");
      assertInstanceOf(
        purchasedItem.PurchasedTime,
        Number,
        "PurchasedTime should be a number (timestamp).",
      );
      assertGreater(
        purchasedItem.PurchasedTime!,
        0,
        "PurchasedTime should be a positive timestamp.",
      );
      console.log("Verification: Item's purchased status and time are correctly recorded (principle 5 fulfilled).");
    });

    // Trace Step 5: User A gets AI insight for the item.
    // This demonstrates interaction with the LLM.
    await t.step("5. User A gets AI insight for the item.", async () => {
      const contextPrompt = "Evaluate this item for impulsivity.";
      geminiLLM.setFixedResponse(
        "This item seems like a thoughtful purchase based on your reflections.",
      );
      console.log(
        `Trace: User ${userA} calls getAIInsight for item ${itemId} with prompt: "${contextPrompt}"`,
      );
      const insightResult = await itemCollectionConcept.getAIInsight({
        owner: userA,
        item: itemId,
        context_prompt: contextPrompt,
      });

      assertNotEquals(
        "error" in insightResult,
        true,
        `getAIInsight should succeed, but got error: ${
          "error" in insightResult ? (insightResult as { error: string }).error : "N/A"
        }`,
      );
      assertExists(
        (insightResult as { llm_response: string }).llm_response,
        "LLM response should be received.",
      );
      assertEquals(
        (insightResult as { llm_response: string }).llm_response,
        "This item seems like a thoughtful purchase based on your reflections.",
        "LLM response should match the mock output.",
      );
      console.log(`Effect & Verification: Received LLM insight: "${
        (insightResult as { llm_response: string }).llm_response
      }"`);
    });
  } finally {
    await client.close();
  }
  console.log("--- End Principle Test ---");
});

Deno.test("Action: addItem - requirements and effects", async (t) => {
  console.log("\n--- Action Test: addItem ---");
  const [db, client] = await testDb();
  const amazonAPI = new MockAmazonAPIClient();
  const geminiLLM = new MockGeminiLLMClient();
  const itemCollectionConcept = new ItemCollectionConcept(
    db,
    amazonAPI,
    geminiLLM,
  );

  try {
    const commonItemData = {
      owner: userA,
      reason: "just because",
      isNeed: "no",
      isFutureApprove: "unsure",
    };

    // Requirements: Amazon API call must succeed.
    await t.step("Requires: Amazon API call must succeed.", async () => {
      console.log(
        "Trace: Attempting to add item with a URL that will cause Amazon API to fail.",
      );
      amazonAPI.setShouldFail(true);
      const result = await itemCollectionConcept.addItem({
        ...commonItemData,
        url: "https://amazon.com/fail",
      });
      amazonAPI.setShouldFail(false); // Reset for other tests

      assertEquals(
        "error" in result,
        true,
        "addItem should fail if Amazon API call fails.",
      );
      assertEquals(
        (result as { error: string }).error,
        "Amazon API error: Failed to fetch item details from Amazon.",
        "Error message should indicate Amazon API failure.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    let firstItemId: ID;
    // Effects: Successfully adds a new item and creates wishlist if not present.
    await t.step("Effect: Successfully adds a new item and creates wishlist if not present.", async () => {
      const itemUrl = "https://amazon.com/item1";
      console.log(`Trace: Calling addItem for user ${userA} with URL: ${itemUrl}`);
      const addResult = await itemCollectionConcept.addItem({
        ...commonItemData,
        url: itemUrl,
      });

      assertNotEquals(
        "error" in addResult,
        true,
        `addItem should succeed, but got error: ${
          "error" in addResult ? (addResult as { error: string }).error : "N/A"
        }`,
      );
      const addedItem = (addResult as { item: ItemDoc }).item;
      firstItemId = addedItem._id;
      assertExists(firstItemId, "A new item ID should be generated.");
      assertEquals(addedItem.itemName, "Super Gadget");
      assertEquals(addedItem.owner, userA);
      assertEquals(addedItem.wasPurchased, false);
      assertEquals(
        addedItem.PurchasedTime,
        undefined,
        "PurchasedTime should be undefined for unpurchased item.",
      );
      console.log(
        `Effect confirmed: Item ${firstItemId} created with correct details.`,
      );

      const wishlistItems = await itemCollectionConcept._getWishListItems({
        owner: userA,
      });
      assertNotEquals(
        "error" in wishlistItems,
        true,
        `_getWishListItems should not fail: ${
          "error" in wishlistItems ? (wishlistItems as { error: string }).error : "N/A"
        }`,
      );
      assertEquals(
        (wishlistItems as { item: ItemDoc }[]).length,
        1,
        "Wishlist should contain one item.",
      );
      assertEquals(
        (wishlistItems as { item: ItemDoc }[])[0].item._id,
        firstItemId,
        "The added item should be in the wishlist.",
      );
      console.log("Effect confirmed: Item added to user's wishlist.");
    });

    // Effects: Adds another item to an existing wishlist.
    await t.step("Effect: Adds another item to an existing wishlist.", async () => {
      const itemUrl2 = "https://amazon.com/item2";
      console.log(
        `Trace: Calling addItem for user ${userA} with another URL: ${itemUrl2}`,
      );
      const addResult = await itemCollectionConcept.addItem({
        ...commonItemData,
        url: itemUrl2,
      });

      assertNotEquals(
        "error" in addResult,
        true,
        `addItem should succeed, but got error: ${
          "error" in addResult ? (addResult as { error: string }).error : "N/A"
        }`,
      );
      const addedItem = (addResult as { item: ItemDoc }).item;
      const secondItemId = addedItem._id;
      assertExists(secondItemId);
      assertNotEquals(firstItemId, secondItemId, "Second item should have a different ID.");

      const wishlistItems = await itemCollectionConcept._getWishListItems({
        owner: userA,
      });
      assertNotEquals(
        "error" in wishlistItems,
        true,
        `_getWishListItems should not fail: ${
          "error" in wishlistItems ? (wishlistItems as { error: string }).error : "N/A"
        }`,
      );
      assertEquals(
        (wishlistItems as { item: ItemDoc }[]).length,
        2,
        "Wishlist should now contain two items.",
      );
      const itemIds = (wishlistItems as { item: ItemDoc }[]).map((i) =>
        i.item._id
      );
      assertEquals(
        itemIds.includes(firstItemId) && itemIds.includes(secondItemId),
        true,
        "Both added items should be in the wishlist.",
      );
      console.log("Effect confirmed: Second item added to existing wishlist.");
    });
  } finally {
    await client.close();
  }
  console.log("--- End Action Test: addItem ---");
});

Deno.test("Action: removeItem - requirements and effects", async (t) => {
  console.log("\n--- Action Test: removeItem ---");
  const [db, client] = await testDb();
  const amazonAPI = new MockAmazonAPIClient();
  const geminiLLM = new MockGeminiLLMClient();
  const itemCollectionConcept = new ItemCollectionConcept(
    db,
    amazonAPI,
    geminiLLM,
  );

  let itemId1: ID;
  let itemId2: ID;

  try {
    // Setup: Add two items for userA
    const addResult1 = await itemCollectionConcept.addItem({
      owner: userA,
      url: "https://amazon.com/item1",
      reason: "r1",
      isNeed: "n1",
      isFutureApprove: "f1",
    });
    itemId1 = (addResult1 as { item: ItemDoc }).item._id;

    const addResult2 = await itemCollectionConcept.addItem({
      owner: userA,
      url: "https://amazon.com/item2",
      reason: "r2",
      isNeed: "n2",
      isFutureApprove: "f2",
    });
    itemId2 = (addResult2 as { item: ItemDoc }).item._id;

    // Requirements: Wishlist for owner must exist.
    await t.step("Requires: Wishlist for owner must exist.", async () => {
      console.log(
        `Trace: Attempting to remove item from non-existent wishlist for user: ${userB}`,
      );
      const result = await itemCollectionConcept.removeItem({
        owner: userB,
        itemId: itemId1,
      });
      assertEquals(
        "error" in result,
        true,
        "removeItem should fail if wishlist does not exist.",
      );
      assertEquals(
        (result as { error: string }).error,
        `No wishlist found for owner: ${userB}`,
        "Error message should indicate missing wishlist.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Requirements: Item must exist in the owner's wishlist.
    await t.step("Requires: Item must exist in the owner's wishlist.", async () => {
      const nonExistentItemId = "item:fake" as ID;
      console.log(
        `Trace: Attempting to remove non-existent item (${nonExistentItemId}) from userA's wishlist.`,
      );
      const result = await itemCollectionConcept.removeItem({
        owner: userA,
        itemId: nonExistentItemId,
      });
      assertEquals(
        "error" in result,
        true,
        "removeItem should fail if item is not in wishlist.",
      );
      assertEquals(
        (result as { error: string }).error,
        `Item ${nonExistentItemId} not found in wishlist for owner: ${userA}`,
        "Error message should indicate item not in wishlist.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Effects: Successfully removes an item from the wishlist.
    await t.step("Effect: Successfully removes an item from the wishlist.", async () => {
      console.log(
        `Trace: Calling removeItem for user ${userA}, item: ${itemId1}`,
      );
      const removeResult = await itemCollectionConcept.removeItem({
        owner: userA,
        itemId: itemId1,
      });
      assertNotEquals(
        "error" in removeResult,
        true,
        `removeItem should succeed, but got error: ${
          "error" in removeResult ? (removeResult as { error: string }).error : "N/A"
        }`,
      );
      console.log(`Effect confirmed: Item ${itemId1} removed from wishlist.`);

      const wishlistItems = await itemCollectionConcept._getWishListItems({
        owner: userA,
      });
      assertNotEquals(
        "error" in wishlistItems,
        true,
        `_getWishListItems should not fail: ${
          "error" in wishlistItems ? (wishlistItems as { error: string }).error : "N/A"
        }`,
      );
      assertEquals(
        (wishlistItems as { item: ItemDoc }[]).length,
        1,
        "Wishlist should now contain one item.",
      );
      assertEquals(
        (wishlistItems as { item: ItemDoc }[])[0].item._id,
        itemId2,
        "Only the second item should remain in the wishlist.",
      );
      console.log("Verification: Wishlist state confirmed after removal.");

      // Verify the item itself still exists in the 'items' collection (as per spec)
      const itemDetails = await itemCollectionConcept._getItemDetails({
        itemId: itemId1,
      });
      assertNotEquals(
        "error" in itemDetails,
        true,
        "Item should still exist in the items collection.",
      );
      assertEquals(
        (itemDetails as { item: ItemDoc }[])[0].item._id,
        itemId1,
        "The item document itself should not be deleted.",
      );
      console.log(
        "Verification: Item document still exists in `items` collection (effect confirmed by spec).",
      );
    });
  } finally {
    await client.close();
  }
  console.log("--- End Action Test: removeItem ---");
});

Deno.test("Action: update* methods - requirements and effects", async (t) => {
  console.log("\n--- Action Test: update* methods ---");
  const [db, client] = await testDb();
  const amazonAPI = new MockAmazonAPIClient();
  const geminiLLM = new MockGeminiLLMClient();
  const itemCollectionConcept = new ItemCollectionConcept(
    db,
    amazonAPI,
    geminiLLM,
  );

  let itemId: ID;

  try {
    // Setup: Add one item for userA
    const addResult = await itemCollectionConcept.addItem({
      owner: userA,
      url: "https://amazon.com/item1",
      reason: "original reason",
      isNeed: "yes",
      isFutureApprove: "yes",
    });
    itemId = (addResult as { item: ItemDoc }).item._id;
    const initialItemName = (addResult as { item: ItemDoc }).item.itemName;

    // Requirements: Wishlist for owner must exist.
    await t.step("Requires: Wishlist for owner must exist.", async () => {
      console.log(
        `Trace: Attempting to update itemName for non-existent user: ${userB}`,
      );
      const result = await itemCollectionConcept.updateItemName({
        owner: userB,
        item: itemId,
        itemName: "new name",
      });
      assertEquals(
        "error" in result,
        true,
        "updateItemName should fail if wishlist does not exist.",
      );
      assertEquals(
        (result as { error: string }).error,
        `No wishlist found for owner: ${userB}`,
        "Error message should indicate missing wishlist.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Requirements: Item must exist in the owner's wishlist.
    await t.step("Requires: Item must exist in the owner's wishlist.", async () => {
      const nonExistentItemId = "item:fake" as ID;
      console.log(
        `Trace: Attempting to update itemName for non-existent item (${nonExistentItemId}) in userA's wishlist.`,
      );
      const result = await itemCollectionConcept.updateItemName({
        owner: userA,
        item: nonExistentItemId,
        itemName: "new name",
      });
      assertEquals(
        "error" in result,
        true,
        "updateItemName should fail if item is not in wishlist.",
      );
      assertEquals(
        (result as { error: string }).error,
        `Item ${nonExistentItemId} not found in wishlist for owner: ${userA}`,
        "Error message should indicate item not in wishlist.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Requirements: Item must be owned by the user attempting to update.
    await t.step("Requires: Item must be owned by the user attempting to update.", async () => {
      // Add an item for userB
      const addResultB = await itemCollectionConcept.addItem({
        owner: userB,
        url: "https://amazon.com/another_gadget_B",
        reason: "for userB",
        isNeed: "no",
        isFutureApprove: "no",
      });
      const itemIdB = (addResultB as { item: ItemDoc }).item._id;

      console.log(
        `Trace: User ${userA} attempting to update item (${itemIdB}) owned by user ${userB}.`,
      );
      const result = await itemCollectionConcept.updateItemName({
        owner: userA,
        item: itemIdB,
        itemName: "stolen item name",
      });
      assertEquals(
        "error" in result,
        true,
        "updateItemName should fail if item is not owned by the user.",
      );
      assertEquals(
        (result as { error: string }).error,
        `Item ${itemIdB} not found in wishlist for owner: ${userA}`, // The check for item in wishlist covers this
        "Error message should indicate item not in current user's wishlist.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Requirements (updatePrice): Price cannot be negative.
    await t.step("Requires (updatePrice): Price cannot be negative.", async () => {
      console.log(
        `Trace: Attempting to update price for item ${itemId} with negative value.`,
      );
      const result = await itemCollectionConcept.updatePrice({
        owner: userA,
        item: itemId,
        price: -10,
      });
      assertEquals(
        "error" in result,
        true,
        "updatePrice should fail if price is negative.",
      );
      assertEquals(
        (result as { error: string }).error,
        "Price cannot be negative.",
        "Error message should indicate negative price.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Effects: Successfully updates itemName.
    await t.step("Effect: Successfully updates itemName.", async () => {
      const newName = "Updated Super Gadget";
      console.log(
        `Trace: Calling updateItemName for item ${itemId} to: "${newName}"`,
      );
      const updateResult = await itemCollectionConcept.updateItemName({
        owner: userA,
        item: itemId,
        itemName: newName,
      });
      assertNotEquals(
        "error" in updateResult,
        true,
        "updateItemName should succeed.",
      );
      const itemDetails = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertEquals((itemDetails as { item: ItemDoc }[])[0].item.itemName, newName);
      console.log("Effect confirmed: itemName updated.");
    });

    // Effects: Successfully updates description.
    await t.step("Effect: Successfully updates description.", async () => {
      const newDescription = "A thoroughly updated description.";
      console.log(
        `Trace: Calling updateDescription for item ${itemId} to: "${newDescription}"`,
      );
      const updateResult = await itemCollectionConcept.updateDescription({
        owner: userA,
        item: itemId,
        description: newDescription,
      });
      assertNotEquals(
        "error" in updateResult,
        true,
        "updateDescription should succeed.",
      );
      const itemDetails = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertEquals(
        (itemDetails as { item: ItemDoc }[])[0].item.description,
        newDescription,
      );
      console.log("Effect confirmed: description updated.");
    });

    // Effects: Successfully updates photo.
    await t.step("Effect: Successfully updates photo.", async () => {
      const newPhoto = "http://example.com/new_gadget_photo.jpg";
      console.log(
        `Trace: Calling updatePhoto for item ${itemId} to: "${newPhoto}"`,
      );
      const updateResult = await itemCollectionConcept.updatePhoto({
        owner: userA,
        item: itemId,
        photo: newPhoto,
      });
      assertNotEquals("error" in updateResult, true, "updatePhoto should succeed.");
      const itemDetails = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertEquals((itemDetails as { item: ItemDoc }[])[0].item.photo, newPhoto);
      console.log("Effect confirmed: photo updated.");
    });

    // Effects: Successfully updates price.
    await t.step("Effect: Successfully updates price.", async () => {
      const newPrice = 129.99;
      console.log(
        `Trace: Calling updatePrice for item ${itemId} to: ${newPrice}`,
      );
      const updateResult = await itemCollectionConcept.updatePrice({
        owner: userA,
        item: itemId,
        price: newPrice,
      });
      assertNotEquals("error" in updateResult, true, "updatePrice should succeed.");
      const itemDetails = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertEquals((itemDetails as { item: ItemDoc }[])[0].item.price, newPrice);
      console.log("Effect confirmed: price updated.");
    });

    // Effects: Successfully updates reason.
    await t.step("Effect: Successfully updates reason.", async () => {
      const newReason = "It's for a new project now.";
      console.log(
        `Trace: Calling updateReason for item ${itemId} to: "${newReason}"`,
      );
      const updateResult = await itemCollectionConcept.updateReason({
        owner: userA,
        item: itemId,
        reason: newReason,
      });
      assertNotEquals("error" in updateResult, true, "updateReason should succeed.");
      const itemDetails = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertEquals((itemDetails as { item: ItemDoc }[])[0].item.reason, newReason);
      console.log("Effect confirmed: reason updated.");
    });

    // Effects: Successfully updates isNeed.
    await t.step("Effect: Successfully updates isNeed.", async () => {
      const newIsNeed = "maybe";
      console.log(
        `Trace: Calling updateIsNeed for item ${itemId} to: "${newIsNeed}"`,
      );
      const updateResult = await itemCollectionConcept.updateIsNeed({
        owner: userA,
        item: itemId,
        isNeed: newIsNeed,
      });
      assertNotEquals("error" in updateResult, true, "updateIsNeed should succeed.");
      const itemDetails = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertEquals((itemDetails as { item: ItemDoc }[])[0].item.isNeed, newIsNeed);
      console.log("Effect confirmed: isNeed updated.");
    });

    // Effects: Successfully updates isFutureApprove.
    await t.step("Effect: Successfully updates isFutureApprove.", async () => {
      const newIsFutureApprove = "no";
      console.log(
        `Trace: Calling updateIsFutureApprove for item ${itemId} to: "${newIsFutureApprove}"`,
      );
      const updateResult = await itemCollectionConcept.updateIsFutureApprove({
        owner: userA,
        item: itemId,
        isFutureApprove: newIsFutureApprove,
      });
      assertNotEquals(
        "error" in updateResult,
        true,
        "updateIsFutureApprove should succeed.",
      );
      const itemDetails = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertEquals(
        (itemDetails as { item: ItemDoc }[])[0].item.isFutureApprove,
        newIsFutureApprove,
      );
      console.log("Effect confirmed: isFutureApprove updated.");
    });
  } finally {
    await client.close();
  }
  console.log("--- End Action Test: update* methods ---");
});

Deno.test("Action: setPurchased - requirements and effects", async (t) => {
  console.log("\n--- Action Test: setPurchased ---");
  const [db, client] = await testDb();
  const amazonAPI = new MockAmazonAPIClient();
  const geminiLLM = new MockGeminiLLMClient();
  const itemCollectionConcept = new ItemCollectionConcept(
    db,
    amazonAPI,
    geminiLLM,
  );

  let itemId: ID;

  try {
    // Setup: Add one item for userA
    const addResult = await itemCollectionConcept.addItem({
      owner: userA,
      url: "https://amazon.com/item1",
      reason: "r",
      isNeed: "n",
      isFutureApprove: "f",
    });
    itemId = (addResult as { item: ItemDoc }).item._id;

    // Requirements: Wishlist for owner must exist.
    await t.step("Requires: Wishlist for owner must exist.", async () => {
      console.log(
        `Trace: Attempting to set purchased for item ${itemId} by non-existent user: ${userB}`,
      );
      const result = await itemCollectionConcept.setPurchased({
        owner: userB,
        item: itemId,
      });
      assertEquals(
        "error" in result,
        true,
        "setPurchased should fail if wishlist does not exist.",
      );
      assertEquals(
        (result as { error: string }).error,
        `No wishlist found for owner: ${userB}`,
        "Error message should indicate missing wishlist.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Requirements: Item must exist in the owner's wishlist.
    await t.step("Requires: Item must exist in the owner's wishlist.", async () => {
      const nonExistentItemId = "item:fake" as ID;
      console.log(
        `Trace: Attempting to set purchased for non-existent item (${nonExistentItemId}) in userA's wishlist.`,
      );
      const result = await itemCollectionConcept.setPurchased({
        owner: userA,
        item: nonExistentItemId,
      });
      assertEquals(
        "error" in result,
        true,
        "setPurchased should fail if item is not in wishlist.",
      );
      assertEquals(
        (result as { error: string }).error,
        `Item ${nonExistentItemId} not found in wishlist for owner: ${userA}`,
        "Error message should indicate item not in wishlist.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Effects: Successfully marks an item as purchased.
    await t.step("Effect: Successfully marks an item as purchased.", async () => {
      console.log(
        `Trace: Calling setPurchased for item ${itemId} by user ${userA}`,
      );
      const purchaseResult = await itemCollectionConcept.setPurchased({
        owner: userA,
        item: itemId,
      });
      assertNotEquals(
        "error" in purchaseResult,
        true,
        `setPurchased should succeed, but got error: ${
          "error" in purchaseResult ? (purchaseResult as { error: string }).error : "N/A"
        }`,
      );
      console.log(`Effect confirmed: Item ${itemId} marked as purchased.`);

      // Verify wasPurchased and PurchasedTime
      const itemDetailsResult = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      const purchasedItem =
        (itemDetailsResult as { item: ItemDoc }[])[0].item;
      assertEquals(
        purchasedItem.wasPurchased,
        true,
        "Item should be marked as purchased.",
      );
      assertExists(purchasedItem.PurchasedTime, "PurchasedTime should be set.");
      assertInstanceOf(
        purchasedItem.PurchasedTime,
        Number,
        "PurchasedTime should be a number (timestamp).",
      );
      assertGreater(
        purchasedItem.PurchasedTime!,
        0,
        "PurchasedTime should be a positive timestamp.",
      );
      console.log("Verification: Item's purchased status and time are correctly recorded.");
    });

    // Requirements: Item must not have been already purchased.
    await t.step("Requires: Item must not have been already purchased.", async () => {
      console.log(
        `Trace: Attempting to set purchased for already purchased item ${itemId}.`,
      );
      const result = await itemCollectionConcept.setPurchased({
        owner: userA,
        item: itemId,
      });
      assertEquals(
        "error" in result,
        true,
        "setPurchased should fail if item is already purchased.",
      );
      assertEquals(
        (result as { error: string }).error,
        `Item ${itemId} has already been marked as purchased.`,
        "Error message should indicate already purchased item.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });
  } finally {
    await client.close();
  }
  console.log("--- End Action Test: setPurchased ---");
});

Deno.test("Action: getAIInsight - requirements and effects", async (t) => {
  console.log("\n--- Action Test: getAIInsight ---");
  const [db, client] = await testDb();
  const amazonAPI = new MockAmazonAPIClient();
  const geminiLLM = new MockGeminiLLMClient();
  const itemCollectionConcept = new ItemCollectionConcept(
    db,
    amazonAPI,
    geminiLLM,
  );

  let itemId: ID;
  const contextPrompt = "Is this an impulsive buy?";

  try {
    // Setup: Add one item for userA
    const addResult = await itemCollectionConcept.addItem({
      owner: userA,
      url: "https://amazon.com/item1",
      reason: "I need this for work",
      isNeed: "yes",
      isFutureApprove: "yes",
    });
    itemId = (addResult as { item: ItemDoc }).item._id;

    // Requirements: Wishlist for owner must exist.
    await t.step("Requires: Wishlist for owner must exist.", async () => {
      console.log(
        `Trace: Attempting to get AI insight for item ${itemId} by non-existent user: ${userB}`,
      );
      const result = await itemCollectionConcept.getAIInsight({
        owner: userB,
        item: itemId,
        context_prompt: contextPrompt,
      });
      assertEquals(
        "error" in result,
        true,
        "getAIInsight should fail if wishlist does not exist.",
      );
      assertEquals(
        (result as { error: string }).error,
        `No wishlist found for owner: ${userB}`,
        "Error message should indicate missing wishlist.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Requirements: Item must exist in the owner's wishlist.
    await t.step("Requires: Item must exist in the owner's wishlist.", async () => {
      const nonExistentItemId = "item:fake" as ID;
      console.log(
        `Trace: Attempting to get AI insight for non-existent item (${nonExistentItemId}) in userA's wishlist.`,
      );
      const result = await itemCollectionConcept.getAIInsight({
        owner: userA,
        item: nonExistentItemId,
        context_prompt: contextPrompt,
      });
      assertEquals(
        "error" in result,
        true,
        "getAIInsight should fail if item is not in wishlist.",
      );
      assertEquals(
        (result as { error: string }).error,
        `Item ${nonExistentItemId} not found in wishlist for owner: ${userA}`,
        "Error message should indicate item not in wishlist.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Requirements: LLM API call must succeed.
    await t.step("Requires: LLM API call must succeed.", async () => {
      console.log(
        "Trace: Attempting to get AI insight when LLM API is configured to fail.",
      );
      geminiLLM.setShouldFail(true);
      const result = await itemCollectionConcept.getAIInsight({
        owner: userA,
        item: itemId,
        context_prompt: contextPrompt,
      });
      geminiLLM.setShouldFail(false); // Reset for other tests

      assertEquals(
        "error" in result,
        true,
        "getAIInsight should fail if LLM API call fails.",
      );
      assertEquals(
        (result as { error: string }).error,
        "LLM API error: LLM API call failed.",
        "Error message should indicate LLM API failure.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Effects: Successfully gets AI insight.
    await t.step("Effect: Successfully gets AI insight.", async () => {
      const expectedResponse =
        "This is a custom LLM response for a thoughtful purchase.";
      geminiLLM.setFixedResponse(expectedResponse);
      console.log(
        `Trace: Calling getAIInsight for item ${itemId} with prompt: "${contextPrompt}"`,
      );
      const insightResult = await itemCollectionConcept.getAIInsight({
        owner: userA,
        item: itemId,
        context_prompt: contextPrompt,
      });

      assertNotEquals(
        "error" in insightResult,
        true,
        `getAIInsight should succeed, but got error: ${
          "error" in insightResult ? (insightResult as { error: string }).error : "N/A"
        }`,
      );
      assertExists(
        (insightResult as { llm_response: string }).llm_response,
        "LLM response should be received.",
      );
      assertEquals(
        (insightResult as { llm_response: string }).llm_response,
        expectedResponse,
        "LLM response should match the mock output.",
      );
      console.log(`Effect confirmed: Received LLM insight: "${
        (insightResult as { llm_response: string }).llm_response
      }"`);
    });
  } finally {
    await client.close();
  }
  console.log("--- End Action Test: getAIInsight ---");
});

Deno.test("Query: _getWishListItems - requirements and effects", async (t) => {
  console.log("\n--- Query Test: _getWishListItems ---");
  const [db, client] = await testDb();
  const amazonAPI = new MockAmazonAPIClient();
  const geminiLLM = new MockGeminiLLMClient();
  const itemCollectionConcept = new ItemCollectionConcept(
    db,
    amazonAPI,
    geminiLLM,
  );

  try {
    // Requirements: Owner must exist and have a wishlist (or an error if not found).
    await t.step("Requires: Owner must exist and have a wishlist.", async () => {
      console.log(
        `Trace: Attempting to get wishlist items for non-existent user: ${userB}`,
      );
      const result = await itemCollectionConcept._getWishListItems({
        owner: userB,
      });
      assertEquals(
        "error" in result,
        true,
        "Should return error if wishlist does not exist.",
      );
      assertEquals(
        (result as { error: string }).error,
        `No wishlist found for owner: ${userB}`,
        "Error message should indicate missing wishlist.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Effects: Returns an empty array if owner has a wishlist but no items.
    await t.step("Effect: Returns an empty array if owner has a wishlist but no items.", async () => {
      // Manually create an empty wishlist for userC, casting to the correct Collection type
      await (db.collection("ItemCollection.wishlists") as Collection<WishListDoc>).insertOne({
        _id: userC,
        itemIdSet: [],
      });
      console.log(
        `Trace: Getting wishlist items for user ${userC} with an empty wishlist.`,
      );
      const result = await itemCollectionConcept._getWishListItems({
        owner: userC,
      });
      assertNotEquals(
        "error" in result,
        true,
        "Should not return error for empty but existing wishlist.",
      );
      assertEquals(
        (result as { item: ItemDoc }[]).length,
        0,
        "Should return an empty array for an empty wishlist.",
      );
      console.log("Effect confirmed: Returned empty array for empty wishlist.");
    });

    // Effects: Returns all items in the owner's wishlist.
    await t.step("Effect: Returns all items in the owner's wishlist.", async () => {
      console.log(
        `Trace: Adding items for user ${userA} and then retrieving wishlist.`,
      );
      const addResult1 = await itemCollectionConcept.addItem({
        owner: userA,
        url: "https://amazon.com/item1",
        reason: "r1",
        isNeed: "n1",
        isFutureApprove: "f1",
      });
      const itemId1 = (addResult1 as { item: ItemDoc }).item._id;

      const addResult2 = await itemCollectionConcept.addItem({
        owner: userA,
        url: "https://amazon.com/item2",
        reason: "r2",
        isNeed: "n2",
        isFutureApprove: "f2",
      });
      const itemId2 = (addResult2 as { item: ItemDoc }).item._id;

      const wishlistItems = await itemCollectionConcept._getWishListItems({
        owner: userA,
      });
      assertNotEquals(
        "error" in wishlistItems,
        true,
        `_getWishListItems should not fail: ${
          "error" in wishlistItems ? (wishlistItems as { error: string }).error : "N/A"
        }`,
      );
      assertEquals(
        (wishlistItems as { item: ItemDoc }[]).length,
        2,
        "Should return two items for userA's wishlist.",
      );
      const itemIds = (wishlistItems as { item: ItemDoc }[]).map((i) =>
        i.item._id
      );
      assertEquals(
        itemIds.includes(itemId1) && itemIds.includes(itemId2),
        true,
        "Both added items should be in the returned list.",
      );
      console.log("Effect confirmed: All wishlist items returned correctly.");
    });
  } finally {
    await client.close();
  }
  console.log("--- End Query Test: _getWishListItems ---");
});

Deno.test("Query: _getItemDetails - requirements and effects", async (t) => {
  console.log("\n--- Query Test: _getItemDetails ---");
  const [db, client] = await testDb();
  const amazonAPI = new MockAmazonAPIClient();
  const geminiLLM = new MockGeminiLLMClient();
  const itemCollectionConcept = new ItemCollectionConcept(
    db,
    amazonAPI,
    geminiLLM,
  );

  let itemId: ID;

  try {
    // Setup: Add one item for userA
    const addResult = await itemCollectionConcept.addItem({
      owner: userA,
      url: "https://amazon.com/item1",
      reason: "r",
      isNeed: "n",
      isFutureApprove: "f",
    });
    itemId = (addResult as { item: ItemDoc }).item._id;
    const expectedItemName = (addResult as { item: ItemDoc }).item.itemName;

    // Requirements: Item must exist.
    await t.step("Requires: Item must exist.", async () => {
      const nonExistentItemId = "item:fake" as ID;
      console.log(
        `Trace: Attempting to get details for non-existent item: ${nonExistentItemId}`,
      );
      const result = await itemCollectionConcept._getItemDetails({
        itemId: nonExistentItemId,
      });
      assertEquals(
        "error" in result,
        true,
        "Should return error if item does not exist.",
      );
      assertEquals(
        (result as { error: string }).error,
        `Item details for ${nonExistentItemId} not found.`,
        "Error message should indicate item not found.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Effects: Returns the details of a specific item.
    await t.step("Effect: Returns the details of a specific item.", async () => {
      console.log(`Trace: Getting details for existing item: ${itemId}`);
      const itemDetailsResult = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertNotEquals(
        "error" in itemDetailsResult,
        true,
        `_getItemDetails should not fail: ${
          "error" in itemDetailsResult
            ? (itemDetailsResult as { error: string }).error
            : "N/A"
        }`,
      );
      assertEquals(
        (itemDetailsResult as { item: ItemDoc }[]).length,
        1,
        "Should return one item.",
      );
      assertEquals(
        (itemDetailsResult as { item: ItemDoc }[])[0].item._id,
        itemId,
        "Returned item ID should match requested ID.",
      );
      assertEquals(
        (itemDetailsResult as { item: ItemDoc }[])[0].item.itemName,
        expectedItemName,
        "Returned item name should be correct.",
      );
      console.log("Effect confirmed: Item details returned correctly.");
    });
  } finally {
    await client.close();
  }
  console.log("--- End Query Test: _getItemDetails ---");
});

Deno.test("Internal Query: _getTenRandomItems - requirements and effects", async (t) => {
  console.log("\n--- Internal Query Test: _getTenRandomItems ---");
  const [db, client] = await testDb();
  const amazonAPI = new MockAmazonAPIClient();
  const geminiLLM = new MockGeminiLLMClient();
  const itemCollectionConcept = new ItemCollectionConcept(
    db,
    amazonAPI,
    geminiLLM,
  );

  try {
    // Requirements: At least ten items from other owners must exist (fail case).
    await t.step("Requires: At least ten items from other owners must exist (fail case).", async () => {
      // Add a few items for userA and userB, but less than 10 total from other owners
      await itemCollectionConcept.addItem({
        owner: userA,
        url: "https://amazon.com/item1",
        reason: "r",
        isNeed: "n",
        isFutureApprove: "f",
      });
      await itemCollectionConcept.addItem({
        owner: userB,
        url: "https://amazon.com/item2",
        reason: "r",
        isNeed: "n",
        isFutureApprove: "f",
      });
      await itemCollectionConcept.addItem({
        owner: userB,
        url: "https://amazon.com/another_gadget_B",
        reason: "r",
        isNeed: "n",
        isFutureApprove: "f",
      });

      console.log(
        `Trace: Calling _getTenRandomItems for user ${userA} when fewer than 10 other items exist.`,
      );
      const result = await itemCollectionConcept._getTenRandomItems({
        owner: userA,
      });
      assertEquals(
        "error" in result,
        true,
        "Should fail if not enough items from other owners.",
      );
      assertEquals(
        (result as { error: string }).error,
        "Not enough items from other owners to select ten.",
        "Error message should indicate insufficient items.",
      );
      console.log(
        `Requirement met: Failed as expected with error: "${
          (result as { error: string }).error
        }"`,
      );
    });

    // Effects: Selects ten random items not owned by the given owner.
    await t.step("Effect: Selects ten random items not owned by the given owner.", async () => {
      // Setup: Add more items such that there are at least 10 items not owned by userA
      // userA has 1 item from previous step
      // userB has 2 items from previous step
      // Add 8 more items for userC to reach 10+ (2 for userB + 8 for userC = 10 other items)
      for (let i = 0; i < 8; i++) {
        await itemCollectionConcept.addItem({
          owner: userC,
          url: `https://amazon.com/random_item_${i}`, // Using more distinct URLs from mock
          reason: `random_r${i}`,
          isNeed: `random_n${i}`,
          isFutureApprove: `random_f${i}`,
        });
      }

      console.log(
        `Trace: Calling _getTenRandomItems for user ${userA} with sufficient other items.`,
      );
      const result = await itemCollectionConcept._getTenRandomItems({
        owner: userA,
      });

      assertNotEquals(
        "error" in result,
        true,
        `_getTenRandomItems should succeed, but got error: ${
          "error" in result ? (result as { error: string }).error : "N/A"
        }`,
      );
      const itemIdSet = (result as { itemIdSet: ID[] }[])[0].itemIdSet;
      assertExists(itemIdSet, "Should return an itemIdSet.");
      assertEquals(itemIdSet.length, 10, "Should return exactly 10 item IDs.");

      // Verify that none of the returned items are owned by userA
      const userAItems = await itemCollectionConcept._getWishListItems({
        owner: userA,
      });
      const userAItemIds = (userAItems as { item: ItemDoc }[]).map((i) =>
        i.item._id
      );

      for (const returnedItemId of itemIdSet) {
        assertEquals(
          userAItemIds.includes(returnedItemId),
          false,
          `Item ${returnedItemId} should not be owned by userA.`,
        );
      }

      console.log("Effect confirmed: Ten random items (not owned by userA) returned.");
    });
  } finally {
    await client.close();
  }
  console.log("--- End Internal Query Test: _getTenRandomItems ---");
});
```
