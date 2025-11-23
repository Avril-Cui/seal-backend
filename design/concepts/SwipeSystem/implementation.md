[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

# implement: SwipeSystem

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

# file: src/SwipeSystem/SwipeSystemConcept.ts

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "SwipeSystem" + ".";

// Generic types of this concept
type UserId = ID;
type ItemId = ID;
type Flag = "Buy" | "Don't Buy";

/**
 * a set of Swipes with
 *   an UserId String
 *   an ItemId String
 *   a decision Flag [Optional]
 *   a comment String [Optional]
 */
interface Swipe {
  _id: ID; // Unique ID for this specific swipe record
  userId: UserId;
  itemId: ItemId;
  decision?: Flag; // User's swipe decision
  comment?: string; // User's short reason or remark
}

/**
 * concept: SwipeSystem
 *
 * purpose:
 *     Record swipe decisions made by users about items in their queues and make aggregated community feedback available.
 */
export default class SwipeSystemConcept {
  private swipes: Collection<Swipe>;

  constructor(private readonly db: Db) {
    this.swipes = this.db.collection(PREFIX + "swipes");
  }

  /**
   * _getSwipeStats (ownerUserId: String, itemId: String): (total: Number, approval: Number)
   *
   * **requires**
   *     exists at least one swipe with matching (ownerUserId, itemId)
   *
   * **effect**
   *     let positive := number of swipes with matching (ownerUserId, itemId) and decision equals "Buy"
   *     let negative := number of swipes with matching (ownerUserId, itemId) and decision equals "Don't Buy"
   *     return total = positive + negative and approval = positive
   */
  async _getSwipeStats(
    { ownerUserId, itemId }: { ownerUserId: UserId; itemId: ItemId },
  ): Promise<{ total: number; approval: number } | { error: string }> {
    const allSwipes = await this.swipes.find({ userId: ownerUserId, itemId: itemId }).toArray();

    if (allSwipes.length === 0) {
      return { error: "No swipes found for the given user and item." };
    }

    const positive = allSwipes.filter((swipe) => swipe.decision === "Buy").length;
    const negative = allSwipes.filter((swipe) => swipe.decision === "Don't Buy").length;

    return { total: positive + negative, approval: positive };
  }

  /**
   * _getSwipeComments (ownerUserId: String, itemId: String): (comments: set of String)
   *
   * **requires**
   *     exists at least one swipe with matching (ownerUserId, itemId) and comment is not None
   *
   * **effect**
   *     return all comments under swipes that has matching (ownerUserId, itemId) and comment is not None
   */
  async _getSwipeComments(
    { ownerUserId, itemId }: { ownerUserId: UserId; itemId: ItemId },
  ): Promise<{ comments: string[] } | { error: string }> {
    const comments = await this.swipes.find(
      { userId: ownerUserId, itemId: itemId, comment: { $ne: undefined } },
      { projection: { comment: 1, _id: 0 } }, // Only retrieve the comment field
    ).toArray();

    const actualComments = comments.map((swipe) => swipe.comment!).filter((
      c,
    ) => c !== undefined);

    if (actualComments.length === 0) {
      return { error: "No comments found for the given user and item." };
    }

    return { comments: actualComments };
  }

  /**
   * recordSwipe (ownerUserId: String, itemId: String, decision: Flag, comment: String)
   *
   * **requires**
   *     no swipe exists with matching (ownerUserId, itemId)
   *
   * **effect**
   *     create a new swipe with (ownerUserId, itemId, decision, comment)
   */
  async recordSwipe(
    { ownerUserId, itemId, decision, comment }: {
      ownerUserId: UserId;
      itemId: ItemId;
      decision: Flag;
      comment?: string;
    },
  ): Promise<Empty | { error: string }> {
    const existingSwipe = await this.swipes.findOne({ userId: ownerUserId, itemId: itemId });
    if (existingSwipe) {
      return { error: "A swipe already exists for this user and item." };
    }

    const newSwipe: Swipe = {
      _id: freshID(),
      userId: ownerUserId,
      itemId: itemId,
      decision: decision,
      ...(comment && { comment: comment }), // Conditionally add comment if provided
    };

    await this.swipes.insertOne(newSwipe);
    return {};
  }

  /**
   * updateDecision (ownerUserId: String, itemId: String, newDecision: Flag, newComment: String)
   *
   * **requires**
   *     swipe exists with matching (ownerUserId, itemId)
   *
   * **effect**
   *     update this swipe's decision to newDecision
   *     update this swipe's comment to newComment;
   */
  async updateDecision(
    { ownerUserId, itemId, newDecision, newComment }: {
      ownerUserId: UserId;
      itemId: ItemId;
      newDecision: Flag;
      newComment?: string;
    },
  ): Promise<Empty | { error: string }> {
    const filter = { userId: ownerUserId, itemId: itemId };
    const updateDocument: Partial<Swipe> = {
      decision: newDecision,
      ...(newComment !== undefined && { comment: newComment }), // Update comment if provided, including setting to undefined
      ...(newComment === undefined && { $unset: { comment: "" } }), // Unset comment if explicitly undefined
    };

    // MongoDB update operations typically use $set
    const result = await this.swipes.updateOne(
      filter,
      { $set: { ...updateDocument.decision && { decision: updateDocument.decision }, ...updateDocument.comment !== undefined && { comment: updateDocument.comment } }, ...updateDocument.$unset && { $unset: updateDocument.$unset } },
      // Note: the above combines $set and $unset potentially.
      // A cleaner way to handle optional updates and unsets:
      // let updateOperation: { $set?: Partial<Swipe>, $unset?: { comment: "" } } = { $set: {} };
      // if (newDecision !== undefined) updateOperation.$set!.decision = newDecision;
      // if (newComment !== undefined) updateOperation.$set!.comment = newComment;
      // else updateOperation.$unset = { comment: "" };
      // await this.swipes.updateOne(filter, updateOperation);
    );

    // Re-writing the update part to handle optional newComment more cleanly:
    const updatePayload: { $set: Partial<Swipe>; $unset?: { comment: "" } } = { $set: { decision: newDecision } };
    if (newComment !== undefined) {
      updatePayload.$set.comment = newComment;
    } else {
      updatePayload.$unset = { comment: "" }; // If newComment is explicitly undefined, unset the field
    }
    const updateResult = await this.swipes.updateOne(filter, updatePayload);


    if (updateResult.matchedCount === 0) {
      return { error: "No existing swipe found for this user and item to update." };
    }

    return {};
  }
}
```