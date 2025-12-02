/**
 * QueueSystem synchronizations
 * All routes require session authentication
 * 
 * NOTE: Methods starting with "_" are queries and must use frames.query() in where clause
 */

import { QueueSystem, Requesting, Sessioning } from "@concepts";
import { actions, Frames, Sync } from "@engine";

// ============================================
// GET TODAY'S QUEUE (Query - handled in where clause)
// ============================================

export const GetTodayQueueRequest: Sync = ({ request, session, user, itemIdSet, completedQueue }) => ({
  when: actions([
    Requesting.request,
    { path: "/QueueSystem/_getTodayQueue", session },
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
    frames = await frames.query(QueueSystem._getTodayQueue, { owner: user }, { itemIdSet, completedQueue });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, queryError: "No queue found for today" });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, itemIdSet, completedQueue }]),
});

export const GetTodayQueueAuthError: Sync = ({ request, session }) => ({
  when: actions([
    Requesting.request,
    { path: "/QueueSystem/_getTodayQueue", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, {});
    if (frames.length === 0) {
      return new Frames({ ...originalFrame });
    }
    return new Frames(); // Auth succeeded, don't fire error
  },
  then: actions([Requesting.respond, { request, error: "Invalid or expired session" }]),
});

// ============================================
// GET COMPLETED QUEUE (Query - handled in where clause)
// ============================================

export const GetCompletedQueueRequest: Sync = ({ request, session, user, completedQueue }) => ({
  when: actions([
    Requesting.request,
    { path: "/QueueSystem/_getCompletedQueue", session },
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
    frames = await frames.query(QueueSystem._getCompletedQueue, { owner: user }, { completedQueue });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, queryError: "No queue found for today" });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, completedQueue }]),
});

export const GetCompletedQueueAuthError: Sync = ({ request, session }) => ({
  when: actions([
    Requesting.request,
    { path: "/QueueSystem/_getCompletedQueue", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, {});
    if (frames.length === 0) {
      return new Frames({ ...originalFrame });
    }
    return new Frames(); // Auth succeeded, don't fire error
  },
  then: actions([Requesting.respond, { request, error: "Invalid or expired session" }]),
});

// ============================================
// GENERATE DAILY QUEUE (Action)
// ============================================

export const GenerateDailyQueueRequest: Sync = ({ request, session, user, itemIds }) => ({
  when: actions([
    Requesting.request,
    { path: "/QueueSystem/generateDailyQueue", session, itemIds },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([QueueSystem.generateDailyQueue, { owner: user, itemIds }]),
});

export const GenerateDailyQueueResponse: Sync = ({ request, queue }) => ({
  when: actions(
    [Requesting.request, { path: "/QueueSystem/generateDailyQueue" }, { request }],
    [QueueSystem.generateDailyQueue, {}, { queue }],
  ),
  then: actions([Requesting.respond, { request, queue }]),
});

export const GenerateDailyQueueError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/QueueSystem/generateDailyQueue" }, { request }],
    [QueueSystem.generateDailyQueue, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// INCREMENT COMPLETED QUEUE (Action)
// ============================================

export const IncrementCompletedQueueRequest: Sync = ({ request, session, user, itemId }) => ({
  when: actions([
    Requesting.request,
    { path: "/QueueSystem/incrementCompletedQueue", session, itemId },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([QueueSystem.incrementCompletedQueue, { owner: user, itemId }]),
});

export const IncrementCompletedQueueResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/QueueSystem/incrementCompletedQueue" }, { request }],
    [QueueSystem.incrementCompletedQueue, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const IncrementCompletedQueueError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/QueueSystem/incrementCompletedQueue" }, { request }],
    [QueueSystem.incrementCompletedQueue, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
