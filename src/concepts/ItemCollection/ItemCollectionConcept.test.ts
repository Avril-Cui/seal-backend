import {
  assert,
  assertEquals,
  assertExists,
  assertGreater,
  assertNotEquals,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ItemCollectionConcept, {
  ItemDoc,
  WishListDoc,
} from "./ItemCollectionConcept.ts"; // Import ItemDoc and WishListDoc
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
        acc: Record<
          // Explicitly type acc here
          string,
          {
            itemName: string;
            description: string;
            photo: string;
            price: number;
          }
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
    return `Mock LLM response for the given purchase analysis.`;
  }

  clearCache(): void {
    // Mock implementation - no cache to clear
  }
}
// endregion

// region: Test Constants
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;
const userC = "user:Charlie" as ID;
// endregion

// Principle: User maintains a personal wishlist, adds/updates items, marks as purchased, and gets AI insight
Deno.test("Principle: User maintains a personal wishlist, adds/updates items, marks as purchased, and gets AI insight", async (t) => {
  console.log("--- Start Principle Test ---");
  const [db, client] = await testDb();
  const amazonAPI = new MockAmazonAPIClient();
  const geminiLLM = new MockGeminiLLMClient();
  const itemCollectionConcept = new ItemCollectionConcept(
    db,
    amazonAPI,
    geminiLLM,
  );

  let itemId: ID; // Declare itemId here to be accessible across steps

  try {
    // Trace Step 1: User A adds an item to their wishlist.
    // This demonstrates principle (1), (2), (3).
    await t.step("1. User A adds an item to their wishlist.", async () => {
      const itemUrl = "https://amazon.com/item1";
      const reason = "I need a new gadget for my project.";
      const isNeed = "yes";
      const isFutureApprove = "yes";

      console.log(
        `Trace: User ${userA} calls addItem with URL "${itemUrl}" and reflections.`,
      );
      const addResult = await itemCollectionConcept.addAmazonItem({
        owner: userA,
        url: itemUrl,
        reason,
        isNeed,
        isFutureApprove,
      });

      assertNotEquals(
        "error" in addResult,
        true,
        `addItem should succeed, but got error: ${
          "error" in addResult ? (addResult as { error: string }).error : "N/A"
        }`,
      );
      const addedItem = (addResult as { item: ItemDoc }).item;
      itemId = addedItem._id;
      assertExists(itemId, "A new item ID should be generated.");
      assertEquals(addedItem.itemName, "Super Gadget"); // Verify Amazon API data
      assertEquals(addedItem.owner, userA);
      assertEquals(addedItem.reason, reason);
      assertEquals(addedItem.isNeed, isNeed);
      assertEquals(addedItem.isFutureApprove, isFutureApprove);
      assertEquals(addedItem.wasPurchased, false);
      assert(
        typeof addedItem.price === "number",
        "Item price should be a number from Amazon API.",
      );
      assertNotEquals(addedItem.price, 0, "Item price should be non-zero.");

      const wishlistItems = await itemCollectionConcept._getWishListItems({
        owner: userA,
      });
      assertNotEquals(
        "error" in wishlistItems,
        true,
        `_getWishListItems should not fail: ${
          "error" in wishlistItems
            ? (wishlistItems as { error: string }).error
            : "N/A"
        }`,
      );
      assertEquals(
        (wishlistItems as { item: ItemDoc }[]).length,
        1,
        "Wishlist should contain one item.",
      );
      assertEquals(
        (wishlistItems as { item: ItemDoc }[])[0].item._id,
        itemId,
        "The added item should be in the wishlist.",
      );
      console.log(
        `Effect & Verification: Item ${itemId} "${addedItem.itemName}" added to ${userA}'s wishlist with reflections.`,
      );
    });

    // Trace Step 2: User A updates an attribute of the item.
    // This demonstrates principle (4).
    await t.step("2. User A updates an attribute of the item.", async () => {
      const newReason = "It's for a new project, and also a treat!";
      console.log(
        `Trace: User ${userA} calls updateReason for item ${itemId} to: "${newReason}"`,
      );
      const updateResult = await itemCollectionConcept.updateReason({
        owner: userA,
        item: itemId,
        reason: newReason,
      });
      assertNotEquals(
        "error" in updateResult,
        true,
        `updateReason should succeed, but got error: ${
          "error" in updateResult
            ? (updateResult as { error: string }).error
            : "N/A"
        }`,
      );

      const itemDetails = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertNotEquals(
        "error" in itemDetails,
        true,
        "_getItemDetails should succeed.",
      );
      assertEquals(
        (itemDetails as { item: ItemDoc }[])[0].item.reason,
        newReason,
        "Item's reason should be updated.",
      );
      console.log(
        `Effect & Verification: Item ${itemId}'s reason updated to "${newReason}".`,
      );
    });

    // Trace Step 3: User A attempts to update an item attribute they don't own.
    await t.step(
      "3. User A attempts to update an item attribute they don't own.",
      async () => {
        // First add an item for UserB
        const addResultB = await itemCollectionConcept.addAmazonItem({
          owner: userB,
          url: "https://amazon.com/another_gadget_B",
          reason: "for userB",
          isNeed: "no",
          isFutureApprove: "no",
        });
        const itemIdB = (addResultB as { item: ItemDoc }).item._id;

        const newName = "Stolen Gadget Name";
        console.log(
          `Trace: User ${userA} attempts to update item (${itemIdB}) owned by user ${userB}.`,
        );
        const result = await itemCollectionConcept.updateItemName({
          owner: userA,
          item: itemIdB,
          itemName: newName,
        });
        assertEquals(
          "error" in result,
          true,
          "updateItemName should fail if item is not owned by the user.",
        );
        assertEquals(
          (result as { error: string }).error,
          `Item ${itemIdB} not found in wishlist for owner: ${userA}`,
          "Error message should indicate item not in current user's wishlist.",
        );
        console.log(
          `Effect & Verification: User ${userA} failed to update item ${itemIdB} as expected, demonstrating ownership enforcement.`,
        );
      },
    );

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
          "error" in purchaseResult
            ? (purchaseResult as { error: string }).error
            : "N/A"
        }`,
      );

      const itemDetailsResult = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertNotEquals(
        "error" in itemDetailsResult,
        true,
        "_getItemDetails should succeed.",
      );
      const purchasedItem = (itemDetailsResult as { item: ItemDoc }[])[0].item;
      assertEquals(
        purchasedItem.wasPurchased,
        true,
        "Item should be marked as purchased.",
      );
      assertExists(
        purchasedItem.PurchasedTime,
        "PurchasedTime should be set.",
      );
      assert(
        typeof purchasedItem.PurchasedTime === "number",
        "PurchasedTime should be a number (timestamp).",
      );
      assertGreater(
        purchasedItem.PurchasedTime!,
        0,
        "PurchasedTime should be a positive timestamp.",
      );
      console.log(
        `Effect & Verification: Item ${itemId} marked as purchased with timestamp: ${purchasedItem.PurchasedTime}.`,
      );
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
      });

      assertNotEquals(
        "error" in insightResult,
        true,
        `getAIInsight should succeed, but got error: ${
          "error" in insightResult
            ? (insightResult as { error: string }).error
            : "N/A"
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
      console.log(
        `Effect & Verification: Received LLM insight: "${
          (insightResult as { llm_response: string }).llm_response
        }"`,
      );
    });
  } finally {
    await db.dropDatabase();
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
      const result = await itemCollectionConcept.addAmazonItem({
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
    await t.step(
      "Effect: Successfully adds a new item and creates wishlist if not present.",
      async () => {
        const itemUrl = "https://amazon.com/item1";
        console.log(
          `Trace: Calling addItem for user ${userA} with URL: ${itemUrl}`,
        );
        const addResult = await itemCollectionConcept.addAmazonItem({
          ...commonItemData,
          url: itemUrl,
        });

        assertNotEquals(
          "error" in addResult,
          true,
          `addItem should succeed, but got error: ${
            "error" in addResult
              ? (addResult as { error: string }).error
              : "N/A"
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
            "error" in wishlistItems
              ? (wishlistItems as { error: string }).error
              : "N/A"
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
      },
    );

    // Effects: Adds another item to an existing wishlist.
    await t.step(
      "Effect: Adds another item to an existing wishlist.",
      async () => {
        const itemUrl2 = "https://amazon.com/item2";
        console.log(
          `Trace: Calling addItem for user ${userA} with another URL: ${itemUrl2}`,
        );
        const addResult = await itemCollectionConcept.addAmazonItem({
          ...commonItemData,
          url: itemUrl2,
        });

        assertNotEquals(
          "error" in addResult,
          true,
          `addItem should succeed, but got error: ${
            "error" in addResult
              ? (addResult as { error: string }).error
              : "N/A"
          }`,
        );
        const addedItem = (addResult as { item: ItemDoc }).item;
        const secondItemId = addedItem._id;
        assertExists(secondItemId);
        assertNotEquals(
          firstItemId,
          secondItemId,
          "Second item should have a different ID.",
        );

        const wishlistItems = await itemCollectionConcept._getWishListItems({
          owner: userA,
        });
        assertNotEquals(
          "error" in wishlistItems,
          true,
          `_getWishListItems should not fail: ${
            "error" in wishlistItems
              ? (wishlistItems as { error: string }).error
              : "N/A"
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
        console.log(
          "Effect confirmed: Second item added to existing wishlist.",
        );
      },
    );
  } finally {
    await db.dropDatabase();
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
    const addResult1 = await itemCollectionConcept.addAmazonItem({
      owner: userA,
      url: "https://amazon.com/item1",
      reason: "r1",
      isNeed: "n1",
      isFutureApprove: "f1",
    });
    itemId1 = (addResult1 as { item: ItemDoc }).item._id;

    const addResult2 = await itemCollectionConcept.addAmazonItem({
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
    await t.step(
      "Requires: Item must exist in the owner's wishlist.",
      async () => {
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
      },
    );

    // Effects: Successfully removes an item from the wishlist.
    await t.step(
      "Effect: Successfully removes an item from the wishlist.",
      async () => {
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
            "error" in removeResult
              ? (removeResult as { error: string }).error
              : "N/A"
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
            "error" in wishlistItems
              ? (wishlistItems as { error: string }).error
              : "N/A"
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
      },
    );
  } finally {
    await db.dropDatabase();
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
    const addResult = await itemCollectionConcept.addAmazonItem({
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
    await t.step(
      "Requires: Item must exist in the owner's wishlist.",
      async () => {
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
      },
    );

    // Requirements: Item must be owned by the user attempting to update.
    await t.step(
      "Requires: Item must be owned by the user attempting to update.",
      async () => {
        // Add an item for userB
        const addResultB = await itemCollectionConcept.addAmazonItem({
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
      },
    );

    // Requirements (updatePrice): Price cannot be negative.
    await t.step(
      "Requires (updatePrice): Price cannot be negative.",
      async () => {
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
      },
    );

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
      assertEquals(
        (itemDetails as { item: ItemDoc }[])[0].item.itemName,
        newName,
      );
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
      assertNotEquals(
        "error" in updateResult,
        true,
        "updatePhoto should succeed.",
      );
      const itemDetails = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertEquals(
        (itemDetails as { item: ItemDoc }[])[0].item.photo,
        newPhoto,
      );
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
      assertNotEquals(
        "error" in updateResult,
        true,
        "updatePrice should succeed.",
      );
      const itemDetails = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertEquals(
        (itemDetails as { item: ItemDoc }[])[0].item.price,
        newPrice,
      );
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
      assertNotEquals(
        "error" in updateResult,
        true,
        "updateReason should succeed.",
      );
      const itemDetails = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertEquals(
        (itemDetails as { item: ItemDoc }[])[0].item.reason,
        newReason,
      );
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
      assertNotEquals(
        "error" in updateResult,
        true,
        `updateIsNeed should succeed, but got error: ${
          "error" in updateResult
            ? (updateResult as { error: string }).error
            : "N/A"
        }`,
      );
      const itemDetails = await itemCollectionConcept._getItemDetails({
        itemId,
      });
      assertEquals(
        (itemDetails as { item: ItemDoc }[])[0].item.isNeed,
        newIsNeed,
      );
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
        `updateIsFutureApprove should succeed, but got error: ${
          "error" in updateResult
            ? (updateResult as { error: string }).error
            : "N/A"
        }`,
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
    await db.dropDatabase();
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
    const addResult = await itemCollectionConcept.addAmazonItem({
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
    await t.step(
      "Requires: Item must exist in the owner's wishlist.",
      async () => {
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
      },
    );

    // Effects: Successfully marks an item as purchased.
    await t.step(
      "Effect: Successfully marks an item as purchased.",
      async () => {
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
            "error" in purchaseResult
              ? (purchaseResult as { error: string }).error
              : "N/A"
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
        assertExists(
          purchasedItem.PurchasedTime,
          "PurchasedTime should be set.",
        );
        assert(
          typeof purchasedItem.PurchasedTime === "number",
          "PurchasedTime should be a number (timestamp).",
        );
        assertGreater(
          purchasedItem.PurchasedTime!,
          0,
          "PurchasedTime should be a positive timestamp.",
        );
        console.log(
          "Verification: Item's purchased status and time are correctly recorded.",
        );
      },
    );

    // Requirements: Item must not have been already purchased.
    await t.step(
      "Requires: Item must not have been already purchased.",
      async () => {
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
      },
    );
  } finally {
    await db.dropDatabase();
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
    const addResult = await itemCollectionConcept.addAmazonItem({
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
    await t.step(
      "Requires: Item must exist in the owner's wishlist.",
      async () => {
        const nonExistentItemId = "item:fake" as ID;
        console.log(
          `Trace: Attempting to get AI insight for non-existent item (${nonExistentItemId}) in userA's wishlist.`,
        );
         const result = await itemCollectionConcept.getAIInsight({
           owner: userA,
           item: nonExistentItemId,
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
      },
    );

    // Requirements: LLM API call must succeed.
    await t.step("Requires: LLM API call must succeed.", async () => {
      console.log(
        "Trace: Attempting to get AI insight when LLM API is configured to fail.",
      );
      geminiLLM.setShouldFail(true);
      const result = await itemCollectionConcept.getAIInsight({
        owner: userA,
        item: itemId,
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
      });

      assertNotEquals(
        "error" in insightResult,
        true,
        `getAIInsight should succeed, but got error: ${
          "error" in insightResult
            ? (insightResult as { error: string }).error
            : "N/A"
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
      console.log(
        `Effect confirmed: Received LLM insight: "${
          (insightResult as { llm_response: string }).llm_response
        }"`,
      );
    });
  } finally {
    await db.dropDatabase();
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
    await t.step(
      "Requires: Owner must exist and have a wishlist.",
      async () => {
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
      },
    );

    // Effects: Returns an empty array if owner has a wishlist but no items.
    await t.step(
      "Effect: Returns an empty array if owner has a wishlist but no items.",
      async () => {
        // Manually create an empty wishlist for userC, casting to the correct Collection type
        await (db.collection("ItemCollection.wishlists") as Collection<
          WishListDoc
        >).insertOne({
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
        console.log(
          "Effect confirmed: Returned empty array for empty wishlist.",
        );
      },
    );

    // Effects: Returns all items in the owner's wishlist.
    await t.step(
      "Effect: Returns all items in the owner's wishlist.",
      async () => {
        console.log(
          `Trace: Adding items for user ${userA} and then retrieving wishlist.`,
        );
        const addResult1 = await itemCollectionConcept.addAmazonItem({
          owner: userA,
          url: "https://amazon.com/item1",
          reason: "r1",
          isNeed: "n1",
          isFutureApprove: "f1",
        });
        const itemId1 = (addResult1 as { item: ItemDoc }).item._id;

        const addResult2 = await itemCollectionConcept.addAmazonItem({
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
            "error" in wishlistItems
              ? (wishlistItems as { error: string }).error
              : "N/A"
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
      },
    );
  } finally {
    await db.dropDatabase();
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
    const addResult = await itemCollectionConcept.addAmazonItem({
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
    await t.step(
      "Effect: Returns the details of a specific item.",
      async () => {
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
      },
    );
  } finally {
    await db.dropDatabase();
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
    await t.step(
      "Requires: At least ten items from other owners must exist (fail case).",
      async () => {
        // Add a few items for userA and userB, but less than 10 total from other owners
        await itemCollectionConcept.addAmazonItem({
          owner: userA,
          url: "https://amazon.com/item1",
          reason: "r",
          isNeed: "n",
          isFutureApprove: "f",
        });
        await itemCollectionConcept.addAmazonItem({
          owner: userB,
          url: "https://amazon.com/item2",
          reason: "r",
          isNeed: "n",
          isFutureApprove: "f",
        });
        await itemCollectionConcept.addAmazonItem({
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
      },
    );

    // Effects: Selects ten random items not owned by the given owner.
    await t.step(
      "Effect: Selects ten random items not owned by the given owner.",
      async () => {
        // Setup: Add more items such that there are at least 10 items not owned by userA
        // userA has 1 item from previous step
        // userB has 2 items from previous step
        // Add 8 more items for userC to reach 10+ (2 for userB + 8 for userC = 10 other items)
        for (let i = 0; i < 8; i++) {
          await itemCollectionConcept.addAmazonItem({
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
        assertEquals(
          itemIdSet.length,
          10,
          "Should return exactly 10 item IDs.",
        );

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

        console.log(
          "Effect confirmed: Ten random items (not owned by userA) returned.",
        );
      },
    );
  } finally {
    await db.dropDatabase();
    await client.close();
  }
  console.log("--- End Internal Query Test: _getTenRandomItems ---");
});
