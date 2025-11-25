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

[@ItemCollection](../concepts/SwipeSystem/SwipeSystem.md)

## API Endpoints

# response:

# API Specification: SwipeSystem

**Purpose:** Record swipe decisions made by users about items in their queues and make aggregated community feedback available.

---

# response:

# API Specification: SwipeSystem

**Purpose:** Record swipe decisions made by users about items in their queues and make aggregated community feedback available.

---

## API Endpoints

### POST /api/SwipeSystem/_getSwipeStats

**Description:** Retrieves aggregated swipe statistics (total swipes and approvals) for a specific user and item.

**Requirements:**
- exists at least one swipe with matching (owner, itemId)

**Effects:**
- let positive := number of swipes with matching (owner, itemId) and decision equals "Buy"
- let negative := number of swipes with matching (owner, itemId) and decision equals "Don't Buy"
- return total = positive + negative and approval = positive

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

---

### POST /api/SwipeSystem/_getSwipeComments

**Description:** Retrieves all non-empty comments associated with a specific user and item.

**Requirements:**
- exists at least one swipe with matching (owner, itemId) and comment is not None

**Effects:**
- return all comments under swipes that has matching (owner, itemId) and comment is not None

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

---

### POST /api/SwipeSystem/recordSwipe

**Description:** Records a new swipe decision and optional comment by a user on an item.

**Requirements:**
- no swipe exists with matching (owner, itemId)

**Effects:**
- create a new swipe with (owner, itemId, decision, comment)

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

---

### POST /api/SwipeSystem/updateDecision

**Description:** Updates the decision and comment for an existing swipe by a user on an item.

**Requirements:**
- swipe exists with matching (owner, itemId)

**Effects:**
- update this swipe's decision to newDecision
- update this swipe's comment to newComment

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

---