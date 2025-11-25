[@concept-specifications](../background/concept-specifications.md)

# Concept API extraction

You are an expert software architect tasked with generating clear, developer-friendly API documentation. Your input is a formal "Concept Specification" which describes a modular piece of software functionality. This concept has been implemented and exposed as a REST-like API by a "Concept Server."

Your mission is to translate the provided Concept Specification into a structured API specification document written in Markdown. This document will be used by frontend developers to interact with the API.

Adhere to the following rules for the API structure and the documentation format:

**API Structure Rules:**

1.  **Base URL:** Assume a base URL of `/api`.
2.  **Endpoint Naming:** Each concept action or query maps to an endpoint. The URL structure is: `/{conceptName}/{actionOrQueryName}`.
    *   For a concept named `Labeling` and an action `createLabel`, the endpoint is `/api/Labeling/createLabel`.
3.  **HTTP Method:** All endpoints use the `POST` method.
4.  **Data Format:** All requests and responses use the `application/json` content type.
5.  **Request Body:** The request body is always a single JSON object. The keys of this object correspond to the input arguments defined in the action's signature.
6.  **Response Body:**
    *   **Actions:** A successful call to an action returns a single JSON object. The keys correspond to the results defined in the action's signature. If there are no results, an empty object `{}` is returned.
    *   **Queries:** A successful call to a query (a method name starting with `_`) returns a JSON **array** of objects.
    *   **Errors:** If an action fails to meet its `requires` condition or encounters another error, it returns a single JSON object with a single key: `{ "error": "A descriptive error message." }`.

**Documentation Format Rules:**

Generate the output in Markdown using the following template. For each action and query in the specification, create a dedicated endpoint section.

~~~markdown
# API Specification: {Concept Name}

**Purpose:** {The concept's purpose.}

---

## API Endpoints

### POST /api/{conceptName}/{actionName}

**Description:** {A brief, one-sentence description of what this action does.}

**Requirements:**
- {List each point from the 'requires' section of the specification.}

**Effects:**
- {List each point from the 'effects' section of the specification.}

**Request Body:**
```json
{
  "argument1": "{type}",
  "argument2": "{type}"
}
```

**Success Response Body (Action):**
```json
{
  "result1": "{type}",
  "result2": "{type}"
}
```

**Success Response Body (Query):**
```json
[
  {
    "result1": "{type}",
    "result2": "{type}"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
*(Repeat for each action and query)*
~~~

# prompt:

Now, analyze the following Concept Specification and generate the API documentation based on these instructions. Your API documentation should be generated to based exactly on how I defined my concepts:

[@ItemCollection](../concepts/ItemCollection/ItemCollection.md)
# response:

# response:

# API Specification: 

**Purpose:** Tracks and manage items that users are considering for purchase.

---

## API Endpoints

# response:

# API Specification: ItemCollection

**Purpose:** Tracks and manage items that users are considering for purchase.

---

## API Endpoints

### POST /api/ItemCollection/_getTenRandomItems

**Description:** Retrieves a set of ten random item IDs owned by users other than the given owner.

**Requirements:**
- Exists at least ten items with owner not matching the given owner.

**Effects:**
- Select by random ten items with owner not matching the given owner.
- Return an itemIdSet containing the itemIds of these ten items.

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

---

### POST /api/ItemCollection/addItem

**Description:** Adds a new item to the user's wishlist, fetching its metadata and prompting for reflection questions.

**Requirements:**
- None.

**Effects:**
- Fetch item's itemName, description, photo, and price with amazonAPI.
- Generate a new unique itemId.
- Create a new item with (owner, itemId, itemName, description, photo, price, reason, isNeed, isFutureApprove, wasPurchased=False).
- Add item to the itemIdSet under the wishlist with owner matching this user.
- Return the added item.

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

---

### POST /api/ItemCollection/removeItem

**Description:** Removes a specified item from the user's wishlist.

**Requirements:**
- Exists a wishlist $w$ with this user.
- itemId exists in $w$'s itemIdSet.

**Effects:**
- Remove itemId from the itemIdSet.

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

---

### POST /api/ItemCollection/updateItemName

**Description:** Updates the name of an item in the user's wishlist.

**Requirements:**
- Exists a wishlist $w$ with this user.
- item.itemId exists in $w$'s itemIdSet.

**Effects:**
- Update the itemName attribute of this item.

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

---

### POST /api/ItemCollection/updateDescription

**Description:** Updates the description of an item in the user's wishlist.

**Requirements:**
- Exists a wishlist $w$ with this user.
- item.itemId exists in $w$'s itemIdSet.

**Effects:**
- Update the description attribute of this item.

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

---

### POST /api/ItemCollection/updatePhoto

**Description:** Updates the photo URL of an item in the user's wishlist.

**Requirements:**
- Exists a wishlist $w$ with this user.
- item.itemId exists in $w$'s itemIdSet.

**Effects:**
- Update the photo attribute of this item.

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

---

### POST /api/ItemCollection/updatePrice

**Description:** Updates the price of an item in the user's wishlist.

**Requirements:**
- Exists a wishlist $w$ with this user.
- item.itemId exists in $w$'s itemIdSet.

**Effects:**
- Update the price attribute of this item.

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

---

### POST /api/ItemCollection/updateReason

**Description:** Updates the reason for wanting an item in the user's wishlist.

**Requirements:**
- Exists a wishlist $w$ with this user.
- item.itemId exists in $w$'s itemIdSet.

**Effects:**
- Update the reason attribute of this item.

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

---

### POST /api/ItemCollection/updateIsNeed

**Description:** Updates the "is need or want" reflection for an item in the user's wishlist.

**Requirements:**
- Exists a wishlist $w$ with this user.
- item.itemId exists in $w$'s itemIdSet.

**Effects:**
- Update the isNeed attribute of this item.

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

---

### POST /api/ItemCollection/updateIsFutureApprove

**Description:** Updates the "future-self approval" reflection for an item in the user's wishlist.

**Requirements:**
- Exists a wishlist $w$ with this user.
- item.itemId exists in $w$'s itemIdSet.

**Effects:**
- Update the isFutureApprove attribute of this item.

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

---

### POST /api/ItemCollection/setPurchased

**Description:** Marks an item in the user's wishlist as purchased and records the purchase time.

**Requirements:**
- Exists a wishlist $w$ with this user.
- item $i$.itemId exists in $w$'s itemIdSet.
- $i$.wasPurchased is False.

**Effects:**
- Set $i$.wasPurchased as True.
- Set $i$.PurchasedTime as the current time of this action.

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

---

### POST /api/ItemCollection/getAIInsight

**Description:** Requests AI-generated insights on whether an item purchase is impulsive, based on its attributes and a context prompt.

**Requirements:**
- Exists a wishlist $w$ with this user.
- item.itemId exists in $w$'s itemIdSet.

**Effects:**
- Send context_prompt with the item to geminiLLM (including all the attributes under item, like description, price, reason, isNeed, isFutureApprove) and ask for insights on whether geminiLLM thinks this purchase is impulsive.
- Return the llm_response.

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