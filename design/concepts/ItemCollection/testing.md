# testing

[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@LikertSurvey-concept-tests](/src/concepts/LikertSurvey/LikertSurveyConcept.test.ts)

# prompt: Observe how tests were structured for the sample LikertSurvey concept here ([@testing](design/concepts/LikertSurvey/testing.md) and [@LikertSurveyConcept.test](/src/concepts/LikertSurvey/LikertSurveyConcept.test.ts)) and create a test suite for test-first programming that works with the Deno testing framework and covers a full trace that demonstrates how the principle of the concept is fulfilled by a sequence of actions. Ensure that no tests use or depend on ANY other concepts besides ItemCollection itself. Do not test any behavior that requires cross-concept interaction. Minimize imports to what is needed. When performing await testDb() (do NOT use getDb()); declare the results as const variables db and client on the first line of the test case, and set const ItemCollection = new ItemCollection(db);. Refer to previously written test cases for a similar concept as a very rough guideline.

  

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

### Note

- We abstract AmazonAPI because its implementation (scraping, affiliate API, or proxy) is outside this concept's scope.
- We assume metadata is fetched at the moment of adding the item for accuracy and simplicity.
- We use three generic types here: User, Item, and AmazonAPI. User and Item are defined in the section above.
- getAIInsight is an async, AI-augmented action that we designed to address the lack of critical mass issue. When we don't have enough users to provide swipe states, users can gather some insights on whether the AI thinks a purchase is impulsive or not.


response:
# response:


# response:


# response:

```typescript
// src/concepts/ItemCollection/ItemCollectionConcept.test.ts

import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ItemCollectionConcept from "./ItemCollectionConcept.ts"; // Assuming the concept implementation is in the same directory

// Mock data for users and URLs
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const amazonUrlLaptop = "https://www.amazon.com/dp/B0BPXJ6Z4C" as string;
const amazonUrlMonitor = "https://www.amazon.com/dp/B0BPM8B7G6" as string;
const amazonUrlHeadphones = "https://www.amazon.com/dp/B0BQ5D5W3R" as string;

// Mock Amazon API fetcher for consistent testing without external calls
const mockAmazonAPIFetcher = async (url: string) => {
  if (url.includes("Laptop")) {
    return {
      itemName: "Awesome Laptop 2023",
      description: "High-performance laptop for professionals.",
      photo: "https://example.com/laptop.jpg",
      price: 1200.00,
    };
  }
  if (url.includes("Monitor")) {
    return {
      itemName: "Ultrawide Monitor",
      description: "Immersive ultrawide display for productivity and gaming.",
      photo: "https://example.com/monitor.jpg",
      price: 450.00,
    };
  }
  if (url.includes("Headphones")) {
    return {
      itemName: "Noise-Cancelling Headphones",
      description: "Premium sound with active noise cancellation.",
      photo: "https://example.com/headphones.jpg",
      price: 250.00,
    };
  }
  throw new Error(`Mock Amazon API: Unknown URL ${url}`);
};

// Mock Gemini LLM for consistent testing without external calls
const mockGeminiLLMInsight = async (itemData: any) => {
  console.log(`[MOCK LLM] Analyzing item: ${itemData.itemName}`);
  if (itemData.price > 1000) {
    return `The AI suggests that a high-value item like '${itemData.itemName}' might require careful consideration. Your reason: '${itemData.reason}'.`;
  } else {
    return `The AI views '${itemData.itemName}' as a reasonable purchase, given its price and your stated reason: '${itemData.reason}'.`;
  }
};

Deno.test("Principle: User manages wishlist items through adding, updating, purchasing, and removing.", async () => {
  const [db, client] = await testDb();
  const itemCollection = new ItemCollectionConcept(
    db,
    mockAmazonAPIFetcher,
    mockGeminiLLMInsight,
  );

  try {
    console.log(
      "\n--- Trace: Principle Fulfillment - User manages wishlist items ---",
    );

    // (1) Alice adds a laptop to her wishlist with reflection questions.
    console.log("\nACTION: Alice adds a Laptop.");
    const addLaptopResult = await itemCollection.addItem({
      owner: userAlice,
      url: amazonUrlLaptop,
      reason: "Need for work and studies",
      isNeed: "Yes",
      isFutureApprove: "Yes",
    });
    assertNotEquals(
      "error" in addLaptopResult,
      true,
      `addItem for Laptop should not fail: ${
        (addLaptopResult as { error: string }).error
      }`,
    );
    const { item: laptopId } = addLaptopResult as { item: ID };
    assertExists(laptopId, "Laptop item ID should be returned.");
    console.log(`EFFECT: Laptop (ID: ${laptopId}) added to Alice's wishlist.`);

    // Verify initial state of the added item
    const laptopDetails = (await itemCollection._getItemDetails({ item: laptopId }))[0];
    assertExists(laptopDetails, "Laptop details should be retrievable.");
    assertEquals(laptopDetails.item.itemName, "Awesome Laptop 2023");
    assertEquals(laptopDetails.item.price, 1200.00);
    assertEquals(laptopDetails.item.wasPurchased, false);
    assertEquals(laptopDetails.item.reason, "Need for work and studies");
    console.log(
      `VERIFICATION: Laptop details match, wasPurchased is false.`,
    );

    // (2) Alice adds headphones to her wishlist.
    console.log("\nACTION: Alice adds Headphones.");
    const addHeadphonesResult = await itemCollection.addItem({
      owner: userAlice,
      url: amazonUrlHeadphones,
      reason: "Old ones broke",
      isNeed: "Yes",
      isFutureApprove: "Unsure",
    });
    assertNotEquals(
      "error" in addHeadphonesResult,
      true,
      `addItem for Headphones should not fail: ${
        (addHeadphonesResult as { error: string }).error
      }`,
    );
    const { item: headphonesId } = addHeadphonesResult as { item: ID };
    assertExists(headphonesId, "Headphones item ID should be returned.");
    console.log(
      `EFFECT: Headphones (ID: ${headphonesId}) added to Alice's wishlist.`,
    );

    // Verify Alice's wishlist contains both items
    const aliceWishlist = await itemCollection._getUserWishlist({ owner: userAlice });
    assertEquals(aliceWishlist.length, 2, "Alice's wishlist should have 2 items.");
    assertExists(
      aliceWishlist.find((i) => i.item._id === laptopId),
      "Laptop should be in Alice's wishlist.",
    );
    assertExists(
      aliceWishlist.find((i) => i.item._id === headphonesId),
      "Headphones should be in Alice's wishlist.",
    );
    console.log(`VERIFICATION: Alice's wishlist contains Laptop and Headphones.`);

    // (3) Alice updates the reason for purchasing the laptop.
    console.log("\nACTION: Alice updates Laptop's reason.");
    const updateReasonResult = await itemCollection.updateReason({
      owner: userAlice,
      item: laptopId,
      reason: "Essential for new job role",
    });
    assertEquals(
      "error" in updateReasonResult,
      false,
      `updateReason should succeed: ${
        (updateReasonResult as { error: string }).error
      }`,
    );
    console.log(`EFFECT: Laptop's reason updated.`);

    // Verify the update
    const updatedLaptopDetails = (await itemCollection._getItemDetails({ item: laptopId }))[0];
    assertEquals(
      updatedLaptopDetails.item.reason,
      "Essential for new job role",
      "Laptop reason should be updated.",
    );
    console.log(`VERIFICATION: Laptop's reason is now 'Essential for new job role'.`);

    // (4) Alice gets AI insight on her laptop purchase.
    console.log("\nACTION: Alice requests AI insight for Laptop.");
    const aiInsightResult = await itemCollection.getAIInsight({
      owner: userAlice,
      item: laptopId,
    });
    assertEquals(
      "error" in aiInsightResult,
      false,
      `getAIInsight should succeed: ${
        (aiInsightResult as { error: string }).error
      }`,
    );
    assertExists(
      (aiInsightResult as { llm_response: string }).llm_response,
      "AI insight response should exist.",
    );
    console.log(
      `EFFECT: Received AI insight: ${
        (aiInsightResult as { llm_response: string }).llm_response
      }`,
    );
    assert((aiInsightResult as { llm_response: string }).llm_response.includes("high-value item"), "AI response should reflect item value.");
    console.log("VERIFICATION: AI insight received and reflects item characteristics.");

    // (5) Alice marks the laptop as purchased.
    console.log("\nACTION: Alice marks Laptop as purchased.");
    const setPurchasedResult = await itemCollection.setPurchased({
      owner: userAlice,
      item: laptopId,
    });
    assertEquals(
      "error" in setPurchasedResult,
      false,
      `setPurchased should succeed: ${
        (setPurchasedResult as { error: string }).error
      }`,
    );
    console.log(`EFFECT: Laptop marked as purchased.`);

    // Verify wasPurchased and PurchasedTime
    const purchasedLaptopDetails = (await itemCollection._getItemDetails({ item: laptopId }))[0];
    assertEquals(
      purchasedLaptopDetails.item.wasPurchased,
      true,
      "Laptop should be marked as purchased.",
    );
    assertExists(
      purchasedLaptopDetails.item.purchasedTime,
      "PurchasedTime should be set.",
    );
    console.log(`VERIFICATION: Laptop is marked purchased with a timestamp.`);

    // (6) Alice removes the headphones from her wishlist.
    console.log("\nACTION: Alice removes Headphones.");
    const removeHeadphonesResult = await itemCollection.removeItem({
      owner: userAlice,
      item: headphonesId,
    });
    assertEquals(
      "error" in removeHeadphonesResult,
      false,
      `removeItem should succeed: ${
        (removeHeadphonesResult as { error: string }).error
      }`,
    );
    console.log(`EFFECT: Headphones removed from Alice's wishlist.`);

    // Verify headphones are no longer in Alice's wishlist
    const finalAliceWishlist = await itemCollection._getUserWishlist({ owner: userAlice });
    assertEquals(
      finalAliceWishlist.length,
      1,
      "Alice's wishlist should have 1 item left.",
    );
    assertNotEquals(
      finalAliceWishlist.find((i) => i.item._id === headphonesId),
      headphonesId,
      "Headphones should no longer be in Alice's wishlist.",
    );
    // Verify the item is also removed from the global items collection
    const removedHeadphonesDetails = await itemCollection._getItemDetails({ item: headphonesId });
    assertEquals(
      removedHeadphonesDetails.length,
      0,
      "Removed headphones should not exist in item details.",
    );
    console.log(`VERIFICATION: Headphones are gone from wishlist and global collection.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: addItem - successful item addition and metadata fetching", async () => {
  const [db, client] = await testDb();
  const itemCollection = new ItemCollectionConcept(db, mockAmazonAPIFetcher);

  try {
    console.log(
      "\n--- Test: addItem - successful item addition and metadata fetching ---",
    );
    const addResult = await itemCollection.addItem({
      owner: userBob,
      url: amazonUrlMonitor,
      reason: "Upgrade existing setup",
      isNeed: "No",
      isFutureApprove: "Yes",
    });
    assertEquals(
      "error" in addResult,
      false,
      `addItem should succeed: ${(addResult as { error: string }).error}`,
    );
    const { item: monitorId } = addResult as { item: ID };
    assertExists(monitorId);
    console.log(`EFFECT: Item (ID: ${monitorId}) added for ${userBob}.`);

    // Verify the item is in the wishlist
    const bobWishlist = await itemCollection._getUserWishlist({ owner: userBob });
    assertEquals(bobWishlist.length, 1, "Bob's wishlist should have 1 item.");
    assertEquals(
      bobWishlist[0].item._id,
      monitorId,
      "The added item should be in Bob's wishlist.",
    );
    console.log(`VERIFICATION: Item found in Bob's wishlist.`);

    // Verify metadata and reflection questions
    const monitorDetails = (await itemCollection._getItemDetails({ item: monitorId }))[0];
    assertExists(monitorDetails);
    assertEquals(monitorDetails.item.itemName, "Ultrawide Monitor");
    assertEquals(monitorDetails.item.price, 450.00);
    assertEquals(monitorDetails.item.reason, "Upgrade existing setup");
    assertEquals(monitorDetails.item.isNeed, "No");
    assertEquals(monitorDetails.item.isFutureApprove, "Yes");
    assertEquals(monitorDetails.item.wasPurchased, false);
    console.log(`VERIFICATION: Item metadata and reflection questions are correct.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeItem - requires item to be in user's wishlist", async () => {
  const [db, client] = await testDb();
  const itemCollection = new ItemCollectionConcept(db, mockAmazonAPIFetcher);

  try {
    console.log(
      "\n--- Test: removeItem - requires item to be in user's wishlist ---",
    );
    const addResult = await itemCollection.addItem({
      owner: userAlice,
      url: amazonUrlLaptop,
      reason: "Test",
      isNeed: "Yes",
      isFutureApprove: "Yes",
    });
    const { item: laptopId } = addResult as { item: ID };
    console.log(`SETUP: Laptop (ID: ${laptopId}) added for ${userAlice}.`);

    // Attempt to remove by another user
    console.log(`ACTION: ${userBob} attempts to remove ${laptopId}.`);
    const removeByBobResult = await itemCollection.removeItem({
      owner: userBob,
      item: laptopId,
    });
    assertEquals(
      "error" in removeByBobResult,
      true,
      "Removing an item not owned by the user should fail.",
    );
    assertEquals(
      (removeByBobResult as { error: string }).error,
      "Item not found in user's wishlist or wishlist does not exist.",
    );
    console.log(`VERIFICATION: Removal by ${userBob} failed as expected.`);

    // Attempt to remove a non-existent item
    const nonExistentItemId = "item:fake" as ID;
    console.log(
      `ACTION: ${userAlice} attempts to remove non-existent item ${nonExistentItemId}.`,
    );
    const removeNonExistentResult = await itemCollection.removeItem({
      owner: userAlice,
      item: nonExistentItemId,
    });
    assertEquals(
      "error" in removeNonExistentResult,
      true,
      "Removing a non-existent item should fail.",
    );
    assertEquals(
      (removeNonExistentResult as { error: string }).error,
      "Item not found in user's wishlist or wishlist does not exist.",
    );
    console.log(`VERIFICATION: Removal of non-existent item failed as expected.`);

    // Successful removal
    console.log(`ACTION: ${userAlice} successfully removes ${laptopId}.`);
    const removeResult = await itemCollection.removeItem({
      owner: userAlice,
      item: laptopId,
    });
    assertEquals(
      "error" in removeResult,
      false,
      "Successful removal should not return an error.",
    );
    const aliceWishlist = await itemCollection._getUserWishlist({ owner: userAlice });
    assertEquals(aliceWishlist.length, 0, "Alice's wishlist should be empty.");
    console.log(`VERIFICATION: Item successfully removed by ${userAlice}.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateItemAttribute - requires item to be in user's wishlist", async () => {
  const [db, client] = await testDb();
  const itemCollection = new ItemCollectionConcept(db, mockAmazonAPIFetcher);

  try {
    console.log(
      "\n--- Test: updateItemAttribute - requires item to be in user's wishlist ---",
    );
    const addResult = await itemCollection.addItem({
      owner: userAlice,
      url: amazonUrlLaptop,
      reason: "Old reason",
      isNeed: "Yes",
      isFutureApprove: "Yes",
    });
    const { item: laptopId } = addResult as { item: ID };
    console.log(`SETUP: Laptop (ID: ${laptopId}) added for ${userAlice}.`);

    // Attempt to update by another user
    console.log(
      `ACTION: ${userBob} attempts to update laptop's reason for ${laptopId}.`,
    );
    const updateByBobResult = await itemCollection.updateReason({
      owner: userBob,
      item: laptopId,
      reason: "Bob's reason",
    });
    assertEquals(
      "error" in updateByBobResult,
      true,
      "Updating an item not owned by the user should fail.",
    );
    assertEquals(
      (updateByBobResult as { error: string }).error,
      "Item not found in user's wishlist or wishlist does not exist.",
    );
    console.log(`VERIFICATION: Update by ${userBob} failed as expected.`);

    // Attempt to update a non-existent item
    const nonExistentItemId = "item:fakeUpdate" as ID;
    console.log(
      `ACTION: ${userAlice} attempts to update non-existent item ${nonExistentItemId}.`,
    );
    const updateNonExistentResult = await itemCollection.updateReason({
      owner: userAlice,
      item: nonExistentItemId,
      reason: "New reason",
    });
    assertEquals(
      "error" in updateNonExistentResult,
      true,
      "Updating a non-existent item should fail.",
    );
    assertEquals(
      (updateNonExistentResult as { error: string }).error,
      "Item not found in user's wishlist or wishlist does not exist.",
    );
    console.log(`VERIFICATION: Update of non-existent item failed as expected.`);

    // Successful update
    console.log(`ACTION: ${userAlice} successfully updates laptop's reason.`);
    const updateResult = await itemCollection.updateReason({
      owner: userAlice,
      item: laptopId,
      reason: "Updated reason for work",
    });
    assertEquals(
      "error" in updateResult,
      false,
      "Successful update should not return an error.",
    );
    const updatedDetails = (await itemCollection._getItemDetails({ item: laptopId }))[0];
    assertEquals(
      updatedDetails.item.reason,
      "Updated reason for work",
      "Item reason should be updated.",
    );
    console.log(`VERIFICATION: Item reason successfully updated by ${userAlice}.`);

    // Test specific update for price requirement (non-negative)
    console.log(`ACTION: ${userAlice} attempts to update laptop price to -10.`);
    const invalidPriceUpdate = await itemCollection.updatePrice({
      owner: userAlice,
      item: laptopId,
      price: -10,
    });
    assertEquals(
      "error" in invalidPriceUpdate,
      true,
      "Updating price to a negative value should fail.",
    );
    assertEquals(
      (invalidPriceUpdate as { error: string }).error,
      "Price must be a non-negative number.",
    );
    console.log(`VERIFICATION: Price update to negative value failed as expected.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: setPurchased - requires item to be in user's wishlist and not already purchased", async () => {
  const [db, client] = await testDb();
  const itemCollection = new ItemCollectionConcept(db, mockAmazonAPIFetcher);

  try {
    console.log(
      "\n--- Test: setPurchased - requirements (owner, item, not already purchased) ---",
    );
    const addResult = await itemCollection.addItem({
      owner: userAlice,
      url: amazonUrlHeadphones,
      reason: "Need for calls",
      isNeed: "Yes",
      isFutureApprove: "Yes",
    });
    const { item: headphonesId } = addResult as { item: ID };
    console.log(`SETUP: Headphones (ID: ${headphonesId}) added for ${userAlice}.`);

    // Attempt to set purchased by another user
    console.log(
      `ACTION: ${userBob} attempts to mark ${headphonesId} as purchased.`,
    );
    const setPurchasedByBobResult = await itemCollection.setPurchased({
      owner: userBob,
      item: headphonesId,
    });
    assertEquals(
      "error" in setPurchasedByBobResult,
      true,
      "Marking as purchased an item not owned by the user should fail.",
    );
    assertEquals(
      (setPurchasedByBobResult as { error: string }).error,
      "Item not found in user's wishlist or wishlist does not exist.",
    );
    console.log(`VERIFICATION: Set purchased by ${userBob} failed as expected.`);

    // Successful first purchase
    console.log(
      `ACTION: ${userAlice} successfully marks ${headphonesId} as purchased.`,
    );
    const firstPurchaseResult = await itemCollection.setPurchased({
      owner: userAlice,
      item: headphonesId,
    });
    assertEquals(
      "error" in firstPurchaseResult,
      false,
      "First successful purchase should not return an error.",
    );
    const purchasedDetails = (await itemCollection._getItemDetails({ item: headphonesId }))[0];
    assertEquals(
      purchasedDetails.item.wasPurchased,
      true,
      "Item should be marked as purchased.",
    );
    assertExists(
      purchasedDetails.item.purchasedTime,
      "PurchasedTime should be set.",
    );
    console.log(`VERIFICATION: Item marked purchased, timestamp set.`);

    // Attempt to set purchased again (already purchased)
    console.log(
      `ACTION: ${userAlice} attempts to mark ${headphonesId} as purchased again.`,
    );
    const secondPurchaseResult = await itemCollection.setPurchased({
      owner: userAlice,
      item: headphonesId,
    });
    assertEquals(
      "error" in secondPurchaseResult,
      true,
      "Marking an already purchased item should fail.",
    );
    assertEquals(
      (secondPurchaseResult as { error: string }).error,
      "Item has already been marked as purchased.",
    );
    console.log(`VERIFICATION: Attempt to repurchase failed as expected.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: getAIInsight - requires item to be in user's wishlist", async () => {
  const [db, client] = await testDb();
  const itemCollection = new ItemCollectionConcept(
    db,
    mockAmazonAPIFetcher,
    mockGeminiLLMInsight,
  );

  try {
    console.log(
      "\n--- Test: getAIInsight - requires item to be in user's wishlist ---",
    );
    const addResult = await itemCollection.addItem({
      owner: userAlice,
      url: amazonUrlMonitor,
      reason: "To improve work setup",
      isNeed: "No",
      isFutureApprove: "Yes",
    });
    const { item: monitorId } = addResult as { item: ID };
    console.log(`SETUP: Monitor (ID: ${monitorId}) added for ${userAlice}.`);

    // Attempt to get AI insight by another user
    console.log(
      `ACTION: ${userBob} attempts to get AI insight for ${monitorId}.`,
    );
    const aiInsightByBobResult = await itemCollection.getAIInsight({
      owner: userBob,
      item: monitorId,
    });
    assertEquals(
      "error" in aiInsightByBobResult,
      true,
      "Getting AI insight for an item not owned by the user should fail.",
    );
    assertEquals(
      (aiInsightByBobResult as { error: string }).error,
      "Item not found in user's wishlist or wishlist does not exist.",
    );
    console.log(`VERIFICATION: AI insight request by ${userBob} failed as expected.`);

    // Attempt to get AI insight for a non-existent item
    const nonExistentItemId = "item:fakeAI" as ID;
    console.log(
      `ACTION: ${userAlice} attempts to get AI insight for non-existent item ${nonExistentItemId}.`,
    );
    const aiInsightNonExistentResult = await itemCollection.getAIInsight({
      owner: userAlice,
      item: nonExistentItemId,
    });
    assertEquals(
      "error" in aiInsightNonExistentResult,
      true,
      "Getting AI insight for a non-existent item should fail.",
    );
    assertEquals(
      (aiInsightNonExistentResult as { error: string }).error,
      "Item not found in user's wishlist or wishlist does not exist.",
    );
    console.log(`VERIFICATION: AI insight request for non-existent item failed as expected.`);

    // Successful AI insight request
    console.log(`ACTION: ${userAlice} successfully gets AI insight for ${monitorId}.`);
    const aiInsightResult = await itemCollection.getAIInsight({
      owner: userAlice,
      item: monitorId,
    });
    assertEquals(
      "error" in aiInsightResult,
      false,
      "Successful AI insight request should not return an error.",
    );
    assertExists(
      (aiInsightResult as { llm_response: string }).llm_response,
      "AI insight response should exist.",
    );
    console.log(
      `VERIFICATION: AI insight received: ${
        (aiInsightResult as { llm_response: string }).llm_response
      }`,
    );
    assert((aiInsightResult as { llm_response: string }).llm_response.includes("reasonable purchase"), "AI response should reflect mocked LLM behavior.");
  } finally {
    await client.close();
  }
});
```