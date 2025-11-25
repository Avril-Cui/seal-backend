---
timestamp: 'Tue Nov 25 2025 13:58:43 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_135843.2eeccb13.md]]'
content_id: 0bfb9c3344328126c24cfea4b482725ca8d5d6ab791f6f0796312fc16d6c9c38
---

# response:

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import QueueSystemConcept from "./QueueSystemConcept.ts";

// --- Test Utilities and Constants ---
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;
const item1 = "item:123" as ID;
const item2 = "item:456" as ID;
const item3 = "item:789" as ID;
const itemNonExistent = "item:unknown" as ID;

/**
 * Helper function to get the start of the current day in UTC.
 * This should match the internal logic of QueueSystemConcept.
 */
function getTodayStart(): Date {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Set to start of day in UTC
  return today;
}

// --- Test File Start ---

// file: src/concepts/QueueSystem/QueueSystemConcept.test.ts

Deno.test("Principle: User generates a queue, completes items, and views updated completion count", async (t) => {
  const [db, client] = await testDb();
  const queueSystemConcept = new QueueSystemConcept(db);

  try {
    // trace: User A generates a queue for today with specific items. User A completes item1, then item2.
    // User A verifies their completed queue count increases from 0 to 1, then to 2.

    await t.step("1. User A generates a daily queue with items", async () => {
      console.log("Action: generateDailyQueue for userA with [item1, item2]");
      const itemIds = [item1, item2];
      const result = await queueSystemConcept.generateDailyQueue({
        owner: userA,
        itemIds: itemIds,
      });

      assertNotEquals(
        "error" in result,
        true,
        "Generating the daily queue for User A should succeed.",
      );
      assertExists((result as { queue: ID }).queue, "A queue ID should be returned.");
      console.log(`Effect: Queue created with ID: ${(result as { queue: ID }).queue}`);
    });

    await t.step("2. Verify initial completedQueue count for User A is 0", async () => {
      console.log("Action: _getCompletedQueue for userA");
      const result = await queueSystemConcept._getCompletedQueue({ owner: userA });

      assertNotEquals(
        "error" in result,
        true,
        "Getting completed queue for User A should succeed as a queue exists.",
      );
      assertEquals(
        (result as { completedQueue: number }[])[0].completedQueue,
        0,
        "Initially, the completedQueue count should be 0.",
      );
      console.log(`Effect: Initial completedQueue count is 0.`);
    });

    await t.step("3. User A completes item1 from their queue", async () => {
      console.log("Action: incrementCompletedQueue for userA with item1");
      const result = await queueSystemConcept.incrementCompletedQueue({
        owner: userA,
        itemId: item1,
      });

      assertNotEquals("error" in result, true, "Incrementing completed queue for item1 should succeed.");
      console.log(`Effect: item1 marked as completed.`);
    });

    await t.step("4. Verify completedQueue count for User A is now 1", async () => {
      console.log("Action: _getCompletedQueue for userA");
      const result = await queueSystemConcept._getCompletedQueue({ owner: userA });

      assertNotEquals(
        "error" in result,
        true,
        "Getting completed queue for User A should succeed.",
      );
      assertEquals(
        (result as { completedQueue: number }[])[0].completedQueue,
        1,
        "After completing item1, completedQueue count should be 1.",
      );
      console.log(`Effect: completedQueue count is 1.`);
    });

    await t.step("5. User A completes item2 from their queue", async () => {
      console.log("Action: incrementCompletedQueue for userA with item2");
      const result = await queueSystemConcept.incrementCompletedQueue({
        owner: userA,
        itemId: item2,
      });

      assertNotEquals("error" in result, true, "Incrementing completed queue for item2 should succeed.");
      console.log(`Effect: item2 marked as completed.`);
    });

    await t.step("6. Verify completedQueue count for User A is now 2", async () => {
      console.log("Action: _getCompletedQueue for userA");
      const result = await queueSystemConcept._getCompletedQueue({ owner: userA });

      assertNotEquals(
        "error" in result,
        true,
        "Getting completed queue for User A should succeed.",
      );
      assertEquals(
        (result as { completedQueue: number }[])[0].completedQueue,
        2,
        "After completing item2, completedQueue count should be 2.",
      );
      console.log(`Effect: completedQueue count is 2.`);
    });

    console.log(
      "Principle fulfillment: User A successfully generated a queue, completed items, and observed the completion count increase as expected.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateDailyQueue requirements are enforced", async (t) => {
  const [db, client] = await testDb();
  const queueSystemConcept = new QueueSystemConcept(db);

  try {
    await t.step("requires: no queue exists for owner/date", async () => {
      console.log(
        "Testing generateDailyQueue requirement: no existing queue for owner/date.",
      );
      // First, create a queue successfully
      console.log("Action: generateDailyQueue for userB (first time)");
      const firstResult = await queueSystemConcept.generateDailyQueue({
        owner: userB,
        itemIds: [item3],
      });
      assertNotEquals("error" in firstResult, true, "First queue generation should succeed.");
      console.log(`Effect: Queue created for userB.`);

      // Then, try to create another queue for the same user and date
      console.log("Action: generateDailyQueue for userB (second time on same day)");
      const secondResult = await queueSystemConcept.generateDailyQueue({
        owner: userB,
        itemIds: [item1],
      });
      assertEquals("error" in secondResult, true, "Should fail when a queue already exists for the user today.");
      assertEquals(
        (secondResult as { error: string }).error,
        `A queue already exists for user ${userB} for today`,
        "Error message should indicate existing queue.",
      );
      console.log(`Requirement met: Error returned when trying to create a duplicate queue.`);
    });

    await t.step("effects: create a queue and return its ID", async () => {
      console.log(
        "Testing generateDailyQueue effects: queue creation and ID return.",
      );
      const newUserId = "user:newUser" as ID;
      const itemIds = [item1, item2];
      console.log(`Action: generateDailyQueue for ${newUserId} with [item1, item2]`);
      const result = await queueSystemConcept.generateDailyQueue({
        owner: newUserId,
        itemIds: itemIds,
      });

      assertNotEquals("error" in result, true, "Queue generation should succeed.");
      const { queue } = result as { queue: ID };
      assertExists(queue, "A new queue ID should be returned.");
      console.log(`Effect: Queue with ID ${queue} created.`);

      // Verify initial state using an internal helper
      console.log(`Verification: Check completedQueue count for ${newUserId}`);
      const completedResult = await queueSystemConcept._getCompletedQueue({
        owner: newUserId,
      });
      assertNotEquals("error" in completedResult, true, "Should be able to get completed queue for new user.");
      assertEquals(
        (completedResult as { completedQueue: number }[])[0].completedQueue,
        0,
        "Newly created queue should have 0 completed items.",
      );
      console.log(`Effect confirmed: completedQueue is 0 for the new queue.`);
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: _getCompletedQueue requirements and effects", async (t) => {
  const [db, client] = await testDb();
  const queueSystemConcept = new QueueSystemConcept(db);

  try {
    await t.step("requires: queue exists for owner/date", async () => {
      console.log(
        "Testing _getCompletedQueue requirement: queue must exist for owner/date.",
      );
      const userWithoutQueue = "user:NoQueue" as ID;
      console.log(`Action: _getCompletedQueue for ${userWithoutQueue}`);
      const result = await queueSystemConcept._getCompletedQueue({
        owner: userWithoutQueue,
      });
      assertEquals("error" in result, true, "Should return an error if no queue exists for the user today.");
      assertEquals(
        (result as { error: string }).error,
        `No queue found for user ${userWithoutQueue} for today`,
        "Error message should indicate no queue found.",
      );
      console.log(`Requirement met: Error returned for non-existent queue.`);
    });

    await t.step("effects: return completedQueue", async () => {
      console.log("Testing _getCompletedQueue effects: returns the correct count.");
      // Setup: Create a queue and increment it
      console.log("Setup: Create queue for userA and increment it once.");
      await queueSystemConcept.generateDailyQueue({
        owner: userA,
        itemIds: [item1, item2],
      });
      await queueSystemConcept.incrementCompletedQueue({
        owner: userA,
        itemId: item1,
      });

      console.log("Action: _getCompletedQueue for userA");
      const result = await queueSystemConcept._getCompletedQueue({ owner: userA });
      assertNotEquals("error" in result, true, "Getting completed queue for userA should succeed.");
      assertEquals(
        (result as { completedQueue: number }[])[0].completedQueue,
        1,
        "Should return 1 as the completedQueue count.",
      );
      console.log(`Effect confirmed: Correct completedQueue count (1) returned.`);
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: incrementCompletedQueue requirements and effects", async (t) => {
  const [db, client] = await testDb();
  const queueSystemConcept = new QueueSystemConcept(db);

  try {
    // Setup for valid cases: create a queue for userB
    console.log("Setup: Create a queue for userB with [item1, item2]");
    await queueSystemConcept.generateDailyQueue({
      owner: userB,
      itemIds: [item1, item2],
    });

    await t.step("requires: queue exists for owner/date", async () => {
      console.log(
        "Testing incrementCompletedQueue requirement: queue must exist for owner/date.",
      );
      const userWithoutQueue = "user:NoQueueInc" as ID;
      console.log(`Action: incrementCompletedQueue for ${userWithoutQueue}`);
      const result = await queueSystemConcept.incrementCompletedQueue({
        owner: userWithoutQueue,
        itemId: item1,
      });
      assertEquals("error" in result, true, "Should return an error if no queue exists for the user today.");
      assertEquals(
        (result as { error: string }).error,
        `No queue found for user ${userWithoutQueue} for today`,
        "Error message should indicate no queue found.",
      );
      console.log(`Requirement met: Error returned when no queue exists.`);
    });

    await t.step("requires: itemId exists in $q.itemIdSet", async () => {
      console.log(
        "Testing incrementCompletedQueue requirement: itemId must exist in the queue's itemIdSet.",
      );
      console.log(`Action: incrementCompletedQueue for userB with ${itemNonExistent}`);
      const result = await queueSystemConcept.incrementCompletedQueue({
        owner: userB,
        itemId: itemNonExistent,
      });
      assertEquals("error" in result, true, "Should return an error if itemId is not in the queue.");
      assertEquals(
        (result as { error: string }).error,
        `Item ${itemNonExistent} not found in queue for user ${userB} for today`,
        "Error message should indicate item not found.",
      );
      console.log(`Requirement met: Error returned when itemId is not in the queue.`);
    });

    await t.step("effects: add one count to completedQueue", async () => {
      console.log(
        "Testing incrementCompletedQueue effects: completedQueue count increases.",
      );
      console.log("Pre-check: _getCompletedQueue for userB should be 0");
      let preIncResult = await queueSystemConcept._getCompletedQueue({ owner: userB });
      assertEquals((preIncResult as { completedQueue: number }[])[0].completedQueue, 0);

      console.log(`Action: incrementCompletedQueue for userB with ${item1}`);
      const result = await queueSystemConcept.incrementCompletedQueue({
        owner: userB,
        itemId: item1,
      });
      assertNotEquals("error" in result, true, "Incrementing completed queue for item1 should succeed.");
      console.log(`Effect: completedQueue incremented.`);

      console.log("Verification: _getCompletedQueue for userB should be 1");
      const postIncResult = await queueSystemConcept._getCompletedQueue({ owner: userB });
      assertNotEquals("error" in postIncResult, true, "Getting completed queue for userB should succeed.");
      assertEquals(
        (postIncResult as { completedQueue: number }[])[0].completedQueue,
        1,
        "After incrementing, completedQueue count should be 1.",
      );
      console.log(`Effect confirmed: completedQueue count is 1.`);
    });

    // Note: Verifying the removal of itemId from itemIdSet directly is not possible
    // through the concept's public/internal helper methods.
    // If a helper like `_getQueueItems({owner})` existed, it would be used here.
  } finally {
    await client.close();
  }
});
```
