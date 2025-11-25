---
timestamp: 'Tue Nov 25 2025 14:39:17 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_143917.e1b45ae1.md]]'
content_id: 977f8739179dae97b231c6846dd1d1112db6ca9f92e063f5d6f2de202827365a
---

# API Specification: QueueSystem

**Purpose:** Assign a daily queue of items to each user for community swiping.

***

## API Endpoints

### POST /api/QueueSystem/\_getCompletedQueue

**Description:** Returns the number of items completed by a user in their current daily queue.

**Requirements:**

* A queue `$q$` exists with matching owner with the current date.

**Effects:**

* Returns `$q$.completedQueue`.

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
    "completedQueue": "number"
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

### POST /api/QueueSystem/generateDailyQueue

**Description:** Creates a new daily queue for a user with a specified set of item IDs.

**Requirements:**

* No queue exists with owner matching this user.

**Effects:**

* Create a queue with (owner, itemIdSet = itemIds, completedQueue = 0, and creationDate = current date).

**Request Body:**

```json
{
  "owner": "string",
  "itemIds": "string[]"
}
```

**Success Response Body (Action):**

```json
{
  "queue": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/QueueSystem/incrementCompletedQueue

**Description:** Increments the count of completed items in a user's current daily queue and removes the specified item from the queue.

**Requirements:**

* Exists a queue `$q$` under this user with current date.
* `itemId` exists in `$q$.itemIdSet`.

**Effects:**

* Add one count to `completedQueue`.
* Remove `itemId` from `$q$.itemIdSet`.

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
