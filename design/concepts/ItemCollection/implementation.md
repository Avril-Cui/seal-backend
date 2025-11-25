# implementation

[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

# implement: ItemCollection

# concept: ItemCollection

```
concept: ItemCollection [User, Item, AmazonAPI, GeminiLLM]

purpose:
    Tracks and manage items that users are considering for purchase.

principles:
    (1) Users maintain a personal wishlist of items they intend to purchase.
    (2) Adding an item requires users to enter reflection questions.
    (3) Item metadata is fetched from AmazonAPI to reduce user effort.
    (4) Users can update attributes of the items they own.
    (5) Users can mark items as purchased after they made the purchase.

state:
    a set of WishLists with
        an owner User
        an itemSet set of Items

    an amazonAPI AmazonAPI
    a geminiLLM GeminiLLM

actions:
    addItem (owner: User, url: String, reason: String, isNeed: String, isFutureApprove: String): (item: Item)
        effect
            fetch item's itemName, description, photo, and price with amazonAPI;
            create a new item with (itemName, description, photo, price, reason, isNeed, isFutureApprove, wasPurchased=False);
            add item to the itemSet under the wishlist with owner matching this user;
            return the added item;

    removeItem (owner: User, item: Item)
        requires
            exists a wishlist $w$ with this user;
            item exists in $w$'s itemSet;
        effect
            remove item from the itemSet;

    updateItemName (owner: User, item: Item, itemName: String)
    updateDescription (owner: User, item: Item, description: String)
    updatePhoto (owner: User, item: Item, photo: String)
    updatePrice (owner: User, item: Item, Price: Number)
    updateReason (owner: User, item: Item, Reason: String)
    updateIsNeed (owner: User, item: Item, isNeed: String)
    updateIsFutureApprove (owner: User, item: Item, isFutureApprove: String)
        requires
            exists a wishlist $w$ with this user;
            item exists in $w$'s itemSet;
        effect
            update the given attribute of this item;

    setPurchased (owner: User, item: Item)
        requires
            exists a wishlist $w$ with this user;
            item $i$ exists in $w$'s itemSet;
            $i$.wasPurchased is False;
        effect
            set $i$.wasPurchased as True;
            set $i$.PurchasedTime as the current time of this action;
    
    async getAIInsight (owner: User, item: Item): (llm_response: String)
        requires
            exists a wishlist $w$ with this user;
            item exists in $w$'s itemSet;
        effect
            send item to geminiLLM (including all the attributes under item, like description, price, reason, isNeed, isFutureApprove) and ask for insights on whether geminiLLM thinks this purchase is impulsive;
            return the llm_response;

```

# response:

**file: src/utils/types.ts** (Assuming this file exists with ID and Empty)

```typescript
// Re-export for convenience in this example if not already present
export type ID = string & { __brand: "ID" };
export type Empty = Record<PropertyKey, never>;
```

**file: src/utils/database.ts** (Assuming this file exists with freshID and getDb)

```typescript
// Re-export for convenience in this example if not already present
import { MongoClient, Db } from "npm:mongodb";

export type ID = string & { __brand: "ID" }; // Ensure ID type is consistent

export function freshID(): ID {
  // Simple UUID generation for demonstration. In real app, might use UUID v4.
  return crypto.randomUUID() as ID;
}

export async function getDb(): Promise<[Db, MongoClient]> {
  // This is a placeholder. In a real app, this would connect to MongoDB.
  // For the purpose of implementing the concept, we'll mock the Db interactions.
  console.warn(
    "getDb: Using a mock database client for concept implementation. Real connection needed for actual app.",
  );
  // Return a mock Db and MongoClient for type compatibility
  const client = new MongoClient("mongodb://localhost:27017");
  const db = client.db("mock_db");
  return [db, client];
}
```

**file: src/services/amazonAPI.ts** (New file for Amazon API client interface and mock)

```typescript
import { ID } from "@utils/types.ts";

/**
 * Interface for the Amazon API client.
 * This defines the contract for fetching item details.
 */
export interface AmazonAPIClient {
  fetchItemDetails(
    url: string,
  ): Promise<
    | {
        itemName: string;
        description: string;
        photo: string;
        price: number;
      }
    | { error: string }
  >;
}

/**
 * Mock implementation of AmazonAPIClient for development/testing.
 * In a real application, this would make actual HTTP requests to Amazon's API.
 */
export class MockAmazonAPIClient implements AmazonAPIClient {
  async fetchItemDetails(
    url: string,
  ): Promise<
    | {
        itemName: string;
        description: string;
        photo: string;
        price: number;
      }
    | { error: string }
  > {
    console.log(`MockAmazonAPIClient: Fetching details for URL: ${url}`);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (url.includes("error")) {
      return { error: "Failed to fetch item details from Amazon." };
    }
    if (url.includes("example.com/book/123")) {
      return {
        itemName: "The Great Gatsby",
        description: "A classic American novel.",
        photo: "https://example.com/gatsby.jpg",
        price: 9.99,
      };
    }
    if (url.includes("example.com/electronics/xyz")) {
      return {
        itemName: "Wireless Headphones",
        description: "Noise-cancelling headphones with long battery life.",
        photo: "https://example.com/headphones.jpg",
        price: 199.99,
      };
    }
    return { error: "Item URL not recognized by mock API." };
  }
}
```

**file: src/services/geminiLLM.ts** (New file for Gemini LLM client interface and mock)

```typescript
import { ID } from "@utils/types.ts";

/**
 * Interface for the Gemini LLM client.
 * This defines the contract for requesting AI insights.
 */
export interface GeminiLLMClient {
  getInsight(itemDetails: {
    itemName: string;
    description: string;
    price: number;
    reason: string;
    isNeed: string;
    isFutureApprove: string;
  }): Promise<{ llm_response: string } | { error: string }>;
}

/**
 * Mock implementation of GeminiLLMClient for development/testing.
 * In a real application, this would interact with a large language model.
 */
export class MockGeminiLLMClient implements GeminiLLMClient {
  async getInsight(itemDetails: {
    itemName: string;
    description: string;
    price: number;
    reason: string;
    isNeed: string;
    isFutureApprove: string;
  }): Promise<{ llm_response: string } | { error: string }> {
    console.log(
      `MockGeminiLLMClient: Getting insight for item: ${itemDetails.itemName}`,
    );
    // Simulate network delay and processing time
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { itemName, price, reason, isNeed, isFutureApprove } = itemDetails;

    if (reason.includes("impulse") || isNeed.toLowerCase() === "no") {
      return {
        llm_response: `Based on your stated reason "${reason}" and that it's a "${isNeed}" (need), this purchase of "${itemName}" at $${price.toFixed(2)} seems potentially impulsive. Reconsider its long-term value.`,
      };
    } else if (isFutureApprove.toLowerCase() === "no") {
      return {
        llm_response: `You indicate you might not approve of buying "${itemName}" in the future. This suggests caution is warranted despite your reason "${reason}".`,
      };
    }

    return {
      llm_response: `The item "${itemName}" at $${price.toFixed(2)} seems like a reasonable consideration given your reason "${reason}" and acknowledging it as a "${isNeed}" (need). Your future self would likely approve.`,
    };
  }
}
```

**file: src/concepts/ItemCollection/ItemCollectionConcept.ts**

```typescript
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
    isFutureAppove: string;
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

### Explanation and Key Considerations:

1.  **Dependencies**:
    *   `Db` from `mongodb` is injected for database interaction.
    *   `AmazonAPIClient` and `GeminiLLMClient` are injected as interfaces. This allows for easy mocking in tests and swapping with real implementations later without changing the concept's core logic. The mock implementations provided simulate API calls.
2.  **State Representation**:
    *   `WishListDoc` stores `owner` and an array of `itemIds`. This represents the many-to-many or one-to-many relationship (one user has many items in their wishlist, items can theoretically be in multiple wishlists if not for `owner` restriction, but here, they are specific to a user's collection).
    *   `ItemDoc` stores the actual details of each item. This separation is good for normalization and flexible querying.
3.  **ID Management**:
    *   `freshID()` is used to generate unique IDs for `WishListDoc` (if created) and `ItemDoc`.
    *   `ID` type is consistently used.
4.  **Action Implementations**:
    *   **`addItem`**: Handles fetching external data, creating a new item, and then associating it with the user's wishlist (creating one if it doesn't exist).
    *   **Update Actions**: A private helper `_updateItemAttribute` is used to reduce boilerplate, encapsulating common checks for `owner` and `item` existence before performing a targeted update.
    *   **`setPurchased`**: Includes checks for `wasPurchased` being `false` before updating, and sets the `PurchasedTime`.
    *   **`getAIInsight`**: Fetches the full item details and passes them to the `geminiLLM` client, fulfilling the "send item to geminiLLM (including all the attributes under item...)" requirement.
5.  **Error Handling**:
    *   All actions and queries are designed to return either a successful result (an `Empty` object or `{ field: value }`) or an `{ error: string }` object. This is crucial for synchronizations to gracefully handle failures.
    *   Preconditions are checked explicitly at the beginning of actions, returning an error if violated.
6.  **Queries**:
    *   `_getWishListItems`: Retrieves all items associated with a user's wishlist.
    *   `_getItemDetails`: Retrieves the details for a single item.
    *   Queries return an *array of dictionaries*, even if it's just one item, as per the specification.
7.  **Comments and Documentation**: JSDoc comments are used for actions, and inline comments explain the logic, fulfilling the documentation requirements. The concept's purpose and principle are included in the class JSDoc.

This implementation provides a robust foundation for the `ItemCollection` concept, aligning with the concept design principles and the specified technical stack.