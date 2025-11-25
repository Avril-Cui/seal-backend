---
timestamp: 'Tue Nov 25 2025 13:11:36 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_131136.442866a0.md]]'
content_id: b6935ca4ebab1b56f4fba83d6b1a3b62c8811030673d0f1a4a09fa24eb24202a
---

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
