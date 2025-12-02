[@concept-design-overview](../../background/concept-design-overview.md)


[@concept-specifications](../../background/concept-specifications.md)


[@implementing-concepts](../../background/implementing-concepts.md)

# implement: ItemCollection
I want to update the ItemCollection implementation I have now based on my new spec. This is my current implementation:
```
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { AmazonAPIClient } from "@services/amazonAPI.ts";
import { GeminiLLMClient } from "@services/geminiLLM.ts";

// Declare collection prefix, use concept name
const PREFIX = "ItemCollection" + ".";

// Generic types of this concept
type User = ID; // Represents the user's identity
type Item = ID; // Represents the item's identity

/**
 * a set of WishLists with
 *   an owner User
 *   an itemSet set of Items
 */
interface WishListDoc {
  _id: ID; // The ID of the wishlist itself, though often tied to User ID
  owner: User;
  itemIds: Item[];
}

/**
 * The individual item details.
 */
interface ItemDoc {
  _id: Item;
  itemName: string;
  description: string;
  photo: string;
  price: number;
  reason: string;
  isNeed: string; // e.g., "yes", "no", "maybe"
  isFutureApprove: string; // e.g., "yes", "no", "unsure"
  wasPurchased: boolean;
  PurchasedTime?: Date; // Optional, only set if wasPurchased is true
}

export default class ItemCollectionConcept {
  private wishlists: Collection<WishListDoc>;
  private items: Collection<ItemDoc>;
  private amazonAPI: AmazonAPIClient;
  private geminiLLM: GeminiLLMClient;

  /**
   * concept: ItemCollection [User, Item, AmazonAPI, GeminiLLM]
   *
   * purpose:
   *     Tracks and manage items that users are considering for purchase.
   *
   * principle:
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
   * addItem (owner: User, url: String, reason: String, isNeed: String, isFutureApprove: String): (item: Item)
   *
   * **requires** true (always allowed to attempt to add an item)
   *
   * **effects**
   *   - fetch item's itemName, description, photo, and price with amazonAPI;
   *   - create a new item with (itemName, description, photo, price, reason, isNeed, isFutureApprove, wasPurchased=False);
   *   - add item to the itemSet under the wishlist with owner matching this user;
   *   - return the added item's ID;
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
  }): Promise<{ item: Item } | { error: string }> {
    // 1. Fetch item details from Amazon API
    const amazonDetails = await this.amazonAPI.fetchItemDetails(url);
    if ("error" in amazonDetails) {
      return { error: `Amazon API error: ${amazonDetails.error}` };
    }

    const newItemId = freshID();
    const newItem: ItemDoc = {
      _id: newItemId,
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
    const existingWishlist = await this.wishlists.findOne({ owner });

    if (existingWishlist) {
      // Add to existing wishlist, avoiding duplicates (though not explicitly in spec)
      if (!existingWishlist.itemIds.includes(newItemId)) {
        await this.wishlists.updateOne(
          { _id: existingWishlist._id },
          { $push: { itemIds: newItemId } },
        );
      }
    } else {
      // Create a new wishlist for the owner
      const newWishlistId = freshID();
      await this.wishlists.insertOne({
        _id: newWishlistId,
        owner,
        itemIds: [newItemId],
      });
    }

    return { item: newItemId };
  }

  /**
   * removeItem (owner: User, item: Item)
   *
   * **requires**
   *   - exists a wishlist $w$ with this user;
   *   - item exists in $w$'s itemSet;
   *
   * **effects**
   *   - remove item from the itemSet;
   *   - (Optional: delete the item itself if no longer referenced - but spec implies only removal from set)
   */
  async removeItem({
    owner,
    item,
  }: {
    owner: User;
    item: Item;
  }): Promise<Empty | { error: string }> {
    const wishlist = await this.wishlists.findOne({ owner });

    if (!wishlist) {
      return { error: `No wishlist found for owner: ${owner}` };
    }
    if (!wishlist.itemIds.includes(item)) {
      return {
        error: `Item ${item} not found in wishlist for owner: ${owner}`,
      };
    }

    await this.wishlists.updateOne(
      { _id: wishlist._id },
      { $pull: { itemIds: item } },
    );

    // Optionally, delete the item document itself if it's no longer part of any wishlist
    // For this concept, we only remove it from the specific user's itemSet.
    // If the item needs to be physically deleted, a separate action or sync would handle it.
    // await this.items.deleteOne({ _id: item });

    return {};
  }

  // --- Update Actions ---

  /**
   * _updateItemAttribute(owner: User, item: Item, field: keyof ItemDoc, value: any): Promise<Empty | { error: string }>
   * Helper function for common update logic.
   */
  private async _updateItemAttribute<K extends keyof ItemDoc>(
    owner: User,
    item: Item,
    field: K,
    value: ItemDoc[K],
  ): Promise<Empty | { error: string }> {
    const wishlist = await this.wishlists.findOne({ owner });

    if (!wishlist) {
      return { error: `No wishlist found for owner: ${owner}` };
    }
    if (!wishlist.itemIds.includes(item)) {
      return {
        error: `Item ${item} not found in wishlist for owner: ${owner}`,
      };
    }

    const itemDoc = await this.items.findOne({ _id: item });
    if (!itemDoc) {
      return { error: `Item details for ${item} not found.` };
    }

    await this.items.updateOne({ _id: item }, { $set: { [field]: value } });
    return {};
  }

  /**
   * updateItemName (owner: User, item: Item, itemName: String)
   *
   * **requires**
   *   - exists a wishlist $w$ with this user;
   *   - item exists in $w$'s itemSet;
   *
   * **effects**
   *   - update the itemName attribute of this item;
   */
  async updateItemName({
    owner,
    item,
    itemName,
  }: {
    owner: User;
    item: Item;
    itemName: string;
  }): Promise<Empty | { error: string }> {
    return this._updateItemAttribute(owner, item, "itemName", itemName);
  }

  /**
   * updateDescription (owner: User, item: Item, description: String)
   *
   * **requires**
   *   - exists a wishlist $w$ with this user;
   *   - item exists in $w$'s itemSet;
   *
   * **effects**
   *   - update the description attribute of this item;
   */
  async updateDescription({
    owner,
    item,
    description,
  }: {
    owner: User;
    item: Item;
    description: string;
  }): Promise<Empty | { error: string }> {
    return this._updateItemAttribute(owner, item, "description", description);
  }

  /**
   * updatePhoto (owner: User, item: Item, photo: String)
   *
   * **requires**
   *   - exists a wishlist $w$ with this user;
   *   - item exists in $w$'s itemSet;
   *
   * **effects**
   *   - update the photo attribute of this item;
   */
  async updatePhoto({
    owner,
    item,
    photo,
  }: {
    owner: User;
    item: Item;
    photo: string;
  }): Promise<Empty | { error: string }> {
    return this._updateItemAttribute(owner, item, "photo", photo);
  }

  /**
   * updatePrice (owner: User, item: Item, price: Number)
   *
   * **requires**
   *   - exists a wishlist $w$ with this user;
   *   - item exists in $w$'s itemSet;
   *
   * **effects**
   *   - update the price attribute of this item;
   */
  async updatePrice({
    owner,
    item,
    price,
  }: {
    owner: User;
    item: Item;
    price: number;
  }): Promise<Empty | { error: string }> {
    if (price < 0) {
      return { error: "Price cannot be negative." };
    }
    return this._updateItemAttribute(owner, item, "price", price);
  }

  /**
   * updateReason (owner: User, item: Item, reason: String)
   *
   * **requires**
   *   - exists a wishlist $w$ with this user;
   *   - item exists in $w$'s itemSet;
   *
   * **effects**
   *   - update the reason attribute of this item;
   */
  async updateReason({
    owner,
    item,
    reason,
  }: {
    owner: User;
    item: Item;
    reason: string;
  }): Promise<Empty | { error: string }> {
    return this._updateItemAttribute(owner, item, "reason", reason);
  }

  /**
   * updateIsNeed (owner: User, item: Item, isNeed: String)
   *
   * **requires**
   *   - exists a wishlist $w$ with this user;
   *   - item exists in $w$'s itemSet;
   *
   * **effects**
   *   - update the isNeed attribute of this item;
   */
  async updateIsNeed({
    owner,
    item,
    isNeed,
  }: {
    owner: User;
    item: Item;
    isNeed: string;
  }): Promise<Empty | { error: string }> {
    return this._updateItemAttribute(owner, item, "isNeed", isNeed);
  }

  /**
   * updateIsFutureApprove (owner: User, item: Item, isFutureApprove: String)
   *
   * **requires**
   *   - exists a wishlist $w$ with this user;
   *   - item exists in $w$'s itemSet;
   *
   * **effects**
   *   - update the isFutureApprove attribute of this item;
   */
  async updateIsFutureApprove({
    owner,
    item,
    isFutureApprove,
  }: {
    owner: User;
    item: Item;
    isFutureApprove: string;
  }): Promise<Empty | { error: string }> {
    return this._updateItemAttribute(
      owner,
      item,
      "isFutureApprove",
      isFutureApprove,
    );
  }

  /**
   * setPurchased (owner: User, item: Item)
   *
   * **requires**
   *   - exists a wishlist $w$ with this user;
   *   - item $i$ exists in $w$'s itemSet;
   *   - $i$.wasPurchased is False;
   *
   * **effects**
   *   - set $i$.wasPurchased as True;
   *   - set $i$.PurchasedTime as the current time of this action;
   */
  async setPurchased({
    owner,
    item,
  }: {
    owner: User;
    item: Item;
  }): Promise<Empty | { error: string }> {
    const wishlist = await this.wishlists.findOne({ owner });

    if (!wishlist) {
      return { error: `No wishlist found for owner: ${owner}` };
    }
    if (!wishlist.itemIds.includes(item)) {
      return {
        error: `Item ${item} not found in wishlist for owner: ${owner}`,
      };
    }

    const itemDoc = await this.items.findOne({ _id: item });
    if (!itemDoc) {
      return { error: `Item details for ${item} not found.` };
    }
    if (itemDoc.wasPurchased) {
      return { error: `Item ${item} has already been marked as purchased.` };
    }

    await this.items.updateOne(
      { _id: item },
      { $set: { wasPurchased: true, PurchasedTime: new Date() } },
    );
    return {};
  }

  /**
   * async getAIInsight (owner: User, item: Item): (llm_response: String)
   *
   * **requires**
   *   - exists a wishlist $w$ with this user;
   *   - item exists in $w$'s itemSet;
   *
   * **effects**
   *   - send item to geminiLLM (including all the attributes under item, like description, price, reason, isNeed, isFutureApprove) and ask for insights on whether geminiLLM thinks this purchase is impulsive;
   *   - return the llm_response;
   */
  async getAIInsight({
    owner,
    item,
  }: {
    owner: User;
    item: Item;
  }): Promise<{ llm_response: string } | { error: string }> {
    const wishlist = await this.wishlists.findOne({ owner });

    if (!wishlist) {
      return { error: `No wishlist found for owner: ${owner}` };
    }
    if (!wishlist.itemIds.includes(item)) {
      return {
        error: `Item ${item} not found in wishlist for owner: ${owner}`,
      };
    }

    const itemDoc = await this.items.findOne({ _id: item });
    if (!itemDoc) {
      return { error: `Item details for ${item} not found.` };
    }

    const { itemName, description, price, reason, isNeed, isFutureApprove } =
      itemDoc;

    const llmResponse = await this.geminiLLM.getInsight({
      itemName,
      description,
      price,
      reason,
      isNeed,
      isFutureApprove,
    });

    if ("error" in llmResponse) {
      return { error: `LLM API error: ${llmResponse.error}` };
    }

    return { llm_response: llmResponse.llm_response };
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
    const wishlist = await this.wishlists.findOne({ owner });
    if (!wishlist) {
      return { error: `No wishlist found for owner: ${owner}` };
    }

    if (wishlist.itemIds.length === 0) {
      return [];
    }

    const items = await this.items
      .find({ _id: { $in: wishlist.itemIds } })
      .toArray();

    return items.map((item) => ({ item }));
  }

  /**
   * _getItemDetails (item: Item): (item: ItemDoc)
   *
   * **requires** item exists
   *
   * **effects** returns the details of a specific item
   */
  async _getItemDetails({
    item,
  }: {
    item: Item;
  }): Promise<{ item: ItemDoc }[] | { error: string }> {
    const itemDoc = await this.items.findOne({ _id: item });
    if (!itemDoc) {
      return { error: `Item details for ${item} not found.` };
    }
    return [{ item: itemDoc }];
  }
}
```

This is my updated concept spec:
```
concept: ItemCollection [User, AmazonAPI, GeminiLLM]

purpose:
    Tracks and manage items that users are considering for purchase.

principles:
    (1) Users maintain a personal wishlist of items they intend to purchase.
    (2) Adding an item requires users to enter reflection questions.
    (3) Item metadata is fetched from AmazonAPI to reduce user effort.
    (4) Users can update attributes of the items they own.
    (5) Users can mark items as purchased after they made the purchase.

state:
    a set of Items with
      an owner User
      an itemId String  // this is a unique id
      an itemName String
      a description String
      a photo String
      a price Number
      a reason String  // user's reflection on why they want to purchase
      a isNeed String  // user's reflection on is this a "need" or "want"
      a isFutureApprove String  // user's reflection on whether their future-self will like this purchase
      an wasPurchased Flag
      an PurchasedTime Number  [Optional]

    a set of WishLists with
        an owner User
        an itemIdSet set of Strings  // this contains unique ids identifying items

    an amazonAPI AmazonAPI
    a geminiLLM GeminiLLM

actions:
    _getTenRandomItems (owner: User): (itemIdSet: set of Strings)
      requires
        exists at least ten items with owner not matching the given owner
      effect
        select by random ten items with owner not matching the given owner;
        return an itemIdSet containing the itemIds of these ten items; 

    addItem (owner: User, url: String, reason: String, isNeed: String, isFutureApprove: String): (item: Item)
        effect
            fetch item's itemName, description, photo, and price with amazonAPI;
            generate a new unique itemId;
            create a new item with (owner, itemId, itemName, description, photo, price, reason, isNeed, isFutureApprove, wasPurchased=False);
            add item to the itemIdSet under the wishlist with owner matching this user;
            return the added item;

    removeItem (owner: User, itemId: String)
        requires
            exists a wishlist $w$ with this user;
            itemId exists in $w$'s itemIdSet;
        effect
            remove itemId from the itemIdSet;

    updateItemName (owner: User, item: Item, itemName: String)
    updateDescription (owner: User, item: Item, description: String)
    updatePhoto (owner: User, item: Item, photo: String)
    updatePrice (owner: User, item: Item, Price: Number)
    updateReason (owner: User, item: Item, Reason: String)
    updateIsNeed (owner: User, item: Item, isNeed: String)
    updateIsFutureApprove (owner: User, item: Item, isFutureApprove: String)
        requires
            exists a wishlist $w$ with this user;
            item.itemId exists in $w$'s itemIdSet;
        effect
            update the given attribute of this item;

    setPurchased (owner: User, item: Item)
        requires
            exists a wishlist $w$ with this user;
            item $i$.itemId exists in $w$'s itemIdSet;
            $i$.wasPurchased is False;
        effect
            set $i$.wasPurchased as True;
            set $i$.PurchasedTime as the current time of this action;
    
    async getAIInsight (owner: User, item: Item, context_prompt: String): (llm_response: String)
        requires
            exists a wishlist $w$ with this user;
            item.itemId exists in $w$'s itemIdSet;
        effect
            send context_prompt with the item to geminiLLM (including all the attributes under item, like description, price, reason, isNeed, isFutureApprove) and ask for insights on whether geminiLLM thinks this purchase is impulsive;
            return the llm_response;
```
# Note
1. For the AI action, you should have a GeminiLLM class than handles LLM requests properly. This is an example (you can use it directly but make sure to adjust it so it works well with the concept implementation):
  ```typescript
  import { GoogleGenerativeAI } from '@google/generative-ai';

  /**
   * Configuration for API access
   */
  export interface Config {
    apiKey: string;
    maxRetries?: number;
    timeoutMs?: number;
    initialBackoffMs?: number;
  }

  export class GeminiLLM {
    private apiKey: string;
    private maxRetries: number;
    private timeoutMs: number;
    private initialBackoffMs: number;
    private requestCache: Map<string, string> = new Map(); // For idempotency

    constructor(config: Config) {
        this.apiKey = config.apiKey;
        this.maxRetries = config.maxRetries ?? 3;
        this.timeoutMs = config.timeoutMs ?? 30000; // 30 seconds default
        this.initialBackoffMs = config.initialBackoffMs ?? 1000; // 1 second initial backoff
    }

    /**
     * Execute LLM with timeout, retries with exponential backoff, and idempotency
     */
    async executeLLM(prompt: string): Promise<string> {
        // Check cache for idempotency (same prompt = same response)
        const cachedResponse = this.requestCache.get(prompt);
        if (cachedResponse) {
            console.log('✅ Using cached LLM response (idempotent request)');
            return cachedResponse;
        }

        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const backoffMs = this.initialBackoffMs * Math.pow(2, attempt - 1);
                    console.log(`⏳ Retrying LLM request (attempt ${attempt + 1}/${this.maxRetries + 1}) after ${backoffMs}ms backoff...`);
                    await this.sleep(backoffMs);
                }

                const result = await this.executeWithTimeout(prompt);

                // Cache successful response for idempotency
                this.requestCache.set(prompt, result);

                return result;
            } catch (error) {
                lastError = error as Error;

                if (this.isRetryableError(error)) {
                    console.warn(`⚠️ Retryable error on attempt ${attempt + 1}: ${(error as Error).message}`);
                    continue;
                } else {
                    // Non-retryable error, fail immediately
                    throw this.enhanceErrorMessage(error);
                }
            }
        }

        // All retries exhausted
        throw new Error(
            `❌ LLM request failed after ${this.maxRetries + 1} attempts. Last error: ${lastError?.message || 'Unknown error'}`
        );
    }

    /**
     * Execute LLM call with timeout
     */
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
                        temperature: 0.1, // Low temperature for more predictable, deterministic output
                    }
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

    /**
     * Determine if error is retryable (network issues, rate limits, etc.)
     */
    private isRetryableError(error: unknown): boolean {
        const errorMessage = (error as Error).message?.toLowerCase() || '';

        // Retryable errors: network issues, rate limits, timeouts, server errors
        const retryablePatterns = [
            'timeout',
            'network',
            'econnreset',
            'enotfound',
            'rate limit',
            'quota exceeded',
            '429',
            '500',
            '502',
            '503',
            '504'
        ];

        return retryablePatterns.some(pattern => errorMessage.includes(pattern));
    }

    /**
     * Enhance error messages with context
     */
    private enhanceErrorMessage(error: unknown): Error {
        const originalError = error as Error;
        const errorMessage = originalError.message || 'Unknown error';

        if (errorMessage.includes('API key')) {
            return new Error('❌ API Authentication Error: Invalid or missing API key. Please check your Gemini API key configuration.');
        }
        if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            return new Error('❌ API Quota Error: Rate limit or quota exceeded. Please wait before retrying or upgrade your API plan.');
        }
        if (errorMessage.includes('timeout')) {
            return new Error(`❌ Timeout Error: Request exceeded ${this.timeoutMs}ms timeout. The LLM may be overloaded or network is slow.`);
        }
        if (errorMessage.includes('network') || errorMessage.includes('ECONNRESET')) {
            return new Error('❌ Network Error: Failed to connect to Gemini API. Please check your internet connection.');
        }

        return new Error(`❌ LLM Error: ${errorMessage}`);
    }

    /**
     * Sleep utility for backoff
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear cache (useful for testing or forcing fresh responses)
     */
    clearCache(): void {
        this.requestCache.clear();
    }
  }
  ```

2. For the AI action, you should not define the prompt inside the action. Instead getAIInsight takes contexted_prompt as a String, which is a prompt with provided context. The action should simply send this context_prompt as a prompt to the llm.
# response:

Let's update the `ItemCollectionConcept` implementation to align with the new concept specification, including the state definition, actions, and the new `_getTenRandomItems` action, and adjusted `getAIInsight` action.

### Key Changes Identified:

1.  **Concept Type Parameters:** The spec clarifies `[User, AmazonAPI, GeminiLLM]`. The `Item` generic type parameter is removed from the concept's declaration, `itemId` is a `String` within the `Item` state.
2.  **State Structure (`ItemDoc` and `WishListDoc`):**
    *   `ItemDoc` now includes an `owner: User` field. Its `_id` will serve as `itemId`.
    *   `WishListDoc`'s `_id` will be `owner: User`, and its item list property is named `itemIdSet: ItemID[]`.
    *   `PurchasedTime` in `ItemDoc` will be `number | undefined`.
3.  **Action Return Types:** `addItem` explicitly states "return the added item", so it should return the full `ItemDoc`.
4.  **`getAIInsight` Action:**
    *   Adds `context_prompt: String` as an input argument.
    *   The prompt sent to the LLM will be a combination of `context_prompt` and item attributes.
    *   The `GeminiLLM` class provided in the note will be used, specifically its `executeLLM` method.
5.  **New Action `_getTenRandomItems`:** This query-like action needs to be implemented.
6.  **`PurchasedTime` type:** Changed from `Date` to `number` (timestamp).
7.  **`Item` type ambiguity:** In action signatures like `updateItemName (owner: User, item: Item, itemName: String)`, `item: Item` will be interpreted as `itemId: ID` (a string).
8.  **Commenting:** All actions will have updated JSDoc comments reflecting the `requires` and `effects` from the new spec.

Let's refine the `GeminiLLMClient` interface for injection, reflecting the provided `GeminiLLM` class:

```typescript
// src/services/geminiLLM.ts (Refined from the provided class)
import { GoogleGenerativeAI } from '@google/generative-ai';

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
                  await this.sleep(backoffMs);
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
      return { error: `❌ LLM request failed after ${this.maxRetries + 1} attempts. Last error: ${lastError?.message || 'Unknown error'}` };
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
                  }
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
      const errorMessage = (error as Error).message?.toLowerCase() || '';
      const retryablePatterns = [
          'timeout', 'network', 'econnreset', 'enotfound', 'rate limit', 'quota exceeded', '429', '500', '502', '503', '504'
      ];
      return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  private enhanceErrorMessage(error: unknown): Error {
      const originalError = error as Error;
      const errorMessage = originalError.message || 'Unknown error';
      if (errorMessage.includes('API key')) {
          return new Error('API Authentication Error: Invalid or missing API key.');
      }
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
          return new Error('API Quota Error: Rate limit or quota exceeded.');
      }
      if (errorMessage.includes('timeout')) {
          return new Error(`Timeout Error: Request exceeded ${this.timeoutMs}ms timeout.`);
      }
      if (errorMessage.includes('network') || errorMessage.includes('ECONNRESET')) {
          return new Error('Network Error: Failed to connect to Gemini API.');
      }
      return new Error(`LLM Error: ${errorMessage}`);
  }

  clearCache(): void {
      this.requestCache.clear();
  }
}
```

Now, here's the updated `ItemCollectionConcept` implementation:

```typescript
// src/concepts/ItemCollection/ItemCollectionConcept.ts
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
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
interface ItemDoc {
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
interface WishListDoc {
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
    const otherItems = await this.items.find({ owner: { $ne: owner } }).toArray();

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
      return { error: `Item details for ${itemId} not found or not owned by ${owner}.` };
    }

    await this.items.updateOne({ _id: itemId, owner }, { $set: { [field]: value } });
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
      return { error: `Item details for ${itemId} not found or not owned by ${owner}.` };
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
      return { error: `Item details for ${itemId} not found or not owned by ${owner}.` };
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

    if ("error" in llmResponse) {
      return { error: `LLM API error: ${llmResponse.error}` };
    }

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

---

# Update: Add AI Insight Caching and Amazon URL

I want to update the ItemCollection concept to:
1. Store the original Amazon product URL (`amazonUrl`) so users can return to purchase
2. Cache AI insights persistently in the database to avoid redundant Gemini API calls
3. Return structured JSON output from `getAIInsight` instead of raw text
4. Invalidate cache when item fields change (using an input hash)

## Updated Spec

```
concept: ItemCollection [User, AmazonAPI, GeminiLLM]

purpose:
    Tracks and manage items that users are considering for purchase.

principles:
    (1) Users maintain a personal wishlist of items they intend to purchase.
    (2) Adding an item requires users to enter reflection questions.
    (3) Item metadata is fetched from AmazonAPI to reduce user effort.
    (4) Users can update attributes of the items they own.
    (5) Users can mark items as purchased after they made the purchase.
    (6) AI insights are cached to avoid redundant API calls when item info hasn't changed.

state:
    a set of Items with
      an owner User
      an itemId String  // this is a unique id
      an itemName String
      a description String
      a photo String
      a price Number
      a reason String  // user's reflection on why they want to purchase
      a isNeed String  // user's reflection on is this a "need" or "want"
      a isFutureApprove String  // user's reflection on whether their future-self will like this purchase
      an wasPurchased Flag
      an PurchasedTime Number  [Optional]
      an amazonUrl String  [Optional]  // original Amazon product page URL
      a cachedAIInsight CachedAIInsight  [Optional]  // cached AI insight for this item

    a set of CachedAIInsight with
      a productName String  // summarized product name (3-5 words)
      an impulseScore Number  // 1-10 score (1=deliberate, 10=impulsive)
      a verdict String  // BUY, WAIT, or SKIP
      a keyInsight String  // personalized insight addressing the user as "you"
      a fact String  // numerical statistic with source citation
      an advice String  // actionable advice for this purchase
      a cachedAt Number  // timestamp when cached
      an inputHash String  // hash of item fields to detect changes

    a set of WishLists with
        an owner User
        an itemIdSet set of Strings

    an amazonAPI AmazonAPI
    a geminiLLM GeminiLLM

actions:
    // ... existing actions unchanged ...

    addAmazonItem (owner: User, url: String, reason: String, isNeed: String, isFutureApprove: String): (item: Item)
        effect
            fetch item's itemName, description, photo, and price with amazonAPI;
            generate a new unique itemId;
            create a new item with (owner, itemId, itemName, description, photo, price, reason, isNeed, isFutureApprove, wasPurchased=False, amazonUrl=url);
            add item to the itemIdSet under the wishlist with owner matching this user;
            return the added item;

    async getAIInsight (owner: User, item: Item): (structured: CachedAIInsight, cached: Boolean)
        requires
            exists a wishlist $w$ with this user;
            item.itemId exists in $w$'s itemIdSet;
        effect
            generate inputHash from item's (itemName, description, price, reason, isNeed, isFutureApprove);
            if item.cachedAIInsight exists and item.cachedAIInsight.inputHash matches inputHash:
                return cached insight with cached=True;
            else:
                send item details to geminiLLM requesting JSON structured response;
                parse response into CachedAIInsight (productName, impulseScore, verdict, keyInsight, fact, advice);
                store cachedAIInsight on item with current timestamp and inputHash;
                return structured insight with cached=False;

    fetchAmazonDetails (url: String): (itemName, description, photo, price)
        effect
            fetch item's itemName, description, photo, and price with amazonAPI;
            return the fetched details WITHOUT adding to database;
```

## Response: Updated Implementation

```typescript
// src/concepts/ItemCollection/ItemCollectionConcept.ts (updated sections)

/**
 * Cached AI Insight structure for persistent storage
 */
export interface CachedAIInsight {
  productName: string;
  impulseScore: number;
  verdict: string;
  keyInsight: string;
  fact: string;
  advice: string;
  cachedAt: number; // timestamp when cached
  inputHash: string; // hash of item fields to detect changes
}

export interface ItemDoc {
  _id: ItemID;
  owner: User;
  itemName: string;
  description: string;
  photo: string;
  price: number;
  reason: string;
  isNeed: string;
  isFutureApprove: string;
  wasPurchased: boolean;
  PurchasedTime?: number;
  amazonUrl?: string; // NEW: Original Amazon product URL
  cachedAIInsight?: CachedAIInsight; // NEW: Cached AI insight for this item
}

// ... inside ItemCollectionConcept class ...

/**
 * addAmazonItem - stores the Amazon URL along with item details
 */
async addAmazonItem({
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
  const amazonDetails = await this.amazonAPI.fetchItemDetails(url);
  if ("error" in amazonDetails) {
    return { error: `Amazon API error: ${amazonDetails.error}` };
  }

  const newItemId = freshID();
  const newItem: ItemDoc = {
    _id: newItemId,
    owner,
    itemName: amazonDetails.itemName,
    description: amazonDetails.description,
    photo: amazonDetails.photo,
    price: amazonDetails.price,
    reason,
    isNeed,
    isFutureApprove,
    wasPurchased: false,
    amazonUrl: url, // Store the original Amazon URL
  };

  await this.items.insertOne(newItem);
  // ... add to wishlist logic ...
  return { item: newItem };
}

/**
 * getAIInsight - with persistent caching
 * 
 * **requires**
 *   exists a wishlist $w$ with this user;
 *   item.itemId exists in $w$'s itemIdSet;
 *
 * **effect**
 *   generate inputHash from item's fields;
 *   if cached insight exists with matching hash, return cached;
 *   else call LLM, cache result, return fresh insight;
 */
async getAIInsight({
  owner,
  item: itemId,
}: {
  owner: User;
  item: ItemID;
}): Promise<{ llm_response: string; structured: object | null; cached: boolean } | { error: string }> {
  const wishlist = await this.wishlists.findOne({ _id: owner });
  if (!wishlist) {
    return { error: `No wishlist found for owner: ${owner}` };
  }
  if (!wishlist.itemIdSet.includes(itemId)) {
    return { error: `Item ${itemId} not found in wishlist for owner: ${owner}` };
  }

  const itemDoc = await this.items.findOne({ _id: itemId, owner });
  if (!itemDoc) {
    return { error: `Item details for ${itemId} not found or not owned by ${owner}.` };
  }

  // Generate hash of input fields to detect changes
  const inputHash = this.generateInputHash(itemDoc);

  // Check for cached AI insight
  if (itemDoc.cachedAIInsight && itemDoc.cachedAIInsight.inputHash === inputHash) {
    console.log(`Using cached AI insight for item ${itemId}`);
    return {
      llm_response: JSON.stringify(itemDoc.cachedAIInsight),
      structured: {
        productName: itemDoc.cachedAIInsight.productName,
        impulseScore: itemDoc.cachedAIInsight.impulseScore,
        verdict: itemDoc.cachedAIInsight.verdict,
        keyInsight: itemDoc.cachedAIInsight.keyInsight,
        fact: itemDoc.cachedAIInsight.fact,
        advice: itemDoc.cachedAIInsight.advice,
      },
      cached: true,
    };
  }

  // Build prompt for LLM requesting structured JSON output
  const prompt = `You are a friendly AI shopping advisor speaking directly to the user. Analyze this purchase and return JSON.

PRODUCT:
- Full Name: "${itemDoc.itemName}"
- Description: "${itemDoc.description}"
- Price: $${itemDoc.price}

USER'S REFLECTIONS:
- Why you want it: "${itemDoc.reason}"
- Need or want?: "${itemDoc.isNeed}"
- Future-self approval?: "${itemDoc.isFutureApprove}"

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "productName": "<if the product name is very long, summarize it to 3-5 words>",
  "impulseScore": <number 1-10, where 1=very deliberate, 10=highly impulsive>,
  "verdict": "<BUY or WAIT or SKIP>",
  "keyInsight": "<one sentence addressing the user as 'you'>",
  "fact": "<a specific numerical statistic with source>",
  "advice": "<actionable advice using 'you'>"
}`;

  const llmResponse = await this.geminiLLM.executeLLM(prompt);

  if (typeof llmResponse === "object" && "error" in llmResponse) {
    return { error: `LLM API error: ${llmResponse.error}` };
  }

  try {
    // Clean up response and parse JSON
    let cleanResponse = (llmResponse as string).trim();
    if (cleanResponse.startsWith("```json")) cleanResponse = cleanResponse.slice(7);
    if (cleanResponse.startsWith("```")) cleanResponse = cleanResponse.slice(3);
    if (cleanResponse.endsWith("```")) cleanResponse = cleanResponse.slice(0, -3);
    cleanResponse = cleanResponse.trim();

    const parsed = JSON.parse(cleanResponse);
    const structured = {
      productName: parsed.productName || itemDoc.itemName,
      impulseScore: parsed.impulseScore || 5,
      verdict: parsed.verdict || "WAIT",
      keyInsight: parsed.keyInsight || "Unable to analyze",
      fact: parsed.fact || "Studies show most impulse purchases are regretted",
      advice: parsed.advice || "Consider waiting 24 hours before purchasing"
    };

    // Cache the AI insight in the database
    const cachedInsight: CachedAIInsight = {
      ...structured,
      cachedAt: Date.now(),
      inputHash,
    };
    await this.items.updateOne(
      { _id: itemId },
      { $set: { cachedAIInsight: cachedInsight } }
    );
    console.log(`Cached AI insight for item ${itemId}`);

    return { llm_response: cleanResponse, structured, cached: false };
  } catch (e) {
    return { llm_response: llmResponse as string, structured: null, cached: false };
  }
}

/**
 * Generate a hash of item fields to detect changes for AI insight caching
 */
private generateInputHash(item: ItemDoc): string {
  const inputString = `${item.itemName}|${item.description}|${item.price}|${item.reason}|${item.isNeed}|${item.isFutureApprove}`;
  let hash = 0;
  for (let i = 0; i < inputString.length; i++) {
    const char = inputString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * fetchAmazonDetails - fetch details without adding to database
 */
async fetchAmazonDetails({
  url,
}: {
  url: string;
}): Promise<{ itemName: string; description: string; photo: string; price: number } | { error: string }> {
  const amazonDetails = await this.amazonAPI.fetchItemDetails(url);
  if ("error" in amazonDetails) {
    return { error: `Amazon API error: ${amazonDetails.error}` };
  }
  return amazonDetails;
}
```

## Notes
- `amazonUrl` stores the original Amazon product page URL so users can easily return to purchase or view more details.
- `cachedAIInsight` stores the AI analysis persistently in MongoDB to avoid redundant Gemini API calls. The cache is invalidated when any item field changes (detected via `inputHash`).
- The `inputHash` is a simple hash of the concatenated item fields. If any field changes, the hash changes, triggering a fresh LLM call.
- `getAIInsight` returns structured JSON with:
  - `productName`: Summarized product name (3-5 words if original is long)
  - `impulseScore`: 1-10 rating (1=deliberate, 10=impulsive)
  - `verdict`: BUY, WAIT, or SKIP recommendation
  - `keyInsight`: Personalized analysis addressing the user as "you"
  - `fact`: Numerical statistic with source citation
  - `advice`: Actionable recommendation specific to the item's price point
- The `cached` boolean in the response indicates whether the insight was returned from cache (true) or freshly generated (false).
