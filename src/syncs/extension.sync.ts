/**
 * Extension sync for adding items from browser extension
 */

import { ItemCollection, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

export const AddItemFromExtensionRequest: Sync = (vars) => ({
  when: actions([
    Requesting.request,
    {
      path: "/ItemCollection/addItemFromExtension",
    },
    { request: vars.request },
  ]),
  then: actions([
    ItemCollection.addItemFromExtension,
    {
      owner: vars.owner,
      itemName: vars.title,
      description: vars.description,
      photo: vars.mainImage,
      price: vars.price,
      reason: vars.reason,
      isNeed: vars.isNeed,
      isFutureApprove: vars.isFutureApprove,
    },
  ]),
});

export const AddItemFromExtensionResponse: Sync = (vars) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ItemCollection/addItemFromExtension" },
      { request: vars.request },
    ],
    [ItemCollection.addItemFromExtension, {}, { item: vars.item }],
  ),
  then: actions([Requesting.respond, { request: vars.request, item: vars.item }]),
});
