/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // ============================================
  // UserAuth - Handled via syncs (to create sessions)
  // ============================================

  // ============================================
  // Sessioning - No public routes (all handled via syncs or internal)
  // ============================================

  // ============================================
  // LikertSurvey - Public survey access
  // ============================================
  "/api/LikertSurvey/_getSurveyQuestions": "public - view survey questions",
  "/api/LikertSurvey/_getSurveyResponses": "public - view aggregated responses",
  "/api/LikertSurvey/_getRespondentAnswers": "public - view individual answers",
  "/api/LikertSurvey/submitResponse":
    "public - anyone can submit survey response",
  "/api/LikertSurvey/updateResponse":
    "public - anyone can update their response",

  // ============================================
  // ItemCollection - Public community view only
  // ============================================
  // Note: _getTenRandomItems is excluded to add owner names via sync
  "/api/ItemCollection/fetchAmazonDetails":
    "public - just fetches product info, no auth needed",

  // ============================================
  // SwipeSystem - Public aggregate stats only
  // ============================================
  "/api/SwipeSystem/_getCommunitySwipeStats":
    "public - aggregate community statistics",
  "/api/SwipeSystem/_getSwipeComments": "public - view comments on items",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * These routes require authentication via syncs.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // ============================================
  // UserAuth - Handled via syncs to create sessions
  // ============================================
  "/api/UserAuth/signup",
  "/api/UserAuth/login",

  // ============================================
  // Sessioning - Auth required
  // ============================================
  "/api/Sessioning/create", // Only called by login/signup sync
  "/api/Sessioning/delete", // Logout - requires valid session
  "/api/Sessioning/_getUser", // Internal use only

  // ============================================
  // ItemCollection - Enriched via syncs
  // ============================================
  "/api/ItemCollection/_getTenRandomItems", // Enriched with owner names via sync

  // ============================================
  // LikertSurvey - Admin only
  // ============================================
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",

  // ============================================
  // ItemCollection - All user-specific actions
  // ============================================
  "/api/ItemCollection/addItem",
  "/api/ItemCollection/addAmazonItem",
  "/api/ItemCollection/addItemFromExtension",
  "/api/ItemCollection/removeItem",
  "/api/ItemCollection/updateItemName",
  "/api/ItemCollection/updateDescription",
  "/api/ItemCollection/updatePhoto",
  "/api/ItemCollection/updatePrice",
  "/api/ItemCollection/updateReason",
  "/api/ItemCollection/updateIsNeed",
  "/api/ItemCollection/updateIsFutureApprove",
  "/api/ItemCollection/updateItem",
  "/api/ItemCollection/setPurchased",
  "/api/ItemCollection/getAIInsight",
  "/api/ItemCollection/getAIWishListInsight",
  "/api/ItemCollection/_getUserWishList",
  "/api/ItemCollection/_getWishListItems",
  "/api/ItemCollection/_getPurchasedItems",
  "/api/ItemCollection/_getItemDetails",
  "/api/ItemCollection/_getPurchasedItems",
  // Internal/private methods
  "/api/ItemCollection/_updateItemAttribute",
  "/api/ItemCollection/generateInputHash",
  "/api/ItemCollection/generateWishlistHash", // Private helper method
  "/api/ItemCollection/buildInsightPrompt", // Private helper method

  // ============================================
  // QueueSystem - All user-specific actions
  // ============================================
  "/api/QueueSystem/_getCompletedQueue",
  "/api/QueueSystem/_getTodayQueue",
  "/api/QueueSystem/generateDailyQueue",
  "/api/QueueSystem/incrementCompletedQueue",

  // ============================================
  // SwipeSystem - User-specific actions
  // ============================================
  "/api/SwipeSystem/recordSwipe",
  "/api/SwipeSystem/updateDecision",
  "/api/SwipeSystem/_getSwipeStats",
  "/api/SwipeSystem/_getUserSwipeCount",
  "/api/SwipeSystem/_getUserSwipeStatistics",

  // ============================================
  // UserProfile - All user-specific actions
  // ============================================
  "/api/UserProfile/createUser",
  "/api/UserProfile/updateProfileName",
  "/api/UserProfile/updateProfilePicture",
  "/api/UserProfile/updatePassword",
  "/api/UserProfile/updateInterests",
  "/api/UserProfile/_getProfile",
  "/api/UserProfile/ensureFieldsOfInterestsExist",
];
