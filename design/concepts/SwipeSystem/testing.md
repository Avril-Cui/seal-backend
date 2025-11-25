[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@LikertSurvey-concept-tests](/src/concepts/LikertSurvey/LikertSurveyConcept.test.ts)

# prompt: Observe how tests were structured for the sample LikertSurvey concept here ([@testing](design/concepts/LikertSurvey/testing.md) and [@LikertSurveyConcept.test](/src/concepts/LikertSurvey/LikertSurveyConcept.test.ts)) and re-generate a test suite for test-first programming that works with the Deno testing framework and covers a full trace that demonstrates how the principle of the concept is fulfilled by a sequence of actions. Ensure that no tests use or depend on ANY other concepts besides SwipeSystem itself. Do not test any behavior that requires cross-concept interaction. Minimize imports to what is needed. When performing await testDb() (do NOT use getDb()); declare the results as const variables db and client on the first line of the test case, and set const SwipeSystem = new SwipeSystemConcept(db);. Refer to previously written test cases for a similar concept as a very rough guideline.
The generated tests must:
- match the actual runtime behavior of my implementation, not an idealized or assumed version
- avoid asserting behavior my implementation does not support or handle differently
- especially adjust updateDecision tests so they reflect how my code handles the newComment field (e.g., whether omitting it preserves the old comment or clears it).
- run using the Deno testing framework
- cover a complete principle-level trace followed by isolated action-level tests
- avoid using or depending on ANY other concepts besides SwipeSystem
- not test any cross-concept interactions
- use only minimal imports
- for each test, call await testDb() (not getDb()), bind the results as const db and const client at the top of the test case, and instantiate with const swipeSystem = new SwipeSystemConcept(db);
- use my existing test file as the structure and tone template, but regenerate corrected versions that will pass given my current code
- rewrite tests so that comments, stats, and updateDecision semantics match exactly what my implementation currently outputs
The output be SwipeSystemConcept.test.ts rewritten with as few changes as needed to ensure that it reflects real behavior, ensuring all tests pass successfully.

# concept: SwipeSystem
```
concept: SwipeSystem

purpose:
    Record swipe decisions made by users about items in their queues and make aggregated community feedback available.

principle:
    (1) Each swipe represents one user's judgment on one item.
    (2) A user may decide to swipe "approve" or "disapprove" on an item once per queue. The decision is recorded.
    (3) Swipe decisions accumulate over time to produce simple, interpretable statistics for community feedback (e.g., the percentage of users who recommend buying an item).

state:
    a set of Swipes with
        an UserId String
        an ItemId String
        a decision Flag [Optional]  // user's swipe decision (i.e., worth buying or not)
        a comment String [Optional] // user's short reason or remark (e.g., "this is a great/bad product, super useful/less!")
action
    _getSwipeStats (ownerUserId: String, itemId: String): (total: Number, approval: Number)
        requires
            exists at least one swipe with matching (ownerUserId, itemId)
        effect
            let positive := number of swipes with matching (ownerUserId, itemId) and decision equals "Buy"
            let negative := number of swipes with matching (ownerUserId, itemId) and decision equals "Don't Buy"
            return total = positive + negative and approval = positive

    _getSwipeComments (ownerUserId: String, itemId: String): (comments: set of String)
        requires
            exists at least one swipe with matching (ownerUserId, itemId) and comment is not None
        effect
            return all comments under swipes that has matching (ownerUserId, itemId) and comment is not None

    recordSwipe (ownerUserId: String, itemId: String, decision: Flag, comment: String)
        requires
            no swipe exists with matching (ownerUserId, itemId)
        effect
            create a new swipe with (ownerUserId, itemId, decision, comment)

    updateDecision (ownerUserId: String, itemId: String, newDecision: Flag, newComment: String)
        requires
            swipe exists with matching (ownerUserId, itemId)
        effect
            update this swipe's decision to newDecision
            update this swipe's comment to newComment;
```

# previous SwipeSystemConcept.test.ts that led to a single error:

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import SwipeSystemConcept from "./SwipeSystemConcept.ts";

// Define test IDs for users and items
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const itemBook = "item:BookA" as ID;
const itemMovie = "item:MovieB" as ID;

Deno.test("Principle Trace: User records, updates swipe, and feedback is available per user-item", async () => {
  console.log(
    "\n--- Principle Trace: User records, updates swipe, and feedback is available per user-item ---",
  );
  const [db, client] = await testDb();
  const swipeSystem = new SwipeSystemConcept(db);

  try {
    // (1) User Alice records a "Buy" swipe for Item Book with a comment.
    console.log(
      `Step 1: Alice records 'Buy' for Book (comment: 'Great read, highly recommend!').`,
    );
    const recordAliceBookResult = await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemBook,
      decision: "Buy",
      comment: "Great read, highly recommend!",
    });
    assertNotEquals(
      "error" in recordAliceBookResult,
      true,
      "Alice's first swipe should succeed.",
    );

    // (2) User Bob records a "Don't Buy" swipe for Item Book with a comment.
    console.log(
      `Step 2: Bob records 'Don't Buy' for Book (comment: 'Not my genre, found it boring.').`,
    );
    const recordBobBookResult = await swipeSystem.recordSwipe({
      ownerUserId: userBob,
      itemId: itemBook,
      decision: "Don't Buy",
      comment: "Not my genre, found it boring.",
    });
    assertNotEquals(
      "error" in recordBobBookResult,
      true,
      "Bob's swipe should succeed.",
    );

    // (3) User Alice records a "Buy" swipe for Item Movie (no comment).
    console.log(`Step 3: Alice records 'Buy' for Movie (no comment).`);
    const recordAliceMovieResult = await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemMovie,
      decision: "Buy",
    });
    assertNotEquals(
      "error" in recordAliceMovieResult,
      true,
      "Alice's swipe for movie should succeed.",
    );

    // (4) Check _getSwipeStats for User Alice on Item Book: Expect total: 1, approval: 1.
    console.log(`Step 4: Checking Alice's swipe stats for Book...`);
    const statsAliceBook = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals(
      "error" in statsAliceBook,
      true,
      "Getting Alice's stats for Book should not fail.",
    );
    assertEquals((statsAliceBook as { total: number; approval: number }).total, 1, "Alice's total swipes for Book should be 1.");
    assertEquals((statsAliceBook as { total: number; approval: number }).approval, 1, "Alice's approval for Book should be 1 (Buy).");
    console.log(
      `  -> Alice's stats for Book: Total=${
        (statsAliceBook as { total: number; approval: number }).total
      }, Approval=${
        (statsAliceBook as { total: number; approval: number }).approval
      }. Correctly reflects 'Buy'.`,
    );

    // (5) Check _getSwipeComments for User Alice on Item Book: Expect A's comment.
    console.log(`Step 5: Checking Alice's swipe comments for Book...`);
    const commentsAliceBook = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals(
      "error" in commentsAliceBook,
      true,
      "Getting Alice's comments for Book should not fail.",
    );
    assertEquals(
      (commentsAliceBook as { comments: string[] }).comments,
      ["Great read, highly recommend!"],
      "Alice's comment for Book should match.",
    );
    console.log(
      `  -> Alice's comments for Book: ${
        (commentsAliceBook as { comments: string[] }).comments
      }. Correct.`,
    );

    // (6) Check _getSwipeStats for User Bob on Item Book: Expect total: 1, approval: 0.
    console.log(`Step 6: Checking Bob's swipe stats for Book...`);
    const statsBobBook = await swipeSystem._getSwipeStats({
      ownerUserId: userBob,
      itemId: itemBook,
    });
    assertNotEquals(
      "error" in statsBobBook,
      true,
      "Getting Bob's stats for Book should not fail.",
    );
    assertEquals((statsBobBook as { total: number; approval: number }).total, 1, "Bob's total swipes for Book should be 1.");
    assertEquals((statsBobBook as { total: number; approval: number }).approval, 0, "Bob's approval for Book should be 0 (Don't Buy).");
    console.log(
      `  -> Bob's stats for Book: Total=${
        (statsBobBook as { total: number; approval: number }).total
      }, Approval=${
        (statsBobBook as { total: number; approval: number }).approval
      }. Correctly reflects 'Don't Buy'.`,
    );

    // (7) Check _getSwipeComments for User Bob on Item Book: Expect B's comment.
    console.log(`Step 7: Checking Bob's swipe comments for Book...`);
    const commentsBobBook = await swipeSystem._getSwipeComments({
      ownerUserId: userBob,
      itemId: itemBook,
    });
    assertNotEquals(
      "error" in commentsBobBook,
      true,
      "Getting Bob's comments for Book should not fail.",
    );
    assertEquals(
      (commentsBobBook as { comments: string[] }).comments,
      ["Not my genre, found it boring."],
      "Bob's comment for Book should match.",
    );
    console.log(
      `  -> Bob's comments for Book: ${
        (commentsBobBook as { comments: string[] }).comments
      }. Correct.`,
    );

    // (8) User Alice updates their swipe for Item Book to "Don't Buy" and changes the comment.
    console.log(
      `Step 8: Alice updates swipe for Book to 'Don't Buy' and new comment 'Changed my mind, too slow.'.`,
    );
    const updateAliceBookResult = await swipeSystem.updateDecision({
      ownerUserId: userAlice,
      itemId: itemBook,
      newDecision: "Don't Buy",
      newComment: "Changed my mind, the pacing was too slow.",
    });
    assertNotEquals(
      "error" in updateAliceBookResult,
      true,
      "Alice's update for Book should succeed.",
    );

    // (9) Check _getSwipeStats for User Alice on Item Book again: Expect total: 1, approval: 0.
    console.log(`Step 9: Checking Alice's updated swipe stats for Book...`);
    const updatedStatsAliceBook = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals(
      "error" in updatedStatsAliceBook,
      true,
      "Getting Alice's updated stats for Book should not fail.",
    );
    assertEquals((updatedStatsAliceBook as { total: number; approval: number }).total, 1, "Alice's total swipes for Book should still be 1.");
    assertEquals(
      (updatedStatsAliceBook as { total: number; approval: number }).approval,
      0,
      "Alice's approval for Book should now be 0 (Don't Buy).",
    );
    console.log(
      `  -> Alice's updated stats for Book: Total=${
        (updatedStatsAliceBook as { total: number; approval: number }).total
      }, Approval=${
        (updatedStatsAliceBook as { total: number; approval: number }).approval
      }. Correctly reflects 'Don't Buy'.`,
    );

    // (10) Check _getSwipeComments for User Alice on Item Book again: Expect A's new comment.
    console.log(`Step 10: Checking Alice's updated swipe comments for Book...`);
    const updatedCommentsAliceBook = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals(
      "error" in updatedCommentsAliceBook,
      true,
      "Getting Alice's updated comments for Book should not fail.",
    );
    assertEquals(
      (updatedCommentsAliceBook as { comments: string[] }).comments,
      ["Changed my mind, the pacing was too slow."],
      "Alice's comment for Book should be updated.",
    );
    console.log(
      `  -> Alice's updated comments for Book: ${
        (updatedCommentsAliceBook as { comments: string[] }).comments
      }. Correct.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: recordSwipe - requirements and effects", async () => {
  console.log("\n--- Action: recordSwipe tests ---");
  const [db, client] = await testDb();
  const swipeSystem = new SwipeSystemConcept(db);

  try {
    // Effect: Create a new swipe
    console.log(`Test 1: Successfully recording a new swipe.`);
    const result1 = await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemBook,
      decision: "Buy",
      comment: "Good stuff.",
    });
    assertEquals(
      "error" in result1,
      false,
      "recordSwipe should succeed for a new swipe.",
    );
    const stats1 = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals("error" in stats1, true, "Stats should be retrievable.");
    assertEquals(
      (stats1 as { total: number; approval: number }).total,
      1,
      "Total should be 1 after recording.",
    );
    assertEquals(
      (stats1 as { total: number; approval: number }).approval,
      1,
      "Approval should be 1 ('Buy').",
    );
    const comments1 = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals("error" in comments1, true, "Comments should be retrievable.");
    assertEquals(
      (comments1 as { comments: string[] }).comments,
      ["Good stuff."],
      "Comment should be recorded.",
    );
    console.log(
      `  -> Swipe recorded. Stats: total=1, approval=1. Comment: 'Good stuff.'`,
    );

    // Require: no swipe exists with matching (ownerUserId, itemId)
    console.log(
      `Test 2: Failing to record a swipe if one already exists for (Alice, Book).`,
    );
    const result2 = await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemBook,
      decision: "Don't Buy",
    });
    assertEquals(
      "error" in result2,
      true,
      "recordSwipe should fail if swipe already exists.",
    );
    assertEquals(
      (result2 as { error: string }).error,
      "A swipe already exists for this user and item.",
      "Error message should indicate existing swipe.",
    );
    console.log(`  -> Failed as expected: ${result2.error}`);

    // Effect: Record without comment (optional field)
    console.log(`Test 3: Recording a swipe without a comment.`);
    const result3 = await swipeSystem.recordSwipe({
      ownerUserId: userBob,
      itemId: itemMovie,
      decision: "Buy",
    });
    assertEquals(
      "error" in result3,
      false,
      "recordSwipe should succeed without a comment.",
    );
    const comments3 = await swipeSystem._getSwipeComments({
      ownerUserId: userBob,
      itemId: itemMovie,
    });
    assertEquals(
      "error" in comments3,
      true,
      "Getting comments should fail as no comment was recorded.",
    );
    assertEquals(
      (comments3 as { error: string }).error,
      "No comments found for the given user and item.",
      "Error message should indicate no comments found.",
    );
    console.log(`  -> Swipe recorded without comment. Comments query failed as expected.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateDecision - requirements and effects", async () => {
  console.log("\n--- Action: updateDecision tests ---");
  const [db, client] = await testDb();
  const swipeSystem = new SwipeSystemConcept(db);

  try {
    // Setup: record an initial swipe for Alice and Book
    await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemBook,
      decision: "Buy",
      comment: "Original comment.",
    });
    console.log(`Setup: Alice recorded 'Buy' for Book with 'Original comment.'.`);

    // Require: swipe exists with matching (ownerUserId, itemId)
    console.log(
      `Test 1: Failing to update a swipe that does not exist for (Bob, Book).`,
    );
    const result1 = await swipeSystem.updateDecision({
      ownerUserId: userBob,
      itemId: itemBook,
      newDecision: "Don't Buy",
      newComment: "Non-existent swipe.",
    });
    assertEquals(
      "error" in result1,
      true,
      "updateDecision should fail if swipe does not exist.",
    );
    assertEquals(
      (result1 as { error: string }).error,
      "No existing swipe found for this user and item to update.",
      "Error message should indicate no existing swipe.",
    );
    console.log(`  -> Failed as expected: ${result1.error}`);

    // Effect: update decision and comment
    console.log(
      `Test 2: Successfully updating Alice's swipe for Book to 'Don't Buy' with a new comment.`,
    );
    const result2 = await swipeSystem.updateDecision({
      ownerUserId: userAlice,
      itemId: itemBook,
      newDecision: "Don't Buy",
      newComment: "Updated comment here.",
    });
    assertEquals(
      "error" in result2,
      false,
      "updateDecision should succeed for an existing swipe.",
    );
    const stats2 = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      (stats2 as { total: number; approval: number }).approval,
      0,
      "Decision should be updated to 'Don't Buy' (approval 0).",
    );
    const comments2 = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      (comments2 as { comments: string[] }).comments,
      ["Updated comment here."],
      "Comment should be updated.",
    );
    console.log(
      `  -> Swipe updated. Stats: approval=0. Comment: 'Updated comment here.'`,
    );

    // Effect: update decision only, keeping existing comment (newComment is undefined)
    console.log(
      `Test 3: Successfully updating Alice's swipe for Book to 'Buy', keeping existing comment.`,
    );
    const result3 = await swipeSystem.updateDecision({
      ownerUserId: userAlice,
      itemId: itemBook,
      newDecision: "Buy",
      // newComment is intentionally undefined, should preserve existing comment
    });
    assertEquals(
      "error" in result3,
      false,
      "updateDecision should succeed for decision update only.",
    );
    const stats3 = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      (stats3 as { total: number; approval: number }).approval,
      1,
      "Decision should be updated to 'Buy' (approval 1).",
    );
    const comments3 = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      (comments3 as { comments: string[] }).comments,
      ["Updated comment here."],
      "Comment should remain unchanged.",
    );
    console.log(
      `  -> Swipe updated decision only. Stats: approval=1. Comment: 'Updated comment here.' (preserved)`,
    );

    // Effect: update decision and remove comment (set newComment to undefined)
    console.log(
      `Test 4: Successfully updating Alice's swipe for Book to 'Don't Buy' and removing the comment.`,
    );
    const result4 = await swipeSystem.updateDecision({
      ownerUserId: userAlice,
      itemId: itemBook,
      newDecision: "Don't Buy",
      newComment: undefined, // Explicitly set to undefined to remove the comment
    });
    assertEquals(
      "error" in result4,
      false,
      "updateDecision should succeed for decision update and comment removal.",
    );
    const stats4 = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      (stats4 as { total: number; approval: number }).approval,
      0,
      "Decision should be updated to 'Don't Buy' (approval 0).",
    );
    const comments4 = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      "error" in comments4,
      true,
      "Getting comments should fail as comment was removed.",
    );
    assertEquals(
      (comments4 as { error: string }).error,
      "No comments found for the given user and item.",
      "Error message should indicate no comments found.",
    );
    console.log(
      `  -> Swipe updated decision and comment removed. Stats: approval=0. No comment.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: _getSwipeStats - requirements and effects", async () => {
  console.log("\n--- Action: _getSwipeStats tests ---");
  const [db, client] = await testDb();
  const swipeSystem = new SwipeSystemConcept(db);

  try {
    // Require: exists at least one swipe
    console.log(
      `Test 1: Failing to get stats for (Alice, Book) when no swipe exists.`,
    );
    const result1 = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      "error" in result1,
      true,
      "_getSwipeStats should fail if no swipe exists.",
    );
    assertEquals(
      (result1 as { error: string }).error,
      "No swipes found for the given user and item.",
      "Error message should indicate no swipes.",
    );
    console.log(`  -> Failed as expected: ${result1.error}`);

    // Setup: record swipes with different decisions
    await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemBook,
      decision: "Buy",
    });
    await swipeSystem.recordSwipe({
      ownerUserId: userBob,
      itemId: itemMovie,
      decision: "Don't Buy",
    });
    await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemMovie, // Alice swipes on Movie
      decision: "Don't Buy",
    });
    console.log(
      `Setup: Alice 'Buy' for Book; Bob 'Don't Buy' for Movie; Alice 'Don't Buy' for Movie.`,
    );

    // Effect: return total and approval for 'Buy' for a specific user-item pair
    console.log(`Test 2: Getting stats for Alice (Buy) on Book.`);
    const statsAliceBook = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals("error" in statsAliceBook, true);
    assertEquals((statsAliceBook as { total: number; approval: number }).total, 1);
    assertEquals((statsAliceBook as { total: number; approval: number }).approval, 1);
    console.log(
      `  -> Alice's stats for Book: Total=1, Approval=1. Correctly reflects 'Buy'.`,
    );

    // Effect: return total and approval for 'Don't Buy' for a specific user-item pair
    console.log(`Test 3: Getting stats for Bob (Don't Buy) on Movie.`);
    const statsBobMovie = await swipeSystem._getSwipeStats({
      ownerUserId: userBob,
      itemId: itemMovie,
    });
    assertNotEquals("error" in statsBobMovie, true);
    assertEquals((statsBobMovie as { total: number; approval: number }).total, 1);
    assertEquals((statsBobMovie as { total: number; approval: number }).approval, 0);
    console.log(
      `  -> Bob's stats for Movie: Total=1, Approval=0. Correctly reflects 'Don't Buy'.`,
    );

    // Test for another user-item pair, Alice on Movie
    console.log(`Test 4: Getting stats for Alice (Don't Buy) on Movie.`);
    const statsAliceMovie = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemMovie,
    });
    assertNotEquals("error" in statsAliceMovie, true);
    assertEquals((statsAliceMovie as { total: number; approval: number }).total, 1);
    assertEquals((statsAliceMovie as { total: number; approval: number }).approval, 0);
    console.log(
      `  -> Alice's stats for Movie: Total=1, Approval=0. Correctly reflects 'Don't Buy'.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: _getSwipeComments - requirements and effects", async () => {
  console.log("\n--- Action: _getSwipeComments tests ---");
  const [db, client] = await testDb();
  const swipeSystem = new SwipeSystemConcept(db);

  try {
    // Require: exists at least one swipe with matching (ownerUserId, itemId) and comment is not None
    console.log(
      `Test 1: Failing to get comments for (Alice, Book) when no swipe exists.`,
    );
    const result1 = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      "error" in result1,
      true,
      "_getSwipeComments should fail if no swipe exists.",
    );
    assertEquals(
      (result1 as { error: string }).error,
      "No comments found for the given user and item.",
      "Error message should indicate no comments.",
    );
    console.log(`  -> Failed as expected: ${result1.error}`);

    // Setup: record swipes with and without comments
    await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemBook,
      decision: "Buy",
      comment: "A book comment.",
    });
    await swipeSystem.recordSwipe({
      ownerUserId: userBob,
      itemId: itemMovie,
      decision: "Don't Buy",
    }); // No comment
    console.log(
      `Setup: Alice 'Buy' for Book (comment); Bob 'Don't Buy' for Movie (no comment).`,
    );

    // Effect: return all comments (singular here due to uniqueness constraint for user-item)
    console.log(`Test 2: Getting comments for Alice on Book.`);
    const commentsAliceBook = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals("error" in commentsAliceBook, true);
    assertEquals(
      (commentsAliceBook as { comments: string[] }).comments,
      ["A book comment."],
      "Should return Alice's comment.",
    );
    console.log(
      `  -> Alice's comments for Book: ['A book comment.']. Correct.`,
    );

    // Require: comment is not None (test for swipe without comment)
    console.log(
      `Test 3: Failing to get comments for Bob on Movie (no comment recorded).`,
    );
    const commentsBobMovie = await swipeSystem._getSwipeComments({
      ownerUserId: userBob,
      itemId: itemMovie,
    });
    assertEquals(
      "error" in commentsBobMovie,
      true,
      "_getSwipeComments should fail if swipe has no comment.",
    );
    assertEquals(
      (commentsBobMovie as { error: string }).error,
      "No comments found for the given user and item.",
      "Error message should indicate no comments.",
    );
    console.log(`  -> Failed as expected: ${commentsBobMovie.error}`);
  } finally {
    await client.close();
  }
});

```

# the error message
```
 ERRORS

Action: updateDecision - requirements and effects => ./src/concepts/SwipeSystem/SwipeSystemConcept.test.ts:345:6
error: AssertionError: Values are not equal: Comment should remain unchanged.


    [Diff] Actual / Expected


+   [
+     "Updated comment here.",
+   ]
-   undefined

  throw new AssertionError(message);
        ^
    at assertEquals (https://jsr.io/@std/assert/1.0.7/equals.ts:51:9)
    at file:///Users/lauren/Desktop/classes/6.1040/seal-backend/src/concepts/SwipeSystem/SwipeSystemConcept.test.ts:449:5

 FAILURES

Action: updateDecision - requirements and effects => ./src/concepts/SwipeSystem/SwipeSystemConcept.test.ts:345:6

FAILED | 9 passed | 1 failed (6s)

error: Test failed
```

# response:

```typescript
import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import SwipeSystemConcept from "./SwipeSystemConcept.ts";

// Define test IDs for users and items
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const itemBook = "item:BookA" as ID;
const itemMovie = "item:MovieB" as ID;

Deno.test("Principle Trace: User records, updates swipe, and feedback is available per user-item", async () => {
  console.log(
    "\n--- Principle Trace: User records, updates swipe, and feedback is available per user-item ---",
  );
  const [db, client] = await testDb();
  const swipeSystem = new SwipeSystemConcept(db);

  try {
    // (1) User Alice records a "Buy" swipe for Item Book with a comment.
    console.log(
      `Step 1: Alice records 'Buy' for Book (comment: 'Great read, highly recommend!').`,
    );
    const recordAliceBookResult = await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemBook,
      decision: "Buy",
      comment: "Great read, highly recommend!",
    });
    assertNotEquals(
      "error" in recordAliceBookResult,
      true,
      "Alice's first swipe should succeed.",
    );

    // (2) User Bob records a "Don't Buy" swipe for Item Book with a comment.
    console.log(
      `Step 2: Bob records 'Don't Buy' for Book (comment: 'Not my genre, found it boring.').`,
    );
    const recordBobBookResult = await swipeSystem.recordSwipe({
      ownerUserId: userBob,
      itemId: itemBook,
      decision: "Don't Buy",
      comment: "Not my genre, found it boring.",
    });
    assertNotEquals(
      "error" in recordBobBookResult,
      true,
      "Bob's swipe should succeed.",
    );

    // (3) User Alice records a "Buy" swipe for Item Movie (no comment).
    console.log(`Step 3: Alice records 'Buy' for Movie (no comment).`);
    const recordAliceMovieResult = await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemMovie,
      decision: "Buy",
    });
    assertNotEquals(
      "error" in recordAliceMovieResult,
      true,
      "Alice's swipe for movie should succeed.",
    );

    // (4) Check _getSwipeStats for User Alice on Item Book: Expect total: 1, approval: 1.
    console.log(`Step 4: Checking Alice's swipe stats for Book...`);
    const statsAliceBook = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals(
      "error" in statsAliceBook,
      true,
      "Getting Alice's stats for Book should not fail.",
    );
    assertEquals((statsAliceBook as { total: number; approval: number }).total, 1, "Alice's total swipes for Book should be 1.");
    assertEquals((statsAliceBook as { total: number; approval: number }).approval, 1, "Alice's approval for Book should be 1 (Buy).");
    console.log(
      `  -> Alice's stats for Book: Total=${
        (statsAliceBook as { total: number; approval: number }).total
      }, Approval=${
        (statsAliceBook as { total: number; approval: number }).approval
      }. Correctly reflects 'Buy'.`,
    );

    // (5) Check _getSwipeComments for User Alice on Item Book: Expect A's comment.
    console.log(`Step 5: Checking Alice's swipe comments for Book...`);
    const commentsAliceBook = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals(
      "error" in commentsAliceBook,
      true,
      "Getting Alice's comments for Book should not fail.",
    );
    assertEquals(
      (commentsAliceBook as { comments: string[] }).comments,
      ["Great read, highly recommend!"],
      "Alice's comment for Book should match.",
    );
    console.log(
      `  -> Alice's comments for Book: ${
        (commentsAliceBook as { comments: string[] }).comments
      }. Correct.`,
    );

    // (6) Check _getSwipeStats for User Bob on Item Book: Expect total: 1, approval: 0.
    console.log(`Step 6: Checking Bob's swipe stats for Book...`);
    const statsBobBook = await swipeSystem._getSwipeStats({
      ownerUserId: userBob,
      itemId: itemBook,
    });
    assertNotEquals(
      "error" in statsBobBook,
      true,
      "Getting Bob's stats for Book should not fail.",
    );
    assertEquals((statsBobBook as { total: number; approval: number }).total, 1, "Bob's total swipes for Book should be 1.");
    assertEquals((statsBobBook as { total: number; approval: number }).approval, 0, "Bob's approval for Book should be 0 (Don't Buy).");
    console.log(
      `  -> Bob's stats for Book: Total=${
        (statsBobBook as { total: number; approval: number }).total
      }, Approval=${
        (statsBobBook as { total: number; approval: number }).approval
      }. Correctly reflects 'Don't Buy'.`,
    );

    // (7) Check _getSwipeComments for User Bob on Item Book: Expect B's comment.
    console.log(`Step 7: Checking Bob's swipe comments for Book...`);
    const commentsBobBook = await swipeSystem._getSwipeComments({
      ownerUserId: userBob,
      itemId: itemBook,
    });
    assertNotEquals(
      "error" in commentsBobBook,
      true,
      "Getting Bob's comments for Book should not fail.",
    );
    assertEquals(
      (commentsBobBook as { comments: string[] }).comments,
      ["Not my genre, found it boring."],
      "Bob's comment for Book should match.",
    );
    console.log(
      `  -> Bob's comments for Book: ${
        (commentsBobBook as { comments: string[] }).comments
      }. Correct.`,
    );

    // (8) User Alice updates their swipe for Item Book to "Don't Buy" and changes the comment.
    console.log(
      `Step 8: Alice updates swipe for Book to 'Don't Buy' and new comment 'Changed my mind, too slow.'.`,
    );
    const updateAliceBookResult = await swipeSystem.updateDecision({
      ownerUserId: userAlice,
      itemId: itemBook,
      newDecision: "Don't Buy",
      newComment: "Changed my mind, the pacing was too slow.",
    });
    assertNotEquals(
      "error" in updateAliceBookResult,
      true,
      "Alice's update for Book should succeed.",
    );

    // (9) Check _getSwipeStats for User Alice on Item Book again: Expect total: 1, approval: 0.
    console.log(`Step 9: Checking Alice's updated swipe stats for Book...`);
    const updatedStatsAliceBook = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals(
      "error" in updatedStatsAliceBook,
      true,
      "Getting Alice's updated stats for Book should not fail.",
    );
    assertEquals((updatedStatsAliceBook as { total: number; approval: number }).total, 1, "Alice's total swipes for Book should still be 1.");
    assertEquals(
      (updatedStatsAliceBook as { total: number; approval: number }).approval,
      0,
      "Alice's approval for Book should now be 0 (Don't Buy).",
    );
    console.log(
      `  -> Alice's updated stats for Book: Total=${
        (updatedStatsAliceBook as { total: number; approval: number }).total
      }, Approval=${
        (updatedStatsAliceBook as { total: number; approval: number }).approval
      }. Correctly reflects 'Don't Buy'.`,
    );

    // (10) Check _getSwipeComments for User Alice on Item Book again: Expect A's new comment.
    console.log(`Step 10: Checking Alice's updated swipe comments for Book...`);
    const updatedCommentsAliceBook = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals(
      "error" in updatedCommentsAliceBook,
      true,
      "Getting Alice's updated comments for Book should not fail.",
    );
    assertEquals(
      (updatedCommentsAliceBook as { comments: string[] }).comments,
      ["Changed my mind, the pacing was too slow."],
      "Alice's comment for Book should be updated.",
    );
    console.log(
      `  -> Alice's updated comments for Book: ${
        (updatedCommentsAliceBook as { comments: string[] }).comments
      }. Correct.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: recordSwipe - requirements and effects", async () => {
  console.log("\n--- Action: recordSwipe tests ---");
  const [db, client] = await testDb();
  const swipeSystem = new SwipeSystemConcept(db);

  try {
    // Effect: Create a new swipe
    console.log(`Test 1: Successfully recording a new swipe.`);
    const result1 = await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemBook,
      decision: "Buy",
      comment: "Good stuff.",
    });
    assertEquals(
      "error" in result1,
      false,
      "recordSwipe should succeed for a new swipe.",
    );
    const stats1 = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals("error" in stats1, true, "Stats should be retrievable.");
    assertEquals(
      (stats1 as { total: number; approval: number }).total,
      1,
      "Total should be 1 after recording.",
    );
    assertEquals(
      (stats1 as { total: number; approval: number }).approval,
      1,
      "Approval should be 1 ('Buy').",
    );
    const comments1 = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals("error" in comments1, true, "Comments should be retrievable.");
    assertEquals(
      (comments1 as { comments: string[] }).comments,
      ["Good stuff."],
      "Comment should be recorded.",
    );
    console.log(
      `  -> Swipe recorded. Stats: total=1, approval=1. Comment: 'Good stuff.'`,
    );

    // Require: no swipe exists with matching (ownerUserId, itemId)
    console.log(
      `Test 2: Failing to record a swipe if one already exists for (Alice, Book).`,
    );
    const result2 = await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemBook,
      decision: "Don't Buy",
    });
    assertEquals(
      "error" in result2,
      true,
      "recordSwipe should fail if swipe already exists.",
    );
    assertEquals(
      (result2 as { error: string }).error,
      "A swipe already exists for this user and item.",
      "Error message should indicate existing swipe.",
    );
    console.log(`  -> Failed as expected: ${result2.error}`);

    // Effect: Record without comment (optional field)
    console.log(`Test 3: Recording a swipe without a comment.`);
    const result3 = await swipeSystem.recordSwipe({
      ownerUserId: userBob,
      itemId: itemMovie,
      decision: "Buy",
    });
    assertEquals(
      "error" in result3,
      false,
      "recordSwipe should succeed without a comment.",
    );
    const comments3 = await swipeSystem._getSwipeComments({
      ownerUserId: userBob,
      itemId: itemMovie,
    });
    assertEquals(
      "error" in comments3,
      true,
      "Getting comments should fail as no comment was recorded.",
    );
    assertEquals(
      (comments3 as { error: string }).error,
      "No comments found for the given user and item.",
      "Error message should indicate no comments found.",
    );
    console.log(`  -> Swipe recorded without comment. Comments query failed as expected.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateDecision - requirements and effects", async () => {
  console.log("\n--- Action: updateDecision tests ---");
  const [db, client] = await testDb();
  const swipeSystem = new SwipeSystemConcept(db);

  try {
    // Setup: record an initial swipe for Alice and Book
    await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemBook,
      decision: "Buy",
      comment: "Original comment.",
    });
    console.log(`Setup: Alice recorded 'Buy' for Book with 'Original comment.'.`);

    // Require: swipe exists with matching (ownerUserId, itemId)
    console.log(
      `Test 1: Failing to update a swipe that does not exist for (Bob, Book).`,
    );
    const result1 = await swipeSystem.updateDecision({
      ownerUserId: userBob,
      itemId: itemBook,
      newDecision: "Don't Buy",
      newComment: "Non-existent swipe.",
    });
    assertEquals(
      "error" in result1,
      true,
      "updateDecision should fail if swipe does not exist.",
    );
    assertEquals(
      (result1 as { error: string }).error,
      "No existing swipe found for this user and item to update.",
      "Error message should indicate no existing swipe.",
    );
    console.log(`  -> Failed as expected: ${result1.error}`);

    // Effect: update decision and comment
    console.log(
      `Test 2: Successfully updating Alice's swipe for Book to 'Don't Buy' with a new comment.`,
    );
    const result2 = await swipeSystem.updateDecision({
      ownerUserId: userAlice,
      itemId: itemBook,
      newDecision: "Don't Buy",
      newComment: "Updated comment here.",
    });
    assertEquals(
      "error" in result2,
      false,
      "updateDecision should succeed for an existing swipe.",
    );
    const stats2 = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      (stats2 as { total: number; approval: number }).approval,
      0,
      "Decision should be updated to 'Don't Buy' (approval 0).",
    );
    const comments2 = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      (comments2 as { comments: string[] }).comments,
      ["Updated comment here."],
      "Comment should be updated.",
    );
    console.log(
      `  -> Swipe updated. Stats: approval=0. Comment: 'Updated comment here.'`,
    );

    // Effect: update decision only, and remove existing comment (newComment is undefined/omitted)
    // The implementation unsets the comment field if newComment is undefined.
    console.log(
      `Test 3: Successfully updating Alice's swipe for Book to 'Buy', and removing the comment (newComment omitted).`,
    );
    const result3 = await swipeSystem.updateDecision({
      ownerUserId: userAlice,
      itemId: itemBook,
      newDecision: "Buy",
      // newComment is intentionally omitted, which makes it undefined and triggers comment removal
    });
    assertEquals(
      "error" in result3,
      false,
      "updateDecision should succeed for decision update and comment removal.",
    );
    const stats3 = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      (stats3 as { total: number; approval: number }).approval,
      1,
      "Decision should be updated to 'Buy' (approval 1).",
    );
    const comments3 = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      "error" in comments3,
      true,
      "Getting comments should fail as comment was removed.",
    );
    assertEquals(
      (comments3 as { error: string }).error,
      "No comments found for the given user and item.",
      "Error message should indicate no comments found.",
    );
    console.log(
      `  -> Swipe updated decision and comment removed. Stats: approval=1. No comment.`,
    );

    // Effect: update decision and re-add a comment (after it was previously removed)
    console.log(
      `Test 4: Successfully updating Alice's swipe for Book to 'Don't Buy' and re-adding a comment.`,
    );
    const result4 = await swipeSystem.updateDecision({
      ownerUserId: userAlice,
      itemId: itemBook,
      newDecision: "Don't Buy",
      newComment: "Re-added comment.",
    });
    assertEquals(
      "error" in result4,
      false,
      "updateDecision should succeed for decision update and comment re-addition.",
    );
    const stats4 = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      (stats4 as { total: number; approval: number }).approval,
      0,
      "Decision should be updated to 'Don't Buy' (approval 0).",
    );
    const comments4 = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      "error" in comments4,
      false,
      "Getting comments should now succeed.",
    );
    assertEquals(
      (comments4 as { comments: string[] }).comments,
      ["Re-added comment."],
      "Comment should be re-added.",
    );
    console.log(
      `  -> Swipe updated decision and comment re-added. Stats: approval=0. Comment: 'Re-added comment.'`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: _getSwipeStats - requirements and effects", async () => {
  console.log("\n--- Action: _getSwipeStats tests ---");
  const [db, client] = await testDb();
  const swipeSystem = new SwipeSystemConcept(db);

  try {
    // Require: exists at least one swipe
    console.log(
      `Test 1: Failing to get stats for (Alice, Book) when no swipe exists.`,
    );
    const result1 = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      "error" in result1,
      true,
      "_getSwipeStats should fail if no swipe exists.",
    );
    assertEquals(
      (result1 as { error: string }).error,
      "No swipes found for the given user and item.",
      "Error message should indicate no swipes.",
    );
    console.log(`  -> Failed as expected: ${result1.error}`);

    // Setup: record swipes with different decisions
    await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemBook,
      decision: "Buy",
    });
    await swipeSystem.recordSwipe({
      ownerUserId: userBob,
      itemId: itemMovie,
      decision: "Don't Buy",
    });
    await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemMovie, // Alice swipes on Movie
      decision: "Don't Buy",
    });
    console.log(
      `Setup: Alice 'Buy' for Book; Bob 'Don't Buy' for Movie; Alice 'Don't Buy' for Movie.`,
    );

    // Effect: return total and approval for 'Buy' for a specific user-item pair
    console.log(`Test 2: Getting stats for Alice (Buy) on Book.`);
    const statsAliceBook = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals("error" in statsAliceBook, true);
    assertEquals((statsAliceBook as { total: number; approval: number }).total, 1);
    assertEquals((statsAliceBook as { total: number; approval: number }).approval, 1);
    console.log(
      `  -> Alice's stats for Book: Total=1, Approval=1. Correctly reflects 'Buy'.`,
    );

    // Effect: return total and approval for 'Don't Buy' for a specific user-item pair
    console.log(`Test 3: Getting stats for Bob (Don't Buy) on Movie.`);
    const statsBobMovie = await swipeSystem._getSwipeStats({
      ownerUserId: userBob,
      itemId: itemMovie,
    });
    assertNotEquals("error" in statsBobMovie, true);
    assertEquals((statsBobMovie as { total: number; approval: number }).total, 1);
    assertEquals((statsBobMovie as { total: number; approval: number }).approval, 0);
    console.log(
      `  -> Bob's stats for Movie: Total=1, Approval=0. Correctly reflects 'Don't Buy'.`,
    );

    // Test for another user-item pair, Alice on Movie
    console.log(`Test 4: Getting stats for Alice (Don't Buy) on Movie.`);
    const statsAliceMovie = await swipeSystem._getSwipeStats({
      ownerUserId: userAlice,
      itemId: itemMovie,
    });
    assertNotEquals("error" in statsAliceMovie, true);
    assertEquals((statsAliceMovie as { total: number; approval: number }).total, 1);
    assertEquals((statsAliceMovie as { total: number; approval: number }).approval, 0);
    console.log(
      `  -> Alice's stats for Movie: Total=1, Approval=0. Correctly reflects 'Don't Buy'.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: _getSwipeComments - requirements and effects", async () => {
  console.log("\n--- Action: _getSwipeComments tests ---");
  const [db, client] = await testDb();
  const swipeSystem = new SwipeSystemConcept(db);

  try {
    // Require: exists at least one swipe with matching (ownerUserId, itemId) and comment is not None
    console.log(
      `Test 1: Failing to get comments for (Alice, Book) when no swipe exists.`,
    );
    const result1 = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertEquals(
      "error" in result1,
      true,
      "_getSwipeComments should fail if no swipe exists.",
    );
    assertEquals(
      (result1 as { error: string }).error,
      "No comments found for the given user and item.",
      "Error message should indicate no comments.",
    );
    console.log(`  -> Failed as expected: ${result1.error}`);

    // Setup: record swipes with and without comments
    await swipeSystem.recordSwipe({
      ownerUserId: userAlice,
      itemId: itemBook,
      decision: "Buy",
      comment: "A book comment.",
    });
    await swipeSystem.recordSwipe({
      ownerUserId: userBob,
      itemId: itemMovie,
      decision: "Don't Buy",
    }); // No comment
    console.log(
      `Setup: Alice 'Buy' for Book (comment); Bob 'Don't Buy' for Movie (no comment).`,
    );

    // Effect: return all comments (singular here due to uniqueness constraint for user-item)
    console.log(`Test 2: Getting comments for Alice on Book.`);
    const commentsAliceBook = await swipeSystem._getSwipeComments({
      ownerUserId: userAlice,
      itemId: itemBook,
    });
    assertNotEquals("error" in commentsAliceBook, true);
    assertEquals(
      (commentsAliceBook as { comments: string[] }).comments,
      ["A book comment."],
      "Should return Alice's comment.",
    );
    console.log(
      `  -> Alice's comments for Book: ['A book comment.']. Correct.`,
    );

    // Require: comment is not None (test for swipe without comment)
    console.log(
      `Test 3: Failing to get comments for Bob on Movie (no comment recorded).`,
    );
    const commentsBobMovie = await swipeSystem._getSwipeComments({
      ownerUserId: userBob,
      itemId: itemMovie,
    });
    assertEquals(
      "error" in commentsBobMovie,
      true,
      "_getSwipeComments should fail if swipe has no comment.",
    );
    assertEquals(
      (commentsBobMovie as { error: string }).error,
      "No comments found for the given user and item.",
      "Error message should indicate no comments.",
    );
    console.log(`  -> Failed as expected: ${commentsBobMovie.error}`);
  } finally {
    await client.close();
  }
});
```