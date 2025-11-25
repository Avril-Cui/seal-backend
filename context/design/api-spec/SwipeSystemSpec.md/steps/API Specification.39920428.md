---
timestamp: 'Tue Nov 25 2025 14:47:14 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_144714.4181a40f.md]]'
content_id: 3992042884f751f8d941f3ac758a9344d5ad7f7cedd51050bf698d4ca8ae583f
---

# API Specification: SwipeSystem

**Purpose:** Record swipe decisions made by users about items in their queues and make aggregated community feedback available.

***

## API Endpoints

### POST /api/SwipeSystem/\_getSwipeStats

**Description:** Retrieves aggregated swipe statistics (total swipes and approvals) for a specific user and item.

**Requirements:**

* exists at least one swipe with matching (owner, itemId)

**Effects:**

* let positive := number of swipes with matching (owner, itemId) and decision equals "Buy"
* let negative := number of swipes with matching (owner, itemId) and decision equals "Don't Buy"
* return total = positive + negative and approval = positive

**Request Body:**

```json
{
  "owner": "string",
  "itemId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "total": "number",
    "approval": "number"
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

### POST /api/SwipeSystem/\_getSwipeComments

**Description:** Retrieves all non-empty comments associated with a specific user and item.

**Requirements:**

* exists at least one swipe with matching (owner, itemId) and comment is not None

**Effects:**

* return all comments under swipes that has matching (owner, itemId) and comment is not None

**Request Body:**

```json
{
  "owner": "string",
  "itemId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "comments": [
      "string",
      "string"
    ]
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

### POST /api/SwipeSystem/recordSwipe

**Description:** Records a new swipe decision and optional comment by a user on an item.

**Requirements:**

* no swipe exists with matching (owner, itemId)

**Effects:**

* create a new swipe with (owner, itemId, decision, comment)

**Request Body:**

```json
{
  "owner": "string",
  "itemId": "string",
  "decision": "string",
  "comment": "string"
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

### POST /api/SwipeSystem/updateDecision

**Description:** Updates the decision and comment for an existing swipe by a user on an item.

**Requirements:**

* swipe exists with matching (owner, itemId)

**Effects:**

* update this swipe's decision to newDecision
* update this swipe's comment to newComment

**Request Body:**

```json
{
  "owner": "string",
  "itemId": "string",
  "newDecision": "string",
  "newComment": "string"
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
