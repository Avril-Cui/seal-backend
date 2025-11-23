import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ItemCollectionConcept from "./ItemCollectionConcept.ts";
import { AmazonAPIClient } from "@services/amazonAPI.ts";
import { GeminiLLMClient } from "@services/geminiLLM.ts";

type AmazonDetails = {
  itemName: string;
  description: string;
  photo: string;
  price: number;
};

type ItemSnapshot = {
  _id: ID;
  itemName: string;
  description: string;
  photo: string;
  price: number;
  reason: string;
  isNeed: string;
  isFutureApprove: string;
  wasPurchased: boolean;
  PurchasedTime?: Date;
};

function buildAmazonClient(overrides: Partial<AmazonDetails> = {}): AmazonAPIClient {
  const base: AmazonDetails = {
    itemName: "Sample Item",
    description: "Placeholder description from Amazon.",
    photo: "https://example.com/item.jpg",
    price: 100,
  };
  return {
    async fetchItemDetails(currentUrl: string) {
      return {
        ...base,
        ...overrides,
        itemName: overrides.itemName ?? `Details for ${currentUrl}`,
      };
    },
  };
}

function buildAmazonErrorClient(message: string): AmazonAPIClient {
  return {
    async fetchItemDetails(_url: string) {
      return { error: message };
    },
  };
}

function buildGeminiClient(responseText = "Default insight"): GeminiLLMClient {
  return {
    async getInsight() {
      return { llm_response: responseText };
    },
  };
}

type WishlistResult = Awaited<
  ReturnType<ItemCollectionConcept["_getWishListItems"]>
>;
type ItemDetailsResult = Awaited<
  ReturnType<ItemCollectionConcept["_getItemDetails"]>
>;

function extractWishlistItems(result: WishlistResult): ItemSnapshot[] {
  if ("error" in result) {
    throw new Error(result.error);
  }
  return (result as Array<{ item: ItemSnapshot }>).map((entry) => entry.item);
}

function extractItemDetails(result: ItemDetailsResult): ItemSnapshot {
  if ("error" in result) {
    throw new Error(result.error);
  }
  const items = result as Array<{ item: ItemSnapshot }>;
  return items[0].item;
}

const ownerAlice = "user:alice" as ID;
const ownerBob = "user:bob" as ID;

Deno.test("Principle: user adds, reflects, updates, purchases, and reviews insight", async () => {
  const [db, client] = await testDb();
  const ItemCollection = new ItemCollectionConcept(
    db,
    buildAmazonClient({
      itemName: "Noise Cancelling Headphones",
      description: "Over-ear, 30hr battery life.",
      price: 199,
    }),
    buildGeminiClient("Insight: seems like a thoughtful purchase."),
  );

  try {
    const addResult = await ItemCollection.addItem({
      owner: ownerAlice,
      url: "https://example.com/electronics/xyz",
      reason: "Need focus for work",
      isNeed: "yes",
      isFutureApprove: "yes",
    });
    assertEquals("error" in addResult, false, "Adding an item should succeed.");
    const { item } = addResult as { item: ID };
    assertExists(item);

    let wishlistItems = extractWishlistItems(
      await ItemCollection._getWishListItems({ owner: ownerAlice }),
    );
    assertEquals(wishlistItems.length, 1);
    assertEquals(wishlistItems[0].itemName, "Noise Cancelling Headphones");
    assertEquals(wishlistItems[0].reason, "Need focus for work");

    await ItemCollection.updatePrice({ owner: ownerAlice, item, price: 150 });
    await ItemCollection.updateReason({
      owner: ownerAlice,
      item,
      reason: "Comparing models before Black Friday",
    });
    await ItemCollection.updateDescription({
      owner: ownerAlice,
      item,
      description: "Updated description to include comfort notes",
    });

    let itemDetails = extractItemDetails(
      await ItemCollection._getItemDetails({ item }),
    );
    assertEquals(itemDetails.price, 150);
    assertEquals(itemDetails.reason, "Comparing models before Black Friday");
    assertEquals(
      itemDetails.description,
      "Updated description to include comfort notes",
    );

    await ItemCollection.setPurchased({ owner: ownerAlice, item });
    itemDetails = extractItemDetails(
      await ItemCollection._getItemDetails({ item }),
    );
    assertEquals(itemDetails.wasPurchased, true);
    assertExists(itemDetails.PurchasedTime);

    const insight = await ItemCollection.getAIInsight({
      owner: ownerAlice,
      item,
    });
    assertEquals("error" in insight, false);
    assertEquals(
      (insight as { llm_response: string }).llm_response,
      "Insight: seems like a thoughtful purchase.",
    );

    await ItemCollection.removeItem({ owner: ownerAlice, item });
    wishlistItems = extractWishlistItems(
      await ItemCollection._getWishListItems({ owner: ownerAlice }),
    );
    assertEquals(
      wishlistItems.length,
      0,
      "Removing item should clear the wishlist contents.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: addItem propagates Amazon API failures", async () => {
  const [db, client] = await testDb();
  const ItemCollection = new ItemCollectionConcept(
    db,
    buildAmazonErrorClient("Amazon API outage"),
    buildGeminiClient(),
  );

  try {
    const result = await ItemCollection.addItem({
      owner: ownerAlice,
      url: "https://example.com/error",
      reason: "Testing failure",
      isNeed: "no",
      isFutureApprove: "no",
    });
    assertEquals("error" in result, true);
    assertEquals(
      (result as { error: string }).error,
      "Amazon API error: Amazon API outage",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeItem and updates require the item to exist in the owner wishlist", async () => {
  const [db, client] = await testDb();
  const ItemCollection = new ItemCollectionConcept(
    db,
    buildAmazonClient({ itemName: "Fountain Pen" }),
    buildGeminiClient(),
  );

  try {
    const missingWishlist = await ItemCollection.removeItem({
      owner: ownerBob,
      item: "item:missing" as ID,
    });
    assertEquals("error" in missingWishlist, true);

    const addResult = await ItemCollection.addItem({
      owner: ownerAlice,
      url: "https://example.com/book/123",
      reason: "Gift idea",
      isNeed: "no",
      isFutureApprove: "yes",
    });
    const { item } = addResult as { item: ID };

    const wrongOwnerUpdate = await ItemCollection.updateItemName({
      owner: ownerBob,
      item,
      itemName: "Not allowed",
    });
    assertEquals("error" in wrongOwnerUpdate, true);

    const removalResult = await ItemCollection.removeItem({
      owner: ownerAlice,
      item,
    });
    assertEquals("error" in removalResult, false);

    const secondRemoval = await ItemCollection.removeItem({
      owner: ownerAlice,
      item,
    });
    assertEquals("error" in secondRemoval, true);
  } finally {
    await client.close();
  }
});

Deno.test("Action: setPurchased and getAIInsight enforce requirements", async () => {
  const [db, client] = await testDb();
  const ItemCollection = new ItemCollectionConcept(
    db,
    buildAmazonClient({ itemName: "Desk Lamp" }),
    buildGeminiClient("LLM: impulse warning"),
  );

  try {
    const { item } = (await ItemCollection.addItem({
      owner: ownerAlice,
      url: "https://example.com/home/desk-lamp",
      reason: "Impulse buy",
      isNeed: "no",
      isFutureApprove: "no",
    })) as { item: ID };

    const purchaseResult = await ItemCollection.setPurchased({
      owner: ownerAlice,
      item,
    });
    assertEquals("error" in purchaseResult, false);

    const doublePurchase = await ItemCollection.setPurchased({
      owner: ownerAlice,
      item,
    });
    assertEquals("error" in doublePurchase, true);

    const wrongOwnerInsight = await ItemCollection.getAIInsight({
      owner: ownerBob,
      item,
    });
    assertEquals("error" in wrongOwnerInsight, true);

    const validInsight = await ItemCollection.getAIInsight({
      owner: ownerAlice,
      item,
    });
    assertEquals(
      (validInsight as { llm_response: string }).llm_response,
      "LLM: impulse warning",
    );
  } finally {
    await client.close();
  }
});