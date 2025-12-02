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
  // LikertSurvey - public routes
  "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  "/api/LikertSurvey/_getSurveyResponses": "responses are public",
  "/api/LikertSurvey/_getRespondentAnswers": "answers are visible",
  "/api/LikertSurvey/submitResponse": "allow anyone to submit response",
  "/api/LikertSurvey/updateResponse": "allow anyone to update their response",
  
  // UserAuth - public authentication routes
  "/api/UserAuth/signup": "anyone can sign up",
  "/api/UserAuth/login": "anyone can log in",
  
  // ItemCollection - passthrough for now (owner validation is in concept)
  "/api/ItemCollection/_getTenRandomItems": "get random items for community view",
  "/api/ItemCollection/addItem": "add item to wishlist",
  "/api/ItemCollection/addAmazonItem": "add item from amazon URL",
  "/api/ItemCollection/removeItem": "remove item from wishlist",
  "/api/ItemCollection/updateItemName": "update item name",
  "/api/ItemCollection/updateDescription": "update item description",
  "/api/ItemCollection/updatePhoto": "update item photo",
  "/api/ItemCollection/updatePrice": "update item price",
  "/api/ItemCollection/updateReason": "update reflection reason",
  "/api/ItemCollection/updateIsNeed": "update need vs want",
  "/api/ItemCollection/updateIsFutureApprove": "update future approval",
  "/api/ItemCollection/updateItem": "update full item",
  "/api/ItemCollection/setPurchased": "mark item as purchased",
  "/api/ItemCollection/getAIInsight": "get AI insight for purchase decision",
  "/api/ItemCollection/fetchAmazonDetails": "fetch item details from URL",
  "/api/ItemCollection/_getUserWishList": "get user's wishlist",
  "/api/ItemCollection/_getWishListItems": "get wishlist items",
  "/api/ItemCollection/_getItemDetails": "get item details",
  
  // QueueSystem - passthrough
  "/api/QueueSystem/_getCompletedQueue": "get completed queue",
  "/api/QueueSystem/_getTodayQueue": "get today's queue",
  "/api/QueueSystem/generateDailyQueue": "generate daily queue",
  "/api/QueueSystem/incrementCompletedQueue": "increment completed count",
  
  // SwipeSystem - passthrough
  "/api/SwipeSystem/recordSwipe": "record a swipe decision",
  "/api/SwipeSystem/updateDecision": "update swipe decision",
  "/api/SwipeSystem/_getSwipeStats": "get user swipe stats",
  "/api/SwipeSystem/_getCommunitySwipeStats": "get community stats",
  "/api/SwipeSystem/_getSwipeComments": "get swipe comments",
  
  // UserProfile - passthrough
  "/api/UserProfile/createUser": "create user profile",
  "/api/UserProfile/updateProfileName": "update profile name",
  "/api/UserProfile/updateProfilePicture": "update profile picture",
  "/api/UserProfile/updatePassword": "update password",
  "/api/UserProfile/updateInterests": "update interests",
  "/api/UserProfile/_getProfile": "get user profile",
  "/api/UserProfile/ensureFieldsOfInterestsExist": "ensure interests exist",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",
  "/api/ItemCollection/addItemFromExtension",
];
