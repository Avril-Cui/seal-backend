---
timestamp: 'Tue Nov 25 2025 14:33:58 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_143358.ee99e94f.md]]'
content_id: 8491e828593eafa90a10380722411f357964b7481d712f49b1b99d4c43503aa9
---

# API Specification: ItemCollection

**Purpose:** Tracks and manage items that users are considering for purchase.

***

## API Endpoints

### POST /api/ItemCollection/\_getTenRandomItems

**Description:** Retrieves a set of ten random item IDs owned by users other than the given owner.

**Requirements:**

* Exists at least ten items with owner not matching the given owner.

**Effects:**

* Select by random ten items with owner not matching the given owner.
* Return an itemIdSet containing the itemIds of these ten items.

**Request Body:**

```json
{
  "owner": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "itemIdSet": "array of string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemCollection/addItem

**Description:** Adds a new item to the user's wishlist, fetching its metadata and prompting for reflection questions.

**Requirements:**

* None.

**Effects:**

* Fetch item's itemName, description, photo, and price with amazonAPI.
* Generate a new unique itemId.
* Create a new item with (owner, itemId, itemName, description, photo, price, reason, isNeed, isFutureApprove, wasPurchased=False).
* Add item to the itemIdSet under the wishlist with owner matching this user.
* Return the added item.

**Request Body:**

```json
{
  "owner": "string",
  "url": "string",
  "reason": "string",
  "isNeed": "string",
  "isFutureApprove": "string"
}
```

**Success Response Body (Action):**

```json
{
  "item": {
    "owner": "string",
    "itemId": "string",
    "itemName": "string",
    "description": "string",
    "photo": "string",
    "price": "number",
    "reason": "string",
    "isNeed": "string",
    "isFutureApprove": "string",
    "wasPurchased": "boolean",
    "PurchasedTime": "number | null"
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemCollection/removeItem

**Description:** Removes a specified item from the user's wishlist.

**Requirements:**

* Exists a wishlist $w$ with this user.
* itemId exists in $w$'s itemIdSet.

**Effects:**

* Remove itemId from the itemIdSet.

**Request Body:**

```json
{
  "owner": "string",
  "itemId": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemCollection/updateItemName

**Description:** Updates the name of an item in the user's wishlist.

**Requirements:**

* Exists a wishlist $w$ with this user.
* item.itemId exists in $w$'s itemIdSet.

**Effects:**

* Update the itemName attribute of this item.

**Request Body:**

```json
{
  "owner": "string",
  "item": "string",
  "itemName": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemCollection/updateDescription

**Description:** Updates the description of an item in the user's wishlist.

**Requirements:**

* Exists a wishlist $w$ with this user.
* item.itemId exists in $w$'s itemIdSet.

**Effects:**

* Update the description attribute of this item.

**Request Body:**

```json
{
  "owner": "string",
  "item": "string",
  "description": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemCollection/updatePhoto

**Description:** Updates the photo URL of an item in the user's wishlist.

**Requirements:**

* Exists a wishlist $w$ with this user.
* item.itemId exists in $w$'s itemIdSet.

**Effects:**

* Update the photo attribute of this item.

**Request Body:**

```json
{
  "owner": "string",
  "item": "string",
  "photo": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemCollection/updatePrice

**Description:** Updates the price of an item in the user's wishlist.

**Requirements:**

* Exists a wishlist $w$ with this user.
* item.itemId exists in $w$'s itemIdSet.

**Effects:**

* Update the price attribute of this item.

**Request Body:**

```json
{
  "owner": "string",
  "item": "string",
  "Price": "number"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemCollection/updateReason

**Description:** Updates the reason for wanting an item in the user's wishlist.

**Requirements:**

* Exists a wishlist $w$ with this user.
* item.itemId exists in $w$'s itemIdSet.

**Effects:**

* Update the reason attribute of this item.

**Request Body:**

```json
{
  "owner": "string",
  "item": "string",
  "Reason": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemCollection/updateIsNeed

**Description:** Updates the "is need or want" reflection for an item in the user's wishlist.

**Requirements:**

* Exists a wishlist $w$ with this user.
* item.itemId exists in $w$'s itemIdSet.

**Effects:**

* Update the isNeed attribute of this item.

**Request Body:**

```json
{
  "owner": "string",
  "item": "string",
  "isNeed": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemCollection/updateIsFutureApprove

**Description:** Updates the "future-self approval" reflection for an item in the user's wishlist.

**Requirements:**

* Exists a wishlist $w$ with this user.
* item.itemId exists in $w$'s itemIdSet.

**Effects:**

* Update the isFutureApprove attribute of this item.

**Request Body:**

```json
{
  "owner": "string",
  "item": "string",
  "isFutureApprove": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemCollection/setPurchased

**Description:** Marks an item in the user's wishlist as purchased and records the purchase time.

**Requirements:**

* Exists a wishlist $w$ with this user.
* item $i$.itemId exists in $w$'s itemIdSet.
* $i$.wasPurchased is False.

**Effects:**

* Set $i$.wasPurchased as True.
* Set $i$.PurchasedTime as the current time of this action.

**Request Body:**

```json
{
  "owner": "string",
  "item": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ItemCollection/getAIInsight

**Description:** Requests AI-generated insights on whether an item purchase is impulsive, based on its attributes and a context prompt.

**Requirements:**

* Exists a wishlist $w$ with this user.
* item.itemId exists in $w$'s itemIdSet.

**Effects:**

* Send context\_prompt with the item to geminiLLM (including all the attributes under item, like description, price, reason, isNeed, isFutureApprove) and ask for insights on whether geminiLLM thinks this purchase is impulsive.
* Return the llm\_response.

**Request Body:**

```json
{
  "owner": "string",
  "item": "string",
  "context_prompt": "string"
}
```

**Success Response Body (Action):**

```json
{
  "llm_response": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
