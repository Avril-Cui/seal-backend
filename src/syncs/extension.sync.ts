/**
 * Extension sync for adding items from browser extension
 * Requires session authentication
 */

import { ItemCollection, Requesting, Sessioning } from "@concepts";
import { actions, Sync } from "@engine";

export const AddItemFromExtensionRequest: Sync = ({ request, session, user, owner, itemName, description, photo, price, reason, isNeed, isFutureApprove }) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ItemCollection/addItemFromExtension",
      session,
      owner,
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
    ItemCollection.addItemFromExtension,
    {
      owner,
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

export const AddItemFromExtensionResponse: Sync = ({ request, item }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/addItemFromExtension" }, { request }],
    [ItemCollection.addItemFromExtension, {}, { item }],
  ),
  then: actions([Requesting.respond, { request, item }]),
});

export const AddItemFromExtensionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItemCollection/addItemFromExtension" }, { request }],
    [ItemCollection.addItemFromExtension, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
