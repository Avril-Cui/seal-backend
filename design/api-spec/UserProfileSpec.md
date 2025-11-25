# UserProfile
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
# API Specification: UserProfile

**Purpose:** Manages user profiles that are registered under BuyBye.

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

[@UserProfile](../concepts/UserProfile/UserProfile.md)
# response:

# response:

# API Specification: 

**Purpose:**     Manages user profiles that are registered under BuyBye.

---

## API Endpoints

# response:


# response:

# API Specification: UserProfile

**Purpose:** Manages user profiles that are registered under BuyBye.

---

## API Endpoints

### POST /api/UserProfile/createUser

**Description:** Creates a new user profile with the provided details upon signing up for BuyBye.

**Requirements:**
- no user exists with matching uid;

**Effects:**
- create a new user with (uid, name, email, password, profilePicture, reward = 0, fieldOfInterests);
- return user;

**Request Body:**
```json
{
  "uid": "string",
  "name": "string",
  "email": "string",
  "password": "string",
  "profilePicture": "string",
  "fieldOfInterests": [
    {
      "field": "string"
    }
  ]
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/UserProfile/updateProfileName

**Description:** Updates the name associated with an existing user profile.

**Requirements:**
- user exists;

**Effects:**
- update the corresponding attribute (name) of this user

**Request Body:**
```json
{
  "user": "string",
  "newName": "string"
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

### POST /api/UserProfile/updateProfilePicture

**Description:** Updates the profile picture URL for an existing user.

**Requirements:**
- user exists;

**Effects:**
- update the corresponding attribute (profilePicture) of this user

**Request Body:**
```json
{
  "user": "string",
  "newProfilePicture": "string"
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

### POST /api/UserProfile/updatePassword

**Description:** Changes the password for an existing user profile.

**Requirements:**
- user exists;

**Effects:**
- update the corresponding attribute (password) of this user

**Request Body:**
```json
{
  "user": "string",
  "newPassword": "string"
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

### POST /api/UserProfile/updateInterests

**Description:** Replaces the entire set of field of interests for an existing user.

**Requirements:**
- user exists;

**Effects:**
- update this user's set of FieldsOfInterests to newFieldsOfInterests;

**Request Body:**
```json
{
  "user": "string",
  "newFieldsOfInterests": [
    {
      "field": "string"
    }
  ]
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