// file: src/concepts/QueueSystem/QueueSystemConcept.test.ts
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import QueueSystemConcept from "./QueueSystemConcept.ts";

// Define test User and Item IDs
const userA = "user:Alice" as ID;

Deno.test("Principle: User receives daily queue, completes items, and progress is tracked", async () => {
  const [db, client] = await testDb();
  const queueSystem = new QueueSystemConcept(db);

  try {
    console.log(
      "\n--- Principle Test: User receives daily queue, completes items, and progress is tracked ---",
    );

    // trace: (1) Every user receives a daily queue containing items from other users' added items.
    console.log(`Action: generateDailyQueue for ${userA}.`);
    const generateQueueResult = await queueSystem.generateDailyQueue({
      owner: userA,
    });
    assertNotEquals(
      "error" in generateQueueResult,
      true,
      "Survey creation should not fail. (generateDailyQueue)",
    );
    assertExists(
      (generateQueueResult as { queue: ID }).queue,
      "A queue ID should be returned.",
    );
    console.log(`Effect confirmed: A queue for user ${userA} has been generated.`);

    const queueDetails = await queueSystem.queues.findOne({ owner: userA });
    assertExists(queueDetails, "Queue details should be retrievable after generation.");
    assertEquals(
      queueDetails?.completedQueue,
      0,
      "New queue should start with 0 completed items, confirming initial state.",
    );
    assertNotEquals(
      queueDetails?.itemSet.length,
      0,
      "New queue should contain items as per the principle's intent.",
    );
    console.log(
      `Verification: Queue for ${userA} has ${queueDetails?.itemSet.length} items and 0 completed items.`,
    );

    // trace: (2) A queue contains items that the user does not own.
    const itemsInQueue = queueDetails!.itemSet;
    console.log(
      `Principle (2) Note: The concept states items are not owned by the user. ` +
        `We assume 'generateDailyQueue' fulfills this by selecting appropriate items. ` +
        `The generated queue for ${userA} contains items: ${itemsInQueue.join(", ")}.`,
    );

    // Demonstrate progress tracking by completing items.
    if (itemsInQueue.length > 0) {
      const itemToComplete1 = itemsInQueue[0];
      console.log(
        `Action: incrementCompletedQueue for ${userA}, completing item ${itemToComplete1}.`,
      );
      const incrementResult1 = await queueSystem.incrementCompletedQueue({
        owner: userA,
        item: itemToComplete1,
      });
      assertNotEquals(
        "error" in incrementResult1,
        true,
        `Incrementing completed queue for item ${itemToComplete1} should succeed.`,
      );
      console.log(`Effect confirmed: Item ${itemToComplete1} marked as completed.`);

      const updatedQueueDetails1 = await queueSystem.queues.findOne({ owner: userA });
      assertEquals(
        updatedQueueDetails1?.completedQueue,
        1,
        "After completing one item, 'completedQueue' should be 1.",
      );
      assertEquals(
        updatedQueueDetails1?.itemSet.includes(itemToComplete1),
        false,
        "Completed item should be removed from the 'itemSet' as an effect.",
      );
      console.log(
        `Verification: Queue for ${userA} now has ${updatedQueueDetails1?.itemSet.length} items remaining and 1 completed item.`,
      );
    }
  } finally {
    await client.close();
  }
});

Deno.test("Action: _getCompletedQueue requires an existing queue", async () => {
  const [db, client] = await testDb();
  const queueSystem = new QueueSystemConcept(db);

  try {
    const nonExistentUser = "user:nonexistent" as ID;

    // Test requirement: queue $q$ exists with matching owner
    const result = await queueSystem._getCompletedQueue({ owner: nonExistentUser });
    assertEquals(
      "error" in result,
      true,
      "Getting completed queue for a non-existent user should fail as requirement not met.",
    );

    // Confirm effect: After creating a queue, the action should succeed.
    await queueSystem.generateDailyQueue({ owner: userA });
    const validResult = await queueSystem._getCompletedQueue({ owner: userA });
    assertEquals(
      "error" in validResult,
      false,
      "Getting completed queue for an existing user should succeed.",
    );
    const successResult = validResult as { completedQueue: number }[];
    assertEquals(
      successResult[0].completedQueue,
      0,
      "Initial completedQueue should be 0.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: generateDailyQueue requires no existing queue for owner", async () => {
  const [db, client] = await testDb();
  const queueSystem = new QueueSystemConcept(db);

  try {
    // First generation should succeed (base case)
    const firstGenerateResult = await queueSystem.generateDailyQueue({
      owner: userA,
    });
    assertNotEquals(
      "error" in firstGenerateResult,
      true,
      "First queue generation for a user should succeed.",
    );

    // Test requirement: no queue exists with owner matching this user
    const secondGenerateResult = await queueSystem.generateDailyQueue({
      owner: userA,
    });
    assertEquals(
      "error" in secondGenerateResult,
      true,
      "Second queue generation for the same user should fail as requirement not met.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: incrementCompletedQueue requirements and effects are enforced", async () => {
  const [db, client] = await testDb();
  const queueSystem = new QueueSystemConcept(db);

  try {
    // Setup: Generate a queue for userA to have items to increment.
    await queueSystem.generateDailyQueue({ owner: userA });
    const queueDetails = await queueSystem.queues.findOne({ owner: userA });
    const item1 = queueDetails!.itemSet[0]; // Get a valid item from the queue
    const nonExistentItem = "item:fake_nonexistent" as ID;
    const nonExistentUser = "user:fake_nonexistent" as ID;

    // Test requirement: exists a queue $q$ under this user
    const res1 = await queueSystem.incrementCompletedQueue({
      owner: nonExistentUser,
      item: item1,
    });
    assertEquals(
      "error" in res1,
      true,
      "Incrementing for a user without an existing queue should fail.",
    );

    // Test requirement: item exists in $q$.itemSet
    const res2 = await queueSystem.incrementCompletedQueue({
      owner: userA,
      item: nonExistentItem,
    });
    assertEquals(
      "error" in res2,
      true,
      "Incrementing with an item not present in the user's queue should fail.",
    );

    // Confirm effects: Test a successful increment and verify state changes.
    const successResult = await queueSystem.incrementCompletedQueue({
      owner: userA,
      item: item1,
    });
    assertEquals(
      "error" in successResult,
      false,
      "A valid increment operation should succeed.",
    );

    // Verify effects: add one count to completedQueue; remove item from $q$.itemSet;
    const updatedQueueDetails = await queueSystem.queues.findOne({ owner: userA });
    assertEquals(
      updatedQueueDetails?.completedQueue,
      1,
      "After a successful increment, 'completedQueue' should be 1.",
    );
    assertEquals(
      updatedQueueDetails?.itemSet.includes(item1),
      false,
      "The completed item should be removed from the 'itemSet'.",
    );
  } finally {
    await client.close();
  }
});
