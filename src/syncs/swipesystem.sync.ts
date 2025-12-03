/**
 * SwipeSystem synchronizations
 * User-specific routes require session authentication
 *
 * NOTE: Methods starting with "_" are queries and must use frames.query() in where clause
 */

import { Requesting, Sessioning, SwipeSystem } from "@concepts";
import { actions, Frames, Sync } from "@engine";

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

export const RecordSwipeResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SwipeSystem/recordSwipe" }, { request }],
    [SwipeSystem.recordSwipe, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RecordSwipeError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SwipeSystem/recordSwipe" }, { request }],
    [SwipeSystem.recordSwipe, {}, { error }]
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

export const UpdateDecisionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/SwipeSystem/updateDecision" }, { request }],
    [SwipeSystem.updateDecision, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdateDecisionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/SwipeSystem/updateDecision" }, { request }],
    [SwipeSystem.updateDecision, {}, { error }]
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
      return new Frames({ ...originalFrame, authError: true });
    }
    // Then call the query (_getSwipeStats expects ownerUserId and itemId)
    const statsFrames = await frames.query(
      SwipeSystem._getSwipeStats,
      { ownerUserId: user, itemId },
      { total, approval }
    );
    // Check if query returned an error (no swipes exist)
    if (statsFrames.length > 0 && statsFrames[0].error) {
      // No swipe stats found, return zero values
      return new Frames({ ...originalFrame, total: 0, approval: 0 });
    }
    // Merge originalFrame with statsFrames to preserve request binding
    return statsFrames.map((frame) => ({ ...originalFrame, ...frame }));
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
      return new Frames({ ...originalFrame, authError: true });
    }
    // Then call the query
    const countFrames = await frames.query(
      SwipeSystem._getUserSwipeCount,
      { userId: user },
      { count }
    );
    return countFrames.map((frame) => ({ ...originalFrame, ...frame }));
  },
  then: actions([Requesting.respond, { request, count }]),
});
