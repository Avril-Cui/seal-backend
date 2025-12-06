/**
 * SwipeSystem synchronizations
 * User-specific routes require session authentication
 *
 * NOTE: Methods starting with "_" are queries and must use frames.query() in where clause
 */

import { ItemCollection, Requesting, Sessioning, SwipeSystem } from "@concepts";
import { actions, Frames, Sync } from "@engine";
import { ID } from "@utils/types.ts";

// ============================================
// RECORD SWIPE (Action)
// ============================================

export const RecordSwipeRequest: Sync = ({
  request,
  session,
  user,
  itemId,
  decision,
  comment,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/SwipeSystem/recordSwipe", session, itemId, decision, comment },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  // SwipeSystem.recordSwipe expects ownerUserId, not swiper
  then: actions([
    SwipeSystem.recordSwipe,
    { ownerUserId: user, itemId, decision, comment },
  ]),
});

export const RecordSwipeResponse: Sync = ({
  request,
  itemId,
  decision,
  itemOwner,
  item,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/SwipeSystem/recordSwipe", itemId, decision },
      { request },
    ],
    [SwipeSystem.recordSwipe, {}, {}],
  ),
  where: async (frames) => {
    // Get item owner from ItemCollection to update stats
    const originalFrame = frames[0];
    const decisionValue = originalFrame[decision] as
      | "Buy"
      | "Don't Buy"
      | undefined;
    const itemIdValue = originalFrame[itemId] as ID;

    frames = await frames.query(
      ItemCollection._getItemDetails,
      { itemId: itemIdValue },
      { item },
    );

    if (frames.length === 0 || frames[0][item] === undefined) {
      // Item not found, can't update stats but still respond successfully
      return new Frames({ ...originalFrame, [itemOwner]: undefined });
    }

    const itemDoc = frames[0][item] as { owner: ID } | null;
    if (!itemDoc) {
      return new Frames({ ...originalFrame, [itemOwner]: undefined });
    }

    const ownerId = itemDoc.owner as ID;

    // Update stats for the item owner (fire and forget)
    if (ownerId && decisionValue) {
      console.log(
        `[RecordSwipeResponse] Updating stats for item owner ${ownerId} with decision ${decisionValue}`,
      );
      SwipeSystem._incrementItemOwnerStats({
        itemOwnerId: ownerId,
        decision: decisionValue,
      }).catch((err) => {
        console.error("[RecordSwipeResponse] Error updating stats:", err);
      });
    } else {
      console.log(
        `[RecordSwipeResponse] Skipping stats update - ownerId: ${ownerId}, decisionValue: ${decisionValue}`,
      );
    }

    return new Frames({ ...originalFrame, [itemOwner]: ownerId });
  },
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RecordSwipeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SwipeSystem/recordSwipe" }, { request }],
    [SwipeSystem.recordSwipe, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// UPDATE DECISION (Action)
// ============================================

export const UpdateDecisionRequest: Sync = ({
  request,
  session,
  user,
  itemId,
  newDecision,
  newComment,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/SwipeSystem/updateDecision",
      session,
      itemId,
      newDecision,
      newComment,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  // SwipeSystem.updateDecision expects ownerUserId, newDecision, newComment
  then: actions([
    SwipeSystem.updateDecision,
    { ownerUserId: user, itemId, newDecision, newComment },
  ]),
});

export const UpdateDecisionResponse: Sync = ({
  request,
  itemId,
  newDecision,
  itemOwner,
  item,
  oldDecision,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/SwipeSystem/updateDecision",
      itemId,
      newDecision,
    }, { request }],
    [SwipeSystem.updateDecision, {}, { oldDecision }],
  ),
  where: async (frames) => {
    // Get item owner to update stats
    const originalFrame = frames[0];
    const newDecisionValue = originalFrame[newDecision] as
      | "Buy"
      | "Don't Buy"
      | undefined;
    const oldDecisionValue = originalFrame[oldDecision] as
      | "Buy"
      | "Don't Buy"
      | undefined;
    const itemIdValue = originalFrame[itemId] as ID;

    // Get item owner from ItemCollection
    frames = await frames.query(
      ItemCollection._getItemDetails,
      { itemId: itemIdValue },
      { item },
    );

    if (frames.length === 0 || frames[0][item] === undefined) {
      // Item not found, can't update stats but still respond successfully
      return new Frames({
        ...originalFrame,
        [itemOwner]: undefined,
        [oldDecision]: oldDecisionValue,
      });
    }

    const itemDoc = frames[0][item] as { owner: ID } | null;
    if (!itemDoc) {
      return new Frames({
        ...originalFrame,
        [itemOwner]: undefined,
        [oldDecision]: oldDecisionValue,
      });
    }

    const ownerId = itemDoc.owner as ID;

    // Update stats for the item owner (fire and forget)
    if (ownerId && newDecisionValue) {
      SwipeSystem._updateItemOwnerStatsOnDecisionChange({
        itemOwnerId: ownerId,
        oldDecision: oldDecisionValue,
        newDecision: newDecisionValue,
      }).catch((err) => {
        console.error("[UpdateDecisionResponse] Error updating stats:", err);
      });
    }

    return new Frames({
      ...originalFrame,
      [itemOwner]: ownerId,
      [oldDecision]: oldDecisionValue,
    });
  },
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdateDecisionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SwipeSystem/updateDecision" }, { request }],
    [SwipeSystem.updateDecision, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// GET SWIPE STATS (Query - handled in where clause)
// Requires both user (ownerUserId) and itemId
// ============================================

export const GetSwipeStatsRequest: Sync = ({
  request,
  session,
  user,
  itemId,
  total,
  approval,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/SwipeSystem/_getSwipeStats", session, itemId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // First verify session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [total]: 0, [approval]: 0 });
    }

    const currentUser = frames[0][user] as ID;
    const itemIdValue = frames[0][itemId] as ID;

    // Call _getSwipeStats directly (returns array format)
    const statsResult = await SwipeSystem._getSwipeStats({
      ownerUserId: currentUser,
      itemId: itemIdValue,
    });

    if ("error" in statsResult[0]) {
      return new Frames({ ...originalFrame, [total]: 0, [approval]: 0 });
    }

    return new Frames({
      ...originalFrame,
      [total]: statsResult[0].total,
      [approval]: statsResult[0].approval,
    });
  },
  then: actions([Requesting.respond, { request, total, approval }]),
});

// ============================================
// GET USER SWIPE COUNT (Query - handled in where clause)
// Returns the total number of swipes made by the user
// ============================================

export const GetUserSwipeCountRequest: Sync = ({
  request,
  session,
  user,
  count,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/SwipeSystem/_getUserSwipeCount", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // First verify session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [count]: 0 });
    }

    const currentUser = frames[0][user] as ID;

    // Call _getUserSwipeCount directly (returns plain object, not array)
    const countResult = await SwipeSystem._getUserSwipeCount({
      userId: currentUser,
    });

    if ("error" in countResult) {
      return new Frames({ ...originalFrame, [count]: 0 });
    }

    return new Frames({
      ...originalFrame,
      [count]: countResult.count,
    });
  },
  then: actions([Requesting.respond, { request, count }]),
});

// ============================================
// GET USER SWIPE STATISTICS (Query - handled in where clause)
// Returns the number of Buy and Don't Buy swipes made by the user
// ============================================

export const GetUserSwipeStatisticsRequest: Sync = ({
  request,
  session,
  user,
  buyCount,
  dontBuyCount,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/SwipeSystem/_getUserSwipeStatistics", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // First verify session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [buyCount]: 0, [dontBuyCount]: 0 });
    }

    const currentUser = frames[0][user] as ID;

    // Call _getUserSwipeStatistics directly (returns plain object, not array)
    const statsResult = await SwipeSystem._getUserSwipeStatistics({
      userId: currentUser,
    });

    if ("error" in statsResult) {
      return new Frames({ ...originalFrame, [buyCount]: 0, [dontBuyCount]: 0 });
    }

    return new Frames({
      ...originalFrame,
      [buyCount]: statsResult.buyCount,
      [dontBuyCount]: statsResult.dontBuyCount,
    });
  },
  then: actions([Requesting.respond, { request, buyCount, dontBuyCount }]),
});

// ============================================
// GET ITEMS REJECTION RATE (Query - handled in where clause)
// Returns the percentage of "Buy" swipes across all of the user's items
// Uses efficient aggregated stats
// ============================================

export const GetItemsRejectionRateRequest: Sync = ({
  request,
  session,
  user,
  rejectionRate,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/SwipeSystem/_getItemOwnerRejectionRate", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // First verify session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [rejectionRate]: 0 });
    }

    const currentUser = frames[0][user] as ID;

    // Call _getItemOwnerRejectionRate directly (returns plain object, not array)
    const rateResult = await SwipeSystem._getItemOwnerRejectionRate({
      itemOwnerId: currentUser,
    });

    if ("error" in rateResult) {
      return new Frames({ ...originalFrame, [rejectionRate]: 0 });
    }

    return new Frames({
      ...originalFrame,
      [rejectionRate]: rateResult.rejectionRate,
    });
  },
  then: actions([Requesting.respond, { request, rejectionRate }]),
});
