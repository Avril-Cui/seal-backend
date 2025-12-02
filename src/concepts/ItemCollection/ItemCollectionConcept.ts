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

    // Insert new item into the items collection
    await this.items.insertOne(newItem);

    // Find or create the wishlist for the owner and add the item
    const existingWishlist = await this.wishlists.findOne({ _id: owner });

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
        _id: owner,
        itemIdSet: [newItemId],
      });
    }

    return { item: newItem };
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
          { $push: { itemIdSet: newItemId } },
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
   *                       price: String, reason: String, isNeed: String, isFutureApprove: String): (item: Item)
   *
   * **effect**
   *   parse price string to number;
   *   generate a new unique itemId;
   *   create a new item with (owner, itemId, itemName, description, photo, price, reason, isNeed, isFutureApprove, wasPurchased=False);
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
  }: {
    owner: User;
    itemName: string;
    description: string;
    photo: string;
    price: string;
    reason: string;
    isNeed: string;
    isFutureApprove: string;
  }): Promise<{ item: ItemDoc } | { error: string }> {
    const numericPrice = parseFloat(String(price).replace(/[^0-9.]/g, "")) || 0;

    const newItemId = freshID();
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
    };

    await this.items.insertOne(newItem);

    const existingWishlist = await this.wishlists.findOne({ _id: owner });

    if (existingWishlist) {
      if (!existingWishlist.itemIdSet.includes(newItemId)) {
        await this.wishlists.updateOne(
          { _id: owner },
          { $push: { itemIdSet: newItemId } },
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
    if (isFutureApprove !== undefined) updateFields.isFutureApprove = isFutureApprove;

    await this.items.updateOne({ _id: itemId, owner }, {
      $set: updateFields,
    });
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
      PurchasedTime: purchaseTime !== undefined ? purchaseTime : new Date().getTime(),
      quantity: quantity,
    };

    if (actualPrice !== undefined) {
      updateFields.actualPrice = actualPrice;
    }

    await this.items.updateOne(
      { _id: itemId, owner },
      { $set: updateFields },
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
  }: {
    owner: User;
    item: ItemID;
  }): Promise<{ llm_response: string; structured: object | null; cached: boolean } | { error: string }> {
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

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "productName": "<if the product name is very long, summarize it to 3-5 words, e.g. 'Battat Toy Camper Van'. Otherwise use the short name as-is>",
  "impulseScore": <number 1-10, where 1=very deliberate, 10=highly impulsive>,
  "verdict": "<BUY or WAIT or SKIP>",
  "keyInsight": "<one sentence addressing the user as 'you', analyzing their specific reasoning for wanting this product>",
  "fact": "<a specific numerical statistic with source, e.g. 'According to a 2023 Slickdeals survey, 73% of Americans make impulse purchases they later regret' or 'A Credit Karma study found the average American spends $314/month on impulse buys'>",
  "advice": "<actionable advice using 'you', specific to this $${itemDoc.price} purchase>"
}

RULES:
1. Use second person ("you", "your") throughout - speak directly to the user
2. Summarize long product names to be concise (3-5 words max)
3. The fact MUST include a specific percentage or dollar amount AND cite the source (study name, year, or organization)
4. Reference the actual product and the user's stated reasoning
5. Return ONLY the JSON object, nothing else`;

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
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * async getAIWishListInsight (owner: User, context_prompt: String): (llm_response: String)
   *
   * **requires**
   *   exists a wishlist $w$ with this user;
   *
   * **effect**
   *   send context_prompt to geminiLLM;
   *   return the llm_response;
   */
  async getAIWishListInsight({
    owner,
    context_prompt,
  }: {
    owner: User;
    context_prompt: string;
  }): Promise<{ llm_response: string } | { error: string }> {
    const wishlist = await this.wishlists.findOne({ _id: owner });

    if (!wishlist) {
      return { error: `No wishlist found for owner: ${owner}` };
    }

    // Send the context prompt to Gemini LLM
    const llmResponse = await this.geminiLLM.executeLLM(context_prompt);

    if (typeof llmResponse === "object" && "error" in llmResponse) {
      return { error: `LLM API error: ${llmResponse.error}` };
    }

    return { llm_response: llmResponse as string };
  }

  /**
   * fetchAmazonDetails (url: String): (itemName, description, photo, price)
   *
   * **effect**
   *   fetch item's itemName, description, photo, and price with amazonAPI;
   *   return the fetched details WITHOUT adding to database;
   */
  async fetchAmazonDetails({
    url,
  }: {
    url: string;
  }): Promise<
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
        wasPurchased: true
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
