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

[@QueueSystem](../concepts/QueueSystem/QueueSystem.md)
# response:

# response:

# API Specification: 

**Purpose:** Assign a daily queue of items to each user for community swiping.

---

# response:

# API Specification: QueueSystem

**Purpose:** Assign a daily queue of items to each user for community swiping.

---

## API Endpoints

### POST /api/QueueSystem/_getCompletedQueue

**Description:** Returns the number of items completed by a user in their current daily queue.

**Requirements:**
- A queue `$q$` exists with matching owner with the current date.

**Effects:**
- Returns `$q$.completedQueue`.

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

---

### POST /api/QueueSystem/generateDailyQueue

**Description:** Creates a new daily queue for a user with a specified set of item IDs.

**Requirements:**
- No queue exists with owner matching this user.

**Effects:**
- Create a queue with (owner, itemIdSet = itemIds, completedQueue = 0, and creationDate = current date).

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

---

### POST /api/QueueSystem/incrementCompletedQueue

**Description:** Increments the count of completed items in a user's current daily queue and removes the specified item from the queue.

**Requirements:**
- Exists a queue `$q$` under this user with current date.
- `itemId` exists in `$q$.itemIdSet`.

**Effects:**
- Add one count to `completedQueue`.
- Remove `itemId` from `$q$.itemIdSet`.

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