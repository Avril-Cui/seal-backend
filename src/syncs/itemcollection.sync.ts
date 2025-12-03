/**
 * ItemCollection synchronizations
 * All routes require session authentication
 *
 * NOTE: Methods starting with "_" are queries and must use frames.query() in where clause
 */

import { ItemCollection, Requesting, Sessioning, UserProfile } from "@concepts";
import { actions, Frames, Sync } from "@engine";

// ============================================
// ADD ITEM (Action)
// ============================================

export const AddItemRequest: Sync = ({
  request,
  session,
  user,
  itemName,
  description,
  photo,
  price,
  reason,
  isNeed,
  isFutureApprove,
  amazonUrl,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ItemCollection/addItem",
      session,
      itemName,
      description,
      photo,
      price,
      reason,
      isNeed,
      isFutureApprove,
      amazonUrl,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([
    ItemCollection.addItem,
    {
      owner: user,
      itemName,
      description,
      photo,
      price,
      reason,
      isNeed,
      isFutureApprove,
      amazonUrl,
    },
  ]),
});

export const AddItemResponse: Sync = ({ request, item }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/addItem" }, { request }],
    [ItemCollection.addItem, {}, { item }]
  ),
  then: actions([Requesting.respond, { request, item }]),
});

export const AddItemError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/addItem" }, { request }],
    [ItemCollection.addItem, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// ADD AMAZON ITEM (Action)
// ============================================

export const AddAmazonItemRequest: Sync = ({
  request,
  session,
  user,
  url,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/addAmazonItem", session, url },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([ItemCollection.addAmazonItem, { owner: user, url }]),
});

export const AddAmazonItemResponse: Sync = ({ request, item }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ItemCollection/addAmazonItem" },
      { request },
    ],
    [ItemCollection.addAmazonItem, {}, { item }]
  ),
  then: actions([Requesting.respond, { request, item }]),
});

export const AddAmazonItemError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ItemCollection/addAmazonItem" },
      { request },
    ],
    [ItemCollection.addAmazonItem, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// REMOVE ITEM (Action)
// ============================================

export const RemoveItemRequest: Sync = ({
  request,
  session,
  user,
  itemId,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/removeItem", session, itemId },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([ItemCollection.removeItem, { owner: user, itemId }]),
});

export const RemoveItemResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/removeItem" }, { request }],
    [ItemCollection.removeItem, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RemoveItemError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/removeItem" }, { request }],
    [ItemCollection.removeItem, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// UPDATE ITEM (Action - full update)
// ============================================

export const UpdateItemRequest: Sync = ({
  request,
  session,
  user,
  itemId,
  itemName,
  description,
  photo,
  price,
  reason,
  isNeed,
  isFutureApprove,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ItemCollection/updateItem",
      session,
      itemId,
      itemName,
      description,
      photo,
      price,
      reason,
      isNeed,
      isFutureApprove,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([
    ItemCollection.updateItem,
    {
      owner: user,
      itemId,
      itemName,
      description,
      photo,
      price,
      reason,
      isNeed,
      isFutureApprove,
    },
  ]),
});

export const UpdateItemResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/updateItem" }, { request }],
    [ItemCollection.updateItem, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdateItemError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/updateItem" }, { request }],
    [ItemCollection.updateItem, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// UPDATE ITEM NAME (Action)
// ============================================

export const UpdateItemNameRequest: Sync = ({
  request,
  session,
  user,
  itemId,
  itemName,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/updateItemName", session, itemId, itemName },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([
    ItemCollection.updateItemName,
    { owner: user, itemId, itemName },
  ]),
});

export const UpdateItemNameResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ItemCollection/updateItemName" },
      { request },
    ],
    [ItemCollection.updateItemName, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdateItemNameError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ItemCollection/updateItemName" },
      { request },
    ],
    [ItemCollection.updateItemName, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// UPDATE DESCRIPTION (Action)
// ============================================

export const UpdateDescriptionRequest: Sync = ({
  request,
  session,
  user,
  itemId,
  description,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/updateDescription", session, itemId, description },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([
    ItemCollection.updateDescription,
    { owner: user, itemId, description },
  ]),
});

export const UpdateDescriptionResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ItemCollection/updateDescription" },
      { request },
    ],
    [ItemCollection.updateDescription, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdateDescriptionError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ItemCollection/updateDescription" },
      { request },
    ],
    [ItemCollection.updateDescription, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// UPDATE PHOTO (Action)
// ============================================

export const UpdatePhotoRequest: Sync = ({
  request,
  session,
  user,
  itemId,
  photo,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/updatePhoto", session, itemId, photo },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([ItemCollection.updatePhoto, { owner: user, itemId, photo }]),
});

export const UpdatePhotoResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/updatePhoto" }, { request }],
    [ItemCollection.updatePhoto, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdatePhotoError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/updatePhoto" }, { request }],
    [ItemCollection.updatePhoto, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// UPDATE PRICE (Action)
// ============================================

export const UpdatePriceRequest: Sync = ({
  request,
  session,
  user,
  itemId,
  price,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/updatePrice", session, itemId, price },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([ItemCollection.updatePrice, { owner: user, itemId, price }]),
});

export const UpdatePriceResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/updatePrice" }, { request }],
    [ItemCollection.updatePrice, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdatePriceError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/updatePrice" }, { request }],
    [ItemCollection.updatePrice, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// UPDATE REASON (Action)
// ============================================

export const UpdateReasonRequest: Sync = ({
  request,
  session,
  user,
  itemId,
  reason,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/updateReason", session, itemId, reason },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([ItemCollection.updateReason, { owner: user, itemId, reason }]),
});

export const UpdateReasonResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/updateReason" }, { request }],
    [ItemCollection.updateReason, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdateReasonError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/updateReason" }, { request }],
    [ItemCollection.updateReason, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// UPDATE IS NEED (Action)
// ============================================

export const UpdateIsNeedRequest: Sync = ({
  request,
  session,
  user,
  itemId,
  isNeed,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/updateIsNeed", session, itemId, isNeed },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([ItemCollection.updateIsNeed, { owner: user, itemId, isNeed }]),
});

export const UpdateIsNeedResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/updateIsNeed" }, { request }],
    [ItemCollection.updateIsNeed, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdateIsNeedError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/updateIsNeed" }, { request }],
    [ItemCollection.updateIsNeed, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// UPDATE IS FUTURE APPROVE (Action)
// ============================================

export const UpdateIsFutureApproveRequest: Sync = ({
  request,
  session,
  user,
  itemId,
  isFutureApprove,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ItemCollection/updateIsFutureApprove",
      session,
      itemId,
      isFutureApprove,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([
    ItemCollection.updateIsFutureApprove,
    { owner: user, itemId, isFutureApprove },
  ]),
});

export const UpdateIsFutureApproveResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ItemCollection/updateIsFutureApprove" },
      { request },
    ],
    [ItemCollection.updateIsFutureApprove, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdateIsFutureApproveError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ItemCollection/updateIsFutureApprove" },
      { request },
    ],
    [ItemCollection.updateIsFutureApprove, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// SET PURCHASED (Action)
// ============================================

export const SetPurchasedRequest: Sync = ({
  request,
  session,
  user,
  itemId,
  purchased,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/setPurchased", session, itemId, purchased },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([
    ItemCollection.setPurchased,
    { owner: user, itemId, purchased },
  ]),
});

export const SetPurchasedResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/setPurchased" }, { request }],
    [ItemCollection.setPurchased, {}, {}]
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const SetPurchasedError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/setPurchased" }, { request }],
    [ItemCollection.setPurchased, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// GET AI INSIGHT (Action)
// ============================================

export const GetAIInsightRequest: Sync = ({
  request,
  session,
  user,
  itemId,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/getAIInsight", session, itemId },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([ItemCollection.getAIInsight, { owner: user, item: itemId }]), // Fixed: "item" not "itemId"
});

export const GetAIInsightResponse: Sync = ({
  request,
  llm_response,
  structured,
  cached,
}) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/getAIInsight" }, { request }],
    [ItemCollection.getAIInsight, {}, { llm_response, structured, cached }]
  ),
  then: actions([
    Requesting.respond,
    { request, llm_response, structured, cached },
  ]),
});

export const GetAIInsightError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/getAIInsight" }, { request }],
    [ItemCollection.getAIInsight, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// GET AI WISHLIST INSIGHT (Action)
// ============================================

export const GetAIWishListInsightRequest: Sync = ({
  request,
  session,
  user,
  context_prompt,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/getAIWishListInsight", session, context_prompt },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([
    ItemCollection.getAIWishListInsight,
    { owner: user, context_prompt },
  ]),
});

export const GetAIWishListInsightResponse: Sync = ({
  request,
  llm_response,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ItemCollection/getAIWishListInsight" },
      { request },
    ],
    [ItemCollection.getAIWishListInsight, {}, { llm_response }]
  ),
  then: actions([Requesting.respond, { request, llm_response }]),
});

export const GetAIWishListInsightError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ItemCollection/getAIWishListInsight" },
      { request },
    ],
    [ItemCollection.getAIWishListInsight, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// GET USER WISHLIST (Query - handled in where clause)
// ============================================

export const GetUserWishListRequest: Sync = ({
  request,
  session,
  user,
  item,
  items,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/_getUserWishList", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // First verify session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, authError: true });
    }
    // Then call the query - returns array of { item: ... }
    frames = await frames.query(
      ItemCollection._getUserWishList,
      { owner: user },
      { item }
    );
    if (frames.length === 0 || frames[0][item] === undefined) {
      return new Frames({ ...originalFrame, [items]: [] });
    }
    // Collect all items into a single array
    return frames.collectAs([item], items);
  },
  then: actions([Requesting.respond, { request, items }]),
});

// ============================================
// GET WISHLIST ITEMS (Query - handled in where clause)
// ============================================

export const GetWishListItemsRequest: Sync = ({
  request,
  session,
  user,
  item,
  items,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/_getWishListItems", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // First verify session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, authError: true });
    }
    // Then call the query - returns array of { item: ... }
    frames = await frames.query(
      ItemCollection._getWishListItems,
      { owner: user },
      { item }
    );
    if (frames.length === 0 || frames[0][item] === undefined) {
      // Return empty array if no items or error
      return new Frames({ ...originalFrame, [items]: [] });
    }
    // Collect all items into a single array
    return frames.collectAs([item], items);
  },
  then: actions([Requesting.respond, { request, items }]),
});

// ============================================
// GET PURCHASED ITEMS (Query - handled in where clause)
// ============================================

export const GetPurchasedItemsRequest: Sync = ({
  request,
  session,
  user,
  item,
  items,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/_getPurchasedItems", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // First verify session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, authError: true });
    }
    // Then call the query - returns array of { item: ... }
    frames = await frames.query(
      ItemCollection._getPurchasedItems,
      { owner: user },
      { item }
    );
    if (frames.length === 0 || frames[0][item] === undefined) {
      // Return empty array if no items or error
      return new Frames({ ...originalFrame, [items]: [] });
    }
    // Collect all items into a single array
    return frames.collectAs([item], items);
  },
  then: actions([Requesting.respond, { request, items }]),
});

// ============================================
// GET ITEM DETAILS (Query - handled in where clause)
// ============================================

export const GetItemDetailsRequest: Sync = ({
  request,
  session,
  user,
  itemId,
  item,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/_getItemDetails", session, itemId },
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
    frames = await frames.query(
      ItemCollection._getItemDetails,
      { owner: user, itemId },
      { item }
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, queryError: "Item not found" });
    }

    // Enrich item with owner name in the frame
    const enrichedFrames = new Frames();
    for (const frame of frames) {
      const itemData = frame[item];
      let ownerName = "User";

      // itemData IS the item directly (unwrapped by sync framework)
      if (itemData && itemData.owner) {
        try {
          const profileResult = await UserProfile._getProfile({
            user: itemData.owner,
          });
          if (
            profileResult &&
            profileResult.length > 0 &&
            !("error" in profileResult[0])
          ) {
            const result = profileResult[0] as { profile?: { name?: string } };
            ownerName = result.profile?.name || "User";
          }
        } catch (e) {
          console.error("[GetItemDetails] Error fetching profile:", e);
        }
      }

      // Add ownerName directly to the item
      const enrichedItem = {
        ...itemData,
        ownerName,
      };

      enrichedFrames.push({ ...frame, [item]: enrichedItem });
    }

    return enrichedFrames;
  },
  then: actions([Requesting.respond, { request, item }]),
});

// ============================================
// GET TEN RANDOM ITEMS WITH OWNER NAMES
// (Requires session to exclude user's own items)
// ============================================

export const GetTenRandomItemsRequest: Sync = ({
  request,
  session,
  user,
  itemIdSet,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ItemCollection/_getTenRandomItems", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // First verify session to get user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames();
    }

    const currentUser = frames[0][user];

    // Call _getTenRandomItems directly without binding
    // It returns [{ itemIdSet }] or [{ error }]
    const randomItemsResult = await ItemCollection._getTenRandomItems({
      owner: currentUser,
    });

    // Check if there was an error
    if ("error" in randomItemsResult[0]) {
      return new Frames();
    }

    const itemIds = randomItemsResult[0].itemIdSet;
    if (!itemIds || itemIds.length === 0) {
      return new Frames();
    }

    // Return just the item IDs, frontend will fetch details separately
    return new Frames({
      ...originalFrame,
      [itemIdSet]: itemIds
    });
  },
  then: actions([Requesting.respond, { request, itemIdSet }]),
});
