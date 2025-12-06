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
 *   an actualPrice Number  [Optional]  // actual price paid when purchased
 *   a quantity Number  [Optional]  // quantity purchased, only set when item is purchased
 */
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

/**
 * Cached Wishlist Insights structure for persistent storage
 */
export interface CachedWishlistInsights {
  trendAlert: string;
  improvementSuggestions: string[];
  cachedAt: number; // timestamp when cached
  wishlistHash: string; // hash of wishlist items to detect changes
}

export interface ItemDoc {
  // ADDED 'export'
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
  actualPrice?: number; // Actual price paid when purchased
  quantity?: number; // Quantity purchased, only set when item is purchased
  amazonUrl?: string; // Original Amazon product URL
  cachedAIInsight?: CachedAIInsight; // Cached AI insight for this item
}

/**
 * a set of WishLists with
 *     an owner User
 *     an itemIdSet set of Strings  // this contains unique ids identifying items
 */
export interface WishListDoc {
  // ADDED 'export'
  _id: User; // The owner ID is the _id of the wishlist document
  itemIdSet: ItemID[]; // Renamed from itemIds
  cachedWishlistInsights?: CachedWishlistInsights; // Cached AI insights for the wishlist
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
    geminiLLM: GeminiLLMClient
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
  }): Promise<[{ itemIdSet: ItemID[] }] | [{ error: string }]> {
    // Find items not owned by the given owner
    const otherItems = await this.items
      .find({ owner: { $ne: owner } })
      .toArray();

    if (otherItems.length < 10) {
      // The spec says 'requires at least ten items', so if not, return an error.
      // Alternatively, one could return fewer than 10 or an empty array depending on specific design choice.
      return [{ error: "Not enough items from other owners to select ten." }];
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
   * addItem (owner: User, itemName: String, description: String, photo: String, price: Number, reason: String, isNeed: String, isFutureApprove: String): (item: Item)
   *
   * **effect**
   *   generate a new unique itemId;
   *   create a new item with (owner, itemId, itemName, description, photo, price, reason, isNeed, isFutureApprove, wasPurchased=False);
   *   add item to the itemIdSet under the wishlist with owner matching this user;
   *   return the added item;
   */
  async addItem({
    owner,
    itemName,
    description,
    photo,
    price,
    reason,
    isNeed,
    isFutureApprove,
    amazonUrl,
  }: {
    owner: User;
    itemName: string;
    description: string;
    photo: string;
    price: number;
    reason: string;
    isNeed: string;
    isFutureApprove: string;
    amazonUrl?: string;
  }): Promise<{ item: ItemDoc } | { error: string }> {
    console.log("[ItemCollection.addItem] Starting addItem with:", {
      owner,
      itemName,
    });
    try {
      const newItemId = freshID();
      const newItem: ItemDoc = {
        _id: newItemId,
        owner,
        itemName,
        description,
        photo,
        price,
        reason,
        isNeed,
        isFutureApprove,
        wasPurchased: false,
        amazonUrl: amazonUrl || undefined,
      };

      console.log("[ItemCollection.addItem] Inserting item into database...");
      // Insert new item into the items collection
      await this.items.insertOne(newItem);
      console.log("[ItemCollection.addItem] Item inserted successfully");

      // Find or create the wishlist for the owner and add the item
      const existingWishlist = await this.wishlists.findOne({ _id: owner });

      if (existingWishlist) {
        // Add to existing wishlist, avoiding duplicates
        if (!existingWishlist.itemIdSet.includes(newItemId)) {
          console.log("[ItemCollection.addItem] Updating existing wishlist...");
          await this.wishlists.updateOne(
            { _id: owner },
            { $push: { itemIdSet: newItemId } }
          );
        }
      } else {
        // Create a new wishlist for the owner
        console.log("[ItemCollection.addItem] Creating new wishlist...");
        await this.wishlists.insertOne({
          _id: owner,
          itemIdSet: [newItemId],
        });
      }

      console.log("[ItemCollection.addItem] Returning item:", newItem._id);
      return { item: newItem };
    } catch (error) {
      console.error("[ItemCollection.addItem] Error:", error);
      return {
        error: `Failed to add item: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * addAmazonItem (owner: User, url: String, reason: String, isNeed: String, isFutureApprove: String): (item: ItemDoc)
   *
   * **effect**
   *   fetch item's itemName, description, photo, and price with amazonAPI;
   *   generate a new unique itemId;
   *   create a new item with (owner, itemId, itemName, description, photo, price, reason, isNeed, isFutureApprove, wasPurchased=False);
   *   add item to the itemIdSet under the wishlist with owner matching this user;
   *   return the added item;
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
    // 1. Fetch item details from Amazon API
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

    // 2. Insert new item into the items collection
    await this.items.insertOne(newItem);

    // 3. Find or create the wishlist for the owner and add the item
    const existingWishlist = await this.wishlists.findOne({ _id: owner });

    if (existingWishlist) {
      // Add to existing wishlist, avoiding duplicates
      if (!existingWishlist.itemIdSet.includes(newItemId)) {
        await this.wishlists.updateOne(
          { _id: owner },
          { $push: { itemIdSet: newItemId } }
        );
      }
    } else {
      // Create a new wishlist for the owner
      await this.wishlists.insertOne({
        _id: owner,
        itemIdSet: [newItemId],
      });
    }

    return { item: newItem };
  }

  /**
   * addItemFromExtension (owner: User, itemName: String, description: String, photo: String,
   *                       price: String, reason: String, isNeed: String, isFutureApprove: String, amazonUrl: String): (item: Item)
   *
   * **effect**
   *   parse price string to number;
   *   generate a new unique itemId;
   *   create a new item with (owner, itemId, itemName, description, photo, price, reason, isNeed, isFutureApprove, wasPurchased=False, amazonUrl);
   *   add item to the itemIdSet under the wishlist with owner matching this user;
   *   return the added item;
   */
  async addItemFromExtension({
    owner,
    itemName,
    description,
    photo,
    price,
    reason,
    isNeed,
    isFutureApprove,
    amazonUrl,
  }: {
    owner: User;
    itemName: string;
    description: string;
    photo: string;
    price: string;
    reason: string;
    isNeed: string;
    isFutureApprove: string;
    amazonUrl?: string;
  }): Promise<{ item: ItemDoc } | { error: string }> {
    const numericPrice = parseFloat(String(price).replace(/[^0-9.]/g, "")) || 0;

    const newItemId = freshID();
    // Store amazonUrl - ensure it's a valid string or don't include it
    const storedAmazonUrl =
      amazonUrl && typeof amazonUrl === "string" && amazonUrl.trim()
        ? amazonUrl.trim()
        : undefined;

    const newItem: ItemDoc = {
      _id: newItemId,
      owner,
      itemName,
      description,
      photo,
      price: numericPrice,
      reason,
      isNeed,
      isFutureApprove,
      wasPurchased: false,
      ...(storedAmazonUrl ? { amazonUrl: storedAmazonUrl } : {}), // Only include if we have a valid URL
    };

    await this.items.insertOne(newItem);

    const existingWishlist = await this.wishlists.findOne({ _id: owner });

    if (existingWishlist) {
      if (!existingWishlist.itemIdSet.includes(newItemId)) {
        await this.wishlists.updateOne(
          { _id: owner },
          { $push: { itemIdSet: newItemId } }
        );
      }
    } else {
      await this.wishlists.insertOne({
        _id: owner,
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
      { $pull: { itemIdSet: itemId } }
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
    value: ItemDoc[K]
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

    await this.items.updateOne(
      { _id: itemId, owner },
      {
        $set: { [field]: value },
      }
    );
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
      isFutureApprove
    );
  }

  /**
   * updateItem (owner: User, itemId: ItemID, itemName: String, description: String, photo: String, price: Number, reason: String, isNeed: String, isFutureApprove: String)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *   itemId exists in $w$'s itemIdSet;
   *
   * **effect**
   *   update all attributes of this item;
   */
  async updateItem({
    owner,
    itemId,
    itemName,
    description,
    photo,
    price,
    reason,
    isNeed,
    isFutureApprove,
  }: {
    owner: User;
    itemId: ItemID;
    itemName?: string;
    description?: string;
    photo?: string;
    price?: number;
    reason?: string;
    isNeed?: string;
    isFutureApprove?: string;
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

    const itemDoc = await this.items.findOne({ _id: itemId, owner });
    if (!itemDoc) {
      return {
        error: `Item details for ${itemId} not found or not owned by ${owner}.`,
      };
    }

    // Build update object with only provided fields
    const updateFields: Partial<ItemDoc> = {};
    if (itemName !== undefined) updateFields.itemName = itemName;
    if (description !== undefined) updateFields.description = description;
    if (photo !== undefined) updateFields.photo = photo;
    if (price !== undefined) {
      if (price < 0) {
        return { error: "Price cannot be negative." };
      }
      updateFields.price = price;
    }
    if (reason !== undefined) updateFields.reason = reason;
    if (isNeed !== undefined) updateFields.isNeed = isNeed;
    if (isFutureApprove !== undefined) {
      updateFields.isFutureApprove = isFutureApprove;
    }

    await this.items.updateOne(
      { _id: itemId, owner },
      {
        $set: updateFields,
      }
    );
    return {};
  }

  /**
   * setPurchased (owner: User, item: ItemID, quantity: number, purchaseTime?: number, actualPrice?: number)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *   item $i$.itemId exists in $w$'s itemIdSet;
   *   $i$.wasPurchased is False;
   *   quantity is greater than 0 and is a whole number;
   *
   * **effect**
   *   set $i$.wasPurchased as True;
   *   if purchaseTime is provided, set $i$.PurchasedTime as purchaseTime;
   *   otherwise, set $i$.PurchasedTime as the current time of this action;
   *   if actualPrice is provided, set $i$.actualPrice as actualPrice;
   *   set $i$.quantity as quantity;
   */
  async setPurchased({
    owner,
    item: itemId,
    quantity,
    purchaseTime,
    actualPrice,
  }: {
    owner: User;
    item: ItemID;
    quantity: number;
    purchaseTime?: number;
    actualPrice?: number;
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

    // Validate quantity
    if (quantity <= 0) {
      return { error: "Quantity must be greater than 0." };
    }
    if (!Number.isInteger(quantity)) {
      return { error: "Quantity must be a whole number." };
    }

    // Validate actualPrice if provided
    if (actualPrice !== undefined && actualPrice < 0) {
      return { error: "Actual price cannot be negative." };
    }

    // Build update object
    const updateFields: Partial<ItemDoc> = {
      wasPurchased: true,
      PurchasedTime:
        purchaseTime !== undefined ? purchaseTime : new Date().getTime(),
      quantity: quantity,
    };

    if (actualPrice !== undefined) {
      updateFields.actualPrice = actualPrice;
    }

    await this.items.updateOne({ _id: itemId, owner }, { $set: updateFields });
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
  }: {
    owner: User;
    item: ItemID;
  }): Promise<
    | { llm_response: string; structured: object | null; cached: boolean }
    | {
        error: string;
      }
  > {
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

    // Generate hash of input fields to detect changes
    const inputHash = this.generateInputHash(itemDoc);

    // Check for cached AI insight
    if (
      itemDoc.cachedAIInsight &&
      itemDoc.cachedAIInsight.inputHash === inputHash
    ) {
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

    // Build a fact-based prompt for the LLM with JSON output
    const prompt = `You are a friendly AI shopping advisor speaking directly to the user. Analyze this purchase and return JSON.

PRODUCT:
- Full Name: "${itemDoc.itemName}"
- Description: "${itemDoc.description}"
- Price: $${itemDoc.price}

USER'S REFLECTIONS:
- Why you want it: "${itemDoc.reason}"
- Need or want?: "${itemDoc.isNeed}"
- Future-self approval?: "${itemDoc.isFutureApprove}"

CRITICAL: Understanding Impulse Score (1-10)

IMPULSE SCORE GUIDELINES:
- **1-4 (REASONABLE/SOMEWHAT REASONABLE)**: Well-considered purchases, whether needs or wants
  - **Urgent necessities**: User has run out of something essential (toilet paper, food, medicine, etc.)
  - **Well-planned wants**: User has saved up, researched, or thought about the purchase for a long time
  - **Thoughtful purchases**: Gifts for occasions, planned upgrades, considered decisions
  - **Reasonable reasoning**: User's reason shows planning, consideration, or valid justification
  - **Price-appropriate**: Purchase is within reasonable budget and context
  - User marked it as a "need" (isNeed = "yes") with valid reasoning, OR it's a well-planned "want"

- **5-6 (UNCERTAIN)**: Borderline cases, moderate deliberation
  - Some thought given but not clearly well-planned or clearly impulsive
  - Mixed signals between need and want, or between planned and spontaneous

- **7-10 (SOMEWHAT IMPULSIVE/IMPULSIVE)**: Truly impulsive purchases
  - Buying on a whim without prior consideration or planning
  - Emotional decision without practical justification or research
  - User's reason is vague or purely emotional ("I want it", "looks cool", "seems nice") with no context
  - No indication of planning, saving, research, or thoughtful consideration
  - Unplanned splurge or emotional purchase

IMPORTANT DISTINCTION - Examples of NOT IMPULSIVE (Score 1-4):
- **Urgent necessities**: Running out of toilet paper and buying more = Score 1-4 (REASONABLE)
- **Well-planned wants**: Buying something you've saved up for over months/years, thought about extensively = Score 1-4 (REASONABLE)
- **Thoughtful gifts**: Buying a gift for someone's birthday/occasion that you planned ahead for = Score 1-4 (REASONABLE)
- **Reasonable upgrades**: Replacing a broken item with a better version you've researched = Score 1-4 (REASONABLE)
- **Price-appropriate wants**: Buying something within your budget that you've considered, even if not urgent = Score 1-4 (REASONABLE)

Examples of IS IMPULSIVE (Score 7-10):
- **Random whims**: Buying a random gadget that you likely won't use after a few days because "it looks cool" = Score 7-10 (IMPULSIVE)
- **Emotional purchases**: Buying something expensive on a whim after a bad day, no prior consideration = Score 7-10 (IMPULSIVE)
- **Unplanned splurges**: Buying something you just saw and want immediately, no research or planning = Score 7-10 (IMPULSIVE)
- **Vague reasoning**: User's reason is just "I want it" or "looks nice" with no context or planning = Score 7-10 (IMPULSIVE)

SCORING RULES - Consider ALL factors:
1. **Urgent needs**: If user's reason indicates urgent need (e.g., "I ran out", "I need this now", "out of X") AND the item is an essential (toilet paper, food, medicine, basic household items), assign score 1-4
2. **Well-planned purchases**: If user's reason shows planning, saving, research, or long-term consideration (e.g., "saved up for this", "been thinking about this for months", "researched this product"), assign score 1-4 even if it's a "want"
3. **Gifts and occasions**: If user's reason indicates it's a gift or for a specific occasion they planned for, assign score 1-4
4. **Price consideration**: If the price is reasonable relative to the item and user's situation, and there's thoughtful reasoning, consider score 1-4
5. **isNeed field**: If user marked isNeed as "yes" AND has a valid reason, assign score 1-4. But remember: a "want" can also be reasonable if well-planned!
6. **Truly impulsive**: Only mark as IMPULSIVE (7-10) if there's NO planning, NO consideration, vague/emotional reasoning ("I want it", "looks cool", "seems nice"), AND it's clearly an unplanned whim
7. **Key insight**: A purchase doesn't have to be a basic necessity to be reasonable - well-thought-out wants, planned purchases, and considered decisions are also reasonable (score 1-4)

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "productName": "<if the product name is very long, summarize it to 3-5 words, e.g. 'Battat Toy Camper Van'. Otherwise use the short name as-is>",
  "impulseScore": <number 1-10, following the guidelines above - be consistent: if insight/advice suggest it's reasonable, use 1-4; if truly impulsive, use 7-10>,
  "verdict": "<BUY or WAIT or SKIP>",
  "keyInsight": "<one sentence addressing the user as 'you', analyzing their specific reasoning for wanting this product>",
  "fact": "<a specific, relevant statistic about THIS PRODUCT TYPE or THIS SITUATION with source. Make it contextual to the item and user's situation. Examples: For toilet paper: 'The average American household uses 100 rolls of toilet paper per year' or 'Consumer Reports found that bulk-buying toilet paper can save up to 30% compared to single-pack purchases'. For electronics: 'According to a 2024 study, the average smartphone is replaced every 2.5 years' or 'Tech products typically lose 50% of their value within the first year'. For food: 'The USDA estimates the average American household wastes $1,500 worth of food annually' or 'Bulk food purchases can reduce per-unit costs by 20-40%'. Make it SPECIFIC to this product category, price point, or purchase pattern - NOT a generic impulse buying statistic unless truly relevant>",
  "advice": "<actionable advice using 'you', specific to this $${itemDoc.price} purchase>"
}

RULES:
1. Use second person ("you", "your") throughout - speak directly to the user
2. Summarize long product names to be concise (3-5 words max)
3. The fact MUST be SPECIFIC to this product type, price point, or situation - NOT a generic impulse purchase statistic. Include a specific percentage, dollar amount, or numerical data AND cite the source (study name, year, or organization). Examples of good facts: product category statistics, price comparison data, usage patterns, consumer behavior for this specific item type, cost-saving opportunities for this product, etc.
4. Reference the actual product and the user's stated reasoning
5. **CRITICAL**: Ensure impulseScore matches your insight and advice - if you say it's reasonable/urgent need, use 1-4; if truly impulsive, use 7-10
6. **AVOID**: Generic impulse purchase statistics like "73% of Americans regret impulse purchases" unless the purchase is actually impulsive. For reasonable needs, provide facts about the product category, pricing, usage, or value instead.
7. Return ONLY the JSON object, nothing else`;

    const llmResponse = await this.geminiLLM.executeLLM(prompt);

    if (typeof llmResponse === "object" && "error" in llmResponse) {
      return { error: `LLM API error: ${llmResponse.error}` };
    }

    // Try to parse JSON response
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanResponse = (llmResponse as string).trim();
      if (cleanResponse.startsWith("```json")) {
        cleanResponse = cleanResponse.slice(7);
      }
      if (cleanResponse.startsWith("```")) {
        cleanResponse = cleanResponse.slice(3);
      }
      if (cleanResponse.endsWith("```")) {
        cleanResponse = cleanResponse.slice(0, -3);
      }
      cleanResponse = cleanResponse.trim();

      const parsed = JSON.parse(cleanResponse);
      const structured = {
        productName: parsed.productName || itemDoc.itemName,
        impulseScore: parsed.impulseScore || 5,
        verdict: parsed.verdict || "WAIT",
        keyInsight: parsed.keyInsight || "Unable to analyze",
        fact:
          parsed.fact || "Studies show most impulse purchases are regretted",
        advice: parsed.advice || "Consider waiting 24 hours before purchasing",
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

      return {
        llm_response: cleanResponse,
        structured,
        cached: false,
      };
    } catch (e) {
      // Fallback if JSON parsing fails
      return {
        llm_response: llmResponse as string,
        structured: null,
        cached: false,
      };
    }
  }

  /**
   * Generate a hash of item fields to detect changes for AI insight caching
   */
  private generateInputHash(item: ItemDoc): string {
    const inputString = `${item.itemName}|${item.description}|${item.price}|${item.reason}|${item.isNeed}|${item.isFutureApprove}`;
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < inputString.length; i++) {
      const char = inputString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Generate a hash of wishlist items to detect changes for AI insight caching
   * Hash is based on item IDs in the set and their key attributes (price, reason, isNeed, isFutureApprove)
   * Includes itemIdSet to detect when items are added/removed
   */
  private async generateWishlistHash(owner: User): Promise<string> {
    const wishlist = await this.wishlists.findOne({ _id: owner });
    if (!wishlist || wishlist.itemIdSet.length === 0) {
      return "";
    }

    // Include itemIdSet in hash to detect when items are added/removed
    const sortedItemIds = [...wishlist.itemIdSet].sort();
    const itemIdSetString = sortedItemIds.join(",");

    // Fetch all items in the wishlist
    const items = await this.items
      .find({ _id: { $in: wishlist.itemIdSet }, owner })
      .toArray();

    // Sort items by ID for consistent hashing
    items.sort((a, b) => a._id.localeCompare(b._id));

    // Build hash string from item IDs and key attributes
    const hashParts = items.map(
      (item) =>
        `${item._id}|${item.price}|${item.reason}|${item.isNeed}|${item.isFutureApprove}`
    );
    const itemsString = hashParts.join("||");

    // Combine itemIdSet and item attributes for hash
    const inputString = `${itemIdSetString}||${itemsString}`;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < inputString.length; i++) {
      const char = inputString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Build prompt template for wishlist insights
   * @param items - Array of item documents
   * @returns {string} Configured prompt
   */
  private buildInsightPrompt(items: ItemDoc[]): string {
    let prompt = `You are a shopping behavior analyst. Analyze the following wishlist and provide insights about the user's shopping patterns.

WISHLIST ITEMS (${items.length} total):
`;

    items.forEach((item, index) => {
      prompt += `
${index + 1}. ${item.itemName}
   - Price: $${item.price}
   - User's reason: ${item.reason}
   - Is this a need? ${item.isNeed}
   - Will future self approve? ${item.isFutureApprove}
`;
    });

    prompt += `
Based on this wishlist analysis, please provide TWO separate insights in a specific JSON format.

You must respond with ONLY a valid JSON object in this exact format (no additional text, no markdown, no code blocks):

{
  "trendAlert": "A concise observation about their shopping patterns or trends (1-2 sentences, max 150 characters)",
  "improvementSuggestions": [
    "First actionable suggestion",
    "Second actionable suggestion",
    "Third actionable suggestion",
    "Fourth actionable suggestion"
  ]
}

ANALYSIS GUIDELINES:

1. **For ANY number of items (even 1-2 items):**
   - Analyze the available data deeply and provide meaningful insights
   - Look at price points, reasoning patterns, need vs want classification, future-self approval
   - Identify specific patterns in the user's reflection responses
   - Provide actionable advice based on what you observe, even if limited

2. **trendAlert (approximately 30 words):**
   - Identify specific patterns you notice (e.g., price ranges, need vs want ratio, purchase justifications, reasoning quality)
   - If only 1-2 items: Focus on analyzing those items deeply - their price, reasoning, need/want classification, and what it might indicate about shopping habits
   - If 3+ items: Look for broader patterns across items
   - Be specific and informative - mention actual observations from the data
   - If data is limited, acknowledge it but still provide insights: "Based on your current items, I notice [specific observation]. As you add more items, we'll uncover deeper patterns."
   - Use a playful pig mascot tone subtly (e.g., "Oink oink!" at the beginning, or pig-related phrases), but stay professional

3. **improvementSuggestions (exactly 4 items):**
   - Provide specific, actionable tips based on the actual data available
   - If limited data: Give general but still helpful advice, and include one suggestion about adding more items for better insights
   - If more data: Provide personalized suggestions based on observed patterns
   - Make each suggestion concrete and actionable
   - Address specific aspects you noticed in their wishlist (price, reasoning, need/want balance, etc.)

4. **General tone:**
   - Keep all text concise and friendly
   - Use "you" to address the user directly
   - Be supportive, not judgmental
   - Be informative and helpful, even with limited data
   - When data is limited, acknowledge it naturally but still provide value

EXAMPLES:

If 1 item: Analyze that item deeply - its price point, the quality of reasoning, need vs want classification, and what it suggests about shopping approach. Provide insights about that specific item and general tips.

If 2 items: Compare and contrast the two items - look for similarities or differences in price, reasoning, need/want classification. Provide insights about what these two items reveal.

If 3+ items: Look for broader patterns - price ranges, need vs want ratios, reasoning patterns, etc.

Respond with ONLY the JSON object, no markdown formatting, no code blocks, no additional explanation.`;

    return prompt;
  }

  /**
   * async getAIWishListInsight (owner: User): (llm_response: String)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *
   * **effect**
   *   check if cached insights exist and wishlist hasn't changed;
   *   if cache is valid, return cached insights;
   *   otherwise, fetch wishlist items, build prompt, send to geminiLLM;
   *   cache the new insights;
   *   return the llm_response;
   */
  async getAIWishListInsight({
    owner,
  }: {
    owner: User;
  }): Promise<{ llm_response: string } | { error: string }> {
    const wishlist = await this.wishlists.findOne({ _id: owner });

    if (!wishlist) {
      return { error: `No wishlist found for owner: ${owner}` };
    }

    // Generate hash of current wishlist items
    const wishlistHash = await this.generateWishlistHash(owner);

    // Check for cached insights
    if (
      wishlist.cachedWishlistInsights &&
      wishlist.cachedWishlistInsights.wishlistHash === wishlistHash
    ) {
      console.log(
        `Using cached wishlist insights for owner ${owner} (hash: ${wishlistHash})`
      );
      // Return cached insights in the expected JSON format
      const cached = wishlist.cachedWishlistInsights;
      const cachedResponse = JSON.stringify({
        trendAlert: cached.trendAlert,
        improvementSuggestions: cached.improvementSuggestions,
      });
      return { llm_response: cachedResponse };
    }

    // Cache miss or invalid - generate new insights
    console.log(
      `Generating new wishlist insights for owner ${owner} (hash: ${wishlistHash})`
    );

    // Fetch all items in the wishlist
    const items = await this.items
      .find({ _id: { $in: wishlist.itemIdSet }, owner })
      .toArray();

    if (items.length === 0) {
      // Return default message for empty wishlist
      const defaultResponse = JSON.stringify({
        trendAlert:
          "Oink oink! Your pause cart is empty. Start adding items you're considering buying to get personalized insights!",
        improvementSuggestions: [
          "Add items to your pause cart that you're thinking about purchasing",
          "Take time to reflect on each item using our guided questions",
          "Use the AI insight feature to get personalized shopping advice",
          "Check back here after adding items to see your shopping patterns",
        ],
      });
      return { llm_response: defaultResponse };
    }

    // Build prompt from items
    const context_prompt = this.buildInsightPrompt(items);

    // Define JSON schema for structured output
    const jsonSchema = {
      type: "object",
      properties: {
        trendAlert: {
          type: "string",
          description:
            "A concise observation about shopping patterns or trends (1-2 sentences, max 150 characters)",
        },
        improvementSuggestions: {
          type: "array",
          items: {
            type: "string",
            description:
              "An actionable suggestion to improve purchasing decisions",
          },
          minItems: 4,
          maxItems: 4,
          description: "Exactly 4 specific, actionable tips",
        },
      },
      required: ["trendAlert", "improvementSuggestions"],
    };

    // Send the context prompt to Gemini LLM with structured output
    const llmResponse = await this.geminiLLM.executeLLMWithSchema(
      context_prompt,
      jsonSchema
    );

    if (typeof llmResponse === "object" && "error" in llmResponse) {
      return { error: `LLM API error: ${llmResponse.error}` };
    }

    // Parse and cache the response (should be valid JSON now)
    let parsed: {
      trendAlert: string;
      improvementSuggestions: string[];
    };
    try {
      parsed = JSON.parse(llmResponse as string);
      if (parsed.trendAlert && parsed.improvementSuggestions) {
        // Cache the insights
        const cachedInsights: CachedWishlistInsights = {
          trendAlert: parsed.trendAlert,
          improvementSuggestions: parsed.improvementSuggestions,
          cachedAt: Date.now(),
          wishlistHash,
        };

        await this.wishlists.updateOne(
          { _id: owner },
          { $set: { cachedWishlistInsights: cachedInsights } }
        );
        console.log(`Cached wishlist insights for owner ${owner}`);
      }
    } catch (parseError) {
      // This should rarely happen with structured output, but handle gracefully
      console.warn("Failed to parse AI response for caching:", parseError);
    }

    // Return the JSON response (already valid JSON from structured output)
    return { llm_response: llmResponse as string };
  }

  /**
   * fetchAmazonDetails (url: String): (itemName, description, photo, price)
   *
   * **effect**
   *   fetch item's itemName, description, photo, and price with amazonAPI;
   *   return the fetched details WITHOUT adding to database;
   */
  async fetchAmazonDetails({ url }: { url: string }): Promise<
    | {
        itemName: string;
        description: string;
        photo: string;
        price: number;
      }
    | { error: string }
  > {
    const amazonDetails = await this.amazonAPI.fetchItemDetails(url);
    if ("error" in amazonDetails) {
      return { error: `Amazon API error: ${amazonDetails.error}` };
    }
    return amazonDetails;
  }

  // --- Queries ---

  /**
   * _getUserWishList (owner: User): (shoppingCart: set of Items)
   *
   * **requires** exists at least one item with the matching owner
   *
   * **effects** return a set of all items belong to this owner
   */
  async _getUserWishList({
    owner,
  }: {
    owner: User;
  }): Promise<{ item: ItemDoc }[] | [{ error: string }]> {
    const wishlist = await this.wishlists.findOne({ _id: owner });
    if (!wishlist) {
      return [{ error: `No wishlist found for owner: ${owner}` }];
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
  }): Promise<{ item: ItemDoc }[] | [{ error: string }]> {
    const wishlist = await this.wishlists.findOne({ _id: owner });
    if (!wishlist) {
      return [{ error: `No wishlist found for owner: ${owner}` }];
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
   * _getPurchasedItems (owner: User): (item: ItemDoc)
   *
   * **requires** owner exists
   *
   * **effects** returns a set of all item documents where wasPurchased is true for this owner
   */
  async _getPurchasedItems({
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

    // Find items that are purchased
    const items = await this.items
      .find({
        _id: { $in: wishlist.itemIdSet },
        owner,
        wasPurchased: true,
      })
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
  }): Promise<{ item: ItemDoc }[] | [{ error: string }]> {
    const itemDoc = await this.items.findOne({ _id: itemId });
    if (!itemDoc) {
      return [{ error: `Item details for ${itemId} not found.` }];
    }
    return [{ item: itemDoc }];
  }
}
