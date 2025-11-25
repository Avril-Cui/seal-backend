---
timestamp: 'Tue Nov 25 2025 14:55:09 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_145509.5786e406.md]]'
content_id: aa4d7241fc2e7b0c265fb56eef10d2cd656c0a66e4407c0d0bbc5edde9bfb785
---

# API Specification: UserAuth

**Purpose:** Manages users that are registered under BuyBye.

***

## API Endpoints

### POST /api/UserAuth/signup

**Description:** Creates a new registered user account with the provided email and password.

**Requirements:**

* No registered user exists with matching email.

**Effects:**

* Create a new registered user `$u$` with (email, password).
* Add user `$u$` to RegisteredUsers.
* Return user `$u$`.

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": {
    "uid": "string"
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

### POST /api/UserAuth/login

**Description:** Authenticates a user with the provided email and password.

**Requirements:**

* A user exists in RegisteredUsers with matching (email, password).

**Effects:**

* Return this user.

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": {
    "uid": "string"
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
