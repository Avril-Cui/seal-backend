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
 * Aggregated statistics for items owned by a user
 * Tracks total "Buy" swipes and total swipes received on all items owned by this user
 */
interface ItemOwnerStats {
  _id: UserId; // The item owner's user ID
  totalBuySwipes: number; // Total "Buy" swipes received on all items owned by this user
  totalSwipes: number; // Total swipes received on all items owned by this user
}

/**
 * concept: SwipeSystem
 *
 * purpose:
 *     Record swipe decisions made by users about items in their queues and make aggregated community feedback available.
 */
export default class SwipeSystemConcept {
  private swipes: Collection<Swipe>;
  private itemOwnerStats: Collection<ItemOwnerStats>;

  constructor(private readonly db: Db) {
    this.swipes = this.db.collection(PREFIX + "swipes");
    this.itemOwnerStats = this.db.collection(PREFIX + "itemOwnerStats");
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
    const existingSwipe = await this.swipes.findOne({
      userId: ownerUserId,
      itemId: itemId,
    });
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
   *     return the old decision (if any) for stats tracking
   */
  async updateDecision(
    { ownerUserId, itemId, newDecision, newComment }: {
      ownerUserId: UserId;
      itemId: ItemId;
      newDecision: Flag;
      newComment?: string;
    },
  ): Promise<Empty | { error: string } | { oldDecision?: Flag }> {
    const filter = { userId: ownerUserId, itemId: itemId };

    // Get the old swipe to retrieve the old decision
    const oldSwipe = await this.swipes.findOne(filter);
    if (!oldSwipe) {
      return {
        error: "No existing swipe found for this user and item to update.",
      };
    }

    const oldDecision = oldSwipe.decision;

    const updatePayload: { $set: Partial<Swipe>; $unset?: { comment: "" } } = {
      $set: { decision: newDecision },
    };
    if (newComment !== undefined) {
      updatePayload.$set.comment = newComment;
    } else {
      updatePayload.$unset = { comment: "" }; // If newComment is explicitly undefined, unset the field
    }
    await this.swipes.updateOne(filter, updatePayload);

    return { oldDecision };
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
  ): Promise<[{ total: number; approval: number }] | [{ error: string }]> {
    const allSwipes = await this.swipes.find({
      userId: ownerUserId,
      itemId: itemId,
    }).toArray();

    if (allSwipes.length === 0) {
      return [{ error: "No swipes found for the given user and item." }];
    }

    const positive =
      allSwipes.filter((swipe) => swipe.decision === "Buy").length;
    const negative =
      allSwipes.filter((swipe) => swipe.decision === "Don't Buy").length;

    return [{ total: positive + negative, approval: positive }];
  }

  /**
   * _getCommunitySwipeStats (itemId: String, excludeUserId: String): (total: Number, approval: Number)
   *
   * **effect**
   *     get all swipes for this itemId from users other than excludeUserId;
   *     let positive := number of swipes with matching itemId (excluding excludeUserId) and decision equals "Buy"
   *     let negative := number of swipes with matching itemId (excluding excludeUserId) and decision equals "Don't Buy"
   *     return total = positive + negative and approval = positive
   */
  async _getCommunitySwipeStats(
    { itemId, excludeUserId }: { itemId: ItemId; excludeUserId?: UserId },
  ): Promise<[{ total: number; approval: number }] | [{ error: string }]> {
    const query: { itemId: ItemId; userId?: { $ne: UserId } } = { itemId };

    // Exclude the item owner's swipes if specified
    if (excludeUserId) {
      query.userId = { $ne: excludeUserId };
    }

    const allSwipes = await this.swipes.find(query).toArray();

    if (allSwipes.length === 0) {
      return [{ error: "No community swipes found for this item." }];
    }

    const positive =
      allSwipes.filter((swipe) => swipe.decision === "Buy").length;
    const negative =
      allSwipes.filter((swipe) => swipe.decision === "Don't Buy").length;

    return [{ total: positive + negative, approval: positive }];
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
  ): Promise<[{ comments: string[] }] | [{ error: string }]> {
    const comments = await this.swipes.find(
      { userId: ownerUserId, itemId: itemId, comment: { $ne: undefined } },
      { projection: { comment: 1, _id: 0 } }, // Only retrieve the comment field
    ).toArray();

    const actualComments = comments.map((swipe) => swipe.comment!).filter((
      c,
    ) => c !== undefined);

    if (actualComments.length === 0) {
      return [{ error: "No comments found for the given user and item." }];
    }

    return [{ comments: actualComments }];
  }

  /**
   * _getUserSwipeCount (userId: String): (count: Number)
   *
   * **effect**
   *     return the number of swipes made by this user
   */
  async _getUserSwipeCount(
    { userId }: { userId: UserId },
  ): Promise<{ count: number } | { error: string }> {
    const count = await this.swipes.countDocuments({ userId });
    return { count };
  }

  /**
   * _getUserSwipeStatistics (userId: String): (buyCount: Number, dontBuyCount: Number)
   *
   * **effect**
   *     return the number of "Buy" and "Don't Buy" swipes made by this user
   */
  async _getUserSwipeStatistics(
    { userId }: { userId: UserId },
  ): Promise<{ buyCount: number; dontBuyCount: number } | { error: string }> {
    const allSwipes = await this.swipes.find({ userId }).toArray();

    if (allSwipes.length === 0) {
      return { buyCount: 0, dontBuyCount: 0 };
    }

    const buyCount =
      allSwipes.filter((swipe) => swipe.decision === "Buy").length;
    const dontBuyCount =
      allSwipes.filter((swipe) => swipe.decision === "Don't Buy").length;

    return { buyCount, dontBuyCount };
  }

  /**
   * _incrementItemOwnerStats (itemOwnerId: UserId, decision: Flag): Empty
   *
   * **effect**
   *     increment the aggregated stats for the item owner based on the swipe decision
   *     creates stats document if it doesn't exist
   */
  async _incrementItemOwnerStats(
    { itemOwnerId, decision }: { itemOwnerId: UserId; decision: Flag },
  ): Promise<Empty> {
    await this.itemOwnerStats.updateOne(
      { _id: itemOwnerId },
      {
        $inc: {
          totalSwipes: 1,
          totalBuySwipes: decision === "Buy" ? 1 : 0,
        },
      },
      { upsert: true },
    );
    return {};
  }

  /**
   * _updateItemOwnerStatsOnDecisionChange (itemOwnerId: UserId, oldDecision: Flag | undefined, newDecision: Flag): Empty
   *
   * **effect**
   *     update the aggregated stats when a swipe decision changes
   *     decrements old decision count and increments new decision count
   */
  async _updateItemOwnerStatsOnDecisionChange(
    { itemOwnerId, oldDecision, newDecision }: {
      itemOwnerId: UserId;
      oldDecision: Flag | undefined;
      newDecision: Flag;
    },
  ): Promise<Empty> {
    // If oldDecision exists, we need to decrement it and increment newDecision
    // If oldDecision doesn't exist, we just increment newDecision (this is a new decision on an existing swipe)
    const update: { $inc: { totalBuySwipes: number } } = {
      $inc: {
        totalBuySwipes: 0,
      },
    };

    if (oldDecision === "Buy" && newDecision === "Don't Buy") {
      // Was Buy, now Don't Buy: decrement buy count
      update.$inc.totalBuySwipes = -1;
    } else if (oldDecision === "Don't Buy" && newDecision === "Buy") {
      // Was Don't Buy, now Buy: increment buy count
      update.$inc.totalBuySwipes = 1;
    } else if (oldDecision === undefined && newDecision === "Buy") {
      // No previous decision, now Buy: increment buy count
      update.$inc.totalBuySwipes = 1;
    } else if (oldDecision === undefined && newDecision === "Don't Buy") {
      // No previous decision, now Don't Buy: no change to buy count
      update.$inc.totalBuySwipes = 0;
    }
    // If oldDecision === newDecision, no change needed (but we still ensure stats exist)

    await this.itemOwnerStats.updateOne(
      { _id: itemOwnerId },
      update,
      { upsert: true },
    );
    return {};
  }

  /**
   * _getItemOwnerRejectionRate (itemOwnerId: UserId): (rejectionRate: Number)
   *
   * **effect**
   *     get aggregated stats for items owned by this user
   *     return rejectionRate = Math.round((totalBuySwipes / totalSwipes) * 100) if totalSwipes > 0, else 0
   *     Note: This is actually an acceptance rate (percentage of "Buy" swipes), but named rejectionRate per user request
   */
  async _getItemOwnerRejectionRate(
    { itemOwnerId }: { itemOwnerId: UserId },
  ): Promise<{ rejectionRate: number } | { error: string }> {
    const stats = await this.itemOwnerStats.findOne({ _id: itemOwnerId });

    if (!stats || stats.totalSwipes === 0) {
      return { rejectionRate: 0 };
    }

    const rejectionRate = Math.round(
      (stats.totalBuySwipes / stats.totalSwipes) * 100,
    );

    return { rejectionRate };
  }
}
